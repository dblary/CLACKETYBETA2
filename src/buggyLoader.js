import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createBrickEdgeLines } from './trainLoader.js';

const BUGGY_PARTS = [
  { title: 'Left Chassis Rail', shortTitle: 'Left Rail', color: '#334155', category: 'plates', bag: 1 },
  { title: 'Right Chassis Rail', shortTitle: 'Right Rail', color: '#334155', category: 'plates', bag: 1 },
  { title: 'Chassis Crossbeam', shortTitle: 'Crossbeam', color: '#334155', category: 'plates', bag: 1 },
  { title: 'Lower Chassis Support', shortTitle: 'Base Support', color: '#334155', category: 'plates', bag: 1 },
  { title: 'Red Body Panel 1', shortTitle: 'Body Panel 1', color: '#d91e18', category: 'bricks', bag: 2 },
  { title: 'Red Body Panel 2', shortTitle: 'Body Panel 2', color: '#d91e18', category: 'bricks', bag: 2 },
  { title: 'Red Body Panel 3', shortTitle: 'Body Panel 3', color: '#d91e18', category: 'bricks', bag: 2 },
  { title: 'Red Body Panel 4', shortTitle: 'Body Panel 4', color: '#d91e18', category: 'bricks', bag: 2 },
  { title: 'Left Side Fender', shortTitle: 'Left Fender', color: '#d91e18', category: 'slopes', bag: 2 },
  { title: 'Right Side Fender', shortTitle: 'Right Fender', color: '#d91e18', category: 'slopes', bag: 2 },
  { title: 'Cockpit Detail 1', shortTitle: 'Cockpit 1', color: '#222528', category: 'special', bag: 3 },
  { title: 'Cockpit Detail 2', shortTitle: 'Cockpit 2', color: '#222528', category: 'special', bag: 3 },
  { title: 'Red Body Accent', shortTitle: 'Body Accent', color: '#d91e18', category: 'special', bag: 3 },
  { title: 'Front Bumper', shortTitle: 'Bumper', color: '#94a3b8', category: 'special', bag: 3 },
  { title: 'Wheel Rim 1', shortTitle: 'Rim 1', color: '#cbd5e1', category: 'wheels', bag: 4 },
  { title: 'Wheel Rim 2', shortTitle: 'Rim 2', color: '#cbd5e1', category: 'wheels', bag: 4 },
  { title: 'Wheel Rim 3', shortTitle: 'Rim 3', color: '#cbd5e1', category: 'wheels', bag: 4 },
  { title: 'Wheel Rim 4', shortTitle: 'Rim 4', color: '#cbd5e1', category: 'wheels', bag: 4 },
  { title: 'Rubber Tire 1', shortTitle: 'Tire 1', color: '#18181b', category: 'wheels', bag: 4 },
  { title: 'Rubber Tire 2', shortTitle: 'Tire 2', color: '#18181b', category: 'wheels', bag: 4 },
  { title: 'Rubber Tire 3', shortTitle: 'Tire 3', color: '#18181b', category: 'wheels', bag: 4 },
  { title: 'Rubber Tire 4', shortTitle: 'Tire 4', color: '#18181b', category: 'wheels', bag: 4 }
];

// The GLB uses these named materials but omits PBR baseColorFactor and
// vertex-color data, so Three.js otherwise renders every part white.
const BUGGY_MATERIAL_PALETTE = Object.freeze({
  Dark_Grey: 0x334155,
  Light_Grey: 0xcbd5e1,
  Metallic_Silver: 0xc8d0d6,
  Rubber_Black: 0x18181b,
  Red: 0xd91e18,
  Black: 0x222528
});

export function getBuggyMaterialColor(materialName = '') {
  const name = materialName.toLowerCase();
  const entry = Object.entries(BUGGY_MATERIAL_PALETTE)
    .find(([paletteName]) => name.includes(paletteName.toLowerCase()));
  return entry ? entry[1] : null;
}

export const BUGGY_CAR_ASSEMBLY_STAGES = [
  {
    id: 1, bagNumber: 1, name: 'Chassis', shortName: 'Chassis', icon: '🧱', totalParts: 4,
    color: '#475569', bgLight: '#e2e8f0', badgeColor: '#334155', stepIndices: [0, 1, 2, 3]
  },
  {
    id: 2, bagNumber: 2, name: 'Red Bodywork', shortName: 'Bodywork', icon: '🏎️', totalParts: 6,
    color: '#ef4444', bgLight: '#fee2e2', badgeColor: '#b91c1c', stepIndices: [4, 5, 6, 7, 8, 9]
  },
  {
    id: 3, bagNumber: 3, name: 'Cockpit & Details', shortName: 'Cockpit', icon: '🪑', totalParts: 4,
    color: '#f59e0b', bgLight: '#fef3c7', badgeColor: '#b45309', stepIndices: [10, 11, 12, 13]
  },
  {
    id: 4, bagNumber: 4, name: 'Wheels & Tires', shortName: 'Wheels', icon: '🛞', totalParts: 8,
    color: '#0ea5e9', bgLight: '#e0f2fe', badgeColor: '#0369a1', stepIndices: [14, 15, 16, 17, 18, 19, 20, 21]
  }
];

function tuneBuggyMaterials(root) {
  root.traverse((object) => {
    if (!object.isMesh) return;

    const originalMaterials = Array.isArray(object.material) ? object.material : [object.material];
    const tunedMaterials = originalMaterials.map((original) => {
      if (!original?.clone) return original;
      const material = original.clone();
      const name = material.name || '';
      const authoredPaletteColor = getBuggyMaterialColor(name);
      if (authoredPaletteColor !== null && material.color) material.color.setHex(authoredPaletteColor);
      // Preserve each named GLB color while tuning only its surface response.
      if (name.includes('Metallic_Silver')) {
        material.metalness = 0.62;
        material.roughness = 0.24;
      } else if (name.includes('Rubber_Black')) {
        material.metalness = 0;
        material.roughness = 0.72;
      } else {
        material.metalness = Math.min(material.metalness || 0, 0.08);
        material.roughness = Math.min(material.roughness || 0.32, 0.38);
      }
      return material;
    });

    object.material = Array.isArray(object.material) ? tunedMaterials : tunedMaterials[0];
    object.castShadow = true;
    object.receiveShadow = true;
  });
}

function addPieceEdges(mesh) {
  const edges = createBrickEdgeLines(mesh.geometry, mesh.material);
  if (edges) mesh.add(edges);
}

function loadBuggyAsset(onProgress) {
  const loader = new GLTFLoader();
  const candidates = ['/assets/buggy_car.glb', './assets/buggy_car.glb', './public/assets/buggy_car.glb'];

  return new Promise((resolve, reject) => {
    let candidateIndex = 0;
    const tryNext = () => {
      if (candidateIndex >= candidates.length) {
        reject(new Error('Failed to load public/assets/buggy_car.glb'));
        return;
      }

      const path = candidates[candidateIndex++];
      loader.load(path, resolve, (event) => {
        if (event.total && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
      }, tryNext);
    };
    tryNext();
  });
}

/** Load the 22 authored Piece000–Piece021 parts as a guided four-bag build. */
export async function loadBuggyCarModel(onProgress) {
  const gltf = await loadBuggyAsset(onProgress);
  const model = gltf.scene;
  const modelGroup = new THREE.Group();
  modelGroup.name = 'buggyCarAssemblyGroup';
  modelGroup.add(model);

  const pieceNodes = new Map();
  model.traverse((object) => {
    const match = /^Piece(\d{3})$/i.exec(object.name || '');
    if (match) pieceNodes.set(Number(match[1]), object);
  });

  if (pieceNodes.size !== BUGGY_PARTS.length) {
    throw new Error(`Buggy car GLB should contain 22 Piece nodes; found ${pieceNodes.size}.`);
  }

  tuneBuggyMaterials(modelGroup);
  modelGroup.updateMatrixWorld(true);

  // The asset is Z-up. Align its authored up axis to the builder's Y-up world.
  const authoredRoot = model.getObjectByName('buggy_car.obj') || model;
  const sourceUp = new THREE.Vector3(0, 0, 1).transformDirection(authoredRoot.matrixWorld);
  const alignUp = new THREE.Quaternion().setFromUnitVectors(sourceUp, new THREE.Vector3(0, 1, 0));
  modelGroup.quaternion.copy(alignUp);
  modelGroup.updateMatrixWorld(true);

  let bounds = new THREE.Box3().setFromObject(modelGroup);
  const size = bounds.getSize(new THREE.Vector3());
  const footprint = Math.max(size.x, size.z);
  const scale = footprint > 0 ? 10.2 / footprint : 0.1;
  modelGroup.scale.setScalar(scale);
  modelGroup.updateMatrixWorld(true);

  bounds = new THREE.Box3().setFromObject(modelGroup);
  const center = bounds.getCenter(new THREE.Vector3());
  modelGroup.position.set(-center.x, 0.02 - bounds.min.y, -center.z);
  modelGroup.updateMatrixWorld(true);

  const steps = [];
  for (let index = 0; index < BUGGY_PARTS.length; index++) {
    const node = pieceNodes.get(index);
    const meshes = [];
    node.traverse((object) => {
      if (!object.isMesh) return;
      meshes.push(object);
      addPieceEdges(object);
    });

    if (!meshes.length) {
      throw new Error(`Buggy car piece Piece${String(index).padStart(3, '0')} has no mesh.`);
    }

    modelGroup.updateMatrixWorld(true);
    const pieceBounds = new THREE.Box3();
    meshes.forEach((mesh) => {
      mesh.updateMatrixWorld(true);
      pieceBounds.expandByObject(mesh);
    });

    const meta = BUGGY_PARTS[index];
    const pieceSize = pieceBounds.getSize(new THREE.Vector3());
    const dimensions = {
      studsX: Math.max(1, Math.round(pieceSize.x / 0.8)),
      studsZ: Math.max(1, Math.round(pieceSize.z / 0.8)),
      platesY: Math.max(1, Math.round(pieceSize.y / 0.32))
    };
    meshes.forEach((mesh) => {
      mesh.userData = {
        ...mesh.userData,
        stepIndex: index,
        stepNumber: index + 1,
        pieceName: node.name,
        isTrainMesh: true,
        isBuggyCarMesh: true,
        dimensions: { ...dimensions }
      };
    });

    steps.push({
      step: index + 1,
      title: meta.title,
      shortTitle: meta.shortTitle,
      category: meta.category,
      catLabel: meta.category === 'plates' ? 'Plates' : meta.category === 'wheels' ? 'Wheels' : meta.category === 'slopes' ? 'Slopes' : meta.category === 'special' ? 'Special' : 'Bricks',
      desc: `Place ${meta.shortTitle.toLowerCase()} onto the glowing guide to assemble the buggy car.`,
      colors: [meta.color],
      primaryColor: meta.color,
      quantity: 1,
      icon: meta.category === 'wheels' ? '🛞' : '🏎️',
      pieces: [{ name: node.name, node, meshes }],
      meshes,
      meshCount: meshes.length,
      pieceCount: 1,
      mountPos: pieceBounds.getCenter(new THREE.Vector3()),
      box: pieceBounds,
      targetRotationY: 0,
      rotationBakedIn: true,
      isSquareOrRound: Math.abs(pieceSize.x - pieceSize.z) < 0.28,
      stepSize: pieceSize,
      dimensions
    });

    meshes.forEach((mesh) => { mesh.visible = false; });
  }

  modelGroup.updateMatrixWorld(true);
  const finalBounds = new THREE.Box3().setFromObject(modelGroup);
  return {
    trainGroup: modelGroup,
    trainAssemblyGroup: modelGroup,
    model,
    box: finalBounds,
    size: finalBounds.getSize(new THREE.Vector3()),
    steps,
    stepCount: steps.length,
    totalSteps: steps.length,
    stages: BUGGY_CAR_ASSEMBLY_STAGES,
    scale,
    name: 'Buggy Car',
    icon: '🏎️'
  };
}
