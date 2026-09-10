#!/usr/bin/env python3
"""Level 1 audit: every key in the source locale must exist in every target.

Implements the recipe in docs/testing/03-implementation-guide.md, section 2.2.
Fails CI when a key is missing or a target string expands too much.
"""
import argparse
import csv
import sys
from pathlib import Path


def load_csv(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as handle:
        return {row["key"]: row for row in csv.DictReader(handle)}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--target", required=True)
    parser.add_argument("--max-expansion", type=float, default=1.35)
    args = parser.parse_args()

    source_path = Path(args.source)
    source = load_csv(source_path)
    failed = False

    for target_path in sorted(Path(args.target).glob("*.csv")):
        if target_path == source_path:
            continue
        target = load_csv(target_path)
        for key in source:
            if key not in target:
                print(f"ERROR: {target_path.name} is missing key '{key}'")
                failed = True
                continue
            src_len = len(source[key][next(c for c in source[key] if c != "key")])
            tgt_len = len(target[key][next(c for c in target[key] if c != "key")])
            if src_len > 0 and tgt_len > src_len * args.max_expansion:
                print(
                    f"ERROR: {target_path.name} key '{key}' expands "
                    f"{tgt_len / src_len:.2f}x (max {args.max_expansion})"
                )
                failed = True

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
