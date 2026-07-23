const WINDOW_MS = 10_000;
const MAX_EVENTS = 20;

const hits = new Map<string, { count: number; windowStart: number }>();

function allow(key: string, now: number = Date.now()): boolean {
  const entry = hits.get(key);
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    hits.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= MAX_EVENTS) {
    return false;
  }
  entry.count += 1;
  return true;
}

function reset(key: string): void {
  hits.delete(key);
}

export { allow, reset, WINDOW_MS, MAX_EVENTS };
