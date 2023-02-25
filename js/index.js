import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

var canvas = document.getElementById("floorplanner-canvas");
var viewTab = document.getElementById("viewTabBtn");
var viewDisplay = document.getElementById("view");
var undoButton = document.getElementById("undoBtn");
var exportBtn = document.getElementById("exportBtn");
var ctx = canvas.getContext("2d");
var gridSpacing = 10;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var gridSize = Math.floor(canvas.width / gridSpacing);

var lines = [];

const floorplan = {
  corners: [],
  walls: [],
  floorTextures: {}
};

document.addEventListener("keydown", function (event) {
  if ((event.ctrlKey || event.metaKey) && event.which === 90) {
    undo();
    event.preventDefault(); // Prevent the default action (e.g. undoing text) from occurring
  }
});

viewTab.addEventListener("click", () => {
  setup3dView();
});

undoButton.addEventListener("click", () => {
  undo();
});

exportBtn.addEventListener("click", () => {
  convertLinesToFloorPlan();
});

canvas.addEventListener("mousedown", handleMouseDown);
canvas.addEventListener("mouseup", handleMouseUp);

function undo() {
  lines.pop();
  redraw();
}

function convertLinesToFloorPlan() {
  // Convert each line to a wall and add its corners to the floorplan
  for (const line of lines) {
    const corner1Index = addCorner(line.start.x, line.start.y);
    const corner2Index = addCorner(line.end.x, line.end.y);
    floorplan.walls.push({ corner1: corner1Index, corner2: corner2Index });
  }
  console.log(floorplan)
}

function handleMouseDown(event) {
  var x = event.offsetX;
  var y = event.offsetY;
  var snapped = snapToGrid(x, y);
  if (!snapped) return;
  var startPoint = { x: snapped.x, y: snapped.y };
  var endPoint = { x: snapped.x, y: snapped.y };
  var line = { start: startPoint, end: endPoint, color: "black" };
  lines.push(line);
  canvas.addEventListener("mousemove", handleMouseMove);
}

function handleMouseMove(event) {
  var x = event.offsetX;
  var y = event.offsetY;
  var snapped = snapToGrid(x, y);
  if (!snapped) return;
  var line = lines[lines.length - 1];
  line.end.x = snapped.x;
  line.end.y = snapped.y;
  redraw();
}

function handleMouseUp(event) {
  canvas.removeEventListener("mousemove", handleMouseMove);
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  lines.forEach(function (line) {
    ctx.strokeStyle = line.color;
    ctx.beginPath();
    ctx.moveTo(line.start.x, line.start.y);
    ctx.lineTo(line.end.x, line.end.y);
    ctx.stroke();

    // Draw circles at start and end points
    ctx.fillStyle = "blue";
    ctx.beginPath();
    ctx.arc(line.start.x, line.start.y, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(line.end.x, line.end.y, 5, 0, 2 * Math.PI);
    ctx.fill();

    // calculate length of line
    var length = Math.sqrt(Math.pow(line.end.x - line.start.x, 2) + Math.pow(line.end.y - line.start.y, 2));
    // draw length next to line
    ctx.fillStyle = line.color;
    ctx.font = "12px Arial";
    ctx.fillText(length.toFixed(2), (line.start.x + line.end.x) / 2, (line.start.y + line.end.y) / 2);
  });
}

function drawGrid() {
  ctx.strokeStyle = "gray";
  for (var i = 0; i <= gridSize; i++) {
    var x = i * gridSpacing;
    var y = i * gridSpacing;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function snapToGrid(x, y) {
  var snappedX = Math.floor(x / gridSpacing) * gridSpacing;
  var snappedY = Math.floor(y / gridSpacing) * gridSpacing;
  if (
    snappedX >= 0 &&
    snappedX <= canvas.width &&
    snappedY >= 0 &&
    snappedY <= canvas.height
  ) {
    return { x: snappedX, y: snappedY };
  } else {
    return null;
  }
}

// Define a helper function to add a corner to the floorplan
function addCorner(x, y) {
  // Check if a corner with the same coordinates already exists
  const existingCornerIndex = floorplan.corners.findIndex((corner) => {
    return corner.x === x && corner.y === y;
  });

  if (existingCornerIndex !== -1) {
    return existingCornerIndex;
  }

  // Add the new corner and return its index
  const newCorner = { x, y };
  floorplan.corners.push(newCorner);
  return floorplan.corners.length - 1;
}

drawGrid();

// 3d view setup
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  1,
  10000
);

// Create a new instance of OrbitControls and pass in the camera and renderer
const controls = new OrbitControls(camera, renderer.domElement);
controls.listenToKeyEvents(window);
controls.maxPolarAngle = Math.PI / 2;
controls.update();

// Add zoom and pan button controls
// const zoomFactor = 20;

// document.getElementById("zoomIn").addEventListener("click", () => {
//     camera.position.x -= zoomFactor;
//     camera.position.y -= zoomFactor;
//     camera.position.z -= zoomFactor;
// });

// document.getElementById("zoomOut").addEventListener("click", () => {
//     camera.position.x += zoomFactor;
//     camera.position.y += zoomFactor;
//     camera.position.z += zoomFactor;
// });


function init() {
  camera.position.set(400, 400, 400);
  camera.lookAt(0, 0, 0);
  animate();
}

// Render Loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.setClearColor(0xeeeeee, 1);
  renderer.render(scene, camera);
}

function setup3dView() {
  scene.remove.apply(scene, scene.children);
  convertLinesToFloorPlan();
  viewDisplay.appendChild(renderer.domElement);

  // Find the center point of the floorplan
  const xValues = floorplan.corners.reduce(
    (acc, corner) => {
      if (corner.x < acc.min) {
        acc.min = corner.x;
      }
      if (corner.x > acc.max) {
        acc.max = corner.x;
      }
      return acc;
    },
    { min: Infinity, max: -Infinity }
  );
  const yValues = floorplan.corners.reduce(
    (acc, corner) => {
      if (corner.y < acc.min) {
        acc.min = corner.y;
      }
      if (corner.y > acc.max) {
        acc.max = corner.y;
      }
      return acc;
    },
    { min: Infinity, max: -Infinity }
  );
  const centerX = (xValues.min + xValues.max) / 2;
  const centerY = (yValues.min + yValues.max) / 2;

  // Create walls
  const wallMaterial = new THREE.MeshBasicMaterial({ color: 0xF0EADC });
  const wallOutlineMaterial = new THREE.MeshBasicMaterial({ color: 0xdddddd, side: THREE.BackSide });
  const walls = [];

  for (let i = 0; i < floorplan.walls.length; i++) {
    const wall = floorplan.walls[i];
    const corner1 = floorplan.corners[wall.corner1];
    const corner2 = floorplan.corners[wall.corner2];
    const dx = corner2.x - corner1.x;
    const dy = corner2.y - corner1.y;
    const width = Math.sqrt(dx * dx + dy * dy);
    const wallGeometry = new THREE.BoxGeometry(10, 100, width);
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    wallMesh.position.x = ((corner1.x + corner2.x) / 2) - centerX;
    wallMesh.position.y = 0;
    wallMesh.position.z = ((corner1.y + corner2.y) / 2) - centerY;
    wallMesh.rotation.y = Math.atan2(dx, dy);
    walls.push(wallMesh);
    scene.add(wallMesh);

    const wallOutlineGeometry = new THREE.BoxGeometry(10 + 2, 100 + 2, width + 2);
    const wallOutlineMesh = new THREE.Mesh(wallOutlineGeometry, wallOutlineMaterial);
    wallOutlineMesh.position.copy(wallMesh.position);
    wallOutlineMesh.rotation.copy(wallMesh.rotation);
    scene.add(wallOutlineMesh);
  }

  // Create pillar material and geometry
  const pillarMaterial = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
  const pillarGeometry = new THREE.BoxGeometry(10, 100, 10);

  // Create pillars at corners
  const pillars = [];

  for (let i = 0; i < floorplan.corners.length; i++) {
    const corner = floorplan.corners[i];
    const pillarMesh = new THREE.Mesh(pillarGeometry, pillarMaterial);
    pillarMesh.position.x = corner.x - centerX;
    pillarMesh.position.y = 0;
    pillarMesh.position.z = corner.y - centerY;
    pillars.push(pillarMesh);
    scene.add(pillarMesh);
  }

  // Create floor
  const floorTexture = new THREE.TextureLoader().load("textures/hardwood.png");
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(1, 1);
  var floorMaterial = new THREE.MeshPhongMaterial({
    map: floorTexture,
    side: THREE.DoubleSide,
    // ambient: 0xffffff, TODO_Ekki
    color: 0xcccccc,
    specular: 0x0a0a0a
  });
  var textureScale = 400;
  var points = [];
  var temp = [
    { x: 0, y: 0 },
    { x: 400, y: 0 },
    { x: 400, y: 400 },
    { x: 0, y: 400 }
  ]
  temp.forEach((corner) => {
    points.push(new THREE.Vector2(
      corner.x / textureScale,
      corner.y / textureScale));
  });
  var shape = new THREE.Shape(points);

  var geometry = new THREE.ShapeGeometry(shape);

  var floor = new THREE.Mesh(geometry, floorMaterial);

  floor.rotation.set(Math.PI / 2, 0, 0);
  floor.position.y = -50;
  floor.position.x = -200;
  floor.position.z = -200;
  floor.scale.set(textureScale, textureScale, textureScale);
  floor.receiveShadow = true;
  floor.castShadow = false;

  // const floorGeometry = new THREE.PlaneGeometry(1000, 1000);
  // const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
  // floorMesh.rotation.x = -Math.PI / 2;
  // floorMesh.position.y = -1;
  scene.add(floor);

  // Create ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  // Create directional light
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  init();
}