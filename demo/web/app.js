const $ = id => document.getElementById(id);
const controls = ['events', 'glitches', 'filter', 'minimum', 'seed'];
let latest = null;
let running = false;

function values() {
  return Object.fromEntries(controls.map(id => [id, Number($(id).value)]));
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
}

function status(text, kind) {
  const el = $('engine-status');
  el.className = `status ${kind}`;
  el.innerHTML = `<span class="dot"></span> ${text}`;
}

function setPreset(name) {
  const preset = {
    water: { events: 5, glitches: 8, filter: 3, minimum: 4 },
    energy: { events: 9, glitches: 4, filter: 2, minimum: 7 },
    air: { events: 12, glitches: 11, filter: 4, minimum: 10 },
  }[name];
  for (const [key, value] of Object.entries(preset)) $(key).value = value;
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
    $('rejected-count').textContent = r.rejected;
    $('minimum-count').textContent = data.options.minimum;
    $('run-id').textContent = `${data.trace.length} CLOCKS · SEED ${data.options.seed}`;
    const alert = r.underMinimum || r.overflow;
    $('result-chip').textContent = alert ? 'REVIEW REQUIRED' : 'WINDOW ACCEPTED';
    $('result-chip').className = `result-chip${alert ? ' alert' : ''}`;
    $('result-summary').textContent = r.underMinimum
      ? `Only ${r.lastCount} valid events arrived; the required minimum is ${data.options.minimum}.`
      : r.overflow
        ? 'The 8-bit count saturated. Readings above 255 cannot be reported precisely.'
        : `${r.rejected} raw edge${r.rejected === 1 ? ' was' : 's were'} rejected before the count was recorded.`;
    $('interpretation').textContent = r.accepted === r.intendedEvents
      ? `The HDL accepted all ${r.intendedEvents} intended events and rejected ${r.rejected} short transients in this generated test signal.`
      : `The HDL accepted ${r.accepted} edges for ${r.intendedEvents} intended events. This filter setting has a measurable tradeoff; change the stable-sample control and run again.`;
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
  if (latest.boundary >= start && latest.boundary < end) {
    const x = xx(latest.boundary);
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
