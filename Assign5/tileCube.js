var camera, scene, renderer;
var geometry, mesh;

var colors = [
    1, 0, 0,    //red
    0, 0, 1,    //blue
    0, 1, 0,    //green
    1, 1, 0,    //yellow
    1, .65, 0,  //orange
    1, 1, 1     //white
];

var shaderMaterial = new THREE.ShaderMaterial({
    vertexShader: document.getElementById('vertex-shader').innerHTML,
    fragmentShader: document.getElementById('fragment-shader').innerHTML
});

var P = [0, 0, 0];  // P: startPosition (front bottom left corner)
var L = 20;         // L: cube length
var N = 4;          // N: number of checker tiles per row/column
var T = L / N       // T: tile length

/*               L                          N = 4
           +-----------+             ____ ____ ____ ____
        L /|          /|          / |    |    |    |    |L/4
         / |         / |         /  |____|____|____|____|
        +-----------+  | L      /   |    |    |    |    |L/4
        |  |        |  |   ____/    |____|____|____|____|
      L |  +--------|--+       \    |    |    |    |    |L/4
        | /         | /         \   |____|____|____|____|
        |/          |/ L         \  |    |    |    |    |L/4
       (+)----------+             \ |____|____|____|____|
      P       L                      L/4  L/4  L/4  L/4         */

var numPosElements = (N * N * 2 * 3 * 3 * 6);
var positions = new Float32Array(numPosElements);   // cube vertices
var shaderColor = new Float32Array(numPosElements); // vertex colors to pass to fragments

function addTileVertices() {
    var i = 0;
        // front face
    for (var r = 0; r <= N; r++) {
        for (var c = 0; c <= N; c++) {
            positions[i] = P[0] + c * T;
            positions[i + 1] = P[1] + r * T;
            positions[i + 2] = P[2];
            i += 3;
        }
    }    // back face
    for (var r = 0; r <= N; r++) {        
        for (var c = 0; c <= N; c++) {
            positions[i] = P[0] + L - c * T;
            positions[i + 1] = P[1] + r * T;
            positions[i + 2] = P[2] - L;
            i += 3;
        }
    }    // left face
    for (var r = 0; r <= N; r++) {       
        for (var c = 0; c <= N; c++) {
            positions[i] = P[0];
            positions[i + 1] = P[1] + r * T;
            positions[i + 2] = P[2] - L + c * T;
            i += 3;
        }
    }   // right face
    for (var r = 0; r <= N; r++) {       
        for (var c = 0; c <= N; c++) {
            positions[i] = P[0] + L;
            positions[i + 1] = P[1] + r * T;
            positions[i + 2] = P[2] - c * T;
            i += 3;
        }
    }   // top face
    for (var r = 0; r <= N; r++) {       
        for (var c = 0; c <= N; c++) {
            positions[i] = P[0] + c * T;
            positions[i + 1] = P[1] + L;
            positions[i + 2] = P[2] - r * T;
            i += 3;
        }
    }   // bottom face
    for (var r = 0; r <= N; r++) {       
        for (var c = 0; c <= N; c++) {
            positions[i] = P[0] + c * T;
            positions[i + 1] = P[1];
            positions[i + 2] = P[2] - L + r * T;
            i += 3;
        }
    }
    geometry.addAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    
}

function getGeometry() {
    addTileVertices();
    var indices = [];
    var k = 0;
    var s = 0;
    var firstInRow = 0;
    var pointsPerFace = (N + 1) * (N + 1);
    for (f = 0; f < 6; f++) {
        for (var r = 0; r < N; r++) {
            for (var c = 0; c < N; c++) {
                if (c == 0) {
                    firstInRow += 3;
                    k = firstInRow;
                }
                var nextColor = k % colors.length;
                var i = f * pointsPerFace + r * (N + 1) + c;

                indices.push(i, i + 1, i + 1 + N);
                i++;

                indices.push(i + N, i, i + 1 + N);

                for (var j = 0; j < 6; j++) {
                    shaderColor[s] = colors[nextColor];
                    shaderColor[s + 1] = colors[nextColor + 1];
                    shaderColor[s + 2] = colors[nextColor + 2];
                    s += 3;
                }


                k += 3;
                k %= colors.length;
            }
        }
    }
    geometry.setIndex(indices);
    geometry = geometry.toNonIndexed();
    geometry.addAttribute('color', new THREE.Float32BufferAttribute(shaderColor, 3));
}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}


function init() {

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
    camera.position.z = 50;
    scene = new THREE.Scene();

    geometry = new THREE.BufferGeometry();
    getGeometry();
    geometry.computeFaceNormals();

    mesh = new THREE.Mesh(geometry, shaderMaterial);
    scene.add(mesh);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

}

var animate = function () {
    requestAnimationFrame(animate);

    mesh.rotation.x += 0.01;
    mesh.rotation.y += 0.02;

    renderer.render(scene, camera);
}

init();
animate();