# DISPATCH — teamwork_explorer_sss_camera

## Mission
Comprehensive Reverse Engineering of Solar System Scope (http://www.solarsystemscope.com, http://www.solarsystemscope.com/sss2, http://www.solarsystemscope.com/sss1) for 3D Camera Controls, Target Selection, Zoom Transitions, and Object Interactivity.

## Read First
- `d:\Projects\Personal Projects\Sky Trace\.agents\teamwork\ORIGINAL_REQUEST.md`

## Objectives
1. Investigate the live site `http://www.solarsystemscope.com` and its subdomains (`sss2`, `sss1`, etc.).
2. Extract the technical mechanics of:
   - Camera motion curves, easing equations, and framing calculations when an object (planet, moon, sun) is selected.
   - Smooth zoom-in transition: how the target distance is computed based on object radius/bounding sphere, how camera position and lookAt target animate over time, and what interpolation/damping is used.
   - Target tracking: how the camera maintains focus on the orbiting object while allowing free orbit/pan/tilt user controls around the centered object.
   - Zoom-out transition: how the camera smoothly transitions back to the solar system overview without jarring jumps or losing orientation.
   - Raycasting / pick detection: how user clicks/taps identify celestial bodies.
3. Use REA tools, web searches, cURL/fetch of web scripts and bundles, and browser inspection to analyze the javascript bundles.
4. Formulate concrete mathematical formulas, state machine design, and code patterns for Three.js.
5. Write your comprehensive report to `.agents/teamwork/teamwork_explorer_sss_camera/handoff.md`.
6. Send a message to the orchestrator with your findings.
