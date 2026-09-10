Baselines for Level 4 visual regression.

This directory ships with BASELINE_DRIVER only. The PNG baselines are
captured per the recipe in docs/testing/03-implementation-guide.md, section 5:

    xvfb-run --auto-servernum godot --rendering-driver opengl3 --test-driver

Suggested first captures for this demo:

    main_menu.png      the arena at frame 1, before any input
    workshop_friday.png  the arena after collecting the first coin

Never capture on a local GPU (anti-pattern A9). Every baseline update
requires art direction review.
