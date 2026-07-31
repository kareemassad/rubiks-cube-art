# Mobile Cube Workflow Design

## Goal

Improve the mobile and tablet experience for people who use the generated plan while they build a physical Rubik's cube wall.

The primary workflow is:

1. Select one physical cube in the generated mosaic.
2. See the selected cube in the preview and cube list.
3. Open only that cube's build instructions.
4. Advance through the moves with controls that remain easy to reach.

The existing cube-generation algorithm, worker flow, PDF export, and visual identity remain in scope only when the UI changes require them.

## Approved interaction design

### Interactive mosaic preview

The generated sticker mosaic will remain the main visual map. Each `3 x 3` sticker block represents one physical cube.

- Add cube-sized selection regions over the preview.
- Show a cube number on hover, focus, or selection.
- Keep labels hidden when no interaction is active so large mosaics stay readable.
- Give the active cube a strong outline and a small label such as `Cube 7`.
- Allow keyboard focus and activation for each cube region.
- When a cube card or cube lookup opens a cube, update the mosaic selection.
- When a mosaic region is selected, update the list selection and open that cube's instructions.
- Keep the active selection visible behind the instruction sheet.

The output grid and the cube index use the existing row-major order. Cube `0` is the first cube in the first row. Cube positions are derived from `plan.rows`, `plan.cols`, and the cube index.

### Physical cube list

The on-screen list will show one card for each physical cube. The generation layer may continue to group duplicate faces for caching and PDF output.

Each card will show:

- `Cube N` as the primary label.
- The cube row and column.
- The target face preview.
- A completion control for that physical cube.
- A clear action label such as `View steps`.

Duplicate information can appear as secondary text. It must not replace the physical cube number or make the user guess which wall position the card represents.

Selecting a card will select the matching mosaic region, scroll the card into view when needed, and open that cube's instructions.

### Focused instruction sheet

The instruction player will continue to show one cube at a time.

- Show `Cube N of M` in the header.
- Show the current step and total step count.
- Keep the target face and current cube state prominent.
- Show the complete move sequence in one visible, numbered list.
- Highlight the current move during playback without hiding future moves.
- Keep the next move visible without requiring a scroll.
- Keep `Back` and `Next` controls in a sticky bottom area.
- Use a full-screen sheet on phones.
- Use a centered sheet with a bounded height on tablets and desktops.
- Keep close actions available through the close button, Escape, and backdrop interaction when appropriate.
- Respect safe-area insets and `prefers-reduced-motion`.

The sheet will not render instructions for every cube at once. The selected cube remains the single source of truth for the instruction view.

### Move optimization and correctness

The generator will use a bounded shortest-practical search.

- Keep `cubejs` as the solver for legal cube states.
- Try more than one legal full-cube completion when the target face leaves hidden pieces unconstrained.
- Solve each candidate and keep the exact candidate with the fewest build moves.
- Use a fixed candidate and depth budget so generation remains browser-safe.
- Normalize move sequences before storing and displaying them.
- Verify the final build moves by applying them to a solved cube and comparing the visible face with the requested target face.
- Accept a result only when the visible face matches all nine target stickers.
- If no exact result is found within the budget, stop generation with a clear error. Do not return an approximate result as a valid solution.

The app may report that generation failed for a difficult target. A failed generation is safer than instructions that build the wrong face.

## Responsive and iOS-style improvements

- Reduce the hero height and illustration scale on phones so the upload control appears earlier.
- Keep touch targets at least 44 CSS pixels where practical.
- Collapse secondary layout controls under an advanced disclosure on narrow screens.
- Keep the primary generate action easy to reach after the source image and layout are ready.
- Use rounded surfaces and softer shadows for mobile sheets and cards while retaining the existing dark borders and Rubik color accents.
- Use hover styles only when the device supports hover. Tap and focus states remain complete on touch devices.
- Preserve visible focus indicators and high-contrast text.
- Avoid motion that can interfere with reduced-motion preferences.

## Component and state changes

- `App` owns the selected physical cube index so preview, list, lookup, and instruction sheet stay synchronized.
- `PreviewPanel` receives the selected index and forwards selection events to the mosaic and cube list.
- `StickerGridPreview` accepts cube dimensions and selection callbacks. It renders accessible cube selection regions over the sticker grid.
- `CubeCard` represents one physical cube instead of only a generated face group.
- Existing grouped data remains available to PDF export and duplicate-generation reporting.
- Completion storage uses stable plan-scoped physical cube identifiers. Existing grouped completion data will not be treated as a physical cube completion unless a safe migration path exists.
- The cube-generation path exposes exact-result verification and rejects approximate fallback results.

## Error and edge handling

- Ignore invalid cube indexes from lookup input.
- Keep the current selection valid when a new plan replaces the old plan.
- Do not open the instruction sheet when the plan has no matching cube.
- Keep the mosaic usable when the generated plan is large. Do not render expensive per-sticker React buttons.
- Keep generation and preview loading overlays functional while selection state changes.
- Do not show a move sequence when verification does not reproduce the requested target face.
- If local storage is unavailable, completion tracking remains a non-blocking convenience.

## Verification

Add or update component tests for:

- selecting a cube from the mosaic;
- selecting a cube from the list;
- synchronizing selection with cube lookup;
- opening the focused instruction sheet for the selected physical cube;
- showing the complete move sequence while highlighting the current step;
- physical-cube completion state;
- accessible labels and keyboard activation for cube regions.

Add core tests for:

- selecting the shortest exact candidate among the bounded candidate set;
- rejecting a candidate that does not reproduce all nine target stickers;
- preserving legal, exact output when move optimization cannot find a shorter candidate.

Verify the following before the implementation commit:

- `pnpm test` passes;
- `pnpm build` passes;
- the app renders at phone, tablet, and desktop widths;
- the browser preview demonstrates selection from both the mosaic and the list;
- the browser preview demonstrates a focused instruction sheet with one cube's steps;
- the browser preview is reviewed before committing implementation changes.
