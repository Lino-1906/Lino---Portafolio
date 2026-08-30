# Herbi texture restoration

## Individual-face update

Built-in image generation produced box-back-hq.png, box-top-hq.png and
box-black-hq.png as independent full-face textures instead of small atlas crops.
Prompt set: restore the corresponding user screenshot as sharp, flat, edge-to-edge
print artwork; retain yellow/olive/red blocks, original orientation, HERBI logo,
Manzanilla repetition and three white-framed panels on black. Remove perspective,
scene background, shadows and excessive margins. Black-panel preparation copy:
"Colocar un filtrante en una taza y agregar agua hirviendo", "Dejar reposar de
2 a 3 minutos", "También se puede consumir frío o como helado".

The viewer corrects generated letter errors with native canvas typesetting.
The generated top-face heraldry and paragraph are NOT used: the existing
brand artwork and original paragraph replace them. Original manufacturer copy
is retained on black rather than publishing generated identifiers. These two
small text blocks still require an editable master to obtain genuine high detail.

Tool: built-in image generation, reference-guided edit.
Output: box-dieline-restored.png (1604 × 981).
Original: box-dieline-source.png, kept unchanged.

Prompt: Restore the original unfolded HERBI Manzanilla packaging atlas at higher
definition, guided by the supplied photographs of the physical box. Preserve
yellow/olive blocks, HERBI branding, Manzanilla type, botanical linework and
the three white-framed information panels on black. Flat printed artwork,
no perspective or lighting, no redesigned branding. Preserve orientations,
panel locations and original text; improve clarity only.

The generated atlas did not preserve every panel boundary exactly. The 3D
viewer therefore uses separately verified crop coordinates for the front,
botanical side and black side. Unverified generated copy on other panels
is NOT used; those faces retain the original artwork. The black tuck-in flap
is excluded from the texture to remove the redundant side margin.
