# Research and build decision | 28 September 2026

## 29 September engineering revision

The lead story now uses **one prospective integration**: a conditioned flow-sensor pulse stream while a host commands a pump to run. The host sets the expected minimum and closes the window. A low count or a whole-window high level is a reason to review, not a diagnosis of blockage, flow, or sensor health. The previous use-case presets have been replaced with reproducible clean, short-transition, missing-response, held-high, and over-filtered challenge cases. No real sensor waveform, buyer interview, or price/performance benchmark exists yet.

The original 50 MHz, 1–8 clock-sample setting corresponded to only about 20–160 ns. The revised RTL uses a synchronous 50,000-clock divider so the target 50 MHz input produces one sample per millisecond; the filter uses 1–8 stable samples. The live demo overrides the parameter to four cycles to keep simulation responsive. At default generated settings, a plain raw-edge counter sees 13 edges and the RTL accepts 5 intended events; the strong-filter counterexample also shows three genuine generated events missed. These are generated traces, not measurements from a pump. A physical sensor's high/low pulse widths and disturbance envelope must be obtained before deployment claims. ESP32 PCNT offers glitch filtering and watch points, so any differentiation remains a product hypothesis rather than a novelty claim.

**Provisional sensor envelope, not a field test:** [Seeed Studio's G1/2-inch water-flow sensor specification](https://wiki.seeedstudio.com/G1_and_2_inch_Water_Flow_Sensor/) gives pulse frequency `7.5 × Q` Hz for `Q` in L/min, a 40–60% output duty cycle, and a precision figure stated for 1–10 L/min. At 10 L/min, the approximate 75 Hz period is 13.3 ms; either the high or low part could be as short as approximately 5.3 ms at a 40/60 duty split. A nominal 3 ms stable-sample filter is a plausible *starting hypothesis* for this limited range, subject to sampling phase, synchronization, actual signal tolerance, and bench validation. At 30 L/min the same published relation gives a 225 Hz period and potentially about 1.8 ms on one level, so a 3 ms filter might miss real events. This calculation is an inference from the published nominal relationship, **not a guaranteed pulse-width specification**. The listed output-high level is above 4.5 V at 5 V supply, so a suitable input-conditioning and voltage interface would be required before connecting to the digital block; none is built or claimed here.

The one-page Markdown and PDF datasheets have been updated. Icarus self-check and demo API test pass locally for this revision; Cocotb, Yosys, GDS/precheck, gate-level simulation, tile fit and 50 MHz timing need fresh workflow evidence. Treat the dated schedule and status below as a historical planning record.

## Track fit

The [organizer's current track guide](https://pk2047.therocketguy.space/rocketathon/tracks) asks the Fabless team for a small working digital design, live simulation tests, a one-page datasheet, and clean physical-layout evidence ready for Tiny Tapeout. The [participant FAQ](https://pk2047.therocketguy.space/rocketathon/faqs/participant) permits work before the event. We are bringing an original RTL core, tests, and laptop-hosted simulation rather than claiming existing silicon. KYS and Alkhidmat portals were excluded because the team reports their challenge pages are stale. A moderator's informal “open innovation” comment remains unverified in writing; this project is framed squarely inside Fabless.

## Real problem and buyer

**Bottleneck:** a pulse-output sensor's raw digital stream can contain short false transitions, causing an inflated event count, while a low count over an expected operating window can reveal a missing flow or interrupted process. [Rockwell's high-speed counter manual](https://literature.rockwellautomation.com/idc/groups/literature/documents/um/1746-um002_-en-p.pdf) explicitly warns that noise can create false pulses and recommends appropriate input filtering and wiring. [Espressif's pulse-counter documentation](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32h2/api-reference/peripherals/pcnt.html) shows glitch filtering is established practice, including the danger of filtering valid narrow pulses.

**Potential B2B integrator:** a meter, sensor gateway, or industrial control board designer who needs a reusable front-end digital block with a simple pin contract and auditable event count. This is an IP-block concept, not evidence of a paying customer. We have no interviews, procurement data, or comparative silicon benchmark yet.

**Why this combination:** configurable stable-sample filtering, a windowed count, explicit rejected-transition evidence, a minimum-event alert, and saturation reporting make failure cases observable. Individual pulse filters and counters already exist, so we claim a useful integrated teaching/prototyping block and demonstrable workflow, not invention of glitch filtering.

## Alternatives considered

| Concept | Strength | Why not the lead demo tonight |
|---|---|---|
| Telemetry CRC/sequence checker | Real data-integrity problem; deterministic tests | Packet-format assumptions and existing IP make the first judge interaction less immediate. Could be a later sibling IP block. |
| Sensor averaging/filtering | Useful on many boards | An analog front end and calibration story are needed before physical measurement claims. |
| Bare pulse counter | Easy to implement | Does not expose the reliability problem or a strong challenge case. |
| PulseTrust | One input can visibly show clean pulses, glitches, accepted edges, under-count, and overflow | Still needs physical implementation and a target-buyer interview. |

## Open-source scan and reuse decision

The [Tiny Tapeout IHP Verilog template](https://github.com/TinyTapeout/ttihp-verilog-template) provides the wrapper, metadata structure, docs, tests, and a LibreLane GitHub Actions route. We cloned it as `upstream` and replaced its example logic with our RTL. The [DinkoOletic Tiny Tapeout event-counter project](https://github.com/DinkoOletic/tt09-HDL_unizgfer_15ch_AE_evt_counter) demonstrates that event counting has prior art; no code was copied. Reddit PLC/electronics discussions were read as anecdotal discovery only. Academia.edu search surfaced no directly applicable validated reference or implementation, so the technical case uses manufacturer and tool documentation.

## What is real now

- Original RTL and pin-level documentation exist.
- Self-checking Icarus Verilog test and Yosys structural synthesis pass locally.
- The browser interface compiles and executes the RTL on each run, then renders the returned cycle-by-cycle trace. The water, energy, and particle use cases are input presets, not three different hardware designs.
- A 1×1 tile and 50 MHz appear in `info.yaml` as **targets only**. No mapped area, static timing, DRC, or GDS report exists yet. Tiny Tapeout's [template workflow](https://github.com/TinyTapeout/ttihp-verilog-template) runs LibreLane in GitHub Actions after publication to a team repository.
- Cocotb test cases are written but local Windows execution fails while loading the simulator DLL under Python 3.12 and 3.13. GitHub Actions remains the intended environment for those tests. Do not say they pass until a CI result exists.

## Remaining slices for tomorrow, 9:00–18:00

| Time | Taha — UI/UX | You — RTL/integration | Zaid — research and deck |
|---|---|---|---|
| Before 09:00 | Verify layout on event laptop and rehearse two clicks | Run `run-tests.ps1`; ensure offline server opens | Check source links, print/save datasheet and provenance |
| 09:00–10:00 | Put result and waveform in full-screen browser | Run challenge cases; ask mentor about 1×1/clock target | Confirm exact submission deadline and track interpretation |
| 10:00–12:00 | Improve annotations from real judge feedback | Publish to team GitHub; run template CI/LibreLane; fix any failures | Capture actual test/layout screenshots and citations |
| 12:00–14:00 | Polish flow and responsive display | Re-run RTL and browser after each change | Finish slides and one-page honesty note from actual evidence |
| 14:00–16:00 | Lead interactive rehearsal | Handle failure and debug path | Cross-check every pitch claim; prepare Q&A |
| 16:00–18:00 | Present as assigned | Freeze build; submit before real announced cutoff | Final deck and provenance submission |

These are team work blocks, not an organizer timetable. Keep the simulator and docs locally available if venue internet is poor. The single critical missing track artifact is a **real physical layout report**; seek a working GitHub Actions or local LibreLane run early, and never substitute Yosys generic cells for tile-fit proof.
