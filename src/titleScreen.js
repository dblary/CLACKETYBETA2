import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * TitleScreen (Hybrid Title Screen Architecture)
 * 
 * Features:
 * - Loads 3D depth-displaced logo mesh (`clackety_logo.glb`) via GLTFLoader
 * - Auto-centers mesh geometry with THREE.Box3().setFromObject(logoMesh) & normalizes position to (0, 0, 0)
 * - Fixed upright orientation facing camera: logoMesh.rotation.x = -Math.PI / 2
 * - Uniform scale ~0.42 (approx 0.38-0.45) centered in upper two-thirds above start button
 * - Glossy Toy Plastic materials: transparent, alphaTest=0.05, depthWrite=true, roughness=0.22, metalness=0.02
 * - Clamped camera orbit controls (within ±25°–30° polar & azimuth), zoom disabled
 * - Subtle toy breathing float: Math.sin(time * 0.0018) * 0.12
 * - Interactive mouse-tracking tilt damping (rotation.y & rotation.z)
 * - Custom CSS jelly button (#start-btn) centered at bottom: 12% with idle breathing & hover squash
 * - Smooth transition fading out title overlay, flying camera to isometric diorama, and mounting Bag 1 tray
 */
export class TitleScreen {
  constructor(options = {}) {
    this.container = options.container || document.getElementById('title-screen-overlay');
    this.canvas = options.canvas || document.getElementById('title-canvas');
    this.startBtn = options.startBtn || document.getElementById('start-btn');
    this.onStartBuilding = options.onStartBuilding || (() => { });
    this.sounds = options.sounds || {};

    this.assetPath = options.assetPath || './assets/clackety_logo.glb';
    this.uniformScale = options.uniformScale || 0.42; // approx 0.38 - 0.45

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.logoMesh = null;
    this.logoPivot = null;

    this.isActive = false;
    this.animFrameId = null;

    // Micro-interaction mouse tilt tracking
    this.targetTiltX = 0;
    this.targetTiltY = 0;
    this.targetTiltZ = 0;
    this.currentTiltX = 0;
    this.currentTiltY = 0;
    this.currentTiltZ = 0;

    this.onPointerMoveBound = this.onPointerMove.bind(this);
    this.onResizeBound = this.onResize.bind(this);
    this.onStartBtnClickBound = this.onStartBtnClick.bind(this);

    this.init();
  }

  init() {
    if (!this.canvas) {
      console.warn('[TitleScreen] Canvas element not found.');
      return;
    }

    // 1. Scene setup
    this.scene = new THREE.Scene();

    // 2. Camera setup (fov: 38, looking at origin)
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 8.5);
    this.camera.lookAt(0, 0, 0);

    // 3. WebGL Renderer with alpha transparency for hybrid blending
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // 4. Camera & Micro-Interaction Controls (OrbitControls clamped ±25°–30°, zoom disabled)
    this.setupControls();

    // 5. Studio Lighting for glossy toy plastic highlights
    this.setupLighting();

    // 6. Load and prepare 3D depth-displaced logo mesh
    this.loadLogoMesh();

    // 7. Event listeners
    window.addEventListener('pointermove', this.onPointerMoveBound, { passive: true });
    window.addEventListener('resize', this.onResizeBound);

    if (this.startBtn) {
      this.startBtn.addEventListener('click', this.onStartBtnClickBound);
    }

    this.isActive = true;
    this.renderLoop();
  }

  setupControls() {
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enableZoom = false; // Requirement 4: Disable zoom on the title canvas overlay
    this.controls.enablePan = false;

    // Requirement 4: Clamp camera orbit angles within ±25°–30°
    // Normal polar angle looking from (0, 0, 8.5) toward (0, 0, 0) is PI / 2 (~90°)
    const angleClampRad = THREE.MathUtils.degToRad(26); // ±26° clamp
    this.controls.minPolarAngle = Math.PI / 2 - angleClampRad; // ~64°
    this.controls.maxPolarAngle = Math.PI / 2 + angleClampRad; // ~116°
    this.controls.minAzimuthAngle = -angleClampRad;            // -26°
    this.controls.maxAzimuthAngle = angleClampRad;             // +26°
    this.controls.update();
  }

  setupLighting() {
    // Ambient light for rich vibrant colors
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.35);
    this.scene.add(ambientLight);

    // Warm Key Directional Light to generate crisp specular highlights on studs
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.3);
    keyLight.position.set(3.5, 4.5, 5.0);
    this.scene.add(keyLight);

    // Cool Fill Light for plastic rim depth
    const fillLight = new THREE.DirectionalLight(0xbae6fd, 1.1);
    fillLight.position.set(-3.5, 2.0, 3.5);
    this.scene.add(fillLight);

    // Specular Accent Point Light to accentuate stud tops during interactive tilt
    this.accentLight = new THREE.PointLight(0xffedd5, 1.4, 14);
    this.accentLight.position.set(0, 2.5, 3.0);
    this.scene.add(this.accentLight);
  }

  loadLogoMesh() {
    const loader = new GLTFLoader();

    loader.load(
      this.assetPath,
      (gltf) => {
        const logoScene = gltf.scene;

        // Traverse mesh and tune material for Glossy Toy Plastic (Requirement 3)
        logoScene.traverse((child) => {
          if (child.isMesh) {
            // Auto-center geometry so local center is (0, 0, 0)
            if (child.geometry) {
              child.geometry.computeBoundingBox();
              child.geometry.center();
            }

            // Material Tuning (Requirement 3)
            if (child.material) {
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              materials.forEach((mat) => {
                mat.transparent = true;
                mat.alphaTest = 0.05; // clean boundary cutouts without gray borders
                mat.depthWrite = true;
                mat.roughness = 0.22; // glossy highlights on studs
                mat.metalness = 0.02;
                mat.side = THREE.DoubleSide;

                if (mat.map) {
                  mat.map.anisotropy = 8;
                  mat.map.needsUpdate = true;
                }
              });
            }
          }
        });

        this.logoMesh = logoScene;

        // Auto-center the mesh geometry using THREE.Box3().setFromObject(logoMesh) & normalize position to (0, 0, 0)
        const box = new THREE.Box3().setFromObject(this.logoMesh);
        const center = box.getCenter(new THREE.Vector3());
        this.logoMesh.position.set(-center.x, -center.y, -center.z);

        // Requirement 2: Fixed orientation upright to face camera directly: logoMesh.rotation.x = -Math.PI / 2
        this.logoMesh.rotation.x = -Math.PI / 2;

        // Wrap in pivot group for position and scaling
        this.logoPivot = new THREE.Group();
        this.logoPivot.name = 'logo-pivot-group';
        this.logoPivot.add(this.logoMesh);
        this.scene.add(this.logoPivot);

        // Responsive uniform scale (approx 0.38 - 0.45, centered in upper two-thirds)
        this.updateLogoScaleAndPosition();

        console.log('[TitleScreen] 3D Clackety Logo loaded successfully.');
      },
      undefined,
      (err) => {
        console.error('[TitleScreen] Error loading logo GLB:', err);
      }
    );
  }

  updateLogoScaleAndPosition() {
    if (!this.logoPivot || !this.camera || !this.canvas) return;

    const width = this.canvas.clientWidth || window.innerWidth || 1;
    const height = this.canvas.clientHeight || window.innerHeight || 1;
    const aspect = width / height;

    if (aspect < 1.0) {
      this.camera.fov = Math.min(62, 38 / Math.max(aspect, 0.48));
    } else {
      this.camera.fov = 38;
    }
    this.camera.updateProjectionMatrix();

    let scale;
    let yOffset;

    if (height < 450) {
      // Requirement 3: adjust this.logoPivot.scale to 0.28–0.32 when viewport height is under 450px
      scale = 0.30;
      yOffset = 1.05;
    } else if (width < 640 || height < 640) {
      scale = 0.34;
      yOffset = 1.25;
    } else {
      scale = 0.42;
      yOffset = 1.48;
    }

    this.logoPivot.scale.set(scale, scale, scale);
    this.logoPivot.position.set(0, yOffset, 0);
  }

  onPointerMove(e) {
    const width = window.innerWidth || 1;
    const height = window.innerHeight || 1;

    const normX = (e.clientX / width) * 2 - 1;
    const normY = (e.clientY / height) * 2 - 1;

    // Requirement 5: Subtle mouse-tracking tilt targets
    this.targetTiltY = normX * 0.24;   // Interactive yaw to catch light highlights
    this.targetTiltZ = -normX * 0.10;  // Subtle roll
    this.targetTiltX = normY * 0.14;   // Subtle pitch

    if (this.accentLight) {
      this.accentLight.position.x = normX * 2.5;
      this.accentLight.position.y = 2.5 - normY * 1.5;
    }
  }

  onResize() {
    if (!this.renderer || !this.camera || !this.canvas) return;

    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.updateLogoScaleAndPosition();
  }

  renderLoop() {
    if (!this.isActive) return;

    this.animFrameId = requestAnimationFrame(() => this.renderLoop());

    const time = performance.now();

    // Requirement 5: Subtle Toy Breathing & Idle Bob in render loop
    if (this.logoMesh) {
      // Gentle vertical float
      this.logoMesh.position.y = Math.sin(time * 0.0018) * 0.12;

      // Subtle mouse-tracking tilt damping (rotation.y and rotation.z)
      this.currentTiltX += (this.targetTiltX - this.currentTiltX) * 0.06;
      this.currentTiltY += (this.targetTiltY - this.currentTiltY) * 0.06;
      this.currentTiltZ += (this.targetTiltZ - this.currentTiltZ) * 0.06;

      this.logoMesh.rotation.x = -Math.PI / 2 + this.currentTiltX;
      this.logoMesh.rotation.y = this.currentTiltY;
      this.logoMesh.rotation.z = this.currentTiltZ;
    }

    if (this.controls) {
      this.controls.update();
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  onStartBtnClick(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Sound effect
    try {
      if (this.sounds && typeof this.sounds.playPop === 'function') {
        this.sounds.playPop();
      }
    } catch (_) { }

    // Button click squash animation
    if (this.startBtn) {
      this.startBtn.classList.add('clicked');
      setTimeout(() => {
        if (this.startBtn) this.startBtn.classList.remove('clicked');
      }, 350);
    }

    // Requirement 6: UI Integration & Transition:
    // Smoothly fade out the title overlay canvas and UI layer
    if (this.container) {
      this.container.classList.add('fade-out');
    }

    // Trigger builder transition callback
    setTimeout(() => {
      if (this.container) {
        this.container.style.display = 'none';
      }
      this.pause();
      if (typeof this.onStartBuilding === 'function') {
        this.onStartBuilding();
      }
    }, 450);
  }

  show() {
    this.isActive = true;
    if (this.container) {
      this.container.style.display = 'block';
      // Force reflow
      void this.container.offsetWidth;
      this.container.classList.remove('fade-out');
    }
    this.renderLoop();
  }

  hide() {
    if (this.container) {
      this.container.classList.add('fade-out');
      setTimeout(() => {
        if (this.container) this.container.style.display = 'none';
        this.pause();
      }, 450);
    } else {
      this.pause();
    }
  }

  pause() {
    this.isActive = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  dispose() {
    this.pause();
    window.removeEventListener('pointermove', this.onPointerMoveBound);
    window.removeEventListener('resize', this.onResizeBound);

    if (this.startBtn) {
      this.startBtn.removeEventListener('click', this.onStartBtnClickBound);
    }

    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}

/**
 * Convenience factory helper for TitleScreen initialization
 */
export function setupTitleScreen(options = {}) {
  return new TitleScreen(options);
}
