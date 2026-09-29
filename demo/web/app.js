const $ = id => document.getElementById(id);
const controls = ['events', 'glitches', 'filter', 'minimum', 'seed'];
let latest = null;
let running = false;

function values() {
  return { ...Object.fromEntries(controls.map(id => [id, Number($(id).value)])),
    scenario: $('scenario').value };
}

function refreshLabels() {
  for (const id of ['events', 'glitches', 'filter', 'minimum']) {
    $(`${id}-value`).textContent = $(id).value;
  }
}

function markDirty() {
  if (!latest || running) return;
  status('SETTINGS CHANGED', 'waiting');
  $('result-chip').textContent = 'PREVIOUS RUN';
  $('result-chip').className = 'result-chip';
  $('result-summary').textContent = 'Press Compile & simulate to test these settings in the real Verilog.';
  $('comparison').textContent = 'Settings changed; rerun for a comparison of this signal.';
}

function status(text, kind) {
  const el = $('engine-status');
  el.className = `status ${kind}`;
  el.innerHTML = `<span class="dot"></span> ${text}`;
}

function setPreset(name) {
  const preset = {
    clean: { events: 5, glitches: 0, filter: 3, minimum: 4 },
    noise: { events: 5, glitches: 8, filter: 3, minimum: 4 },
    missing: { events: 0, glitches: 0, filter: 3, minimum: 1 },
    held: { events: 1, glitches: 0, filter: 3, minimum: 1 },
    narrow: { events: 3, glitches: 0, filter: 8, minimum: 3 },
  }[name];
  for (const [key, value] of Object.entries(preset)) $(key).value = value;
  const fixed = name === 'held';
  $('events').disabled = fixed;
  $('glitches').disabled = fixed;
  $('scenario-note').textContent = fixed
    ? 'This case fixes one first-window rise and a full following high window. The event and short-transition sliders do not apply.'
    : 'Controls define a generated signal, not measured sensor data.';
  refreshLabels();
}

async function runChip() {
  if (running) return;
  running = true;
  $('run').disabled = true;
  $('rerun').disabled = true;
  status('COMPILING HDL', 'waiting');
  $('result-chip').textContent = 'RUNNING CHIP';
  $('result-chip').className = 'result-chip';
  try {
    const response = await fetch('/api/run', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values()),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Simulation failed');
    latest = data;
    const r = data.result;
    status('VERIFIED FROM RTL', 'ok');
    $('last-count').textContent = r.lastCount;
    $('raw-count').textContent = r.rawEdges;
    $('rejected-count').textContent = r.suppressedRawEdges;
    $('minimum-count').textContent = data.options.minimum;
    $('run-id').textContent = `${data.trace.length} SIM CLOCKS · SEED ${data.options.seed}`;
    const alert = r.underMinimum || r.overflow || r.heldHigh;
    $('result-chip').textContent = alert ? 'REVIEW REQUIRED' : 'WINDOW ACCEPTED';
    $('result-chip').className = `result-chip${alert ? ' alert' : ''}`;
    const reasons = [];
    if (r.underMinimum) reasons.push(`completed count ${r.lastCount} is below minimum ${data.options.minimum}`);
    if (r.heldHigh) reasons.push('the filtered line stayed high through a whole active window');
    if (r.overflow) reasons.push('the 8-bit counter saturated at 255');
    $('result-summary').textContent = reasons.length
      ? `Review: ${reasons.join('; ')}.`
      : `Completed window met the configured minimum of ${data.options.minimum}.`;
    $('comparison').textContent = `Whole generated trace — plain raw-edge baseline: ${r.rawEdges} · HDL accepted: ${r.accepted} · ` +
      `Generator labels: ${r.intendedEvents} intended, ${r.acceptedIntended} accepted intended, ` +
      `${r.acceptedDisturbances} accepted short transitions, ${r.missedIntended} missed intended.`;
    $('interpretation').textContent = r.missedIntended
      ? `A real event was too narrow for this filter: ${r.missedIntended} intended pulse(s) were missed. More filtering is not always better.`
      : r.acceptedDisturbances
        ? `${r.acceptedDisturbances} generated short transition(s) entered the count. A permissive filter can overcount.`
        : `In this generated test, the HDL accepted ${r.acceptedIntended} intended event(s). A low count or held-high observation does not diagnose the physical cause.`;
    $('position').max = Math.max(0, data.trace.length - Number($('zoom').value));
    $('position').value = 0;
    draw();
  } catch (error) {
    latest = null;
    status('SIMULATION ERROR', 'error');
    $('result-chip').textContent = 'NO CHIP RESULT';
    $('result-summary').textContent = error.message;
    for (const id of ['last-count', 'raw-count', 'rejected-count', 'minimum-count']) $(id).textContent = '—';
    $('run-id').textContent = 'NO VERIFIED RUN';
    $('comparison').textContent = 'No comparison is available without a completed RTL simulation.';
    $('interpretation').textContent = 'The dashboard shows no substitute numbers when the HDL engine is unavailable. Check the local simulator path and retry.';
    draw();
  } finally {
    running = false;
    $('run').disabled = false;
    $('rerun').disabled = false;
  }
}

function draw() {
  const canvas = $('plot');
  const box = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(box.width * scale));
  canvas.height = Math.max(1, Math.round(box.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  const w = box.width, h = box.height;
  ctx.fillStyle = '#071522'; ctx.fillRect(0, 0, w, h);
  const x0 = 132, right = 26, top = 25;
  const rows = [64, 148, 232];
  ctx.font = '11px Inter, Segoe UI, sans-serif';
  ctx.textBaseline = 'middle';
  const labels = ['RAW INPUT', 'FILTERED', 'ACCEPTED'];
  rows.forEach((y, i) => {
    ctx.fillStyle = '#a9c2cb'; ctx.fillText(labels[i], 17, y);
    ctx.strokeStyle = '#244050'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y + 30); ctx.lineTo(w - right, y + 30); ctx.stroke();
  });
  if (!latest) {
    ctx.fillStyle = '#7795a2'; ctx.font = '14px Inter, Segoe UI, sans-serif';
    ctx.fillText('Waiting for a real Verilog simulation…', x0 + 18, h / 2);
    return;
  }
  const trace = latest.trace;
  const visible = Number($('zoom').value);
  const maxStart = Math.max(0, trace.length - visible);
  $('position').max = maxStart;
  const start = Math.min(Number($('position').value), maxStart);
  const end = Math.min(trace.length, start + visible);
  const step = (w - x0 - right) / visible;
  const xx = i => x0 + (i - start) * step;
  ctx.fillStyle = '#718c99'; ctx.font = '10px Inter, Segoe UI, sans-serif';
  for (let i = Math.ceil(start / 20) * 20; i < end; i += 20) {
    const x = xx(i);
    ctx.fillText(String(i), x + 3, top);
    ctx.strokeStyle = '#143040'; ctx.beginPath(); ctx.moveTo(x, 38); ctx.lineTo(x, h - 20); ctx.stroke();
  }
  for (const boundary of latest.boundaries) if (boundary >= start && boundary < end) {
    const x = xx(boundary);
    ctx.setLineDash([5, 4]); ctx.strokeStyle = '#ffce7a';
    ctx.beginPath(); ctx.moveTo(x, 38); ctx.lineTo(x, h - 19); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = '#ffce7a'; ctx.fillText('WINDOW CLOSE', Math.min(x + 5, w - 119), 45);
  }
  function stepLine(key, y, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
    ctx.beginPath();
    let previous = trace[start]?.[key] || 0;
    ctx.moveTo(xx(start), y + (previous ? -18 : 15));
    for (let i = start; i < end; i++) {
      const val = trace[i][key];
      ctx.lineTo(xx(i), y + (previous ? -18 : 15));
      if (val !== previous) ctx.lineTo(xx(i), y + (val ? -18 : 15));
      previous = val;
    }
    ctx.lineTo(xx(end), y + (previous ? -18 : 15)); ctx.stroke();
  }
  stepLine('raw', rows[0], '#ffad66');
  stepLine('filtered', rows[1], '#60e3dc');
  ctx.strokeStyle = '#b9ee7e'; ctx.lineWidth = Math.max(2, Math.min(6, step * .75));
  for (let i = start; i < end; i++) if (trace[i].accepted) {
    const x = xx(i) + step / 2;
    ctx.beginPath(); ctx.moveTo(x, rows[2] + 15); ctx.lineTo(x, rows[2] - 22); ctx.stroke();
  }
  ctx.fillStyle = '#678895'; ctx.fillText(`${start}–${end} CLOCK CYCLES`, x0, h - 12);
}

for (const id of ['events', 'glitches', 'filter', 'minimum']) $(id).addEventListener('input', () => { refreshLabels(); markDirty(); });
$('seed').addEventListener('input', markDirty);
$('scenario').addEventListener('change', event => { setPreset(event.target.value); markDirty(); runChip(); });
$('run').addEventListener('click', runChip);
$('rerun').addEventListener('click', runChip);
$('randomize').addEventListener('click', () => { $('seed').value = 1 + Math.floor(Math.random() * 999999); runChip(); });
$('zoom').addEventListener('change', draw);
$('position').addEventListener('input', draw);
window.addEventListener('resize', draw);
refreshLabels();
draw();
runChip();
