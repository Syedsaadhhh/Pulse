/*
 * Copyright (c) 2026 Pak Troopers
 * SPDX-License-Identifier: Apache-2.0
 * PulseTrust: a configurable digital pulse integrity block.
 */
`default_nettype none
module tt_um_syedsaadhhh_pulsetrust #(
    // 50 MHz / 50,000 = one filter sample per millisecond. The clock-enable
    // keeps the synchronizer, counter and window logic in one clock domain.
    // Legal range: 1..65,536. Simulation may override this parameter.
    parameter integer SAMPLE_DIV = 50000
) (
    input  wire [7:0] ui_in,
    output wire [7:0] uo_out,
    input  wire [7:0] uio_in,
    output wire [7:0] uio_out,
    output wire [7:0] uio_oe,
    input  wire       ena,
    input  wire       clk,
    input  wire       rst_n
);
    // ui[0] raw; ui[3:1] stable samples minus one; ui[4] enable;
    // ui[5] clear; ui[6] window tick; ui[7] view last count.
    // uio_in is the minimum expected count per measurement window.
    reg pulse_meta, pulse_sync, filtered_level;
    reg [15:0] sample_div_count;
    reg [2:0] pending_samples;
    reg [7:0] live_count, last_count;
    reg current_glitch, last_glitch;
    reg current_overflow, last_overflow, last_under_min;
    reg high_all_window, window_armed, last_held_high;
    reg window_tick_d, accepted_edge, window_ready;

    wire count_enable = ui_in[4] & ena;
    wire window_rise = ui_in[6] & ~window_tick_d;
    wire sample_ce = (sample_div_count == SAMPLE_DIV - 1);
    wire transition_ready = sample_ce && (pulse_sync != filtered_level) &&
                            (pending_samples >= ui_in[3:1]);
    wire new_pulse = transition_ready && pulse_sync && count_enable;
    wire rejected_transition = sample_ce && (pulse_sync == filtered_level) &&
                               (pending_samples != 3'd0) && count_enable;
    wire next_filtered_level = transition_ready ? pulse_sync : filtered_level;

    assign uo_out = ui_in[7] ? last_count : live_count;
    assign uio_out = {last_held_high, count_enable, window_ready,
                      last_overflow, last_under_min, last_glitch,
                      accepted_edge, filtered_level};
    assign uio_oe = 8'hff;

    always @(posedge clk) begin
        if (!rst_n) begin
            pulse_meta       <= 1'b0;
            pulse_sync       <= 1'b0;
            filtered_level   <= 1'b0;
            sample_div_count <= 16'd0;
            pending_samples  <= 3'd0;
            live_count       <= 8'd0;
            last_count       <= 8'd0;
            current_glitch   <= 1'b0;
            last_glitch      <= 1'b0;
            current_overflow <= 1'b0;
            last_overflow    <= 1'b0;
            last_under_min   <= 1'b0;
            high_all_window  <= 1'b0;
            window_armed     <= 1'b0;
            last_held_high   <= 1'b0;
            window_tick_d    <= 1'b0;
            accepted_edge    <= 1'b0;
            window_ready     <= 1'b0;
        end else begin
            pulse_meta    <= ui_in[0];
            pulse_sync    <= pulse_meta;
            window_tick_d <= ui_in[6];
            sample_div_count <= sample_ce ? 16'd0 : sample_div_count + 16'd1;
            accepted_edge <= 1'b0;
            window_ready  <= 1'b0;
            if (ui_in[5]) begin
                pending_samples  <= 3'd0;
                live_count       <= 8'd0;
                last_count       <= 8'd0;
                current_glitch   <= 1'b0;
                last_glitch      <= 1'b0;
                current_overflow <= 1'b0;
                last_overflow    <= 1'b0;
                last_under_min   <= 1'b0;
                high_all_window  <= 1'b0;
                window_armed     <= 1'b0;
                last_held_high   <= 1'b0;
            end else begin
                if (sample_ce) begin
                    if (pulse_sync != filtered_level) begin
                        if (transition_ready) begin
                            filtered_level  <= pulse_sync;
                            pending_samples <= 3'd0;
                            if (new_pulse)
                                accepted_edge <= 1'b1;
                        end else begin
                            pending_samples <= pending_samples + 3'd1;
                        end
                    end else if (pending_samples != 3'd0) begin
                        pending_samples <= 3'd0;
                        if (rejected_transition)
                            current_glitch <= 1'b1;
                    end
                end
                if (window_rise) begin
                    // An edge accepted on this clock starts the next window.
                    last_count       <= live_count;
                    last_glitch      <= current_glitch;
                    last_overflow    <= current_overflow;
                    last_under_min   <= count_enable && (live_count < uio_in);
                    // Only a *whole* previously armed active window counts.
                    // This observes a held-high level; it cannot diagnose why.
                    last_held_high   <= count_enable && window_armed &&
                                        high_all_window && next_filtered_level;
                    high_all_window  <= count_enable && next_filtered_level;
                    window_armed     <= count_enable;
                    live_count       <= new_pulse ? 8'd1 : 8'd0;
                    current_glitch   <= rejected_transition;
                    current_overflow <= 1'b0;
                    window_ready     <= 1'b1;
                end else if (new_pulse) begin
                    if (live_count == 8'hff)
                        current_overflow <= 1'b1;
                    else
                        live_count <= live_count + 8'd1;
                end
                if (!window_rise && (!count_enable || !next_filtered_level))
                    high_all_window <= 1'b0;
            end
        end
    end
endmodule
`default_nettype wire
