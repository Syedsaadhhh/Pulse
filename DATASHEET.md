# PulseTrust — digital sensor-response monitor IP

**Revision:** sensor-health RTL candidate, 29 September 2026

**Interface:** Tiny Tapeout IHP Verilog template, 8 input / 8 output / 8 bidirectional pins

**Target:** 1×1 tile and 50 MHz *requested in metadata; physical fit and timing unverified*

## Function and timing

PulseTrust accepts a **conditioned logic-level** pulse from a sensor, passes it through a two-flop synchronizer, requires 1–8 consecutive stable filter samples per transition, counts accepted rising edges to a saturating 8-bit total, and snapshots the count at a host-defined window boundary. It reports an observed incomplete transition, count below the host's minimum, a whole-window held-high observation, and saturation. A prospective integration is a pulse-output flow sensor observed while a pump is commanded on; no physical sensor has been validated.

At the declared 50 MHz host clock, the RTL's default `SAMPLE_DIV=50000` produces one filter sample every **1 ms**. The 1–8 stable-sample selection is a *nominal* 1–8 ms threshold at that clock. Filtering uses a synchronous clock enable; the two-flop synchronizer operates on every clock. Both high and low portions of a pulse must survive the filter and sampling phase. Actual minimum reliable width and maximum event rate require a selected sensor waveform, timing margins, and validation. The divider parameter's supported range is 1–65,536. The browser accelerates this parameter to 4 for simulation; it is not a physical timing measurement.

## Pins

| Pin | Direction | Meaning |
|---|---|---|
| `ui_in[0]` | in | Raw conditioned digital pulse. |
| `ui_in[3:1]` | in | Stable samples minus one (`0`–`7` means 1–8). Keep stable during a window. |
| `ui_in[4]` | in | Count enable; host may use it to represent commanded operation. |
| `ui_in[5]` | in | Synchronous clear. |
| `ui_in[6]` | in | Rising edge closes a measurement window. |
| `ui_in[7]` | in | Select live count (`0`) or last completed count (`1`). |
| `uio_in[7:0]` | in | Minimum accepted count expected in the closing window. |
| `uo_out[7:0]` | out | Selected saturating count, 0–255. |
| `uio_out[0]` | out | Filtered digital level. |
| `uio_out[1]` | out | One-clock accepted rising-edge strobe. |
| `uio_out[2]` | out | An incomplete transition was observed in the previous window. Short changes entirely between sample ticks may not set it. |
| `uio_out[3]` | out | Previous active window count was below the host's minimum. |
| `uio_out[4]` | out | Previous window saturated beyond 255. |
| `uio_out[5]` | out | One-clock window-complete strobe. |
| `uio_out[6]` | out | Effective count enable. |
| `uio_out[7]` | out | Filtered level stayed high for an entire previously armed active window. |

All `uio` pins are driven as outputs. A pulse accepted on the boundary clock belongs to the next window. The completed count and flags persist until the next boundary. The first boundary after reset or clear **arms** the held-high observation for the next full active window. Disabling counting during a window removes held-high eligibility. Synchronous clear resets count, flags, and window arming, but preserves the current filtered input level.

## Demonstrated behavior and limits

The Icarus self-check and Node demo API integration test pass locally on this revision. With the accelerated simulation divider and three stable samples, five generated intended events plus eight short transitions yield 13 raw rising edges and five RTL-accepted edges. The test harness knows which inputs it generated as intended. A physical chip does **not** classify the cause of every suppressed edge: strong filtering can also lose genuine narrow pulses. A one-sample setting may count short changes. The two-flop synchronizer reduces, but cannot eliminate, metastability risk. An analog input front end, power, clock, host control, sensor calibration, and application-specific validation are outside this RTL.

Fresh Cocotb and Yosys CI results, mapped area, static timing, DRC, and tile fit must be taken from the actual workflow. No fabricated chip, metrology accuracy, or safety certification is claimed. The print PDF is generated from this revision with `tools/build_datasheet.py`.

**Reproduce:** `./run-tests.ps1` and `./run-demo.ps1` on the prepared Windows laptop, or `node --test test/demo_api.test.js` with Node and Icarus installed. See [detailed documentation](docs/info.md), [research](RESEARCH.md), and [provenance](PROVENANCE.md).
