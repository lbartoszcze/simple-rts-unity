# simple-rts-unity

Minimal real-time-strategy starting point for Unity 2022 LTS. Drag-select units, right-click to move them in formation, edge-pan / WASD camera, scroll to zoom.

The repo ships an Editor bootstrap script — clone, open in Unity Hub, hit **Play**. No manual scene wiring.

## Run it

1. Install Unity Hub: https://unity.com/download
2. Hub → **Installs → Install Editor → 2022.3 LTS** (any 2022.3.x release).
3. Clone:
   ```bash
   git clone https://github.com/lbartoszcze/simple-rts-unity.git
   ```
4. Hub → **Add → Add project from disk** → pick the cloned folder.
5. Wait for Unity to finish the first import. The bootstrap script (`Assets/Editor/SceneBootstrap.cs`) will:
   - Add `Ground` (layer 8) and `Unit` (layer 9) to the layer table.
   - Create `Assets/Scenes/Main.unity` with a green ground plane, a baked NavMesh, a directional light, an angled camera rig, the controller, and a 4×3 block of red capsule units.
   - Mark the scene built (`Assets/Scenes/.bootstrapped`) so it doesn't re-run.
6. Open `Assets/Scenes/Main.unity` if Unity hasn't already, hit ▶ **Play**.

To rebuild the scene from scratch: **Tools → RTS → Rebuild Demo Scene**.

## Controls

| Input | Action |
|---|---|
| Left-click | Select unit |
| Left-drag | Box-select units |
| Right-click on ground | Move selected units there in formation |
| WASD or push cursor to screen edge | Pan camera |
| Scroll wheel | Zoom |

## Code layout

| File | Role |
|---|---|
| `Assets/Scripts/RtsCamera.cs` | Edge-pan / WASD pan, scroll zoom, height clamp on the camera rig. |
| `Assets/Scripts/Selectable.cs` | Toggles a child SelectionRing GameObject. |
| `Assets/Scripts/Unit.cs` | Wraps `NavMeshAgent`, exposes `MoveTo` / `Stop`. |
| `Assets/Scripts/RtsController.cs` | Click + drag-box select, right-click formation move order. |
| `Assets/Editor/SceneBootstrap.cs` | One-shot Editor script that builds the demo scene on first open. |

## Suggested next steps

- **Combat** — add `Health.cs` plus an attack loop on `Unit`: nearest enemy in range → shoot, else chase.
- **Resources** — `ResourceNode` with an amount, `Worker` state machine (idle → gather → deposit at a base).
- **Buildings** — ghost placement on cursor, build timer, production queue spawning units.
- **Fog of war** — render a darkened overlay to a RenderTexture, punch holes around player-team units.
- **Minimap** — second top-down camera, RawImage in a Canvas, click-to-pan main camera.

## License

MIT — see `LICENSE`.
