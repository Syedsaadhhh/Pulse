# Judge interaction: first minute

1. Open `/chip` on the prepared local server. Lead with **“Did that pulse really happen?”** Orbit the chip once. Say these are the actual DEF cell positions and routed paths, extruded for viewing.
2. Search for `_149_` or another visible cell. Reveal its IHP cell type, exact coordinates, and connected DEF nets. Highlight one net. Switch to **GDS evidence** and show the original render from the passing physical-design workflow.
3. Press **Inject noise into the chip**. The page scrolls to the live challenge and compiles the real `src/project.v` with Icarus. Point to 13 raw edges, 5 accepted events, 8 rejected edges, and the orange/cyan/green waveform.
4. Keep the signal seed fixed and press **Compare 1, 3 and 8 samples**. Three actual RTL runs share the exact same raw waveform: 13, 5, then 3 accepted events. Explain that aggressive filtering can discard narrow real pulses too.
5. Open **Logic tour** if the judge asks how it works. It names the RTL functions and explicitly avoids pretending that those conceptual blocks are mapped to exact physical regions. Close with the one-page datasheet and the [GDS/precheck/gate-level evidence](https://github.com/Syedsaadhhh/Pulse/actions/runs/36459089954).

Suggested 20-second story: “A machine says it sent pulses, but the raw line can lie. PulseTrust is a small digital IP block that asks for a stable signal, counts trusted edges, and flags when a measurement window falls short. You can change the noise, filter, and expected count right here; the page recompiles our actual Verilog.”

Challenge questions to welcome: What if a legitimate pulse is shorter than the filter threshold? What if 256 events arrive? What does a missing-event flag prove? Why is a two-flop synchronizer only risk reduction? Where is the analog input protection? Have we actually met Tiny Tapeout area/timing? Answers are in `DATASHEET.md` and the real layout metrics; do not claim fabricated-silicon measurements.

If asked about a mechanical water meter, be precise: the 50 MHz target would make 8 samples only about 160 ns. For millisecond switch bounce, the integrator must supply a much slower clock or extend the RTL with a divider, then validate the resulting minimum pulse width. The current demo is in clock cycles and is not a field-calibrated water-meter test.
