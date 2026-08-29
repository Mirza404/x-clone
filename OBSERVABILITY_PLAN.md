# Observability Plan

## Status

Planned. This document is the implementation plan for D8 in `IDEAS.md`.

The goal is practical production visibility for the existing single-instance
Render deployment, not an infrastructure project. The first useful version must
answer these questions:

1. Is the backend process alive and ready to serve traffic?
2. Which route or socket operation is failing?
3. Is a failure in the application, MongoDB, Cloudinary, or deployment startup?
4. Are HTTP requests and message sends getting slower?
5. Did the latest deployment become healthy?

## Current state

- Express uses `morgan('dev')`, which produces human-readable request lines but
  no structured fields or request correlation.
- Controllers and socket handlers call `console.error` independently.
- The HTTP server starts before the asynchronous MongoDB connection is confirmed.
- There is no liveness or readiness endpoint and `render.yaml` has no
  `healthCheckPath`.
- Socket connect/disconnect state and message operation latency are not measured.
- Render already provides basic service CPU, memory, request, deployment, and
  runtime-log views. These should be used rather than rebuilt.
- The backend runs as one Render instance because Socket.IO rooms and presence
  are process-local.

## Decisions

### Signals and destinations

| Signal           | Initial destination          | Reason                                                  |
| ---------------- | ---------------------------- | ------------------------------------------------------- |
| Health/readiness | Render HTTP health check     | Stops an unready deployment from receiving traffic.     |
| Structured logs  | stdout, viewed in Render     | No new log service is needed for the first version.     |
| Traces           | Grafana Cloud over OTLP/HTTP | Shows where slow or failed requests spend time.         |
| Metrics          | Grafana Cloud over OTLP/HTTP | Enables dashboards and alerts for application behavior. |

Use OpenTelemetry only for traces and metrics. OpenTelemetry JavaScript marks
those signals stable while its log SDK remains under development. Pino remains
the application logger and writes JSON to stdout.

The application sends OTLP directly to Grafana Cloud. Do not add an
OpenTelemetry Collector, Grafana Alloy, Prometheus server, Loki container, or
sidecar to this deployment. Reconsider a collector only if another service is
added or telemetry routing becomes complex.

### Scope

The backend is the first target. It owns the API, MongoDB access, Cloudinary
completion, authentication boundary, and Socket.IO messaging flow. Frontend
browser telemetry is deferred because it adds public exporter configuration,
session/privacy decisions, and substantially more event volume.

### Expected free-tier behavior

The Render backend intentionally sleeps while idle. Absence of telemetry is not
an incident and must not trigger an availability alert. Do not add an external
uptime pinger as part of this work. Render health checks protect deployments and
running instances; the existing frontend waking state explains cold starts to
users.

## Telemetry contract

### Resource fields

Every trace and metric export should identify:

- `service.name=x-clone-backend`
- `service.version=<RENDER_GIT_COMMIT or local>`
- `deployment.environment=production|development|test`
- `service.instance.id=<RENDER_INSTANCE_ID when available>`

Use Render's documented runtime variables rather than introducing duplicate
version or instance settings.

### Correlation fields

Every HTTP completion/error log should include:

- `requestId`: reuse `X-Request-Id` when supplied, otherwise generate a UUID and
  return it as `X-Request-Id`.
- `renderRequestId`: the `Rndr-Id` header when present.
- `cloudflareRay`: the `CF-Ray` header when present.
- `traceId` and `spanId` when an OpenTelemetry span is active.
- method, normalized route, status code, response time, environment, service
  version, and operation name.

Socket operation logs should include an operation such as `message.send` or
`message.read`, outcome, duration, and a generated event correlation ID. Socket
IDs may appear in debug logs but must not become metric labels.

### Privacy and cardinality rules

Never log or attach these values to metrics/traces:

- Authorization headers, cookies, JWTs, API keys, or OTLP credentials.
- Request/response bodies, message content, search text, or uploaded image URLs.
- Raw Cloudinary signatures.

Do not use user IDs, post IDs, conversation IDs, message IDs, client IDs, socket
IDs, raw URLs, query strings, or error messages as metric attributes. They create
unbounded time series and can expose user data. Metrics use normalized route
templates, operation names, status classes, transport, and bounded outcome/error
codes only.

## Phase 1: lifecycle, liveness, and readiness

### Backend changes

1. Replace module-level fire-and-forget startup with an explicit `startServer()`:
   - load configuration;
   - connect to MongoDB;
   - initialize Socket.IO;
   - listen on `process.env.PORT ?? 3001` and `0.0.0.0`;
   - exit non-zero when startup fails.
2. Introduce process lifecycle state so readiness becomes false as soon as
   graceful shutdown starts.
3. Add unrate-limited endpoints before `/api` middleware:
   - `GET /healthz`: process liveness only; no dependency call.
   - `GET /readyz`: returns `200` only when startup completed, shutdown has not
     started, and a short MongoDB ping succeeds; otherwise `503`.
4. Return small, non-sensitive JSON containing status, service version, uptime,
   and component status. Do not return connection strings or error stacks.
5. Add `healthCheckPath: /readyz` to the backend service in `render.yaml`.
6. Preserve the existing ten-second graceful shutdown bound and ensure
   readiness flips before sockets and HTTP stop accepting new work.

### Tests

- `/healthz` is `200` regardless of Mongo state.
- `/readyz` is `200` after startup and `503` while disconnected or shutting down.
- Health routes bypass authentication and API rate limiting.
- Startup does not call `listen` before Mongo connects.
- Startup failures exit cleanly and do not leave a listening server.

### Acceptance criteria

- A broken Mongo configuration cannot produce a successful Render deployment.
- Render routes traffic only after `/readyz` succeeds.
- Health responses contain no secrets.

## Phase 2: structured and correlated logs

### Backend changes

1. Add `pino` and `pino-http`; keep `pino-pretty` development-only.
2. Replace `morgan` and the production `console.*` calls with one logger module.
3. Install request logging before body parsing so response timing covers the
   whole request.
4. Configure log levels:
   - `info`: startup, shutdown, completed requests, socket lifecycle transitions;
   - `warn`: rate-limit rejection, expected upstream degradation, failed client
     input only when operationally meaningful;
   - `error`: failed application operations with an `Error` object;
   - `fatal`: startup failure, uncaught exception, unhandled rejection.
5. Use Pino serializers and explicit redaction for authorization, cookies,
   tokens, secrets, signatures, and credentials. Do not enable request-body
   logging.
6. Add a final Express error middleware for errors that escape controllers.
   Existing controller catches can migrate incrementally to `req.log.error`.
7. Log Socket.IO connect/disconnect events and the bounded disconnect reason at
   `info`; do not log presence broadcasts or typing events individually.
8. Suppress routine access logs for `/healthz` and `/readyz` unless they fail.

### Event shape

Use stable operation names rather than prose as the primary searchable field:

```json
{
  "level": "error",
  "operation": "message.send",
  "outcome": "error",
  "errorCode": "mongo_update_failed",
  "requestId": "...",
  "traceId": "...",
  "durationMs": 143
}
```

Human-readable messages remain useful, but dashboards and searches must not
depend on parsing them.

### Tests

- A request keeps an incoming request ID or receives a generated one.
- The response returns the same request ID.
- Authorization, cookies, and configured secret fields are redacted.
- A `500` produces one structured error with correlation fields.
- Health-check successes do not flood logs.

### Acceptance criteria

- Searching one request ID in Render shows its completion and application error.
- Production output is valid one-record-per-line JSON.
- No existing test needs to silence `console.error`.

## Phase 3: OpenTelemetry traces and metrics

### Instrumentation

1. Add the OpenTelemetry Node SDK, Node auto-instrumentations, and OTLP/HTTP
   trace and metric exporters.
2. Initialize instrumentation before Express, Mongoose, MongoDB, HTTP, or
   Socket.IO modules are loaded.
3. Make telemetry optional:
   - local/test runs work with exporters disabled;
   - missing production credentials log one warning and leave the app running;
   - exporter failure must never fail a user request.
4. Send production telemetry directly to Grafana Cloud using Render-managed
   secrets:
   - `OTEL_EXPORTER_OTLP_ENDPOINT`
   - `OTEL_EXPORTER_OTLP_HEADERS`
   - `OTEL_TRACES_SAMPLER=parentbased_traceidratio`
   - `OTEL_TRACES_SAMPLER_ARG=0.10` initially
5. Exclude successful health checks from traces and metrics where practical.
6. Add manual spans around the operations that auto-instrumentation cannot name
   meaningfully:
   - `message.send.socket`
   - `message.send.rest`
   - `message.read`
   - `media.sign`
   - `media.complete`
   - `conversation.create`

### Metrics

Prefer standard HTTP/runtime metrics emitted by instrumentation. Add only these
application-specific instruments initially:

| Metric                           | Type               | Bounded attributes    |
| -------------------------------- | ------------------ | --------------------- |
| `xclone.socket.connections`      | Up/down counter    | none                  |
| `xclone.socket.disconnects`      | Counter            | reason                |
| `xclone.messaging.send.duration` | Histogram, seconds | transport, outcome    |
| `xclone.messaging.send.errors`   | Counter            | transport, error_code |
| `xclone.messaging.read.duration` | Histogram, seconds | transport, outcome    |
| `xclone.media.complete.duration` | Histogram, seconds | outcome               |
| `xclone.rate_limit.rejections`   | Counter            | limiter               |

Do not duplicate Render's CPU and memory metrics in application code.

### Tests

- Instrumentation initializes before the app in the production entry point.
- Custom instruments use only the documented bounded attributes.
- Success and error paths record the expected outcome and duration.
- Exporters are disabled during normal unit tests.
- An exporter failure is contained and does not change an HTTP/socket response.

### Acceptance criteria

- A failed REST request in Grafana links HTTP, Express, and MongoDB spans.
- A message-send failure shows its transport, duration, bounded error code, and
  correlated structured log.
- Telemetry overhead remains small in a local k6 comparison; investigate if p95
  latency increases by more than 5% under the same test profile.

## Phase 4: dashboard, alerts, and deployment verification

### Grafana dashboard

Create one `X Clone Backend` dashboard with four rows:

1. **Overview:** request rate, 2xx/4xx/5xx counts, p50/p95 latency, active socket
   connections, service version.
2. **Messaging:** send/read throughput, p95 duration by transport, error counts,
   socket disconnect reasons.
3. **Dependencies:** MongoDB span latency/errors, Cloudinary completion
   latency/errors, readiness state.
4. **Deployments:** service version changes, startup duration, errors beginning
   after a version change.

Use Render's dashboard for CPU and memory instead of copying those panels unless
Render metric streaming is deliberately enabled later.

### Alerts

Start with email notifications and conservative, low-traffic-safe conditions:

- HTTP 5xx: at least five failures in ten minutes and an error ratio above 10%.
- Messaging: at least three send failures in ten minutes.
- Latency: p95 above two seconds for fifteen minutes with a minimum request count.
- MongoDB: repeated database errors while the service is actively receiving
  traffic.

Do not alert on zero traffic, missing telemetry, routine cold starts, individual
4xx responses, typing failures, or ordinary client disconnects. Review thresholds
after two weeks of real data before adding more alerts.

### Deployment verification

1. Keep Render `/readyz` as the authoritative deployment gate.
2. Enhance the CI deploy job to retain each Render deploy ID, poll it to a final
   state, and fail if either service deployment fails.
3. After the backend deploy succeeds, call `/readyz` and record its returned
   service version. This verifies the new commit, not merely an old healthy
   instance.
4. Document a short rollback runbook: identify the first bad service version in
   logs/traces, roll back in Render, and confirm `/readyz` plus error recovery.

### Acceptance criteria

- One dashboard answers the five questions listed at the top of this plan.
- Every alert has an owner, an action, and a link to the relevant dashboard.
- A failed Render deployment makes the GitHub deploy job fail visibly.

## Deliberately deferred

- Browser real-user monitoring and frontend tracing.
- External uptime monitoring while free-tier sleep remains intentional.
- Shipping logs to Loki or another long-retention provider.
- OpenTelemetry Collector or Grafana Alloy.
- Per-user analytics, product analytics, or message-content inspection.
- Distributed Socket.IO/presence telemetry for multiple backend instances.
- Pager/phone alerts for a non-critical hobby deployment.

## Implementation order

Each phase is independently shippable:

1. Lifecycle and health endpoints.
2. Pino logging and request correlation.
3. OpenTelemetry traces/metrics and custom messaging instruments.
4. Grafana dashboard, alerts, and CI deployment verification.

Do not start Phase 3 until Phase 2 produces clean, privacy-safe logs. Do not add
alerts until the dashboard has enough real data to choose thresholds.

## Completion definition

D8 is complete when all four phases pass their acceptance criteria, the Render
environment contains the OTLP secrets, the production dashboard receives data,
and the rollback procedure has been exercised once.

## Primary references

- [Render health checks](https://render.com/docs/health-checks)
- [Render service metrics](https://render.com/docs/service-metrics)
- [Render runtime logs](https://render.com/docs/logging)
- [Render default environment variables](https://render.com/docs/environment-variables)
- [Pino HTTP](https://github.com/pinojs/pino-http)
- [Pino redaction](https://github.com/pinojs/pino/blob/main/docs/redaction.md)
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/)
- [OpenTelemetry Node.js setup](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/)
- [OpenTelemetry exporters](https://opentelemetry.io/docs/languages/js/exporters/)
- [Grafana Cloud OTLP setup](https://grafana.com/docs/grafana-cloud/observe-and-act/agent-observability/get-started/grafana-cloud/)
