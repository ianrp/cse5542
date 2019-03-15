/*============= Creating a canvas ======================*/

var canvas = document.getElementById("c");
var gl = canvas.getContext("webgl");

/*========== Defining and storing the geometry ==========*/

// specify number of rows/columns of surface points
var numRows = 60;
var numCol = 60;

var control = [
    // row 1    // # in diagram below
    0, 0, 4,    // 0
    0, 1, 3,    // 1
    0, 2, 2,    // 2
    0, 3, 1,    // 3
    // row 2    // 
    2, 0, 0,    // 4
    2, 1, 0,    // .
    2, 2, 0,    // .
    2, 3, 0,    // .
    // row 3
    4, 0, 0,
    4, 1, 0,
    4, 2, 0,
    4, 3, 0,
    // row 4
    6, 0, 1,
    6, 1, 2,
    6, 2, 3,
    6, 3, 4
];

/*
 *      12--13--14--15  <- row 4
 *      |   |   |   |
 *      8---9--10--11   <- row 3
 *      |   |   |   |
 *      4---5---6---7   <- row 2
 *      |   |   |   |
 *      0---1---2---3   <- row 1
 * */

// indices for lines between control points
var controlGridInd = [
    0, 1, 1, 2, 2, 3,
    0, 4, 1, 5, 2, 6, 3, 7,
    4, 5, 5, 6, 6, 7,
    4, 8, 5, 9, 6, 10, 7, 11,
    8, 9, 9, 10, 10, 11,
    8, 12, 9, 13, 10, 14, 11, 15,
    12, 13, 13, 14, 14, 15
];

// surface points
var positions = [];
var indices = getIndices(numRows, numCol);

/* Bézier basis matrix derived from:
 *      k1(t) = (1-t)^3
 *      k2(t) = 3(1-t)^2 * t
 *      k3(t) = 3(1-t)^2
 *      k4(t) = t^3
 * */
var basis = [
    -1,  3, -3,  1,
     3, -6,  3,  0,
    -3,  3,  0,  0,
     1,  0,  0,  0
];
var basisMat = mat4.create(basis);

updateSurface(); // get initial surface points from starting control point positions

// get color of each surface point
var surfaceColors = [];
var colorStep = 1 / positions.length;
var cVal = 0;
// create gradient color affect by increasing red, reducing blue
for (var i = 0; i < positions.length; i++) {
    surfaceColors.push(cVal * 2);
    surfaceColors.push(0);
    surfaceColors.push(1 - cVal * 2);
    cVal += colorStep;
}

// set control point grid lines to all be red
var lineColors = [];
var colorStep = 1 / controlGridInd.length;
for (var i = 0; i < controlGridInd.length; i++) {
    lineColors.push(1);
    lineColors.push(0);
    lineColors.push(0);
}

// Create and store surface position data into vertex buffer
var positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

// Create and store surface point index (triangle strip) data into index buffer
var index_buffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

// Create and store control point position data into vertex buffer
var controlPosBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, controlPosBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(control), gl.STATIC_DRAW);

// Create and store control point index data (lines) into index buffer
var controlIndBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, controlIndBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(controlGridInd), gl.STATIC_DRAW);

// Create and store surface color data into color buffer
var surfaceColorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, surfaceColorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(surfaceColors), gl.STATIC_DRAW);

// Create and store control lines color data into color buffer
var lineColorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, lineColorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineColors), gl.STATIC_DRAW);

/*=================== SHADERS =================== */

var program = initShaders(gl, "vertex-shader", "fragment-shader");
gl.linkProgram(program);

/*==================== MATRIX ====================== */

// get model/view/projection matrices
var _Pmatrix = gl.getUniformLocation(program, "Pmatrix");
var _Vmatrix = gl.getUniformLocation(program, "Vmatrix");
var _Mmatrix = gl.getUniformLocation(program, "Mmatrix");

function get_projection(angle, a, zMin, zMax) {
    var ang = Math.tan((angle * .5) * Math.PI / 180); //angle*.5
    return [
        0.5 / ang, 0, 0, 0,
        0, 0.5 * a / ang, 0, 0,
        0, 0, -(zMax + zMin) / (zMax - zMin), -1,
        0, 0, (-2 * zMax * zMin) / (zMax - zMin), 0
    ];
}

var proj_matrix = get_projection(40, canvas.width / canvas.height, 1, 100);
var mo_matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
var view_matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

view_matrix[14] = view_matrix[14] - 6;

/*================= Mouse events ======================*/

var drag = false;
var old_x, old_y;
var dX = 0,
    dY = 0;
var currentPoint;
var mouseX, mouseY;

var rotateSpeed = 0.1, zoomSpeed = 0.2;

var mouseDown = function (e) {
    drag = true; 
    old_x = e.pageX - canvas.width / 2 / 50;
    old_y = canvas.height / 2 - e.pageY / 50;
    getClosestPoint(old_x, old_y);
    e.preventDefault();
    return false;
};

var mouseUp = function (e) {
    drag = false;
};

var mouseMove = function (e) {
    if (!drag) return false;
    mouseX = e.pageX - canvas.width / 2 / 50;
    mouseY = canvas.height / 2 - e.pageY / 50;
    movePoint(mouseX, mouseY);
};

// get index of control point closest to cursor
function getClosestPoint(x, y) {
    var dist, minDist = 999999;
    for (var i = 0; i < control.length; i += 3) {
        var xDist = x - control[i];
        var yDist = y - control[i + 1];
        dist = xDist * xDist + yDist * yDist;
        if (dist < minDist) {
            minDist = dist;
            currentPoint = i;
        }
    }
}

function movePoint(x, y) { 
    dX = x - old_x;
    dY = y - old_y;   
    control[currentPoint] += dX / 50;
    control[currentPoint + 1] += dY / 50;
    old_x = x;
    old_y = y;
}

var keyDown = function (e) {
    //e.preventDefault();
    console.log(e.keyCode);
    // rotation
    if (e.keyCode == 38 || e.keyCode == 87) { // up arrow or W
        PHI = -rotateSpeed;
    } else if (e.keyCode == 40 || e.keyCode == 83) { // down or S
        PHI = rotateSpeed;
    } else if (e.keyCode == 37 || e.keyCode == 65) { // left or A
        THETA = -rotateSpeed;
    } else if (e.keyCode == 39 || e.keyCode == 68) { // right or D
        THETA = rotateSpeed;
    } else if (e.keyCode == 81) { // Q
        DELTA = rotateSpeed;
    } else if (e.keyCode == 69) { // E
        DELTA = -rotateSpeed;
    }

    // zoom
    if (e.keyCode == 90) { // Z: zoom out
        zoom = -zoomSpeed;
    } else if (e.keyCode == 88) { // X: zoom in
        zoom = zoomSpeed;
    } 
}

var keyUp = function (e) {

    // reset position
    if (e.keyCode == 82) {
        mat4.identity(mo_matrix);
        mat4.identity(view_matrix);
    }

    // rotation
    if (e.keyCode == 38 || e.keyCode == 87 || e.keyCode == 40 || e.keyCode == 83) {
        PHI = 0;
    } else if (e.keyCode == 37 || e.keyCode == 65 || e.keyCode == 39 || e.keyCode == 68) {
        THETA = 0;
    } else if(e.keyCode == 81 || e.keyCode == 69) {
        DELTA = 0;
    }

    // zoom
    if (e.keyCode == 90 || e.keyCode == 88) {
        zoom = 0;
    }
}

var zoom = function (e) {
    zoom = e.deltaY;
}

canvas.setAttribute("tabindex", 0);
canvas.focus();

canvas.addEventListener("keydown", keyDown, false);
canvas.addEventListener("keyup", keyUp, false);

canvas.addEventListener("mousemove", mouseMove, false);
canvas.addEventListener("mousedown", mouseDown, false);
canvas.addEventListener("mouseup", mouseUp, false);
canvas.addEventListener("mouseout", mouseUp, false);

/*=================== Drawing =================== */

var THETA = 0,
    PHI = 0;
    DELTA = 0;
var time_old = 0;
var zoom = 0;

// initial orientation
mat4.identity(mo_matrix);
mat4.identity(view_matrix);
mat4.translate(proj_matrix, [0, 0, -15]);

var animate = function (time) {
    var dt = time - time_old;
    time_old = time;

    // update input transformations
    mat4.translate(view_matrix, [0, 0, zoom]);

    mat4.rotate(mo_matrix, THETA, [0, 1, 0]);
    mat4.rotate(mo_matrix, PHI, [1, 0, 0]);
    mat4.rotate(mo_matrix, DELTA, [0, 0, 1]);

    //rotateModel(control, THETA, [0, 1, 0]);
    //rotateModel(control, PHI, [1, 0, 0]);
    //rotateModel(control, DELTA, [0, 0, 1]);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear the canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);
   
    updateSurface(); // recalculate surface points from control points

    gl.uniformMatrix4fv(_Pmatrix, false, proj_matrix);
    gl.uniformMatrix4fv(_Vmatrix, false, view_matrix);
    gl.uniformMatrix4fv(_Mmatrix, false, mo_matrix);

    // draw surface
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    var _position = gl.getAttribLocation(program, "position");
    gl.vertexAttribPointer(_position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(_position); 
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);  

    gl.bindBuffer(gl.ARRAY_BUFFER, surfaceColorBuffer);
    var _sColor = gl.getAttribLocation(program, "color");
    gl.vertexAttribPointer(_sColor, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(_sColor);

    gl.drawElements(gl.TRIANGLE_STRIP, indices.length, gl.UNSIGNED_SHORT, 0);

    // draw control
    gl.bindBuffer(gl.ARRAY_BUFFER, controlPosBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(control), gl.STATIC_DRAW);
    var c_position = gl.getAttribLocation(program, "position")
    gl.vertexAttribPointer(c_position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(c_position);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, controlIndBuffer);

    gl.bindBuffer(gl.ARRAY_BUFFER, lineColorBuffer);
    var _lcolor = gl.getAttribLocation(program, "color");
    gl.vertexAttribPointer(_lcolor, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(_lcolor);

    gl.drawArrays(gl.POINTS, 0, control.length / 3); // draw points
    gl.drawElements(gl.LINES, controlGridInd.length, gl.UNSIGNED_SHORT, 0); //draw lines

    window.requestAnimationFrame(animate); //refresh
}

function updateSurface() {
    for (var u = 0; u < numRows; u++) { // for each row of surface points

        // get cumulative step size
        var t = u / numRows;

        // t^3 + t^2 + t + 1
        var tVals = [t * t * t, t * t, t, 1]
        // K = T * Basis
        var kVals = mat4.multiplyVec4(basisMat, tVals);

        var tempControl = [];
        for (var i = 0; i < 4; i++) { // for each column of control points
            var controlSubset = [];
            for (var j = 0; j < 4; j++) { // for each control point in column
                var ind = (i * 3) + (j * 12); // get position index of control point
                // add control point to subset which form a column
                controlSubset = controlSubset.concat(control.slice(ind, ind + 3));
            }
            // add new temporary control point based on selected control points and k-values from t parameter
            tempControl = tempControl.concat(getPoint(kVals, controlSubset));
        }
        // we now have a row of 4 new control points, which will be used to calculate surface points

        var index = u * numCol * 3; // starting index = first point in row # u
        for (var v = 0; v < numCol; v++) { // for each column of surface points

            // get cumulative step size
            t = v / numRows;

            // get new t & k values based on new parameter
            var tVals = [t * t * t, t * t, t, 1]
            var kVals = mat4.multiplyVec4(basisMat, tVals);

            var point = getPoint(kVals, tempControl); // calculate surface point from temporary control points

            // update stored point in array
            for (var i = 0; i < 3; i++) {
                positions[index] = point[i];
                index++; // increment index to move on to next point in surface row
            }

        }
    }
}

// calculate surface point from k-values and control points
function getPoint(k, p) {
    var point = [0, 0, 0];
    for (var i = 0; i < 4; i++) { // iterate through 4 control points
        for (var j = 0; j < 3; j++) { // iterate through x, y, z positions
            // multiply k-val by corresponding control point dimension
            // add this to surface point dimension value
            // resulting in point = k1*P1 + k2*P2 + k3*P3 + k4*P4
            point[j] += k[i] * p[3 * i + j];
        }
    }
    return point;
}

// get index for each surface point based on specified number of rows and columns
function getIndices(rows, cols) {
    var indices = [];
    var top = []
    var bottom = [];

    var ind = (rows - 1) * cols;        // top-leftmost point
    for (var c = 0; c < cols; c++) {    // get indices of top two rows of points
        top[c] = ind;                   // top = first row
        bottom[c] = ind - cols;         // bottom = second row
        ind++;
    }

    // put top two rows in array by alternating for triangle strip order
    /*     start   
     *      |  /|  /|         /|  /|    <- top row
     *      | / | / |  . . . . | / |
     *      |/  |/  |/         |/  |
     *      V   V   V          V   V    <- bottom row
     *                            end
     * */   
    for (var i = 0; i < cols; i++) {
        indices.push(top[i]);
        indices.push(bottom[i]);
    }

    for (var r = 1; r < rows - 1; r++) { // every row except top-most and bottom-most

        top = bottom.slice(); // copy previous "bottom" row to top since we're moving down a row
        // add duplicate indices to transition between rows:
        indices.push(top[cols - 1]); // add last in top row
        indices.push(top[0]); // add first in top row
        
        

        // get bottom row index values
        ind = top[0] - cols; // starting at first in bottom row
        for (var i = 0; i < cols; i++) {
            bottom[i] = ind; // assign and increment
            ind++;
        }

        // put current "top" and "bottom" rows in array, alternating as before with first two rows
        for (var i = 0; i < cols; i++) {
            indices.push(top[i]);
            indices.push(bottom[i]);
        }

    }

    return indices;
}

animate(0);




/*
function rotateModel(vertices, theta, direction) {
    var c = Math.cos(theta);
    var s = Math.sin(theta);
    var R;
    if (direction[0] == 1) { // X rotation
        R = [1, 0, 0, 0,
            0, c, -s, 0,
            0, s, c, 0,
            0, 0, 0, 1];
    } else if (direction[1] == 1) { // Y rotation
        R = [c, 0, s, 0,
            0, 1, 0, 0,
            -s, 0, c, 0,
            0, 0, 0, 1];
    } else if (direction[2] == 1) { // Z rotation
        R = [c, -s, 0, 0,
            s, c, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1];
    } else return;

    for (var i = 0; i < control.length; i += 3) {
        var point = [vertices[i], vertices[i + 1], vertices[i + 2], 1];
        var newPoint = mat4.multiplyVec4(R, point)
        vertices[i] = newPoint[0];
        vertices[i + 1] = newPoint[1];
        vertices[1 + 2] = newPoint[2];
    }
}
*/