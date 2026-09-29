# PulseTrust — judge walkthrough for the current revision

## First minute

1. Lead with the narrow question: **“When a pump is commanded to run, did credible flow-sensor pulses arrive?”** This is a *prospective integration* illustrated with synthetic logic-level input, not a real pump measurement.
2. Select **Short disturbances during flow**. The same generated waveform gives a plain raw-edge baseline of 13 and five accepted events from the actual compiled Verilog. Show the trace and change the seed. The baseline is a simple algorithm, not a comparison against a commercial MCU.
3. Select **Missing response**. The completed active window contains zero accepted events against a minimum of one. The circuit reports under-minimum; it cannot tell whether the pump, fluid path, sensor, wiring, or chosen expectation is responsible.
4. Select **Line held high**. The first boundary arms the observation; after the filtered level stays high for the entire following active window, bit 7 reports it. Merely being high at a boundary is not enough.
5. Select **Real pulse missed by strong filter**. Three *generated intended* pulses are too narrow for the eight-sample setting. This counterexample demonstrates the engineering tradeoff. The chip does not know which generated pulses were genuine.

## Explain timing without overclaiming

At the declared 50 MHz clock, the RTL's default 50,000-clock enable yields one filter sample per millisecond. The setting chooses 1–8 stable samples for both rising and falling transitions. The browser overrides the divider to four clock cycles for fast simulation. There is no measured sensor waveform or validated operating envelope yet. Both a suitable digital input-conditioning stage and application-specific threshold selection are required.

## The evidence to show

- Original RTL: `src/project.v`; one-cycle enable, synchronizer, filter, saturating counter and completed-window flags.
- Test: the self-check and five-scenario demo API integration test pass locally; point to actual CI status for Cocotb, Yosys, GDS/precheck and gate-level tests.
- One-page datasheet: `DATASHEET.md` and `output/pdf/PulseTrust-datasheet.pdf`, regenerated for this revision.
- Physical design: give actual layout/timing reports if and only if they pass. A 1×1 tile and 50 MHz in metadata are targets, not achieved measurements.

**Suggested 20-second story:** “PulseTrust watches a conditioned digital pulse-output sensor during a commanded operating window. It samples and filters transitions, counts accepted events, and records when the expected count is missed or the line stayed high throughout a full window. You can inject short transitions or genuine narrow pulses in this live Verilog simulation and see both the benefit and the failure mode. Our sensor integration and physical layout claims depend on further evidence.”

**Hard questions:** Why not use an MCU pulse counter? ESP32 PCNT already offers filtering and watch points; the proposed value is a small auditable window contract, subject to buyer validation and comparison. How does the chip know a pulse is real? It does not; the test generator supplies truth labels. Can it prove a pump failure? No. Can it miss a valid pulse? Yes, if the high or low width is too short for the filter. Is the silicon ready? Only if the actual GDS/precheck and timing results establish that.
