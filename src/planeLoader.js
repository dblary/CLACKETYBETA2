import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createBrickEdgeLines } from './trainLoader.js';

// Glossy ABS Plastic Materials for Airplane Model
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

const MAT_YELLOW = new THREE.MeshPhysicalMaterial({
  color: 0xfacc15,
  roughness: 0.22,
  metalness: 0.02,
  clearcoat: 0.50,
  clearcoatRoughness: 0.12
});

const MAT_BLACK = new THREE.MeshPhysicalMaterial({
  color: 0x1e293b,
  roughness: 0.32,
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

const MAT_TRANS_CLEAR = new THREE.MeshStandardMaterial({
  color: 0xbae6fd,
  roughness: 0.08,
  metalness: 0.1,
  transparent: true,
  opacity: 0.65,
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

export const PLANE_ASSEMBLY_STAGES = [
  {
    id: 1,
    bagNumber: 1,
    name: 'Nose & Engine Cowling',
    label: 'Bag 1: Nose & Engine',
    shortName: 'Nose/Engine',
    icon: '⚙️',
    totalParts: 20,
    color: '#ef4444',
    bgLight: '#fee2e2',
    badgeColor: '#b91c1c',
    stepIndices: Array.from({ length: 20 }, (_, i) => i) // 0..19
  },
  {
    id: 2,
    bagNumber: 2,
    name: 'Fuselage & Main Cabin',
    label: 'Bag 2: Fuselage',
    shortName: 'Fuselage',
    icon: '🛩️',
    totalParts: 20,
    color: '#0ea5e9',
    bgLight: '#e0f2fe',
    badgeColor: '#0369a1',
    stepIndices: Array.from({ length: 20 }, (_, i) => i + 20) // 20..39
  },
  {
    id: 3,
    bagNumber: 3,
    name: 'Cockpit Canopy & Landing Gear',
    label: 'Bag 3: Canopy & Wheels',
    shortName: 'Cockpit/Gear',
    icon: '🛞',
    totalParts: 20,
    color: '#facc15',
    bgLight: '#fef3c7',
    badgeColor: '#a16207',
    stepIndices: Array.from({ length: 20 }, (_, i) => i + 40) // 40..59
  },
  {
    id: 4,
    bagNumber: 4,
    name: 'Wings, Tail & Navigation Lights',
    label: 'Bag 4: Wings & Tail',
    shortName: 'Wings/Tail',
    icon: '✈️',
    totalParts: 20,
    color: '#10b981',
    bgLight: '#d1fae5',
    badgeColor: '#047857',
    stepIndices: Array.from({ length: 20 }, (_, i) => i + 60) // 60..79
  }
];

export function applyPlaneLegoMaterial(mesh, origMatName = '') {
  const name = origMatName || '';
  if (name.includes('Trans_Light_Blue') || name.includes('Trans_Medium_Blue')) {
    mesh.material = MAT_TRANS_CYAN.clone();
  } else if (name.includes('Trans_Clear') || name.includes('Clear')) {
    mesh.material = MAT_TRANS_CLEAR.clone();
  } else if (name.includes('Trans_Red')) {
    mesh.material = MAT_TRANS_RED.clone();
  } else if (name.includes('Trans_Green')) {
    mesh.material = MAT_TRANS_GREEN.clone();
  } else if (name === 'Red' || name.includes('Red')) {
    mesh.material = MAT_RED.clone();
  } else if (name === 'Yellow' || name.includes('Yellow')) {
    mesh.material = MAT_YELLOW.clone();
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
 * Loads mini_plane.glb, scales and centers it, aligns upright along the runway,
 * and sets up all 80 sequential steps with glossy clearcoat materials and progressive visibility.
 */
export function loadPlaneModel(onProgress) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    const candidateUrls = [
      './public/assets/mini_plane.glb',
      '/public/assets/mini_plane.glb',
      './assets/mini_plane.glb',
      './mini_plane.glb',
      '/assets/mini_plane.glb'
    ];

    let currentUrlIndex = 0;

    const tryLoad = (url) => {
      loader.load(
        url,
        (gltf) => {
          const planeRoot = gltf.scene;

          // Remove duplicate root if exported multiple times
          const duplicateRoot = planeRoot.getObjectByName('mini_planeobj_1');
          if (duplicateRoot && duplicateRoot !== planeRoot) {
            duplicateRoot.parent.remove(duplicateRoot);
          }

          const primaryRoot = planeRoot.getObjectByName('mini_planeobj') || planeRoot.children[0] || planeRoot;

          // Align authored axes to world coordinates:
          // Authored: Forward is at 150° (-sqrt(3)/2, 0.5, 0), Right is at 60° (0.5, sqrt(3)/2, 0), Up is (0, 0, 1).
          // Target: World Forward is (0, 0, -1), World Right is (1, 0, 0), World Up is (0, 1, 0).
          primaryRoot.position.set(0, 0, 0);
          primaryRoot.rotation.set(0, 0, 0);
          primaryRoot.scale.set(1, 1, 1);

          const localForward = new THREE.Vector3(-Math.sqrt(3) / 2, 0.5, 0);
          const localRight = new THREE.Vector3(0.5, Math.sqrt(3) / 2, 0);
          const localUp = new THREE.Vector3(0, 0, 1);

          const basisMatrix = new THREE.Matrix4().set(
            localRight.x, localRight.y, localRight.z, 0,
            localUp.x, localUp.y, localUp.z, 0,
            -localForward.x, -localForward.y, -localForward.z, 0,
            0, 0, 0, 1
          );

          primaryRoot.quaternion.setFromRotationMatrix(basisMatrix);
          primaryRoot.updateMatrixWorld(true);

          const planeGroup = new THREE.Group();
          planeGroup.name = 'planeAssemblyGroup';
          planeGroup.add(planeRoot);

          // Compute raw bounds after orientation
          let box = new THREE.Box3().setFromObject(primaryRoot);
          let size = new THREE.Vector3();
          box.getSize(size);

          const footprint = Math.max(size.x, size.z);
          const targetLength = 11.2;
          const scale = footprint > 0 ? (targetLength / footprint) : 0.0182;
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

          // Find Piece000 through Piece079 in numerical order
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

          const totalPieces = 80;
          const steps = [];

          for (let i = 0; i < totalPieces; i++) {
            const pad = `Piece${String(i).padStart(3, '0')}`;
            const nodes = pieceNodesMap.get(i) || [];
            const stepMeshes = [];

            let category = 'bricks';
            let catLabel = 'Bricks';
            let icon = '🧱';
            let primaryColor = '#d91e18';
            let desc = 'Snap this precision interlocking element onto the airplane assembly.';
            let partTitle = 'Fuselage Brick';

            if (i < 20) {
              // Bag 1: Nose & Engine
              category = i === 17 ? 'special' : (i < 10 ? 'plates' : 'slopes');
              catLabel = i === 17 ? 'Propeller' : (i < 10 ? 'Plates' : 'Slopes');
              icon = i === 17 ? '🔄' : '⚙️';
              primaryColor = i === 17 ? '#1e293b' : '#ef4444';
              partTitle = i === 17 ? 'Front Spinning Propeller Rotor' : (i === 10 ? 'Engine Mount Baseplate' : `Nose Engine Element ${i + 1}`);
              desc = i === 17
                ? 'Attach the aerodynamic black spinning propeller blades to the engine nose drive shaft.'
                : 'Construct the heavy-duty engine cowling, nose block, and spinner hub.';
            } else if (i < 40) {
              // Bag 2: Fuselage & Cabin
              category = i < 28 ? 'plates' : 'bricks';
              catLabel = i < 28 ? 'Plates' : 'Bricks';
              icon = '🛩️';
              primaryColor = i < 30 ? '#f8fafc' : '#0284c7';
              partTitle = `Fuselage Keel & Cabin Section ${i - 19}`;
              desc = 'Build the reinforced lower keel, cabin deck, and aerodynamic side body panels.';
            } else if (i < 60) {
              // Bag 3: Canopy & Landing Gear
              if (i >= 53 && (i === 53 || i === 56 || i === 59)) {
                category = 'wheels';
                catLabel = 'Wheels';
                icon = '🛞';
                primaryColor = '#1e293b';
                partTitle = i === 53 ? 'Front Steerable Nose Gear Wheel' : `Main Landing Gear Wheel ${i === 56 ? 'Left' : 'Right'}`;
                desc = 'Lock the shock-absorbing rubber tire and hub onto the landing gear strut.';
              } else if (i >= 40 && i <= 43) {
                category = 'special';
                catLabel = 'Canopy';
                icon = '🪟';
                primaryColor = '#38bdf8';
                partTitle = `Cockpit Translucent Windshield Panel ${i - 39}`;
                desc = 'Mount the high-visibility translucent cyan cockpit canopy glass.';
              } else {
                category = 'slopes';
                catLabel = 'Slopes';
                icon = '📐';
                primaryColor = '#f8fafc';
                partTitle = `Upper Cabin Fairing ${i - 39}`;
                desc = 'Shape the streamlined cabin roof, fairings, and wheel strut mounts.';
              }
            } else {
              // Bag 4: Wings, Tail & Lights
              if (i === 75) {
                category = 'special';
                catLabel = 'Nav Light';
                icon = '🔴';
                primaryColor = '#ef4444';
                partTitle = 'Port Wingtip Red Navigation Light';
                desc = 'Install the left-wing port red aviation navigation beacon.';
              } else if (i === 76) {
                category = 'special';
                catLabel = 'Nav Light';
                icon = '🟢';
                primaryColor = '#22c55e';
                partTitle = 'Starboard Wingtip Green Navigation Light';
                desc = 'Install the right-wing starboard green aviation navigation beacon.';
              } else if (i === 77) {
                category = 'special';
                catLabel = 'Beacon';
                icon = '✨';
                primaryColor = '#ef4444';
                partTitle = 'Vertical Stabilizer Tail Beacon';
                desc = 'Affix the high-intensity anti-collision strobe beacon onto the vertical rudder fin.';
              } else if (i === 78 || i === 79) {
                category = 'special';
                catLabel = 'Nacelle';
                icon = '🚀';
                primaryColor = '#1e293b';
                partTitle = `Underwing Engine Cowling ${i === 78 ? 'Port' : 'Starboard'}`;
                desc = 'Secure the underwing aerodynamic engine nacelle pod.';
              } else if (i === 71 || i === 72 || i === 74) {
                category = 'plates';
                catLabel = 'Wings';
                icon = '✈️';
                primaryColor = '#f8fafc';
                partTitle = `Main High-Lift Airfoil Wing Section`;
                desc = 'Expand the cantilevered main wing spar with precision aerodynamic plates.';
              } else {
                category = 'slopes';
                catLabel = 'Tail Fin';
                icon = '📐';
                primaryColor = '#0284c7';
                partTitle = `Vertical Tail Fin & Rudder ${i - 59}`;
                desc = 'Assemble the vertical stabilizer fin and directional rudder.';
              }
            }

            nodes.forEach((node) => {
              node.traverse((c) => {
                if (c.isMesh) {
                  stepMeshes.push(c);
                  const origMatName = c.material?.name || (Array.isArray(c.material) ? c.material[0]?.name : '');
                  applyPlaneLegoMaterial(c, origMatName);

                  c.castShadow = true;
                  c.receiveShadow = true;

                  const edgeLines = createBrickEdgeLines(c.geometry, c.material);
                  if (edgeLines) c.add(edgeLines);

                  c.userData = {
                    stepIndex: i,
                    stepNumber: i + 1,
                    pieceName: pad,
                    isTrainMesh: true,
                    isPlaneMesh: true
                  };

                  // Set visible = false initially for step-by-step assembly
                  c.visible = false;
                }
              });
            });

            planeGroup.updateMatrixWorld(true);
            const stepBox = new THREE.Box3();
            stepMeshes.forEach((m) => {
              m.updateMatrixWorld(true);
              stepBox.expandByObject(m);
            });

            const mountPos = new THREE.Vector3();
            stepBox.getCenter(mountPos);

            const stepSize = new THREE.Vector3();
            stepBox.getSize(stepSize);

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

          planeGroup.updateMatrixWorld(true);
          const finalBounds = new THREE.Box3().setFromObject(primaryRoot);

          resolve({
            trainGroup: planeGroup,
            trainAssemblyGroup: planeGroup,
            model: primaryRoot,
            box: finalBounds,
            size: finalBounds.getSize(new THREE.Vector3()),
            steps,
            stepCount: steps.length,
            totalSteps: steps.length,
            stages: PLANE_ASSEMBLY_STAGES,
            scale,
            name: 'Sky High! Propeller Plane',
            icon: '✈️'
          });
        },
        (xhr) => {
          if (xhr.lengthComputable && onProgress) {
            const percent = Math.round((xhr.loaded / xhr.total) * 100);
            onProgress(percent);
          }
        },
        (err) => {
          currentUrlIndex++;
          if (currentUrlIndex < candidateUrls.length) {
            tryLoad(candidateUrls[currentUrlIndex]);
          } else {
            console.error('[PlaneLoader] Failed to load plane model:', err);
            reject(err);
          }
        }
      );
    };

    tryLoad(candidateUrls[currentUrlIndex]);
  });
}
