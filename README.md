# simple-rts-unity

Minimal real-time-strategy starting point for Unity. Drag-select units, right-click to move them in formation, edge-pan / WASD camera, scroll to zoom.

This is a public learning-oriented scaffold — open it in Unity Hub and you've got a working RTS input loop in under a minute. Build resources, combat, and buildings on top.

## Open in Unity

1. `git clone https://github.com/lbartoszcze/simple-rts-unity.git`
2. Open Unity Hub → **Add project from disk** → pick the cloned folder.
3. Editor version pinned to **2022.3 LTS** (`ProjectSettings/ProjectVersion.txt`). Any 2022.3.x install works.

## Scene setup (one-time)

The repo ships scripts only — wire them up in a fresh scene:

1. **Ground** — `GameObject → 3D Object → Plane`, scale `(10, 1, 10)`, Layer = `Ground`.
2. **NavMesh** — `Window → AI → Navigation`, mark the plane as Navigation Static, **Bake**. (Or add the AI Navigation `NavMeshSurface` component and bake from there.)
3. **Camera rig** — empty `GameObject "CameraRig"` at `(0, 40, -20)`, rotate `(55, 0, 0)`, parent the Main Camera under it. Add `RtsCamera.cs` to the rig.
4. **Controller** — empty `GameObject "RtsController"`, add `RtsController.cs`. Set `Ground Mask = Ground`, `Unit Mask = Unit`.
5. **Unit prefab** —
   - `GameObject → 3D Object → Capsule`, Layer = `Unit`.
   - Add `NavMeshAgent`, `Unit.cs`, `Selectable.cs`.
   - Child empty `SelectionRing` with a flat torus / decal mesh, disabled by default. Drag it into `Selectable.ring`.
   - Drag the capsule into `Assets/Prefabs` to make it a prefab, then drop a few copies into the scene.

Press Play — left-drag to box-select, right-click to move.

## Scripts

| File | Role |
|---|---|
| `Assets/Scripts/RtsCamera.cs` | Edge-pan / WASD pan, scroll zoom, height clamp. |
| `Assets/Scripts/Selectable.cs` | Toggles a child selection ring. |
| `Assets/Scripts/Unit.cs` | Thin wrapper over `NavMeshAgent` exposing `MoveTo` / `Stop`. |
| `Assets/Scripts/RtsController.cs` | Click + drag-box select, right-click formation move order. |

## Suggested next steps

- **Combat** — add `Health.cs` + an attack loop on `Unit`: nearest enemy in range → attack, else chase.
- **Resources** — `ResourceNode` with an amount, `Worker` state machine (idle → gather → deposit).
- **Buildings** — ghost placement on cursor, build timer, production queue spawning units.
- **Fog of war** — render a darkened overlay to a RenderTexture, punch holes around each player-team unit.
- **Minimap** — second camera top-down, RawImage in a Canvas, click-to-pan main camera.

## License

MIT — see `LICENSE`.
