import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createBrickEdgeLines } from './trainLoader.js';

// Glossy ABS Plastic Materials for Rescue Helicopter
const MAT_WHITE = new THREE.MeshPhysicalMaterial({
  color: 0xf8fafc,
  roughness: 0.20,
  metalness: 0.02,
  clearcoat: 0.55,
  clearcoatRoughness: 0.10
});

const MAT_BLACK = new THREE.MeshPhysicalMaterial({
  color: 0x1e293b,
  roughness: 0.30,
  metalness: 0.05,
  clearcoat: 0.40,
  clearcoatRoughness: 0.18
});

const MAT_TRANS_YELLOW = new THREE.MeshStandardMaterial({
  color: 0xfacc15,
  roughness: 0.08,
  metalness: 0.1,
  transparent: true,
  opacity: 0.75,
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

const MAT_TRANS_BLUE = new THREE.MeshStandardMaterial({
  color: 0x0284c7,
  roughness: 0.08,
  metalness: 0.1,
  transparent: true,
  opacity: 0.70,
  depthWrite: false
});

export const HELICOPTER_ASSEMBLY_STAGES = [
  {
    id: 1,
    bagNumber: 1,
    name: 'Landing Skids & Lower Chassis',
    label: 'Bag 1: Skids & Chassis',
    shortName: 'Skids/Chassis',
    icon: '🛞',
    totalParts: 15,
    color: '#0ea5e9',
    bgLight: '#e0f2fe',
    badgeColor: '#0369a1',
    stepIndices: Array.from({ length: 15 }, (_, i) => i) // 0..14
  },
  {
    id: 2,
    bagNumber: 2,
    name: 'Cabin Deck & Searchlights',
    label: 'Bag 2: Cabin & Lights',
    shortName: 'Cabin/Lights',
    icon: '💡',
    totalParts: 15,
    color: '#facc15',
    bgLight: '#fef3c7',
    badgeColor: '#a16207',
    stepIndices: Array.from({ length: 15 }, (_, i) => i + 15) // 15..29
  },
  {
    id: 3,
    bagNumber: 3,
    name: 'Tail Boom & Tail Rotor',
    label: 'Bag 3: Tail & Stabilizer',
    shortName: 'Tail/Stabilizer',
    icon: '🔄',
    totalParts: 15,
    color: '#ef4444',
    bgLight: '#fee2e2',
    badgeColor: '#b91c1c',
    stepIndices: Array.from({ length: 15 }, (_, i) => i + 30) // 30..44
  },
  {
    id: 4,
    bagNumber: 4,
    name: 'Cockpit Canopy & Main Rotor',
    label: 'Bag 4: Canopy & Rotor',
    shortName: 'Canopy/Rotor',
    icon: '🚁',
    totalParts: 14,
    color: '#10b981',
    bgLight: '#d1fae5',
    badgeColor: '#047857',
    stepIndices: Array.from({ length: 14 }, (_, i) => i + 45) // 45..58
  }
];

export function applyHelicopterLegoMaterial(mesh, origMatName = '') {
  const name = origMatName || '';
  if (name.includes('Trans_Medium_Blue') || name.includes('Trans_Blue')) {
    mesh.material = MAT_TRANS_BLUE.clone();
  } else if (name.includes('Trans_Yellow')) {
    mesh.material = MAT_TRANS_YELLOW.clone();
  } else if (name.includes('Trans_Clear') || name.includes('Clear')) {
    mesh.material = MAT_TRANS_CLEAR.clone();
  } else if (name.includes('Trans_Red')) {
    mesh.material = MAT_TRANS_RED.clone();
  } else if (name.includes('Trans_Green')) {
    mesh.material = MAT_TRANS_GREEN.clone();
  } else if (name === 'Black' || name.includes('Black')) {
    mesh.material = MAT_BLACK.clone();
  } else if (name === 'White' || name.includes('White')) {
    mesh.material = MAT_WHITE.clone();
  } else {
    mesh.material = MAT_WHITE.clone();
  }
}

/**
 * Loads helicopter.glb (59 pieces), scales and centers it, aligns upright along the helipad,
 * and sets up all 59 sequential steps with glossy clearcoat materials and progressive visibility.
 */
export function loadHelicopterModel(onProgress) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    const candidateUrls = [
      './assets/helicopter.glb',
      './public/assets/helicopter.glb',
      '/public/assets/helicopter.glb',
      '/assets/helicopter.glb',
      './helicopter.glb',
      '/helicopter.glb'
    ];

    let currentUrlIndex = 0;

    const tryLoad = (url) => {
      loader.load(
        url,
        (gltf) => {
          const heliRoot = gltf.scene;

          const primaryRoot = heliRoot.getObjectByName('helicopter.obj') ||
            heliRoot.getObjectByName('helicopterobj') ||
            heliRoot.children[0] ||
            heliRoot;

          // Align authored axes to Three.js world coordinates:
          // Authored: Forward is at -60° (0.5, -sqrt(3)/2, 0), Right is (-sqrt(3)/2, -0.5, 0), Up is (0, 0, 1).
          // Target: World Forward is (0, 0, -1), World Right is (1, 0, 0), World Up is (0, 1, 0).
          primaryRoot.position.set(0, 0, 0);
          primaryRoot.rotation.set(0, 0, 0);
          primaryRoot.scale.set(1, 1, 1);

          const localForward = new THREE.Vector3(0.5, -Math.sqrt(3) / 2, 0);
          const localRight = new THREE.Vector3(-Math.sqrt(3) / 2, -0.5, 0);
          const localUp = new THREE.Vector3(0, 0, 1);

          const basisMatrix = new THREE.Matrix4().set(
            localRight.x, localRight.y, localRight.z, 0,
            localUp.x, localUp.y, localUp.z, 0,
            -localForward.x, -localForward.y, -localForward.z, 0,
            0, 0, 0, 1
          );

          primaryRoot.quaternion.setFromRotationMatrix(basisMatrix);
          primaryRoot.updateMatrixWorld(true);

          const helicopterGroup = new THREE.Group();
          helicopterGroup.name = 'helicopterAssemblyGroup';
          helicopterGroup.add(heliRoot);

          // Compute raw bounds after orientation
          let box = new THREE.Box3().setFromObject(primaryRoot);
          let size = new THREE.Vector3();
          box.getSize(size);

          const footprint = Math.max(size.x, size.z);
          const targetLength = 11.5;
          const scale = footprint > 0 ? (targetLength / footprint) : 0.03;
          primaryRoot.scale.setScalar(scale);
          primaryRoot.updateMatrixWorld(true);

          // Center on X and Z, and place flush on helipad at Y = 0.02
          box = new THREE.Box3().setFromObject(primaryRoot);
          const center = new THREE.Vector3();
          box.getCenter(center);
          primaryRoot.position.x = -center.x;
          primaryRoot.position.z = -center.z;
          primaryRoot.position.y = -box.min.y + 0.02;
          primaryRoot.updateMatrixWorld(true);

          // Find Piece000 through Piece058 in numerical order
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

          const totalPieces = 59;
          const steps = [];

          for (let i = 0; i < totalPieces; i++) {
            const pad = `Piece${String(i).padStart(3, '0')}`;
            const nodes = pieceNodesMap.get(i) || [];
            const stepMeshes = [];

            let category = 'bricks';
            let catLabel = 'Bricks';
            let icon = '🧱';
            let primaryColor = '#f8fafc';
            let desc = 'Snap this precision interlocking element onto the helicopter assembly.';
            let partTitle = 'Helicopter Component';

            if (i < 15) {
              // Bag 1: Landing Skids & Lower Chassis
              if (i === 0 || i === 1) {
                category = 'special';
                catLabel = 'Skids';
                icon = '🛞';
                primaryColor = '#f8fafc';
                partTitle = i === 0 ? 'Starboard Landing Skid Rail' : 'Port Landing Skid Rail';
                desc = 'Install aerodynamic ground landing skid runner tube.';
              } else {
                category = 'plates';
                catLabel = 'Chassis';
                icon = '🧱';
                primaryColor = i % 2 === 0 ? '#1e293b' : '#f8fafc';
                partTitle = `Chassis Cross-Strut Element ${i - 1}`;
                desc = 'Assemble the reinforced lower chassis deck and cross-strut brackets.';
              }
            } else if (i < 30) {
              // Bag 2: Cabin Deck & Searchlights
              if (i === 17 || i === 18) {
                category = 'special';
                catLabel = 'Searchlight';
                icon = '💡';
                primaryColor = '#facc15';
                partTitle = i === 17 ? 'Forward Searchlight Lens' : 'Night-Vision Spotlight';
                desc = 'Attach the high-visibility translucent yellow searchlight lens.';
              } else {
                category = 'bricks';
                catLabel = 'Cabin';
                icon = '🚁';
                primaryColor = '#1e293b';
                partTitle = `Cabin Cockpit Deck Element ${i - 14}`;
                desc = 'Build the flight crew passenger cabin and instrument console deck.';
              }
            } else if (i < 45) {
              // Bag 3: Tail Boom & Tail Rotor
              if (i === 33 || i === 35) {
                category = 'special';
                catLabel = 'Window';
                icon = '🪟';
                primaryColor = '#bae6fd';
                partTitle = `Cabin Side Observation Window ${i === 33 ? 'Port' : 'Starboard'}`;
                desc = 'Mount clear observation side window glass pane.';
              } else if (i === 41) {
                category = 'special';
                catLabel = 'Warning';
                icon = '🔴';
                primaryColor = '#ef4444';
                partTitle = 'Tail Strobe Warning Light';
                desc = 'Mount high-intensity red tail warning strobe.';
              } else if (i === 42) {
                category = 'special';
                catLabel = 'Tail Rotor';
                icon = '🔄';
                primaryColor = '#1e293b';
                partTitle = 'High-Speed Counter-Torque Tail Rotor';
                desc = 'Attach the counter-torque directional tail rotor propeller.';
              } else {
                category = 'slopes';
                catLabel = 'Tail Boom';
                icon = '📐';
                primaryColor = '#f8fafc';
                partTitle = `Tail Boom Extension Segment ${i - 29}`;
                desc = 'Assemble the streamlined aerodynamic tail boom spar.';
              }
            } else {
              // Bag 4: Cockpit Canopy & Main Rotor
              if (i === 52) {
                category = 'special';
                catLabel = 'Nav Light';
                icon = '🔴';
                primaryColor = '#ef4444';
                partTitle = 'Port Side Red Navigation Light';
                desc = 'Install left-side aviation red position navigation light.';
              } else if (i === 53) {
                category = 'special';
                catLabel = 'Nav Light';
                icon = '🟢';
                primaryColor = '#22c55e';
                partTitle = 'Starboard Side Green Navigation Light';
                desc = 'Install right-side aviation green position navigation light.';
              } else if (i === 55) {
                category = 'special';
                catLabel = 'Canopy';
                icon = '🪟';
                primaryColor = '#0284c7';
                partTitle = 'Panoramic Bubble Cockpit Canopy';
                desc = 'Snap the large tinted translucent blue pilot bubble canopy windscreen.';
              } else if (i === 56) {
                category = 'special';
                catLabel = 'Rotor Hub';
                icon = '⚙️';
                primaryColor = '#1e293b';
                partTitle = 'Main Rotor Swashplate Hub';
                desc = 'Install the central dual-axis swashplate rotor mast hub.';
              } else if (i === 57 || i === 58) {
                category = 'special';
                catLabel = 'Rotor Blade';
                icon = '🌀';
                primaryColor = '#1e293b';
                partTitle = `Aerodynamic Main Rotor Blade ${i === 57 ? 'A' : 'B'}`;
                desc = 'Attach high-lift balanced carbon-fiber main rotor blade.';
              } else {
                category = 'slopes';
                catLabel = 'Roof Cowling';
                icon = '📐';
                primaryColor = '#1e293b';
                partTitle = `Turbine Engine Cowling Fairing ${i - 44}`;
                desc = 'Enclose the top turbine engine bay fairing.';
              }
            }

            nodes.forEach((node) => {
              node.traverse((c) => {
                if (c.isMesh) {
                  stepMeshes.push(c);
                  const origMatName = c.material?.name || (Array.isArray(c.material) ? c.material[0]?.name : '');
                  applyHelicopterLegoMaterial(c, origMatName);

                  c.castShadow = true;
                  c.receiveShadow = true;

                  const edgeLines = createBrickEdgeLines(c.geometry, c.material);
                  if (edgeLines) c.add(edgeLines);

                  c.userData = {
                    stepIndex: i,
                    stepNumber: i + 1,
                    pieceName: pad,
                    isTrainMesh: true,
                    isHelicopterMesh: true
                  };

                  // Set visible = false initially for step-by-step assembly
                  c.visible = false;
                }
              });
            });

            helicopterGroup.updateMatrixWorld(true);
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
              stepSize.copy(stepBox.getSize(new THREE.Vector3()));
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

          helicopterGroup.updateMatrixWorld(true);
          const finalBounds = new THREE.Box3().setFromObject(primaryRoot);

          resolve({
            trainGroup: helicopterGroup,
            trainAssemblyGroup: helicopterGroup,
            model: primaryRoot,
            box: finalBounds,
            size: finalBounds.getSize(new THREE.Vector3()),
            steps,
            stepCount: steps.length,
            totalSteps: steps.length,
            stages: HELICOPTER_ASSEMBLY_STAGES,
            scale,
            name: 'Rescue Helicopter',
            icon: '🚁'
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
            console.error('[HelicopterLoader] Error loading helicopter.glb:', error);
            reject(error);
          }
        }
      );
    };

    tryLoad(candidateUrls[0]);
  });
}
