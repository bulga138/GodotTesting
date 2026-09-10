#!/usr/bin/env python3
"""Audit test scripts for resource mutations without duplicate(true).

Implements Policy 2 verification from docs/testing/03-implementation-guide.md,
section 2.4. Scans tests/ for .tres loads followed by property assignments
that lack a duplicate(true) call. Fails CI if any are found.
"""
import os
import re
import sys

MUTATION_PATTERN = re.compile(
    r'(\w+)\s*=\s*(?:load|preload)\s*\(\s*[\'"][^\'"]*\.tres[\'"]\s*\)'
)

failed = False
for root, _, files in os.walk("tests/"):
    for f in files:
        if not f.endswith(".gd"):
            continue
        path = os.path.join(root, f)
        with open(path, "r", encoding="utf-8") as handle:
            content = handle.read()
        loaded_vars = set(MUTATION_PATTERN.findall(content))
        for var in loaded_vars:
            if re.search(rf'{var}\.\w+\s*=', content):
                print(
                    f"ERROR: {path} mutates cached resource "
                    f"'{var}' without duplicate(true)!"
                )
                failed = True

sys.exit(1 if failed else 0)
