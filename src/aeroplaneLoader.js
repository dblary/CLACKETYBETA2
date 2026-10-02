import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createBrickEdgeLines } from './trainLoader.js';

// Glossy ABS Plastic Materials for Commercial Aeroplane
const MAT_WHITE = new THREE.MeshPhysicalMaterial({
  color: 0xf8fafc,
  roughness: 0.20,
  metalness: 0.02,
  clearcoat: 0.55,
  clearcoatRoughness: 0.10
});

const MAT_RED = new THREE.MeshPhysicalMaterial({
  color: 0xd91e18,
  roughness: 0.22,
  metalness: 0.02,
  clearcoat: 0.52,
  clearcoatRoughness: 0.12
});

const MAT_BLUE = new THREE.MeshPhysicalMaterial({
  color: 0x0284c7,
  roughness: 0.22,
  metalness: 0.02,
  clearcoat: 0.50,
  clearcoatRoughness: 0.12
});

const MAT_BLACK = new THREE.MeshPhysicalMaterial({
  color: 0x1e293b,
  roughness: 0.30,
  metalness: 0.05,
  clearcoat: 0.38,
  clearcoatRoughness: 0.18
});

const MAT_LIGHT_GREY = new THREE.MeshPhysicalMaterial({
  color: 0x94a3b8,
  roughness: 0.25,
  metalness: 0.12,
  clearcoat: 0.45,
  clearcoatRoughness: 0.15
});

const MAT_TRANS_CYAN = new THREE.MeshStandardMaterial({
  color: 0x38bdf8,
  roughness: 0.08,
  metalness: 0.1,
  transparent: true,
  opacity: 0.70,
  depthWrite: false
});

const MAT_TRANS_RED = new THREE.MeshStandardMaterial({
  color: 0xef4444,
  roughness: 0.08,
  metalness: 0.1,
  transparent: true,
  opacity: 0.75,
  depthWrite: false
});

const MAT_TRANS_GREEN = new THREE.MeshStandardMaterial({
  color: 0x22c55e,
  roughness: 0.08,
  metalness: 0.1,
  transparent: true,
  opacity: 0.75,
  depthWrite: false
});

export const AEROPLANE_ASSEMBLY_STAGES = [
  {
    id: 1,
    bagNumber: 1,
    name: 'Lower Keel & Fuselage Base',
    label: 'Bag 1: Keel & Floor',
    shortName: 'Keel/Floor',
    icon: '🧱',
    totalParts: 32,
    color: '#ef4444',
    bgLight: '#fee2e2',
    badgeColor: '#b91c1c',
    stepIndices: Array.from({ length: 32 }, (_, i) => i) // 0..31
  },
  {
    id: 2,
    bagNumber: 2,
    name: 'Passenger Cabin & Windows',
    label: 'Bag 2: Cabin & Windows',
    shortName: 'Cabin/Windows',
    icon: '🪟',
    totalParts: 32,
    color: '#0284c7',
    bgLight: '#e0f2fe',
    badgeColor: '#0369a1',
    stepIndices: Array.from({ length: 32 }, (_, i) => i + 32) // 32..63
  },
  {
    id: 3,
    bagNumber: 3,
    name: 'Main Wings & Jet Turbine Nacelles',
    label: 'Bag 3: Wings & Turbines',
    shortName: 'Wings/Turbines',
    icon: '✈️',
    totalParts: 32,
    color: '#facc15',
    bgLight: '#fef3c7',
    badgeColor: '#a16207',
    stepIndices: Array.from({ length: 32 }, (_, i) => i + 64) // 64..95
  },
  {
    id: 4,
    bagNumber: 4,
    name: 'Landing Gear, Cockpit & Tail Fin',
    label: 'Bag 4: Gear & Cockpit',
    shortName: 'Gear/Cockpit',
    icon: '🛞',
    totalParts: 30,
    color: '#10b981',
    bgLight: '#d1fae5',
    badgeColor: '#047857',
    stepIndices: Array.from({ length: 30 }, (_, i) => i + 96) // 96..125
  }
];

export function applyAeroplaneLegoMaterial(mesh, origMatName = '') {
  const name = origMatName || '';
  if (name.includes('Trans_Light_Blue') || name.includes('Trans_Medium_Blue')) {
    mesh.material = MAT_TRANS_CYAN.clone();
  } else if (name.includes('Trans_Red')) {
    mesh.material = MAT_TRANS_RED.clone();
  } else if (name.includes('Trans_Green')) {
    mesh.material = MAT_TRANS_GREEN.clone();
  } else if (name === 'Red' || name.includes('Red')) {
    mesh.material = MAT_RED.clone();
  } else if (name === 'Blue' || name.includes('Blue')) {
    mesh.material = MAT_BLUE.clone();
  } else if (name === 'Black' || name.includes('Black') || name.includes('Rubber')) {
    mesh.material = MAT_BLACK.clone();
  } else if (name === 'Light_Grey' || name.includes('Light_Grey') || name.includes('Silver')) {
    mesh.material = MAT_LIGHT_GREY.clone();
  } else if (name === 'White' || name.includes('White')) {
    mesh.material = MAT_WHITE.clone();
  } else {
    mesh.material = MAT_WHITE.clone();
  }
}

/**
 * Loads aeroplane.glb (126 pieces), scales and centers it, aligns upright along the runway,
 * and sets up all 126 sequential steps with glossy clearcoat materials and progressive visibility.
 */
export function loadAeroplaneModel(onProgress) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    const candidateUrls = [
      './assets/aeroplane.glb',
      './public/assets/aeroplane.glb',
      '/public/assets/aeroplane.glb',
      '/assets/aeroplane.glb',
      './aeroplane.glb',
      '/aeroplane.glb'
    ];

    let currentUrlIndex = 0;

    const tryLoad = (url) => {
      loader.load(
        url,
        (gltf) => {
          const planeRoot = gltf.scene;

          const primaryRoot = planeRoot.getObjectByName('aeroplane.obj') ||
            planeRoot.getObjectByName('aeroplaneobj') ||
            planeRoot.children[0] ||
            planeRoot;

          // Align authored axes to Three.js world coordinates:
          // Authored: Forward is +X (1, 0, 0), Right is -Y (0, -1, 0), Up is +Z (0, 0, 1).
          // Target: World Forward is (0, 0, -1), World Right is (1, 0, 0), World Up is (0, 1, 0).
          primaryRoot.position.set(0, 0, 0);
          primaryRoot.rotation.set(0, 0, 0);
          primaryRoot.scale.set(1, 1, 1);

          const localForward = new THREE.Vector3(1, 0, 0);
          const localRight = new THREE.Vector3(0, -1, 0);
          const localUp = new THREE.Vector3(0, 0, 1);

          const basisMatrix = new THREE.Matrix4().set(
            localRight.x, localRight.y, localRight.z, 0,
            localUp.x, localUp.y, localUp.z, 0,
            -localForward.x, -localForward.y, -localForward.z, 0,
            0, 0, 0, 1
          );

          primaryRoot.quaternion.setFromRotationMatrix(basisMatrix);
          primaryRoot.updateMatrixWorld(true);

          const aeroplaneGroup = new THREE.Group();
          aeroplaneGroup.name = 'aeroplaneAssemblyGroup';
          aeroplaneGroup.add(planeRoot);

          // Compute raw bounds after orientation
          let box = new THREE.Box3().setFromObject(primaryRoot);
          let size = new THREE.Vector3();
          box.getSize(size);

          const footprint = Math.max(size.x, size.z);
          const targetLength = 12.8;
          const scale = footprint > 0 ? (targetLength / footprint) : 0.02;
          primaryRoot.scale.setScalar(scale);
          primaryRoot.updateMatrixWorld(true);

          // Center on X and Z, and place flush on runway at Y = 0.02
          box = new THREE.Box3().setFromObject(primaryRoot);
          const center = new THREE.Vector3();
          box.getCenter(center);
          primaryRoot.position.x = -center.x;
          primaryRoot.position.z = -center.z;
          primaryRoot.position.y = -box.min.y + 0.02;
          primaryRoot.updateMatrixWorld(true);

          // Find Piece000 through Piece125 in numerical order
          const pieceNodesMap = new Map();
          primaryRoot.traverse((child) => {
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

          const totalPieces = 126;
          const steps = [];

          for (let i = 0; i < totalPieces; i++) {
            const pad = `Piece${String(i).padStart(3, '0')}`;
            const nodes = pieceNodesMap.get(i) || [];
            const stepMeshes = [];

            let category = 'bricks';
            let catLabel = 'Bricks';
            let icon = '🧱';
            let primaryColor = '#d91e18';
            let desc = 'Snap this precision interlocking element onto the airliner assembly.';
            let partTitle = 'Fuselage Brick';

            if (i < 32) {
              // Bag 1: Keel & Fuselage Base
              category = i < 15 ? 'plates' : 'bricks';
              catLabel = i < 15 ? 'Plates' : 'Bricks';
              icon = '🧱';
              primaryColor = i % 2 === 0 ? '#d91e18' : '#f8fafc';
              partTitle = `Fuselage Keel Beam ${i + 1}`;
              desc = 'Construct the reinforced lower fuselage keel and foundation baseplate.';
            } else if (i < 64) {
              // Bag 2: Cabin & Windows
              if (i >= 35 && i <= 55) {
                category = 'special';
                catLabel = 'Windows';
                icon = '🪟';
                primaryColor = '#38bdf8';
                partTitle = `Airliner Cabin Window Panel ${i - 34}`;
                desc = 'Install passenger panoramic tinted cyan cabin window glass.';
              } else {
                category = 'bricks';
                catLabel = 'Fuselage';
                icon = '🛩️';
                primaryColor = '#0284c7';
                partTitle = `Airliner Side Body Panel ${i - 31}`;
                desc = 'Assemble the aerodynamic passenger cabin walls and upper roof deck.';
              }
            } else if (i < 96) {
              // Bag 3: Wings & Turbines
              if (i >= 70 && i <= 84) {
                category = 'special';
                catLabel = 'Turbine';
                icon = '⚙️';
                primaryColor = '#94a3b8';
                partTitle = `Jet Engine Turbine Assembly ${i - 69}`;
                desc = 'Mount high-thrust turbofan jet engine nacelles and cowl rings.';
              } else {
                category = 'plates';
                catLabel = 'Wings';
                icon = '✈️';
                primaryColor = '#f8fafc';
                partTitle = `High-Lift Wing Spar Plate ${i - 63}`;
                desc = 'Extend the swept-wing aerodynamic lift airfoil and flap structures.';
              }
            } else {
              // Bag 4: Gear, Cockpit & Tail Fin
              if (i >= 96 && i <= 104) {
                category = 'wheels';
                catLabel = 'Gear';
                icon = '🛞';
                primaryColor = '#1e293b';
                partTitle = `Landing Gear Assembly Wheel ${i - 95}`;
                desc = 'Lock heavy-duty shock-absorbing landing gear rubber tires onto wheel hubs.';
              } else if (i === 105) {
                category = 'special';
                catLabel = 'Nav Light';
                icon = '🟢';
                primaryColor = '#22c55e';
                partTitle = 'Starboard Wingtip Green Navigation Beacon';
                desc = 'Affix right-wing aviation green navigation strobe beacon.';
              } else if (i === 106) {
                category = 'special';
                catLabel = 'Nav Light';
                icon = '🔴';
                primaryColor = '#ef4444';
                partTitle = 'Port Wingtip Red Navigation Beacon';
                desc = 'Affix left-wing aviation red navigation strobe beacon.';
              } else if (i === 120) {
                category = 'special';
                catLabel = 'Cockpit';
                icon = '🪟';
                primaryColor = '#38bdf8';
                partTitle = 'Flight Deck Panoramic Windshield';
                desc = 'Mount the forward cockpit flight deck windshield glass.';
              } else if (i === 124) {
                category = 'special';
                catLabel = 'Beacon';
                icon = '✨';
                primaryColor = '#ef4444';
                partTitle = 'Vertical Rudder Anti-Collision Strobe';
                desc = 'Mount the high-visibility vertical rudder red tail strobe beacon.';
              } else {
                category = 'slopes';
                catLabel = 'Tail Fin';
                icon = '📐';
                primaryColor = '#f8fafc';
                partTitle = `Tail Fin Stabilizer Section ${i - 106}`;
                desc = 'Build the high-altitude vertical stabilizer fin and directional rudder.';
              }
            }

            nodes.forEach((node) => {
              node.traverse((c) => {
                if (c.isMesh) {
                  stepMeshes.push(c);
                  const origMatName = c.material?.name || (Array.isArray(c.material) ? c.material[0]?.name : '');
                  applyAeroplaneLegoMaterial(c, origMatName);

                  c.castShadow = true;
                  c.receiveShadow = true;

                  const edgeLines = createBrickEdgeLines(c.geometry, c.material);
                  if (edgeLines) c.add(edgeLines);

                  c.userData = {
                    stepIndex: i,
                    stepNumber: i + 1,
                    pieceName: pad,
                    isTrainMesh: true,
                    isPlaneMesh: true,
                    isAeroplaneMesh: true
                  };

                  // Set visible = false initially for step-by-step assembly
                  c.visible = false;
                }
              });
            });

            aeroplaneGroup.updateMatrixWorld(true);
            const stepBox = new THREE.Box3();
            stepMeshes.forEach((m) => {
              m.updateMatrixWorld(true);
              stepBox.expandByObject(m);
            });

            const mountPos = new THREE.Vector3();
            if (!stepBox.isEmpty()) {
              stepBox.getCenter(mountPos);
            }

            const stepSize = new THREE.Vector3();
            if (!stepBox.isEmpty()) {
              stepBox.getSize(stepSize);
            }

            const studsX = Math.max(1, Math.round(stepSize.x / 0.8));
            const platesY = Math.max(1, Math.round(stepSize.y / 0.32));
            const studsZ = Math.max(1, Math.round(stepSize.z / 0.8));
            const dimensions = { studsX, studsZ, platesY };

            stepMeshes.forEach((m) => {
              m.userData.dimensions = { ...dimensions };
            });

            steps.push({
              step: i + 1,
              title: `${pad}: ${partTitle}`,
              shortTitle: partTitle,
              category,
              catLabel,
              desc,
              colors: [primaryColor],
              primaryColor,
              quantity: stepMeshes.length || 1,
              icon,
              pieces: [{ name: pad, node: nodes[0] || null, meshes: stepMeshes }],
              mesh: stepMeshes[0] || null,
              meshes: stepMeshes,
              meshCount: stepMeshes.length,
              pieceCount: 1,
              mountPos,
              targetPosition: mountPos.clone(),
              targetRotation: new THREE.Euler(0, 0, 0),
              pieceName: pad,
              box: stepBox,
              targetRotationY: 0,
              rotationBakedIn: true,
              isSquareOrRound: Math.abs(stepSize.x - stepSize.z) < 0.28,
              stepSize,
              dimensions
            });
          }

          if (onProgress) onProgress(100);

          aeroplaneGroup.updateMatrixWorld(true);
          const finalBounds = new THREE.Box3().setFromObject(primaryRoot);

          resolve({
            trainGroup: aeroplaneGroup,
            trainAssemblyGroup: aeroplaneGroup,
            model: primaryRoot,
            box: finalBounds,
            size: finalBounds.getSize(new THREE.Vector3()),
            steps,
            stepCount: steps.length,
            totalSteps: steps.length,
            stages: AEROPLANE_ASSEMBLY_STAGES,
            scale,
            name: 'Commercial Airliner Jet',
            icon: '✈️'
          });
        },
        (xhr) => {
          if (xhr.lengthComputable && onProgress) {
            const percentComplete = (xhr.loaded / xhr.total) * 100;
            onProgress(percentComplete);
          }
        },
        (error) => {
          currentUrlIndex++;
          if (currentUrlIndex < candidateUrls.length) {
            tryLoad(candidateUrls[currentUrlIndex]);
          } else {
            console.error('[AeroplaneLoader] Error loading aeroplane.glb:', error);
            reject(error);
          }
        }
      );
    };

    tryLoad(candidateUrls[0]);
  });
}
