# Reader rendering optimization

The bundled StPageFlip 2.0.7 renderer originally called `drawFrame()` on every
animation frame, including while idle. The existing drop-shadow filter then had
to composite the continuously changing canvas as well.

`render-on-demand.js` replaces only the scheduler, via one hook in the vendored
renderer `start()` method. Page geometry, resolution, flip duration, corner
interaction, sound, and shadow settings are unchanged. Render mutations and image
load/error events invalidate the frame; only active flips and visible pending
page loaders continue requesting frames. Idle canvases keep their last image.

The scheduler resets the animation clock after idle, clamps same-frame timestamps,
pauses on tab visibility / parent-modal suspend, and cleans up on destroy/unload.
Both desktop and mobile modal hosts suspend immediately on close, and still
unload the iframe after the existing closing transition.

Local comparison harness: `tmp/reader-performance.html` (ignored QA artifact).
Luminé desktop: 241 canvas clears in 2 seconds idle before, 0 after;
actual page flip still rendered 96 frames and advanced from pages 2–3 to 4–5.
After flipping, zooming and suspension, the optimized idle redraw count is 0.
These are canvas draw counts, not a GPU utilization percentage or a hardware
benchmark. Validate on the target low-end device before making a frame-rate SLA.

Applies to all four readers sharing this engine: Luminé, editorial, Ayacucho,
and Circuito. No changes to the packaging WebGL viewers in this optimization.
