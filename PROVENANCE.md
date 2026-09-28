# Provenance and evidence register

| Item | Source / status | Evidence and limit |
|---|---|---|
| Repository structure, wrapper/test/metadata workflow | [Tiny Tapeout IHP Verilog template](https://github.com/TinyTapeout/ttihp-verilog-template), Apache-2.0; cloned as local `upstream` | Open source base is disclosed. Its example logic was replaced. |
| PulseTrust RTL, testbench, browser demo, docs | Authored for Pak Troopers on 28 September 2026 | Source files in this repository; no other event-counter RTL copied. |
| Icarus Verilog, Yosys, VVP | Official OSS CAD Suite, locally installed outside repository | `run-tests.ps1` passes; demo `/api/run` invokes Icarus/VVP each time. |
| Cocotb tests | Authored in `test/test.py` | Local Windows execution is blocked by a simulator DLL load error under Python 3.12 and 3.13; no pass claim yet. |
| Physical layout | Not yet generated | No GDS, DRC, tile-fit, or timing claim. Update only from actual LibreLane report. |
| Input examples | Seeded synthetic pulses and short glitches | Clearly labelled generated signal. No real sensor or field measurements claimed. |
| Laptop | Team's existing machine | Host for compilation, simulation and display; it is not the proposed chip. No extra purchased build parts. |

**Honesty note:** This is a digital prototype for a conditioned logic input. It cannot repair wiring, analog noise, calibration errors, or a failed sensor. A low count is a warning under a host-selected expectation; it does not diagnose the physical cause. The market case is a hypothesis until an integrator interview or real deployment.
