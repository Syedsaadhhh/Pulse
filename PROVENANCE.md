# Provenance and evidence register

| Item | Source / status | Evidence and limit |
|---|---|---|
| Repository structure, wrapper/test/metadata workflow | [Tiny Tapeout IHP Verilog template](https://github.com/TinyTapeout/ttihp-verilog-template), Apache-2.0; cloned as local `upstream` | Open source base is disclosed. Its example logic was replaced. |
| PulseTrust RTL, testbench, browser demo, docs | Authored for Pak Troopers from 28 September 2026, revised 29 September | Source files in this repository; no other event-counter RTL copied. |
| Icarus Verilog, Yosys, VVP | Official OSS CAD Suite on the event laptop; local Linux testing uses Icarus | The new Icarus self-check and `test/demo_api.test.js` pass locally. Yosys needs a fresh check of this revision. Demo `/api/run` invokes Icarus/VVP each time with accelerated divider 4. |
| Cocotb tests | Authored in `test/test.py` | Six RTL Cocotb scenarios pass locally under Linux/Icarus on this revision. Earlier Windows DLL failure is historical; gate-level and hosted CI results remain separate. |
| Physical layout | Not yet generated | No GDS, DRC, tile-fit, or timing claim. Update only from actual LibreLane report. |
| Input examples | Seeded synthetic intended pulses and short transitions | Generator labels are available only to the test harness; the chip cannot infer physical truth. No real sensor or field measurements claimed. |
| Datasheet PDF | `tools/build_datasheet.py` | Rebuilt from the 29 September copy. The Markdown datasheet carries the full pin and timing semantics. |
| Laptop | Team's existing machine | Host for compilation, simulation and display; it is not the proposed chip. No extra purchased build parts. |

**Honesty note:** This is a digital prototype for a conditioned logic input. It cannot repair wiring, analog noise, calibration errors, or a failed sensor. A low count is a warning under a host-selected expectation; it does not diagnose the physical cause. The market case is a hypothesis until an integrator interview or real deployment.
