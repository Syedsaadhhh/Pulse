`timescale 1ns/1ps
module rtl_selfcheck;
    reg clk = 0, rst_n = 0, ena = 1;
    reg [7:0] ui_in = 0, uio_in = 0;
    wire [7:0] uo_out, uio_out, uio_oe;
    integer i;
    tt_um_syedsaadhhh_pulsetrust #(.SAMPLE_DIV(4)) dut (
        .ui_in(ui_in), .uo_out(uo_out), .uio_in(uio_in),
        .uio_out(uio_out), .uio_oe(uio_oe),
        .ena(ena), .clk(clk), .rst_n(rst_n)
    );

    task tick;
        begin #5 clk = 1; #1; #4 clk = 0; end
    endtask
    task clocks(input integer n);
        integer j;
        begin for (j = 0; j < n; j = j + 1) tick(); end
    endtask
    task pulse(input integer hi, input integer lo);
            begin ui_in[0] = 1; clocks(hi * 4); ui_in[0] = 0; clocks(lo * 4); end
    endtask
    task close_window;
        begin ui_in[6] = 1; tick(); ui_in[6] = 0; tick(); end
    endtask
    task expect_count(input integer wanted);
        begin
            if (uo_out !== wanted[7:0]) begin
                $display("FAIL count wanted=%0d got=%0d at %0t", wanted, uo_out, $time);
                $fatal(1);
            end
        end
    endtask

    initial begin
        clocks(4); rst_n = 1; clocks(4);
        if (uio_oe !== 8'hff) $fatal(1, "uio direction");
        ui_in[4] = 1;
        ui_in[3:1] = 3'd2; // three stable synchronized samples
        uio_in = 2;
        pulse(1, 6); // one filter sample, less than the three required
        expect_count(0);
        pulse(6, 6); pulse(6, 6);
        expect_count(2);
        close_window();
        ui_in[7] = 1; #1;
        expect_count(2);
        if (!uio_out[2] || uio_out[3]) $fatal(1, "glitch or minimum flag");
        ui_in[7] = 0; #1;
        expect_count(0);

        ui_in[5] = 1; tick(); ui_in[5] = 0;
        ui_in[3:1] = 0; // fastest setting
        clocks(16);
        for (i = 0; i < 256; i = i + 1) pulse(3, 3);
        expect_count(255);
        close_window();
        ui_in[7] = 1; #1;
        expect_count(255);
        if (!uio_out[4]) $fatal(1, "overflow flag");

        ui_in[7] = 0;
        ui_in[5] = 1; tick(); ui_in[5] = 0;
        ui_in[3:1] = 1;
        uio_in = 3;
        clocks(4); pulse(6, 6); close_window();
        ui_in[7] = 1; #1;
        expect_count(1);
        if (!uio_out[3]) $fatal(1, "missing-event flag");

        // A high reading at a boundary alone is insufficient. It must stay
        // high for a complete active, armed window before bit 7 is set.
        ui_in[5] = 1; tick(); ui_in[5] = 0;
        ui_in[7] = 0;
        ui_in[3:1] = 0;
        ui_in[0] = 1;
        clocks(32);
        close_window();
        if (uio_out[7]) $fatal(1, "first window is not armed");
        clocks(32);
        close_window();
        if (!uio_out[7]) $fatal(1, "full-window held high flag");
        ui_in[0] = 0;
        clocks(32);
        close_window();
        if (uio_out[7]) $fatal(1, "held-high flag must clear");

        $display("PASS rtl_selfcheck: sampled filter, count, window, minimum, overflow, held-high");
        $finish;
    end
endmodule
