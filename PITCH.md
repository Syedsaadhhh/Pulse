# Judge interaction: first minute

1. Open the full-screen dashboard. Lead with the question: **“Did that pulse really happen?”** Point to the 13 raw edges and 5 accepted events. Explain that every number came from the original Verilog running in Icarus.
2. Scroll just enough to reveal the waveform. Orange is the wire, cyan is the stable filtered level, green marks each accepted rising edge. Move the scrubber to show different sections; change the signal seed and rerun to show the result is generated, not a stored animation.
3. Raise **Minimum expected** from 4 to 7 and press **Compile & simulate**. The finished count remains 5 and the RTL raises “Review required.” This is the operational alert, not merely a prettier counter.
4. Set the stable-sample control to 1 and rerun: short noise now enters the count. Restore it to 3 to show the engineering tradeoff. A strong filter can also miss narrow legitimate pulses; do not claim perfect noise rejection.
5. Show `DATASHEET.md` and the passed `run-tests.ps1` output. If there is a LibreLane result by then, show its real tile/DRC/timing report; otherwise state plainly that physical fit is pending.

Suggested 20-second story: “A machine says it sent pulses, but the raw line can lie. PulseTrust is a small digital IP block that asks for a stable signal, counts trusted edges, and flags when a measurement window falls short. You can change the noise, filter, and expected count right here; the page recompiles our actual Verilog.”

Challenge questions to welcome: What if a legitimate pulse is shorter than the filter threshold? What if 256 events arrive? What does a missing-event flag prove? Why is a two-flop synchronizer only risk reduction? Where is the analog input protection? Have we actually met Tiny Tapeout area/timing? Answers are in `DATASHEET.md`; the last answer requires a real layout report.
