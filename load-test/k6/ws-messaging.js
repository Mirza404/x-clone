/*
 * k6 WebSocket load test for the x-clone messaging feature (Socket.io v4).
 *
 * =====================================================================
 * WHY THIS SCRIPT HAND-ROLLS SOCKET.IO FRAMING (read this before editing)
 * =====================================================================
 * The backend uses Socket.io, not raw WebSocket. Socket.io layers its own
 * handshake and packet framing (Engine.IO v4 + Socket.IO protocol v4) on
 * top of a plain WS connection. k6's `k6/websockets` module
 * only speaks raw WS frames - it does NOT perform the Socket.IO handshake.
 * If we just opened a WS connection and started sending JSON, the server's
 * `io.on('connection', ...)` handler (backend/src/socket/index.ts) would
 * never fire, `socketAuthMiddleware` (backend/src/socket/auth.ts) would
 * never run, and this script would silently measure nothing real.
 *
 * So every frame below is written by hand according to the Engine.IO v4 /
 * Socket.IO v4 wire protocol:
 *
 *   Engine.IO packet types (single leading char):
 *     0 = open     1 = close   2 = ping   3 = pong
 *     4 = message  5 = upgrade 6 = noop
 *
 *   When the Engine.IO type is "4" (message), everything after that
 *   character IS a Socket.IO packet, whose own first character is the
 *   Socket.IO packet type:
 *     0 = CONNECT        1 = DISCONNECT
 *     2 = EVENT          3 = ACK
 *     4 = CONNECT_ERROR  5/6 = BINARY EVENT/ACK (unused here)
 *
 *   That's why frames look like "40{...}" (Engine.IO message + Socket.IO
 *   CONNECT) or "42[...]"  (Engine.IO message + Socket.IO EVENT).
 *
 * Handshake sequence used here (WS-only, no HTTP polling phase):
 *   1. Open a raw WS connection directly to
 *      `/socket.io/?EIO=4&transport=websocket`. Skipping the polling
 *      transport entirely (no probe/upgrade dance) is valid because the
 *      probe/upgrade handshake only exists to upgrade an *already open*
 *      polling session to WebSocket - if there is no polling session to
 *      upgrade from, the server just treats the WS connection as the
 *      transport from the start and immediately sends the Engine.IO
 *      "0{...}" open packet.
 *   2. On receiving that open packet, send the Socket.IO CONNECT packet
 *      with the auth payload embedded (NOT an HTTP header - this backend
 *      reads `socket.handshake.auth.token`, which only exists in the
 *      Socket.IO CONNECT packet payload): `40{"token":"<jwt>"}`.
 *   3. The server replies `40{"sid":"..."}` once the namespace connect
 *      succeeds (i.e. once socketAuthMiddleware calls next() with no
 *      error) - this is our "connected" signal and the point at which we
 *      stop the connect-latency clock.
 *   4. Respond to every Engine.IO ping ("2") with a pong ("3") or the
 *      server drops the connection as a dead peer.
 *   5. Emit events as `42<ackId>["event", payload]` and match the
 *      server's `43<ackId>[ackPayload]` reply back to the pending send to
 *      compute ack round-trip latency and success/failure.
 *
 * ==========================================================================
 * LIVE VERIFICATION (also repeated in load-test/k6/README.md)
 * ==========================================================================
 * This framing has been exercised against the live local backend and MongoDB.
 * Phase 1 must still be run before every load-test session so authentication,
 * protocol compatibility, and the target environment are verified before
 * any capacity number is trusted.
 */

import { WebSocket } from 'k6/websockets';
import { SharedArray } from 'k6/data';
import { Trend, Rate, Counter } from 'k6/metrics';
import { check, sleep } from 'k6';
import http from 'k6/http';

// ---------------------------------------------------------------------
// Configuration (all overridable via `-e VAR=value`)
// ---------------------------------------------------------------------
const PHASE = __ENV.PHASE || '1';
const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3001').replace(
  /\/+$/,
  ''
);
const WS_URL = `${BASE_URL.replace(/^http/, 'ws')}/socket.io/?EIO=4&transport=websocket`;
const WARMUP_PATH = __ENV.WARMUP_PATH || '/api/post';

const MSG_MIN_INTERVAL_S = Number(__ENV.MSG_MIN_INTERVAL_S || 2);
const MSG_MAX_INTERVAL_S = Number(__ENV.MSG_MAX_INTERVAL_S || 6);
const ACK_TIMEOUT_MS = Number(__ENV.ACK_TIMEOUT_MS || 10000);
const RECONNECT_PROBABILITY = Number(__ENV.RECONNECT_PROBABILITY || 0.05);
const RECONNECT_CHECK_INTERVAL_S = Number(
  __ENV.RECONNECT_CHECK_INTERVAL_S || 45
);
const SUSTAINED_VUS = Number(__ENV.SUSTAINED_VUS || 100);
const SUSTAINED_DURATION = __ENV.SUSTAINED_DURATION || '12m';
const PHASE4_MAX_VUS = Number(__ENV.PHASE4_MAX_VUS || 750);

// Path is resolved relative to THIS script file (not the invocation cwd),
// because k6's `open()` resolves relative paths against the script's own
// location, which is the more predictable behavior across
// `k6 run ws-messaging.js` (from load-test/k6/) vs
// `k6 run load-test/k6/ws-messaging.js` (from repo root) invocations.
// Override with an absolute path via -e TOKENS_FILE=/abs/path/tokens.json
// if you want to be fully explicit instead.
const TOKENS_FILE = __ENV.TOKENS_FILE || '../tokens.json';

// ---------------------------------------------------------------------
// Token pool (produced by the sibling token-minting script)
// Contract: JSON array of { userId, email, token }
// ---------------------------------------------------------------------
const tokens = new SharedArray('tokens', function () {
  let raw;
  try {
    raw = JSON.parse(open(TOKENS_FILE));
  } catch (e) {
    throw new Error(
      `Could not read/parse TOKENS_FILE "${TOKENS_FILE}": ${e}. ` +
        'Generate it with the sibling token-minting script first, or pass ' +
        '-e TOKENS_FILE=<path> to point at it.'
    );
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(
      `TOKENS_FILE "${TOKENS_FILE}" must be a non-empty JSON array`
    );
  }
  return raw;
});

// ---------------------------------------------------------------------
// Custom metrics (feed directly into the plan's "what this should answer")
// ---------------------------------------------------------------------
const wsConnectLatency = new Trend('ws_connect_latency', true); // ms, WS open -> Socket.IO CONNECT ack
const wsMessageAckLatency = new Trend('ws_message_ack_latency', true); // ms, emit -> ack received
const wsAckFailureRate = new Rate('ws_ack_failure_rate'); // ok:false, timeout, or disconnect before ack
const wsAcksReceived = new Counter('ws_acks_received');
const wsAckTimeouts = new Counter('ws_ack_timeouts');
const wsAcksAbandoned = new Counter('ws_acks_abandoned');
const wsUnexpectedDisconnects = new Counter('ws_unexpected_disconnects'); // close not initiated by the script
const wsConnectionErrors = new Counter('ws_connection_errors'); // transport errors / CONNECT_ERROR packets
const wsMessagesSent = new Counter('ws_messages_sent');

// ---------------------------------------------------------------------
// Socket.IO v4 framing helpers (see the big comment block at top of file)
// ---------------------------------------------------------------------
function encodeConnectPacket(token) {
  return '40' + JSON.stringify({ token });
}

function encodeEventPacket(ackId, event, payload) {
  return '42' + String(ackId) + JSON.stringify([event, payload]);
}

// Parses one raw text frame into { eioType, socketioType, ackId, payload }.
function parseFrame(data) {
  if (typeof data !== 'string' || data.length === 0) {
    return { eioType: null };
  }
  const eioType = data[0];

  if (eioType === '0') {
    // Engine.IO open packet: {"sid":"...","pingInterval":...,"pingTimeout":...}
    let payload = null;
    try {
      payload = JSON.parse(data.slice(1));
    } catch (e) {
      payload = null;
    }
    return { eioType, payload };
  }

  if (
    eioType === '2' ||
    eioType === '3' ||
    eioType === '1' ||
    eioType === '5' ||
    eioType === '6'
  ) {
    // ping / pong / close / upgrade / noop - no Socket.IO payload
    return { eioType };
  }

  if (eioType === '4') {
    const socketioType = data[1];
    const rest = data.slice(2);
    // An ack id, if present, is a run of digits right after the Socket.IO
    // type char, before the JSON payload (e.g. "42" + "7" + '["event",{}]').
    const match = rest.match(/^(\d*)([\s\S]*)$/);
    const ackId = match && match[1] ? match[1] : null;
    const jsonPart = match ? match[2] : rest;
    let payload = null;
    if (jsonPart) {
      try {
        payload = JSON.parse(jsonPart);
      } catch (e) {
        payload = null;
      }
    }
    return { eioType, socketioType, ackId, payload };
  }

  return { eioType };
}

function randomIntBetween(minInclusive, maxInclusive) {
  return (
    Math.floor(Math.random() * (maxInclusive - minInclusive + 1)) + minInclusive
  );
}

// Deterministic even/odd pairing so every VU always messages the same
// "partner" - a real second user, never itself - producing real
// conversations instead of self-messaging.
function pickPartner(tokenIndex) {
  const n = tokens.length;
  if (n < 2) return null;
  if (n % 2 !== 0) {
    throw new Error(
      `TOKENS_FILE has an odd number of entries (${n}) - even/odd pairing requires an even count so every VU has a real reciprocal partner`
    );
  }
  const partnerIndex =
    tokenIndex % 2 === 0 ? (tokenIndex + 1) % n : (tokenIndex - 1 + n) % n;
  return tokens[partnerIndex];
}

function requiredTokenCount() {
  switch (PHASE) {
    case '1':
      return 2;
    case '2':
      return 500;
    case '3':
      return SUSTAINED_VUS + (SUSTAINED_VUS % 2);
    case '4':
      return PHASE4_MAX_VUS + (PHASE4_MAX_VUS % 2);
    default:
      return 0;
  }
}

// ---------------------------------------------------------------------
// Warm-up: hit a cheap GET a few times before real load, so Render's
// free-tier cold start doesn't contaminate Phase 1's baseline numbers.
// ---------------------------------------------------------------------
export function setup() {
  const required = requiredTokenCount();
  if (tokens.length < required) {
    throw new Error(
      `PHASE=${PHASE} needs at least ${required} tokens, but TOKENS_FILE contains ${tokens.length}. ` +
        'Reusing identities would concentrate the run onto a few conversations and invalidate per-user capacity results.'
    );
  }
  if (tokens.length % 2 !== 0) {
    throw new Error(
      `TOKENS_FILE has an odd number of entries (${tokens.length}) - even/odd pairing requires an even count`
    );
  }

  const maxAttempts = 8;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = http.get(`${BASE_URL}${WARMUP_PATH}`, { timeout: '15s' });
    if (res.status >= 200 && res.status < 500) {
      console.log(
        `[warmup] backend responded after ${attempt} attempt(s), status=${res.status}`
      );
      return { warmedUp: true };
    }
    console.log(
      `[warmup] attempt ${attempt}/${maxAttempts} failed (status=${res.status}), retrying...`
    );
    sleep(2);
  }
  console.warn(
    '[warmup] backend never returned a clean response - continuing anyway, expect skewed baseline numbers'
  );
  return { warmedUp: false };
}

// =======================================================================
// PHASE 1 - single VU, single iteration, obvious pass/fail sanity check
// =======================================================================
export function phase1() {
  if (tokens.length < 2) {
    throw new Error(
      'Phase 1 needs at least 2 tokens in TOKENS_FILE (sender + recipient)'
    );
  }

  const sender = tokens[0];
  const recipient = tokens[1];
  const connectStart = Date.now();
  let connected = false;
  let messageSent = false;
  let ackReceived = false;
  let ackOk = false;
  let ackSettled = false;
  let ackTimeout = null;
  let sendStart = 0;
  const clientId = `phase1-${Date.now()}`;

  const socket = new WebSocket(WS_URL);

  socket.addEventListener('open', () => {
    console.log('[phase1] raw WS open, waiting for Engine.IO open packet...');
  });

  socket.addEventListener('message', (event) => {
    const frame = parseFrame(event.data);

    if (frame.eioType === '0') {
      socket.send(encodeConnectPacket(sender.token));
      return;
    }

    if (frame.eioType === '2') {
      socket.send('3');
      return;
    }

    if (frame.eioType === '4' && frame.socketioType === '0') {
      connected = true;
      wsConnectLatency.add(Date.now() - connectStart);
      console.log(
        `[phase1] Socket.IO CONNECT ack received in ${Date.now() - connectStart}ms - auth OK`
      );

      sendStart = Date.now();
      socket.send(
        encodeEventPacket(1, 'message:send', {
          recipientId: recipient.userId,
          content: 'k6 phase1 load-test sanity message',
          clientId,
        })
      );
      messageSent = true;
      wsMessagesSent.add(1);
      ackTimeout = setTimeout(() => {
        if (ackSettled) return;
        ackSettled = true;
        wsAckFailureRate.add(true);
        wsAckTimeouts.add(1);
        console.error(
          `[phase1] message ack timed out after ${ACK_TIMEOUT_MS}ms`
        );
        socket.close();
      }, ACK_TIMEOUT_MS);
      return;
    }

    if (frame.eioType === '4' && frame.socketioType === '4') {
      wsConnectionErrors.add(1);
      console.error(`[phase1] CONNECT_ERROR: ${JSON.stringify(frame.payload)}`);
      return;
    }

    if (
      frame.eioType === '4' &&
      frame.socketioType === '3' &&
      frame.ackId === '1'
    ) {
      if (ackSettled) return;
      ackSettled = true;
      if (ackTimeout) clearTimeout(ackTimeout);
      ackReceived = true;
      wsAcksReceived.add(1);
      const rtt = Date.now() - sendStart;
      wsMessageAckLatency.add(rtt);
      const ackPayload = Array.isArray(frame.payload) ? frame.payload[0] : null;
      ackOk = Boolean(ackPayload && ackPayload.ok === true);
      wsAckFailureRate.add(!ackOk);

      console.log(
        `[phase1] ack received in ${rtt}ms, ok=${ackOk}${ackOk ? '' : `, error=${ackPayload && ackPayload.error}`}`
      );

      // Confirm the connection stays open a moment after the ack, then
      // close cleanly ourselves (this is the one intentional close in
      // the whole script - Phase 1 is a single deliberate round trip).
      setTimeout(() => {
        console.log(
          '[phase1] connection held open post-ack as expected, closing intentionally'
        );
        socket.close();
      }, 2000);
    }
  });

  socket.addEventListener('close', () => {
    if (messageSent && !ackSettled) {
      ackSettled = true;
      if (ackTimeout) clearTimeout(ackTimeout);
      wsAckFailureRate.add(true);
      wsAcksAbandoned.add(1);
    }
    const passed = connected && messageSent && ackReceived && ackOk;
    console.log(
      `\n===== PHASE 1 RESULT: ${passed ? 'PASS' : 'FAIL'} =====\n` +
        `connected=${connected} messageSent=${messageSent} ackReceived=${ackReceived} ackOk=${ackOk}\n` +
        '======================================\n'
    );
    check(
      { connected, messageSent, ackReceived, ackOk },
      {
        'phase1: connected to Socket.IO namespace': (r) => r.connected === true,
        'phase1: message:send emitted': (r) => r.messageSent === true,
        'phase1: ack received': (r) => r.ackReceived === true,
        'phase1: ack ok:true': (r) => r.ackOk === true,
      }
    );
  });

  socket.addEventListener('error', (e) => {
    wsConnectionErrors.add(1);
    console.error(`[phase1] WebSocket error: ${JSON.stringify(e)}`);
  });
}

// =======================================================================
// PHASES 2/3/4 - shared "realistic user" connect/send/reconnect loop
// =======================================================================
export function loadLoop() {
  const tokenIndex = __VU - 1;
  const entry = tokens[tokenIndex];
  const partner = pickPartner(tokenIndex);
  if (!partner) {
    throw new Error(
      'loadLoop needs at least 2 tokens in TOKENS_FILE to pair VUs into conversations'
    );
  }
  openSession(entry, partner);
}

function openSession(entry, partner) {
  const connectStart = Date.now();
  let connected = false;
  let intentionalClose = false;
  let ackCounter = 1;
  const pendingAcks = new Map();
  let sendTimer = null;
  let firstSendTimer = null;
  let reconnectCheckTimer = null;

  const socket = new WebSocket(WS_URL);

  function clearTimers() {
    if (firstSendTimer) {
      clearTimeout(firstSendTimer);
      firstSendTimer = null;
    }
    if (sendTimer) {
      clearInterval(sendTimer);
      sendTimer = null;
    }
    if (reconnectCheckTimer) {
      clearInterval(reconnectCheckTimer);
      reconnectCheckTimer = null;
    }
  }

  function abandonPendingAcks() {
    for (const pending of pendingAcks.values()) {
      clearTimeout(pending.timeout);
      wsAckFailureRate.add(true);
      wsAcksAbandoned.add(1);
    }
    pendingAcks.clear();
  }

  function sendMessage() {
    if (!connected || socket.readyState !== WebSocket.OPEN) return;
    const ackId = ackCounter++;
    const clientId = `${__VU}-${__ITER}-${ackId}-${Date.now()}`;
    const ackKey = String(ackId);
    const sentAt = Date.now();
    try {
      socket.send(
        encodeEventPacket(ackId, 'message:send', {
          recipientId: partner.userId,
          content: `k6 load test message ${clientId}`,
          clientId,
        })
      );
    } catch (error) {
      wsConnectionErrors.add(1);
      console.error(`[load] message send failed: ${error}`);
      return;
    }

    const timeout = setTimeout(() => {
      if (!pendingAcks.delete(ackKey)) return;
      wsAckFailureRate.add(true);
      wsAckTimeouts.add(1);
    }, ACK_TIMEOUT_MS);
    pendingAcks.set(ackKey, { sentAt, timeout });
    wsMessagesSent.add(1);
  }

  socket.addEventListener('message', (event) => {
    const frame = parseFrame(event.data);

    if (frame.eioType === '0') {
      socket.send(encodeConnectPacket(entry.token));
      return;
    }

    if (frame.eioType === '2') {
      socket.send('3');
      return;
    }

    if (frame.eioType === '4' && frame.socketioType === '0') {
      connected = true;
      wsConnectLatency.add(Date.now() - connectStart);

      // Random jitter on first send so VUs don't all fire in lockstep.
      firstSendTimer = setTimeout(
        () => {
          firstSendTimer = null;
          sendMessage();
          if (!connected || socket.readyState !== WebSocket.OPEN) return;
          sendTimer = setInterval(
            sendMessage,
            randomIntBetween(MSG_MIN_INTERVAL_S, MSG_MAX_INTERVAL_S) * 1000
          );
        },
        randomIntBetween(0, MSG_MAX_INTERVAL_S) * 1000
      );

      // Occasionally force a disconnect/reconnect cycle to simulate flaky
      // clients (mobile network drops, tab backgrounding, etc).
      reconnectCheckTimer = setInterval(() => {
        if (Math.random() < RECONNECT_PROBABILITY) {
          intentionalClose = true;
          socket.close();
        }
      }, RECONNECT_CHECK_INTERVAL_S * 1000);
      return;
    }

    if (frame.eioType === '4' && frame.socketioType === '4') {
      wsConnectionErrors.add(1);
      return;
    }

    if (frame.eioType === '4' && frame.socketioType === '3' && frame.ackId) {
      const pending = pendingAcks.get(frame.ackId);
      if (pending !== undefined) {
        pendingAcks.delete(frame.ackId);
        clearTimeout(pending.timeout);
        wsAcksReceived.add(1);
        wsMessageAckLatency.add(Date.now() - pending.sentAt);
        const ackPayload = Array.isArray(frame.payload)
          ? frame.payload[0]
          : null;
        wsAckFailureRate.add(!(ackPayload && ackPayload.ok === true));
      }
      return;
    }
    // frame.eioType === '4' && socketioType === '2' -> inbound events
    // (message:new, message:read, presence, typing) are intentionally
    // ignored for load-generation purposes.
  });

  socket.addEventListener('close', () => {
    connected = false;
    clearTimers();
    abandonPendingAcks();
    if (!intentionalClose) {
      wsUnexpectedDisconnects.add(1);
    }
    // Reconnect after a short delay, whether the close was intentional
    // (simulated flaky client) or not (server/platform dropped us) - a
    // real client would retry too, and we want the VU to stay "active"
    // for the rest of its scheduled stage/duration. k6 interrupts this
    // recursion itself once the scenario's stage/duration + gracefulStop
    // window elapses.
    setTimeout(
      () => {
        openSession(entry, partner);
      },
      randomIntBetween(500, 3000)
    );
  });

  socket.addEventListener('error', () => {
    wsConnectionErrors.add(1);
  });
}

// ---------------------------------------------------------------------
// Scenario/stage selection - one phase per run, chosen via -e PHASE=N
// ---------------------------------------------------------------------
function buildPhase4Stages() {
  return [
    { duration: '2m', target: 100 },
    { duration: '2m', target: 250 },
    { duration: '2m', target: 500 },
    { duration: '3m', target: PHASE4_MAX_VUS },
    { duration: '5m', target: PHASE4_MAX_VUS }, // hold at ceiling to observe the failure mode
  ];
}

function buildOptions() {
  switch (PHASE) {
    case '1':
      return {
        scenarios: {
          phase1_baseline: {
            executor: 'shared-iterations',
            vus: 1,
            iterations: 1,
            maxDuration: '2m',
            exec: 'phase1',
          },
        },
        thresholds: {
          ws_ack_failure_rate: ['rate==0'],
        },
      };
    case '2':
      return {
        scenarios: {
          phase2_ramp: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
              { duration: '2m', target: 10 },
              { duration: '3m', target: 50 },
              { duration: '3m', target: 100 },
              { duration: '3m', target: 250 },
              { duration: '5m', target: 500 },
            ],
            gracefulRampDown: '30s',
            exec: 'loadLoop',
          },
        },
      };
    case '3':
      return {
        scenarios: {
          phase3_sustained: {
            executor: 'constant-vus',
            vus: SUSTAINED_VUS,
            duration: SUSTAINED_DURATION,
            gracefulStop: '30s',
            exec: 'loadLoop',
          },
        },
      };
    case '4':
      return {
        scenarios: {
          phase4_failure_point: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: buildPhase4Stages(),
            gracefulRampDown: '30s',
            exec: 'loadLoop',
          },
        },
      };
    default:
      throw new Error(
        `Unknown PHASE "${PHASE}" - expected 1, 2, 3, or 4 (see load-test/k6/README.md)`
      );
  }
}

export const options = buildOptions();
