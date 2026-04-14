# Approach & Explanation

## How I Approached the Take-Home

When I first opened the project, I spent time reading the codebase before writing any code. I wanted to understand what was already there, how the pieces connected, and where the intentional flaws were — before touching anything.

The stack is React + TypeScript + Three.js, with a jQuery-based layout and a custom pub/sub notification system tying everything together. Once I understood that the notification center was the backbone of all communication between the 3D engine and the React UI, the rest of the architecture made sense.

---

## What I Implemented

### Main Goal — Delete Button
Each shape in the tree view now has a red × button. Clicking it:
- Removes the shape from its Three.js parent (works for both root-level shapes and nested children, since Three.js uses a unified scene graph)
- Fires `shapeRemoved` so the tree and object count update
- Clears the selection state if the deleted shape was selected

### Bonus Goal — Geometry Type and Color Display
Each tree row now shows:
- A small colored circle reflecting the shape's actual material color (extracted from `MeshBasicMaterial`)
- The geometry type label ("Sphere", "Cube", "Cylinder") mapped from Three.js geometry class names

---

## Bugs I Found and Fixed

Reading the existing code before implementing the new features let me spot several issues I fixed as part of the work:

**Subscription leak on every render**
`subscribe('projectName', ...)` was called directly in the component body, outside of `useEffect`. Every re-render added a new listener without removing the old one. Moved it inside `useEffect` alongside the other subscriptions.

**No subscription cleanup**
None of the subscriptions had corresponding `unsubscribe` calls. This means callbacks accumulate in memory and can fire on unmounted components. Added proper cleanup in the `useEffect` return function.

**Object count always off by one**
`getObjectCount()` used `scene.traverse()` which walks the entire scene graph — including the `Scene` root object itself. With 2 shapes it returned 3. Fixed by traversing `scene.children` instead, so only user-added shapes are counted.

**Delete button being clipped**
The delete button was cut off at the right edge of the panel. The cause: `.shapeItemContent` had `width: 100%` with padding, but no `box-sizing: border-box`. CSS default behavior (`content-box`) makes padding additive on top of the width, so the element was `100% + 16px` wide. The container's `overflow: hidden` clipped the overflow — hiding the button. Fixed with `box-sizing: border-box`.

**Helper functions recreated on every render**
`getGeometryType` and `getShapeColor` were defined inside the component, so React allocated new function objects on every render of every tree node. Moved them to module level since they're pure functions with no dependency on component state.

**Nested flex containers with the same class**
`ShapeItem` (the clickable row wrapper) was incorrectly applying `shapeItemContent`, the same flex layout class used on the inner content wrapper inside `ShapeNode`. This stacked two identical flex containers inside each other. Removed it from `ShapeItem`.

---

## Design Decisions

**Keeping the notification pattern**
The existing pub/sub system is simple but effective for this scale of app. I kept it rather than introducing a state manager like Zustand or Redux — the overhead wouldn't be justified here.

**Module-level helper functions**
`getGeometryType` and `getShapeColor` are stateless mappings. Keeping them outside the component makes it clear they don't depend on React lifecycle and avoids unnecessary re-allocation.

**Exporting `ShapeNode` for testability**
Rather than only testing through the full `ShapeList`, I exported `ShapeNode` so it could be tested in isolation with mocked dependencies. This makes tests faster and more focused.

---

## Testing

I replaced the original test (which only checked that a method existed) with five behavior-driven tests:

1. Shape name, geometry type, and color indicator render correctly
2. Clicking delete removes the shape from its Three.js parent
3. `shapeRemoved` notification fires on delete
4. `shapeSelected null` fires only when the deleted shape was the selected one
5. `shapeSelected null` does not fire when a different shape is selected
6. Child shapes render recursively under their parent

Tests use `vitest-browser-react` with mocked notification center and engine, keeping them fast and isolated.

---

## Scalability Considerations

The current implementation works well for a moderate number of shapes. For larger scenes:

- **1,000+ shapes**: The recursive `ShapeNode` component renders the full tree on every state change. Introducing `React.memo` on `ShapeNode` would prevent re-rendering nodes whose props haven't changed.
- **10,000+ shapes**: A flat list with virtualization (e.g. `react-window`) would be necessary. The current tree structure would need to be flattened into a list with depth metadata for virtual rendering to work.
- **Bulk operations**: The current delete is per-shape. Bulk delete would benefit from batching notifications rather than firing `shapeRemoved` once per shape.

---

## What I Would Do With More Time

- **Undo/Redo**: Implement a command pattern — each operation (add, delete, move) produces a reversible command object stored on a stack.
- **Drag and drop reordering**: Allow reparenting shapes by dragging in the tree.
- **Scene re-render on delete**: Currently the Three.js canvas only re-renders when the camera moves. Calling `engine.render()` explicitly after shape removal would immediately reflect deletions in the 3D view.
- **Shape naming**: Let users name shapes rather than relying on positional labels ("Shape 1", "Shape 2") that shift when shapes are deleted.

---

## AI Tool Usage

I used **Claude** (claude.ai) to assist with code analysis, identifying existing bugs, and implementing improvements. All code was reviewed and understood before being applied.
