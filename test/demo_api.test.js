// SPDX-License-Identifier: Apache-2.0
// Integration check: HTTP requests must compile and run the real Verilog.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { test } = require('node:test');
const { setTimeout: delay } = require('node:timers/promises');
const path = require('node:path');

const port = 43000 + (process.pid % 10000);
const url = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [path.join(__dirname, '..', 'demo', 'server.js')], {
  env: { ...process.env, PORT: String(port) }, stdio: 'ignore',
});
process.on('exit', () => server.kill());

async function run(scenario, events, glitches, filter, minimum) {
  const response = await fetch(`${url}/api/run`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario, events, glitches, filter, minimum, seed: 2026 }),
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.match(data.engine, /Icarus Verilog/);
  assert.equal(data.trace.length > 0, true);
  assert.equal(data.timing.productionDiv, 50000);
  assert.equal(data.timing.simDiv, 4);
  return data.result;
}

test('five reproducible challenge scenarios from the actual RTL', async () => {
  try {
    let ready = false;
    for (let i = 0; i < 40; i++) {
      try { const response = await fetch(url); ready = response.ok; if (ready) break; } catch (_) { /* starting */ }
      await delay(100);
    }
    assert.equal(ready, true, 'demo server started');
    const clean = await run('clean', 5, 0, 3, 4);
    assert.equal(clean.accepted, 5);
    assert.equal(clean.underMinimum, 0);

    const noise = await run('noise', 5, 8, 3, 4);
    assert.equal(noise.rawEdges, 13);
    assert.equal(noise.acceptedIntended, 5);
    assert.equal(noise.acceptedDisturbances, 0);
    assert.equal(noise.suppressedRawEdges, 8);

    const missing = await run('missing', 0, 0, 3, 1);
    assert.equal(missing.lastCount, 0);
    assert.equal(missing.underMinimum, 1);

    const held = await run('held', 1, 0, 3, 1);
    assert.equal(held.lastCount, 0);
    assert.equal(held.heldHigh, 1);

    const narrow = await run('narrow', 3, 0, 8, 3);
    assert.equal(narrow.missedIntended, 3);
    assert.equal(narrow.accepted, 0);
  } finally {
    server.kill();
  }
});
