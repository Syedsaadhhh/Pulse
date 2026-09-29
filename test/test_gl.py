"""Small gate-level test of the actual default 50,000-clock sampling divider."""
import cocotb
from cocotb.clock import Clock
from cocotb.triggers import ClockCycles, Timer


@cocotb.test()
async def default_divider_counts_and_snapshots(dut):
    cocotb.start_soon(Clock(dut.clk, 10, unit="ns").start())
    dut.ena.value = 1
    dut.ui_in.value = 0
    dut.uio_in.value = 1
    dut.rst_n.value = 0
    await ClockCycles(dut.clk, 4)
    dut.rst_n.value = 1
    dut.ui_in.value = 0x10  # enable, one stable sample
    await ClockCycles(dut.clk, 4)
    dut.ui_in.value = 0x11  # raw high
    await ClockCycles(dut.clk, 50010)
    await Timer(1, unit="ns")
    assert int(dut.uo_out.value) == 1
    dut.ui_in.value = 0x51  # boundary while high
    await ClockCycles(dut.clk, 1)
    dut.ui_in.value = 0x91  # select completed count; boundary low
    await Timer(1, unit="ns")
    assert int(dut.uo_out.value) == 1
    assert (int(dut.uio_out.value) >> 3) & 1 == 0
