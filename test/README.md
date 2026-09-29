# PulseTrust verification

The RTL self-check (`rtl_selfcheck.v`) and browser API integration test (`demo_api.test.js`) compile and execute `src/project.v`. The Cocotb suite in `test.py` uses a `SAMPLE_DIV=4` parameter override for fast sampling but otherwise exercises the same RTL. The actual Tiny Tapeout top defaults to `SAMPLE_DIV=50000`, which produces one filter sample per millisecond at the declared 50 MHz clock.

With Icarus, Yosys, Cocotb, Node.js, and `make` installed:

```sh
iverilog -g2005 -s rtl_selfcheck -o /tmp/pulsetrust-selfcheck.vvp src/project.v test/rtl_selfcheck.v
vvp /tmp/pulsetrust-selfcheck.vvp
yosys -Q -T -q -p 'read_verilog src/project.v; hierarchy -check -top tt_um_syedsaadhhh_pulsetrust; synth -top tt_um_syedsaadhhh_pulsetrust; check -assert'
make -C test clean && make -C test
node --test test/demo_api.test.js
```

For a local smoke test of the **default** divider without hardening, run `make -C test clean && make -C test COMPILE_ARGS=-DPULSE_REAL_DIV COCOTB_TEST_MODULES=test_gl`. When the Tiny Tapeout workflow supplies a mapped gate-level netlist, `make -C test GATES=yes` selects the bounded `test_gl.py` smoke case. A clean RTL pass does not establish tile fit or mapped timing; inspect the separate GDS, precheck, and gate-level workflow results.

The generated waveform and `results.xml` are test artifacts, not project source. Do not claim a real sensor or fabricated chip from these simulations.
