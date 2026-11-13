# DISPATCH — teamwork_explorer_sss_comet_gen2

## Mission
Replacement agent (gen 2) for Comprehensive Reverse Engineering of Solar System Scope Comet Trajectories (previous-path trail rendering vs closed orbit loops) and Asset/Texture Subdomains (textures, sss2, etc.).

## Read First
- `d:\Projects\Personal Projects\Sky Trace\.agents\teamwork\ORIGINAL_REQUEST.md`
- Predecessor state: `d:\Projects\Personal Projects\Sky Trace\.agents\teamwork\teamwork_explorer_sss_comet\`
- Note: Predecessor downloaded SWF, WebGL, XML, and script files into `D:\tmp\`. You can directly inspect the files and python scripts in `D:\tmp\` (e.g., `parse_trajectory.py`, `dump_elliptic.py`, `inspect_181.py`, etc.) to complete the findings without re-downloading.

## Objectives
1. Reverse engineer comet trajectory visualization from `http://www.solarsystemscope.com` and `sss2`:
   - Identify why and how comets in Solar System Scope render only their historical/previous path trajectory trail rather than a full closed orbital ellipse.
   - The exact mathematical and graphical representation: how many past points/time intervals are sampled, how the line/ribbon geometry is constructed, how opacity/fading/tapering along the trail is calculated (e.g. vertex alpha gradient from current position backward).
   - How the head of the comet (nucleus, coma, ion/dust tail direction relative to the Sun) is rendered.
   - Any orbital parameter calculations, parabolic/hyperbolic/elliptical Keplerian propagation used for comet trails.
2. Investigate discoverable texture and asset subdomains (`textures.solarsystemscope.com`, `solarsystemscope.com/textures/`, etc.) and document available high-res maps, normal maps, or celestial assets that could enhance Sky Trace.
3. Formulate concrete algorithms, Three.js shaders/Line2 geometry patterns, and pseudocode for Sky Trace.
4. Write your comprehensive, detailed technical findings to `d:\Projects\Personal Projects\Sky Trace\.agents\teamwork\teamwork_explorer_sss_comet_gen2\handoff.md`.
5. Send a message to parent orchestrator (`05248c18-5d2c-4cda-9adf-32c8a9c669f1`) when finished.
