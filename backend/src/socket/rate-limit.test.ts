import assert from 'node:assert/strict';
import test from 'node:test';
import { allow, reset, MAX_EVENTS, WINDOW_MS } from './rate-limit';

test('allows up to MAX_EVENTS within a window', () => {
  const key = 'rl-1';
  reset(key);

  for (let i = 0; i < MAX_EVENTS; i += 1) {
    assert.equal(allow(key, 1000), true);
  }
  assert.equal(allow(key, 1000), false);
});

test('resets the count once the window elapses', () => {
  const key = 'rl-2';
  reset(key);

  for (let i = 0; i < MAX_EVENTS; i += 1) {
    assert.equal(allow(key, 1000), true);
  }
  assert.equal(allow(key, 1000), false);
  assert.equal(allow(key, 1000 + WINDOW_MS), true);
});

test('separate keys are tracked independently', () => {
  reset('rl-3a');
  reset('rl-3b');

  for (let i = 0; i < MAX_EVENTS; i += 1) {
    assert.equal(allow('rl-3a', 1000), true);
  }
  assert.equal(allow('rl-3a', 1000), false);
  assert.equal(allow('rl-3b', 1000), true);
});
