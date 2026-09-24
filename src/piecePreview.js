import * as THREE from 'three';

/**
 * 3D Mini Viewport / Piece Inspector for the UI.
 * Renders the active piece in a dedicated interactive 3D turntable canvas.
 */
export class PiecePreviewViewer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    if (!this.canvas) {
      console.warn('PiecePreviewViewer: canvas element not found.');
      return;
    }

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f6ff); // Subtle clean studio backdrop

    // Camera
    const width = this.canvas.clientWidth || 220;
    const height = this.canvas.clientHeight || 180;
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(0, 2.5, 4.5);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'low-power'
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // Studio Lighting
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(5, 8, 6);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xbde0fe, 0.8);
    fillLight.position.set(-6, 3, -4);
    this.scene.add(fillLight);

    const topLight = new THREE.HemisphereLight(0xffffff, 0xd0d8e8, 1.0);
    this.scene.add(topLight);

    // Subtle studio pedestal disk
    const pedestalGeom = new THREE.CylinderGeometry(2.5, 2.7, 0.1, 32);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.4,
      metalness: 0.05
    });
    this.pedestal = new THREE.Mesh(pedestalGeom, pedestalMat);
    this.pedestal.position.y = -0.05;
    this.scene.add(this.pedestal);

    // Preview Model Group
    this.pieceGroup = new THREE.Group();
    this.scene.add(this.pieceGroup);

    // Interaction State
    this.isDragging = false;
    this.prevMouseX = 0;
    this.autoRotate = true;
    this.rotationSpeed = 0.012;

    this.bindEvents();
    this.animate();
  }

  bindEvents() {
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.prevMouseX = e.clientX;
      this.autoRotate = false;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      // Resume auto-rotate after 2 seconds of inactivity
      clearTimeout(this.resumeTimeout);
      this.resumeTimeout = setTimeout(() => {
        this.autoRotate = true;
      }, 2000);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.prevMouseX;
        this.pieceGroup.rotation.y += deltaX * 0.015;
        this.prevMouseX = e.clientX;
      }
    });

    // Touch support for mobile/tablets
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.prevMouseX = e.touches[0].clientX;
        this.autoRotate = false;
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
      clearTimeout(this.resumeTimeout);
      this.resumeTimeout = setTimeout(() => {
        this.autoRotate = true;
      }, 2000);
    });

    window.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - this.prevMouseX;
        this.pieceGroup.rotation.y += deltaX * 0.015;
        this.prevMouseX = e.touches[0].clientX;
      }
    }, { passive: true });
  }

  /**
   * Loads and displays the specific step's meshes in the 3D mini turntable
   */
  loadStep(stepData) {
    if (!stepData || !stepData.meshes) return;

    // Clear existing preview children
    while (this.pieceGroup.children.length > 0) {
      const child = this.pieceGroup.children[0];
      this.pieceGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
    }

    // Reset rotation
    this.pieceGroup.rotation.set(0, 0.4, 0);

    // Clone geometries and materials into the preview group
    const tempGroup = new THREE.Group();

    stepData.meshes.forEach((mesh) => {
      mesh.updateMatrixWorld(true);
      const clone = new THREE.Mesh(mesh.geometry.clone(), mesh.material);
      clone.matrix.copy(mesh.matrixWorld);
      clone.matrix.decompose(clone.position, clone.quaternion, clone.scale);
      tempGroup.add(clone);
    });

    // Compute bounding box and center at (0, 0, 0)
    const box = new THREE.Box3().setFromObject(tempGroup);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);

    tempGroup.position.set(-center.x, -center.y, -center.z);
    this.pieceGroup.add(tempGroup);

    // Adjust camera distance to frame the piece comfortably
    const maxDim = Math.max(size.x, size.y, size.z, 0.5);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.55;
    cameraZ = Math.max(cameraZ, 2.5);

    this.camera.position.set(cameraZ * 0.7, cameraZ * 0.65, cameraZ * 0.85);
    this.camera.lookAt(0, 0, 0);

    // Adjust pedestal position under the piece
    this.pedestal.position.y = -size.y * 0.55 - 0.05;
    const pedRadius = Math.max(size.x, size.z) * 0.85 + 0.5;
    this.pedestal.scale.set(pedRadius / 2.5, 1, pedRadius / 2.5);
  }

  /**
   * Generates a snapshot thumbnail data URL for a piece
   */
  generateThumbnail(stepData) {
    return thumbnailGenerator.generate(stepData);
  }

  resize() {
    if (!this.canvas) return;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width > 0 && height > 0) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.autoRotate) {
      this.pieceGroup.rotation.y += this.rotationSpeed;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// =========================================================
// DEDICATED OFF-SCREEN 256x256 THUMBNAIL GENERATOR (High-DPI / Large Preview)
// =========================================================
const THUMB_SIZE = 256;
let offscreenCanvas = null;
let offscreenRenderer = null;
let microScene = null;
let microCamera = null;
let microPieceHolder = null;
const thumbnailCache = new Map();

function initOffscreenRenderer() {
  if (offscreenRenderer) return;

  try {
    offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = THUMB_SIZE;
    offscreenCanvas.height = THUMB_SIZE;

    // Dedicated off-screen Three.js WebGLRenderer (size: 256x256, alpha: true, antialias: true)
    offscreenRenderer = new THREE.WebGLRenderer({
      canvas: offscreenCanvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    offscreenRenderer.setSize(THUMB_SIZE, THUMB_SIZE, false);
    offscreenRenderer.setPixelRatio(1.0);
    offscreenRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    offscreenRenderer.toneMappingExposure = 1.25;

    // Dedicated micro-scene
    microScene = new THREE.Scene();

    // 1. AmbientLight (color: 0xffffff, intensity: 1.2)
    const ambLight = new THREE.AmbientLight(0xffffff, 1.2);
    microScene.add(ambLight);

    // 2. DirectionalLight pointing from [3, 5, 4] (intensity: 1.5)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(3, 5, 4);
    microScene.add(dirLight);

    // Soft fill and undercarriage bounce so dark chassis/bogies never clip to solid black
    const fillLight = new THREE.DirectionalLight(0xbcd8f8, 0.7);
    fillLight.position.set(-3, -2, -3);
    microScene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffeedd, 0.6);
    rimLight.position.set(0, 4, -4);
    microScene.add(rimLight);

    // 3. PerspectiveCamera (FOV: 35)
    microCamera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);

    microPieceHolder = new THREE.Group();
    microScene.add(microPieceHolder);
  } catch (e) {
    console.warn('WebGL offscreen renderer unavailable:', e);
    offscreenRenderer = null;
  }
}

/**
 * Automated dynamic thumbnail generator for individual brick meshes or step objects.
 * a) Clones target brick mesh and centers geometry around [0, 0, 0].
 * b) Computes bounding sphere radius.
 * c) Positions camera isometrically at [radius * 1.8, radius * 1.5, radius * 2.2] looking at [0, 0, 0].
 * d) Renders micro-scene and extracts offscreenRenderer.domElement.toDataURL('image/png').
 * e) Caches resulting Data URL.
 */
export function generatePieceThumbnail(target) {
  if (!target) return null;

  // Cache key resolution
  const cacheKey = target.step ? `step_${target.step}` : (target.uuid || target.name || null);
  if (cacheKey && thumbnailCache.has(cacheKey)) {
    return thumbnailCache.get(cacheKey);
  }

  initOffscreenRenderer();

  if (!offscreenRenderer) {
    const fallback = generate2DFallbackThumbnail(target);
    if (cacheKey) thumbnailCache.set(cacheKey, fallback);
    return fallback;
  }

  try {
    // Clear previous piece from micro-holder
    while (microPieceHolder.children.length > 0) {
      const child = microPieceHolder.children[0];
      microPieceHolder.remove(child);
      if (child.geometry) child.geometry.dispose();
    }
    microPieceHolder.rotation.set(0, 0, 0);

    const clonedRoot = new THREE.Group();
    const meshesToProcess = [];

    if (target.isMesh) {
      meshesToProcess.push(target);
    } else if (target.meshes && Array.isArray(target.meshes)) {
      target.meshes.forEach((m) => meshesToProcess.push(m));
    } else if (target.traverse) {
      target.traverse((child) => {
        if (child.isMesh) meshesToProcess.push(child);
      });
    }

    if (meshesToProcess.length === 0) {
      const fallback = generate2DFallbackThumbnail(target);
      if (cacheKey) thumbnailCache.set(cacheKey, fallback);
      return fallback;
    }

    // Clone meshes and apply readable materials + outlines
    meshesToProcess.forEach((origMesh) => {
      origMesh.updateMatrixWorld(true);
      const geom = origMesh.geometry.clone();
      const mat = Array.isArray(origMesh.material)
        ? origMesh.material.map((m) => m.clone())
        : origMesh.material.clone();

      const clone = new THREE.Mesh(geom, mat);
      clone.matrix.copy(origMesh.matrixWorld);
      clone.matrix.decompose(clone.position, clone.quaternion, clone.scale);

      // Check for dark/black materials (like wheel bogies, chassis beams, axles)
      let isDarkPiece = false;
      const testMat = Array.isArray(mat) ? mat[0] : mat;
      if (testMat && testMat.color) {
        const lum = 0.299 * testMat.color.r + 0.587 * testMat.color.g + 0.114 * testMat.color.b;
        if (lum < 0.38) isDarkPiece = true;
      }

      // Add EdgesGeometry outlines to dark pieces so studs, wheels, and seams pop
      if (isDarkPiece) {
        try {
          const edgeGeom = new THREE.EdgesGeometry(geom, 24);
          const edgeMat = new THREE.LineBasicMaterial({
            color: 0x9fb3c8, // Silver-slate contour outline
            transparent: true,
            opacity: 0.85,
            depthWrite: false
          });
          const edgeLines = new THREE.LineSegments(edgeGeom, edgeMat);
          clone.add(edgeLines);
        } catch (_) {}

        // Boost specular reflections and clearcoat on dark ABS
        const mats = Array.isArray(mat) ? mat : [mat];
        mats.forEach((m) => {
          m.roughness = 0.25;
          m.metalness = 0.15;
          m.clearcoat = 0.65;
          m.clearcoatRoughness = 0.15;
        });
      }

      clonedRoot.add(clone);
    });

    // Step a: Center geometry around [0, 0, 0] using local bounding box offset
    const box = new THREE.Box3().setFromObject(clonedRoot);
    const center = new THREE.Vector3();
    box.getCenter(center);
    clonedRoot.position.set(-center.x, -center.y, -center.z);
    microPieceHolder.add(clonedRoot);

    // Step b: Compute bounding sphere
    const sphere = new THREE.Box3().setFromObject(microPieceHolder).getBoundingSphere(new THREE.Sphere());
    const radius = Math.max(sphere.radius, 0.45);

    // Step c: Position camera isometrically at [radius * 1.8, radius * 1.5, radius * 2.2] pointing at [0, 0, 0]
    microCamera.position.set(radius * 1.8, radius * 1.5, radius * 2.2);
    microCamera.lookAt(0, 0, 0);

    // Step d: Render micro-scene and extract Data URL
    offscreenRenderer.render(microScene, microCamera);
    const dataUrl = offscreenRenderer.domElement.toDataURL('image/png');

    // Step e: Cache resulting Data URL
    if (cacheKey) {
      thumbnailCache.set(cacheKey, dataUrl);
    }
    return dataUrl;
  } catch (err) {
    console.warn('Error in generatePieceThumbnail:', err);
    const fallback = generate2DFallbackThumbnail(target);
    if (cacheKey) thumbnailCache.set(cacheKey, fallback);
    return fallback;
  }
}

// Global hook
if (typeof window !== 'undefined') {
  window.generatePieceThumbnail = generatePieceThumbnail;
}

/**
 * High-fidelity 2D Canvas Fallback
 */
export function generate2DFallbackThumbnail(stepData) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);

  const primaryColor = stepData.primaryColor || '#d91e18';
  const cat = stepData.category || 'bricks';

  ctx.clearRect(0, 0, 128, 128);

  // Subtle radial studio glow
  const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  grad.addColorStop(1, 'rgba(240, 246, 255, 0.1)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  ctx.save();
  ctx.translate(64, 64);

  if (cat === 'wheels') {
    // Dual wheel assembly
    ctx.fillStyle = '#222528';
    ctx.strokeStyle = '#9fb3c8';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.arc(-22, 6, 16, 0, Math.PI * 2);
    ctx.arc(22, 6, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#c8d0d6';
    ctx.beginPath();
    ctx.arc(-22, 6, 7, 0, Math.PI * 2);
    ctx.arc(22, 6, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Axle bar
    ctx.fillStyle = '#2e3338';
    ctx.fillRect(-26, -14, 52, 10);
    ctx.strokeRect(-26, -14, 52, 10);
  } else if (cat === 'round') {
    // Cylindrical dome / boiler
    ctx.fillStyle = primaryColor;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.ellipse(0, -12, 28, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-28, -12);
    ctx.lineTo(-28, 14);
    ctx.ellipse(0, 14, 28, 12, 0, Math.PI, 0, true);
    ctx.lineTo(28, -12);
    ctx.fill();
    ctx.stroke();

    // Top stud
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, -16, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Interlocking brick / plate
    const isPlate = cat === 'plates';
    const h = isPlate ? 16 : 28;

    ctx.fillStyle = primaryColor;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(-36, -h / 2, 72, h, 4);
    ctx.fill();
    ctx.stroke();

    // Studs
    ctx.fillStyle = primaryColor;
    for (let s = -24; s <= 24; s += 24) {
      ctx.beginPath();
      ctx.ellipse(s, -h / 2 - 4, 7, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();
  return canvas.toDataURL('image/png');
}

/**
 * ThumbnailGenerator class wrapper for backwards compatibility
 */
export class ThumbnailGenerator {
  generate(stepData) {
    return generatePieceThumbnail(stepData);
  }
}

export const thumbnailGenerator = new ThumbnailGenerator();

