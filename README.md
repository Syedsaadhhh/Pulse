# PulseTrust | Pak Troopers

PulseTrust is a configurable **digital sensor pulse integrity block** for the Rocketathon Zero Fabless track. It synchronizes a logic-level pulse, rejects transitions shorter than a chosen stable-sample threshold, counts accepted rising edges, and reports a completed window with glitch, low-count, and overflow flags.

The interactive browser demo is driven by **the actual Verilog** in `src/project.v`. Every run generates an input waveform, compiles the HDL with Icarus Verilog, executes it, and draws the resulting trace. There is no hardcoded chip output or hardware claim.

## Judge demo

On the prepared Windows laptop, run `./run-demo.ps1` in PowerShell. The launcher checks the locally installed OSS CAD Suite, starts the server, and opens `http://127.0.0.1:4173`. Node.js and the OSS CAD Suite are required locally; the demo itself needs no internet connection. Change real events, noise spikes, stable samples, minimum expected count, or signal seed, then press **Compile & simulate**. Scroll the waveform to see raw input, filtered level, and accepted strobes. A water meter, energy meter, and particle counter use the same RTL; their presets only change generated inputs.

The page opens with a result and large count already calculated by the HDL. The presenter can then set **Minimum expected** above the accepted count to show an alert, or reduce **Stable samples required** to show why an overly permissive filter accepts noise.

## Verification

Run `./run-tests.ps1`. It executes a self-checking Icarus testbench covering noise rejection, counting, window snapshot, low-count alert, and overflow, then runs Yosys synthesis and structural checks. `test/test.py` contains more Cocotb scenarios for the template CI. Local Cocotb execution on this laptop is currently blocked by a Windows simulator DLL load error under both Python 3.12 and 3.13; the Icarus self-check and live HDL simulator run successfully. Physical tile fit and timing are pending a LibreLane report.

## Files

- [One-page datasheet](DATASHEET.md)
- [Print-ready one-page PDF](output/pdf/PulseTrust-datasheet.pdf)
- [Research, alternatives, and team schedule](RESEARCH.md)
- [Pin-level detail and limits](docs/info.md)
- [Original Verilog](src/project.v)
- [Self-checking HDL test](test/rtl_selfcheck.v)
- [Pitch and judge interaction](PITCH.md)
- [Provenance and evidence](PROVENANCE.md)

## Provenance

Started from the [Tiny Tapeout IHP Verilog template](https://github.com/TinyTapeout/ttihp-verilog-template), whose license is Apache-2.0. PulseTrust RTL, demo code, tests, and text were authored for this project. The prior-art sources in `RESEARCH.md` informed the problem framing; no third-party pulse-counter RTL was copied. The only local demo hardware is an existing laptop, used as the simulation host.

