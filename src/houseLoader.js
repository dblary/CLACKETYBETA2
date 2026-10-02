import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createBrickEdgeLines } from './trainLoader.js';

// High-Fidelity ABS Plastic Materials for House & Tree Model
const MAT_WHITE = new THREE.MeshPhysicalMaterial({
  color: 0xf8fafc,
  roughness: 0.22,
  metalness: 0.0,
  clearcoat: 0.5,
  clearcoatRoughness: 0.12
});

const MAT_RED = new THREE.MeshPhysicalMaterial({
  color: 0xd91e18,
  roughness: 0.24,
  metalness: 0.0,
  clearcoat: 0.45,
  clearcoatRoughness: 0.15
});

const MAT_GREEN = new THREE.MeshPhysicalMaterial({
  color: 0x16a34a,
  roughness: 0.24,
  metalness: 0.0,
  clearcoat: 0.45,
  clearcoatRoughness: 0.15
});

const MAT_DARK_GREEN = new THREE.MeshPhysicalMaterial({
  color: 0x15803d,
  roughness: 0.25,
  metalness: 0.0,
  clearcoat: 0.42,
  clearcoatRoughness: 0.18
});

const MAT_BROWN = new THREE.MeshPhysicalMaterial({
  color: 0x78350f,
  roughness: 0.32,
  metalness: 0.05,
  clearcoat: 0.38,
  clearcoatRoughness: 0.2
});

const MAT_REDDISH_BROWN = new THREE.MeshPhysicalMaterial({
  color: 0x9a3412,
  roughness: 0.3,
  metalness: 0.05,
  clearcoat: 0.4,
  clearcoatRoughness: 0.18
});

const MAT_LIGHT_GREY = new THREE.MeshPhysicalMaterial({
  color: 0x94a3b8,
  roughness: 0.26,
  metalness: 0.08,
  clearcoat: 0.4,
  clearcoatRoughness: 0.18
});

const MAT_DARK_GREY = new THREE.MeshPhysicalMaterial({
  color: 0x334155,
  roughness: 0.28,
  metalness: 0.08,
  clearcoat: 0.42,
  clearcoatRoughness: 0.2
});

const MAT_BLACK = new THREE.MeshPhysicalMaterial({
  color: 0x1e293b,
  roughness: 0.28,
  metalness: 0.08,
  clearcoat: 0.42,
  clearcoatRoughness: 0.2
});

const MAT_YELLOW = new THREE.MeshPhysicalMaterial({
  color: 0xfacc15,
  roughness: 0.24,
  metalness: 0.0,
  clearcoat: 0.45,
  clearcoatRoughness: 0.15
});

const MAT_TRANS_CLEAR = new THREE.MeshStandardMaterial({
  color: 0xbae6fd,
  roughness: 0.08,
  metalness: 0.1,
  transparent: true,
  opacity: 0.65,
  depthWrite: false
});

const MAT_TRANS_YELLOW = new THREE.MeshStandardMaterial({
  color: 0xfef08a,
  roughness: 0.08,
  metalness: 0.1,
  transparent: true,
  opacity: 0.75,
  depthWrite: false
});

export const HOUSE_ASSEMBLY_STAGES = [
  {
    id: 1,
    bagNumber: 1,
    name: 'Foundation, Lawn & Fence',
    label: 'Bag 1: Lawn & Base',
    shortName: 'Base/Lawn',
    icon: '🌱',
    totalParts: 49,
    color: '#22c55e',
    bgLight: '#dcfce7',
    badgeColor: '#15803d',
    stepIndices: Array.from({ length: 49 }, (_, i) => i) // 0 to 48
  },
  {
    id: 2,
    bagNumber: 2,
    name: 'House Walls, Windows & Door',
    label: 'Bag 2: House Walls',
    shortName: 'Walls/Door',
    icon: '🏡',
    totalParts: 49,
    color: '#3b82f6',
    bgLight: '#dbeafe',
    badgeColor: '#1d4ed8',
    stepIndices: Array.from({ length: 49 }, (_, i) => i + 49) // 49 to 97
  },
  {
    id: 3,
    bagNumber: 3,
    name: 'Red Gable Roof & Chimney',
    label: 'Bag 3: Roof & Chimney',
    shortName: 'Roof/Chimney',
    icon: '🧱',
    totalParts: 49,
    color: '#ef4444',
    bgLight: '#fee2e2',
    badgeColor: '#b91c1c',
    stepIndices: Array.from({ length: 49 }, (_, i) => i + 98) // 98 to 146
  },
  {
    id: 4,
    bagNumber: 4,
    name: 'Garden Tree, Foliage & Flowers',
    label: 'Bag 4: Garden Tree',
    shortName: 'Tree/Garden',
    icon: '🌳',
    totalParts: 49,
    color: '#f59e0b',
    bgLight: '#fef3c7',
    badgeColor: '#b45309',
    stepIndices: Array.from({ length: 49 }, (_, i) => i + 147) // 147 to 195
  }
];

export function applyHouseLegoMaterial(mesh, origMatName) {
  const name = origMatName || '';
  if (name.includes('Trans_Clear') || name.includes('Clear') || name.includes('Glass')) {
    mesh.material = MAT_TRANS_CLEAR.clone();
  } else if (name.includes('Trans_Yellow') || name.includes('Light')) {
    mesh.material = MAT_TRANS_YELLOW.clone();
  } else if (name === 'Red' || name.includes('Red')) {
    mesh.material = MAT_RED.clone();
  } else if (name === 'Green' || name.includes('Green')) {
    mesh.material = MAT_GREEN.clone();
  } else if (name.includes('Brown') || name === 'Reddish_Brown') {
    mesh.material = MAT_BROWN.clone();
  } else if (name === 'White' || name.includes('White')) {
    mesh.material = MAT_WHITE.clone();
  } else if (name === 'Light_Grey' || name.includes('Light_Grey')) {
    mesh.material = MAT_LIGHT_GREY.clone();
  } else if (name === 'Dark_Grey' || name.includes('Dark_Grey')) {
    mesh.material = MAT_DARK_GREY.clone();
  } else if (name === 'Black' || name.includes('Black')) {
    mesh.material = MAT_BLACK.clone();
  } else if (name === 'Yellow' || name.includes('Yellow')) {
    mesh.material = MAT_YELLOW.clone();
  } else {
    mesh.material = MAT_WHITE.clone();
  }
}

/**
 * Loads housetree.glb, scales and centers it cleanly,
 * and organizes all 196 pieces across 4 staged bags (49 pieces each).
 */
export function loadHouseModel(onProgress) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    const candidateUrls = [
      './public/assets/housetree.glb',
      '/public/assets/housetree.glb',
      './assets/housetree.glb',
      './housetree.glb'
    ];

    let currentUrlIndex = 0;

    const tryLoad = (url) => {
      loader.load(
        url,
        (gltf) => {
          const houseRoot = gltf.scene;

          // This GLB exports the same 196-piece model three times. Keep one
          // copy so assembly visibility and outlines are applied only once.
          const modelRoots = houseRoot.children.filter((child) =>
            child.name === 'housetree.obj' &&
            child.children.length === 196 &&
            child.children[0]?.name === 'Piece000' &&
            child.children[195]?.name === 'Piece195'
          );
          const sourceRoot = modelRoots[0] || houseRoot.children[0];
          modelRoots.slice(1).forEach((duplicate) => houseRoot.remove(duplicate));

          // The lawn plate is authored in the asset's local XY plane, so its
          // local +Z normal is the reliable up direction. Correct the imported
          // tilt before applying the model's intended front-facing yaw.
          houseRoot.updateMatrixWorld(true);
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
          houseRoot.quaternion.copy(faceForward.multiply(levelToYUp));
          houseRoot.updateMatrixWorld(true);

          const houseGroup = new THREE.Group();
          houseGroup.name = 'houseAssemblyGroup';
          houseGroup.add(houseRoot);

          // Compute initial Box3 and unit scale
          let box = new THREE.Box3().setFromObject(houseRoot);
          let size = new THREE.Vector3();
          box.getSize(size);

          const currentLength = Math.max(size.x, size.z);
          const targetLength = 11.5; // Optimal size for builder diorama
          const scale = currentLength > 20 ? (targetLength / currentLength) : 0.016;
          houseRoot.scale.setScalar(scale);
          houseRoot.updateMatrixWorld(true);

          // Center on X and Z at (0, 0)
          box = new THREE.Box3().setFromObject(houseRoot);
          const center = new THREE.Vector3();
          box.getCenter(center);
          houseRoot.position.x = -center.x;
          houseRoot.position.z = -center.z;

          // Place bottom of baseplate flush on top of the diorama platform at Y = 0.02
          const LAWN_TOP_SURFACE_Y = 0.02;
          houseRoot.position.y = -box.min.y + LAWN_TOP_SURFACE_Y;

          houseGroup.scale.set(1, 1, 1);
          houseGroup.position.set(0, 0, 0);
          houseGroup.rotation.set(0, 0, 0);
          houseGroup.updateMatrixWorld(true);

          box = new THREE.Box3().setFromObject(houseGroup);
          box.getSize(size);

          // Find Piece000 through Piece195 in numerical order
          const pieceNodesMap = new Map();
          houseRoot.traverse((child) => {
            if (child.name && child.name.toLowerCase().startsWith('piece')) {
              const match = child.name.match(/^Piece(\d+)/i);
              if (match) {
                const num = parseInt(match[1], 10);
                if (!pieceNodesMap.has(num)) {
                  pieceNodesMap.set(num, []);
                }
                pieceNodesMap.get(num).push(child);
              }
            }
          });

          // Collect all 196 individual building pieces (Piece000 through Piece195) sequentially
          const steps = [];

          for (let i = 0; i < 196; i++) {
            const pad = `Piece${String(i).padStart(3, '0')}`;
            const nodes = pieceNodesMap.get(i) || [];
            const stepMeshes = [];

            // Category classification
            let category = 'bricks';
            let catLabel = 'Bricks';
            let icon = '🧱';
            let primaryColor = '#f8fafc';
            let desc = 'Interlock the next structural house element.';

            if (i < 49) {
              category = i < 20 ? 'plates' : 'bricks';
              catLabel = i < 20 ? 'Plates' : 'Bricks';
              icon = i < 20 ? '🌱' : '🧱';
              primaryColor = '#22c55e';
              desc = 'Assemble the garden foundation plate and perimeter pathway.';
            } else if (i < 98) {
              category = i % 5 === 0 ? 'special' : 'bricks';
              catLabel = i % 5 === 0 ? 'Special' : 'Bricks';
              icon = i % 5 === 0 ? '🪟' : '🏡';
              primaryColor = '#f8fafc';
              desc = 'Construct the house side walls, window frames, and entry doorway.';
            } else if (i < 147) {
              category = 'slopes';
              catLabel = 'Slopes';
              icon = '▲';
              primaryColor = '#d91e18';
              desc = 'Place the interlocking red roof tiles, gable peaks, and chimney.';
            } else {
              category = i > 175 ? 'round' : 'special';
              catLabel = i > 175 ? 'Round' : 'Special';
              icon = '🌳';
              primaryColor = '#16a34a';
              desc = 'Branch the garden tree trunk and attach lush green foliage blocks.';
            }

            nodes.forEach((node) => {
              node.traverse((c) => {
                if (c.isMesh) {
                  stepMeshes.push(c);
                  const origMatName = c.material?.name || (Array.isArray(c.material) ? c.material[0]?.name : '');
                  applyHouseLegoMaterial(c, origMatName);

                  c.castShadow = true;
                  c.receiveShadow = true;

                  const edgeLines = createBrickEdgeLines(c.geometry, c.material);
                  if (edgeLines) c.add(edgeLines);

                  c.userData = {
                    stepIndex: i,
                    stepNumber: i + 1,
                    pieceName: pad,
                    isTrainMesh: true,
                    isHouseMesh: true
                  };

                  // Set visible = false initially for step-by-step assembly
                  c.visible = false;
                }
              });
            });

            houseGroup.updateMatrixWorld(true);
            const stepBox = new THREE.Box3();
            stepMeshes.forEach((m) => {
              m.updateMatrixWorld(true);
              stepBox.expandByObject(m);
            });

            const mountPos = new THREE.Vector3();
            stepBox.getCenter(mountPos);

            const stepSize = new THREE.Vector3();
            stepBox.getSize(stepSize);

            // Source mesh transforms already contain each piece's authored orientation.
            // Keep the drag wrapper neutral so it matches the ghost exactly.
            const targetRotationY = 0;
            const isSquareOrRound = category === 'round' || Math.abs(stepSize.x - stepSize.z) < 0.28;

            const studsX = Math.max(1, Math.round(stepSize.x / 0.8));
            const platesY = Math.max(1, Math.round(stepSize.y / 0.32));
            const studsZ = Math.max(1, Math.round(stepSize.z / 0.8));
            const dimensions = { studsX, studsZ, platesY };

            stepMeshes.forEach((m) => {
              m.userData.dimensions = { ...dimensions };
            });

            steps.push({
              step: i + 1,
              title: `Piece ${i + 1}: ${pad}`,
              shortTitle: `Part ${i + 1}`,
              category,
              catLabel,
              desc,
              colors: [primaryColor],
              primaryColor,
              quantity: stepMeshes.length || 1,
              icon,
              pieces: [{ name: pad, node: nodes[0] || null, meshes: stepMeshes }],
              meshes: stepMeshes,
              meshCount: stepMeshes.length,
              pieceCount: 1,
              mountPos,
              box: stepBox,
              targetRotationY,
              rotationBakedIn: true,
              isSquareOrRound,
              stepSize,
              dimensions
            });
          }

          resolve({
            trainGroup: houseGroup,
            trainAssemblyGroup: houseGroup,
            model: houseRoot,
            houseRoot,
            box,
            size,
            steps,
            stepCount: steps.length,
            totalSteps: steps.length,
            stages: HOUSE_ASSEMBLY_STAGES,
            name: 'Cozy House & Tree',
            icon: '🏡',
            scale
          });
        },
        (xhr) => {
          if (onProgress && xhr.total) {
            const percent = Math.round((xhr.loaded / xhr.total) * 100);
            onProgress(percent);
          }
        },
        () => {
          currentUrlIndex++;
          if (currentUrlIndex < candidateUrls.length) {
            tryLoad(candidateUrls[currentUrlIndex]);
          } else {
            console.error('Failed to load housetree.glb from all paths.');
            reject(new Error('Failed to load housetree.glb'));
          }
        }
      );
    };

    tryLoad(candidateUrls[0]);
  });
}
