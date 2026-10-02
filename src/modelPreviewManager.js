import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getBuggyMaterialColor } from './buggyLoader.js';
import { applyPlaneLegoMaterial } from './planeLoader.js';
import { applyAeroplaneLegoMaterial } from './aeroplaneLoader.js';
import { applyHelicopterLegoMaterial } from './helicopterLoader.js';
import { applyCafeLegoMaterial } from './cafeLoader.js';
import { applyHouseLegoMaterial } from './houseLoader.js';

// --- ABS Plastic Material Palettes ---

// Train Materials
const TRAIN_MAT_WHEELS = new THREE.MeshPhysicalMaterial({
  color: 0x222528,
  roughness: 0.32,
  metalness: 0.12,
  clearcoat: 0.45,
  clearcoatRoughness: 0.2
});

const TRAIN_MAT_ALLOY_RIM = new THREE.MeshPhysicalMaterial({
  color: 0xc8d0d6,
  roughness: 0.18,
  metalness: 0.72,
  clearcoat: 0.5,
  clearcoatRoughness: 0.15
});

const TRAIN_MAT_CHASSIS_DARK = new THREE.MeshPhysicalMaterial({
  color: 0x2e3338,
  roughness: 0.3,
  metalness: 0.08,
  clearcoat: 0.42,
  clearcoatRoughness: 0.2
});

const TRAIN_MAT_BODY_RED = new THREE.MeshPhysicalMaterial({
  color: 0xd91e18,
  roughness: 0.24,
  metalness: 0.0,
  clearcoat: 0.45,
  clearcoatRoughness: 0.15
});

const TRAIN_MAT_YELLOW_ACCENT = new THREE.MeshPhysicalMaterial({
  color: 0xf6bb12,
  roughness: 0.24,
  metalness: 0.0,
  clearcoat: 0.4,
  clearcoatRoughness: 0.15
});

const TRAIN_MAT_ROOF_GREY = new THREE.MeshPhysicalMaterial({
  color: 0x505559,
  roughness: 0.28,
  metalness: 0.06,
  clearcoat: 0.35,
  clearcoatRoughness: 0.2
});

const TRAIN_MAT_WINDOW_GLASS = new THREE.MeshStandardMaterial({
  color: 0x709fc8,
  roughness: 0.1,
  metalness: 0.1,
  transparent: true,
  opacity: 0.7,
  depthWrite: false
});

const TRAIN_MAT_MAGNET = new THREE.MeshStandardMaterial({
  color: 0x9aa2a9,
  roughness: 0.28,
  metalness: 0.65
});

// Boat Materials
const BOAT_MAT_WHITE = new THREE.MeshPhysicalMaterial({
  color: 0xf8fafc,
  roughness: 0.22,
  metalness: 0.0,
  clearcoat: 0.5,
  clearcoatRoughness: 0.12
});

const BOAT_MAT_RED = new THREE.MeshPhysicalMaterial({
  color: 0xd91e18,
  roughness: 0.24,
  metalness: 0.0,
  clearcoat: 0.45,
  clearcoatRoughness: 0.15
});

const BOAT_MAT_LIGHT_GREY = new THREE.MeshPhysicalMaterial({
  color: 0x94a3b8,
  roughness: 0.26,
  metalness: 0.08,
  clearcoat: 0.4,
  clearcoatRoughness: 0.18
});

const BOAT_MAT_BLACK = new THREE.MeshPhysicalMaterial({
  color: 0x222528,
  roughness: 0.28,
  metalness: 0.08,
  clearcoat: 0.42,
  clearcoatRoughness: 0.2
});

const BOAT_MAT_TRANS_CYAN = new THREE.MeshStandardMaterial({
  color: 0x38bdf8,
  roughness: 0.08,
  metalness: 0.1,
  transparent: true,
  opacity: 0.7,
  depthWrite: false
});

const BOAT_MAT_YELLOW = new THREE.MeshPhysicalMaterial({
  color: 0xfacc15,
  roughness: 0.24,
  metalness: 0.0,
  clearcoat: 0.45,
  clearcoatRoughness: 0.15
});

function applyTrainMaterials(root) {
  const meshes = [];
  root.traverse((child) => {
    if (child.isMesh) {
      child.visible = true;
      meshes.push(child);
    }
  });

  const rootBox = new THREE.Box3().setFromObject(root);
  const minY = rootBox.min.y;
  const maxY = rootBox.max.y;
  const height = Math.max(0.001, maxY - minY);

  meshes.forEach((mesh) => {
    const origMatName = mesh.material?.name || (Array.isArray(mesh.material) ? mesh.material[0]?.name : '') || mesh.name || '';
    const meshBox = new THREE.Box3().setFromObject(mesh);
    const meshCenterY = (meshBox.min.y + meshBox.max.y) / 2;
    const heightFraction = (meshCenterY - minY) / height;

    if (
      origMatName.includes('Trans_') ||
      origMatName === 'Trans_Medium_Blue' ||
      origMatName.includes('Glass') ||
      origMatName.includes('Window') ||
      mesh.name.toLowerCase().includes('window')
    ) {
      mesh.material = TRAIN_MAT_WINDOW_GLASS.clone();
    } else if (origMatName === 'Magnet' || origMatName.includes('Magnet') || mesh.name.toLowerCase().includes('coupler') || mesh.name.toLowerCase().includes('magnet')) {
      mesh.material = TRAIN_MAT_MAGNET.clone();
    } else if (origMatName === 'Electric_Contact_Alloy' || origMatName.includes('Alloy') || origMatName.includes('Rim') || mesh.name.toLowerCase().includes('rim')) {
      mesh.material = TRAIN_MAT_ALLOY_RIM.clone();
    } else if (origMatName === 'Yellow' || origMatName.includes('Yellow') || mesh.name.toLowerCase().includes('whistle') || mesh.name.toLowerCase().includes('lamp') || mesh.name.toLowerCase().includes('stripe')) {
      mesh.material = TRAIN_MAT_YELLOW_ACCENT.clone();
    } else if (heightFraction <= 0.22) {
      mesh.material = TRAIN_MAT_WHEELS.clone();
    } else if (heightFraction <= 0.76) {
      if (origMatName === 'Black' || origMatName.includes('Dark') || origMatName.includes('Chassis') || origMatName.includes('Bogie')) {
        mesh.material = TRAIN_MAT_CHASSIS_DARK.clone();
      } else {
        mesh.material = TRAIN_MAT_BODY_RED.clone();
      }
    } else {
      mesh.material = TRAIN_MAT_ROOF_GREY.clone();
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
}

function applyBoatMaterials(root) {
  root.traverse((child) => {
    if (child.isMesh) {
      child.visible = true;
      const origName = (child.material && child.material.name) ? child.material.name : child.name || '';
      if (origName.includes('Trans_') || origName.includes('Blue') || origName === 'Trans_Light_Blue' || child.name.toLowerCase().includes('windshield')) {
        child.material = BOAT_MAT_TRANS_CYAN.clone();
      } else if (origName.includes('Red') || child.name.toLowerCase().includes('red') || child.name.toLowerCase().includes('gunwale') || child.name.toLowerCase().includes('freeboard')) {
        child.material = BOAT_MAT_RED.clone();
      } else if (origName.includes('White') || child.name.toLowerCase().includes('white') || child.name.toLowerCase().includes('bow') || child.name.toLowerCase().includes('cabin')) {
        child.material = BOAT_MAT_WHITE.clone();
      } else if (origName.includes('Grey') || origName.includes('Gray') || child.name.toLowerCase().includes('deck') || child.name.toLowerCase().includes('floor')) {
        child.material = BOAT_MAT_LIGHT_GREY.clone();
      } else if (origName.includes('Black') || child.name.toLowerCase().includes('black') || child.name.toLowerCase().includes('engine') || child.name.toLowerCase().includes('motor')) {
        child.material = BOAT_MAT_BLACK.clone();
      } else if (origName.includes('Yellow') || child.name.toLowerCase().includes('yellow') || child.name.toLowerCase().includes('cowl')) {
        child.material = BOAT_MAT_YELLOW.clone();
      } else {
        child.material = BOAT_MAT_WHITE.clone();
      }
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function applyHouseMaterials(root) {
  root.traverse((child) => {
    if (child.isMesh) {
      child.visible = true;
      const origName = (child.material && child.material.name) ? child.material.name : child.name || '';
      if (origName.includes('Trans_Clear') || origName.includes('Clear') || origName.includes('Glass') || origName.includes('Window') || child.name.toLowerCase().includes('window')) {
        child.material = new THREE.MeshStandardMaterial({ color: 0xbae6fd, roughness: 0.08, transparent: true, opacity: 0.65, depthWrite: false });
      } else if (origName.includes('Trans_Yellow') || origName.includes('Lantern')) {
        child.material = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.08, transparent: true, opacity: 0.75, depthWrite: false });
      } else if (origName.includes('Red') || child.name.toLowerCase().includes('roof')) {
        child.material = new THREE.MeshPhysicalMaterial({ color: 0xd91e18, roughness: 0.24, clearcoat: 0.45, clearcoatRoughness: 0.15 });
      } else if (origName.includes('Green') || child.name.toLowerCase().includes('tree') || child.name.toLowerCase().includes('leaf') || child.name.toLowerCase().includes('lawn')) {
        child.material = new THREE.MeshPhysicalMaterial({ color: 0x16a34a, roughness: 0.24, clearcoat: 0.45, clearcoatRoughness: 0.15 });
      } else if (origName.includes('Brown') || child.name.toLowerCase().includes('trunk') || child.name.toLowerCase().includes('branch')) {
        child.material = new THREE.MeshPhysicalMaterial({ color: 0x78350f, roughness: 0.32, clearcoat: 0.38, clearcoatRoughness: 0.2 });
      } else if (origName.includes('Light_Grey') || child.name.toLowerCase().includes('path') || child.name.toLowerCase().includes('step')) {
        child.material = new THREE.MeshPhysicalMaterial({ color: 0x94a3b8, roughness: 0.26, clearcoat: 0.4, clearcoatRoughness: 0.18 });
      } else if (origName.includes('Dark_Grey') || origName.includes('Black') || child.name.toLowerCase().includes('foundation')) {
        child.material = new THREE.MeshPhysicalMaterial({ color: 0x1e293b, roughness: 0.28, clearcoat: 0.42, clearcoatRoughness: 0.2 });
      } else if (origName.includes('Yellow') || child.name.toLowerCase().includes('flower')) {
        child.material = new THREE.MeshPhysicalMaterial({ color: 0xfacc15, roughness: 0.24, clearcoat: 0.45, clearcoatRoughness: 0.15 });
      } else {
        child.material = new THREE.MeshPhysicalMaterial({ color: 0xf8fafc, roughness: 0.22, clearcoat: 0.5, clearcoatRoughness: 0.12 });
      }
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

/**
 * ModelPreviewManager
 * Manages live 3D mini-viewports for model selection cards.
 */
const MODEL_PREVIEW_DEFINITIONS = {
  train: {
    paths: ['/train.glb', './train.glb', '/public/train.glb', './assets/train.glb'],
    options: {
      targetSize: 3.1,
      rotationX: Math.PI, // Flip train upright (raw GLB has inverted Y/Z)
      offsetY: 0.05,
      cameraPos: [0, 1.6, 4.8],
      cameraTarget: [0, 0.05, 0],
      initialRotY: 0.35,
      isTrain: true
    }
  },
  boat: {
    paths: ['/assets/boat.glb', './assets/boat.glb', '/public/assets/boat.glb'],
    options: {
      targetSize: 3.3,
      rotationX: -Math.PI / 2, // Lay boat flat horizontally
      offsetY: 0.05,
      cameraPos: [0, 1.8, 4.6],
      cameraTarget: [0, 0.05, 0],
      initialRotY: -0.5,
      isBoat: true
    }
  },
  housetree: {
    paths: ['/housetree.glb', './housetree.glb', '/house_tree.glb', './house_tree.glb'],
    options: {
      targetSize: 3.3,
      offsetY: 0.05,
      cameraPos: [0, 1.4, 4.6],
      cameraTarget: [0, 0.05, 0],
      initialRotY: 0.05,
      isHouse: true
    }
  },
  buggy_car: {
    paths: ['/assets/buggy_car.glb', './assets/buggy_car.glb', '/public/assets/buggy_car.glb'],
    options: {
      targetSize: 3.3,
      rotationX: -Math.PI / 2,
      cameraPos: [3.8, 2.4, 4.8],
      cameraTarget: [0, 0, 0],
      initialRotY: 0.45,
      isBuggyCar: true
    }
  },
  plane: {
    paths: ['/mini_plane.glb', './mini_plane.glb', '/assets/mini_plane.glb'],
    options: {
      targetSize: 3.3,
      offsetY: 0.05,
      cameraPos: [3.4, 2.2, 4.4],
      cameraTarget: [0, 0.05, 0],
      initialRotY: 0.2,
      isPlane: true
    }
  },
  aeroplane: {
    paths: ['/aeroplane.glb', './aeroplane.glb', '/assets/aeroplane.glb'],
    options: {
      targetSize: 3.5,
      offsetY: 0.05,
      cameraPos: [3.8, 2.2, 4.6],
      cameraTarget: [0, 0.05, 0],
      initialRotY: 0.2,
      isAeroplane: true
    }
  },
  helicopter: {
    paths: ['/helicopter.glb', './helicopter.glb', '/assets/helicopter.glb'],
    options: {
      targetSize: 3.2,
      offsetY: 0.05,
      cameraPos: [3.4, 2.4, 4.2],
      cameraTarget: [0, 0.05, 0],
      initialRotY: 0.2,
      isHelicopter: true
    }
  },
  small_cafe: {
    paths: ['/SMALL_CAFE.glb', './SMALL_CAFE.glb', '/assets/SMALL_CAFE.glb'],
    options: {
      targetSize: 3.6,
      offsetY: 0.05,
      cameraPos: [3.8, 2.6, 4.8],
      cameraTarget: [0, 0.05, 0],
      initialRotY: 0.3,
      isCafe: true
    }
  }
};

export class ModelPreviewManager {
  constructor() {
    this.loader = new GLTFLoader();
    this.previews = new Map();
    this.animId = null;
    this.lastTime = performance.now();
    this.initialized = false;
  }

  init() {
    // Discover preview canvases from the cards so new catalog entries flow
    // through the same UI and renderer once their model config is registered.
    document.querySelectorAll('.model-mini-canvas[data-model]').forEach((canvas) => {
      const modelId = canvas.dataset.model;
      const definition = MODEL_PREVIEW_DEFINITIONS[modelId];
      if (this.previews.has(modelId) || !definition) return;
      this.setupMiniViewport(modelId, canvas, definition.paths, definition.options);
    });

    if (!this.animId) {
      this.startLoop();
    }
    this.initialized = true;

    // Window resize listener
    window.addEventListener('resize', () => {
      this.resize();
    });
  }

  setupMiniViewport(modelId, canvas, candidatePaths, config = {}) {
    const width = canvas.clientWidth || 240;
    const height = canvas.clientHeight || 140;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, Math.max(0.1, width / height), 0.1, 50);
    camera.position.set(...(config.cameraPos || [0, 1.6, 4.8]));
    const lookTarget = new THREE.Vector3(...(config.cameraTarget || [0, 0, 0]));
    camera.lookAt(lookTarget);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
    } catch (err) {
      console.warn('[ModelPreview] Failed to create WebGLRenderer for mini canvas:', err);
      return;
    }

    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // Balanced Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xbae6fd, 1.1);
    fillLight.position.set(-4, 3, -3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffedd5, 0.9);
    rimLight.position.set(0, 4, -4);
    scene.add(rimLight);

    const previewGroup = new THREE.Group();
    scene.add(previewGroup);

    const previewEntry = {
      modelId,
      canvas,
      renderer,
      scene,
      camera,
      previewGroup,
      modelRoot: null,
      rotationSpeed: config.rotationSpeed !== undefined ? config.rotationSpeed : 0.12,
      currentRotY: config.initialRotY !== undefined ? config.initialRotY : 0.35,
      lookTarget
    };
    this.previews.set(modelId, previewEntry);

    const paths = Array.isArray(candidatePaths) ? candidatePaths : [candidatePaths];

    const tryLoad = (idx) => {
      if (idx >= paths.length) {
        console.warn(`[ModelPreview] Could not load model preview for: ${modelId}`);
        return;
      }
      const path = paths[idx];
      this.loader.load(
        path,
        (gltf) => {
          const rawScene = gltf.scene;

          if (config.rotationX) rawScene.rotation.x = config.rotationX;
          if (config.rotationY) rawScene.rotation.y = config.rotationY;
          if (config.rotationZ) rawScene.rotation.z = config.rotationZ;
          rawScene.updateMatrixWorld(true);

          if (config.isTrain) {
            applyTrainMaterials(rawScene);
          } else if (config.isBoat) {
            applyBoatMaterials(rawScene);
          } else if (config.isHouse) {
            const modelRoots = rawScene.children.filter((child) =>
              child.name === 'housetree.obj' &&
              child.children.length === 196
            );
            const sourceRoot = modelRoots[0] || rawScene.children[0] || rawScene;
            modelRoots.slice(1).forEach((duplicate) => rawScene.remove(duplicate));

            rawScene.updateMatrixWorld(true);
            const sourceUp = new THREE.Vector3(0, 0, 1)
              .transformDirection(sourceRoot.matrixWorld);
            const levelToYUp = new THREE.Quaternion().setFromUnitVectors(
              sourceUp,
              new THREE.Vector3(0, 1, 0)
            );
            const faceForward = new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(0, 1, 0),
              Math.PI / 2
            );
            rawScene.quaternion.copy(faceForward.multiply(levelToYUp));
            rawScene.updateMatrixWorld(true);

            rawScene.traverse((child) => {
              if (child.isMesh) {
                child.visible = true;
                const origMatName = child.material?.name || (Array.isArray(child.material) ? child.material[0]?.name : '');
                applyHouseLegoMaterial(child, origMatName);
              }
            });
          } else if (config.isBuggyCar) {
            rawScene.traverse((child) => {
              if (!child.isMesh) return;
              child.visible = true;
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              materials.forEach((material) => {
                if (!material) return;
                const name = material.name || '';
                const authoredPaletteColor = getBuggyMaterialColor(name);
                if (authoredPaletteColor !== null && material.color) material.color.setHex(authoredPaletteColor);
                material.transparent = false;
                material.metalness = name.includes('Metallic_Silver') ? 0.62 : 0.02;
                material.roughness = name.includes('Rubber_Black') ? 0.72 : name.includes('Metallic_Silver') ? 0.24 : 0.32;
              });
            });
          } else if (config.isPlane) {
            const duplicate = rawScene.getObjectByName('mini_planeobj_1');
            if (duplicate && duplicate !== rawScene) {
              duplicate.parent.remove(duplicate);
            }
            const primary = rawScene.getObjectByName('mini_planeobj') || rawScene.children[0] || rawScene;
            primary.position.set(0, 0, 0);
            primary.rotation.set(0, 0, 0);
            primary.scale.set(1, 1, 1);
            const localForward = new THREE.Vector3(-Math.sqrt(3) / 2, 0.5, 0);
            const localRight = new THREE.Vector3(0.5, Math.sqrt(3) / 2, 0);
            const localUp = new THREE.Vector3(0, 0, 1);
            const basisMatrix = new THREE.Matrix4().set(
              localRight.x, localRight.y, localRight.z, 0,
              localUp.x, localUp.y, localUp.z, 0,
              -localForward.x, -localForward.y, -localForward.z, 0,
              0, 0, 0, 1
            );
            primary.quaternion.setFromRotationMatrix(basisMatrix);
            primary.updateMatrixWorld(true);

            rawScene.traverse((child) => {
              if (child.isMesh) {
                child.visible = true;
                const origMatName = child.material?.name || (Array.isArray(child.material) ? child.material[0]?.name : '');
                applyPlaneLegoMaterial(child, origMatName);
              }
            });
          } else if (config.isAeroplane) {
            const primary = rawScene.getObjectByName('aeroplane.obj') || rawScene.getObjectByName('aeroplaneobj') || rawScene.children[0] || rawScene;
            primary.position.set(0, 0, 0);
            primary.rotation.set(0, 0, 0);
            primary.scale.set(1, 1, 1);
            const localForward = new THREE.Vector3(1, 0, 0);
            const localRight = new THREE.Vector3(0, -1, 0);
            const localUp = new THREE.Vector3(0, 0, 1);
            const basisMatrix = new THREE.Matrix4().set(
              localRight.x, localRight.y, localRight.z, 0,
              localUp.x, localUp.y, localUp.z, 0,
              -localForward.x, -localForward.y, -localForward.z, 0,
              0, 0, 0, 1
            );
            primary.quaternion.setFromRotationMatrix(basisMatrix);
            primary.updateMatrixWorld(true);

            rawScene.traverse((child) => {
              if (child.isMesh) {
                child.visible = true;
                const origMatName = child.material?.name || (Array.isArray(child.material) ? child.material[0]?.name : '');
                applyAeroplaneLegoMaterial(child, origMatName);
              }
            });
          } else if (config.isHelicopter) {
            const primary = rawScene.getObjectByName('helicopter.obj') || rawScene.getObjectByName('helicopterobj') || rawScene.children[0] || rawScene;
            primary.position.set(0, 0, 0);
            primary.rotation.set(0, 0, 0);
            primary.scale.set(1, 1, 1);
            const localForward = new THREE.Vector3(0.5, -Math.sqrt(3) / 2, 0);
            const localRight = new THREE.Vector3(-Math.sqrt(3) / 2, -0.5, 0);
            const localUp = new THREE.Vector3(0, 0, 1);
            const basisMatrix = new THREE.Matrix4().set(
              localRight.x, localRight.y, localRight.z, 0,
              localUp.x, localUp.y, localUp.z, 0,
              -localForward.x, -localForward.y, -localForward.z, 0,
              0, 0, 0, 1
            );
            primary.quaternion.setFromRotationMatrix(basisMatrix);
            primary.updateMatrixWorld(true);

            rawScene.traverse((child) => {
              if (child.isMesh) {
                child.visible = true;
                const origMatName = child.material?.name || (Array.isArray(child.material) ? child.material[0]?.name : '');
                applyHelicopterLegoMaterial(child, origMatName);
              }
            });
          } else if (config.isCafe) {
            const duplicate = rawScene.getObjectByName('cafe_smallobj_1');
            if (duplicate && duplicate !== rawScene) {
              duplicate.parent.remove(duplicate);
            }
            const primary = rawScene.getObjectByName('cafe_smallobj') || rawScene.getObjectByName('cafe_small.obj') || rawScene.children[0] || rawScene;
            primary.position.set(0, 0, 0);
            primary.rotation.set(-Math.PI / 2, 0, 0);
            primary.scale.set(1, 1, 1);
            primary.updateMatrixWorld(true);

            rawScene.traverse((child) => {
              if (child.isMesh) {
                child.visible = true;
                const origMatName = child.material?.name || (Array.isArray(child.material) ? child.material[0]?.name : '');
                applyCafeLegoMaterial(child, origMatName);
              }
            });
          } else {
            rawScene.traverse((child) => {
              if (child.isMesh) {
                child.visible = true;
                if (child.material) {
                  const mats = Array.isArray(child.material) ? child.material : [child.material];
                  mats.forEach((m) => {
                    if (m) {
                      m.transparent = false;
                      m.roughness = 0.24;
                      m.metalness = 0.05;
                    }
                  });
                }
              }
            });
          }

          // Auto center bounding box
          const box = new THREE.Box3().setFromObject(rawScene);
          const center = new THREE.Vector3();
          box.getCenter(center);
          rawScene.position.sub(center);

          if (config.offsetY) {
            rawScene.position.y += config.offsetY;
          }

          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          const targetSize = config.targetSize || 3.0;
          const autoScale = maxDim > 0 ? (targetSize / maxDim) : 0.3;

          // Fit the complete model to the card's actual aspect ratio. A fixed
          // camera distance cropped long models when the chooser used tall cards.
          const boundingSphere = box.getBoundingSphere(new THREE.Sphere());
          const scaledRadius = Math.max(0.1, boundingSphere.radius * autoScale);
          const verticalFov = THREE.MathUtils.degToRad(camera.fov);
          const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * Math.max(0.1, camera.aspect));
          const limitingFov = Math.min(verticalFov, horizontalFov);
          const fitMultiplier = config.fitMultiplier || 0.86;
          const fitDistance = (scaledRadius / Math.sin(limitingFov / 2)) * fitMultiplier;

          const cameraDirection = camera.position.clone().sub(lookTarget).normalize();
          camera.position.copy(lookTarget).addScaledVector(cameraDirection, fitDistance);
          camera.near = Math.max(0.05, fitDistance - scaledRadius * 2.5);
          camera.far = Math.max(50, fitDistance + scaledRadius * 4);
          camera.updateProjectionMatrix();

          const modelContainer = new THREE.Group();
          modelContainer.add(rawScene);
          modelContainer.scale.setScalar(autoScale);

          previewGroup.add(modelContainer);
          previewEntry.modelRoot = modelContainer;

          canvas.style.opacity = '1';
          this.renderPreview(previewEntry);
        },
        undefined,
        () => {
          tryLoad(idx + 1);
        }
      );
    };

    tryLoad(0);
  }

  startLoop() {
    const loop = (now) => {
      this.animId = requestAnimationFrame(loop);
      const delta = Math.min((now - this.lastTime) * 0.001, 0.1);
      this.lastTime = now;

      const modal = document.getElementById('model-select-modal');
      const isVisible = modal && modal.classList.contains('active');

      if (!isVisible) return;

      this.previews.forEach((entry) => {
        if (!entry.modelRoot) return;

        // Auto continuous spin
        entry.currentRotY += delta * entry.rotationSpeed;
        entry.modelRoot.rotation.y = entry.currentRotY;

        this.renderPreview(entry);
      });
    };

    this.animId = requestAnimationFrame(loop);
  }

  renderPreview(entry) {
    if (entry.renderer && entry.scene && entry.camera) {
      entry.renderer.render(entry.scene, entry.camera);
    }
  }

  resize() {
    this.previews.forEach((entry) => {
      if (!entry.canvas || !entry.renderer || !entry.camera) return;
      const width = entry.canvas.clientWidth || 240;
      const height = entry.canvas.clientHeight || 140;
      if (width > 0 && height > 0) {
        entry.camera.aspect = width / height;
        entry.camera.updateProjectionMatrix();
        entry.renderer.setSize(width, height, false);
        this.renderPreview(entry);
      }
    });
  }
}

export const modelPreviewManager = new ModelPreviewManager();
if (typeof window !== 'undefined') {
  window.modelPreviewManager = modelPreviewManager;
}
