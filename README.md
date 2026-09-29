# PulseTrust | Pak Troopers

PulseTrust is a configurable **digital sensor pulse integrity block** for the Rocketathon Zero Fabless track. It synchronizes a logic-level pulse, rejects transitions shorter than a chosen stable-sample threshold, counts accepted rising edges, and reports a completed window with glitch, low-count, and overflow flags.

The interactive browser demo is driven by **the actual Verilog** in `src/project.v`. Every run generates an input waveform, compiles the HDL with Icarus Verilog, executes it, and draws the resulting trace. There is no hardcoded chip output or hardware claim.

## Judge demo

On the prepared Windows laptop, run `./run-demo.ps1` in PowerShell. The launcher checks the locally installed OSS CAD Suite, starts the server, and opens `http://127.0.0.1:4173`. Node.js and the OSS CAD Suite are required locally; the demo itself needs no internet connection. The separate **Explore the chip** page is at `http://127.0.0.1:4173/chip` and linked from the live lab. Change real events, noise spikes, stable samples, minimum expected count, or signal seed, then press **Compile & simulate**. Scroll the waveform to see raw input, filtered level, and accepted strobes. A water meter, energy meter, and particle counter use the same RTL; their presets only change generated inputs.

The page opens with a result and large count already calculated by the HDL. The presenter can set **Minimum expected** above the accepted count to show an alert. For a stronger challenge, keep the seed fixed and set **Stable samples required** to 1, 3, then 8: the same 13 raw edges yield 13, 5, then 3 accepted events. Too little filtering counts noise; too much loses narrow real pulses. The generator does not change the raw waveform when the filter changes.

## Verification

Run `./run-tests.ps1`. It executes a self-checking Icarus testbench covering noise rejection, counting, window snapshot, low-count alert, and overflow, then runs Yosys synthesis and structural checks. All **five Cocotb tests passed** in the [GitHub Actions test run](https://github.com/Syedsaadhhh/Pulse/actions/runs/36459089941). Local Cocotb execution on this laptop is blocked by a Windows simulator DLL load error under both Python 3.12 and 3.13; the Icarus self-check and live HDL simulator run successfully.

The [Tiny Tapeout physical-design workflow](https://github.com/Syedsaadhhh/Pulse/actions/runs/36459089954) completed its GDS, precheck, and gate-level test jobs. The generated layout has 284 standard cells and 14.76% standard-cell utilization in a 202.08 × 154.98 µm die. Final route DRC, Magic DRC, LVS, and antenna violation counts are zero. These are tool-flow results, not measurements from fabricated silicon. GitHub Pages viewer publication failed because Pages was not enabled; the layout artifact itself passed.

The chip explorer loads a deterministic JSON extraction of the actual routed DEF. Its 3D canvas supports orbit, zoom, placed-cell inspection, pin markers, and highlighted DEF nets; its logic tour is explicitly conceptual. The GDS tab shows the original physical render. The live challenge and 1/3/8 comparison call `/api/run` and execute the RTL. To regenerate geometry from the bundled DEF and IHP LEF size table, run `python tools/extract_layout.py`. The extractor checks component counts, fill count, standard-cell area, pin count, and net count against the physical-flow metrics.

## Files

- [One-page datasheet](DATASHEET.md)
- [Print-ready one-page PDF](output/pdf/PulseTrust-datasheet.pdf)
- [Research, alternatives, and team schedule](RESEARCH.md)
- [Pin-level detail and limits](docs/info.md)
- [Original Verilog](src/project.v)
- [Self-checking HDL test](test/rtl_selfcheck.v)
- [Pitch and judge interaction](PITCH.md)
- [Provenance and evidence](PROVENANCE.md)
- [Interactive chip explorer](demo/web/chip.html)
- [Layout extractor and bundled DEF](tools/extract_layout.py)

## Provenance

Started from the [Tiny Tapeout IHP Verilog template](https://github.com/TinyTapeout/ttihp-verilog-template), whose license is Apache-2.0. PulseTrust RTL, demo code, tests, and text were authored for this project. The prior-art sources in `RESEARCH.md` informed the problem framing; no third-party pulse-counter RTL was copied. The only local demo hardware is an existing laptop, used as the simulation host.
