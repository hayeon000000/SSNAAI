"""Create mock elevator sensor data from the patterns in an existing sensor CSV.

This standalone utility never edits the input CSV. It samples real readings
from the same weekday and hour, then replaces only their timestamp fields.
"""

from __future__ import annotations

import argparse
import csv
import random
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path


TIMESTAMP_FORMAT = "%Y-%m-%d %H:%M:%S"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate mock elevator sensor CSV data.")
    parser.add_argument("input_csv", type=Path, help="Original sensor_clean.csv or sensor_imputed.csv path")
    parser.add_argument("output_csv", type=Path, help="Path for the new mock CSV")
    parser.add_argument("--start", default="2026-08-10 08:00:00", help="Start: YYYY-MM-DD HH:MM:SS")
    parser.add_argument("--rows", type=int, default=720, help="Number of mock readings")
    parser.add_argument("--interval-minutes", type=int, default=2, help="Minutes between readings")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducible results")
    return parser.parse_args()


def load_rows(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        rows = list(reader)
        if not reader.fieldnames or not rows:
            raise ValueError(f"The input CSV contains no data: {path}")
        required = {"timestamp", "hour", "minute", "day_of_week", "day_name", "date"}
        missing = required.difference(reader.fieldnames)
        if missing:
            raise ValueError(f"Missing required columns: {', '.join(sorted(missing))}")
        return reader.fieldnames, rows


def build_groups(rows: list[dict[str, str]]) -> dict[tuple[int, int], list[dict[str, str]]]:
    groups: dict[tuple[int, int], list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        groups[(int(row["day_of_week"]), int(row["hour"]))].append(row)
    return groups


def timestamped_copy(source: dict[str, str], timestamp: datetime) -> dict[str, str]:
    result = source.copy()
    result.update(
        timestamp=timestamp.strftime(TIMESTAMP_FORMAT),
        hour=str(timestamp.hour),
        minute=str(timestamp.minute),
        day_of_week=str(timestamp.weekday()),
        day_name=timestamp.strftime("%A"),
        date=timestamp.date().isoformat(),
    )
    return result


def main() -> None:
    args = parse_args()
    if args.rows <= 0 or args.interval_minutes <= 0:
        raise ValueError("--rows and --interval-minutes must be positive integers")

    fields, reference_rows = load_rows(args.input_csv)
    grouped = build_groups(reference_rows)
    by_hour: dict[int, list[dict[str, str]]] = defaultdict(list)
    for row in reference_rows:
        by_hour[int(row["hour"])].append(row)

    start = datetime.strptime(args.start, TIMESTAMP_FORMAT)
    random.seed(args.seed)
    args.output_csv.parent.mkdir(parents=True, exist_ok=True)

    with args.output_csv.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        for index in range(args.rows):
            timestamp = start + timedelta(minutes=index * args.interval_minutes)
            candidates = grouped.get((timestamp.weekday(), timestamp.hour))
            candidates = candidates or by_hour.get(timestamp.hour) or reference_rows
            writer.writerow(timestamped_copy(random.choice(candidates), timestamp))

    print(f"Created {args.rows:,} mock rows: {args.output_csv}")


if __name__ == "__main__":
    main()
