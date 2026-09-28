# PulseTrust

PulseTrust is a small digital IP block for pulse-output sensors such as water-flow, energy, and event counters. Electrical noise or switch bounce can create false edges; a missing stream while a machine is expected to run can hide a fault. The block accepts a logic-level input, requires a programmable number of stable clock samples before each transition, counts accepted rising edges, and reports a low-count window, a rejected transient, and saturation.

This is a digital demonstrator, not a complete metering instrument. It does not provide input protection, analog thresholds, isolation, calibration, or a certified safety function. A host generates the window boundary and selects a suitable clock and filter setting for the sensor.

## Pin contract

| Pin | Meaning |
|---|---|
| `ui_in[0]` | Asynchronous digital pulse input, passed through two flip-flops. |
| `ui_in[3:1]` | Stable sample count minus one: `0` means one sample; `7` means eight samples. Keep stable during a pulse. |
| `ui_in[4]` | Count enable. |
| `ui_in[5]` | Synchronous clear. |
| `ui_in[6]` | Rising edge closes the measurement window. |
| `ui_in[7]` | Output page: live count (`0`) or last completed count (`1`). |
| `uio_in[7:0]` | Minimum acceptable pulse count per window. |
| `uo_out[7:0]` | Selected count, saturating at 255. |
| `uio_out[0]` | Filtered digital level. |
| `uio_out[1]` | One-clock accepted rising-edge strobe. |
| `uio_out[2]` | Previous window had a rejected short transition. |
| `uio_out[3]` | Previous window count was below `uio_in` at closure. |
| `uio_out[4]` | Previous window overflowed. |
| `uio_out[5]` | One-clock window-complete strobe. |
| `uio_out[6]` | Counting enabled. |
| `uio_out[7]` | Reserved low. |

All `uio` pins are outputs. A pulse accepted on the boundary clock belongs to the next window. The finished result stays available until the next boundary.

## Demo and limits

Set a filter and minimum count, feed glitches and clean pulses, then compare the raw and filtered waveforms, accepted strobe, and count. Pulse the boundary pin to see the final count and fault flags. A judge can choose any input pattern and filter setting; the real HDL simulation drives the result.

The filter trades noise rejection for latency and may reject narrow genuine pulses. The clock and sample setting determine minimum accepted width. The 8-bit count saturates at 255. The two-stage synchronizer reduces but does not eliminate metastability risk. The chip cannot identify the physical cause of a bad pulse. Timing, tile fit, and physical-design claims must come from actual LibreLane reports.

No hardware is needed for RTL simulation. Physical deployment requires a conditioned logic-level sensor signal, clock, power, and host control. None is claimed for the Rocketathon demonstration.
