# Escape From Mars 2 — Phased Plan

## Overview
Build a browser 2D game with three levels: Mars landing + puzzle/maze, rover fuel quest with hazards/boosts, and a space chase finale. Implementation will proceed in phases with iterative playtests and polish passes.

## Phases

### Phase 0 — Foundations
- Choose engine stack (canvas + vanilla JS or a framework like Phaser).
- Set up project structure, asset pipeline, and build/dev workflow.
- Define core systems: scene/state manager, input, physics/collision, camera.
- Establish art direction and sprite style (consistent 2D sprite sheets).

### Phase 1 — Vertical Slice (Level 1)
- Player movement + collision in a tile-based maze.
- Basic NPC/enemy behavior (martians) and simple puzzles.
- Goal flow: start separated from ship → navigate maze → reach ship.
- First pass UI: health/status, prompts, level completion.

### Phase 2 — Level 2 Core Loop (Rover + Maze)
- Rover driving controls and camera behavior.
- Fuel canister collection logic (requires 5+ to proceed).
- Integrate maze area with walls and locks; ensure exit requires jetpack or explosives.
- Implement jetpack item + fuel pickups; add jump-over-walls mechanic.
- Implement explosives pickup + wall-destroy logic.
- Add decoy canister variant (misspelled label, chipped paint) that explodes.
- Ship refuel interaction and level completion.

### Phase 3 — Level 3 Space Chase
- Space flight controls and screen wrap/scrolling.
- Martian ship chase AI; projectile/junk patterns.
- Asteroid belt obstacles and collision damage.
- Final boss: large asteroid evade sequence; martians crash, player survives.

### Phase 4 — Art, Audio, and Polish
- Replace placeholders with sprite art and VFX.
- Add SFX/music and UI polish.
- Difficulty tuning and pacing.
- Bug fixes + performance pass.

## Task List (Living)

### Project Setup
- [ ] Decide on game framework (Phaser vs. custom canvas).
- [ ] Initialize repo structure and dev build workflow.
- [ ] Add scene manager, input handler, collision system.

### Art Direction + Sprites
- [ ] Define sprite style (pixel vs. high-res 2D).
- [ ] Source sprite packs for: astronaut, martians, rover, spaceship, asteroids, UI.
- [ ] Source tilesets for Mars terrain and maze walls.
- [ ] Source VFX sprites for explosions, boosts, and jetpack.

### Level 1
- [ ] Implement player movement + collision.
- [ ] Build Mars maze tiles + puzzle elements.
- [ ] Implement martian patrol/alert behavior.
- [ ] Hook up ship goal trigger and level completion.

### Level 2
- [ ] Implement rover driving and terrain collision.
- [ ] Implement fuel canister pickups (real + decoy).
- [ ] Implement jetpack + fuel system (jump over walls).
- [ ] Implement explosives + destructible walls.
- [ ] Gate maze exit to require jetpack/explosives.
- [ ] Implement ship refuel and return-to-ship flow.

### Level 3
- [ ] Implement space flight + asteroid belt obstacles.
- [ ] Martian ship chase and projectile hazards.
- [ ] Final large asteroid boss evade event.
- [ ] End-of-level escape sequence.

### UI/Audio/Polish
- [ ] Add HUD (fuel, jetpack, explosives, health).
- [ ] Add level transition screens + tutorial prompts.
- [ ] Add SFX/music + volume controls.
- [ ] Balance difficulty and pacing.

## Notes
- Prefer actual 2D sprites over geometric placeholders.
- When evaluating sprite packs, prioritize license clarity and visual cohesion.
- Use decoy canister visual differences (misspelling + chipped paint) for gameplay clarity.
