# Provenance and evidence register

| Item | Source / status | Evidence and limit |
|---|---|---|
| Repository structure, wrapper/test/metadata workflow | [Tiny Tapeout IHP Verilog template](https://github.com/TinyTapeout/ttihp-verilog-template), Apache-2.0; cloned as local `upstream` | Open source base is disclosed. Its example logic was replaced. |
| PulseTrust RTL, testbench, browser demo, docs | Authored for Pak Troopers on 28 September 2026 | Source files in this repository; no other event-counter RTL copied. |
| Icarus Verilog, Yosys, VVP | Official OSS CAD Suite, locally installed outside repository | `run-tests.ps1` passes; demo `/api/run` invokes Icarus/VVP each time. |
| Cocotb tests | Authored in `test/test.py` | [GitHub Actions: 5 passed, 0 failed](https://github.com/Syedsaadhhh/Pulse/actions/runs/36459089941). Local Windows execution remains blocked by a simulator DLL load error. |
| Physical layout | [Tiny Tapeout GDS workflow](https://github.com/Syedsaadhhh/Pulse/actions/runs/36459089954) | GDS, precheck, and gate-level test jobs passed; final routing DRC, Magic DRC, LVS, and antenna violations are zero in [metrics.json](evidence/layout/metrics.json). GitHub Pages viewer publication failed independently because Pages was not enabled. |
| 3D explorer geometry | Bundled routed [DEF](evidence/layout/tt_um_syedsaadhhh_pulsetrust.def) + IHP [standard-cell LEF](https://github.com/IHP-GmbH/IHP-Open-PDK/blob/main/ihp-sg13g2/libs.ref/sg13g2_stdcell/lef/sg13g2_stdcell.lef) size table | `tools/extract_layout.py` validates DEF counts and cell area, then writes `demo/web/layout-v1.json` with source hashes. The Z heights and colors are visual aids; no transistor-level 3D accuracy is claimed. |
| Input examples | Seeded synthetic pulses and short glitches | Clearly labelled generated signal. No real sensor or field measurements claimed. |
| Laptop | Team's existing machine | Host for compilation, simulation and display; it is not the proposed chip. No extra purchased build parts. |

**Honesty note:** This is a digital prototype for a conditioned logic input. It cannot repair wiring, analog noise, calibration errors, or a failed sensor. A low count is a warning under a host-selected expectation; it does not diagnose the physical cause. The market case is a hypothesis until an integrator interview or real deployment.
