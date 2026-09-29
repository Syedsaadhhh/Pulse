# PulseTrust | Pak Troopers

PulseTrust is a configurable **digital pulse-output sensor monitor** for the Rocketathon Zero Fabless track. A host can enable counting while a machine is expected to run, set a minimum count, and close a measurement window. The block synchronizes a logic-level pulse, samples it at a documented rate, filters short transitions, counts accepted rising edges, and reports low count, observed short-transition, held-high-window, and overflow status. Those flags are observations, not a diagnosis of the physical cause.

The interactive browser demo is driven by **the actual Verilog** in `src/project.v`. Every run generates an input waveform, compiles the HDL with Icarus Verilog, executes it, and draws the resulting trace. The demo accelerates the parameterized sample divider from its production default of 50,000 clocks to 4 for fast simulation and labels this difference. There is no hardcoded chip output or hardware claim.

## Timing and intended integration

`info.yaml` targets 50 MHz, or 20 ns per clock. The synthesizable RTL uses a one-cycle clock enable every 50,000 clocks: **one filter sample per 1 ms at 50 MHz**. `ui_in[3:1]` selects 1–8 consecutive stable samples, a nominal 1–8 ms threshold at that clock. The two-flop synchronizer still operates on every clock. A pulse can be lost if its high or low portion is too short for the selected sample threshold and sampling phase. The actual pulse envelope must be chosen from a sensor datasheet or recorded waveform; none is validated here. Use a conditioned digital input, not an unprotected sensor wire.

A provisional example in [RESEARCH.md](RESEARCH.md) checks the timing against Seeed Studio's published G1/2-inch sensor relationship over 1–10 L/min. It is a calculation, not a measured interface or a guarantee. At higher flow, a three-sample setting can suppress genuine pulses, and the sensor's approximately 5 V output needs a suitable voltage-conditioning interface before any Tiny Tapeout digital input.

The host supplies an active-operation enable, a minimum count, and a boundary tick. A low count means the observed events missed that chosen expectation; it does not prove blocked flow or a failed sensor. A held-high flag means the *filtered level* stayed high across a complete, previously armed active window. The first boundary after reset/clear arms the observation.

## Judge demo

On the prepared Windows laptop, run `./run-demo.ps1` in PowerShell. The launcher checks the locally installed OSS CAD Suite, starts the server, and opens `http://127.0.0.1:4173`. Node.js and the OSS CAD Suite are required locally; the demo itself needs no internet connection. Select clean operation, short disturbances, missing response, held-high line, or deliberately over-filtered real pulses. Change events, short transitions, stable samples, minimum count, or seed, then press **Compile & simulate**. The comparison uses a simple software raw-edge counter on the same generated signal; it is not an ESP32 benchmark.

The page opens with a result calculated by the HDL. Set **Minimum expected** above the accepted count to show an alert, reduce **Stable samples required** to show why a permissive filter accepts short transitions, or select the counterexample to show why an overly strong filter misses genuine pulses. “Suppressed raw edges” may include real events; only the generated test harness knows its intended-event labels.

## Verification

Run `./run-tests.ps1`. It executes a self-checking Icarus testbench covering the sampled filter, counting, window snapshot, low-count alert, held-high observation, and overflow, then runs Yosys synthesis and the five-scenario live demo API check. `test/test.py` contains more Cocotb scenarios for the template CI. The six RTL Cocotb scenarios pass locally under Linux with Icarus; the earlier Windows Cocotb DLL issue has not been rechecked. Physical tile fit and timing remain pending a successful LibreLane report.

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
