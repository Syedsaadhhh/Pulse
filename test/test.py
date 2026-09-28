# SPDX-FileCopyrightText: © 2026 Pak Troopers
# SPDX-License-Identifier: Apache-2.0
"""Behavioral checks for PulseTrust, driven through the actual Tiny Tapeout pins."""

import cocotb
from cocotb.clock import Clock
from cocotb.triggers import ClockCycles, Timer


class Pins:
    def __init__(self, dut):
        self.dut = dut
        self.raw = 0
        self.filter_code = 0
        self.enable = 1
        self.clear = 0
        self.window = 0
        self.page = 0
        self.minimum = 0

    def update(self):
        self.dut.ui_in.value = (
            self.raw
            | self.filter_code << 1
            | self.enable << 4
            | self.clear << 5
            | self.window << 6
            | self.page << 7
        )
        self.dut.uio_in.value = self.minimum

    async def clocks(self, count):
        self.update()
        await ClockCycles(self.dut.clk, count)
        await Timer(1, unit="ns")

    async def pulse(self, high=6, low=6):
        self.raw = 1
        await self.clocks(high)
        self.raw = 0
        await self.clocks(low)

    async def close_window(self):
        self.window = 1
        await self.clocks(1)
        self.window = 0
        await self.clocks(1)

    def count(self):
        return int(self.dut.uo_out.value)

    def flag(self, bit):
        return (int(self.dut.uio_out.value) >> bit) & 1


async def setup(dut):
    cocotb.start_soon(Clock(dut.clk, 10, unit="ns").start())
    p = Pins(dut)
    dut.ena.value = 1
    dut.rst_n.value = 0
    await p.clocks(4)
    dut.rst_n.value = 1
    await p.clocks(4)
    assert int(dut.uio_oe.value) == 0xFF
    return p


@cocotb.test()
async def rejects_bounce_and_counts_real_pulses(dut):
    p = await setup(dut)
    p.filter_code = 2  # Three stable synchronized samples.
    p.minimum = 2
    p.raw = 1
    await p.clocks(1)  # A one-clock spike must never count.
    p.raw = 0
    await p.clocks(6)
    assert p.count() == 0
    await p.pulse()
    await p.pulse()
    assert p.count() == 2
    await p.close_window()
    p.page = 1
    await p.clocks(1)
    assert p.count() == 2
    assert p.flag(2) == 1, "short spike should be reported"
    assert p.flag(3) == 0, "two pulses meet the requested minimum"
    assert p.flag(4) == 0
    p.page = 0
    await p.clocks(1)
    assert p.count() == 0, "new window must start at zero"


@cocotb.test()
async def missing_events_and_disabled_counting(dut):
    p = await setup(dut)
    p.filter_code = 1
    p.minimum = 2
    await p.pulse()
    await p.close_window()
    p.page = 1
    await p.clocks(1)
    assert p.count() == 1
    assert p.flag(3) == 1, "one pulse is below minimum two"
    p.page = 0
    p.enable = 0
    await p.clocks(1)
    await p.pulse()
    assert p.count() == 0
    await p.close_window()
    assert p.flag(3) == 0, "disabled windows must not raise under-minimum"


@cocotb.test()
async def filter_setting_changes_the_result(dut):
    p = await setup(dut)
    p.filter_code = 0  # One sample, no debouncing.
    await p.pulse(high=3, low=3)
    assert p.count() == 1
    p.clear = 1
    await p.clocks(1)
    p.clear = 0
    await p.clocks(3)
    assert p.count() == 0
    p.filter_code = 7  # Eight samples.
    await p.pulse(high=4, low=12)
    assert p.count() == 0
    await p.pulse(high=12, low=12)
    assert p.count() == 1


@cocotb.test()
async def count_saturates_and_records_overflow(dut):
    p = await setup(dut)
    p.filter_code = 0
    for _ in range(256):
        await p.pulse(high=3, low=3)
    assert p.count() == 255
    await p.close_window()
    p.page = 1
    await p.clocks(1)
    assert p.count() == 255
    assert p.flag(4) == 1


@cocotb.test()
async def window_tick_is_edge_sensitive(dut):
    p = await setup(dut)
    await p.pulse()
    p.window = 1
    await p.clocks(1)
    assert p.flag(5) == 1
    await p.clocks(4)
    assert p.flag(5) == 0, "held-high window pin must not retrigger"
    p.window = 0
    await p.clocks(1)
    p.window = 1
    await p.clocks(1)
    assert p.flag(5) == 1
