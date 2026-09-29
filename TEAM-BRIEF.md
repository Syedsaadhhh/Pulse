# PulseTrust: team and judge briefing

## The 20-second explanation

Pulse-output sensors can send short false transitions alongside real events. PulseTrust is a reusable **digital input IP block** that synchronizes a conditioned logic pulse, requires a chosen number of stable clock samples, counts accepted rising edges, and closes measurement windows with status flags. In the browser, judges can change the input and filter; every run compiles and executes our actual Verilog. The separate chip explorer shows cell positions and routed nets extracted from the completed Tiny Tapeout physical-design files.

## Who it is for and why

The intended customer is a designer integrating a pulse-output sensor into a meter, machine controller, or monitoring device. The block handles a repeated digital task inside a larger system: reject short transitions, retain an auditable event count, and warn when a host-defined window contains fewer events than expected. It does not identify the physical reason for a low count, fix analog wiring problems, or replace the sensor's input protection.

## What each part actually does

| Part | Input → output | Why it exists | Evidence |
|---|---|---|---|
| Input contract | Conditioned logic-level pulse and control pins | Defines how a host uses the block | `src/project.v`, `DATASHEET.md` |
| Two-flop synchronizer | External pulse → clock-domain samples | Reduces metastability risk | `pulse_meta`, `pulse_sync` in RTL; Cocotb tests |
| Stable-sample filter | 1–8 selected samples → accepted level transition | Rejects short spikes; larger settings can also lose short valid pulses | `pending_samples`, `filtered_level`; same-seed comparison |
| Event counter | Accepted rising edges → 8-bit count | Counts up to 255 and flags further events | `live_count`, `current_overflow`; saturation test |
| Measurement window | Host boundary and minimum → retained count and flags | Lets a host inspect a completed interval | `last_count`, `last_under_min`, `last_glitch`, `window_ready` |
| Live lab | User settings → generated pulse stream → Icarus compilation and simulation → waveform | Lets a judge challenge the actual RTL | `demo/server.js`; `/api/run` returns each cycle and result |
| Chip explorer | Routed DEF, LEF cell sizes, GDS render → interactive view | Makes the physical result inspectable | `tools/extract_layout.py`, `demo/web/layout-v1.json`, `evidence/layout/` |

The physical explorer uses the real X/Y coordinates, cells, and route segments. Its height, colors, and lighting are presentation aids. The **Logic tour** labels RTL functions conceptually; it does not claim an exact function-to-cell placement map. The input examples are generated, not field measurements.

## Judge demonstration: 60–90 seconds

1. Open `/chip`: “Did that pulse really happen?” Drag to orbit, select a cell, and show its actual IHP type, coordinates, and connected net. Click **GDS evidence**.
2. Click **Inject noise into the chip**. Use the default 5 intended events, 8 spikes, 3 stable samples, seed 2026. Press **Compile & run RTL**. The raw stream has 13 rising edges; this Verilog run accepts 5 and rejects 8.
3. Keep the seed and press **Compare 1, 3 and 8 samples**. The input stays fixed while three independent RTL simulations show the filtering tradeoff. Do not quote a count until it appears on screen.
4. Point to the [physical-design workflow](https://github.com/Syedsaadhhh/Pulse/actions/runs/36459089954): GDS, precheck, and gate-level tests passed. The die is 202.08 × 154.98 µm; 284 standard cells occupy 14.76% of the core; final routing DRC, Magic DRC, LVS, and antenna counts are zero. The slow-corner setup margin is +10.95 ns against the 20 ns constraint.
5. If asked for implementation detail, open **Logic tour**, then show `src/project.v` and `DATASHEET.md`.

## Likely questions

- **Is there a fabricated chip?** No. This is verified RTL plus completed physical-design output, not measured silicon.
- **Is a water meter already validated?** No. The current demo works in clock samples. At 50 MHz, 1–8 samples equal roughly 20–160 ns. Mechanical bounce may need a slower clock or a prescaler and application testing.
- **Does a low-count flag diagnose a fault?** It only reports that the completed count was below the host-set minimum.
- **Can the filter miss real pulses?** Yes. A valid pulse narrower than the chosen threshold can be rejected. Show this in same-seed comparison.
- **What happens after 255 events?** The counter saturates at 255 and records an overflow flag.
- **What is hardcoded?** The displayed input is reproducibly generated from user controls and a seed. Results and waveforms come from a new Verilog compile and simulation. Physical coordinates come from the routed DEF, and metrics come from the workflow report.
- **Why no analog front end?** This is a digital IP block meant to receive a conditioned logic signal; an integrator supplies application-specific input protection and analog conditioning.

## Team handoff

- **Backend / RTL:** explain pin contract, simulator, test results, and the live challenge. Keep the local `run-demo.ps1` fallback ready if venue internet fails.
- **Taha, UI/UX:** drive the browser demo, orbit/pick a real cell, switch to GDS and Logic tour, and keep the controls visible for a judge to change.
- **Zaid, research and slides:** lead with the sensor-integration problem, explain the boundaries of the claim, and cite the datasheet, provenance, tests, and physical workflow.

Start locally with `./run-demo.ps1`; visit `http://127.0.0.1:4173/chip`. Run `./run-tests.ps1` to reproduce RTL self-check and Yosys validation. The hosted service uses the same `demo/server.js` and `src/project.v` through the `Dockerfile`.
