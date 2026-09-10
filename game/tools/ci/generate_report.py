#!/usr/bin/env python3
"""Generate reports/dashboard.html from the real Level 1 audit results.

Runs every automated check that can run in this environment, collects
pass/fail, and renders a TV-friendly dashboard with donut charts.
Checks that cannot run (missing tooling, e.g. GdUnit4) are reported as
"not configured", never as green. No fabricated results.
"""
import argparse
import datetime
import html
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
GAME = REPO / "game"

ANSI = re.compile(r"\x1b\[[0-9;]*m")

GREEN = "#22c55e"
RED = "#ef4444"
GREY = "#6b7280"


def run(cmd: list, cwd: Path) -> tuple:
    try:
        proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    except FileNotFoundError:
        return False, f"Binary not found: {cmd[0]}"
    detail = ANSI.sub("", proc.stdout + proc.stderr).strip()[-400:]
    return proc.returncode == 0, detail


def check_locales() -> tuple:
    ok, detail = run(
        [sys.executable, "tools/ci/audit_locales.py",
         "--source", "locales/en.csv", "--target", "locales/",
         "--max-expansion", "1.35"],
        GAME,
    )
    return ok, detail or "All locale keys present, expansion within limits"


def check_resource_mutations() -> tuple:
    ok, detail = run([sys.executable, "tools/ci/audit_resource_mutations.py"], GAME)
    return ok, detail or "No cached-resource mutations in tests"


def check_pdc(godot: str) -> tuple:
    ok, detail = run(
        [godot, "--headless", "--path", ".", "--script", "res://tools/pdc_solver.gd"],
        GAME,
    )
    return ok, detail if not ok else "PDC OK: all endings reachable, no cycles"


def check_import(godot: str) -> tuple:
    ok, detail = run([godot, "--headless", "--path", ".", "--import"], GAME)
    return ok, detail if not ok else "Project imports cleanly"


def donut(passed: int, total: int, color: str) -> str:
    pct = (passed / total * 100) if total else 0
    dash = 2 * 3.14159 * 80
    offset = dash * (1 - pct / 100)
    return f"""
      <svg viewBox="0 0 200 200" role="img" aria-label="{passed} of {total} checks passing">
        <circle cx="100" cy="100" r="80" fill="none" stroke="#1f2937" stroke-width="18"/>
        <circle cx="100" cy="100" r="80" fill="none" stroke="{color}" stroke-width="18"
          stroke-dasharray="{dash}" stroke-dashoffset="{offset}" stroke-linecap="round"
          transform="rotate(-90 100 100)"/>
        <text x="100" y="95" text-anchor="middle" class="big">{passed}/{total}</text>
        <text x="100" y="125" text-anchor="middle" class="mid">{pct:.0f}%</text>
      </svg>"""


def status_word(state: str) -> str:
    return {"pass": "PASS", "fail": "FAIL", "unconfigured": "NOT CONFIGURED"}[state]


def render(checks: list, generated_at: str, generated_at_iso: str) -> str:
    automated = [c for c in checks if c["state"] in ("pass", "fail")]
    unconfigured = [c for c in checks if c["state"] == "unconfigured"]
    passed = sum(1 for c in automated if c["state"] == "pass")
    total = len(automated)
    any_fail = any(c["state"] == "fail" for c in automated)
    overall_color = GREEN if total and passed == total else (RED if any_fail else GREY)

    # The one decision this screen supports: "is anything red?" The overall
    # donut is the focal point; the check list is the evidence behind it.
    focal = f"""
    <section class="focal">
      {donut(passed, total, overall_color)}
      <div class="focal-text">
        <h2>{'All automated checks passing' if total and passed == total else 'Attention: a check is failing' if any_fail else 'No automated checks ran'}</h2>
        <p>{passed} of {total} automated checks green. Unconfigured levels are listed below; they are not counted as green.</p>
      </div>
    </section>"""

    check_rows = "".join(
        f"<li class=\"check {c['state']}\">"
        f"<span class=\"state\">{status_word(c['state'])}</span>"
        f"<span class=\"name\">{html.escape(c['name'])}</span>"
        f"<span class=\"detail\">{html.escape(c['detail'])}</span>"
        f"</li>"
        for c in automated
    )
    unconfigured_rows = "".join(
        f"<li class=\"check unconfigured\">"
        f"<span class=\"state\">{status_word(c['state'])}</span>"
        f"<span class=\"name\">{html.escape(c['name'])}</span>"
        f"<span class=\"detail\">{html.escape(c['detail'])}</span>"
        f"</li>"
        for c in unconfigured
    )
    unconfigured_section = (
        f"<h3>Not Configured Yet</h3>\n<ul>{unconfigured_rows}</ul>" if unconfigured else ""
    )

    return f"""<!DOCTYPE html>
<html lang="en" style="color-scheme: dark">
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="60">
<meta name="theme-color" content="#0b0f14">
<link rel="icon" href="data:,">
<title>Testing Dashboard</title>
<style>
  /* Dark theme reason: this page is shown on office TVs at a distance;
     dark reduces glare and makes the green/red status the only color signal. */
  body {{ background: #0b0f14; color: #e5e7eb; font-family: system-ui, sans-serif;
         margin: 0; padding: calc(32px + env(safe-area-inset-top)) calc(40px + env(safe-area-inset-right)) calc(32px + env(safe-area-inset-bottom)) calc(40px + env(safe-area-inset-left)); }}
  h1 {{ font-size: 2rem; margin: 0 0 4px; text-wrap: balance; }}
  .meta {{ color: #9ca3af; margin-bottom: 28px; }}
  .focal {{ display: flex; align-items: center; gap: 36px; background: #111827;
           border-radius: 16px; padding: 28px 36px; max-width: 720px; }}
  .focal svg {{ width: 220px; height: 220px; flex-shrink: 0; }}
  .focal-text h2 {{ font-size: 1.6rem; margin: 0 0 8px; text-wrap: balance; }}
  .focal-text p {{ color: #9ca3af; font-size: 1rem; margin: 0; }}
  .big, .mid {{ font-variant-numeric: tabular-nums; }}
  .big {{ fill: #e5e7eb; font-size: 40px; font-weight: 700; }}
  .mid {{ fill: #9ca3af; font-size: 22px; }}
  h3 {{ font-size: 1.1rem; margin: 32px 0 8px; text-wrap: balance; }}
  ul {{ list-style: none; margin: 0; padding: 0; max-width: 900px; }}
  .check {{ display: grid; grid-template-columns: 170px 260px 1fr; gap: 16px;
           align-items: baseline; padding: 12px 16px; border-bottom: 1px solid #1f2937; }}
  .state {{ font-weight: 700; }}
  .check.pass .state {{ color: {GREEN}; }}
  .check.fail .state {{ color: {RED}; }}
  .check.unconfigured .state {{ color: #9ca3af; }}
  .name {{ font-weight: 600; }}
  .detail {{ color: #9ca3af; font-size: 0.9rem; overflow-wrap: anywhere; }}
</style>
</head>
<body>
<h1>GodotTesting Quality Dashboard</h1>
<div class="meta">Generated <time datetime="{html.escape(generated_at_iso)}">{html.escape(generated_at)}</time> &middot; auto-refreshes every 60&nbsp;s</div>
{focal}
<h3>Automated Checks</h3>
<ul>{check_rows}</ul>
{unconfigured_section}
</body>
</html>
"""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--godot", default="godot", help="Godot binary path")
    parser.add_argument("--out", default=str(REPO / "reports" / "dashboard.html"))
    args = parser.parse_args()

    checks = []

    ok, detail = check_locales()
    checks.append({"name": "Level 1. Locales", "state": "pass" if ok else "fail", "detail": detail})

    ok, detail = check_resource_mutations()
    checks.append({"name": "Level 1. Resource mutations", "state": "pass" if ok else "fail", "detail": detail})

    ok, detail = check_pdc(args.godot)
    checks.append({"name": "Level 1. Puzzle DAG", "state": "pass" if ok else "fail", "detail": detail})

    ok, detail = check_import(args.godot)
    checks.append({"name": "Level 1. Project import", "state": "pass" if ok else "fail", "detail": detail})

    checks.append({
        "name": "Level 2/3. GdUnit4 suites",
        "state": "unconfigured",
        "detail": "Install the GdUnit4 addon per docs/testing/04 to enable",
    })
    checks.append({
        "name": "Level 4. Visual baselines",
        "state": "unconfigured",
        "detail": "Capture baselines per docs/testing/03, section 5",
    })
    checks.append({
        "name": "Level 5. E2E BDD",
        "state": "unconfigured",
        "detail": "Install @godriver + cucumber-js per docs/testing/04",
    })

    now = datetime.datetime.now().astimezone()
    generated_at = now.strftime("%Y-%m-%d %H:%M:%S %Z")
    generated_at_iso = now.isoformat(timespec="seconds")
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(render(checks, generated_at, generated_at_iso), encoding="utf-8")
    print(f"Dashboard written to {out}")
    return 1 if any(c["state"] == "fail" for c in checks) else 0


if __name__ == "__main__":
    sys.exit(main())
