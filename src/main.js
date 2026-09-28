import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PlayroomEnvironment } from './environment/PlayroomEnvironment.js';
import confetti from 'canvas-confetti';
import { sounds } from './audio.js';
import { LEGO_COLORS, BRICK_TYPES, createPlasticMaterial } from './legoGeometry.js';
import { loadTrainModel, createGhostStepPreview, createLegoEdgeLines } from './trainLoader.js';
import { PiecePreviewViewer, thumbnailGenerator, generatePieceThumbnail } from './piecePreview.js';
import { SteamParticleSystem } from './steamParticles.js';
import { occupancyGrid } from './occupancyGrid.js';
import { physicsWorld } from './physicsWorld.js';
import { BrickWorldManager } from './brickWorldManager.js';
import { SceneManager, isPointerOverTray, TitleScreen } from './sceneManager.js';
import { ASSEMBLY_STAGES, TOTAL_STAGED_PARTS, SNAP_DISTANCE, setupCardDragListener, quantizeGridPosition, STUD_PITCH, PLATE_HEIGHT, BASEPLATE_STUDS, BASEPLATE_SIZE, LEOCAD_CATEGORIES, LEOCAD_CAMERA_CONFIG, TURNTABLE_INSPECT_CONFIG, updateBuildProgress, setupCameraDockControls, getNextRotation90, getActiveStepPieces, decrementCardBadge } from './app.js';
import { HomeScreen } from './home/HomeScreen.js';

// --- State Management ---
const state = {
  currentScreen: 'home', // 'home' | 'builder'
  mode: 'train', // 'train' (Toy Workshop) | 'builder' (Free Play) | 'drive' (Drive Train)
  buildFlow: 'freepick', // 'guided' | 'freepick'
  currentStage: 1, // 1 to 4: 4 Staged Bags (Wheels, Chassis, Cab, Roof)

  // Step-by-Step Train Builder State (42 Granular Physical Steps)
  trainData: null,
  isTrainLoaded: false,
  selectedStepIndex: 0, // 0 to 41
  selectedCategory: 'bricks', // 'bricks' | 'wheels' | 'special' | 'favorites'
  builtSteps: new Set(),
  ghostGuideEnabled: false, // Turned OFF by default: Player follows Blueprint card!
  stageGhostGroup: null,
  isTrainComplete: false,
  autoBuildInterval: null,
  activeAnimations: [],
  squashAnimations: [],

  // LeoCAD Freeform 3D Placement & Dragging
  isInspectViewActive: false,
  activeDraggedPiece: null,
  selectedPlacedBrick: null,

  // Tactile Drag, Orientation & Snap State
  isDragging: false,
  draggedStepIndex: null,
  draggingPieceGroup: null,
  hoverPlane: null,
  inSnapZone: false,
  isRotationAligned: false,
  isDraggedColliding: false, // 3D Occupancy collision state
  pointerDownScreenPos: { x: 0, y: 0 },
  isPointerDownOnCard: false,
  dragCurrentWorldPos: new THREE.Vector3(), // Surface raycasted world position
  dragRotationY: 0, // Active drag piece Y rotation (0, PI/2, PI, 3PI/2)
  activeTouches: {}, // Multi-touch tracking for second-finger rotate
  lastTwoFingerTouchCount: 0,
  lastScrapeTime: 0, // Throttling for high-frequency plastic friction scrape
  hintActive: false,
  hintTimeout: null,

  // Free Builder State
  selectedPiece: 'brick-2x4',
  selectedColor: 'red',
  pieceRotation: 0, // Always in 90° steps (0, PI/2, PI, 3PI/2)
  isDemolishMode: false,
  placedBricks: [],
  undoStack: [],

  // Drive Mode State
  driveSpeed: 0,
  targetSpeed: 0,
  trainZ: 0,
  followCamera: false,
  soundMuted: false
};

// --- Scene, Camera, Renderer ---
const container = document.getElementById('canvas-container');
function createWarmValleyHorizonSky() {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#38bdf8'); // Saturated sunny sky blue
  grad.addColorStop(0.42, '#bae6fd'); // Crisp daylight blue
  grad.addColorStop(0.68, '#fef08a'); // Warm sunny horizon glow
  grad.addColorStop(0.84, '#fed7aa'); // Soft apricot valley horizon
  grad.addColorStop(1.0, '#e2e8f0'); // Neutral studio floor horizon
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, 512);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

const scene = new THREE.Scene();

// 2. ATMOSPHERIC WARM PLAYROOM ROOM AMBIENCE & BLEND FOG:
const bgPlayroom = 0xf5ede2;
scene.background = new THREE.Color(bgPlayroom);
scene.fog = new THREE.Fog(bgPlayroom, 35, 95);

// 6. ISOMETRIC CAMERA POSITION & ORBIT LIMITS:
const INITIAL_CAMERA_POS = new THREE.Vector3(0, 5.0, 8.5);
const INITIAL_CAMERA_TARGET = new THREE.Vector3(0, 0.4, 0);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.copy(INITIAL_CAMERA_POS);
camera.lookAt(INITIAL_CAMERA_TARGET);
camera.updateProjectionMatrix();

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
container.appendChild(renderer.domElement);

// --- Orbit Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.copy(INITIAL_CAMERA_TARGET);
controls.minPolarAngle = Math.PI / 6;   // ~30°
controls.maxPolarAngle = Math.PI / 2.3; // ~78°
controls.minAzimuthAngle = -Math.PI / 1.8; // Limits orbit to front ~160°
controls.maxAzimuthAngle = Math.PI / 1.8;
controls.minDistance = 4.0;
controls.maxDistance = 25.0; // Full zoom out across room diorama
controls.update();
controls.autoRotate = false;
controls.autoRotateSpeed = 2.0;
controls.addEventListener('start', () => {
  if (!state.isTrainComplete) {
    controls.autoRotate = false;
  }
});

// Workshop 3D camera controls enabled
controls.enabled = true;

if (typeof window !== 'undefined') {
  window.__scene = scene;
  window.__controls = controls;
  window.__camera = camera;
}

// ── Turntable Inspect View & Smooth Camera Animation (Requirements) ───────────
let cameraTweenAnimId = null;

export function animateCameraTo(endPos, endTarget, duration = 600, onComplete) {
  if (cameraTweenAnimId) {
    cancelAnimationFrame(cameraTweenAnimId);
    cameraTweenAnimId = null;
  }

  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / duration);
    // Smooth easeInOutCubic curve
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    camera.position.lerpVectors(startPos, endPos, ease);
    controls.target.lerpVectors(startTarget, endTarget, ease);
    controls.update();

    if (t < 1) {
      cameraTweenAnimId = requestAnimationFrame(step);
    } else {
      camera.position.copy(endPos);
      controls.target.copy(endTarget);
      controls.update();
      cameraTweenAnimId = null;
      if (onComplete) onComplete();
    }
  }
  cameraTweenAnimId = requestAnimationFrame(step);
}

export function smoothResetCamera(duration = 450, onComplete) {
  animateCameraTo(INITIAL_CAMERA_POS, INITIAL_CAMERA_TARGET, duration, onComplete);
}

export function setTrainAssemblyShowcaseMode(showComplete) {
  isTrainShowcaseMode = showComplete;
  if (!state.trainData || !state.trainData.steps) return;
  state.trainData.steps.forEach((step, idx) => {
    const isVisible = showComplete ? true : state.builtSteps.has(idx);
    step.meshes.forEach((m) => {
      m.visible = isVisible;
    });
  });
}

export function setCameraInspectMode(active, skipTween = false) {
  state.isInspectViewActive = !!active;
  const btn = document.getElementById('btn-camera-swing');

  if (state.isInspectViewActive) {
    // When toggled ON (Active):
    if (btn) {
      btn.classList.add('active');
      btn.innerHTML = '🔒 Lock Angle';
      btn.setAttribute('title', 'Click to lock camera angle and return to isometric build view');
    }
    document.body.classList.add('inspect-view-active');

    // - controls.enabled = true
    controls.enabled = true;
    controls.enableZoom = true;
    controls.minDistance = 4.0;
    controls.maxDistance = 25.0;
    controls.enablePan = false;
    controls.minPolarAngle = Math.PI / 6;
    controls.maxPolarAngle = Math.PI / 2.3;
    controls.target.set(0, 0.4, 0);
    controls.update();

    showToast('🎥 Swing view active (drag horizontally to rotate angle, pinch/wheel to zoom)');
  } else {
    // When toggled OFF:
    if (btn) {
      btn.classList.remove('active');
      btn.innerHTML = '🎥 Swing View';
      btn.setAttribute('title', 'Click to unlock turntable camera rotation');
    }
    document.body.classList.remove('inspect-view-active');

    // - controls.enabled = false
    controls.enabled = false;

    // - Smoothly tween or reset camera back to calibrated playroom perspective:
    if (skipTween) {
      camera.position.set(0, 5.0, 8.5);
      controls.target.set(0, 0.4, 0);
      controls.update();
    } else {
      smoothResetCamera(450);
    }
    showToast('🔒 Camera locked to playroom build view');
  }
}

// Requirement 3: Initialize 4-button camera dock controls
setupCameraDockControls(camera, controls, THREE);

document.getElementById('btn-camera-swing')?.addEventListener('click', (e) => {
  e.preventDefault();
  setCameraInspectMode(!state.isInspectViewActive);
});

// 5. Environment lighting and arched window sunbeams are managed by PlayroomEnvironment / EnvironmentLights

// --- Active Ground Drop Shadow Projector for Dragged Piece ---
function createDropShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  gradient.addColorStop(0, 'rgba(8, 16, 24, 0.72)');
  gradient.addColorStop(0.35, 'rgba(10, 20, 30, 0.42)');
  gradient.addColorStop(0.7, 'rgba(15, 25, 35, 0.12)');
  gradient.addColorStop(1, 'rgba(20, 30, 40, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

const dropShadowTex = createDropShadowTexture();
const dragDropShadow = new THREE.Mesh(
  new THREE.PlaneGeometry(3.6, 3.6),
  new THREE.MeshBasicMaterial({
    map: dropShadowTex,
    transparent: true,
    opacity: 0,
    depthWrite: false
  })
);
dragDropShadow.rotation.x = -Math.PI / 2;
dragDropShadow.visible = false;
dragDropShadow.renderOrder = 3;
scene.add(dragDropShadow);

function updateDropShadow(piecePos, surfaceY) {
  dragDropShadow.position.x = piecePos.x;
  dragDropShadow.position.z = piecePos.z;
  dragDropShadow.position.y = surfaceY + 0.025;
  const heightAboveGround = Math.max(0, piecePos.y - surfaceY);
  const t = Math.min(1, heightAboveGround / 3.5);
  const scale = 0.85 + t * 0.55;
  dragDropShadow.scale.set(scale, scale, 1);
  dragDropShadow.material.opacity = (1 - t * 0.48) * 0.55;
  dragDropShadow.visible = true;
}


// --- Stud Engagement & Target Highlight Group (Requirement 2: Visual Clutch) ---
const studHighlightGroup = new THREE.Group();
studHighlightGroup.name = 'stud-highlight-group';
studHighlightGroup.visible = false;
scene.add(studHighlightGroup);

const MAX_STUD_HIGHLIGHTS = 16;
const studRingGeom = new THREE.RingGeometry(0.14, 0.28, 24);
studRingGeom.rotateX(-Math.PI / 2); // Lay flat on XZ plane
const studRingMat = new THREE.MeshBasicMaterial({
  color: 0x22c55e, // Vibrant soft green
  transparent: true,
  opacity: 0.85,
  side: THREE.DoubleSide,
  depthWrite: false
});
const studDotGeom = new THREE.CircleGeometry(0.11, 16);
studDotGeom.rotateX(-Math.PI / 2);
const studDotMat = new THREE.MeshBasicMaterial({
  color: 0x4ade80,
  transparent: true,
  opacity: 0.45,
  side: THREE.DoubleSide,
  depthWrite: false
});

const studHighlightMeshes = [];
for (let s = 0; s < MAX_STUD_HIGHLIGHTS; s++) {
  const hGroup = new THREE.Group();
  const ring = new THREE.Mesh(studRingGeom, studRingMat.clone());
  const dot = new THREE.Mesh(studDotGeom, studDotMat.clone());
  hGroup.add(ring);
  hGroup.add(dot);
  hGroup.visible = false;
  studHighlightGroup.add(hGroup);
  studHighlightMeshes.push({ group: hGroup, ring, dot });
}

// Function to project and position soft green rings on receiving connection studs under target piece
function updateReceivingStudHighlights(stepData) {
  if (!stepData || !stepData.box) {
    studHighlightGroup.visible = false;
    return;
  }

  const box = stepData.box;
  // Receiving surface height is right under the component
  const studY = box.min.y + 0.02;

  const spanX = Math.max(0.6, box.max.x - box.min.x);
  const spanZ = Math.max(0.6, box.max.z - box.min.z);

  const countX = Math.min(3, Math.max(2, Math.round(spanX / 0.8)));
  const countZ = Math.min(4, Math.max(2, Math.round(spanZ / 0.8)));

  const stepX = spanX / (countX + 1);
  const stepZ = spanZ / (countZ + 1);

  let studIdx = 0;
  for (let ix = 1; ix <= countX; ix++) {
    for (let iz = 1; iz <= countZ; iz++) {
      if (studIdx < MAX_STUD_HIGHLIGHTS) {
        const posX = box.min.x + ix * stepX;
        const posZ = box.min.z + iz * stepZ;
        const item = studHighlightMeshes[studIdx];
        item.group.position.set(posX, studY, posZ);
        item.group.visible = true;
        studIdx++;
      }
    }
  }

  for (let s = studIdx; s < MAX_STUD_HIGHLIGHTS; s++) {
    studHighlightMeshes[s].group.visible = false;
  }

  studHighlightGroup.visible = true;
}

// --- Ghost Container Group (Requirements 1 & 2) ---
// Dedicated container for ghost guide outlines, guide arrows, and rings.
// Defaulted to visible = false so scene is completely clean of any unbuilt towering or floating ghost structure!
const ghostContainer = new THREE.Group();
ghostContainer.name = 'ghost-container';
ghostContainer.visible = false;
scene.add(ghostContainer);

// --- Steam Particles ---
const steamParticles = new SteamParticleSystem(scene);

// --- Pure Brick Engine Architecture (Unified State Machine) ---
const brickWorldManager = new BrickWorldManager(scene, physicsWorld.world, sounds, steamParticles);

// --- Kid-Friendly Tactile Assembly Scene Manager (Beacons, Particles, Bounces) ---
const sceneManager = new SceneManager(scene, camera);
if (typeof window !== 'undefined') {
  window.__sceneManager = sceneManager;
  window.__state = state;
}

// --- 3D Piece Previewer in UI ---
let piecePreviewViewer = null;

// --- Transparent Shadow Floor & Railroad Track ---
export let baseplateMesh = null;
export const raycastSurfaces = [];
export const allOtherSceneBricks = [];
state.placedBricks = allOtherSceneBricks;

const baseplateGroup = new THREE.Group();
baseplateGroup.name = 'baseplate-group';
scene.add(baseplateGroup);

function createBaseplateAndTracks() {
  const half = BASEPLATE_SIZE / 2;

  // 1. Remove previous baseplate mesh if present
  if (baseplateMesh) {
    scene.remove(baseplateMesh);
    baseplateGroup.remove(baseplateMesh);
  }

  // 2. BUILD NATIVE THREE.JS / WEBGL PLAYROOM ENVIRONMENT:
  const playroomEnv = sceneManager.setupPlayroomEnvironment(scene, camera, controls, null, renderer);
  baseplateMesh = playroomEnv.getBuildContactMesh();
  if (baseplateMesh) {
    baseplateGroup.add(baseplateMesh);
    sceneManager.setBaseplate(baseplateMesh);
    raycastSurfaces.length = 0;
    raycastSurfaces.push(baseplateMesh);
  }

  // 4. TRACK ELEVATION & FLUSH GROUNDING:
  // Ensure the track group sits directly on top of the floor mesh at y = 0:
  const trackGroup = new THREE.Group();
  trackGroup.name = 'railroad-track';
  trackGroup.position.set(0, 0, 0);
  trackGroup.rotation.set(0, 0, 0);
  trackGroup.scale.set(1, 1, 1);

  const TRACK_LENGTH = 16.0;
  const halfTrack = TRACK_LENGTH / 2;

  const railGeom = new THREE.BoxGeometry(0.18, 0.28, TRACK_LENGTH);
  const railMat = new THREE.MeshStandardMaterial({
    color: 0x8a9299,
    roughness: 0.2,
    metalness: 0.7
  });

  const railEdgeGeom = new THREE.EdgesGeometry(railGeom);
  const railEdgeMat = new THREE.LineBasicMaterial({ color: 0x55606d, transparent: true, opacity: 0.6, depthWrite: false });

  const leftRail = new THREE.Mesh(railGeom, railMat);
  leftRail.position.set(-1.50, 0.14, 0);
  leftRail.castShadow = true;
  leftRail.receiveShadow = true;
  leftRail.add(new THREE.LineSegments(railEdgeGeom, railEdgeMat));
  trackGroup.add(leftRail);

  const rightRail = new THREE.Mesh(railGeom, railMat);
  rightRail.position.set(1.50, 0.14, 0);
  rightRail.castShadow = true;
  rightRail.receiveShadow = true;
  rightRail.add(new THREE.LineSegments(railEdgeGeom, railEdgeMat));
  trackGroup.add(rightRail);

  const tieGeom = new THREE.BoxGeometry(3.6, 0.12, 0.45);
  const tieMat = new THREE.MeshStandardMaterial({
    color: 0x483220,
    roughness: 0.7,
    metalness: 0.05
  });
  const tieEdgeGeom = new THREE.EdgesGeometry(tieGeom);
  const tieEdgeMat = new THREE.LineBasicMaterial({ color: 0x7a5b42, transparent: true, opacity: 0.65, depthWrite: false });

  for (let z = -halfTrack + 0.8; z <= halfTrack - 0.8; z += 1.4) {
    const tie = new THREE.Mesh(tieGeom, tieMat);
    tie.position.set(0, 0.06, z);
    tie.castShadow = true;
    tie.receiveShadow = true;
    tie.add(new THREE.LineSegments(tieEdgeGeom, tieEdgeMat));
    trackGroup.add(tie);
  }

  trackGroup.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  baseplateGroup.add(trackGroup);
}
createBaseplateAndTracks();

// =========================================================
// 3. SUBTLE TRACK CHASSIS "BUILD MAT" (Gentle Guidance)
// =========================================================
let trainBuildMatGroup = null;

function createTrainBuildMat() {
  trainBuildMatGroup = new THREE.Group();
  trainBuildMatGroup.name = 'train-chassis-build-mat';
  trainBuildMatGroup.position.set(0, 0, 0);
  trainBuildMatGroup.rotation.set(0, 0, 0);
  trainBuildMatGroup.scale.set(1, 1, 1);

  const halfWidth = 1.68;
  const halfLength = 5.8;
  const matY = 0.29; // 0.01 above rail top surface (0.28)

  // 1. Soft, translucent guidance build mat floor
  const bedGeom = new THREE.PlaneGeometry(halfWidth * 2, halfLength * 2);
  const bedMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.06,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const bedMesh = new THREE.Mesh(bedGeom, bedMat);
  bedMesh.rotation.x = -Math.PI / 2;
  bedMesh.position.set(0, matY - 0.005, 0);
  trainBuildMatGroup.add(bedMesh);

  // 2. Soft dashed bounding box outlining the train chassis perimeter
  const outerPoints = [
    new THREE.Vector3(-halfWidth, matY, -halfLength),
    new THREE.Vector3(halfWidth, matY, -halfLength),
    new THREE.Vector3(halfWidth, matY, halfLength),
    new THREE.Vector3(-halfWidth, matY, halfLength),
    new THREE.Vector3(-halfWidth, matY, -halfLength)
  ];
  const outerGeom = new THREE.BufferGeometry().setFromPoints(outerPoints);
  const dashedMat = new THREE.LineDashedMaterial({
    color: 0xffffff,
    dashSize: 0.35,
    gapSize: 0.22,
    transparent: true,
    opacity: 0.72,
    depthWrite: false
  });
  const outerBoxLine = new THREE.Line(outerGeom, dashedMat);
  outerBoxLine.computeLineDistances();
  trainBuildMatGroup.add(outerBoxLine);

  // 3. 4 track sections divider lines (at Z = -2.9, 0.0, +2.9)
  const dividerZ = [-2.9, 0.0, 2.9];
  dividerZ.forEach((zVal) => {
    const divPts = [
      new THREE.Vector3(-halfWidth, matY, zVal),
      new THREE.Vector3(halfWidth, matY, zVal)
    ];
    const divGeom = new THREE.BufferGeometry().setFromPoints(divPts);
    const divLine = new THREE.Line(divGeom, dashedMat.clone());
    divLine.computeLineDistances();
    trainBuildMatGroup.add(divLine);
  });

  // 4. Modern blueprint cyan corner brackets at the 4 outer corners
  const bracketLen = 0.45;
  const bracketMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.85,
    depthWrite: false
  });

  const cornerDefs = [
    // Top-left
    [[-halfWidth, matY, -halfLength + bracketLen], [-halfWidth, matY, -halfLength], [-halfWidth + bracketLen, matY, -halfLength]],
    // Top-right
    [[halfWidth - bracketLen, matY, -halfLength], [halfWidth, matY, -halfLength], [halfWidth, matY, -halfLength + bracketLen]],
    // Bottom-left
    [[-halfWidth, matY, halfLength - bracketLen], [-halfWidth, matY, halfLength], [-halfWidth + bracketLen, matY, halfLength]],
    // Bottom-right
    [[halfWidth - bracketLen, matY, halfLength], [halfWidth, matY, halfLength], [halfWidth, matY, halfLength - bracketLen]]
  ];

  cornerDefs.forEach((pts) => {
    const geom = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(...p)));
    const cornerLine = new THREE.Line(geom, bracketMat);
    trainBuildMatGroup.add(cornerLine);
  });

  // CRITICAL: Ensure none of the build mat elements intercept raycasting,
  // so pieces can be placed freely anywhere on the grass or track
  trainBuildMatGroup.traverse((child) => {
    child.raycast = () => {};
  });

  scene.add(trainBuildMatGroup);
}
createTrainBuildMat();

// --- Extended Scenic Railway for Drive Mode ---
const scenicRailwayGroup = new THREE.Group();
scenicRailwayGroup.name = 'scenic-railway-group';
scenicRailwayGroup.visible = false;
scene.add(scenicRailwayGroup);

function createExtendedScenicRailway() {
  const length = 130;
  const railGeom = new THREE.BoxGeometry(0.18, 0.28, length);
  const railMat = new THREE.MeshStandardMaterial({
    color: 0x8a9299,
    roughness: 0.2,
    metalness: 0.7
  });

  const leftRail = new THREE.Mesh(railGeom, railMat);
  leftRail.position.set(-1.50, 0.14, 0);
  scenicRailwayGroup.add(leftRail);

  const rightRail = new THREE.Mesh(railGeom, railMat);
  rightRail.position.set(1.50, 0.14, 0);
  scenicRailwayGroup.add(rightRail);

  const ballastGeom = new THREE.BoxGeometry(4.8, 0.14, length);
  const ballastMat = new THREE.MeshStandardMaterial({
    color: 0x484b50,
    roughness: 0.9,
    metalness: 0.05
  });
  const ballast = new THREE.Mesh(ballastGeom, ballastMat);
  ballast.position.set(0, -0.07, 0);
  ballast.receiveShadow = true;
  scenicRailwayGroup.add(ballast);

  const tieGeom = new THREE.BoxGeometry(3.6, 0.12, 0.45);
  const tieMat = new THREE.MeshStandardMaterial({
    color: 0x3d2817,
    roughness: 0.7,
    metalness: 0.05
  });

  for (let z = -length / 2 + 1; z <= length / 2 - 1; z += 1.4) {
    if (Math.abs(z) > 8.5) {
      const tie = new THREE.Mesh(tieGeom, tieMat);
      tie.position.set(0, 0.06, z);
      tie.receiveShadow = true;
      scenicRailwayGroup.add(tie);
    }
  }

  const trunkGeom = new THREE.CylinderGeometry(0.18, 0.22, 1.2, 8);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.8 });
  const fCone1 = new THREE.ConeGeometry(1.4, 1.6, 7);
  const fCone2 = new THREE.ConeGeometry(1.0, 1.3, 7);
  const pineMat = new THREE.MeshStandardMaterial({ color: 0x1d5e2a, roughness: 0.6 });

  for (let z = -50; z <= 50; z += 14) {
    if (Math.abs(z) < 11) continue;
    [-4.5, 4.5].forEach((xSide) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeom, trunkMat);
      trunk.position.y = 0.6;
      tree.add(trunk);

      const f1 = new THREE.Mesh(fCone1, pineMat);
      f1.position.y = 1.6;
      tree.add(f1);

      const f2 = new THREE.Mesh(fCone2, pineMat);
      f2.position.y = 2.4;
      tree.add(f2);

      tree.position.set(xSide + Math.sin(z) * 0.8, 0, z);
      scenicRailwayGroup.add(tree);
    });
  }

  [-24, 24].forEach((zPos) => {
    const post = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 2.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    pole.position.y = 1.4;
    post.add(pole);

    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.8 })
    );
    lamp.position.set(0, 2.6, 0.1);
    post.add(lamp);

    post.position.set(2.8, 0, zPos);
    scenicRailwayGroup.add(post);
  });
}
createExtendedScenicRailway();

// --- Interactive Home Screen System ---
const homeScreen = new HomeScreen({
  scene,
  camera,
  renderer,
  controls,
  sounds,
  onPlay: () => {
    transitionToBuilder();
  }
});
homeScreen.mount();

// --- Hybrid Title Screen Architecture (3D Depth Logo & Jelly Start Button) ---
export const titleScreen = sceneManager.setupTitleScreen({
  container: document.getElementById('title-screen-overlay'),
  canvas: document.getElementById('title-canvas'),
  startBtn: document.getElementById('start-btn'),
  assetPath: './assets/clackety_logo.glb',
  sounds,
  onStartBuilding: () => {
    transitionToBuilder();
  }
});
window.titleScreen = titleScreen;

// While starting on HomeScreen, hide workshop 3D elements initially
if (sceneManager.playroomEnv && sceneManager.playroomEnv.environmentGroup) {
  sceneManager.playroomEnv.environmentGroup.visible = false;
}
if (baseplateGroup) baseplateGroup.visible = false;
if (trainBuildMatGroup) trainBuildMatGroup.visible = false;
if (scenicRailwayGroup) scenicRailwayGroup.visible = false;

export function transitionToBuilder() {
  state.currentScreen = 'builder';
  if (titleScreen) titleScreen.hide();
  homeScreen.hide();

  // Show builder 3D groups
  if (sceneManager.playroomEnv && sceneManager.playroomEnv.environmentGroup) {
    sceneManager.playroomEnv.environmentGroup.visible = true;
  }
  if (baseplateGroup) baseplateGroup.visible = true;
  if (trainBuildMatGroup) trainBuildMatGroup.visible = true;
  if (scenicRailwayGroup) scenicRailwayGroup.visible = true;
  if (state.trainData && state.trainData.trainGroup) {
    state.trainData.trainGroup.visible = true;
  }

  // Show workshop UI
  const workshopUI = document.getElementById('workshop-ui-layer');
  if (workshopUI) {
    workshopUI.style.display = 'flex';
  }

  // Mount Bag 1 tray (Requirement 6)
  switchBag(1);

  // Transition the Three.js camera to the isometric playroom view (Requirement 6)
  animateCameraTo(INITIAL_CAMERA_POS, INITIAL_CAMERA_TARGET, 750, () => {
    controls.enabled = true;
  });

  showToast("🚂 Welcome to the Workshop! Let's build!");
}

export function transitionToHome() {
  state.currentScreen = 'home';
  controls.enabled = false;

  // Hide workshop UI
  const workshopUI = document.getElementById('workshop-ui-layer');
  if (workshopUI) {
    workshopUI.style.display = 'none';
  }

  // Hide builder 3D groups
  if (sceneManager.playroomEnv && sceneManager.playroomEnv.environmentGroup) {
    sceneManager.playroomEnv.environmentGroup.visible = false;
  }
  if (baseplateGroup) baseplateGroup.visible = false;
  if (trainBuildMatGroup) trainBuildMatGroup.visible = false;
  if (scenicRailwayGroup) scenicRailwayGroup.visible = false;
  if (state.trainData && state.trainData.trainGroup) {
    state.trainData.trainGroup.visible = false;
  }
  if (ghostContainer) ghostContainer.visible = false;
  if (studHighlightGroup) studHighlightGroup.visible = false;

  // Show Title Screen overlay & Home Screen
  if (titleScreen) titleScreen.show();
  homeScreen.show();
  animateCameraTo(homeScreen.homeCameraPos, homeScreen.homeCameraTarget, 650);
}

// --- Train Loading & Initial Setup ---
const loadingOverlay = document.getElementById('loading-overlay');
const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');

// Immediately render skeleton pulse loader in tray while GLB is loading
renderToyPartsTray();

loadTrainModel((percent) => {
  if (loadingBar) loadingBar.style.width = `${percent}%`;
  if (loadingText) loadingText.textContent = `Loading Brick Train (${percent}%)...`;
})
  .then((data) => {
    state.trainData = data;
    state.isTrainLoaded = true;
    state.trainAssemblyGroup = data.trainAssemblyGroup || data.trainGroup;
    window.trainAssemblyGroup = state.trainAssemblyGroup;
    scene.add(data.trainGroup);

    if (state.currentScreen === 'home') {
      data.trainGroup.visible = false;
    }

    // Pre-generate crisp 128x128 3D thumbnails for all physical steps
    if (data.steps) {
      data.steps.forEach((step) => {
        step.thumbnailUrl = generatePieceThumbnail(step);
      });
    }

    // Initialize 3D Mini Turntable in UI
    const previewCanvas = document.getElementById('mini-preview-canvas');
    if (previewCanvas) {
      piecePreviewViewer = new PiecePreviewViewer(previewCanvas);
    }

    // Populate Left Visual Piece Tray with re-rendered 3D thumbnails
    renderToyPartsTray();
    setupTrayCategoryTabs();

    // Select initial step (Step 1)
    selectStep(0);

    // Fade out loading screen
    setTimeout(() => {
      if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => (loadingOverlay.style.display = 'none'), 400);
      }
    }, 400);
  })
  .catch((err) => {
    console.error('Failed to load train model:', err);
    if (loadingText) loadingText.textContent = 'Error loading train.glb. Please refresh.';
  });

// =========================================================
// 1. WORKSHOP BLUEPRINT MANUAL & RUMMAGE TRAY SYSTEM
// =========================================================

export function getNextRequiredStep() {
  if (!state.trainData) return 0;
  for (let i = 0; i < state.trainData.steps.length; i++) {
    if (!state.builtSteps.has(i)) return i;
  }
  return state.trainData.steps.length - 1;
}

export function drawBlueprintDiagram(stepData) {
  const canvas = document.getElementById('blueprint-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Clear canvas
  ctx.fillStyle = '#091726';
  ctx.fillRect(0, 0, w, h);

  // Technical blueprint grid lines
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += 12) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  if (!stepData) return;

  const cx = w / 2;
  const cy = h / 2 + 3;
  const cat = stepData.category || 'bricks';

  ctx.save();
  ctx.strokeStyle = '#38bdf8';
  ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';

  if (cat === 'wheels') {
    // Wheel bogie chassis + dual wheels
    ctx.beginPath();
    ctx.rect(cx - 24, cy - 8, 48, 12);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx - 16, cy + 9, 9, 0, Math.PI * 2);
    ctx.arc(cx + 16, cy + 9, 9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx - 16, cy + 9, 3, 0, Math.PI * 2);
    ctx.arc(cx + 16, cy + 9, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (cat === 'round') {
    // Cylindrical boiler / dome / smokebox
    ctx.beginPath();
    ctx.ellipse(cx, cy - 10, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - 20, cy - 10);
    ctx.lineTo(cx - 20, cy + 10);
    ctx.ellipse(cx, cy + 10, 20, 8, 0, Math.PI, 0, true);
    ctx.lineTo(cx + 20, cy - 10);
    ctx.fill();
    ctx.stroke();

    // Top stud
    ctx.beginPath();
    ctx.ellipse(cx, cy - 13, 7, 3.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
  } else if (cat === 'slopes') {
    // 45° Roof slope
    ctx.beginPath();
    ctx.moveTo(cx - 24, cy + 13);
    ctx.lineTo(cx + 24, cy + 13);
    ctx.lineTo(cx + 24, cy - 3);
    ctx.lineTo(cx - 10, cy - 13);
    ctx.lineTo(cx - 24, cy - 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 13);
    ctx.lineTo(cx - 2, cy + 13);
    ctx.stroke();
  } else if (cat === 'special') {
    // Window frame / translucent glass
    ctx.beginPath();
    ctx.rect(cx - 20, cy - 15, 40, 30);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(cx - 14, cy - 10, 28, 20);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 6);
    ctx.lineTo(cx + 8, cy - 6);
    ctx.stroke();
  } else {
    // Standard Brick or Plate with studs
    const isPlate = cat === 'plates';
    const bh = isPlate ? 10 : 18;

    ctx.beginPath();
    ctx.rect(cx - 26, cy - bh / 2, 52, bh);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    const studCount = 4;
    const spacing = 42 / (studCount - 1);
    for (let i = 0; i < studCount; i++) {
      const sx = cx - 21 + i * spacing;
      ctx.beginPath();
      ctx.ellipse(sx, cy - bh / 2 - 2, 4, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // Dimension / Technical Annotation
  ctx.font = '700 8.5px monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(stepData.isSquareOrRound ? 'Ø SYM' : (stepData.targetRotationY === 0 ? 'ROT 0°' : 'ROT 90°'), 6, h - 5);
  ctx.fillText(`QTY x${stepData.quantity || 1}`, w - 38, h - 5);

  ctx.restore();
}

export function updateInstructionBooklet() {
  if (!state.trainData) return;
  const currentStageObj = ASSEMBLY_STAGES[state.currentStage - 1] || ASSEMBLY_STAGES[0];
  const reqStepIdx = currentStageObj.stepIndices.find((idx) => !state.builtSteps.has(idx)) ?? state.selectedStepIndex;
  const stepData = state.trainData.steps[reqStepIdx] || state.trainData.steps[state.selectedStepIndex];

  const stepNumEl = document.getElementById('booklet-step-num');
  const titleEl = document.getElementById('booklet-part-title');
  const descEl = document.getElementById('booklet-part-desc');

  const builtInStage = currentStageObj.stepIndices.filter((idx) => state.builtSteps.has(idx)).length;
  const totalBuilt = state.builtSteps.size;

  if (stepNumEl) {
    if (totalBuilt >= TOTAL_STAGED_PARTS) {
      stepNumEl.textContent = 'DONE!';
    } else {
      stepNumEl.textContent = `Bag ${currentStageObj.id}: Part ${builtInStage + 1} / ${currentStageObj.totalParts}`;
    }
  }

  if (titleEl && stepData) {
    titleEl.textContent = totalBuilt >= TOTAL_STAGED_PARTS ? 'Locomotive Complete!' : (stepData.title || stepData.shortTitle);
  }

  if (descEl && stepData) {
    if (totalBuilt >= TOTAL_STAGED_PARTS) {
      descEl.textContent = 'All 4 bags assembled! Hop inside and switch to Drive Train mode!';
    } else {
      descEl.textContent = `Use the Blueprint clues above to find where this piece connects to the studs.`;
    }
  }

  drawBlueprintDiagram(stepData);
}

// 💡 2-Second Warm Gold Target Stud Pulse Hint (Requirement 1)
export function triggerBlueprintHint() {
  if (!state.trainData) return;
  const currentStageObj = ASSEMBLY_STAGES[state.currentStage - 1] || ASSEMBLY_STAGES[0];
  const targetStepIdx = state.isDragging && state.draggedStepIndex != null 
    ? state.draggedStepIndex 
    : (currentStageObj.stepIndices.find((idx) => !state.builtSteps.has(idx)) ?? state.selectedStepIndex);

  const stepData = state.trainData.steps[targetStepIdx];
  if (!stepData) return;

  // Pulse target studs with a warm gold ring for 2 seconds (Requirement 1)
  sceneManager.pulseGoldHintRing(stepData.mountPos, 2000);

  sounds.playHoverTick();
  navigator.vibrate?.(25);
  showToast('💡 Hint: Target foundation studs pulsed with a warm gold ring!');
}

document.getElementById('btn-blueprint-hint')?.addEventListener('click', () => {
  triggerBlueprintHint();
});

// Update Left Stage Bags & Category Badge Counts
export function updateCategoryCounts() {
  if (!state.trainData) return;
  ASSEMBLY_STAGES.forEach((stage) => {
    const unbuiltCount = stage.stepIndices.filter((idx) => !state.builtSteps.has(idx)).length;
    const badge = document.getElementById(`count-stage-${stage.id}`);
    if (badge) {
      badge.textContent = unbuiltCount === 0 ? '✓' : unbuiltCount;
    }
    const btn = document.getElementById(`stage-btn-${stage.id}`);
    if (btn) {
      btn.classList.toggle('active', state.currentStage === stage.id);
      btn.classList.toggle('completed', unbuiltCount === 0);
    }
  });

  // Update left vertical category sidebar counts
  if (state.trainData.steps) {
    const catCounts = { all: 0, bricks: 0, chassis: 0, cab: 0, roof: 0, wheels: 0 };
    state.trainData.steps.forEach((step, idx) => {
      if (!state.builtSteps.has(idx)) {
        catCounts.all++;
        let itemCat = step.category || 'bricks';
        if (idx === 0 || idx === 1 || idx === 5 || idx === 6) itemCat = 'wheels';
        else if (idx === 2 || idx === 3 || idx === 4 || idx === 7 || idx === 8 || idx === 9) itemCat = 'chassis';
        else if (idx >= 10 && idx <= 25) itemCat = 'cab';
        else if (idx >= 26) itemCat = 'roof';
        if (catCounts[itemCat] !== undefined) catCounts[itemCat]++;
      }
    });

    Object.keys(catCounts).forEach((cat) => {
      const badge = document.getElementById(`count-${cat}`);
      if (badge) {
        badge.textContent = catCounts[cat] === 0 ? '✓' : catCounts[cat];
      }
    });
  }
}

// Wire Left Category & Stage Nav Buttons
document.querySelectorAll('.cat-filter-btn, .stage-nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const cat = btn.dataset.category || btn.dataset.cat;
    if (cat) {
      document.querySelectorAll('.cat-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedCategory = cat;
      sounds.playHoverTick();
      renderToyPartsTray();
      const catObj = LEOCAD_CATEGORIES.find(c => c.id === cat);
      showToast(`📦 Category: ${catObj ? catObj.name : cat}`);
      return;
    }

    const stageId = parseInt(btn.dataset.stage, 10);
    if (stageId >= 1 && stageId <= 4) {
      state.currentStage = stageId;
      sounds.playHoverTick();
      renderToyPartsTray();

      const stageObj = ASSEMBLY_STAGES[stageId - 1];
      const nextPiece = stageObj.stepIndices.find((idx) => !state.builtSteps.has(idx)) ?? stageObj.stepIndices[0];
      selectStep(nextPiece);

      showToast(`📦 Switched to Bag ${stageId}: ${stageObj.name}`);
    }
  });
});

// Wire Bottom Tray Horizontal Scroll Buttons
document.getElementById('btn-tray-scroll-left')?.addEventListener('click', () => {
  const container = document.getElementById('toy-tray-container');
  if (container) container.scrollBy({ left: -260, behavior: 'smooth' });
  sounds.playHoverTick();
});

document.getElementById('btn-tray-scroll-right')?.addEventListener('click', () => {
  const container = document.getElementById('toy-tray-container');
  if (container) container.scrollBy({ left: 260, behavior: 'smooth' });
  sounds.playHoverTick();
});

// Horizontal scroll with mouse wheel over the tray
document.getElementById('toy-tray-container')?.addEventListener('wheel', (e) => {
  if (e.deltaY !== 0) {
    e.preventDefault();
    e.currentTarget.scrollLeft += e.deltaY;
  }
}, { passive: false });

export function updateStepHUD(stepIdx = state.selectedStepIndex) {
  updateInstructionBooklet();
  updateCategoryCounts();
  updateTrayProgress();
}

// =========================================================
// 1B. KID-FRIENDLY FOUNDATION & PREREQUISITE HINT SYSTEM
// =========================================================
export function checkDownwardSupport(stepIdx, targetPos) {
  // 100% Kid-Friendly: Zero physics frustration, always allow placement
  return { hasSupport: true, reason: '' };
}

/**
 * Returns index of prerequisite foundation piece that should be placed first,
 * used purely to render gentle, bouncy visual hints on beacons and tray cards.
 */
export function getPrerequisiteStep(stepIdx) {
  if (!state.trainData || stepIdx === 0 || stepIdx === 1) return null;

  // 1. Wheel bogies are foundation for the chassis and upper train
  if (!state.builtSteps.has(0)) return 0;
  if (!state.builtSteps.has(1)) return 1;

  if (stepIdx <= 2) return null;

  // 2. Chassis beams are foundation for the upper baseplates & cab
  if (!state.builtSteps.has(3)) return 3;
  if (!state.builtSteps.has(4)) return 4;

  if (stepIdx <= 6) return null;

  // 3. Lower Chassis Foundation Plates
  if (!state.builtSteps.has(7)) return 7;
  if (!state.builtSteps.has(8)) return 8;

  return null;
}


// Clean return for an unanchored/floating loose brick after Cannon-es physics drop
function returnSingleLooseBrick(looseItem, sounds) {
  if (!looseItem || !looseItem.body) return;
  const idx = physicsWorld.looseBricks.indexOf(looseItem);
  if (idx !== -1) {
    physicsWorld.looseBricks.splice(idx, 1);
  }
  try {
    physicsWorld.world.removeBody(looseItem.body);
  } catch (_) {}

  const meshGroup = looseItem.meshGroup;
  if (!meshGroup) return;

  const targetScene = (looseItem.scene && typeof looseItem.scene.remove === 'function')
    ? looseItem.scene
    : (meshGroup.parent || scene);

  const startPos = meshGroup.position.clone();
  const targetPos = new THREE.Vector3(startPos.x * 0.35, -1.2, startPos.z + 5.5);
  const startScale = meshGroup.scale.clone();
  const startTime = performance.now();
  const duration = 280;

  const animInterval = setInterval(() => {
    const elapsed = performance.now() - startTime;
    const t = Math.min(1.0, elapsed / duration);
    meshGroup.position.lerpVectors(startPos, targetPos, t);
    const s = Math.max(0.01, 1.0 - t * 0.95);
    meshGroup.scale.set(startScale.x * s, startScale.y * s, startScale.z * s);

    if (t >= 1.0) {
      clearInterval(animInterval);
      try {
        targetScene.remove(meshGroup);
      } catch (_) {}
      const card = document.getElementById(`toy-card-${looseItem.stepIdx}`);
      if (card) {
        card.classList.remove('is-being-dragged');
        card.classList.add('tray-bounce');
        setTimeout(() => card.classList.remove('tray-bounce'), 450);
      }
      sounds?.playPop?.();
    }
  }, 16);
}

function handleUnsupportedDrop(stepIdx, reason) {
  const stepData = state.trainData?.steps?.[stepIdx];
  sounds.playReject?.();
  navigator.vibrate?.([60, 40, 80]);

  const card = document.getElementById(`toy-card-${stepIdx}`);
  if (card) {
    card.classList.add('shake');
    setTimeout(() => card.classList.remove('shake'), 500);
  }

  showToast(`⚠️ Floating brick! ${reason || 'Needs solid foundation beneath it.'}`);

  if (state.draggingPieceGroup) {
    const meshGroup = state.draggingPieceGroup;
    state.draggingPieceGroup = null;

    // Restore original colors before passing to physics
    restoreDragGroupColors(meshGroup);

    // Spawn falling rigid body in Cannon-es physics world with gravity and collision
    const loose = physicsWorld.spawnLooseFallingBrick(meshGroup, stepIdx, scene, sounds);

    // After 2.4s of tumbling and colliding, gently tween back to tray card
    setTimeout(() => {
      returnSingleLooseBrick(loose, sounds);
    }, 2400);
  }
}

// =========================================================
// 2. FREEFORM 3D SCENE DRAG & DROP (ZERO PRE-SET SLOTS)
// =========================================================
export function updateBrickCount() {
  const count = state.builtSteps ? state.builtSteps.size : allOtherSceneBricks.length;
  const countEl = document.getElementById('brick-count');
  if (countEl) countEl.textContent = count;
  const pill = document.getElementById('tray-progress-pill');
  if (pill) pill.textContent = `Placed: ${count}/42`;

  const currentStageObj = ASSEMBLY_STAGES[state.currentStage - 1] || ASSEMBLY_STAGES[0];
  const builtInStage = currentStageObj.stepIndices.filter((idx) => state.builtSteps && state.builtSteps.has(idx)).length;
  const totalInStage = currentStageObj.totalParts;
  const bagTitle = `Bag ${currentStageObj.id}: ${currentStageObj.name}`;

  updateBuildProgress(builtInStage, totalInStage, bagTitle);
}

export function updateInspectorCard(title = 'Freeform 3D Placement') {
  const titleEl = document.getElementById('booklet-part-title');
  const descEl = document.getElementById('booklet-part-desc');
  if (titleEl) titleEl.textContent = title;
  if (descEl) descEl.textContent = 'Drag any piece across the 0.8-pitch grid or stack atop other pieces. Tap any piece to reposition!';
}

export function createPieceMeshGroup(itemData) {
  const group = new THREE.Group();
  let height = 0.32;
  let title = 'Component';

  let stepIdx = undefined;
  if (typeof itemData === 'number') {
    stepIdx = itemData;
  } else if (itemData) {
    if (typeof itemData.stepIndex === 'number') stepIdx = itemData.stepIndex;
    else if (typeof itemData.stepData?.stepIndex === 'number') stepIdx = itemData.stepData.stepIndex;
    else if (typeof itemData.stepData?.step === 'number') stepIdx = itemData.stepData.step - 1;
    else if (typeof itemData.step === 'number') stepIdx = itemData.step - 1;
    else if (typeof itemData.stepNumber === 'number') stepIdx = itemData.stepNumber - 1;
    else if (state.trainData?.steps) {
      const foundIdx = state.trainData.steps.findIndex(s => s === itemData || s === itemData.stepData || s.meshes === itemData.meshes || (itemData.title && (s.title === itemData.title || s.shortTitle === itemData.title)));
      if (foundIdx !== -1) stepIdx = foundIdx;
    }
  }

  const isTrainStep = stepIdx !== undefined || (itemData && itemData.type === 'train_step') || (itemData && itemData.meshes);

  if (isTrainStep) {
    const validIdx = stepIdx !== undefined ? stepIdx : 0;
    const stepData = state.trainData?.steps?.[validIdx];

    if (stepData) {
      title = stepData.shortTitle || stepData.title || `Part #${validIdx + 1}`;
      const tempBox = new THREE.Box3();
      stepData.meshes.forEach((m) => {
        m.updateMatrixWorld(true);
        tempBox.expandByObject(m);
      });
      const localCenter = new THREE.Vector3();
      tempBox.getCenter(localCenter);
      const size = new THREE.Vector3();
      tempBox.getSize(size);
      height = size.y > 0 ? size.y : 0.32;

      if (stepIdx === 0) {
        // Step 1: Front Wheel Bogie & Axles
        const frontBogie = new THREE.Group();
        frontBogie.name = 'frontBogie';
        group.add(frontBogie);

        const wheelClones = [];
        stepData.meshes.forEach((mesh) => {
          const cloneMat = Array.isArray(mesh.material)
            ? mesh.material.map((m) => m.clone())
            : mesh.material.clone();
          const clone = new THREE.Mesh(mesh.geometry, cloneMat);
          clone.castShadow = true;
          clone.receiveShadow = true;

          const edgeLines = createLegoEdgeLines(mesh.geometry, cloneMat);
          if (edgeLines) clone.add(edgeLines);

          const wp = new THREE.Vector3();
          mesh.getWorldPosition(wp);
          clone.position.copy(wp).sub(localCenter);
          clone.quaternion.copy(mesh.getWorldQuaternion(new THREE.Quaternion()));
          clone.scale.copy(mesh.getWorldScale(new THREE.Vector3()));
          clone.userData.rootBrick = group;
          clone.userData.isSceneBrick = true;
          if (stepIdx !== undefined) clone.userData.stepIndex = stepIdx;
          wheelClones.push(clone);
        });

        // Attach wheels to bogie relative coordinate frame
        const leftWheel = wheelClones[0] || new THREE.Group();
        const rightWheel = wheelClones[1] || new THREE.Group();
        leftWheel.name = 'leftWheel';
        rightWheel.name = 'rightWheel';
        frontBogie.add(leftWheel);
        frontBogie.add(rightWheel);
        for (let w = 2; w < wheelClones.length; w++) {
          frontBogie.add(wheelClones[w]);
        }
      } else if (stepIdx === 1) {
        // Step 2: Rear Wheel Bogie & Axles
        const rearBogie = new THREE.Group();
        rearBogie.name = 'rearBogie';
        group.add(rearBogie);

        const wheelClones = [];
        stepData.meshes.forEach((mesh) => {
          const cloneMat = Array.isArray(mesh.material)
            ? mesh.material.map((m) => m.clone())
            : mesh.material.clone();
          const clone = new THREE.Mesh(mesh.geometry, cloneMat);
          clone.castShadow = true;
          clone.receiveShadow = true;

          const edgeLines = createLegoEdgeLines(mesh.geometry, cloneMat);
          if (edgeLines) clone.add(edgeLines);

          const wp = new THREE.Vector3();
          mesh.getWorldPosition(wp);
          clone.position.copy(wp).sub(localCenter);
          clone.quaternion.copy(mesh.getWorldQuaternion(new THREE.Quaternion()));
          clone.scale.copy(mesh.getWorldScale(new THREE.Vector3()));
          clone.userData.rootBrick = group;
          clone.userData.isSceneBrick = true;
          if (stepIdx !== undefined) clone.userData.stepIndex = stepIdx;
          wheelClones.push(clone);
        });

        // Attach wheels to bogie relative coordinate frame
        const leftWheel = wheelClones[0] || new THREE.Group();
        const rightWheel = wheelClones[1] || new THREE.Group();
        leftWheel.name = 'rearLeftWheel';
        rightWheel.name = 'rearRightWheel';
        rearBogie.add(leftWheel);
        rearBogie.add(rightWheel);
        for (let w = 2; w < wheelClones.length; w++) {
          rearBogie.add(wheelClones[w]);
        }
      } else {
        stepData.meshes.forEach((mesh) => {
          const cloneMat = Array.isArray(mesh.material)
            ? mesh.material.map((m) => m.clone())
            : mesh.material.clone();
          const clone = new THREE.Mesh(mesh.geometry, cloneMat);
          clone.castShadow = true;
          clone.receiveShadow = true;

          const edgeLines = createLegoEdgeLines(mesh.geometry, cloneMat);
          if (edgeLines) clone.add(edgeLines);

          const wp = new THREE.Vector3();
          mesh.getWorldPosition(wp);
          clone.position.copy(wp).sub(localCenter);
          clone.quaternion.copy(mesh.getWorldQuaternion(new THREE.Quaternion()));
          clone.scale.copy(mesh.getWorldScale(new THREE.Vector3()));
          clone.userData.rootBrick = group;
          clone.userData.isSceneBrick = true;
          if (stepIdx !== undefined) clone.userData.stepIndex = stepIdx;
          group.add(clone);
        });
      }
    }
  } else {
    // Standard Brick
    const key = typeof itemData === 'string' ? itemData : (itemData.key || 'brick-2x4');
    const brickDef = BRICK_TYPES[key] || BRICK_TYPES['brick-2x4'];
    title = brickDef.name || 'Standard Brick';
    height = brickDef.height || (brickDef.isPlate ? 0.32 : 0.96);
    const colorHex = LEGO_COLORS[itemData.color || state.selectedColor]?.threeHex || 0xd91e18;
    const mat = createPlasticMaterial(colorHex, false, true);
    const mesh = brickDef.createMesh(mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.rootBrick = group;
    mesh.userData.isSceneBrick = true;
    group.add(mesh);
  }

  group.userData = {
    isSceneBrick: true,
    rootBrick: group,
    height,
    title,
    isTrainStep: !!isTrainStep,
    stepIndex: stepIdx,
    itemData
  };

  group.traverse((c) => {
    c.userData.rootBrick = group;
    c.userData.isSceneBrick = true;
    if (stepIdx !== undefined) {
      c.userData.stepIndex = stepIdx;
    }
    c.userData.title = title;
  });

  return group;
}

// 2a) Tray Drag: Touching or clicking any card clones piece into 3D scene under cursor, disables OrbitControls, allows dragging anywhere on board
export function initiateTrayBrickDrag(pieceData, clientX, clientY) {
  // Requirement 3: When Inspect View is active, dragging pieces from tray is disabled & auto-locks camera
  if (state.isInspectViewActive) {
    setCameraInspectMode(false);
    return null;
  }

  // If it's a train step and already placed/locked, prevent duplicate dragging
  const stepIdx = typeof pieceData === 'number' ? pieceData : (pieceData?.stepIndex !== undefined ? pieceData.stepIndex : pieceData?.stepData?.stepIndex);
  if (stepIdx !== undefined && (state.builtSteps.has(stepIdx) || allOtherSceneBricks.some(b => b.userData?.stepIndex === stepIdx && (b.userData?.isCorrectlyPlaced || b.userData?.isBlueprintAligned)))) {
    showToast(`🔒 Part is correctly placed and locked in place!`);
    return null;
  }

  // Clean up any stray unplaced dragged brick in scene before creating new one
  if (state.activeDraggedPiece && !state.activeDraggedPiece.userData?.isExistingPlacedPiece) {
    scene.remove(state.activeDraggedPiece);
    sceneManager?.cancelFloatingDrag?.(state.activeDraggedPiece);
    state.activeDraggedPiece = null;
  }

  const pieceGroup = createPieceMeshGroup(pieceData);
  if (!pieceGroup) return null;
  pieceGroup.userData.isLockedInScene = false;
  pieceGroup.visible = false; // Hide until pointer hits a valid raycast point
  scene.add(pieceGroup);

  state.activeDraggedPiece = pieceGroup;
  state.draggingPieceGroup = pieceGroup;
  state.isDragging = true;
  controls.enabled = false;
  document.body.style.cursor = 'grabbing';

  pieceGroup.rotation.y = state.pieceRotation;

  if (sceneManager) {
    if (sceneManager.startDraggingPiece) {
      sceneManager.startDraggingPiece(pieceGroup);
    } else {
      sceneManager.startFloatingDrag(pieceGroup);
    }
  }

  onPointerMove(clientX, clientY, null, pieceGroup);
  updateInspectorCard(pieceGroup.userData.title);

  sounds.playPop();
  navigator.vibrate?.(18);
  showToast(`📦 Dragging ${pieceGroup.userData.title} — place anywhere on the grid!`);

  // Requirement 4: In-situ rotation controls above touch point
  if (typeof clientX === 'number' && typeof clientY === 'number') {
    showFloatingRotateBtn(clientX, clientY);
  }

  return pieceGroup;
}

// Backwards compatibility alias
export const initiateBrickDrag = initiateTrayBrickDrag;

// 2b) Direct 3D Scene Picking: Clicking/touching ANY already-placed piece in 3D scene picks it up, lifts it slightly (Y + 0.4), and lets user slide and reposition it anywhere
export function startDirectScenePick(rootBrick, clientX, clientY) {
  if (!rootBrick) return null;
  if (state.isInspectViewActive) return null;

  // Make sure when pieces are aligned correctly, the individual piece CANNOT be moved further!
  const stepIdx = rootBrick.userData?.stepIndex;
  const isCorrectlyAligned =
    rootBrick.userData?.isCorrectlyPlaced ||
    rootBrick.userData?.isBlueprintAligned ||
    rootBrick.userData?.isPermanentlyLocked ||
    (stepIdx !== undefined && stepIdx !== null && state.builtSteps.has(stepIdx));

  if (isCorrectlyAligned) {
    pulseEmissiveHighlight(rootBrick, 0x38bdf8, 300);
    showToast(`🔒 ${rootBrick.userData?.title || 'Piece'} is correctly aligned & locked in place!`);
    return null;
  }

  // Unlock so it can be re-locked on drop
  rootBrick.userData.isLockedInScene = false;

  // Remove from allOtherSceneBricks while dragging so it won't raycast against itself
  const idx = allOtherSceneBricks.indexOf(rootBrick);
  if (idx !== -1) {
    allOtherSceneBricks.splice(idx, 1);
  }
  state.placedBricks = allOtherSceneBricks;
  sceneManager?.setPlacedBricks?.(allOtherSceneBricks);

  // Lift slightly (Y + 0.4)
  rootBrick.position.y += 0.4;
  rootBrick.userData.originalPosition = rootBrick.position.clone();
  rootBrick.userData.isExistingPlacedPiece = true;

  state.activeDraggedPiece = rootBrick;
  state.draggingPieceGroup = rootBrick;
  state.isDragging = true;
  controls.enabled = false;
  document.body.style.cursor = 'grabbing';

  state.pieceRotation = rootBrick.rotation.y;
  state.dragRotationY = rootBrick.rotation.y;

  if (sceneManager) {
    sceneManager.startFloatingDrag(rootBrick);
  }

  onPointerMove(clientX, clientY, null, rootBrick);
  updateInspectorCard(rootBrick.userData.title);

  sounds.playPop();
  navigator.vibrate?.(18);
  showToast(`✋ Picked up ${rootBrick.userData.title || 'brick'} — reposition anywhere!`);

  // Requirement 4: In-situ rotation controls above touch point
  if (typeof clientX === 'number' && typeof clientY === 'number') {
    showFloatingRotateBtn(clientX, clientY);
  }

  return rootBrick;
}


// --- Kids-Friendly Standard Catalog Pieces (Matching Reference Screenshot) ---
const KIDS_CATALOG_PIECES = [
  { key: 'brick-2x4', name: 'Red 2x4 Brick', category: 'bricks', color: 'red', colorHex: 0xd91e18 },
  { key: 'brick-2x2', name: 'Blue 2x2 Brick', category: 'bricks', color: 'blue', colorHex: 0x0055bf },
  { key: 'plate-1x4', name: 'Red 1x4 Plate', category: 'bricks', color: 'red', colorHex: 0xd91e18 },
  { key: 'slope-roof', name: 'Gray Roof Slope', category: 'special', color: 'black', colorHex: 0x64748b },
  { key: 'arch-1x4', name: 'Red Arch Brick', category: 'special', color: 'red', colorHex: 0xd91e18 },
  { key: 'wheel-axle', name: 'Wheel with Tire', category: 'wheels', color: 'black', colorHex: 0x1b2a34 },
  { key: 'canopy-cockpit', name: 'Windshield Canopy', category: 'special', color: 'blue', colorHex: 0x38bdf8 },
  { key: 'technic-1x4', name: 'Technic 1x4 Brick', category: 'special', color: 'black', colorHex: 0x64748b },
  { key: 'slope-roof', name: 'Yellow Roof Slope', category: 'special', color: 'yellow', colorHex: 0xf6bb12, variant: 'yellow' },
  { key: 'wedge-curved', name: 'Curved Nose', category: 'special', color: 'red', colorHex: 0xd91e18 },
  { key: 'plate-1x2', name: 'Yellow 1x2 Plate', category: 'bricks', color: 'yellow', colorHex: 0xf6bb12 },
  { key: 'brick-2x4', name: 'Yellow 2x4 Brick', category: 'bricks', color: 'yellow', colorHex: 0xf6bb12, variant: 'yellow' },
  { key: 'brick-2x2', name: 'Green 2x2 Brick', category: 'bricks', color: 'green', colorHex: 0x237841, variant: 'green' }
];

const standardBrickThumbCache = new Map();

function getStandardBrickThumbnail(item) {
  const key = item.key || 'brick-2x4';
  const colorKey = item.color || 'red';
  const cacheKey = `kids_${key}_${colorKey}_${item.variant || ''}`;
  if (standardBrickThumbCache.has(cacheKey)) {
    return standardBrickThumbCache.get(cacheKey);
  }

  try {
    const colorHex = item.colorHex || LEGO_COLORS[colorKey]?.threeHex || 0xd91e18;
    const mat = createPlasticMaterial(colorHex);
    const brickDef = BRICK_TYPES[key] || BRICK_TYPES['brick-2x4'];
    if (brickDef) {
      const mesh = brickDef.createMesh(mat);
      const thumb = generatePieceThumbnail(mesh);
      if (thumb) {
        standardBrickThumbCache.set(cacheKey, thumb);
        return thumb;
      }
    }
  } catch (e) {
    console.warn('Error generating 3D piece thumbnail:', e);
  }
  return null;
}

export function renderToyPartsTray() {
  const track = document.getElementById('toy-tray-track') || document.querySelector('#parts-tray .toy-tray-track');
  if (!track) return;

  track.innerHTML = '';

  const currentStageObj = ASSEMBLY_STAGES[state.currentStage - 1] || ASSEMBLY_STAGES[0];

  // Synchronize Bag tab buttons active state
  document.querySelectorAll('.tray-tabs-header .tray-tab').forEach((tab) => {
    const stageStr = tab.getAttribute('data-stage') || tab.dataset.stage || tab.getAttribute('data-bag');
    if (stageStr) {
      const stageId = parseInt(stageStr, 10);
      if (stageId === state.currentStage) {
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
      } else {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
      }
    }
  });

  // Synchronize Sub-header Bag Details
  const bagTitleEl = document.getElementById('tray-bag-title');
  const bagCounterEl = document.getElementById('tray-bag-counter');
  if (currentStageObj) {
    const builtInStage = currentStageObj.stepIndices.filter((idx) => state.builtSteps && state.builtSteps.has(idx)).length;
    if (bagTitleEl) bagTitleEl.textContent = `Bag ${currentStageObj.id}: ${currentStageObj.name}`;
    if (bagCounterEl) bagCounterEl.textContent = `${builtInStage} / ${currentStageObj.totalParts}`;
  }

  // Fallback Safety — show subtle pulse loader while model is loading
  if (!state.trainData || !state.isTrainLoaded) {
    const skeletonCount = 5;
    for (let i = 0; i < skeletonCount; i++) {
      const skelCard = document.createElement('div');
      skelCard.className = 'toy-card tray-card skeleton';
      skelCard.innerHTML = `
        <div class="toy-card-preview">
          <div class="skeleton-preview"></div>
        </div>
      `;
      track.appendChild(skelCard);
    }
    return;
  }

  const candidateItems = [];

  if (state.mode === 'train') {
    // Show all pieces in the currently active Bag according to the build hierarchy!
    let activeIdx = state.selectedStepIndex;
    if (state.builtSteps && (state.builtSteps.has(activeIdx) || !currentStageObj.stepIndices.includes(activeIdx))) {
      const firstUnbuilt = currentStageObj.stepIndices.find((idx) => !state.builtSteps.has(idx));
      if (firstUnbuilt !== undefined) {
        activeIdx = firstUnbuilt;
        state.selectedStepIndex = firstUnbuilt;
      }
    }

    // Separate into unbuilt and built so unbuilt pieces are front and center, but keep completed visible
    const stageIndices = [...currentStageObj.stepIndices];
    const unbuilt = stageIndices.filter((idx) => !state.builtSteps || !state.builtSteps.has(idx));
    const built = stageIndices.filter((idx) => state.builtSteps && state.builtSteps.has(idx));
    const orderedIndices = [...unbuilt, ...built];

    orderedIndices.forEach((stepIdx) => {
      const step = state.trainData.steps[stepIdx];
      if (step) {
        const isPlaced = state.builtSteps && state.builtSteps.has(stepIdx);
        candidateItems.push({
          type: 'train_step',
          stepIndex: stepIdx,
          stepData: step,
          quantity: step.quantity || step.pieceCount || 1,
          isPlaced,
          isActive: stepIdx === activeIdx && !isPlaced
        });
      }
    });
  } else {
    // Kids catalog pieces for free play mode
    KIDS_CATALOG_PIECES.forEach((piece) => {
      candidateItems.push({
        type: 'standard_brick',
        ...piece,
        quantity: 4
      });
    });
  }

  // Render clean white square cards matching reference UI
  candidateItems.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'toy-card tray-card';

    let title = '';
    let thumbUrl = null;
    const isPlaced = !!item.isPlaced;
    const isActive = !!item.isActive;

    if (item.type === 'train_step') {
      const step = item.stepData;
      title = step.shortTitle || step.title || `Part #${item.stepIndex + 1}`;
      card.id = `toy-card-${item.stepIndex}`;

      if (isPlaced) {
        card.classList.add('placed');
      }
      if (isActive) {
        card.classList.add('active-next-piece');
      }

      thumbUrl = step.thumbnailUrl;
      if (!thumbUrl) {
        thumbUrl = generatePieceThumbnail(step);
        step.thumbnailUrl = thumbUrl;
      }
    } else {
      title = item.name;
      card.id = `toy-card-${item.key || item.name}-${item.color || 'red'}-${item.variant || ''}`;
      thumbUrl = getStandardBrickThumbnail(item);
    }

    const previewHtml = thumbUrl
      ? `<img class="toy-card-img" src="${thumbUrl}" alt="${title}" draggable="false">`
      : `<div class="skeleton-preview"></div>`;

    const placedBadgeHtml = isPlaced
      ? `<span class="card-check-dot">✓</span>`
      : '';

    card.title = `${title}${isPlaced ? ' (Built)' : ''}`;
    card.setAttribute('aria-label', title);

    card.innerHTML = `
      ${placedBadgeHtml}
      <div class="toy-card-preview">
        ${previewHtml}
      </div>
    `;

    // Tray Drag for unplaced cards
    if (!isPlaced) {
      setupCardDragListener(
        card,
        item,
        controls,
        (pieceData, clientX, clientY) => {
          return initiateTrayBrickDrag(pieceData, clientX, clientY);
        },
        (clientX, clientY, e, draggedBrick) => {
          onPointerMove(clientX, clientY, e, draggedBrick);
        },
        (clientX, clientY, e, draggedBrick) => {
          handlePieceRelease(clientX, clientY, e, draggedBrick);
        },
        {
          isInspectActive: () => state.isInspectViewActive,
          onInspectExit: () => setCameraInspectMode(false)
        }
      );
    } else {
      // Clicking a placed card inspects / highlights that step on the train
      card.addEventListener('click', () => {
        sounds.playPop();
        selectStep(item.stepIndex);
        showToast(`🔍 ${title}`);
      });
    }

    track.appendChild(card);
  });

  updateBrickCount();
}

export function switchBag(stageId) {
  const stageNum = parseInt(stageId, 10);
  if (isNaN(stageNum) || stageNum < 1 || stageNum > 4) return;

  state.currentStage = stageNum;
  try { sounds.playPop(); } catch (_) {}

  const stageObj = ASSEMBLY_STAGES[stageNum - 1];
  if (stageObj && state.trainData && state.trainData.steps) {
    const nextPiece = stageObj.stepIndices.find((idx) => !state.builtSteps.has(idx)) ?? stageObj.stepIndices[0];
    if (nextPiece !== undefined && nextPiece < state.trainData.steps.length) {
      state.selectedStepIndex = nextPiece;
      const stepData = state.trainData.steps[nextPiece];
      if (piecePreviewViewer && stepData) {
        piecePreviewViewer.loadStep(stepData);
      }
      updateStepHUD(nextPiece);
    }
  }

  renderToyPartsTray();
  updateBrickCount();
  showToast(`🎒 Opened Bag ${stageNum}: ${stageObj ? stageObj.name : ''}!`);
}
window.switchBag = switchBag;

export function setupTrayCategoryTabs() {
  document.querySelectorAll('.tray-tabs-header .tray-tab').forEach((tab) => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const stageStr = tab.getAttribute('data-stage') || tab.dataset.stage || tab.getAttribute('data-bag');
      if (stageStr) {
        switchBag(parseInt(stageStr, 10));
        return;
      }

      const cat = tab.getAttribute('data-category');
      if (cat && state.selectedCategory !== cat) {
        state.selectedCategory = cat;
        sounds.playPop();
        renderToyPartsTray();
      }
    });

    tab.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
    });
  });

  // Global event delegation backup ensures any click on tabs or their inner icons/text triggers bag switch
  if (!window._trayTabsDelegationAttached) {
    window._trayTabsDelegationAttached = true;
    document.addEventListener('click', (e) => {
      const tab = e.target.closest('.tray-tab');
      if (tab) {
        const stageStr = tab.getAttribute('data-stage') || tab.dataset.stage || tab.getAttribute('data-bag');
        if (stageStr) {
          e.preventDefault();
          e.stopPropagation();
          switchBag(parseInt(stageStr, 10));
        }
      }
    });
  }

  // Wire Clackety Wooden Tray Prev/Next navigation scroll buttons (Horizontal Scroll)
  const prevBtn = document.getElementById('btn-tray-prev');
  const nextBtn = document.getElementById('btn-tray-next');
  const trayContainer = document.getElementById('toy-tray-container');

  if (prevBtn && trayContainer) {
    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sounds.playHoverTick();
      trayContainer.scrollBy({ left: -240, behavior: 'smooth' });
    });
  }

  if (nextBtn && trayContainer) {
    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sounds.playHoverTick();
      trayContainer.scrollBy({ left: 240, behavior: 'smooth' });
    });
  }

  // Wire Right Action Buttons: Auto-Build Step, Inspect & Catalog
  const autoBuildBtn = document.getElementById('btn-tray-autobuild');
  if (autoBuildBtn) {
    autoBuildBtn.addEventListener('click', (e) => {
      e.preventDefault();
      autoBuildCurrentStep();
    });
  }

  const inspectBtn = document.getElementById('btn-tray-inspect');
  if (inspectBtn) {
    inspectBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sounds.playPop();
      toggleGhostGuide();
    });
  }

  const catalogBtn = document.getElementById('btn-tray-catalog');
  if (catalogBtn) {
    catalogBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sounds.playPop();
      switchMode(state.mode === 'train' ? 'builder' : 'train');
    });
  }
}
setupTrayCategoryTabs();

function updateTrayProgress() {
  const pill = document.getElementById('tray-progress-pill');
  if (pill && state.trainData) {
    const currentStageObj = ASSEMBLY_STAGES[state.currentStage - 1] || ASSEMBLY_STAGES[0];
    const builtInStage = currentStageObj.stepIndices.filter((idx) => state.builtSteps && state.builtSteps.has(idx)).length;
    pill.textContent = `Bag ${currentStageObj.id}/4 • ${builtInStage}/${currentStageObj.totalParts} Placed`;
  }
}


// =========================================================
// 2. PLACEMENT ENGINE — RAYCASTING, DRAG, SNAP, PHYSICS
// =========================================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ── Grid & height constants ──────────────────────────────
const STUD_SPACING = 0.8;   // LeoCAD standard stud pitch (0.8)
const BRICK_HEIGHT = 0.96;  // Standard LEGO brick height (3 * 0.32)
const BASEPLATE_TOP_Y = 0.0;  // Top face of baseplate
const SNAP_RADIUS = 2.5;

// --- Live Free Builder 3D Ghost Preview ---
const builderGhostGroup = new THREE.Group();
builderGhostGroup.name = 'builder-ghost-group';
builderGhostGroup.visible = false;
scene.add(builderGhostGroup);

let currentBuilderGhostDef = null;
let currentBuilderGhostColor = null;

function updateFreeBuilderGhost(snapX, snapY, snapZ, isValid = true) {
  if (state.mode !== 'builder') {
    builderGhostGroup.visible = false;
    return;
  }

  const brickKey = state.selectedPiece;
  const colorKey = state.selectedColor;

  if (
    !builderGhostGroup.children[0] ||
    currentBuilderGhostDef !== brickKey ||
    currentBuilderGhostColor !== colorKey
  ) {
    while (builderGhostGroup.children.length > 0) {
      builderGhostGroup.remove(builderGhostGroup.children[0]);
    }
    const brickDef = BRICK_TYPES[brickKey] || BRICK_TYPES['brick-2x4'];
    const colorHex = LEGO_COLORS[colorKey]?.threeHex || 0xd91e18;
    const ghostMat = createPlasticMaterial(colorHex, true, true);
    const ghostMesh = brickDef.createMesh(ghostMat);
    builderGhostGroup.add(ghostMesh);
    currentBuilderGhostDef = brickKey;
    currentBuilderGhostColor = colorKey;
  }

  builderGhostGroup.position.set(snapX, snapY, snapZ);
  builderGhostGroup.rotation.y = state.pieceRotation;
  builderGhostGroup.visible = true;

  builderGhostGroup.traverse((c) => {
    if (c.isMesh && c.material) {
      if (isValid) {
        c.material.color.setHex(LEGO_COLORS[colorKey]?.threeHex || 0xd91e18);
        c.material.opacity = 0.65;
      } else {
        c.material.color.setHex(0xef4444);
        c.material.opacity = 0.45;
      }
    }
  });
}

/**
 * Snap a world coordinate to the nearest stud-grid integer.
 */
function snapToStudGrid(value, pitch = STUD_SPACING) {
  return Math.round(value / pitch) * pitch;
}

/**
 * Build the list of meshes the surface-raycaster can land on:
 *   • Baseplate face meshes
 *   • Visible placed train-step meshes
 *   • Free-builder placed brick meshes
 * Explicitly EXCLUDES currently dragged brick from raycast targets to prevent vertical self-collision jumping.
 */
function buildSurfaceMeshes(excludedGroup = null) {
  const surfaces = [];
  const excludedSet = new Set();
  if (excludedGroup) excludedGroup.traverse((c) => excludedSet.add(c));
  if (state.draggingPieceGroup) state.draggingPieceGroup.traverse((c) => excludedSet.add(c));

  baseplateGroup.traverse((c) => {
    if (c.isMesh && !excludedSet.has(c)) surfaces.push(c);
  });
  if (state.trainData && state.trainData.trainGroup) {
    state.trainData.trainGroup.traverse((c) => {
      if (c.isMesh && c.visible && c.userData?.isTrainMesh && !excludedSet.has(c)) surfaces.push(c);
    });
  }
  state.placedBricks.forEach((b) => {
    if (b.isMesh && !excludedSet.has(b)) surfaces.push(b);
    else b.traverse((c) => { if (c.isMesh && !excludedSet.has(c)) surfaces.push(c); });
  });
  return [...new Set(surfaces)];
}

/**
 * Cast a ray from camera → pointer against real scene geometry.
 *
 * Returns:
 *   { position: Vector3, surfaceY: number, isBaseplate: boolean } | null
 *
 * If pointing at baseplate → Y = BASEPLATE_TOP_Y
 * If pointing at a placed brick → Y = hitBrick.worldY + BRICK_HEIGHT  (auto-elevate)
 * Falls back to a horizontal plane at fallbackY when nothing is hit.
 */
function castSurfaceRay(clientX, clientY, fallbackY = BASEPLATE_TOP_Y) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const surfaces = buildSurfaceMeshes();
  const hits = raycaster.intersectObjects(surfaces, false);

  if (hits.length > 0) {
    const hit = hits[0];
    const obj = hit.object;

    // Is it the baseplate?
    let onBase = false;
    baseplateGroup.traverse((c) => { if (c === obj) onBase = true; });

    let surfaceY;
    if (onBase) {
      surfaceY = BASEPLATE_TOP_Y;
    } else {
      // Top face of whatever brick was hit
      const wp = new THREE.Vector3();
      obj.getWorldPosition(wp);
      const bb = new THREE.Box3().setFromObject(obj);
      surfaceY = bb.max.y; // Use actual geometry top
    }

    return {
      position: new THREE.Vector3(
        snapToStudGrid(hit.point.x),
        surfaceY,
        snapToStudGrid(hit.point.z)
      ),
      surfaceY,
      isBaseplate: onBase
    };
  }

  // ── Fallback: horizontal plane at fallbackY ─────────────
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -fallbackY);
  const pt = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(plane, pt)) return null;

  return {
    position: new THREE.Vector3(
      snapToStudGrid(pt.x),
      fallbackY,
      snapToStudGrid(pt.z)
    ),
    surfaceY: fallbackY,
    isBaseplate: fallbackY <= BASEPLATE_TOP_Y + 0.1
  };
}

// ── In-Situ 90° Floating Rotation Controls (Requirement 4) ──
export function showFloatingRotateBtn(screenX, screenY) {
  const container = document.getElementById('insitu-rotate-controls');
  if (!container) return;
  if (typeof screenX === 'number' && typeof screenY === 'number' && (screenX > 0 || screenY > 0)) {
    container.style.left = `${screenX}px`;
    container.style.top = `${screenY}px`;
    container.style.display = 'flex';
  }
}

export function hideFloatingRotateBtn() {
  const container = document.getElementById('insitu-rotate-controls');
  if (container) {
    container.style.display = 'none';
  }
}

// In-situ rotation button listeners
document.getElementById('btn-insitu-rotate-left')?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  rotatePieceLeft();
});

document.getElementById('btn-insitu-rotate-right')?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  rotatePieceRight();
});

/**
 * Unified Rotation Engine (Requirement 4):
 * - Constrains all piece rotations strictly to discrete 90-degree steps:
 *   rotationY = (rotationY + Math.PI / 2) % (Math.PI * 2);
 *   rotationY = (rotationY - Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
 * - Pieces must NEVER rotate along arbitrary freeform angles or full 360° smooth arcs so they always remain aligned with the track and stud grid.
 */
function applyRotation(radians) {
  const TWO_PI = Math.PI * 2;
  const step = Math.PI / 2;
  const snapped = Math.round(radians / step) * step;
  state.pieceRotation = ((snapped % TWO_PI) + TWO_PI) % TWO_PI;
  state.dragRotationY = state.pieceRotation;

  // Update rotation angle readouts across UI
  const deg = Math.round(state.pieceRotation * (180 / Math.PI)) % 360;
  const badge = document.getElementById('rotation-angle-badge');
  if (badge) badge.textContent = `${deg}°`;
  const headerRot = document.getElementById('header-rot-angle');
  if (headerRot) headerRot.textContent = `${deg}°`;

  if (brickWorldManager) {
    brickWorldManager.currentRotationY = state.pieceRotation;
    if (brickWorldManager.activeDraggedBrick) {
      brickWorldManager.activeDraggedBrick.rotation.y = state.pieceRotation;
    }
  }

  if (state.activeDraggedPiece) {
    state.activeDraggedPiece.rotation.set(0, state.pieceRotation, 0);
  }
  if (state.draggingPieceGroup) {
    state.draggingPieceGroup.rotation.set(0, state.pieceRotation, 0);
  }

  if (builderGhostGroup && state.mode === 'builder') {
    builderGhostGroup.rotation.y = state.pieceRotation;
  }

  if (piecePreviewViewer && piecePreviewViewer.pieceGroup) {
    piecePreviewViewer.pieceGroup.rotation.y = state.pieceRotation;
  }
}

export function rotatePieceLeft() {
  const TWO_PI = Math.PI * 2;
  const nextRot = (state.pieceRotation - Math.PI / 2 + TWO_PI) % TWO_PI;
  applyRotation(nextRot);
  navigator.vibrate?.(18);
  sounds.playPop();
}

export function rotatePieceRight() {
  const TWO_PI = Math.PI * 2;
  const nextRot = (state.pieceRotation + Math.PI / 2) % TWO_PI;
  applyRotation(nextRot);
  navigator.vibrate?.(18);
  sounds.playPop();
}

export const rotatePiece90 = rotatePieceRight;
export const rotateActivePiece90 = rotatePieceRight;

function setPieceRotationDegrees(deg) {
  const rad = ((deg % 360 + 360) % 360) * (Math.PI / 180);
  applyRotation(rad);
}

function updateAllRotationUI() {
  // Synchronized via applyRotation
}

/**
 * Briefly pulse an emissive green highlight on the brick for 0.4 seconds before fading to normal plastic (Requirement 2c)
 */
function pulseEmissiveHighlight(group, hexColor = 0x22c55e, durationMs = 400) {
  if (!group) return;
  const originalEmissives = new Map();
  group.traverse((child) => {
    if (child.isMesh && child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m) => {
        if (m.emissive) {
          originalEmissives.set(m, { color: m.emissive.clone(), intensity: m.emissiveIntensity || 0 });
          m.emissive.setHex(hexColor);
          m.emissiveIntensity = 0.9;
        }
      });
    }
  });

  const startTime = performance.now();
  const anim = () => {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(1.0, elapsed / durationMs);
    const intensity = (1 - progress) * 0.9;

    group.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => {
          if (m.emissive && originalEmissives.has(m)) {
            m.emissiveIntensity = intensity;
          }
        });
      }
    });

    if (progress < 1.0) {
      requestAnimationFrame(anim);
    } else {
      group.traverse((child) => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m) => {
            const orig = originalEmissives.get(m);
            if (orig && m.emissive) {
              m.emissive.copy(orig.color);
              m.emissiveIntensity = orig.intensity;
            }
          });
        }
      });
    }
  };
  requestAnimationFrame(anim);
}

function initRotationUIListeners() {
  document.getElementById('btn-rotate-left')?.addEventListener('click', (e) => {
    e.preventDefault();
    rotatePieceLeft();
  });
  document.getElementById('btn-rotate-right')?.addEventListener('click', (e) => {
    e.preventDefault();
    rotatePieceRight();
  });
  document.getElementById('btn-rotate-piece')?.addEventListener('click', (e) => {
    e.preventDefault();
    rotatePieceRight();
  });
  document.getElementById('btn-rotate-header')?.addEventListener('click', (e) => {
    e.preventDefault();
    rotatePieceRight();
  });
  document.getElementById('btn-blueprint-rotate')?.addEventListener('click', (e) => {
    e.preventDefault();
    rotatePieceRight();
  });
}
initRotationUIListeners();

// ── Continuous 3D Raycasting for Fluid Drag ─────────────────
function castContinuousDragRay(clientX, clientY, targetY = BASEPLATE_TOP_Y) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const surfaces = buildSurfaceMeshes();
  const hits = raycaster.intersectObjects(surfaces, false);

  if (hits.length > 0) {
    const hit = hits[0];
    let onBase = false;
    baseplateGroup.traverse((c) => { if (c === hit.object) onBase = true; });
    const surfaceY = onBase ? BASEPLATE_TOP_Y : hit.point.y;
    return {
      point: hit.point.clone(),
      surfaceY
    };
  }

  // Fallback construction plane at target socket height
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -targetY);
  const pt = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(plane, pt)) {
    pt.x = Math.max(-16, Math.min(16, pt.x));
    pt.z = Math.max(-16, Math.min(16, pt.z));
    return {
      point: pt,
      surfaceY: targetY
    };
  }
  return null;
}



// ── Ghost guide (Requirement 4: Clean 3D viewport without permanent green ghost overlays) ──
function updateGhostPreview(stepIdx = state.selectedStepIndex) {
  while (ghostContainer.children.length > 0) ghostContainer.remove(ghostContainer.children[0]);
  state.stageGhostGroup = null;

  if (!state.trainData || stepIdx == null) return;
  if (state.builtSteps.has(stepIdx)) { ghostContainer.visible = false; return; }

  const stepData = state.trainData.steps[stepIdx];
  if (!stepData) return;

  state.stageGhostGroup = createGhostStepPreview(stepData, state.trainData.trainGroup);
  ghostContainer.add(state.stageGhostGroup);
  // Keep 3D viewport clear of permanent green ghost overlays during normal play
  ghostContainer.visible = !!(state.ghostGuideEnabled && state.isDragging);
}

function toggleGhostGuide(forceState) {
  state.ghostGuideEnabled = typeof forceState === 'boolean' ? forceState : !state.ghostGuideEnabled;
  const btn = document.getElementById('btn-ghost-toggle');
  const label = document.getElementById('ghost-toggle-label');

  if (state.ghostGuideEnabled) {
    if (label) label.textContent = 'Ghost Guide: ON';
    btn?.classList.add('ghost-active');
    if (state.mode === 'train' && !state.builtSteps.has(state.selectedStepIndex)) {
      updateGhostPreview(state.selectedStepIndex);
      ghostContainer.visible = true;
    } else { ghostContainer.visible = false; }
  } else {
    if (label) label.textContent = 'Ghost Guide: OFF';
    btn?.classList.remove('ghost-active');
    ghostContainer.visible = false;
  }
  sounds.playPop();
  showToast(state.ghostGuideEnabled ? '👻 Ghost Guide: ON' : '👻 Ghost Guide: OFF');
}



// ── Shared tint helpers ─────────────────────────────────
function tintDragGroup(group, hex, emissiveHex, opacity) {
  group.traverse((child) => {
    if (!child.isMesh) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => {
      m.color.setHex(hex);
      if (m.emissive) { m.emissive.setHex(emissiveHex); m.emissiveIntensity = 0.7; }
      m.opacity = opacity; m.transparent = true;
    });
  });
}
function restoreDragGroupColors(group) {
  group.traverse((child) => {
    if (!child.isMesh || !child.userData.origColor) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => {
      m.color.copy(child.userData.origColor);
      if (m.emissive) { m.emissive.copy(child.userData.origEmissive); m.emissiveIntensity = child.userData.origEmissiveIntensity || 0.25; }
      m.opacity = child.userData.origOpacity;
      m.transparent = child.userData.origTransparent;
    });
  });
}

// ── Blueprint Alignment Checker (Requirement 2) ──
export function checkBlueprintAlignment(brickTarget, stepData) {
  if (!brickTarget || !stepData || !stepData.mountPos) return false;

  // 1. Quantized position within 1.0 unit of intended blueprint coordinate
  const dist = brickTarget.position.distanceTo(stepData.mountPos);
  if (dist > 1.0) return false;

  // 2. Y-rotation matches within ±5°
  const tolerance = (5 * Math.PI) / 180; // ±5° in radians (~0.087 rad)
  const normRot = ((brickTarget.rotation.y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const targetRot = (((stepData.targetRotationY || 0) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

  const angleDiff = (a, b) => {
    let diff = Math.abs(a - b) % (Math.PI * 2);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    return diff;
  };

  if (stepData.isSquareOrRound) {
    // 4-fold 90° rotational symmetry
    for (let i = 0; i < 4; i++) {
      if (angleDiff(normRot, (targetRot + i * (Math.PI / 2)) % (Math.PI * 2)) <= tolerance) {
        return true;
      }
    }
  } else {
    // Standard 2-fold 180° longitudinal symmetry for LEGO bricks
    if (angleDiff(normRot, targetRot) <= tolerance || angleDiff(normRot, (targetRot + Math.PI) % (Math.PI * 2)) <= tolerance) {
      return true;
    }
  }

  return false;
}

// ── 2. TRACK CURSOR TO BASEPLATE RAYCAST ──
export function onPointerMove(arg1, arg2 = null, arg3 = null, arg4 = null) {
  let clientX = 0;
  let clientY = 0;
  let explicitBrick = null;

  if (arg1 && typeof arg1 === 'object' && ('clientX' in arg1 || 'pointerId' in arg1)) {
    clientX = arg1.clientX;
    clientY = arg1.clientY;
    explicitBrick = (arg2 && arg2.isObject3D) ? arg2 : (arg3 && arg3.isObject3D ? arg3 : (arg4 && arg4.isObject3D ? arg4 : null));
  } else if (typeof arg1 === 'number') {
    clientX = arg1;
    clientY = typeof arg2 === 'number' ? arg2 : 0;
    if (arg4 && arg4.isObject3D) {
      explicitBrick = arg4;
    } else if (arg3 && arg3.isObject3D) {
      explicitBrick = arg3;
    } else if (arg2 && arg2.isObject3D) {
      explicitBrick = arg2;
    }
  }

  const draggedBrick = explicitBrick || state.activeDraggedPiece;
  if (!draggedBrick || !draggedBrick.position) return;

  if (state.isDragging && typeof clientX === 'number' && typeof clientY === 'number' && (clientX > 0 || clientY > 0)) {
    showFloatingRotateBtn(clientX, clientY);
  }

  mouse.x = (clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const targetSurfaces = [baseplateMesh, ...allOtherSceneBricks].filter(Boolean);
    const hits = raycaster.intersectObjects(targetSurfaces, true).filter((h) => {
    let curr = h.object;
    while (curr && curr !== scene) {
      if (curr === draggedBrick) return false;
      if (curr.userData?.isEnvironment) return false;
      curr = curr.parent;
    }
    return true;
  });

  if (hits.length > 0) {
    const p = hits[0].point;
    p.x = THREE.MathUtils.clamp(p.x, -4.5, 4.5);
    p.z = THREE.MathUtils.clamp(p.z, -3.5, 3.5);
    // Quantize to stud grid
    draggedBrick.position.x = Math.round(p.x / 0.8) * 0.8;
    draggedBrick.position.z = Math.round(p.z / 0.8) * 0.8;
    draggedBrick.position.y = hits[0].point.y + (draggedBrick.userData?.height || 0.32) / 2;
    draggedBrick.userData.isHoveringValidSurface = true;
    draggedBrick.userData.lastValidPos = draggedBrick.position.clone();
    draggedBrick.visible = true; // Show once valid raycast point is established
    updateDropShadow(draggedBrick.position, hits[0].point.y);
  } else {
    draggedBrick.userData.isHoveringValidSurface = false;
    // Fallback to ground plane Y = 0 while hovering off-board
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const pt = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(groundPlane, pt)) {
      pt.x = THREE.MathUtils.clamp(pt.x, -4.5, 4.5);
      pt.z = THREE.MathUtils.clamp(pt.z, -3.5, 3.5);
      draggedBrick.position.x = Math.round(pt.x / 0.8) * 0.8;
      draggedBrick.position.z = Math.round(pt.z / 0.8) * 0.8;
      draggedBrick.position.y = 0 + (draggedBrick.userData?.height || 0.32) / 2;
      draggedBrick.visible = true;
    }
    if (dragDropShadow) dragDropShadow.visible = false;
  }
}

export const updateDraggedBrickPosition = onPointerMove;
export const updateDraggedPiecePosition = onPointerMove;

// ── Continuous Pointer Move Listener ──
window.addEventListener('pointermove', (e) => {
  if (state.isDragging && state.activeDraggedPiece) {
    onPointerMove(e);
  } else if (!state.isDragging && allOtherSceneBricks.length > 0) {
    const rect = renderer.domElement.getBoundingClientRect();
    if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(allOtherSceneBricks, true);
      if (hits.length > 0) {
        let hitObj = hits[0].object;
        let root = hitObj.userData?.rootBrick;
        if (!root) {
          let curr = hitObj;
          while (curr && curr !== scene) {
            if (allOtherSceneBricks.includes(curr)) {
              root = curr;
              break;
            }
            curr = curr.parent;
          }
        }
        const stepIdx = root?.userData?.stepIndex ?? hitObj?.userData?.stepIndex;
        const isLocked =
          root?.userData?.isCorrectlyPlaced ||
          root?.userData?.isBlueprintAligned ||
          root?.userData?.isPermanentlyLocked ||
          hitObj?.userData?.isCorrectlyPlaced ||
          hitObj?.userData?.isBlueprintAligned ||
          hitObj?.userData?.isPermanentlyLocked ||
          (stepIdx !== undefined && stepIdx !== null && state.builtSteps.has(stepIdx));

        renderer.domElement.style.cursor = isLocked ? 'default' : (root ? 'grab' : 'default');
      } else {
        renderer.domElement.style.cursor = 'default';
      }
    }
  }
});

// Second-finger rotate (touch)
window.addEventListener('touchstart', (e) => {
  if (state.isDragging && e.touches.length === 2) {
    rotatePieceRight();
    e.preventDefault();
  }
}, { passive: false });

// Discrete 90° mouse wheel rotation during drag (debounced, no arbitrary angle spin)
let lastWheelRotateTime = 0;
window.addEventListener('wheel', (e) => {
  if (state.isDragging && state.activeDraggedPiece) {
    const now = performance.now();
    if (now - lastWheelRotateTime > 130) {
      lastWheelRotateTime = now;
      if (e.deltaY > 0) {
        rotatePieceRight();
      } else {
        rotatePieceLeft();
      }
    }
    e.preventDefault();
  }
}, { passive: false });

// ── 3. LOCK ONLY ON RELEASE (POINTERUP) ──
export function handlePieceRelease(clientXArg, clientYArg, e = null, explicitBrick = null) {
  let brickTarget = null;
  if (explicitBrick && explicitBrick.isObject3D) {
    brickTarget = explicitBrick;
  } else if (e && e.isObject3D) {
    brickTarget = e;
  } else {
    brickTarget = state.activeDraggedPiece;
  }

  if (!brickTarget) return;

  // Prevent double placement of the same brick instance
  if (brickTarget.userData?.isLockedInScene) return;

  if (!state.isDragging && !explicitBrick) return;

  const clientX = (e && typeof e.clientX === 'number') ? e.clientX : (typeof clientXArg === 'number' ? clientXArg : 0);
  const clientY = (e && typeof e.clientY === 'number') ? e.clientY : (typeof clientYArg === 'number' ? clientYArg : 0);

  // Immediately clear dragging state to prevent duplicate concurrent calls
  state.isDragging = false;
  state.activeDraggedPiece = null;
  state.draggingPieceGroup = null;

  // Requirement 4: Hide in-situ rotate controls on release
  hideFloatingRotateBtn();

  // Re-enable OrbitControls only if inspect view is active
  controls.enabled = state.isInspectViewActive;
  document.body.style.cursor = 'default';
  if (dragDropShadow) dragDropShadow.visible = false;

  // Check 1: Released back over tray?
  const isOverTray = isPointerOverTray(clientX, clientY);

  // Check 2: Raycast onto baseplate or placed bricks
  mouse.x = (clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const targets = [baseplateMesh, ...allOtherSceneBricks].filter(Boolean);
  const hits = raycaster.intersectObjects(targets, true).filter((h) => {
    let curr = h.object;
    while (curr && curr !== scene) {
      if (curr === brickTarget) return false;
      if (curr.userData?.isEnvironment) return false;
      curr = curr.parent;
    }
    return true;
  });

  const isValidHit = hits.length > 0;

  // If released back over the tray:
  // Discard piece from 3D scene and re-display its card in the tray (Requirement 1)
  if (isOverTray) {
    if (brickTarget.userData?.isExistingPlacedPiece) {
      scene.remove(brickTarget);
      sceneManager?.cancelFloatingDrag?.(brickTarget);
      const idx = allOtherSceneBricks.indexOf(brickTarget);
      if (idx !== -1) allOtherSceneBricks.splice(idx, 1);
      state.placedBricks = allOtherSceneBricks;
      sceneManager?.setPlacedBricks?.(allOtherSceneBricks);

      const stepIdx = brickTarget.userData?.stepIndex;
      if (stepIdx !== undefined && stepIdx !== null) {
        state.builtSteps.delete(stepIdx);
        const card = document.getElementById(`toy-card-${stepIdx}`);
        if (card) {
          card.classList.remove('placed', 'is-being-dragged');
          card.style.display = '';
          const pill = card.querySelector('.toy-qty-pill');
          if (pill) pill.textContent = 'x1';
          const overlay = card.querySelector('.toy-card-status-overlay');
          if (overlay) overlay.style.display = 'none';
          card.classList.add('tray-bounce');
          setTimeout(() => card.classList.remove('tray-bounce'), 450);
        }
        updateTrayProgress();
      }
      updateBrickCount();
      sounds.playPop();
      showToast('🗑️ Piece returned to tray');
      return;
    } else {
      // Piece came from tray: remove floating preview completely and unhide card
      scene.remove(brickTarget);
      sceneManager?.cancelFloatingDrag?.(brickTarget);
      brickTarget.userData.isLockedInScene = false;

      const stepIdx = brickTarget.userData?.stepIndex;
      if (stepIdx !== undefined && stepIdx !== null) {
        const card = document.getElementById(`toy-card-${stepIdx}`);
        if (card) {
          card.classList.remove('is-being-dragged');
          card.style.display = '';
        }
      }

      sounds.playPop();
      showToast('↩️ Drag cancelled — piece returned to tray');
      return;
    }
  }

  // If released outside the board in empty sky:
  if (!isValidHit) {
    if (brickTarget.userData?.isExistingPlacedPiece) {
      if (brickTarget.userData.originalPosition) {
        brickTarget.position.copy(brickTarget.userData.originalPosition);
      }
      brickTarget.userData.isLockedInScene = true;
      if (!allOtherSceneBricks.includes(brickTarget)) {
        allOtherSceneBricks.push(brickTarget);
      }
      state.placedBricks = allOtherSceneBricks;
      sceneManager?.setPlacedBricks?.(allOtherSceneBricks);
    } else {
      scene.remove(brickTarget);
      sceneManager?.cancelFloatingDrag?.(brickTarget);
      brickTarget.userData.isLockedInScene = false;
      const stepIdx = brickTarget.userData?.stepIndex;
      if (stepIdx !== undefined && stepIdx !== null) {
        const card = document.getElementById(`toy-card-${stepIdx}`);
        if (card) {
          card.classList.remove('is-being-dragged');
          card.style.display = '';
        }
      }
    }
    sounds.playPop();
    showToast('↩️ Placement cancelled');
    return;
  }

  // VALID PLACEMENT: released over baseplate or valid bricks
  const p = hits[0].point;
  brickTarget.position.x = Math.round(p.x / 0.8) * 0.8;
  brickTarget.position.z = Math.round(p.z / 0.8) * 0.8;
  brickTarget.position.y = hits[0].point.y + (brickTarget.userData?.height || 0.32) / 2;

  brickTarget.userData.isExistingPlacedPiece = true;
  brickTarget.userData.isLockedInScene = true;

  // Lock the brick at its current hovered (x, y, z) position
  if (!allOtherSceneBricks.includes(brickTarget)) {
    allOtherSceneBricks.push(brickTarget);
  }
  state.placedBricks = allOtherSceneBricks;
  sceneManager?.setPlacedBricks?.(allOtherSceneBricks);

  // 1. REMOVE / CONSUME USED PIECE FROM TRAY (Requirement 1)
  const stepIdx = brickTarget.userData?.stepIndex;
  const stepData = (stepIdx !== undefined && stepIdx !== null && state.trainData?.steps)
    ? state.trainData.steps[stepIdx]
    : null;

  if (stepIdx !== undefined && stepIdx !== null) {
    const card = document.getElementById(`toy-card-${stepIdx}`);
    if (card) {
      card.classList.remove('is-being-dragged');
      card.classList.add('placed');
      card.style.display = 'none'; // Consumed from tray!
      const overlay = card.querySelector('.toy-card-status-overlay');
      if (overlay) overlay.style.display = 'flex';
      const pill = card.querySelector('.toy-qty-pill');
      if (pill) pill.textContent = '✓';
      card.title = `${brickTarget.userData.title} — Placed!`;
    }
  }

  // 2. CHECK BLUEPRINT ALIGNMENT (Requirement 2)
  const isBlueprintAligned = stepData ? checkBlueprintAlignment(brickTarget, stepData) : false;

  if (isBlueprintAligned) {
    // Snap cleanly to exact blueprint coordinate and rotation so it locks perfectly
    if (stepData.mountPos) {
      brickTarget.position.copy(stepData.mountPos);
    }
    if (stepData.targetRotationY !== undefined) {
      brickTarget.rotation.y = stepData.targetRotationY;
    }

    // Permanently lock into place so the individual piece cannot be moved further
    brickTarget.userData.isBlueprintAligned = true;
    brickTarget.userData.isCorrectlyPlaced = true;
    brickTarget.userData.isPermanentlyLocked = true;
    brickTarget.userData.isLockedInScene = true;

    // a) Trigger bright gold/green starburst particle burst at connection point
    sceneManager?.popSparkleBurst?.(brickTarget.position);

    // b) Play click SFX placed in /music/ folder ONLY when two pieces are correctly placed
    sounds.playLegoPressed?.(1.0, 1.0);

    // c) Briefly pulse an emissive green highlight on the brick for 0.4 seconds before fading
    pulseEmissiveHighlight(brickTarget, 0x22c55e, 400);

    // d) Increment the blueprint stage progress counter
    if (stepIdx !== undefined && stepIdx !== null) {
      state.builtSteps.add(stepIdx);
      updateTrayProgress();

      const card = document.getElementById(`toy-card-${stepIdx}`);
      if (card) {
        card.style.display = 'none';
        card.classList.add('placed', 'locked');
        card.classList.remove('is-being-dragged');
        card.title = `${brickTarget.userData.title} — Correctly Placed & Locked!`;
      }
    }

    navigator.vibrate?.([20, 30, 20]);
    showToast(`⭐ Click! ${brickTarget.userData?.title || 'Piece'} is correctly aligned & locked in place!`);
  } else {
    // Placed in a freeform sandbox location (unaligned):
    // No sound played - click SFX plays ONLY when pieces are correctly placed

    // If it was previously marked built, remove it from builtSteps since it's no longer aligned
    if (stepIdx !== undefined && stepIdx !== null && state.builtSteps.has(stepIdx)) {
      state.builtSteps.delete(stepIdx);
      updateTrayProgress();
    }

    navigator.vibrate?.([25]);
    showToast(`🧱 Placed ${brickTarget.userData?.title || 'brick'} (Sandbox Grid)`);
  }

  // Visual squash/stretch bounce
  sceneManager?.lockFloatingDrag?.(brickTarget);
  sceneManager?.triggerSquashAndStretch?.(brickTarget);

  updateBrickCount();
}

// Backwards compatibility alias
export const handleBrickRelease = handlePieceRelease;

// Global pointerup fallback
window.addEventListener('pointerup', (e) => {
  if (state.isDragging && state.activeDraggedPiece && !state.activeDraggedPiece.userData?.isLockedInScene) {
    handleBrickRelease(e.clientX, e.clientY);
  }
});

// Cancel / blur → abort drag cleanly and spring back
window.addEventListener('pointercancel', () => {
  studHighlightGroup.visible = false;
  dragDropShadow.visible = false;
  hideFloatingRotateBtn();
  if (state.isDragging) {
    if (state.draggingPieceGroup) {
      animateReturnToTray(state.draggingPieceGroup, state.draggedStepIndex, 250);
      state.draggingPieceGroup = null;
    }
    state.isDragging = false;
    controls.enabled = state.isInspectViewActive;
  }
});

// ── Smooth Elastic Spring-Back to Bottom Tray Slot (0.25s / 250ms) ───────────
function animateReturnToTray(pieceGroup, stepIdx, duration = 250) {
  if (!pieceGroup) return;

  dragDropShadow.visible = false;
  studHighlightGroup.visible = false;
  if (!state.ghostGuideEnabled) {
    ghostContainer.visible = false;
  }

  const startPos = pieceGroup.position.clone();
  const startScale = pieceGroup.scale.clone();
  const targetPos = new THREE.Vector3(startPos.x * 0.35, -1.2, startPos.z + 5.5);

  const startTime = performance.now();

  const anim = setInterval(() => {
    const elapsed = performance.now() - startTime;
    const t = Math.min(1.0, elapsed / duration);
    const ease = 1 - Math.pow(1 - t, 2.5); // Smooth elastic ease-out

    pieceGroup.position.lerpVectors(startPos, targetPos, ease);
    const s = Math.max(0.05, 1.0 - t * 0.9);
    pieceGroup.scale.set(startScale.x * s, startScale.y * s, startScale.z * s);

    pieceGroup.traverse((c) => {
      if (c.isMesh && c.material) {
        const mats = Array.isArray(c.material) ? c.material : [c.material];
        mats.forEach((m) => {
          m.transparent = true;
          m.opacity = Math.max(0, 1.0 - t * 1.3);
        });
      }
    });

    if (t >= 1.0) {
      clearInterval(anim);
      scene.remove(pieceGroup);

      const card = document.getElementById(`toy-card-${stepIdx}`);
      if (card) {
        card.classList.remove('is-being-dragged');
        card.classList.add('tray-bounce');
        setTimeout(() => card.classList.remove('tray-bounce'), 450);
      }
      sounds.playPop();
    }
  }, 16);
}

// =========================================================
// 3. SNAP-TO-BUILD MECHANIC (WITHIN SNAP RADIUS) (Requirement 3)
// =========================================================
function lockPieceIntoPlace(stepIdx, looseMeshToRemove = null) {
  const stepData = state.trainData.steps[stepIdx];
  const stepCells = occupancyGrid.getCellsForStep(stepData, stepData.mountPos);

  // Thorough cleanup of looseMeshToRemove
  if (looseMeshToRemove) {
    const root = looseMeshToRemove.userData?.rootBrick || looseMeshToRemove;
    if (root.parent) root.parent.remove(root);
    if (looseMeshToRemove.parent && looseMeshToRemove.parent !== root.parent) {
      looseMeshToRemove.parent.remove(looseMeshToRemove);
    }
    scene.remove(root);
    scene.remove(looseMeshToRemove);

    const pos = allOtherSceneBricks.indexOf(root);
    if (pos !== -1) allOtherSceneBricks.splice(pos, 1);
    const pos2 = allOtherSceneBricks.indexOf(looseMeshToRemove);
    if (pos2 !== -1) allOtherSceneBricks.splice(pos2, 1);

    if (state.activeDraggedPiece === root || state.activeDraggedPiece === looseMeshToRemove) {
      sceneManager?.cancelFloatingDrag?.(state.activeDraggedPiece);
      state.activeDraggedPiece = null;
      state.isDragging = false;
    }
  }

  // Clean up any scattered loose physics body for this piece if present
  if (physicsWorld?.looseBricks) {
    for (let i = physicsWorld.looseBricks.length - 1; i >= 0; i--) {
      const b = physicsWorld.looseBricks[i];
      if (b.stepIdx === stepIdx || b.meshGroup === looseMeshToRemove || b.meshGroup?.userData?.rootBrick === looseMeshToRemove) {
        if (b.body) physicsWorld.world.removeBody(b.body);
        if (b.meshGroup) {
          if (b.meshGroup.parent) b.meshGroup.parent.remove(b.meshGroup);
          scene.remove(b.meshGroup);
        }
        physicsWorld.looseBricks.splice(i, 1);
      }
    }
    updateCleanUpBanner?.();
  }

  // Clean up any unaligned loose playfield meshes corresponding to this step
  const toRemove = [];
  allOtherSceneBricks.forEach((b) => {
    if (b && (b.userData?.stepIndex === stepIdx || b === looseMeshToRemove || b.userData?.rootBrick === looseMeshToRemove) && !b.userData?.isPermanentlyLocked && !b.userData?.isCorrectlyPlaced) {
      toRemove.push(b);
    }
  });
  toRemove.forEach((b) => {
    if (b.parent) b.parent.remove(b);
    scene.remove(b);
    const idx = allOtherSceneBricks.indexOf(b);
    if (idx !== -1) allOtherSceneBricks.splice(idx, 1);
  });

  if (brickWorldManager && brickWorldManager.dynamicPhysicsBricks) {
    const dynIdx = brickWorldManager.dynamicPhysicsBricks.findIndex(
      (b) => b.mesh === looseMeshToRemove || b.mesh?.userData?.stepIndex === stepIdx
    );
    if (dynIdx !== -1) {
      const dyn = brickWorldManager.dynamicPhysicsBricks[dynIdx];
      if (dyn.body) brickWorldManager.world.removeBody(dyn.body);
      if (dyn.mesh) {
        if (dyn.mesh.parent) dyn.mesh.parent.remove(dyn.mesh);
        scene.remove(dyn.mesh);
      }
      brickWorldManager.dynamicPhysicsBricks.splice(dynIdx, 1);
    }
  }
  state.placedBricks = allOtherSceneBricks;
  sceneManager?.setPlacedBricks?.(allOtherSceneBricks);

  // Hide active drop shadow
  dragDropShadow.visible = false;

  // Remove dragging proxy group
  if (state.draggingPieceGroup) {
    scene.remove(state.draggingPieceGroup);
    state.draggingPieceGroup = null;
  }

  // Remove ghost outline & hide ghostContainer and stud highlights
  while (ghostContainer.children.length > 0) {
    ghostContainer.remove(ghostContainer.children[0]);
  }
  state.stageGhostGroup = null;
  ghostContainer.visible = false;
  studHighlightGroup.visible = false;


  // Make real train meshes visible
  stepData.meshes.forEach((mesh) => {
    mesh.visible = true;
    // 5. AUDIO & HAPTIC REWARD: Trigger 0.08-second squash-and-stretch scale bounce (scale: 1.0 -> 1.08 -> 1.0)
    sceneManager.triggerSquashAndStretch(mesh);
  });

  // Sound: Punchy, satisfying plastic click sound ("clack!")
  sounds.playClack();
  sounds.playPlasticThwackSnap();

  // Haptic feedback
  navigator.vibrate?.([35]);

  // Pop a tiny star/sparkle particle burst (Requirement 3: quick puff of star particles)
  sceneManager.popSparkleBurst(stepData.mountPos);

  // Burst of snap dust/sparks
  for (let i = 0; i < 4; i++) {
    steamParticles.emitPuff(0, 0.45, 0.4);
  }

  // Mark step complete
  state.builtSteps.add(stepIdx);

  // 6. REFACTOR PARTS TRAY (Requirement 6): Decrement circular red quantity badge on snap and fade out with scale-down pop animation when exhausted
  decrementCardBadge(stepIdx, () => {
    updateBrickCount();
    updateTrayProgress();
    renderToyPartsTray();
  });

  // Register occupied cells in 3D Voxel Grid
  occupancyGrid.register('step_' + stepIdx, stepCells, {
    type: 'train_step',
    stepIndex: stepIdx,
    shortTitle: stepData.shortTitle || stepData.title
  });

  // Register in BrickWorldManager 3D Voxel Occupancy Map
  if (brickWorldManager) {
    const targetVoxel = brickWorldManager.worldToVoxel(stepData.mountPos);
    const dims = stepData.dimensions || { studsX: 2, studsZ: 4, platesY: 3 };
    const isRotated = Math.abs(Math.sin(stepData.targetRotationY || 0)) > 0.7;
    const studsX = isRotated ? (dims.studsZ || 2) : (dims.studsX || 2);
    const studsZ = isRotated ? (dims.studsX || 2) : (dims.studsZ || 2);
    const platesY = dims.platesY || 1;
    const startX = -Math.floor(studsX / 2);
    const startZ = -Math.floor(studsZ / 2);
    for (let dy = 0; dy < platesY; dy++) {
      for (let dx = 0; dx < studsX; dx++) {
        for (let dz = 0; dz < studsZ; dz++) {
          brickWorldManager.occupancyGrid.set(
            `${targetVoxel.gx + startX + dx},${targetVoxel.gy + dy},${targetVoxel.gz + startZ + dz}`,
            `step_${stepIdx}`
          );
        }
      }
    }
  }

  showToast(`✨ Locked ${stepData.shortTitle || stepData.title} into place!`);

  // Check if current stage bag is completed (Requirement 2)
  const currentStageObj = ASSEMBLY_STAGES[state.currentStage - 1] || ASSEMBLY_STAGES[0];
  const isStageComplete = currentStageObj.stepIndices.every((idx) => state.builtSteps.has(idx));

  if (isStageComplete) {
    if (state.currentStage < 4) {
      // Fanfare audio and celebratory confetti for completing a stage bag!
      sounds.playFanfare();
      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.65 }
        });
      } catch (_) {}

      const completedStageId = state.currentStage;
      state.currentStage++;

      showToast(`🎉 Bag ${completedStageId} Complete! Unpacking Bag ${state.currentStage}: ${ASSEMBLY_STAGES[state.currentStage - 1].name}!`);

      // Slide in the next stage's tray
      const track = document.getElementById('toy-tray-track');
      if (track) {
        track.classList.remove('slide-in-stage');
        void track.offsetWidth; // trigger reflow
        track.classList.add('slide-in-stage');
      }

      // Auto-select first piece in the new stage
      const nextStageObj = ASSEMBLY_STAGES[state.currentStage - 1];
      const nextPiece = nextStageObj.stepIndices.find((idx) => !state.builtSteps.has(idx));
      if (nextPiece !== undefined) {
        selectStep(nextPiece);
      }
    } else {
      // Final piece in Stage 4 completed!
      updateBrickCount();
      updateTrayProgress();
      renderToyPartsTray();
      updateStepHUD();
      setTimeout(() => triggerTrainCompleted(), 400);
      return;
    }
  } else {
    // Select next unbuilt piece in current stage
    const nextPiece = currentStageObj.stepIndices.find((idx) => !state.builtSteps.has(idx));
    if (nextPiece !== undefined) {
      selectStep(nextPiece);
    }
  }

  updateBrickCount();
  updateTrayProgress();
  renderToyPartsTray();
  updateStepHUD();
}

// =========================================================
// 3B. PHYSICAL HARD STOP COLLISION REJECTION (Requirement 3)
// =========================================================
function rejectPlacementDueToCollision(stepIdx) {
  const stepData = state.trainData?.steps?.[stepIdx];

  // 1. Play blunt plastic collision knock sound
  sounds.playCollisionKnock();

  // 2. Mobile haptic feedback: [60, 40, 60] (Requirement 3)
  navigator.vibrate?.([60, 40, 60]);

  // 3. Visual shake on the card in the tray
  const card = document.getElementById(`toy-card-${stepIdx}`);
  if (card) {
    card.classList.add('shake');
    setTimeout(() => card.classList.remove('shake'), 450);
  }

  // 4. Physical bump/wiggle animation (deflect upward by +0.5 units, shake left/right)
  if (state.draggingPieceGroup) {
    const piece = state.draggingPieceGroup;
    const startPos = piece.position.clone();
    const targetPos = new THREE.Vector3(startPos.x, startPos.y - 3.5, startPos.z + 4.0);
    const startTime = performance.now();
    const duration = 380; // ms

    const bumpInterval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1.0, elapsed / duration);

      // Phase 1 (0 -> 0.35): upward bump deflection (+0.5 units)
      // Phase 2 (0.35 -> 1.0): return piece smoothly down towards tray
      let currentY;
      let currentZ;
      if (t < 0.35) {
        const p1 = t / 0.35;
        const bumpY = Math.sin(p1 * (Math.PI / 2)) * 0.5;
        currentY = startPos.y + bumpY;
        currentZ = startPos.z;
      } else {
        const p2 = (t - 0.35) / 0.65;
        currentY = THREE.MathUtils.lerp(startPos.y + 0.5, targetPos.y, p2 * p2);
        currentZ = THREE.MathUtils.lerp(startPos.z, targetPos.z, p2);
      }

      // Left/right physical impact rattle shake
      const shakeDecay = Math.pow(1 - t, 1.5);
      const shakeX = Math.sin(t * 45) * shakeDecay * 0.45;

      piece.position.set(startPos.x + shakeX, currentY, currentZ);

      if (t >= 1.0) {
        clearInterval(bumpInterval);
        scene.remove(piece);
        state.draggingPieceGroup = null;
      }
    }, 16);
  }

  // Restore ghost preview for active piece according to toggle
  if (state.ghostGuideEnabled && !state.builtSteps.has(stepIdx)) {
    updateGhostPreview(stepIdx);
    ghostContainer.visible = true;
  } else {
    ghostContainer.visible = false;
  }

  state.isDraggedColliding = false;
  showToast('⚠️ Blocked: Space Occupied! Brick cannot overlap existing pieces.');
}

// =========================================================
// 4. MISMATCH / INVALID PLACEMENT (VIBRATE & REJECT) (Requirement 4)
// =========================================================
function rejectPiecePlacement(stepIdx) {
  const stepData = state.trainData.steps[stepIdx];

  // Sound: dull plastic tap/rejection sound
  sounds.playReject();

  // Haptic Vibration: [40, 50, 40]
  navigator.vibrate?.([40, 50, 40]);

  // Visual Shake on the card in the tray
  const card = document.getElementById(`toy-card-${stepIdx}`);
  if (card) {
    card.classList.add('shake');
    setTimeout(() => card.classList.remove('shake'), 320);
  }

  // Visual shake & glide back on the 3D dragged piece
  if (state.draggingPieceGroup) {
    const piece = state.draggingPieceGroup;
    const startPos = piece.position.clone();
    const startTime = performance.now();
    const duration = 280;

    // Glide down towards bottom of screen
    const targetPos = new THREE.Vector3(startPos.x, startPos.y - 3.5, startPos.z + 4.0);

    const glideInterval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1.0, elapsed / duration);

      // Wiggle offset left-to-right (±8px equivalent in 3D: ±0.35)
      const wiggle = Math.sin(t * 35) * (1 - t) * 0.45;
      piece.position.lerpVectors(startPos, targetPos, t);
      piece.position.x += wiggle;

      if (t >= 1.0) {
        clearInterval(glideInterval);
        scene.remove(piece);
        state.draggingPieceGroup = null;
      }
    }, 16);
  }

  // Restore ghost preview for active piece according to toggle
  if (state.ghostGuideEnabled && !state.builtSteps.has(stepIdx)) {
    updateGhostPreview(stepIdx);
    ghostContainer.visible = true;
  } else {
    ghostContainer.visible = false;
  }

  showToast('Bring the piece near the train until it magnetically snaps!');
}

// =========================================================
// 4B. TRAY RETURN (GUIDED BUILD FLOW - NO LOOSE DROPS)
// =========================================================
function dropLooseBrick(stepIdx) {
  if (state.draggingPieceGroup) {
    animateReturnToTray(state.draggingPieceGroup, stepIdx);
    state.draggingPieceGroup = null;
  }
}

function updateCleanUpBanner() {
  const banner = document.getElementById('cleanup-tray-banner');
  if (banner) banner.style.display = 'none';
}


// =========================================================
// 5. STEP SELECTION & INSPECTOR UPDATE
// =========================================================
function selectStep(stepIdx) {
  if (!state.trainData) return;
  const steps = state.trainData.steps;
  if (stepIdx < 0 || stepIdx >= steps.length) return;

  state.selectedStepIndex = stepIdx;
  const stepData = steps[stepIdx];

  // Sync active stage if selecting a step from a different stage
  const stageForStep = ASSEMBLY_STAGES.find((s) => s.stepIndices.includes(stepIdx));
  if (stageForStep && stageForStep.id !== state.currentStage) {
    state.currentStage = stageForStep.id;
    renderToyPartsTray();
  }

  // Keep in-scene ghost container clean (no spoon-fed arrows or green silhouettes)
  ghostContainer.visible = false;

  // Update Sleek Step HUD & Blueprint card
  updateStepHUD(stepIdx);

  // Load into 3D mini turntable if available
  if (piecePreviewViewer) {
    piecePreviewViewer.loadStep(stepData);
  }

  // Highlight card in tray
  document.querySelectorAll('.toy-card').forEach((card) => {
    card.classList.remove('active');
    const cIdx = parseInt(card.dataset.stepIndex, 10);
    if (cIdx === stepIdx) {
      card.classList.add('active');
    }
  });
}

function getNextUnbuiltStep(currentIdx) {
  const total = state.trainData.steps.length;
  for (let i = 1; i <= total; i++) {
    const idx = (currentIdx + i) % total;
    if (!state.builtSteps.has(idx)) return idx;
  }
  return null;
}

// Disassemble Step Action (Requirement 4: Removal & Disassembly Sync)
function disassembleStep(stepIdx) {
  if (!state.trainData) return;
  const stepData = state.trainData.steps[stepIdx];

  stepData.meshes.forEach((m) => {
    m.visible = false;
  });

  state.builtSteps.delete(stepIdx);

  // Free cells in 3D Voxel Occupancy Grid so space becomes buildable again
  occupancyGrid.unregister('step_' + stepIdx);

  // Free cells in BrickWorldManager occupancy map
  if (brickWorldManager) {
    for (const [key, ownerId] of brickWorldManager.occupancyGrid.entries()) {
      if (ownerId === `step_${stepIdx}` || ownerId === stepIdx) {
        brickWorldManager.occupancyGrid.delete(key);
      }
    }
  }

  sounds.playSnap();

  for (let i = 0; i < 4; i++) {
    steamParticles.emitPuff(0, 0.35, 0.4);
  }

  const card = document.getElementById(`toy-card-${stepIdx}`);
  if (card) {
    card.classList.remove('placed');
    const overlay = card.querySelector('.toy-card-status-overlay');
    if (overlay) overlay.style.display = 'none';
    const pill = card.querySelector('.toy-qty-pill');
    if (pill) pill.textContent = 'x1';
  }

  updateBrickCount();
  updateTrayProgress();
  selectStep(stepIdx);
  showToast(`Removed ${stepData.shortTitle || stepData.title}. Space freed!`);
}



// Instant Complete Train (Registers all pieces in Occupancy Grid)
function instantCompleteTrain() {
  if (!state.trainData) return;

  // Clear previous occupancy and re-register all completed steps
  occupancyGrid.clear();

  state.trainData.steps.forEach((step, idx) => {
    state.builtSteps.add(idx);
    step.meshes.forEach((m) => {
      m.visible = true;
    });
    const card = document.getElementById(`toy-card-${idx}`);
    if (card) card.classList.add('placed');

    const stepCells = occupancyGrid.getCellsForStep(step, step.mountPos);
    occupancyGrid.register('step_' + idx, stepCells, {
      type: 'train_step',
      stepIndex: idx,
      shortTitle: step.shortTitle || step.title
    });
  });

  while (ghostContainer.children.length > 0) {
    ghostContainer.remove(ghostContainer.children[0]);
  }
  state.stageGhostGroup = null;
  ghostContainer.visible = false;

  updateBrickCount();
  updateTrayProgress();
  selectStep(state.selectedStepIndex);
  triggerTrainCompleted();
}

// =========================================================
// AUTO-BUILD CURRENT STEP (Stuck Helper)
// Uses existing loose piece on playfield if available, or tray piece!
// Builds ONLY the current/next single step, not the whole build!
// =========================================================
let isAutoBuildingStep = false;
let activeMagneticFlight = null;
let lastAutoBuildTime = 0;

// Helper to determine the step index for any scene piece or mesh
export function getPieceStepIndex(obj) {
  if (!obj) return undefined;

  // 1. Direct stepIndex on userData
  const directIdx = obj.userData?.stepIndex;
  if (typeof directIdx === 'number' && !isNaN(directIdx)) return directIdx;

  if (typeof obj.stepIdx === 'number' && !isNaN(obj.stepIdx)) return obj.stepIdx;

  // 2. stepNumber or step (1-based)
  const stepNum = obj.userData?.stepNumber ?? obj.userData?.step;
  if (typeof stepNum === 'number' && !isNaN(stepNum)) return stepNum - 1;

  // 3. itemData inspection
  const itemData = obj.userData?.itemData;
  if (itemData) {
    if (typeof itemData === 'number') return itemData;
    if (typeof itemData.stepIndex === 'number') return itemData.stepIndex;
    if (typeof itemData.stepData?.stepIndex === 'number') return itemData.stepData.stepIndex;
    if (typeof itemData.stepData?.step === 'number') return itemData.stepData.step - 1;
    if (typeof itemData.step === 'number') return itemData.step - 1;
    if (typeof itemData.stepNumber === 'number') return itemData.stepNumber - 1;
  }

  // 4. Check rootBrick if obj is a child
  if (obj.userData?.rootBrick && obj.userData.rootBrick !== obj) {
    const rootIdx = getPieceStepIndex(obj.userData.rootBrick);
    if (rootIdx !== undefined) return rootIdx;
  }

  // 5. Traverse children for stepIndex
  if (obj.children && obj.children.length > 0) {
    for (const child of obj.children) {
      if (typeof child.userData?.stepIndex === 'number') return child.userData.stepIndex;
      if (typeof child.userData?.step === 'number') return child.userData.step - 1;
    }
  }

  // 6. Match title or shortTitle against train steps
  const title = obj.userData?.title || obj.userData?.itemData?.title || obj.userData?.itemData?.shortTitle;
  if (title && state.trainData?.steps) {
    const idx = state.trainData.steps.findIndex(s => s.title === title || s.shortTitle === title);
    if (idx !== -1) return idx;
  }

  return undefined;
}

// Scan playfield for unaligned / loose pieces that have been placed on the floor/tracks/board
export function getPlayfieldLoosePieces() {
  const loose = new Set();

  function isLooseCandidate(obj) {
    if (!obj || !obj.isObject3D) return false;
    // Exclude core groups and UI helpers
    if (obj === state.trainData?.trainGroup || obj.name === 'trainAssemblyGroup') return false;
    if (obj === ghostContainer || obj === studHighlightGroup || obj === dragDropShadow) return false;

    // Exclude anything that is an ancestor or descendant of trainGroup
    if (state.trainData?.trainGroup) {
      let curr = obj;
      while (curr) {
        if (curr === state.trainData.trainGroup) return false;
        curr = curr.parent;
      }
    }

    // Exclude room/environment geometry
    const name = obj.name || '';
    if (name === 'baseplate' || name === 'toyRug' || name === 'woodenFloor' || name.includes('track') || name.includes('Sky') || name.includes('Light')) {
      return false;
    }

    // Must not be already locked/correctly placed
    if (obj.userData?.isPermanentlyLocked || obj.userData?.isCorrectlyPlaced || obj.userData?.isBlueprintAligned) {
      return false;
    }

    // If it's a train step that is already marked built, it should be treated as stale/removed
    const sIdx = getPieceStepIndex(obj);
    if (sIdx !== undefined && state.builtSteps?.has(sIdx)) {
      return false;
    }

    return true;
  }

  // 1. Check allOtherSceneBricks
  if (Array.isArray(allOtherSceneBricks)) {
    allOtherSceneBricks.forEach((b) => {
      if (b && isLooseCandidate(b)) {
        const root = b.userData?.rootBrick || b;
        if (isLooseCandidate(root)) loose.add(root);
      }
    });
  }

  // 2. Check scene.children
  if (scene?.children) {
    scene.children.forEach((c) => {
      if (c && isLooseCandidate(c)) {
        if (c.userData?.isSceneBrick || c.userData?.isExistingPlacedPiece || c.userData?.isTrainStep || c.userData?.rootBrick) {
          const root = c.userData?.rootBrick || c;
          if (isLooseCandidate(root)) loose.add(root);
        }
      }
    });
  }

  // 3. Check activeDraggedPiece
  if (state.activeDraggedPiece && isLooseCandidate(state.activeDraggedPiece)) {
    const root = state.activeDraggedPiece.userData?.rootBrick || state.activeDraggedPiece;
    if (isLooseCandidate(root)) loose.add(root);
  }

  // 4. Check physicsWorld.looseBricks
  if (physicsWorld?.looseBricks) {
    physicsWorld.looseBricks.forEach((item) => {
      if (item?.meshGroup && isLooseCandidate(item.meshGroup)) {
        const root = item.meshGroup.userData?.rootBrick || item.meshGroup;
        if (isLooseCandidate(root)) loose.add(root);
      }
    });
  }

  // 5. Check brickWorldManager.dynamicPhysicsBricks
  if (brickWorldManager?.dynamicPhysicsBricks) {
    brickWorldManager.dynamicPhysicsBricks.forEach((item) => {
      if (item?.mesh && isLooseCandidate(item.mesh)) {
        const root = item.mesh.userData?.rootBrick || item.mesh;
        if (isLooseCandidate(root)) loose.add(root);
      }
    });
  }

  return Array.from(loose).filter((obj) => obj && (obj.parent || obj === state.activeDraggedPiece));
}

// Magnetic flight animation from playfield location to train mount coordinates
function animatePieceToMount(looseMesh, targetPos, targetRotY = 0, onComplete) {
  if (!looseMesh || !targetPos) {
    if (onComplete) onComplete();
    return null;
  }

  const startPos = looseMesh.position.clone();
  const startRotY = looseMesh.rotation.y;
  const destPos = targetPos.clone();
  const destRotY = targetRotY !== undefined ? targetRotY : 0;

  const dist = startPos.distanceTo(destPos);
  const arcLift = Math.max(0.9, Math.min(2.8, dist * 0.28));
  const startTime = performance.now();
  const duration = 240; // 240ms magnetic glide

  let rafId = null;
  let isFinished = false;

  const flightController = {
    finish() {
      if (isFinished) return;
      isFinished = true;
      if (rafId) cancelAnimationFrame(rafId);
      looseMesh.position.copy(destPos);
      looseMesh.rotation.y = destRotY;
      if (onComplete) onComplete();
    }
  };

  // Audio: Pop on magnetic lift
  try {
    sounds.playPop(1.15, 0.4);
  } catch (_) {}

  function step(now) {
    if (isFinished) return;
    const elapsed = now - startTime;
    const t = Math.min(1.0, elapsed / duration);
    // Smooth easeInOutCubic curve
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    looseMesh.position.x = THREE.MathUtils.lerp(startPos.x, destPos.x, ease);
    looseMesh.position.z = THREE.MathUtils.lerp(startPos.z, destPos.z, ease);
    const baseY = THREE.MathUtils.lerp(startPos.y, destPos.y, ease);
    looseMesh.position.y = baseY + Math.sin(ease * Math.PI) * arcLift;

    looseMesh.rotation.y = THREE.MathUtils.lerp(startRotY, destRotY, ease);

    if (t < 1.0) {
      rafId = requestAnimationFrame(step);
    } else {
      isFinished = true;
      looseMesh.position.copy(destPos);
      looseMesh.rotation.y = destRotY;
      if (activeMagneticFlight === flightController) {
        activeMagneticFlight = null;
      }
      if (onComplete) onComplete();
    }
  }

  rafId = requestAnimationFrame(step);
  return flightController;
}

export function autoBuildCurrentStep() {
  const now = performance.now();
  if (now - lastAutoBuildTime < 60) {
    // Debounce duplicate triggers from event bubbling within 60ms
    return;
  }
  lastAutoBuildTime = now;

  // If a piece is already gliding mid-flight, immediately finish it so this new click snaps the next piece
  if (activeMagneticFlight) {
    activeMagneticFlight.finish();
    activeMagneticFlight = null;
  }

  if (!state.trainData || !state.trainData.steps) {
    showToast('⚠️ Workshop is still loading, please wait...');
    return;
  }

  if (state.isTrainComplete || state.builtSteps.size >= state.trainData.steps.length) {
    showToast('🎉 The locomotive is already fully built! Toot toot! 🚂');
    return;
  }

  try {
    // If user is currently in builder mode or inspect mode, return cleanly to train workshop
    if (state.mode !== 'train') {
      switchMode('train');
    }

    // Cancel any active floating drag piece to prevent conflicts
    if (state.activeDraggedPiece) {
      scene.remove(state.activeDraggedPiece);
      sceneManager?.cancelFloatingDrag?.(state.activeDraggedPiece);
      state.activeDraggedPiece = null;
    }
    if (state.draggingPieceGroup) {
      scene.remove(state.draggingPieceGroup);
      state.draggingPieceGroup = null;
    }
    state.isDragging = false;

    // Clean up any orphan unaligned loose pieces that belong to already completed steps
    allOtherSceneBricks.slice().forEach((b) => {
      const idx = getPieceStepIndex(b);
      if (idx !== undefined && state.builtSteps.has(idx) && !b.userData?.isCorrectlyPlaced && !b.userData?.isBlueprintAligned) {
        if (b.parent) b.parent.remove(b);
        scene.remove(b);
        const pos = allOtherSceneBricks.indexOf(b);
        if (pos !== -1) allOtherSceneBricks.splice(pos, 1);
      }
    });

    // Play a gentle cheerful tap sound
    try {
      sounds.playPop();
    } catch (_) {}

    // Bouncy tactile animation on helper buttons
    const stuckBtn = document.getElementById('btn-stuck-step');
    const trayAutoBtn = document.getElementById('btn-tray-autobuild');
    if (stuckBtn) {
      stuckBtn.classList.add('clicked');
      setTimeout(() => stuckBtn.classList.remove('clicked'), 220);
    }
    if (trayAutoBtn) {
      trayAutoBtn.classList.add('clicked');
      setTimeout(() => trayAutoBtn.classList.remove('clicked'), 220);
    }

    // 1. GATHER ALL UNALIGNED PIECES LYING ON THE PLAYFIELD
    const playfieldLoose = getPlayfieldLoosePieces();

    // Helper to find next unbuilt step
    function findNextUnbuiltStep() {
      // 1. Current selected step if unbuilt
      if (state.selectedStepIndex !== null && state.selectedStepIndex !== undefined && !state.builtSteps.has(state.selectedStepIndex)) {
        return state.selectedStepIndex;
      }
      // 2. Next unbuilt step in current stage
      const currentStageObj = ASSEMBLY_STAGES[state.currentStage - 1] || ASSEMBLY_STAGES[0];
      const inStage = currentStageObj.stepIndices.find((idx) => !state.builtSteps.has(idx));
      if (inStage !== undefined) return inStage;
      // 3. Next unbuilt step across any stage
      for (let s = 0; s < ASSEMBLY_STAGES.length; s++) {
        const stage = ASSEMBLY_STAGES[s];
        const unbuilt = stage.stepIndices.find((idx) => !state.builtSteps.has(idx));
        if (unbuilt !== undefined) return unbuilt;
      }
      // 4. Fallback scan through all steps
      for (let i = 0; i < state.trainData.steps.length; i++) {
        if (!state.builtSteps.has(i)) return i;
      }
      return null;
    }

    let targetStep = null;
    let targetLooseMesh = null;

    if (playfieldLoose.length > 0) {
      // Sort playfield loose pieces so they snap ONE BY ONE sequentially:
      // Priority 0: selected step
      // Priority 1: current stage unbuilt steps
      // Priority 2: any other unbuilt steps (lowest stepIndex first)
      // Priority 3: pieces without stepIndex (will map to next unbuilt step)
      const currentStageObj = ASSEMBLY_STAGES[state.currentStage - 1] || ASSEMBLY_STAGES[0];

      playfieldLoose.sort((a, b) => {
        const idxA = getPieceStepIndex(a);
        const idxB = getPieceStepIndex(b);

        function getScore(idx) {
          if (idx !== undefined && idx === state.selectedStepIndex && !state.builtSteps.has(idx)) return 0;
          if (idx !== undefined && !state.builtSteps.has(idx) && currentStageObj.stepIndices.includes(idx)) return 10 + idx;
          if (idx !== undefined && !state.builtSteps.has(idx)) return 100 + idx;
          return 500;
        }

        const scoreA = getScore(idxA);
        const scoreB = getScore(idxB);
        if (scoreA !== scoreB) return scoreA - scoreB;
        if (idxA !== undefined && idxB !== undefined) return idxA - idxB;
        return 0;
      });

      // Pick the top loose piece lying on the playfield to snap on this click
      targetLooseMesh = playfieldLoose[0];
      const resolvedIdx = getPieceStepIndex(targetLooseMesh);

      if (resolvedIdx !== undefined && !state.builtSteps.has(resolvedIdx)) {
        targetStep = resolvedIdx;
      } else {
        // If piece had no stepIndex or duplicate of built step, pair it with the next unbuilt step!
        targetStep = findNextUnbuiltStep();
      }
    } else {
      // No pieces lying on playfield — build next unbuilt step from tray!
      targetLooseMesh = null;
      targetStep = findNextUnbuiltStep();
    }

    if (targetStep === null || targetStep === undefined) {
      triggerTrainCompleted();
      return;
    }

    // If the target step belongs to another stage, sync currentStage and tray
    const targetStageObj = ASSEMBLY_STAGES.find((st) => st.stepIndices.includes(targetStep));
    if (targetStageObj && targetStageObj.id !== state.currentStage) {
      state.currentStage = targetStageObj.id;
      document.querySelectorAll('.tray-tab').forEach((tab) => {
        const stageNum = parseInt(tab.dataset.stage, 10);
        tab.classList.toggle('active', stageNum === state.currentStage);
        tab.setAttribute('aria-selected', stageNum === state.currentStage ? 'true' : 'false');
      });
      renderToyPartsTray();
    }

    const stepData = state.trainData.steps[targetStep];
    const pieceName = stepData?.shortTitle || stepData?.title || `Piece #${targetStep + 1}`;

    const finalizePlacement = () => {
      // Execute single step placement with all tactile rewards (clack sound, squash bounce, sparkles, particles)
      lockPieceIntoPlace(targetStep, targetLooseMesh);

      // Check remaining loose pieces lying on the playfield
      const remainingLoose = getPlayfieldLoosePieces();
      const remainingCount = remainingLoose.length;

      // Locate next unbuilt step and select it so the player immediately sees what to build next
      const nextUnbuilt = findNextUnbuiltStep();
      if (nextUnbuilt !== null && nextUnbuilt !== undefined) {
        selectStep(nextUnbuilt);
      }

      if (targetLooseMesh) {
        if (remainingCount > 0) {
          showToast(`🪄 Snapped piece: ${pieceName}! (${remainingCount} more loose on field)`);
        } else {
          showToast(`🪄 Snapped playfield piece: Placed ${pieceName}! Playfield clear ✨`);
        }
      } else {
        showToast(`🪄 Magic Auto-Snap: Placed ${pieceName}!`);
      }

      updateBrickCount();
      updateTrayProgress();
      renderToyPartsTray();
    };

    // If existing piece is lying on the playfield, animate it gliding smoothly to mount position!
    if (targetLooseMesh && stepData.mountPos) {
      activeMagneticFlight = animatePieceToMount(targetLooseMesh, stepData.mountPos, stepData.targetRotationY, () => {
        activeMagneticFlight = null;
        finalizePlacement();
      });
    } else {
      finalizePlacement();
    }
  } catch (err) {
    console.error('Error during autoBuildCurrentStep:', err);
    activeMagneticFlight = null;
  }
}

// Backwards-compatible alias for any callers
export const toggleAutoBuild = autoBuildCurrentStep;

// Celebration on Completion (Requirement 5)
function triggerTrainCompleted() {
  state.isTrainComplete = true;

  if (state.autoBuildInterval) {
    clearInterval(state.autoBuildInterval);
    state.autoBuildInterval = null;
  }

  // a) Fade all guides into high-gloss ABS colors with subtle edge outlines
  if (state.trainData && state.trainData.trainGroup) {
    sceneManager.finishTrainHighGloss(state.trainData.trainGroup);
  }

  // b) Auto-rotate the camera around the completed caboose
  controls.autoRotate = true;
  controls.autoRotateSpeed = 2.0;

  // Burst of steam puffs from the chimney
  for (let i = 0; i < 20; i++) {
    setTimeout(() => {
      steamParticles.emitPuff(0, 3.2, 1.2);
    }, i * 65);
  }

  sounds.playFanfare();

  try {
    confetti({
      particleCount: 160,
      spread: 100,
      origin: { y: 0.6 }
    });
    setTimeout(() => {
      confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 } });
    }, 350);
  } catch (e) { }

  const modal = document.getElementById('celebration-modal');
  if (modal) modal.showModal();

  // c) Activate the top "Drive Train" mode: show whistle and chug along the rails
  setTimeout(() => {
    switchMode('drive');
    state.targetSpeed = 1.0;
    state.driveSpeed = 0.6;
    sounds.startChug(240);
    showToast('🚂 All 4 Bags Assembled! Chugging along rails — tap whistle to blow horn!');
  }, 1200);
}

function resetTrainBuild() {
  if (state.autoBuildInterval) {
    clearInterval(state.autoBuildInterval);
    state.autoBuildInterval = null;
  }

  // Remove all placed bricks from scene
  allOtherSceneBricks.forEach((brick) => {
    scene.remove(brick);
    brick.traverse((c) => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
        else c.material.dispose();
      }
    });
  });
  allOtherSceneBricks.length = 0;
  state.placedBricks = allOtherSceneBricks;

  if (state.trainData?.steps) {
    state.trainData.steps.forEach((s) => {
      s.meshes.forEach((m) => (m.visible = false));
    });
  }

  state.builtSteps.clear();
  state.isTrainComplete = false;
  controls.autoRotate = false;

  // Requirement 1 & 2: Ensure Inspect Mode is cleanly reset and camera locked
  if (state.isInspectViewActive) {
    setCameraInspectMode(false, true);
  } else {
    controls.enabled = false;
  }

  // 1. LEOCAD DEFAULT ISOMETRIC CAMERA ANGLE:
  // - Camera type: PerspectiveCamera (FOV: 42, near: 0.1, far: 1000).
  // - Set default camera position: camera.position.set(22, 16, 28).
  // - Set target / lookAt center: controls.target.set(0, 1.2, 0); camera.lookAt(0, 1.2, 0).
  camera.fov = 42;
  camera.near = 0.1;
  camera.far = 1000;
  camera.updateProjectionMatrix();
  camera.position.set(22, 16, 28);
  controls.target.set(0, 1.2, 0);
  camera.lookAt(0, 1.2, 0);
  controls.update();

  updateBrickCount();
  renderToyPartsTray();
  sounds.playPop();
  showToast('🔄 Scene & Camera reset to LeoCAD Isometric perspective!');
}

// =========================================================
// 6. DIRECT 3D SCENE PICKING (Requirement 2b)
// =========================================================
let clickPointerDownPos = { x: 0, y: 0 };
renderer.domElement.addEventListener('pointerdown', (e) => {
  clickPointerDownPos = { x: e.clientX, y: e.clientY };
  if (state.isDragging) return;
  if (e.button !== 0 && e.pointerType === 'mouse') return;

  // Requirement 3: When Inspect View is active, dragging pieces from scene is disabled.
  // OrbitControls handles turntable rotation gestures unobstructed.
  if (state.isInspectViewActive) return;

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  // 2b) Direct 3D Scene Picking: Clicking/touching ANY already-placed piece in 3D scene
  if (allOtherSceneBricks.length > 0) {
    const hits = raycaster.intersectObjects(allOtherSceneBricks, true);
    if (hits.length > 0) {
      let hitObj = hits[0].object;
      let root = hitObj.userData?.rootBrick;
      if (!root) {
        let curr = hitObj;
        while (curr && curr !== scene) {
          if (allOtherSceneBricks.includes(curr)) {
            root = curr;
            break;
          }
          curr = curr.parent;
        }
      }

      if (root && allOtherSceneBricks.includes(root)) {
        const stepIdx = root?.userData?.stepIndex ?? hitObj?.userData?.stepIndex;
        const isCorrectlyAligned =
          root?.userData?.isCorrectlyPlaced ||
          root?.userData?.isBlueprintAligned ||
          root?.userData?.isPermanentlyLocked ||
          hitObj?.userData?.isCorrectlyPlaced ||
          hitObj?.userData?.isBlueprintAligned ||
          hitObj?.userData?.isPermanentlyLocked ||
          (stepIdx !== undefined && stepIdx !== null && state.builtSteps.has(stepIdx));

        if (isCorrectlyAligned) {
          // Locked in place - cannot be moved further!
          pulseEmissiveHighlight(root, 0x38bdf8, 300);
          showToast(`🔒 ${root.userData?.title || 'Piece'} is locked in place!`);
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        startDirectScenePick(root, e.clientX, e.clientY);
        return;
      }
    }
  }
});

// Requirement 3: Tapping a piece in Inspect View automatically locks the camera again so piece positioning remains stable
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!state.isInspectViewActive) return;
  const dist = Math.hypot(e.clientX - clickPointerDownPos.x, e.clientY - clickPointerDownPos.y);
  if (dist < 8) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    if (allOtherSceneBricks.length > 0) {
      const hits = raycaster.intersectObjects(allOtherSceneBricks, true);
      if (hits.length > 0) {
        setCameraInspectMode(false);
      }
    }
  }
});

// Wire Manual Rotation ('Q', 'E', 'R', Space, and Rotate Buttons) (Requirement 4)
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (e.code === 'KeyQ' || e.key === 'q' || e.key === 'Q') {
    e.preventDefault();
    rotatePieceLeft();
    return;
  }

  if (e.code === 'KeyE' || e.key === 'e' || e.key === 'E' || e.code === 'KeyR' || e.key === 'r' || e.key === 'R' || e.code === 'Space') {
    e.preventDefault();
    rotatePieceRight();
    return;
  }

  // Delete / Backspace: Discard active dragged piece back to tray (Requirement 1)
  if ((e.code === 'Delete' || e.code === 'Backspace') && state.isDragging && state.activeDraggedPiece) {
    e.preventDefault();
    const dragged = state.activeDraggedPiece;
    const stepIdx = dragged.userData?.stepIndex;

    scene.remove(dragged);
    sceneManager?.cancelFloatingDrag?.(dragged);
    const idx = allOtherSceneBricks.indexOf(dragged);
    if (idx !== -1) allOtherSceneBricks.splice(idx, 1);
    state.placedBricks = allOtherSceneBricks;
    sceneManager?.setPlacedBricks?.(allOtherSceneBricks);

    state.isDragging = false;
    state.activeDraggedPiece = null;
    state.draggingPieceGroup = null;
    controls.enabled = state.isInspectViewActive;
    document.body.style.cursor = 'default';
    if (dragDropShadow) dragDropShadow.visible = false;

    if (stepIdx !== undefined && stepIdx !== null) {
      state.builtSteps.delete(stepIdx);
      const card = document.getElementById(`toy-card-${stepIdx}`);
      if (card) {
        card.classList.remove('placed', 'is-being-dragged');
        card.style.display = '';
        const pill = card.querySelector('.toy-qty-pill');
        if (pill) pill.textContent = 'x1';
        const overlay = card.querySelector('.toy-card-status-overlay');
        if (overlay) overlay.style.display = 'none';
        card.classList.add('tray-bounce');
        setTimeout(() => card.classList.remove('tray-bounce'), 450);
      }
      updateTrayProgress();
    }
    updateBrickCount();
    sounds.playPop?.();
    showToast('🗑️ Returned piece to tray');
  }
});

// UI HUD Rotate Left (-90°) Button
document.getElementById('btn-rotate-left')?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  rotatePieceLeft();
});

// UI HUD Rotate Right (+90°) Button
document.getElementById('btn-rotate-right')?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  rotatePieceRight();
});

// Inspector & Floating Rotate Buttons
document.getElementById('floating-rotate-btn')?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  rotatePieceRight();
});

document.getElementById('btn-blueprint-rotate')?.addEventListener('click', (e) => {
  e.preventDefault();
  rotatePieceRight();
});

document.getElementById('btn-rotate-header')?.addEventListener('click', (e) => {
  e.preventDefault();
  rotatePieceRight();
});

renderer.domElement.addEventListener('pointerup', (e) => {
  const dist = Math.hypot(e.clientX - clickPointerDownPos.x, e.clientY - clickPointerDownPos.y);
  if (dist > 5) return; // Dragged camera

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  if (state.mode === 'train') {
    // Tap loose brick -> Smoothly springs back to [In Tray]
    if (brickWorldManager && brickWorldManager.dynamicPhysicsBricks.length > 0) {
      const looseMeshes = brickWorldManager.dynamicPhysicsBricks.map((b) => b.mesh);
      const looseHits = raycaster.intersectObjects(looseMeshes, true);
      if (looseHits.length > 0) {
        let curr = looseHits[0].object;
        while (curr && !curr.userData?.looseItem && curr.parent) {
          curr = curr.parent;
        }
        const item = curr?.userData?.looseItem;
        if (item) {
          brickWorldManager.springBackToTray(item, (loose) => {
            const card = document.getElementById(`toy-card-${loose.stepIdx}`);
            if (card) {
              card.classList.remove('is-being-dragged');
              card.classList.add('tray-bounce');
              setTimeout(() => card.classList.remove('tray-bounce'), 450);
            }
            sounds.playPop();
            showToast('✨ Brick returned to tray!');
          });
          return;
        }
      }
    }

    // 1. Click on active Ghost -> Snap that piece (only if ghost guide is visible)
    if (ghostContainer.visible && state.stageGhostGroup) {
      const ghostHits = raycaster.intersectObjects(state.stageGhostGroup.children, true);
      if (ghostHits.length > 0) {
        lockPieceIntoPlace(state.selectedStepIndex);
        return;
      }
    }

    // 2. Click on placed brick -> Inspect & show Remove button
    if (state.trainData && state.trainData.trainGroup) {
      const visibleMeshes = [];
      state.trainData.trainGroup.traverse((child) => {
        if (child.isMesh && child.visible && child.userData && child.userData.isTrainMesh) {
          visibleMeshes.push(child);
        }
      });

      const meshHits = raycaster.intersectObjects(visibleMeshes, false);
      if (meshHits.length > 0) {
        const stepIdx = meshHits[0].object.userData.stepIndex;
        if (stepIdx !== undefined) {
          selectStep(stepIdx);
          sounds.playSnap();
          return;
        }
      }
    }
  } else if (state.mode === 'builder') {
    handleFreeBuildClick();
  }
});

// =========================================================
// 7. WORKSHOP CAMERA RESET & NAVIGATION
// =========================================================
// Home Button in Top HUD: returns to Home Screen
document.getElementById('btn-home')?.addEventListener('click', () => {
  try { sounds.playPop?.(); } catch (_) {}
  transitionToHome();
});

document.getElementById('btn-restart-build')?.addEventListener('click', resetTrainBuild);

// Wire Top and Floating Stuck Helper Buttons
const triggerAutoBuildStep = (e) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  autoBuildCurrentStep();
};

document.getElementById('btn-stuck-step')?.addEventListener('click', triggerAutoBuildStep);
document.getElementById('btn-tray-autobuild')?.addEventListener('click', triggerAutoBuildStep);
document.getElementById('btn-auto-build')?.addEventListener('click', triggerAutoBuildStep);

// Document-level event delegation backup: catches clicks on inner icon/label or dynamically rendered elements
document.addEventListener('click', (e) => {
  const target = e.target.closest('#btn-stuck-step, .toy-stuck-btn, #btn-tray-autobuild, .auto-build-btn, #btn-auto-build');
  if (target) {
    e.preventDefault();
    e.stopPropagation();
    autoBuildCurrentStep();
  }
});

// =========================================================
// 7B. CRASH / DEMOLISH & REBUILD (Requirement 3)
// =========================================================
function toggleCrashDemolish() {
  if (physicsWorld.isCrashed) {
    // Rebuild Train & Placed Bricks
    showToast('🔧 Rebuilding structure with magnetic snap...');
    physicsWorld.rebuildCrashedTrain(scene, sounds, steamParticles, () => {
      updateCrashButtonUI(false);
      updateSimulateButtonUI(false);
      showToast('✨ Structure fully rebuilt and ready!');
    });
  } else {
    // Crash Train and/or Free Placed Bricks
    const hasTrainSteps = state.trainData && state.builtSteps.size > 0;
    const hasPlacedBricks = state.placedBricks && state.placedBricks.length > 0;

    if (!hasTrainSteps && !hasPlacedBricks) {
      showToast('Build or place at least one piece before triggering Crash / Disassemble!');
      return;
    }
    const crashed = physicsWorld.crashDisassemble({
      trainData: state.trainData,
      builtSteps: state.builtSteps,
      placedBricks: state.placedBricks,
      scene,
      sounds,
      steamParticles
    });
    if (crashed) {
      updateCrashButtonUI(true);
      updateSimulateButtonUI(true);
      showToast('💥 Bricks crashed! Scattered with rigid-body physics.');
    }
  }
}

function toggleSimulatePhysics() {
  if (physicsWorld.isCrashed) {
    // Rebuild collapsed bricks
    showToast('🔧 Rebuilding structure with magnetic snap...');
    physicsWorld.rebuildCrashedTrain(scene, sounds, steamParticles, () => {
      updateCrashButtonUI(false);
      updateSimulateButtonUI(false);
      showToast('✨ Structure restored!');
    });
  } else {
    if (state.placedBricks.length === 0) {
      showToast('Place at least one brick in Free Builder to test physics & stability!');
      return;
    }
    const simulated = physicsWorld.simulateFreeBricks({
      placedBricks: state.placedBricks,
      scene,
      sounds,
      steamParticles
    });
    if (simulated) {
      updateCrashButtonUI(true);
      updateSimulateButtonUI(true);
      showToast('🎲 Physics active! Earth gravity toppled the unstable cantilever.');
    }
  }
}

function updateSimulateButtonUI(isSimulating) {
  const btn = document.getElementById('btn-simulate-physics');
  if (!btn) return;
  btn.classList.toggle('active', isSimulating);
}

function updateCrashButtonUI(isCrashed) {
  const btn = document.getElementById('btn-crash-toggle');
  const icon = document.getElementById('crash-btn-icon');
  const label = document.getElementById('crash-btn-label');
  if (!btn) return;

  if (isCrashed) {
    btn.classList.add('is-crashed');
    if (icon) icon.textContent = '🔧';
    if (label) label.textContent = 'Rebuild Bricks';
    btn.title = 'Rewind physics and snap bricks back together';
  } else {
    btn.classList.remove('is-crashed');
    if (icon) icon.textContent = '💥';
    if (label) label.textContent = 'Crash / Disassemble';
    btn.title = 'Realistic Rigid-Body Demolish / Crash';
  }
}

document.getElementById('btn-crash-toggle')?.addEventListener('click', toggleCrashDemolish);
document.getElementById('btn-simulate-physics')?.addEventListener('click', toggleSimulatePhysics);

// Return Loose Bricks to Tray Button
document.getElementById('btn-cleanup-bricks')?.addEventListener('click', () => {
  if (brickWorldManager && brickWorldManager.dynamicPhysicsBricks.length > 0) {
    const looseList = [...brickWorldManager.dynamicPhysicsBricks];
    looseList.forEach((item) => {
      brickWorldManager.springBackToTray(item, (loose) => {
        const card = document.getElementById(`toy-card-${loose.stepIdx}`);
        if (card) {
          card.classList.remove('is-being-dragged');
          card.classList.remove('is-dropped-loose');
          card.classList.add('tray-bounce');
          setTimeout(() => card.classList.remove('tray-bounce'), 450);
        }
      });
    });
  }

  physicsWorld.cleanUpLooseBricks(sounds, (cleanedIndices) => {
    cleanedIndices.forEach((sIdx) => {
      const card = document.getElementById(`toy-card-${sIdx}`);
      if (card) card.classList.remove('is-dropped-loose');
    });
    updateCleanUpBanner();
    showToast('🧹 Cleaned up loose bricks! Returned to parts tray.');
  });
});

// Guided vs Free Pick
const btnFlowGuided = document.getElementById('btn-flow-guided');
const btnFlowFreePick = document.getElementById('btn-flow-freepick');
const stepperNavRow = document.getElementById('stepper-nav-row');

btnFlowGuided?.addEventListener('click', () => {
  state.buildFlow = 'guided';
  btnFlowGuided.classList.add('active');
  btnFlowFreePick.classList.remove('active');
  if (stepperNavRow) stepperNavRow.style.display = 'grid';
  showToast('Guided Order active: Step sequentially through the parts.');
});

btnFlowFreePick?.addEventListener('click', () => {
  state.buildFlow = 'freepick';
  btnFlowFreePick.classList.add('active');
  btnFlowGuided.classList.remove('active');
  if (stepperNavRow) stepperNavRow.style.display = 'none';
  showToast('Free Pick active: Drag or select any component in any order!');
});

// Mode Switcher
function switchMode(newMode) {
  state.mode = newMode;

  const btnTrain = document.getElementById('btn-train-mode');
  const btnBuilder = document.getElementById('btn-builder-mode');
  const btnDrive = document.getElementById('btn-drive-mode');
  const stepHUD = document.getElementById('step-progress-hud');
  const toyTray = document.getElementById('toy-parts-tray');
  const builderTray = document.getElementById('builder-tray-container');
  const driveHUD = document.getElementById('drive-hud-container');

  [btnTrain, btnBuilder, btnDrive].forEach((b) => b?.classList.remove('active'));

  if (newMode === 'train') {
    btnTrain?.classList.add('active');
    if (stepHUD) stepHUD.style.display = 'flex';
    if (toyTray) toyTray.style.display = 'flex';
    if (builderTray) builderTray.style.display = 'none';
    if (driveHUD) driveHUD.style.display = 'none';
    if (scenicRailwayGroup) scenicRailwayGroup.visible = false;
    if (builderGhostGroup) builderGhostGroup.visible = false;
    if (trainBuildMatGroup) trainBuildMatGroup.visible = true;

    state.trainZ = 0;
    if (state.trainData && state.trainData.trainGroup) {
      state.trainData.trainGroup.position.set(0, 0, 0);
    }

    ghostContainer.visible = false;

    sounds.stopChug();
    showToast('Build Mode: Drag current layer pieces from the tray onto the train!');
  } else if (newMode === 'builder') {
    btnBuilder?.classList.add('active');
    if (stepHUD) stepHUD.style.display = 'none';
    if (toyTray) toyTray.style.display = 'none';
    if (builderTray) builderTray.style.display = 'flex';
    if (driveHUD) driveHUD.style.display = 'none';
    if (scenicRailwayGroup) scenicRailwayGroup.visible = false;
    if (trainBuildMatGroup) trainBuildMatGroup.visible = false;

    state.trainZ = 0;
    if (state.trainData && state.trainData.trainGroup) {
      state.trainData.trainGroup.position.set(0, 0, 0);
    }

    ghostContainer.visible = false;

    sounds.stopChug();
    showToast('Free Builder: Pick bricks below and click on the plate to place!');
  } else if (newMode === 'drive') {
    btnDrive?.classList.add('active');
    if (stepHUD) stepHUD.style.display = 'none';
    if (toyTray) toyTray.style.display = 'none';
    if (builderTray) builderTray.style.display = 'none';
    if (driveHUD) driveHUD.style.display = 'flex';
    if (scenicRailwayGroup) scenicRailwayGroup.visible = true;
    if (builderGhostGroup) builderGhostGroup.visible = false;
    if (trainBuildMatGroup) trainBuildMatGroup.visible = false;

    ghostContainer.visible = false;

    if (state.trainData && state.builtSteps.size < state.trainData.steps.length) {
      instantCompleteTrain();
    }
    showToast('Drive Mode: Use throttle buttons below or press Space for whistle!');
  }
}

document.getElementById('btn-train-mode')?.addEventListener('click', () => switchMode('train'));
document.getElementById('btn-builder-mode')?.addEventListener('click', () => switchMode('builder'));
document.getElementById('btn-drive-mode')?.addEventListener('click', () => switchMode('drive'));

// Ghost Guide toggle (Requirement 2)
document.getElementById('btn-ghost-toggle')?.addEventListener('click', () => {
  toggleGhostGuide();
});

// Background Music toggle (90% Tempo)
document.getElementById('btn-music-toggle')?.addEventListener('click', () => {
  const isEnabled = sounds.toggleMusic();
  showToast(isEnabled ? '🎵 Background Music: ON' : '🔇 Background Music: OFF');
});

// Continuous background music is disabled for now - only game sound effects remain active

// Sound toggle
document.getElementById('btn-sound-toggle')?.addEventListener('click', () => {
  const isMuted = sounds.toggleMute();
  const icon = document.getElementById('sound-icon');
  const label = document.getElementById('sound-label');
  if (icon) icon.textContent = isMuted ? '🔇' : '🔊';
  if (label) label.textContent = isMuted ? 'Muted' : 'Sound';
  showToast(isMuted ? 'Sound muted.' : 'Sound unmuted.');
});

// Celebration dialog
document.getElementById('btn-start-driving')?.addEventListener('click', () => {
  document.getElementById('celebration-modal')?.close();
  switchMode('drive');
});
document.getElementById('btn-celebration-horn')?.addEventListener('click', () => {
  sounds.playHorn();
  for (let i = 0; i < 8; i++) {
    setTimeout(() => steamParticles.emitPuff(0, 3.2, 1.2), i * 50);
  }
  showToast('📢 TOOT TOOT! Steam whistle sounding!');
});
document.getElementById('btn-close-celebration')?.addEventListener('click', () => {
  document.getElementById('celebration-modal')?.close();
});

// =========================================================
// 8. FREE BUILDER & DRIVE CONTROLS
// =========================================================
function handleFreeBuildClick() {
  const hits = raycaster.intersectObjects([baseplateGroup, ...state.placedBricks], true).filter((h) => !h.object.userData?.isEnvironment);
  if (hits.length === 0) return;

  const hit = hits[0];

  // 1. Demolish Mode Check (Requirement 4: Removal Sync)
  if (state.isDemolishMode) {
    let hitBrick = null;
    let curr = hit.object;
    while (curr && curr !== scene) {
      if (state.placedBricks.includes(curr)) {
        hitBrick = curr;
        break;
      }
      curr = curr.parent;
    }
    if (hitBrick) {
      demolishFreeBrick(hitBrick);
      return;
    }
  }

  const point = hit.point;
  const snapX = Math.round(point.x);
  const snapZ = Math.round(point.z);

  const brickDef = BRICK_TYPES[state.selectedPiece] || BRICK_TYPES['brick-2x4'];
  const colorHex = LEGO_COLORS[state.selectedColor]?.threeHex || 0xd91e18;

  // Exact surface Y calculation:
  let surfaceY = BASEPLATE_TOP_Y;
  let hitPlacedBrick = null;
  let curr = hit.object;
  while (curr && curr !== scene) {
    if (state.placedBricks.includes(curr)) {
      hitPlacedBrick = curr;
      break;
    }
    curr = curr.parent;
  }
  if (hitPlacedBrick) {
    const hitBox = new THREE.Box3().setFromObject(hitPlacedBrick);
    surfaceY = hitBox.max.y;
    const bodyP = hitPlacedBrick.children?.find((c) => c.isMesh && c.geometry?.parameters?.height)?.geometry?.parameters;
    if (bodyP) {
      surfaceY = hitPlacedBrick.position.y + bodyP.height / 2;
    }
  }

  const snapY = surfaceY + brickDef.height / 2;

  // 2. Occupancy Grid Collision Check (Requirements 1, 2, 3)
  const candidateCells = occupancyGrid.getCellsForFreeBrick(
    brickDef,
    new THREE.Vector3(snapX, snapY, snapZ),
    state.pieceRotation
  );

  const collision = occupancyGrid.checkCollision(candidateCells);
  if (collision.isColliding) {
    sounds.playCollisionKnock();
    navigator.vibrate?.([60, 40, 60]);
    showToast('⚠️ Blocked: Space Occupied! Brick cannot overlap existing pieces.');
    return;
  }

  // 3. Support & Real-time Physics Verification (Earth Gravity Check)
  const isSupported = occupancyGrid.hasSupportUnderneath(
    brickDef,
    new THREE.Vector3(snapX, snapY, snapZ),
    state.pieceRotation
  );

  const mat = createPlasticMaterial(colorHex);
  const mesh = brickDef.createMesh(mat);
  mesh.position.set(snapX, snapY, snapZ);
  mesh.rotation.y = state.pieceRotation;

  if (!isSupported) {
    // Unsupported in mid-air! Real physics drops and bounces the piece
    scene.add(mesh);
    physicsWorld.spawnLooseFallingBrick(mesh, null, scene, sounds, { isFreeBrick: true, brickDef });
    updateCleanUpBanner();
    sounds.playLegoFalled(1.0);
    showToast('⚠️ Unsupported brick! Earth gravity dropped it to the ground.');
    return;
  }

  // 4. Stable: Place brick and register in occupancy grid
  const brickId = `free_brick_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  mesh.userData = {
    isFreeBrick: true,
    brickId,
    name: brickDef.name
  };

  scene.add(mesh);
  state.placedBricks.push(mesh);

  occupancyGrid.register(brickId, candidateCells, {
    type: 'free_brick',
    brickId,
    name: brickDef.name
  });

  showToast(`Placed ${brickDef.name}! Press 'P' to simulate stability.`);
}

function demolishFreeBrick(mesh) {
  const idx = state.placedBricks.indexOf(mesh);
  if (idx !== -1) {
    state.placedBricks.splice(idx, 1);
  }
  if (mesh.userData && mesh.userData.brickId) {
    occupancyGrid.unregister(mesh.userData.brickId);
  }
  scene.remove(mesh);
  sounds.playSnap();
  for (let i = 0; i < 4; i++) {
    steamParticles.emitPuff(0, 0.4, 0.3);
  }
  showToast('Brick demolished! Space freed.');
}

function undoFreeBuild() {
  if (state.placedBricks.length === 0) {
    showToast('No bricks to undo.');
    return;
  }
  const lastBrick = state.placedBricks.pop();
  if (lastBrick.userData && lastBrick.userData.brickId) {
    occupancyGrid.unregister(lastBrick.userData.brickId);
  }
  scene.remove(lastBrick);
  sounds.playSnap();
  showToast('Undid brick placement. Space freed.');
}

function toggleDemolishMode() {
  state.isDemolishMode = !state.isDemolishMode;
  const btn = document.getElementById('btn-demolish-mode');
  if (btn) btn.classList.toggle('active', state.isDemolishMode);
  document.body.style.cursor = state.isDemolishMode ? 'crosshair' : 'default';
  showToast(state.isDemolishMode ? '🔨 Demolish Mode: Click any placed brick to remove it.' : '🧱 Build Mode active.');
}

function initColorPalette() {
  const paletteContainer = document.getElementById('color-palette');
  if (!paletteContainer) return;
  paletteContainer.innerHTML = '';

  Object.entries(LEGO_COLORS).forEach(([key, colorObj]) => {
    const swatch = document.createElement('button');
    swatch.className = `color-swatch-btn ${key === state.selectedColor ? 'active' : ''}`;
    swatch.style.backgroundColor = colorObj.hex;
    swatch.title = colorObj.name;
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch-btn').forEach((b) => b.classList.remove('active'));
      swatch.classList.add('active');
      state.selectedColor = key;
    });
    paletteContainer.appendChild(swatch);
  });
}
initColorPalette();

const pieceBtns = document.querySelectorAll('.piece-btn');
pieceBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    pieceBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.selectedPiece = btn.dataset.piece;
  });
});

const throttleBtns = document.querySelectorAll('.throttle-btn');
throttleBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    throttleBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    const speed = parseFloat(btn.dataset.speed);
    state.targetSpeed = speed;

    if (Math.abs(speed) > 0.05) {
      const tempo = speed > 1.5 ? 160 : speed > 0.5 ? 260 : 340;
      sounds.startChug(tempo);
    } else {
      sounds.stopChug();
    }
  });
});

const hornBtn = document.getElementById('btn-horn-whistle');
if (hornBtn) {
  hornBtn.addEventListener('click', () => {
    sounds.playWhistle();
    steamParticles.emitPuff(state.driveSpeed, 1.6, 2.5);
  });
}

const camFollowBtn = document.getElementById('btn-cam-follow');
if (camFollowBtn) {
  camFollowBtn.addEventListener('click', () => {
    state.followCamera = !state.followCamera;
    camFollowBtn.classList.toggle('active', state.followCamera);
    showToast(state.followCamera ? 'Camera: Tracking Locomotive' : 'Camera: Free Orbit');
  });
}

// Free Builder Toolbar Buttons (Rotate, Demolish, Undo)
document.getElementById('btn-rotate-piece')?.addEventListener('click', () => {
  rotatePiece90();
});
document.getElementById('btn-demolish-mode')?.addEventListener('click', toggleDemolishMode);
document.getElementById('btn-undo-action')?.addEventListener('click', () => {
  if (state.mode === 'builder') {
    undoFreeBuild();
  } else if (state.mode === 'train' && state.builtSteps.size > 0) {
    const builtArray = Array.from(state.builtSteps);
    const lastBuilt = builtArray[builtArray.length - 1];
    disassembleStep(lastBuilt);
  }
});

// =========================================================
// 9. UNIFIED KEYBOARD SHORTCUTS
// =========================================================
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  // 1. Undo (Ctrl+Z or Cmd+Z)
  if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault();
    if (state.mode === 'builder') {
      undoFreeBuild();
    } else if (state.mode === 'train' && state.builtSteps.size > 0) {
      const builtArray = Array.from(state.builtSteps);
      const lastBuilt = builtArray[builtArray.length - 1];
      disassembleStep(lastBuilt);
    }
    return;
  }

  // 2. Rotate Left (-90°): Q or [
  if (e.key === 'q' || e.key === 'Q' || e.key === '[') {
    e.preventDefault();
    rotatePieceLeft();
    return;
  }

  // 3. Rotate Right (+90°): E, R, or ]
  if (e.key === 'e' || e.key === 'E' || e.key === 'r' || e.key === 'R' || e.key === ']') {
    e.preventDefault();
    rotatePieceRight();
    return;
  }

  // 3b. Key A or B: Auto-Build Current Step (Stuck helper)
  if (!state.isDragging && (e.key === 'a' || e.key === 'A' || e.key === 'b' || e.key === 'B')) {
    e.preventDefault();
    autoBuildCurrentStep();
    return;
  }

  // 4. Space Bar (Rotate Right during drag/builder, or auto-build / whistle)
  if (e.code === 'Space') {
    e.preventDefault();
    if (state.mode === 'train') {
      if (state.isDragging) {
        rotatePieceRight();
      } else {
        autoBuildCurrentStep();
      }
    } else if (state.mode === 'builder') {
      rotatePieceRight();
    } else if (state.mode === 'drive') {
      sounds.playWhistle();
      steamParticles.emitPuff(state.driveSpeed, 1.6, 2.5);
    }
    return;
  }

  // 5. Arrow Keys: Rotate when dragging or in builder; navigate steps in train mode
  if (e.code === 'ArrowLeft') {
    if (state.isDragging || state.mode === 'builder') {
      e.preventDefault();
      rotatePieceLeft();
    } else if (state.mode === 'train' && state.selectedStepIndex > 0) {
      e.preventDefault();
      selectStep(state.selectedStepIndex - 1);
    }
    return;
  }

  if (e.code === 'ArrowRight') {
    if (state.isDragging || state.mode === 'builder') {
      e.preventDefault();
      rotatePieceRight();
    } else if (state.mode === 'train' && state.trainData && state.selectedStepIndex < state.trainData.steps.length - 1) {
      e.preventDefault();
      selectStep(state.selectedStepIndex + 1);
    }
    return;
  }

  // 6. Parts Tray Rummage Scrolling (A / D)
  if (e.key === 'a' || e.key === 'A') {
    document.getElementById('toy-tray-container')?.scrollBy({ left: -260, behavior: 'smooth' });
    return;
  }
  if (e.key === 'd' || e.key === 'D') {
    document.getElementById('toy-tray-container')?.scrollBy({ left: 260, behavior: 'smooth' });
    return;
  }

  // 7. Ghost Guide Toggle (G)
  if (e.key === 'g' || e.key === 'G') {
    toggleGhostGuide();
    return;
  }

  // 8. Hint / Whistle (H)
  if (e.key === 'h' || e.key === 'H') {
    if (state.mode === 'drive') {
      sounds.playWhistle();
      steamParticles.emitPuff(state.driveSpeed, 1.6, 2.5);
    } else {
      triggerBlueprintHint();
    }
    return;
  }

  // 9. Free Builder Demolish Mode (X)
  if (e.key === 'x' || e.key === 'X') {
    if (state.mode === 'builder') {
      toggleDemolishMode();
    }
    return;
  }

  // 10. Background Music Toggle (M)
  if (e.key === 'm' || e.key === 'M') {
    const isEnabled = sounds.toggleMusic();
    showToast(isEnabled ? '🎵 Background Music: ON (Tempo 90%)' : '🔇 Background Music: OFF');
    return;
  }

  // 11. Physics Simulation (P) & Crash (C)
  if (e.key === 'c' || e.key === 'C') {
    toggleCrashDemolish();
    return;
  }
  if (e.key === 'p' || e.key === 'P') {
    toggleSimulatePhysics();
    return;
  }
});

let toastTimeout;
function showToast(message) {
  const toast = document.getElementById('hint-toast');
  const text = document.getElementById('hint-text');
  if (!toast || !text) return;

  text.textContent = message;
  toast.style.display = 'flex';
  toast.style.opacity = '1';

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => (toast.style.display = 'none'), 400);
  }, 4500);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

  if (piecePreviewViewer) {
    piecePreviewViewer.resize();
  }
});

// =========================================================
// 10. ANIMATION & RENDER LOOP
// =========================================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const now = performance.now();

  // 0. Update Home Screen & render if on Home Screen
  if (state.currentScreen === 'home') {
    homeScreen.update(delta);
    renderer.render(scene, camera);
    return;
  }

  // 1. Snappy Snap Drop & Micro-Bounce Animation (Requirement 4: quick drop 0.2 units, scale.y: 0.92 -> 1.04 -> 1.0)
  for (let i = state.squashAnimations.length - 1; i >= 0; i--) {
    const anim = state.squashAnimations[i];
    const elapsed = now - anim.startTime;
    const progress = Math.min(1.0, elapsed / anim.duration);

    if (progress >= 1.0) {
      if (anim.finalY !== undefined) anim.mesh.position.y = anim.finalY;
      anim.mesh.scale.copy(anim.baseScale);
      state.squashAnimations.splice(i, 1);
    } else {
      const p = progress;
      let dropOffset = 0;
      let scaleY = 1.0;
      let scaleXZ = 1.0;

      if (p < 0.42) {
        // Fast snap drop downwards from +0.2 to 0.0 with squash on impact
        const dropT = p / 0.42;
        dropOffset = (anim.dropDistance || 0.2) * (1.0 - dropT * dropT);
        // Squash on contact: scale.y 1.0 -> 0.92
        scaleY = 1.0 - 0.08 * dropT;
        scaleXZ = 1.0 + 0.04 * dropT;
      } else if (p < 0.76) {
        // Subtle bounce: scale.y 0.92 -> 1.04
        const bounceT = (p - 0.42) / 0.34;
        dropOffset = 0.012 * Math.sin(bounceT * Math.PI);
        scaleY = 0.92 + 0.12 * Math.sin(bounceT * (Math.PI / 2));
        scaleXZ = 1.04 - 0.04 * Math.sin(bounceT * (Math.PI / 2));
      } else {
        // Settle smoothly: scale.y 1.04 -> 1.0
        const settleT = (p - 0.76) / 0.24;
        dropOffset = 0;
        scaleY = 1.04 - 0.04 * settleT;
        scaleXZ = 1.0;
      }

      if (anim.finalY !== undefined) {
        anim.mesh.position.y = anim.finalY + dropOffset;
      }
      anim.mesh.scale.set(
        anim.baseScale.x * scaleXZ,
        anim.baseScale.y * scaleY,
        anim.baseScale.z * scaleXZ
      );
    }
  }

  // 1B. Pulsing Soft Green Rings on Receiving Studs (Requirement 2: Visual Clutch)
  if (studHighlightGroup.visible) {
    const pulseTime = now * 0.007;
    studHighlightMeshes.forEach((item, idx) => {
      if (item.group.visible) {
        const ringPulse = 0.58 + 0.38 * Math.sin(pulseTime + idx * 0.4);
        item.ring.material.opacity = ringPulse;
        item.ring.scale.setScalar(0.92 + 0.16 * ringPulse);
        item.dot.material.opacity = 0.28 + 0.28 * ringPulse;
      }
    });
  }

  // 1C. Subtle Track Chassis Build Mat Pulse (Gentle Guidance)
  if (trainBuildMatGroup && trainBuildMatGroup.visible) {
    const matPulse = 0.65 + Math.sin(now * 0.003) * 0.16;
    trainBuildMatGroup.traverse((child) => {
      if (child.isLine && child.material) {
        child.material.opacity = child.material.isLineDashedMaterial ? matPulse : Math.min(1.0, matPulse + 0.2);
      }
    });
  }

  // 2. Holographic Ghost & Mount Indicator Animations (only if ghostContainer is visible)
  if (ghostContainer.visible && state.stageGhostGroup) {
    const pulse = 0.45 + Math.sin(now * 0.005) * 0.18;

    state.stageGhostGroup.traverse((child) => {
      if (child.isMesh && child.userData && child.userData.isGhostStepPart) {
        child.material.opacity = pulse;
      }
      if (child.userData && child.userData.isMountArrow) {
        child.position.y = child.userData.baseY + Math.sin(now * 0.006) * 0.18;
      }
      if (child.userData && child.userData.isMountRing) {
        const ringScale = 1.0 + Math.sin(now * 0.004) * 0.05;
        child.scale.set(ringScale, ringScale, 1.0);
      }
    });
  }

  // 3. Drive Mode Train Motion & Steam Puffs
  if (state.mode === 'drive' && state.trainData) {
    state.driveSpeed += (state.targetSpeed - state.driveSpeed) * 0.05;

    if (Math.abs(state.driveSpeed) > 0.01) {
      state.trainZ += state.driveSpeed * delta * 5.5;

      const trackLimit = 52.0;
      if (state.trainZ > trackLimit) state.trainZ = -trackLimit;
      if (state.trainZ < -trackLimit) state.trainZ = trackLimit;

      state.trainData.trainGroup.position.x = 0;
      state.trainData.trainGroup.position.z = state.trainZ;
      // Subtle chassis pitch bobbing over rail ties
      state.trainData.trainGroup.position.y = Math.sin(state.trainZ * 2.5) * 0.02 * Math.min(1.0, Math.abs(state.driveSpeed));

      // Rotate wheel meshes actively with drive speed (Front & Rear Bogies)
      [0, 1].forEach((stepIdx) => {
        if (state.trainData.steps && state.trainData.steps[stepIdx]) {
          state.trainData.steps[stepIdx].meshes.forEach((m) => {
            m.rotation.x += state.driveSpeed * delta * 5.5;
          });
        }
      });

      // Dynamic chug sound tempo adjustment based on actual speed
      if (sounds.isChugging) {
        const tempo = Math.max(120, Math.min(360, 280 / Math.abs(state.driveSpeed)));
        sounds.setChugTempo(tempo);
      }

      const chimneyWorld = state.trainData.chimneyPos.clone();
      chimneyWorld.z += state.trainZ;
      steamParticles.setEmitterPosition(chimneyWorld.x, chimneyWorld.y, chimneyWorld.z);

      if (now - steamParticles.lastPuffTime > 180 / Math.max(0.6, Math.abs(state.driveSpeed))) {
        steamParticles.emitPuff(state.driveSpeed, 1.0, 0.4);
        steamParticles.lastPuffTime = now;
      }

      if (state.followCamera) {
        const targetCamPos = new THREE.Vector3(
          8.5,
          6.5,
          state.trainZ + (state.driveSpeed >= 0 ? 14 : -14)
        );
        camera.position.lerp(targetCamPos, 0.05);
        controls.target.set(0, 2.0, state.trainZ);
      }
    }
  }

  // 4. Update Cannon-es Rigid-Body Physics (Loose Bricks & Crash/Demolish Simulation)
  if (brickWorldManager) {
    brickWorldManager.stepPhysics(delta);
  }
  physicsWorld.update(delta, scene, sounds, steamParticles);

  // 5. Update Kid-Friendly Scene Manager (Beacons, Hints, Particles, Squash/Stretch)
  if (sceneManager) {
    sceneManager.update(delta, now);
  }

  // 6. Update 3D Parallax Playroom Home System
  steamParticles.update(delta);
  controls.update();
  renderer.render(scene, camera);
}

animate();
