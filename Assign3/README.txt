I decided to make a Bezier surface patch that has it's control points rendered as well.

You can rotate using A/D, W/S, Q/E (you can also use arrow keys).
You can zoom out with Z and in with X.
To reset the position you can press R.

I wanted to make the control points interactive by clicking and dragging them,
but it turned out to be a bigger task than I thought and so it doesn't work very well
in its current state. It seems that I would likely want to use Three.js and raycasting
to figure out if the cursor intersects any points.

You can still manually change the control point coordinates in Bezier.js under "var control"