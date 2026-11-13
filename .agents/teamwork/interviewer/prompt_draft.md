Reverse engineer Solar System Scope (http://www.solarsystemscope.com) and all its discoverable subdomains comprehensively using REA skills and browser tools, and implement its 3D interactivity mechanics in Sky Trace's 3D Celestial Explorer on a dedicated git branch for production.

Integrity mode: development

## Requirements

### R1. Comprehensive Reverse Engineering of Solar System Scope
Reverse engineer http://www.solarsystemscope.com and all discoverable subdomains (including sss1, sss2, textures, and related assets) using REA skills and browser inspection. Extract the technical mechanics for 3D camera controls, object selection, zoom-in and zoom-out transitions, object interaction behaviors, and comet trajectory visualization.

### R2. Dedicated Git Branch
Create and switch to a separate git branch (such as `feature/solarsystemscope-interactivity`). All reverse engineering findings, code modifications, and tests must be isolated to this branch.

### R3. 3D Camera Controls and Object Interactivity in Celestial Explorer
Refactor the 3D scene interactivity in Sky Trace's 3D Celestial Explorer (/explore) to match Solar System Scope: when a planet or celestial body is selected, smoothly zoom in, frame the target, and allow seamless object interaction; when deselecting or zooming out, smoothly return to the orbital overview perspective.

### R4. Comet Path Trajectory Correction
Update comet visualization so that comets do not render a full closed orbital ellipse, but instead display only their previous path/trail, matching Solar System Scope's visual mechanics.

### R5. Verification and Reference Comparison
Verify all updated 3D interactions and comet rendering against the live Solar System Scope interface (http://www.solarsystemscope.com) using browser tools and automated tests, ensuring zero console errors and no regressions to existing Sky Trace features.

## Acceptance Criteria

### Git Branching & Isolation
- [ ] A dedicated git branch (such as `feature/solarsystemscope-interactivity`) is created and contains all implementation work.

### Reverse Engineering & Findings
- [ ] Solar System Scope (http://www.solarsystemscope.com) and its subdomains (including sss1, sss2, textures) are reverse-engineered via REA and browser inspection.
- [ ] Camera motion curves, zoom boundaries, target tracking logic, and comet trail algorithms from Solar System Scope are documented from the reverse-engineering analysis.

### 3D Interactivity & Camera Navigation
- [ ] Selecting a planet or celestial body initiates smooth camera zoom-in framing the target.
- [ ] The user can rotate, inspect, and interact with the focused object while centered in the viewport.
- [ ] Deselecting or zooming out smoothly restores the solar system overview perspective without abrupt camera jumps.
- [ ] Interactivity in the 3D Celestial Explorer matches the fluidity and behavior of Solar System Scope without disrupting existing SPHEREx observatory features.

### Comet Trail Visualization
- [ ] Comets display exclusively their historical/previous path trajectory trail rather than a full closed orbit loop.

### Quality & Verification
- [ ] Automated tests pass and browser-based visual verification confirms smooth 3D camera transitions and comet trail rendering against http://www.solarsystemscope.com with zero runtime errors.
- [ ] Production build (`npm run build`) completes with zero errors.