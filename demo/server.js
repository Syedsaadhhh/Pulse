// SPDX-License-Identifier: Apache-2.0
// A local, offline-capable presentation server. Every run compiles and executes
// src/project.v with Icarus Verilog; the UI never invents chip results.
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const web = path.join(__dirname, 'web');
const port = Number(process.env.PORT || 4173);
const iverilog = process.env.IVERILOG_BIN || 'iverilog';
const vvp = process.env.VVP_BIN || 'vvp';
const simDiv = 4; // Fast parameter override; the physical RTL default is 50,000.
const physicalDiv = 50000;
const scenarios = new Set(['clean', 'noise', 'missing', 'held', 'narrow']);

function integer(value, min, max, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

function random(seed) {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function waveform(options) {
  const rand = random(options.seed);
  if (options.scenario === 'held') {
    const raw = Array(8 * simDiv).fill(0);
    raw.push(...Array((options.filter + 6) * simDiv).fill(1));
    const first = raw.length;
    raw.push(...Array(12 * simDiv).fill(1));
    const second = raw.length;
    raw.push(1, 1, 1);
    return { raw, boundaries: [first, second], spans: [{ kind: 'event', start: 8 * simDiv, end: first }] };
  }
  let types = [
    ...Array(options.events).fill('event'),
    ...Array(options.glitches).fill('glitch'),
  ];
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  const raw = Array(8 * simDiv).fill(0);
  const spans = [];
  for (const kind of types) {
    raw.push(...Array((3 + Math.floor(rand() * 4)) * simDiv).fill(0));
    const width = kind === 'event'
      ? (options.scenario === 'narrow' ? Math.max(2, Math.floor(options.filter / 2)) : options.filter + 3 + Math.floor(rand() * 3))
      : Math.max(1, Math.floor(options.filter / 2));
    const start = raw.length;
    raw.push(...Array(width * simDiv).fill(1));
    spans.push({ kind, start, end: raw.length });
    raw.push(...Array((options.filter + 5) * simDiv).fill(0));
  }
  raw.push(...Array((options.filter + 10) * simDiv).fill(0));
  const boundary = raw.length;
  raw.push(0, 0, 0);
  return { raw, boundaries: [boundary], spans };
}

function testbench(options, wave) {
  const rows = wave.raw.map((raw, cycle) => {
    const tick = wave.boundaries.includes(cycle) ? 1 : 0;
    const page = cycle >= wave.boundaries.at(-1) ? 1 : 0;
    const ui = raw | ((options.filter - 1) << 1) | (1 << 4) | (tick << 6) | (page << 7);
    return `    ui_in = 8'd${ui}; uio_in = 8'd${options.minimum};\n` +
      `    #5 clk = 1; #1 $display("S,${cycle},${raw},%0d,%0d,%0d,%0d,%0d,%0d,%0d,%0d", ` +
      `uio_out[0],uio_out[1],uo_out,uio_out[2],uio_out[3],uio_out[4],uio_out[5],uio_out[7]); #4 clk = 0;`;
  }).join('\n');
  return `\`timescale 1ns/1ps
module tb_live;
  reg clk, rst_n, ena;
  reg [7:0] ui_in, uio_in;
  wire [7:0] uo_out, uio_out, uio_oe;
  tt_um_syedsaadhhh_pulsetrust #(.SAMPLE_DIV(${simDiv})) dut (
    .ui_in(ui_in), .uo_out(uo_out), .uio_in(uio_in),
    .uio_out(uio_out), .uio_oe(uio_oe),
    .ena(ena), .clk(clk), .rst_n(rst_n)
  );
  initial begin
    clk = 0; rst_n = 0; ena = 1; ui_in = 0; uio_in = 0;
    repeat (4) begin #5 clk = 1; #5 clk = 0; end
    rst_n = 1;
${rows}
    $finish;
  end
endmodule
`;
}

function run(executable, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd, windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill(), 30000);
    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`${path.basename(executable)} exited ${code}: ${stderr.slice(0, 3000)}`));
    });
  });
}

async function simulate(body) {
  const options = {
    events: integer(body.events, 0, 32, 5),
    glitches: integer(body.glitches, 0, 32, 8),
    filter: integer(body.filter, 1, 8, 3),
    minimum: integer(body.minimum, 0, 255, 4),
    seed: integer(body.seed, 1, 999999, 2026),
    scenario: scenarios.has(body.scenario) ? body.scenario : 'noise',
  };
  const wave = waveform(options);
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'pulsetrust-'));
  try {
    const tbPath = path.join(dir, 'live_tb.v');
    const outPath = path.join(dir, 'sim.vvp');
    await fsp.writeFile(tbPath, testbench(options, wave));
    await run(iverilog, ['-g2005', '-s', 'tb_live', '-o', outPath,
      path.join(root, 'src', 'project.v'), tbPath], dir);
    const stdout = await run(vvp, [outPath], dir);
    const rows = stdout.split(/\r?\n/).filter(line => line.startsWith('S,'))
      .map(line => line.split(',').slice(1).map(Number));
    if (rows.length !== wave.raw.length || rows.some(row => row.length !== 10 || row.some(Number.isNaN))) {
      throw new Error('The simulator returned an incomplete trace.');
    }
    const trace = rows.map(([cycle, raw, filtered, accepted, count, glitch, under, overflow, ready, held]) =>
      ({ cycle, raw, filtered, accepted, count, glitch, under, overflow, ready, held }));
    const last = trace.at(-1);
    const rawEdges = trace.reduce((n, row, i) => n + Number(row.raw === 1 && (i === 0 || trace[i - 1].raw === 0)), 0);
    const accepted = trace.reduce((n, row) => n + row.accepted, 0);
    let acceptedIntended = 0;
    let acceptedDisturbances = 0;
    for (const row of trace) {
      if (!row.accepted) continue;
      const source = wave.spans.find(span => row.cycle >= span.start &&
        row.cycle < span.end + (options.filter + 2) * simDiv);
      if (source?.kind === 'event') acceptedIntended++;
      if (source?.kind === 'glitch') acceptedDisturbances++;
    }
    return {
      engine: 'Icarus Verilog executing src/project.v (accelerated SAMPLE_DIV=4)',
      timing: { clockHz: 50000000, productionDiv: physicalDiv, simDiv,
        sampleMsAt50MHz: physicalDiv / 50000 },
      options, boundaries: wave.boundaries, trace,
      result: {
        intendedEvents: wave.spans.filter(span => span.kind === 'event').length,
        rawEdges,
        accepted,
        suppressedRawEdges: rawEdges - accepted,
        acceptedIntended,
        acceptedDisturbances,
        missedIntended: wave.spans.filter(span => span.kind === 'event').length - acceptedIntended,
        lastCount: last.count,
        glitchFlag: last.glitch,
        underMinimum: last.under,
        overflow: last.overflow,
        heldHigh: last.held,
      },
    };
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
}

const files = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
};

http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && files[req.url]) {
      const [name, type] = files[req.url];
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
      fs.createReadStream(path.join(web, name)).pipe(res);
      return;
    }
    if (req.method === 'POST' && req.url === '/api/run') {
      let input = '';
      for await (const chunk of req) {
        input += chunk;
        if (input.length > 16000) throw new Error('Request too large.');
      }
      const result = await simulate(JSON.parse(input));
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(result));
      return;
    }
    res.writeHead(404); res.end('Not found');
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`PulseTrust demo: http://127.0.0.1:${port}`);
});
