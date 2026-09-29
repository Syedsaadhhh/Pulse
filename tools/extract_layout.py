#!/usr/bin/env python3
"""Produce browser-sized, reproducible PulseTrust geometry from the routed DEF.

No drawing coordinates or cell dimensions are invented here. The source DEF is
the Tiny Tapeout LibreLane artifact; dimensions come from the IHP standard-cell
LEF size table recorded in evidence/layout/standard-cell-sizes.json.
"""
from __future__ import annotations

import hashlib
import json
import math
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = ROOT / "evidence" / "layout"
DEF = LAYOUT / "tt_um_syedsaadhhh_pulsetrust.def"
SIZES = LAYOUT / "standard-cell-sizes.json"
METRICS = LAYOUT / "metrics.json"
OUT = ROOT / "demo" / "web" / "layout-v1.json"
RUN = "https://github.com/Syedsaadhhh/Pulse/actions/runs/36459089954"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def section(text: str, name: str) -> tuple[int, str]:
    match = re.search(rf"^{name}\s+(\d+)\s*;([\s\S]*?)^END {name}\s*$", text, re.M)
    if not match:
        raise ValueError(f"Missing DEF {name} section")
    return int(match.group(1)), match.group(2)


def def_entries(body: str):
    for match in re.finditer(r"^\s*-\s+(.+?)\s*;", body, re.M | re.S):
        yield match.group(1).strip()


def main() -> None:
    raw = DEF.read_text(encoding="utf-8")
    size_data = json.loads(SIZES.read_text(encoding="utf-8"))
    metrics = json.loads(METRICS.read_text(encoding="utf-8"), parse_constant=lambda value: None)
    units_match = re.search(r"^UNITS DISTANCE MICRONS (\d+)\s*;", raw, re.M)
    die_match = re.search(r"^DIEAREA \( (\d+) (\d+) \) \( (\d+) (\d+) \)\s*;", raw, re.M)
    if not units_match or not die_match:
        raise ValueError("Missing DEF units or die bounds")
    dbu = int(units_match.group(1))
    die = [int(value) / dbu for value in die_match.groups()]
    size_map = size_data["macros"]

    declared_components, component_body = section(raw, "COMPONENTS")
    cells = []
    fills = 0
    missing_macros = set()
    for entry in def_entries(component_body):
        match = re.match(r"(\S+)\s+(\S+).*?\+\s+(?:PLACED|FIXED)\s+\(\s*(-?\d+)\s+(-?\d+)\s*\)\s+(\S+)", entry, re.S)
        if not match:
            raise ValueError(f"Unparseable placed component: {entry[:120]}")
        name, macro, x, y, orient = match.groups()
        if name.startswith("FILLER_") or "fill" in macro.lower() or "decap" in macro.lower():
            fills += 1
            continue
        size = size_map.get(macro)
        if size is None:
            missing_macros.add(macro)
            continue
        cells.append({"id": name, "type": macro, "x": int(x) / dbu,
                      "y": int(y) / dbu, "w": size[0], "h": size[1], "orient": orient})
    if missing_macros:
        raise ValueError(f"Missing LEF sizes: {sorted(missing_macros)}")
    if len(cells) + fills != declared_components:
        raise ValueError("DEF placed component count mismatch")
    if len(cells) != metrics["design__instance__count__stdcell"]:
        raise ValueError("Standard-cell count disagrees with layout metrics")
    footprint_area = sum(cell["w"] * cell["h"] for cell in cells)
    if not math.isclose(footprint_area, metrics["design__instance__area__stdcell"], abs_tol=0.02):
        raise ValueError("LEF footprint area disagrees with physical-flow metrics")
    if fills != metrics["design__instance__count__class:fill_cell"]:
        raise ValueError("Fill-cell count disagrees with physical-flow metrics")

    declared_pins, pin_body = section(raw, "PINS")
    pins = []
    for entry in def_entries(pin_body):
        name = entry.split()[0]
        at = re.search(r"\+\s+(?:PLACED|FIXED)\s+\(\s*(-?\d+)\s+(-?\d+)\s*\)\s+(\w+)", entry)
        layer = re.search(r"\+\s+LAYER\s+(\w+)", entry)
        use = re.search(r"\+\s+USE\s+(\w+)", entry)
        pins.append({"name": name,
                     "x": int(at.group(1)) / dbu if at else None,
                     "y": int(at.group(2)) / dbu if at else None,
                     "orient": at.group(3) if at else None,
                     "layer": layer.group(1) if layer else None,
                     "use": use.group(1) if use else None})
    if len(pins) != declared_pins:
        raise ValueError("DEF pin count mismatch")

    declared_nets, net_body = section(raw, "NETS")
    nets = []
    cell_nets: dict[str, list[str]] = defaultdict(list)
    cell_ids = {cell["id"] for cell in cells}
    for entry in def_entries(net_body):
        name = entry.split()[0]
        before_route = entry.split("+ ROUTED", 1)[0]
        connections = re.findall(r"\(\s*(\S+)\s+(\S+)\s*\)", before_route)
        for instance, pin in connections:
            if instance in cell_ids:
                cell_nets[instance].append(name)
        # DEF route path coordinates may use '*' to reuse the previous axis.
        route_text = entry.split("+ ROUTED", 1)[1] if "+ ROUTED" in entry else ""
        segments = []
        for path_match in re.finditer(r"(?:^\s*|\bNEW\s+)(Metal\d+)\s+([^+]*?)(?=\bNEW\s+|$)", route_text, re.S):
            layer, path = path_match.groups()
            last = None
            for xx, yy in re.findall(r"\(\s*(-?\d+|\*)\s+(-?\d+|\*)\s*\)", path):
                if xx == "*" and last is None or yy == "*" and last is None:
                    raise ValueError(f"Unresolved DEF route wildcard on net {name}")
                point = (int(xx) if xx != "*" else last[0],
                         int(yy) if yy != "*" else last[1])
                if last and point != last:
                    segments.append([last[0] / dbu, last[1] / dbu,
                                     point[0] / dbu, point[1] / dbu, layer])
                last = point
        nets.append({"name": name, "connections": len(connections), "segments": segments})
    if len(nets) != declared_nets:
        raise ValueError("DEF net count mismatch")
    for cell in cells:
        cell["nets"] = sorted(set(cell_nets[cell["id"]]))

    result = {
        "version": 1,
        "design": "tt_um_syedsaadhhh_pulsetrust",
        "units": "µm",
        "die": die,
        "counts": {"placed": declared_components, "standardCells": len(cells),
                   "fillCells": fills, "nets": len(nets), "pins": len(pins),
                   "routeSegments": sum(len(net["segments"]) for net in nets)},
        "metrics": {"utilization": metrics["design__instance__utilization__stdcell"],
                    "dieAreaUm2": metrics["design__die__area"],
                    "routeDrcErrors": metrics["route__drc_errors"],
                    "magicDrcErrors": metrics["magic__drc_error__count"],
                    "lvsErrors": metrics["design__lvs_error__count"],
                    "antennaViolations": metrics["route__antenna_violation__count"],
                    "setupSlackNsSlow": metrics["timing__setup__ws__corner:nom_slow_1p08V_125C"],
                    "holdSlackNsFast": metrics["timing__hold__ws__corner:nom_fast_1p32V_m40C"]},
        "source": {"defSha256": sha256(DEF), "sizeTableSha256": sha256(SIZES),
                   "metricsSha256": sha256(METRICS),
                   "stdcellLefBlobSha": size_data["sourceBlobSha"], "workflow": RUN},
        "cells": cells,
        "pins": pins,
        "nets": nets,
    }
    OUT.write_text(json.dumps(result, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {OUT}: {len(cells)} cells, {fills} fills, {len(nets)} nets, {len(pins)} pins")


if __name__ == "__main__":
    main()
