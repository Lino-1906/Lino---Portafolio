# Crafter's Acrylic interactive hero

Local Three.js r180 and OrbitControls (MIT, license in assets/vendor/three).
Custom box geometry and lathed bottle, cylindrical label, neck and ribbed cap.
Box artwork: six native-resolution PNG exports from the user's original vector
PDF `Empaque Sec - T Final.pdf`, page 1, rendered at 288 dpi (4 pixels/point).
Front: 1128 × 1576; back: 1128 × 1588; sides: 568/552 × 1588;
top: 1120 × 544; bottom: 1128 × 520. No generative text changes or upscaling.
The side panels use the geometric artwork, not the outer logo closure flaps.
Box proportions follow the dieline: approximately 284:397:140 (width:height:depth).
Bottle artwork remains label-system.png.
The model is a visual portfolio representation with approximate dimensions,
not a production CAD model. Bottle small print remains limited by its source image.

Controls: both products / box / bottle, automatic rotation toggle, reset,
mouse or horizontal touch drag, keyboard arrows on the focused canvas.
Vertical page scrolling and reduced-motion preference are respected.
The renderer pauses when off screen or the document is hidden. Pixel ratio capped
at 2. Photo fallback remains available on unsupported browsers or lost WebGL context.
