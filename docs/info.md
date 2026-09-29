# PulseTrust

PulseTrust is a small digital IP block for a conditioned pulse-output sensor. A host enables counting while a machine is expected to operate, specifies a minimum count, and closes each window. The block requires consecutive stable filter samples before each transition, counts accepted rising edges, and reports a low-count window, an observed incomplete transition, a whole-window held-high level, and saturation. These are observations rather than fault diagnoses.

This is a digital demonstrator, not a complete metering instrument. It does not provide input protection, analog thresholds, isolation, calibration, or a certified safety function. A host generates the window boundary and selects a suitable clock and filter setting for the sensor. At 50 MHz, the default 50,000-clock enable samples once per millisecond; the 1–8 setting corresponds to nominal 1–8 ms stable sampling. An accelerated divider in the browser demo keeps simulation fast; no real sensor has been validated.

## Pin contract

| Pin | Meaning |
|---|---|
| `ui_in[0]` | Asynchronous digital pulse input, passed through two flip-flops. |
| `ui_in[3:1]` | Stable sample count minus one: `0` means one sample; `7` means eight samples. Keep stable during a window. |
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
| `uio_out[7]` | Previous *armed, active* window kept the filtered level high throughout. The first boundary after reset or clear only arms this observation. |

All `uio` pins are outputs. A pulse accepted on the boundary clock belongs to the next window. The finished result stays available until the next boundary.

## Demo and limits

Set a filter and minimum count, feed glitches and clean pulses, then compare the raw and filtered waveforms, accepted strobe, and count. Pulse the boundary pin to see the final count and fault flags. A judge can choose any input pattern and filter setting; the real HDL simulation drives the result.

The filter trades short-transition suppression for latency and may reject narrow genuine pulses. Both high and low need enough consecutive samples; the chosen clock, divider, synchronizer latency and sample phase determine the usable width and maximum rate. Short changes entirely between sample ticks may not set the incomplete-transition flag at all. The 8-bit count saturates at 255. The two-stage synchronizer reduces but does not eliminate metastability risk. The chip cannot identify the physical cause of a bad pulse. Timing, tile fit, and physical-design claims must come from actual LibreLane reports.

No hardware is needed for RTL simulation. Physical deployment requires a conditioned logic-level sensor signal, clock, power, and host control. None is claimed for the Rocketathon demonstration.
