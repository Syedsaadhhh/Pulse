# PulseTrust — digital sensor pulse integrity IP

**Revision:** pre-event prototype, 28 September 2026  
**Interface:** Tiny Tapeout IHP Verilog template, 8 input / 8 output / 8 bidirectional pins  
**Target:** 1×1 tile and 50 MHz *requested in metadata; physical fit and timing unverified*

## Function

PulseTrust accepts a conditioned logic-level pulse from a sensor, passes it through a two-flop synchronizer, requires 1–8 stable clock samples per transition, counts accepted rising edges to a saturating 8-bit total, and snapshots the count at a host-defined measurement-window boundary. It reports whether a short transition was rejected, whether the finished count fell below a programmable minimum, and whether the counter saturated. It is reusable for flow, energy, particle, and similar pulse-output sensors.

## Pins

| Pin | Direction | Meaning |
|---|---|---|
| `ui[0]` | in | Raw **logic-level** pulse. |
| `ui[3:1]` | in | Stable samples minus 1 (`0`–`7` maps to 1–8). Hold constant during a pulse. |
| `ui[4]`, `ui[5]`, `ui[6]` | in | Count enable, synchronous clear, window-boundary tick (rising edge). |
| `ui[7]` | in | Select live count (`0`) or last completed count (`1`). |
| `uio_in[7:0]` | in | Minimum expected count for the closing window. |
| `uo_out[7:0]` | out | Selected saturating count, `0`–`255`. |
| `uio_out[0:6]` | out | Filtered level, accepted-edge strobe, last-window glitch, last-window under-minimum, last-window overflow, window-ready strobe, enable status. Bit 7 is 0. |

All `uio` pins are driven as outputs. A pulse accepted on the same clock as a boundary belongs to the next window. The latest completed count and flags remain until the next boundary.

## Demonstrated behavior and limits

Icarus Verilog self-check passes glitch rejection, valid count, snapshot, minimum alert, and saturation. Yosys reports 156 generic cells and no structural problems; this is **not** mapped area or timing. The default interactive signal has 5 intended events plus 8 short spikes: the HDL reports 13 raw edges, 5 accepted, 8 rejected. Input pulses too short for the selected filter can be lost; at the 1-sample setting, short noise can count. The maximum reportable count is 255. The synchronizer reduces but cannot eliminate metastability risk. A physical product also needs a suitable input front end, clock, power, host control, and application-specific validation. No fabricated chip, metrology accuracy, or safety certification is claimed.

**Reproduce:** `./run-tests.ps1` and `./run-demo.ps1` on the prepared laptop. See [detailed documentation](docs/info.md) and [provenance](PROVENANCE.md).
