import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import confetti from 'canvas-confetti';
import { sounds } from './audio.js';
import { LEGO_COLORS, BRICK_TYPES, createPlasticMaterial } from './legoGeometry.js';
import { loadTrainModel, createGhostStepPreview, createLegoEdgeLines } from './trainLoader.js';
import { PiecePreviewViewer, thumbnailGenerator, generatePieceThumbnail } from './piecePreview.js';
import { SteamParticleSystem } from './steamParticles.js';
import { occupancyGrid } from './occupancyGrid.js';
import { physicsWorld } from './physicsWorld.js';
import { BrickWorldManager } from './brickWorldManager.js';

// --- State Management ---
const state = {
  mode: 'train', // 'train' (Toy Workshop) | 'builder' (Free Play) | 'drive' (Drive Train)
  buildFlow: 'guided', // 'guided' | 'freepick'

  // Step-by-Step Train Builder State (42 Granular Physical Steps)
  trainData: null,
  isTrainLoaded: false,
  selectedStepIndex: 0, // 0 to 41
  selectedCategory: 'all', // 'all' | 'bricks' | 'plates' | 'round' | 'slopes' | 'wheels' | 'special'
  builtSteps: new Set(),
  ghostGuideEnabled: false, // Turned OFF by default: Player follows Blueprint card!
  stageGhostGroup: null,
  isTrainComplete: false,
  autoBuildInterval: null,
  activeAnimations: [],
  squashAnimations: [],

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
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa5d8ff); // Cheerful sky blue
scene.fog = new THREE.FogExp2(0xa5d8ff, 0.014);

const INITIAL_CAMERA_POS = new THREE.Vector3(22, 9.6, 0);
const INITIAL_CAMERA_TARGET = new THREE.Vector3(0, 1.2, 0);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.copy(INITIAL_CAMERA_POS);

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
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI / 2.05;
controls.minDistance = 4;
controls.maxDistance = 50;
controls.target.copy(INITIAL_CAMERA_TARGET);
controls.update();
controls.autoRotate = false;
controls.autoRotateSpeed = 2.0;
controls.addEventListener('start', () => {
  if (!state.isTrainComplete) {
    controls.autoRotate = false;
  }
});

// --- Studio & Sun Lighting with Undercarriage Fill (High Readability) ---
const sunLight = new THREE.DirectionalLight(0xfff8eb, 1.6);
sunLight.position.set(14, 25, 14);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 65;
const d = 16;
sunLight.shadow.camera.left = -d;
sunLight.shadow.camera.right = d;
sunLight.shadow.camera.top = d;
sunLight.shadow.camera.bottom = -d;
sunLight.shadow.bias = -0.0003;
scene.add(sunLight);

// Balanced ambient sky/ground fill
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x6e7b88, 1.15);
hemiLight.position.set(0, 30, 0);
scene.add(hemiLight);

// Rim light from rear
const rimLight = new THREE.DirectionalLight(0xc8e0fe, 0.75);
rimLight.position.set(-14, 12, -14);
scene.add(rimLight);

const rimLight2 = new THREE.DirectionalLight(0xffeedd, 0.4);
rimLight2.position.set(14, 8, -12);
scene.add(rimLight2);

// Soft low-angle undercarriage fill light to clearly separate bogies, chassis, and tracks
const undercarriageLight = new THREE.DirectionalLight(0xdce7f5, 0.95);
undercarriageLight.position.set(0, 1.2, 12);
undercarriageLight.target.position.set(0, 1.5, 0);
scene.add(undercarriageLight);
scene.add(undercarriageLight.target);

// Subtle side bounce fill for chassis relief and stud visibility
const chassisSideFill = new THREE.DirectionalLight(0xffeedd, 0.55);
chassisSideFill.position.set(-10, 2.0, -8);
chassisSideFill.target.position.set(0, 1.5, 0);
scene.add(chassisSideFill);
scene.add(chassisSideFill.target);

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

// --- 3D Piece Previewer in UI ---
let piecePreviewViewer = null;

// --- 18x18 Studded Baseplate & Railroad Track ---
const BASEPLATE_SIZE = 18;
const baseplateGroup = new THREE.Group();
baseplateGroup.name = 'baseplate-group';
scene.add(baseplateGroup);

function createBaseplateAndTracks() {
  const plateGeom = new THREE.BoxGeometry(BASEPLATE_SIZE, 0.36, BASEPLATE_SIZE);
  const plateMat = new THREE.MeshStandardMaterial({
    color: 0x237841,
    roughness: 0.3,
    metalness: 0.0
  });
  const plate = new THREE.Mesh(plateGeom, plateMat);
  plate.position.y = -0.18;
  plate.receiveShadow = true;
  baseplateGroup.add(plate);

  const STUD_R = 0.28;
  const STUD_H = 0.16;
  const studGeom = new THREE.CylinderGeometry(STUD_R, STUD_R, STUD_H, 16);
  const studMat = new THREE.MeshStandardMaterial({
    color: 0x237841,
    roughness: 0.28,
    metalness: 0.0
  });

  const totalStuds = BASEPLATE_SIZE * BASEPLATE_SIZE;
  const instancedStuds = new THREE.InstancedMesh(studGeom, studMat, totalStuds);
  instancedStuds.receiveShadow = true;
  instancedStuds.castShadow = true;

  const dummy = new THREE.Object3D();
  let idx = 0;
  const half = BASEPLATE_SIZE / 2;

  for (let x = 0; x < BASEPLATE_SIZE; x++) {
    for (let z = 0; z < BASEPLATE_SIZE; z++) {
      dummy.position.set(x - half + 0.5, STUD_H / 2, z - half + 0.5);
      dummy.updateMatrix();
      instancedStuds.setMatrixAt(idx++, dummy.matrix);
    }
  }
  instancedStuds.instanceMatrix.needsUpdate = true;
  baseplateGroup.add(instancedStuds);

  // Railroad Track - spaced at +/- 1.50 to perfectly cradle the train wheels flush on top
  const trackGroup = new THREE.Group();
  trackGroup.name = 'railroad-track';

  const railGeom = new THREE.BoxGeometry(0.18, 0.28, BASEPLATE_SIZE);
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

  for (let z = -half + 1; z <= half - 1; z += 1.5) {
    const tie = new THREE.Mesh(tieGeom, tieMat);
    tie.position.set(0, 0.06, z);
    tie.castShadow = true;
    tie.receiveShadow = true;
    tie.add(new THREE.LineSegments(tieEdgeGeom, tieEdgeMat));
    trackGroup.add(tie);
  }

  baseplateGroup.add(trackGroup);
}
createBaseplateAndTracks();


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

    // Populate Bottom Visual Piece Tray with re-rendered 3D thumbnails
    renderToyPartsTray();

    // Select initial step (Step 1)
    selectStep(0);

    // Fade out loading screen
    setTimeout(() => {
      if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => (loadingOverlay.style.display = 'none'), 400);
      }
    }, 400);

    showToast('💡 Drag any piece from the bottom tray onto the train to snap!');
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
  const reqStepIdx = getNextRequiredStep();
  const stepData = state.trainData.steps[reqStepIdx];

  const stepNumEl = document.getElementById('booklet-step-num');
  const titleEl = document.getElementById('booklet-part-title');
  const descEl = document.getElementById('booklet-part-desc');

  const totalSteps = state.trainData.steps.length;
  const builtCount = state.builtSteps.size;

  if (stepNumEl) {
    if (builtCount >= totalSteps) {
      stepNumEl.textContent = 'DONE!';
    } else {
      stepNumEl.textContent = `Step ${reqStepIdx + 1} / ${totalSteps}`;
    }
  }

  if (titleEl && stepData) {
    titleEl.textContent = builtCount >= totalSteps ? 'Locomotive Complete!' : (stepData.title || stepData.shortTitle);
  }

  if (descEl && stepData) {
    if (builtCount >= totalSteps) {
      descEl.textContent = 'All 42 steps built! Hop inside and switch to Drive Train mode!';
    } else {
      descEl.textContent = `Locate the ${stepData.catLabel || stepData.category} brick in the tray. Orient studs to snap.`;
    }
  }

  drawBlueprintDiagram(stepData);
}

// 💡 4-Second Target Stud Pulse Hint
export function triggerBlueprintHint() {
  if (!state.trainData) return;
  const targetStepIdx = state.isDragging && state.draggedStepIndex != null 
    ? state.draggedStepIndex 
    : getNextRequiredStep();

  const stepData = state.trainData.steps[targetStepIdx];
  if (!stepData) return;

  // Flash holographic target preview for 4 seconds
  updateGhostPreview(targetStepIdx);
  updateReceivingStudHighlights(stepData);
  ghostContainer.visible = true;
  studHighlightGroup.visible = true;

  sounds.playHoverTick();
  navigator.vibrate?.(25);
  showToast(`💡 Hint: Target studs highlighted for Step ${targetStepIdx + 1}!`);

  if (state.hintTimeout) clearTimeout(state.hintTimeout);
  state.hintActive = true;

  state.hintTimeout = setTimeout(() => {
    state.hintActive = false;
    if (!state.ghostGuideEnabled && !state.isDragging) {
      ghostContainer.visible = false;
      studHighlightGroup.visible = false;
    }
  }, 4000);
}

document.getElementById('btn-blueprint-hint')?.addEventListener('click', () => {
  triggerBlueprintHint();
});

// Update Left Category Sidebar Badge Counts
export function updateCategoryCounts() {
  if (!state.trainData) return;
  const counts = {
    all: 0,
    bricks: 0,
    plates: 0,
    round: 0,
    slopes: 0,
    wheels: 0,
    special: 0
  };

  state.trainData.steps.forEach((step, idx) => {
    if (!state.builtSteps.has(idx)) {
      counts.all++;
      const cat = step.category || 'bricks';
      if (counts[cat] !== undefined) counts[cat]++;
    }
  });

  Object.keys(counts).forEach((cat) => {
    const el = document.getElementById(`count-${cat}`);
    if (el) el.textContent = counts[cat];
  });
}

// Wire Left Category Sidebar Buttons
document.querySelectorAll('.cat-filter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const cat = btn.dataset.cat || 'all';
    state.selectedCategory = cat;

    document.querySelectorAll('.cat-filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    sounds.playHoverTick();
    renderToyPartsTray();

    const catName = btn.querySelector('.cat-name')?.textContent || cat;
    showToast(`🗄️ Filtered Parts Tray: ${catName}`);
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
// 1B. STRICT DOWNWARD FOUNDATION & DEPENDENCY VALIDATION (Pure Brick Engine)
// =========================================================
export function checkDownwardSupport(stepIdx, targetPos) {
  if (!state.trainData) return { hasSupport: true, reason: '' };
  const stepData = state.trainData.steps[stepIdx];
  if (!stepData) return { hasSupport: true, reason: '' };

  // Rule A: Wheel Bogies & Rails Base layer
  if (stepIdx === 0 || stepIdx === 1) {
    return { hasSupport: true, reason: '' };
  }

  // Rule B: Step Dependencies (Chassis before upper cab)
  if (stepIdx >= 2 && stepIdx <= 6) {
    const hasBogies = state.builtSteps.has(0) || state.builtSteps.has(1);
    if (!hasBogies) {
      return {
        hasSupport: false,
        reason: 'Wheel bogies must be installed first on the rails!'
      };
    }
  }

  if (stepIdx >= 7 && stepIdx <= 12) {
    const hasBogies = state.builtSteps.has(0) && state.builtSteps.has(1);
    const hasBeam = state.builtSteps.has(3) || state.builtSteps.has(4);
    if (!hasBogies || !hasBeam) {
      return {
        hasSupport: false,
        reason: 'Wheel bogies and chassis beams must be installed first!'
      };
    }
  }

  if (stepIdx >= 13) {
    const hasBothBogies = state.builtSteps.has(0) && state.builtSteps.has(1);
    const hasChassisBeams = state.builtSteps.has(3) || state.builtSteps.has(4);
    const hasDeckPlate = state.builtSteps.has(7) || state.builtSteps.has(8) || state.builtSteps.has(9) || state.builtSteps.has(11) || state.builtSteps.has(12);

    if (!hasBothBogies || !hasChassisBeams || !hasDeckPlate) {
      return {
        hasSupport: false,
        reason: 'Central chassis & baseplate deck must be locked down first!'
      };
    }
  }

  // Rule C: Pure Brick Engine Downward Support & Voxel Ground/Underneath Check
  if (brickWorldManager) {
    const pos = targetPos || stepData.mountPos;
    const voxel = brickWorldManager.worldToVoxel(pos);
    const mockMesh = {
      userData: {
        dimensions: stepData.dimensions || { studsX: 2, studsZ: 4, platesY: 3 }
      }
    };
    if (brickWorldManager.validatePlacement(mockMesh, voxel, stepData.targetRotationY || 0)) {
      return { hasSupport: true, reason: '' };
    }
  }

  // Rule D: Ground Layer Elevation Check (Y <= 0.65 or wheels category)
  const box = stepData.box;
  if (box && (box.min.y <= 0.65 || stepData.category === 'wheels')) {
    return { hasSupport: true, reason: '' };
  }

  // Downward Raycast fallback across footprint points
  if (box && state.builtSteps.size > 0) {
    for (const builtIdx of state.builtSteps) {
      const builtStep = state.trainData.steps[builtIdx];
      if (!builtStep || !builtStep.box) continue;

      const bBox = builtStep.box;
      const verticalGap = box.min.y - bBox.max.y;
      const isBelow = bBox.min.y < box.min.y;
      const isTouchingOrNear = verticalGap <= 0.52 && verticalGap >= -0.40;

      if (isBelow && isTouchingOrNear) {
        const overlapX = Math.min(box.max.x, bBox.max.x) - Math.max(box.min.x, bBox.min.x);
        const overlapZ = Math.min(box.max.z, bBox.max.z) - Math.max(box.min.z, bBox.min.z);

        if (overlapX > -0.28 && overlapZ > -0.28) {
          return { hasSupport: true, reason: '' };
        }
      }
    }
  }

  return {
    hasSupport: false,
    reason: 'Missing solid brick foundation beneath this piece!'
  };
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
// RUMMAGE TRAY: ALL AVAILABLE PIECES IN SELECTED CATEGORY
// =========================================================
function renderToyPartsTray() {
  const track = document.getElementById('toy-tray-track') || document.querySelector('#parts-tray .toy-tray-track');
  const headingEl = document.getElementById('tray-category-title');
  if (!track) return;

  track.innerHTML = '';

  // Requirement 3: Fallback Safety — show subtle pulse/skeleton loader on the card while GLTF is loading
  if (!state.trainData || !state.isTrainLoaded) {
    const skeletonCount = 10;
    for (let i = 0; i < skeletonCount; i++) {
      const skelCard = document.createElement('div');
      skelCard.className = 'toy-card tray-card skeleton';
      skelCard.innerHTML = `
        <div class="toy-card-badge-row">
          <span class="skeleton-badge"></span>
          <span class="skeleton-pill"></span>
        </div>
        <div class="toy-card-preview">
          <div class="skeleton-preview"></div>
        </div>
        <div class="skeleton-title"></div>
      `;
      track.appendChild(skelCard);
    }
    return;
  }

  const activeCat = state.selectedCategory;
  const catNames = {
    all: 'All Pieces',
    bricks: 'Standard Bricks',
    plates: 'Chassis & Plates',
    round: 'Boiler & Round',
    slopes: 'Roof & Slopes',
    wheels: 'Wheels & Bogies',
    special: 'Windows & Special'
  };

  if (headingEl) {
    headingEl.textContent = `Parts Box (${catNames[activeCat] || 'Catalog'})`;
  }

  // Filter unbuilt steps by category
  const candidateSteps = [];
  state.trainData.steps.forEach((step, idx) => {
    if (!state.builtSteps.has(idx)) {
      if (activeCat === 'all' || step.category === activeCat) {
        candidateSteps.push(idx);
      }
    }
  });

  // Sort candidate steps: Steps whose foundation prerequisites are satisfied appear first, followed by dependent upper steps
  candidateSteps.sort((a, b) => {
    const supA = checkDownwardSupport(a).hasSupport ? 0 : 1;
    const supB = checkDownwardSupport(b).hasSupport ? 0 : 1;
    if (supA !== supB) return supA - supB;
    return a - b;
  });

  // If entire locomotive is complete
  if (state.builtSteps.size >= state.trainData.steps.length) {
    const completeCard = document.createElement('div');
    completeCard.className = 'toy-card tray-card active placed';
    completeCard.innerHTML = `
      <div class="toy-card-badge-row">
        <span class="toy-color-badge" style="background-color: #00ff88;"></span>
        <span class="toy-qty-pill">42/42</span>
      </div>
      <div class="toy-card-preview" style="font-size: 38px;">🎉</div>
      <div class="toy-card-title">All Built!</div>
      <div class="toy-card-status-overlay" style="display:flex;">✓</div>
    `;
    completeCard.style.cursor = 'pointer';
    completeCard.addEventListener('click', () => {
      triggerTrainCompleted();
    });
    track.appendChild(completeCard);
    updateTrayProgress();
    updateInstructionBooklet();
    return;
  }

  if (candidateSteps.length === 0) {
    const emptyNotice = document.createElement('div');
    emptyNotice.className = 'empty-category-notice';
    emptyNotice.style.padding = '20px';
    emptyNotice.style.color = '#64748b';
    emptyNotice.style.fontFamily = 'var(--font-display)';
    emptyNotice.style.fontSize = '13px';
    emptyNotice.textContent = `All ${catNames[activeCat]} placed! Select another category on the left.`;
    track.appendChild(emptyNotice);
    return;
  }

  // Populate horizontal rummage track with all available bricks in the category
  candidateSteps.forEach((stepIdx) => {
    const step = state.trainData.steps[stepIdx];
    const isSelected = state.selectedStepIndex === stepIdx;

    const card = document.createElement('div');
    card.className = `toy-card tray-card ${isSelected ? 'active' : ''}`;
    card.id = `toy-card-${stepIdx}`;
    card.dataset.stepIndex = stepIdx;
    card.title = `${step.shortTitle || step.title} (Step ${stepIdx + 1}) — Drag to assemble!`;

    // Ensure thumbnail is generated and cached
    let thumbUrl = step.thumbnailUrl;
    if (!thumbUrl) {
      thumbUrl = generatePieceThumbnail(step);
      step.thumbnailUrl = thumbUrl;
    }

    let thumbnailHtml = '';
    if (thumbUrl) {
      thumbnailHtml = `<img class="toy-card-img" src="${thumbUrl}" alt="${step.shortTitle || step.title}" draggable="false" onerror="this.onerror=null; this.src=window.generatePieceThumbnail ? window.generatePieceThumbnail(state.trainData.steps[${stepIdx}]) : '';">`;
    } else {
      thumbnailHtml = `<div class="skeleton-preview"></div>`;
    }

    card.innerHTML = `
      <div class="toy-card-badge-row">
        <span class="toy-color-badge" style="background-color: ${step.primaryColor || '#d91e18'};" title="ABS Color"></span>
        <span class="toy-qty-pill">x${step.quantity || 1}</span>
      </div>
      <div class="toy-card-preview">
        ${thumbnailHtml}
      </div>
      <div class="toy-card-title">${step.shortTitle || step.title}</div>
      <div class="toy-card-status-overlay">✓</div>
    `;

    // Direct Touch / Mouse Drag: immediate pickup into continuous 3D space
    card.addEventListener('pointerdown', (e) => {
      handleCardPointerDown(e, stepIdx);
    });

    track.appendChild(card);
  });

  updateTrayProgress();
  updateCategoryCounts();
  updateInstructionBooklet();
}

function updateTrayProgress() {
  const pill = document.getElementById('tray-progress-pill');
  if (pill && state.trainData) {
    pill.textContent = `${state.builtSteps.size} / ${state.trainData.steps.length} Placed`;
  }
}


// =========================================================
// 2. PLACEMENT ENGINE — RAYCASTING, DRAG, SNAP, PHYSICS
// =========================================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ── Grid & height constants ──────────────────────────────
const STUD_SPACING = 1.0;   // 1 Three.js unit = 1 LEGO stud pitch
const BRICK_HEIGHT = 1.2;   // Standard LEGO brick height
const PLATE_HEIGHT = 0.4;   // LEGO plate height
const BASEPLATE_TOP_Y = 0.08;  // Top face of the green baseplate (studs live here)
const SNAP_RADIUS = 4.2;   // Generous magnetic grab radius in world units

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
 */
function buildSurfaceMeshes() {
  const surfaces = [];
  baseplateGroup.traverse((c) => { if (c.isMesh) surfaces.push(c); });
  if (state.trainData && state.trainData.trainGroup) {
    state.trainData.trainGroup.traverse((c) => {
      if (c.isMesh && c.visible && c.userData?.isTrainMesh) surfaces.push(c);
    });
  }
  state.placedBricks.forEach((b) => {
    if (b.isMesh) surfaces.push(b);
    else b.traverse((c) => { if (c.isMesh) surfaces.push(c); });
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

// ── Clean Unified Rotation System (Keyboard-Driven) ──
function showFloatingRotateBtn(screenX, screenY) {
  // Removed floating UI per user preference — clean keyboard shortcuts active
}

function hideFloatingRotateBtn() {
  // Removed floating UI per user preference — clean keyboard shortcuts active
}

/**
 * Unified Rotation Engine:
 * - Rotates piece around vertical Y axis
 * - Synchronizes state.pieceRotation, state.dragRotationY
 * - Updates active dragging mesh group, Free Builder ghost, and 3D previewer
 */
function applyRotation(radians) {
  const TWO_PI = Math.PI * 2;
  state.pieceRotation = ((radians % TWO_PI) + TWO_PI) % TWO_PI;
  state.dragRotationY = state.pieceRotation;

  if (brickWorldManager) {
    brickWorldManager.currentRotationY = state.pieceRotation;
    if (brickWorldManager.activeDraggedBrick) {
      brickWorldManager.activeDraggedBrick.rotation.y = state.pieceRotation;
    }
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

function rotatePieceLeft(step = Math.PI / 2) {
  applyRotation(state.pieceRotation - step);
  const deg = Math.round(state.pieceRotation * (180 / Math.PI)) % 360;
  showToast(`↺ Rotated Left: ${deg}°  [Q]`);
  navigator.vibrate?.(18);
  sounds.playPop();
}

function rotatePieceRight(step = Math.PI / 2) {
  applyRotation(state.pieceRotation + step);
  const deg = Math.round(state.pieceRotation * (180 / Math.PI)) % 360;
  showToast(`↻ Rotated Right: ${deg}°  [E / Space]`);
  navigator.vibrate?.(18);
  sounds.playPop();
}

function rotatePiece90() {
  rotatePieceRight();
}

function setPieceRotationDegrees(deg) {
  const rad = ((deg % 360 + 360) % 360) * (Math.PI / 180);
  applyRotation(rad);
}

function updateAllRotationUI() {
  // No-op: visual rotation dials and badges removed for clutter-free gameplay
}

function initRotationUIListeners() {
  // Free Builder toolbar rotate button
  document.getElementById('btn-rotate-piece')?.addEventListener('click', () => rotatePieceRight());
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

// ── Card pick-up handler (Requirement 1: True Pointer-Locked 3D Drag) ──
function handleCardPointerDown(e, stepIdx) {
  if (state.builtSteps.has(stepIdx)) { selectStep(stepIdx); return; }
  if (e.button !== 0 && e.pointerType === 'mouse') return;

  state.isPointerDownOnCard = true;
  state.pointerDownScreenPos = { x: e.clientX, y: e.clientY };
  state.draggedStepIndex = stepIdx;
  selectStep(stepIdx);

  // Directly initiate 3D tactile drag immediately on pointer down
  start3DDrag(e, stepIdx);

  try { e.target.setPointerCapture(e.pointerId); } catch (_) { }
}

// ── Ghost guide (Target highlight only while actively dragging) ──
function updateGhostPreview(stepIdx = state.selectedStepIndex) {
  while (ghostContainer.children.length > 0) ghostContainer.remove(ghostContainer.children[0]);
  state.stageGhostGroup = null;

  if (!state.trainData || stepIdx == null) return;
  if (state.builtSteps.has(stepIdx)) { ghostContainer.visible = false; return; }

  const stepData = state.trainData.steps[stepIdx];
  if (!stepData) return;

  state.stageGhostGroup = createGhostStepPreview(stepData, state.trainData.trainGroup);
  ghostContainer.add(state.stageGhostGroup);
  // Only show target highlight when actively dragging a piece
  ghostContainer.visible = state.isDragging;
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

// ── 3D Drag start with Active Drop Shadow & High-Contrast Edges ──
function start3DDrag(e, stepIdx) {
  state.isDragging = true;
  state.inSnapZone = false;
  state.isDraggedColliding = false;
  controls.enabled = false;

  document.getElementById(`toy-card-${stepIdx}`)?.classList.add('is-being-dragged');

  const stepData = state.trainData.steps[stepIdx];

  // Remove old proxy if lingering
  if (state.draggingPieceGroup) { scene.remove(state.draggingPieceGroup); state.draggingPieceGroup = null; }

  const dragGroup = new THREE.Group();
  dragGroup.name = 'dragging-piece-group';

  // Compute world-space bounding center of the step
  const tempBox = new THREE.Box3();
  stepData.meshes.forEach((m) => { m.updateMatrixWorld(true); tempBox.expandByObject(m); });
  const localCenter = new THREE.Vector3();
  tempBox.getCenter(localCenter);

  stepData.meshes.forEach((mesh) => {
    const cloneMat = Array.isArray(mesh.material)
      ? mesh.material.map((m) => m.clone()) : mesh.material.clone();
    const mats = Array.isArray(cloneMat) ? cloneMat : [cloneMat];
    mats.forEach((m) => { if (m.emissive) { m.emissive.setHex(0x1a3f6f); m.emissiveIntensity = 0.2; } });

    const clone = new THREE.Mesh(mesh.geometry, cloneMat);
    clone.castShadow = true;

    // Apply high-contrast rim/seam edges so dark chassis & wheels are razor sharp
    const edgeLines = createLegoEdgeLines(mesh.geometry, cloneMat);
    if (edgeLines) clone.add(edgeLines);

    const fm = mats[0];
    clone.userData = {
      origColor: fm.color.clone(),
      origEmissive: fm.emissive ? fm.emissive.clone() : new THREE.Color(0, 0, 0),
      origEmissiveIntensity: fm.emissiveIntensity || 0,
      origOpacity: fm.opacity,
      origTransparent: fm.transparent
    };

    const wp = new THREE.Vector3();
    mesh.getWorldPosition(wp);
    clone.position.copy(wp).sub(localCenter);
    clone.quaternion.copy(mesh.getWorldQuaternion(new THREE.Quaternion()));
    clone.scale.copy(mesh.getWorldScale(new THREE.Vector3()));
    dragGroup.add(clone);
  });

  dragGroup.userData.dimensions = stepData.dimensions || { studsX: 2, studsZ: 4, platesY: 3 };
  dragGroup.userData.stepIndex = stepIdx;

  // Calculate starting continuous 3D position
  const targetY = Math.max(stepData.mountPos.y, BASEPLATE_TOP_Y + 0.1);
  state._currentDragHoverY = targetY;
  const initHit = castContinuousDragRay(e.clientX, e.clientY, targetY);
  const initPos = initHit ? initHit.point : stepData.mountPos.clone();
  initPos.y = (initHit ? initHit.surfaceY : targetY) + 0.5;

  dragGroup.position.copy(initPos);
  state.dragCurrentWorldPos.copy(initPos);
  dragGroup.rotation.set(0, state.dragRotationY, 0);

  scene.add(dragGroup);
  state.draggingPieceGroup = dragGroup;

  // Register in BrickWorldManager
  if (brickWorldManager) {
    brickWorldManager.startDragging(dragGroup, stepIdx, { initialRotationY: state.dragRotationY });
  }

  // Show active drop shadow directly underneath
  updateDropShadow(initPos, initHit ? initHit.surfaceY : BASEPLATE_TOP_Y);

  showFloatingRotateBtn(e.clientX, e.clientY);
  updateGhostPreview(stepIdx);
  if (state.stageGhostGroup?.userData?.setGhostState) {
    state.stageGhostGroup.userData.setGhostState(false);
  }
  ghostContainer.visible = true;

  navigator.vibrate?.(18);
  sounds.playPop();
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

// ── Continuous Pointer Move (Requirement 1 & 2: 3D Drag & Magnetic Snap) ──
window.addEventListener('pointermove', (e) => {
  // 1. Live Free Builder 3D Ghost Preview under cursor
  if (state.mode === 'builder' && !state.isDragging) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const hits = raycaster.intersectObjects([baseplateGroup, ...state.placedBricks], true);
    if (hits.length > 0 && !state.isDemolishMode) {
      const hit = hits[0];
      const snapX = Math.round(hit.point.x);
      const snapZ = Math.round(hit.point.z);

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

      const brickDef = BRICK_TYPES[state.selectedPiece] || BRICK_TYPES['brick-2x4'];
      const snapY = surfaceY + brickDef.height / 2;

      const candidateCells = occupancyGrid.getCellsForFreeBrick(
        brickDef,
        new THREE.Vector3(snapX, snapY, snapZ),
        state.pieceRotation
      );
      const collision = occupancyGrid.checkCollision(candidateCells);

      updateFreeBuilderGhost(snapX, snapY, snapZ, !collision.isColliding);
    } else {
      builderGhostGroup.visible = false;
    }
  }

  // 2. Continuous 3D Dragging of Guided Train Step
  if (!state.isDragging || !state.draggingPieceGroup || !state.trainData) return;

  const stepIdx = state.draggedStepIndex;
  const stepData = state.trainData.steps[stepIdx];
  const targetPos = stepData.mountPos;
  const targetY = Math.max(targetPos.y, BASEPLATE_TOP_Y);

  // Cast continuous ray — fluid continuous coordinates, no stud-grid jumping
  const hit = castContinuousDragRay(e.clientX, e.clientY, targetY);
  if (!hit) return;

  const hitPoint = hit.point;
  const surfaceY = hit.surfaceY;
  state.dragCurrentWorldPos.copy(hitPoint);

  const alignmentPill = document.getElementById('drag-alignment-pill');
  const alignmentIcon = document.getElementById('drag-alignment-icon');
  const alignmentText = document.getElementById('drag-alignment-text');

  // Let BrickWorldManager update magnetic snap vs free hover
  if (brickWorldManager) {
    brickWorldManager.updateDragPosition(hitPoint, targetPos);
  }

  const canSnap = !!state.draggingPieceGroup.userData?.canSnap;
  const dist3D = hitPoint.distanceTo(targetPos);
  const isNearTarget = dist3D < 3.2;

  if (canSnap) {
    // Aligned clutch with solid foundation below
    state.inSnapZone = true;
    state.isRotationAligned = true;
    document.body.style.cursor = 'copy';

    const now = performance.now();
    if (now - state.lastScrapeTime > 130) {
      sounds.playStudScrape();
      state.lastScrapeTime = now;
    }

    if (alignmentPill) {
      alignmentPill.style.display = 'flex';
      alignmentPill.className = 'drag-alignment-pill aligned';
      if (alignmentIcon) alignmentIcon.textContent = '⬇️';
      if (alignmentText) alignmentText.textContent = 'Aligned — Release to Snap!';
    }

    if (state.stageGhostGroup?.userData?.setGhostState) {
      state.stageGhostGroup.userData.setGhostState(true);
    }
    ghostContainer.visible = true;
    updateReceivingStudHighlights(stepData);

    const shadowY = Math.max(BASEPLATE_TOP_Y, targetPos.y - (stepData.box.max.y - stepData.box.min.y) / 2);
    updateDropShadow(targetPos, shadowY);
  } else if (isNearTarget) {
    // Near target position but lacks downward foundation (unsupported)
    state.inSnapZone = false;
    state.isRotationAligned = false;
    document.body.style.cursor = 'not-allowed';

    if (alignmentPill) {
      alignmentPill.style.display = 'flex';
      alignmentPill.className = 'drag-alignment-pill needs-rotation';
      if (alignmentIcon) alignmentIcon.textContent = '⚠️';
      if (alignmentText) alignmentText.textContent = 'Missing foundation! Will drop with gravity.';
    }

    if (state.stageGhostGroup?.userData?.setGhostState) {
      state.stageGhostGroup.userData.setGhostState(false);
    }
    ghostContainer.visible = true;
    updateReceivingStudHighlights(stepData);

    updateDropShadow(state.draggingPieceGroup.position, surfaceY);
  } else {
    // Free Hover: Follow cursor slightly elevated above baseplate
    state.inSnapZone = false;
    state.isRotationAligned = false;
    document.body.style.cursor = 'grabbing';

    if (alignmentPill) alignmentPill.style.display = 'none';
    restoreDragGroupColors(state.draggingPieceGroup);

    if (state.stageGhostGroup?.userData?.setGhostState) {
      state.stageGhostGroup.userData.setGhostState(false);
    }
    ghostContainer.visible = state.ghostGuideEnabled || state.hintActive;
    studHighlightGroup.visible = state.hintActive;

    updateDropShadow(state.draggingPieceGroup.position, surfaceY);
  }

  showFloatingRotateBtn(e.clientX, e.clientY);
});

function isStepOrientationValid(stepData, currentRotY) {
  if (stepData.isSquareOrRound) return true;
  const targetAngle = stepData.targetRotationY || 0;
  // Bricks have 180-degree rotational symmetry
  const diff = Math.abs(currentRotY - targetAngle) % Math.PI;
  return diff < 0.24 || Math.abs(diff - Math.PI) < 0.24;
}

function rejectWrongOrientation(stepIdx) {
  const stepData = state.trainData.steps[stepIdx];
  sounds.playReject();
  navigator.vibrate?.([40, 50, 40]);

  const card = document.getElementById(`toy-card-${stepIdx}`);
  if (card) {
    card.classList.add('shake');
    setTimeout(() => card.classList.remove('shake'), 450);
  }

  showToast('🔄 Studs didn\'t align! Press [Space] or [R] to rotate 90° before snapping.');

  if (state.draggingPieceGroup) {
    animateReturnToTray(state.draggingPieceGroup, stepIdx);
    state.draggingPieceGroup = null;
  }
}

// Second-finger rotate (touch)
window.addEventListener('touchstart', (e) => {
  if (state.isDragging && e.touches.length === 2) { rotatePiece90(); e.preventDefault(); }
}, { passive: false });


// Continuous 360° mouse wheel rotation during drag
window.addEventListener('wheel', (e) => {
  if (state.isDragging) {
    const delta = Math.sign(e.deltaY) * (Math.PI / 12);
    applyRotation(state.pieceRotation + delta);
    e.preventDefault();
  }
}, { passive: false });

// ── Pointer Up (Smooth Snap or Spring-Back on Release) ───────
window.addEventListener('pointerup', () => {
  state.isPointerDownOnCard = false;
  studHighlightGroup.visible = false;
  dragDropShadow.visible = false;
  document.getElementById('collision-badge') && (document.getElementById('collision-badge').style.display = 'none');

  const alignmentPill = document.getElementById('drag-alignment-pill');
  if (alignmentPill) alignmentPill.style.display = 'none';

  if (!state.isDragging) return;
  state.isDragging = false;
  controls.enabled = true;
  document.body.style.cursor = 'default';
  hideFloatingRotateBtn();

  const stepIdx = state.draggedStepIndex;
  document.getElementById(`toy-card-${stepIdx}`)?.classList.remove('is-being-dragged');

  // Unified State Machine release through BrickWorldManager:
  const result = brickWorldManager ? brickWorldManager.releaseActivePiece() : null;
  state.draggingPieceGroup = null;

  if (result && result.status === 'locked') {
    // ── Snapped into position near target with solid foundation below
    lockPieceIntoPlace(result.stepIdx ?? stepIdx);
    navigator.vibrate?.(30);
  } else if (result && result.status === 'physics_fall') {
    // ── Released unsupported or in empty air -> Cannon-es dynamic fall!
    const card = document.getElementById(`toy-card-${stepIdx}`);
    if (card) {
      card.classList.add('shake');
      setTimeout(() => card.classList.remove('shake'), 450);
    }
    showToast('🧱 Brick dropped without support! Tap the loose brick on the ground to return it to the tray.');
  } else {
    animateReturnToTray(state.draggingPieceGroup, stepIdx);
  }
});

// Cancel / blur → abort drag cleanly and spring back
window.addEventListener('pointercancel', () => {
  studHighlightGroup.visible = false;
  dragDropShadow.visible = false;
  hideFloatingRotateBtn();
  if (state.isDragging) {
    state.isDragging = false;
    controls.enabled = true;
    if (state.draggingPieceGroup) {
      animateReturnToTray(state.draggingPieceGroup, state.draggedStepIndex);
      state.draggingPieceGroup = null;
    }
  }
});

// ── Smooth Elastic Spring-Back to Bottom Tray Slot ───────────
function animateReturnToTray(pieceGroup, stepIdx) {
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
  const duration = 280; // ms

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
function lockPieceIntoPlace(stepIdx) {
  const stepData = state.trainData.steps[stepIdx];
  const stepCells = occupancyGrid.getCellsForStep(stepData, stepData.mountPos);

  // Clean up any scattered loose physics body for this piece if present
  const existingLooseIdx = physicsWorld.looseBricks.findIndex((b) => b.stepIdx === stepIdx);
  if (existingLooseIdx !== -1) {
    const loose = physicsWorld.looseBricks[existingLooseIdx];
    physicsWorld.world.removeBody(loose.body);
    scene.remove(loose.meshGroup);
    physicsWorld.looseBricks.splice(existingLooseIdx, 1);
    updateCleanUpBanner();
  }

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

    // Snappy Micro-Animation (Requirement 4):
    // Quick drop of 0.2 units with subtle bounce (scale.y: 0.92 -> 1.04 -> 1.0)
    const finalY = mesh.position.y;
    mesh.position.y = finalY + 0.2; // Starts 0.2 units above receiving studs
    const baseScale = mesh.scale.clone();
    state.squashAnimations.push({
      mesh,
      finalY,
      dropDistance: 0.2,
      baseScale,
      startTime: performance.now(),
      duration: 250
    });
  });

  // Sound: Deep plastic thwack-snap audio cue on lock
  sounds.playPlasticThwackSnap();

  // Haptic feedback
  navigator.vibrate?.([30]);

  // Burst of snap dust/sparks
  for (let i = 0; i < 6; i++) {
    steamParticles.emitPuff(0, 0.45, 0.4);
  }

  // Mark step complete
  state.builtSteps.add(stepIdx);

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

  updateBrickCount();
  updateTrayProgress();
  renderToyPartsTray();
  updateStepHUD();
  showToast(`✨ Locked ${stepData.shortTitle || stepData.title} into place!`);

  // Check if entire locomotive is assembled
  if (state.builtSteps.size >= state.trainData.steps.length) {
    setTimeout(() => triggerTrainCompleted(), 400);
    return;
  }
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

  // Update In-Scene Ghost Preview (only visible if actively dragging)
  if (!state.isDragging) {
    ghostContainer.visible = false;
  }

  // Update Sleek Step HUD
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
  }

  updateBrickCount();
  updateTrayProgress();
  selectStep(stepIdx);
  showToast(`Removed ${stepData.shortTitle || stepData.title}. Space freed!`);
}

function updateBrickCount() {
  const el = document.getElementById('brick-count');
  if (el) el.textContent = state.builtSteps.size;
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

// Auto-Build Playback
function toggleAutoBuild() {
  const autoBtn = document.getElementById('btn-auto-build');
  const icon = document.getElementById('auto-build-icon');

  if (state.autoBuildInterval) {
    clearInterval(state.autoBuildInterval);
    state.autoBuildInterval = null;
    if (autoBtn) autoBtn.classList.remove('playing');
    if (icon) icon.textContent = '▶';
    showToast('Auto-Build paused.');
  } else {
    if (autoBtn) autoBtn.classList.add('playing');
    if (icon) icon.textContent = '⏸';
    showToast('Auto-Assembling locomotive piece-by-piece...');

    if (!state.builtSteps.has(state.selectedStepIndex)) {
      lockPieceIntoPlace(state.selectedStepIndex);
    }

    state.autoBuildInterval = setInterval(() => {
      if (state.builtSteps.size >= state.trainData.steps.length) {
        clearInterval(state.autoBuildInterval);
        state.autoBuildInterval = null;
        if (autoBtn) autoBtn.classList.remove('playing');
        if (icon) icon.textContent = '▶';
      } else {
        const next = getNextUnbuiltStep(state.selectedStepIndex);
        if (next !== null) {
          selectStep(next);
          lockPieceIntoPlace(next);
        }
      }
    }, 750);
  }
}

// Celebration on Completion
function triggerTrainCompleted() {
  state.isTrainComplete = true;

  if (state.autoBuildInterval) {
    clearInterval(state.autoBuildInterval);
    state.autoBuildInterval = null;
  }

  // Camera auto-rotates smoothly around the complete caboose
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
}

function resetTrainBuild() {
  if (!state.trainData) return;

  if (state.autoBuildInterval) {
    clearInterval(state.autoBuildInterval);
    state.autoBuildInterval = null;
  }

  state.builtSteps.clear();
  state.isTrainComplete = false;
  controls.autoRotate = false;
  camera.position.copy(INITIAL_CAMERA_POS);
  controls.target.copy(INITIAL_CAMERA_TARGET);
  controls.update();

  // Clear all occupancy cells (Requirement 4)
  occupancyGrid.clear();

  // Clean up loose physics bricks & reset crashed physics state
  physicsWorld.cleanUpLooseBricks(sounds, () => updateCleanUpBanner());
  if (physicsWorld.isCrashed) {
    physicsWorld.crashedMeshes.forEach((item) => scene.remove(item.mesh));
    physicsWorld.crashedMeshes = [];
    physicsWorld.isCrashed = false;
    updateCrashButtonUI(false);
  }

  state.trainData.steps.forEach((s) => {
    s.meshes.forEach((m) => (m.visible = false));
  });

  updateBrickCount();
  updateTrayProgress();
  renderToyPartsTray();
  selectStep(0);
  showToast('Train reset. Ready to build Layer 1!');
}

// =========================================================
// 6. DIRECT 3D RAYCASTING CLICK (In addition to drag)
// =========================================================
let clickPointerDownPos = { x: 0, y: 0 };
renderer.domElement.addEventListener('pointerdown', (e) => {
  clickPointerDownPos = { x: e.clientX, y: e.clientY };
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
// 7. BUTTON ACTIONS & SWITCHING
// =========================================================
document.getElementById('btn-restart-build')?.addEventListener('click', resetTrainBuild);

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
  showToast(isEnabled ? '🎵 Background Music: ON (Tempo 90%)' : '🔇 Background Music: OFF');
});

// Start background music seamlessly on first user interaction (browser autoplay policy)
function startMusicOnFirstInteraction() {
  if (sounds.isMusicEnabled && !sounds.isMusicPlaying) {
    sounds.startBGM();
  }
}
window.addEventListener('pointerdown', startMusicOnFirstInteraction, { once: true });
window.addEventListener('keydown', startMusicOnFirstInteraction, { once: true });

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
  const hits = raycaster.intersectObjects([baseplateGroup, ...state.placedBricks], true);
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

  // Authentic LEGO Piece Pressed MP3 SFX only
  sounds.playLegoPressed(1.0, 1.0);
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

  // 4. Space Bar (Rotate Right during drag/builder, or snap/lock / whistle)
  if (e.code === 'Space') {
    e.preventDefault();
    if (state.mode === 'train') {
      if (state.isDragging) {
        rotatePieceRight();
      } else if (!state.builtSteps.has(state.selectedStepIndex)) {
        lockPieceIntoPlace(state.selectedStepIndex);
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

      state.trainData.trainGroup.position.z = state.trainZ;

      // Subtle chassis pitch bobbing over rail ties
      state.trainData.trainGroup.position.y = Math.sin(state.trainZ * 2.5) * 0.02 * Math.min(1.0, Math.abs(state.driveSpeed));

      // Rotate wheel meshes actively with drive speed
      if (state.trainData.steps && state.trainData.steps[0]) {
        state.trainData.steps[0].meshes.forEach((m) => {
          m.rotation.x += state.driveSpeed * delta * 5.5;
        });
      }

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

  steamParticles.update(delta);
  controls.update();
  renderer.render(scene, camera);
}

animate();
