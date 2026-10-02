import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createBrickEdgeLines } from './trainLoader.js';

// High-Fidelity ABS Plastic Materials for Boat Model
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

const MAT_LIGHT_GREY = new THREE.MeshPhysicalMaterial({
  color: 0x94a3b8,
  roughness: 0.26,
  metalness: 0.08,
  clearcoat: 0.4,
  clearcoatRoughness: 0.18
});

const MAT_BLACK = new THREE.MeshPhysicalMaterial({
  color: 0x222528,
  roughness: 0.28,
  metalness: 0.08,
  clearcoat: 0.42,
  clearcoatRoughness: 0.2
});

const MAT_TRANS_CYAN = new THREE.MeshStandardMaterial({
  color: 0x38bdf8,
  roughness: 0.08,
  metalness: 0.1,
  transparent: true,
  opacity: 0.65,
  depthWrite: false
});

const MAT_YELLOW = new THREE.MeshPhysicalMaterial({
  color: 0xfacc15,
  roughness: 0.24,
  metalness: 0.0,
  clearcoat: 0.45,
  clearcoatRoughness: 0.15
});

export const BOAT_ASSEMBLY_STAGES = [
  {
    id: 1,
    bagNumber: 1,
    name: 'Hull & Keel Foundation',
    label: 'Bag 1: Hull',
    shortName: 'Hull',
    icon: '🚤',
    totalParts: 7,
    color: '#0ea5e9',
    bgLight: '#e0f2fe',
    badgeColor: '#0284c7',
    stepIndices: [0, 1, 2, 3, 4, 5, 6]
  },
  {
    id: 2,
    bagNumber: 2,
    name: 'Deck & Gunwales',
    label: 'Bag 2: Deck',
    shortName: 'Deck',
    icon: '🧱',
    totalParts: 7,
    color: '#f59e0b',
    bgLight: '#fef3c7',
    badgeColor: '#d97706',
    stepIndices: [7, 8, 9, 10, 11, 12, 13]
  },
  {
    id: 3,
    bagNumber: 3,
    name: 'Cabin & Windshield',
    label: 'Bag 3: Cabin',
    shortName: 'Cabin',
    icon: '💎',
    totalParts: 7,
    color: '#ef4444',
    bgLight: '#fee2e2',
    badgeColor: '#b91c1c',
    stepIndices: [14, 15, 16, 17, 18, 19, 20]
  },
  {
    id: 4,
    bagNumber: 4,
    name: 'Roof & Details / Motor',
    label: 'Bag 4: Roof/Details',
    shortName: 'Roof/Details',
    icon: '⚡',
    totalParts: 7,
    color: '#8b5cf6',
    bgLight: '#f3e8ff',
    badgeColor: '#6d28d9',
    stepIndices: [21, 22, 23, 24, 25, 26, 27]
  }
];

export const BOAT_STEPS_METADATA = [
  // Bag 1: Hull & Keel (Pieces 0 - 6)
  { step: 1, title: 'Lower Bow Keel Foundation Plate', shortTitle: 'Bow Keel', category: 'plates', catLabel: 'Plates', icon: '🚤', primaryColor: '#f8fafc', colors: ['#f8fafc'], desc: 'V-shaped lower bow hydrodynamic entry keel plate.' },
  { step: 2, title: 'Forward Hull Center Keel Plate', shortTitle: 'Center Keel', category: 'plates', catLabel: 'Plates', icon: '▬', primaryColor: '#f8fafc', colors: ['#f8fafc'], desc: 'Longitudinal structural center keel plate.' },
  { step: 3, title: 'Mid-Hull Foundation Keel Plate', shortTitle: 'Mid Keel', category: 'plates', catLabel: 'Plates', icon: '▬', primaryColor: '#f8fafc', colors: ['#f8fafc'], desc: 'Mid-hull high buoyancy support plate.' },
  { step: 4, title: 'Port Lower Red Chine Incline', shortTitle: 'Port Chine', category: 'slopes', catLabel: 'Slopes', icon: '▲', primaryColor: '#d91e18', colors: ['#d91e18'], desc: 'Port chine hydrodynamic water deflector slope.' },
  { step: 5, title: 'Starboard Lower Red Chine Incline', shortTitle: 'Starboard Chine', category: 'slopes', catLabel: 'Slopes', icon: '▲', primaryColor: '#d91e18', colors: ['#d91e18'], desc: 'Starboard chine hydrodynamic water deflector slope.' },
  { step: 6, title: 'Aft Hull Transom Baseplate', shortTitle: 'Transom Base', category: 'plates', catLabel: 'Plates', icon: '▬', primaryColor: '#f8fafc', colors: ['#f8fafc'], desc: 'Aft hull floor foundation securing the stern.' },
  { step: 7, title: 'Stern Keel Mounting Block', shortTitle: 'Stern Mount', category: 'plates', catLabel: 'Plates', icon: '▬', primaryColor: '#f8fafc', colors: ['#f8fafc'], desc: 'Reinforced stern keel engine mount foundation.' },

  // Bag 2: Deck & Gunwales (Pieces 7 - 13)
  { step: 8, title: 'Deck Interlock & Floor Stringer', shortTitle: 'Deck Floor', category: 'plates', catLabel: 'Plates', icon: '🧱', primaryColor: '#94a3b8', colors: ['#94a3b8'], desc: 'Light grey cockpit deck floor stringer beam.' },
  { step: 9, title: 'Forward Port Red Gunwale Wall', shortTitle: 'Port Gunwale', category: 'bricks', catLabel: 'Bricks', icon: '■', primaryColor: '#d91e18', colors: ['#d91e18'], desc: 'Forward port red gunwale side wall brick.' },
  { step: 10, title: 'Forward Starboard Red Gunwale Wall', shortTitle: 'Starboard Gunwale', category: 'bricks', catLabel: 'Bricks', icon: '■', primaryColor: '#d91e18', colors: ['#d91e18'], desc: 'Forward starboard red gunwale side wall brick.' },
  { step: 11, title: 'Mid-Port Red Hull Freeboard', shortTitle: 'Port Freeboard', category: 'bricks', catLabel: 'Bricks', icon: '■', primaryColor: '#d91e18', colors: ['#d91e18'], desc: 'Mid-hull port side freeboard wall.' },
  { step: 12, title: 'Mid-Starboard Red Hull Freeboard', shortTitle: 'Starboard Freeboard', category: 'bricks', catLabel: 'Bricks', icon: '■', primaryColor: '#d91e18', colors: ['#d91e18'], desc: 'Mid-hull starboard side freeboard wall.' },
  { step: 13, title: 'Aft Port Red Quarter Wall', shortTitle: 'Port Quarter', category: 'bricks', catLabel: 'Bricks', icon: '■', primaryColor: '#d91e18', colors: ['#d91e18'], desc: 'Aft quarter port topside bulwark brick.' },
  { step: 14, title: 'Aft Starboard Red Quarter Wall', shortTitle: 'Starboard Quarter', category: 'bricks', catLabel: 'Bricks', icon: '■', primaryColor: '#d91e18', colors: ['#d91e18'], desc: 'Aft quarter starboard topside bulwark brick.' },

  // Bag 3: Cabin & Windshield (Pieces 14 - 20)
  { step: 15, title: 'Forward Bow Foredeck Wedge Plate', shortTitle: 'Foredeck Wedge', category: 'slopes', catLabel: 'Slopes', icon: '📐', primaryColor: '#f8fafc', colors: ['#f8fafc'], desc: 'Aerodynamic white bow wedge foredeck.' },
  { step: 16, title: 'Bow Deck Interlock Tile', shortTitle: 'Bow Tile', category: 'plates', catLabel: 'Plates', icon: '▬', primaryColor: '#f8fafc', colors: ['#f8fafc'], desc: 'Smooth bow decking interlock tile.' },
  { step: 17, title: 'Cockpit Forward Coaming Bulkhead', shortTitle: 'Cockpit Coaming', category: 'bricks', catLabel: 'Bricks', icon: '■', primaryColor: '#f8fafc', colors: ['#f8fafc'], desc: 'Forward cockpit protective coaming bulkhead.' },
  { step: 18, title: 'Port Cockpit Sponson Rail', shortTitle: 'Port Rail', category: 'plates', catLabel: 'Plates', icon: '▬', primaryColor: '#f8fafc', colors: ['#f8fafc'], desc: 'White port side cockpit grab rail plate.' },
  { step: 19, title: 'Starboard Cockpit Sponson Rail', shortTitle: 'Starboard Rail', category: 'plates', catLabel: 'Plates', icon: '▬', primaryColor: '#f8fafc', colors: ['#f8fafc'], desc: 'White starboard side cockpit grab rail plate.' },
  { step: 20, title: 'Cabin Aft Transom Bulkhead', shortTitle: 'Aft Bulkhead', category: 'bricks', catLabel: 'Bricks', icon: '■', primaryColor: '#f8fafc', colors: ['#f8fafc'], desc: 'Aft cabin separation bulkhead.' },
  { step: 21, title: 'Aerodynamic Cyan Windshield Canopy', shortTitle: 'Cyan Windshield', category: 'special', catLabel: 'Special', icon: '💎', primaryColor: '#38bdf8', colors: ['#38bdf8'], desc: 'Curved translucent cyan racing windshield.' },

  // Bag 4: Roof & Details / Motor (Pieces 21 - 27)
  { step: 22, title: 'Outboard Engine Pivot Bracket', shortTitle: 'Engine Bracket', category: 'special', catLabel: 'Special', icon: '⚙️', primaryColor: '#222528', colors: ['#222528'], desc: 'Heavy dark slate outboard swivel mount bracket.' },
  { step: 23, title: 'Marine Engine Cylinder Cowl', shortTitle: 'Engine Cowl', category: 'special', catLabel: 'Special', icon: '⚡', primaryColor: '#facc15', colors: ['#facc15'], desc: 'High-visibility racing yellow engine cowl housing.' },
  { step: 24, title: 'High-Thrust Marine Propeller Block', shortTitle: 'Propeller Block', category: 'special', catLabel: 'Special', icon: '🌀', primaryColor: '#222528', colors: ['#222528'], desc: 'Dual-blade aquatic propulsion turbine.' },
  { step: 25, title: 'Dual Throttle & Helm Wheel', shortTitle: 'Helm Wheel', category: 'special', catLabel: 'Special', icon: '🕹️', primaryColor: '#222528', colors: ['#222528'], desc: 'Captain helm control wheel and dual throttle levers.' },
  { step: 26, title: 'Navigation Radar Antenna Mast', shortTitle: 'Radar Mast', category: 'special', catLabel: 'Special', icon: '📡', primaryColor: '#222528', colors: ['#222528'], desc: 'Compact maritime VHF communication & radar antenna.' },
  { step: 27, title: 'Stern Port Cleat Mooring Post', shortTitle: 'Port Cleat', category: 'round', catLabel: 'Round', icon: '●', primaryColor: '#f8fafc', colors: ['#f8fafc'], desc: 'Port side mooring tie-down cleat.' },
  { step: 28, title: 'Stern Starboard Cleat Mooring Post', shortTitle: 'Starboard Cleat', category: 'round', catLabel: 'Round', icon: '●', primaryColor: '#f8fafc', colors: ['#f8fafc'], desc: 'Starboard side mooring tie-down cleat.' }
];

function applyBoatLegoMaterial(mesh, origMatName) {
  const name = origMatName || '';
  if (name.includes('Trans_') || name.includes('Blue') || name === 'Trans_Light_Blue') {
    mesh.material = MAT_TRANS_CYAN.clone();
  } else if (name === 'Red') {
    mesh.material = MAT_RED.clone();
  } else if (name === 'White') {
    mesh.material = MAT_WHITE.clone();
  } else if (name === 'Light_Grey') {
    mesh.material = MAT_LIGHT_GREY.clone();
  } else if (name === 'Black') {
    mesh.material = MAT_BLACK.clone();
  } else if (name === 'Yellow') {
    mesh.material = MAT_YELLOW.clone();
  } else {
    mesh.material = MAT_WHITE.clone();
  }
}

/**
 * Loads boat.glb, normalizes orientation and scaling,
 * and partitions the 28 pieces across 4 staged bags (7 pieces each).
 */
export function loadBoatModel(onProgress) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    const candidateUrls = [
      './public/assets/boat.glb',
      './assets/boat.glb',
      './boat.glb'
    ];

    let currentUrlIndex = 0;

    const tryLoad = (url) => {
      loader.load(
        url,
        (gltf) => {
          const model = gltf.scene;

          // Rotate the boat so it lays flat horizontally on the water
          model.rotation.set(-Math.PI / 2, 0, 0);
          model.updateMatrixWorld(true);

          const boatGroup = new THREE.Group();
          boatGroup.name = 'boatAssemblyGroup';
          boatGroup.add(model);

          // Compute initial Box3 and unit scale
          let box = new THREE.Box3().setFromObject(model);
          let size = new THREE.Vector3();
          box.getSize(size);

          const currentLength = Math.max(size.x, size.z, size.y);
          const targetLength = 10.5; // Optimal size for builder diorama
          const scale = currentLength > 20 ? (targetLength / currentLength) : 0.12;
          model.scale.setScalar(scale);
          model.updateMatrixWorld(true);

          // Center on X and Z at (0, 0)
          box = new THREE.Box3().setFromObject(model);
          const center = new THREE.Vector3();
          box.getCenter(center);
          model.position.x = -center.x;
          model.position.z = -center.z;

          // Place bottom hull flush with the floating water disc at Y = 0.02
          const WATER_TOP_SURFACE_Y = 0.02;
          model.position.y = -box.min.y + WATER_TOP_SURFACE_Y;

          boatGroup.scale.set(1, 1, 1);
          boatGroup.position.set(0, 0, 0);
          boatGroup.rotation.set(0, 0, 0);
          boatGroup.updateMatrixWorld(true);

          box = new THREE.Box3().setFromObject(boatGroup);
          box.getSize(size);

          // Find Piece000 through Piece027 in numerical order
          const pieceNodesMap = new Map();
          model.traverse((child) => {
            if (child.name && child.name.startsWith('Piece')) {
              pieceNodesMap.set(child.name, child);
            }
          });

          // Collect all 28 individual building pieces (Piece000 through Piece027) sequentially
          const pieceList = [];
          for (let i = 0; i < 28; i++) {
            const pad = i < 10 ? `Piece00${i}` : `Piece0${i}`;
            let node = pieceNodesMap.get(pad);
            if (!node) {
              model.traverse((c) => {
                if (!node && c.name && c.name.includes(pad)) node = c;
              });
            }
            if (node) {
              pieceList.push({ index: i, name: pad, node });
            }
          }

          // Fallback: sort all unique piece nodes sequentially by name
          if (pieceList.length < 28) {
            const allPieces = Array.from(pieceNodesMap.values());
            allPieces.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
            pieceList.length = 0;
            allPieces.forEach((node, i) => {
              pieceList.push({ index: i, name: node.name, node });
            });
          }

          const steps = [];

          pieceList.forEach((item, stepIndex) => {
            const { node, name } = item;
            const stepMeshes = [];
            const meta = BOAT_STEPS_METADATA[stepIndex] || {
              step: stepIndex + 1,
              title: `Boat Piece ${stepIndex + 1}`,
              shortTitle: `Part ${stepIndex + 1}`,
              category: 'bricks',
              catLabel: 'Bricks',
              icon: '🚤',
              primaryColor: '#f8fafc',
              colors: ['#f8fafc'],
              desc: 'Interlock the next precision marine element.'
            };

            node.traverse((c) => {
              if (c.isMesh) {
                stepMeshes.push(c);
                const origMatName = c.material?.name || (Array.isArray(c.material) ? c.material[0]?.name : '');
                applyBoatLegoMaterial(c, origMatName);

                c.castShadow = true;
                c.receiveShadow = true;

                // High-contrast edge lines
                const edgeLines = createBrickEdgeLines(c.geometry, c.material);
                if (edgeLines) c.add(edgeLines);

                c.userData = {
                  stepIndex,
                  stepNumber: stepIndex + 1,
                  pieceName: name,
                  isTrainMesh: true,
                  isBoatMesh: true
                };

                // Hide initially for step-by-step assembly
                c.visible = false;
              }
            });

            boatGroup.updateMatrixWorld(true);
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
            const isSquareOrRound = meta.category === 'round' || Math.abs(stepSize.x - stepSize.z) < 0.28;

            const studsX = Math.max(1, Math.round(stepSize.x / 0.8));
            const platesY = Math.max(1, Math.round(stepSize.y / 0.32));
            const studsZ = Math.max(1, Math.round(stepSize.z / 0.8));
            const dimensions = { studsX, studsZ, platesY };

            stepMeshes.forEach((m) => {
              m.userData.dimensions = { ...dimensions };
            });

            steps.push({
              step: stepIndex + 1,
              title: meta.title,
              shortTitle: meta.shortTitle,
              category: meta.category,
              catLabel: meta.catLabel,
              desc: meta.desc,
              colors: meta.colors,
              primaryColor: meta.primaryColor,
              quantity: 1,
              icon: meta.icon,
              pieces: [{ node, name, meshes: stepMeshes }],
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
          });

          // Stern wake emitter position
          const chimneyPos = new THREE.Vector3(0, 1.2, 4.2);

          resolve({
            trainGroup: boatGroup,
            trainAssemblyGroup: boatGroup,
            model,
            box,
            size,
            chimneyPos,
            steps,
            stepCount: steps.length,
            totalSteps: steps.length,
            stages: BOAT_ASSEMBLY_STAGES,
            scale,
            name: 'Speedboat Adventure',
            icon: '🚤'
          });
        },
        (xhr) => {
          if (onProgress && xhr.total) {
            const percent = Math.round((xhr.loaded / xhr.total) * 100);
            onProgress(percent);
          }
        },
        (error) => {
          currentUrlIndex++;
          if (currentUrlIndex < candidateUrls.length) {
            tryLoad(candidateUrls[currentUrlIndex]);
          } else {
            console.error('Error loading boat.glb:', error);
            reject(error);
          }
        }
      );
    };

    tryLoad(candidateUrls[0]);
  });
}
