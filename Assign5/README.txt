tileCube.js will generate a cube that can have any (square) number of tiles and any colors according to its parameters.

This is done through the use of shaders which are passed into a THREE.ShaderMaterial, and applied to the cube geometry.

Currently it's set to have 4x4 colors with basic rubik's cube colors.
It is also set to automatically rotate in animate().

Feel free to add or change any RGB float values in colors[].
You can also change the variable N to a different number of tiles (per row/column of a face)

I tested this by opening tileCube.html in Firefox as well as Chromium.
