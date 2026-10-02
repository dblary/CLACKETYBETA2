import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createBrickEdgeLines } from './trainLoader.js';

// Glossy ABS Plastic Materials for Modular Corner Cafe
const MAT_WHITE = new THREE.MeshPhysicalMaterial({
  color: 0xf8fafc,
  roughness: 0.20,
  metalness: 0.02,
  clearcoat: 0.55,
  clearcoatRoughness: 0.10
});

const MAT_GREEN = new THREE.MeshPhysicalMaterial({
  color: 0x16a34a,
  roughness: 0.22,
  metalness: 0.02,
  clearcoat: 0.50,
  clearcoatRoughness: 0.12
});

const MAT_RED = new THREE.MeshPhysicalMaterial({
  color: 0xd91e18,
  roughness: 0.22,
  metalness: 0.02,
  clearcoat: 0.52,
  clearcoatRoughness: 0.12
});

const MAT_YELLOW = new THREE.MeshPhysicalMaterial({
  color: 0xfacc15,
  roughness: 0.22,
  metalness: 0.02,
  clearcoat: 0.50,
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
  roughness: 0.28,
  metalness: 0.05,
  clearcoat: 0.40,
  clearcoatRoughness: 0.18
});

const MAT_DARK_GREY = new THREE.MeshPhysicalMaterial({
  color: 0x334155,
  roughness: 0.28,
  metalness: 0.08,
  clearcoat: 0.40,
  clearcoatRoughness: 0.18
});

const MAT_LIGHT_GREY = new THREE.MeshPhysicalMaterial({
  color: 0x94a3b8,
  roughness: 0.25,
  metalness: 0.10,
  clearcoat: 0.45,
  clearcoatRoughness: 0.15
});

const MAT_BROWN = new THREE.MeshPhysicalMaterial({
  color: 0x78350f,
  roughness: 0.32,
  metalness: 0.02,
  clearcoat: 0.38,
  clearcoatRoughness: 0.20
});

const MAT_TRANS_CLEAR = new THREE.MeshStandardMaterial({
  color: 0xbae6fd,
  roughness: 0.08,
  metalness: 0.10,
  transparent: true,
  opacity: 0.65,
  depthWrite: false
});

const MAT_TRANS_YELLOW = new THREE.MeshStandardMaterial({
  color: 0xfef08a,
  roughness: 0.08,
  metalness: 0.10,
  transparent: true,
  opacity: 0.75,
  depthWrite: false
});

const MAT_TRANS_RED = new THREE.MeshStandardMaterial({
  color: 0xef4444,
  roughness: 0.08,
  metalness: 0.10,
  transparent: true,
  opacity: 0.75,
  depthWrite: false
});

export const CAFE_ASSEMBLY_STAGES = [
  {
    id: 1,
    bagNumber: 1,
    name: 'Foundation, Lawn & Ground Floor Base',
    label: 'Bag 1: Lawn & Base',
    shortName: 'Lawn/Base',
    icon: '🌱',
    totalParts: 41,
    color: '#16a34a',
    bgLight: '#dcfce7',
    badgeColor: '#15803d',
    stepIndices: Array.from({ length: 41 }, (_, i) => i) // 0..40
  },
  {
    id: 2,
    bagNumber: 2,
    name: 'Picture Windows, Counter & Sun Awning',
    label: 'Bag 2: Windows & Awning',
    shortName: 'Windows/Awning',
    icon: '🏪',
    totalParts: 41,
    color: '#0284c7',
    bgLight: '#e0f2fe',
    badgeColor: '#0369a1',
    stepIndices: Array.from({ length: 41 }, (_, i) => i + 41) // 41..81
  },
  {
    id: 3,
    bagNumber: 3,
    name: 'Second Floor Dining & Attic Gable',
    label: 'Bag 3: Second Floor',
    shortName: 'Second Floor',
    icon: '☕',
    totalParts: 41,
    color: '#f59e0b',
    bgLight: '#fef3c7',
    badgeColor: '#b45309',
    stepIndices: Array.from({ length: 41 }, (_, i) => i + 82) // 82..122
  },
  {
    id: 4,
    bagNumber: 4,
    name: 'Roof Chimney & Outdoor Patio Seating',
    label: 'Bag 4: Roof & Patio',
    shortName: 'Roof/Patio',
    icon: '🪑',
    totalParts: 39,
    color: '#ef4444',
    bgLight: '#fee2e2',
    badgeColor: '#b91c1c',
    stepIndices: Array.from({ length: 39 }, (_, i) => i + 123) // 123..161
  }
];

export function applyCafeLegoMaterial(mesh, origMatName = '') {
  const name = origMatName || '';
  if (name.includes('Trans_Clear') || name.includes('Clear') || name.includes('Glass')) {
    mesh.material = MAT_TRANS_CLEAR.clone();
  } else if (name.includes('Trans_Yellow') || name.includes('Lantern')) {
    mesh.material = MAT_TRANS_YELLOW.clone();
  } else if (name.includes('Trans_Red')) {
    mesh.material = MAT_TRANS_RED.clone();
  } else if (name === 'Green' || name.includes('Green') || name.includes('Leaf')) {
    mesh.material = MAT_GREEN.clone();
  } else if (name === 'Red' || name.includes('Red')) {
    mesh.material = MAT_RED.clone();
  } else if (name === 'Yellow' || name.includes('Yellow')) {
    mesh.material = MAT_YELLOW.clone();
  } else if (name === 'Blue' || name.includes('Blue')) {
    mesh.material = MAT_BLUE.clone();
  } else if (name === 'Brown' || name.includes('Brown')) {
    mesh.material = MAT_BROWN.clone();
  } else if (name === 'Dark_Grey' || name.includes('Dark')) {
    mesh.material = MAT_DARK_GREY.clone();
  } else if (name === 'Light_Grey' || name.includes('Grey') || name.includes('Silver')) {
    mesh.material = MAT_LIGHT_GREY.clone();
  } else if (name === 'Black' || name.includes('Black')) {
    mesh.material = MAT_BLACK.clone();
  } else if (name === 'White' || name.includes('White')) {
    mesh.material = MAT_WHITE.clone();
  } else {
    mesh.material = MAT_WHITE.clone();
  }
}

/**
 * Loads SMALL_CAFE.glb (162 pieces), scales and centers it, aligns upright along the garden ground,
 * and sets up all 162 sequential steps with glossy clearcoat materials and progressive visibility.
 */
export function loadCafeModel(onProgress) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    const candidateUrls = [
      './assets/SMALL_CAFE.glb',
      './public/assets/SMALL_CAFE.glb',
      '/public/assets/SMALL_CAFE.glb',
      '/assets/SMALL_CAFE.glb',
      './SMALL_CAFE.glb',
      '/SMALL_CAFE.glb'
    ];

    let currentUrlIndex = 0;

    const tryLoad = (url) => {
      loader.load(
        url,
        (gltf) => {
          const cafeRoot = gltf.scene;

          // Remove duplicate root if exported multiple times
          const duplicateRoot = cafeRoot.getObjectByName('cafe_smallobj_1');
          if (duplicateRoot && duplicateRoot !== cafeRoot) {
            duplicateRoot.parent.remove(duplicateRoot);
          }

          const primaryRoot = cafeRoot.getObjectByName('cafe_smallobj') ||
            cafeRoot.getObjectByName('cafe_small.obj') ||
            cafeRoot.children[0] ||
            cafeRoot;

          // Align authored axes to Three.js world coordinates:
          // Raw geometry has Z-up, Y-back, and X-right.
          // Rotating -90° on X transforms: Local Z -> World Up (+Y), Local Front (-Y) -> World Front (+Z).
          primaryRoot.position.set(0, 0, 0);
          primaryRoot.rotation.set(-Math.PI / 2, 0, 0);
          primaryRoot.scale.set(1, 1, 1);
          primaryRoot.updateMatrixWorld(true);

          const cafeGroup = new THREE.Group();
          cafeGroup.name = 'cafeAssemblyGroup';
          cafeGroup.add(cafeRoot);

          // Compute raw bounds after orientation
          let box = new THREE.Box3().setFromObject(primaryRoot);
          let size = new THREE.Vector3();
          box.getSize(size);

          const footprint = Math.max(size.x, size.z);
          const targetLength = 14.5;
          const scale = footprint > 0 ? (targetLength / footprint) : 0.022;
          primaryRoot.scale.setScalar(scale);
          primaryRoot.updateMatrixWorld(true);

          // Center on X and Z, and place flush on the garden ground at Y = 0.02
          box = new THREE.Box3().setFromObject(primaryRoot);
          const center = new THREE.Vector3();
          box.getCenter(center);
          primaryRoot.position.x = -center.x;
          primaryRoot.position.z = -center.z;
          primaryRoot.position.y = -box.min.y + 0.02;
          primaryRoot.updateMatrixWorld(true);

          // Find Piece000 through Piece161 in numerical order
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

          const totalPieces = 162;
          const steps = [];

          for (let i = 0; i < totalPieces; i++) {
            const pad = `Piece${String(i).padStart(3, '0')}`;
            const nodes = pieceNodesMap.get(i) || [];
            const stepMeshes = [];

            let category = 'bricks';
            let catLabel = 'Bricks';
            let icon = '🧱';
            let primaryColor = '#facc15';
            let desc = 'Interlock this precision brick into the corner café architecture.';
            let partTitle = 'Café Construction Brick';

            if (i < 41) {
              // Bag 1: Foundation & Base
              if (i === 0) {
                category = 'plates';
                catLabel = 'Baseplate';
                icon = '🌱';
                primaryColor = '#16a34a';
                partTitle = 'Green Lawn Foundation Baseplate';
                desc = 'Lay down the large green foundation plate for the corner café and outdoor patio.';
              } else if (i === 1) {
                category = 'special';
                catLabel = 'Pavement';
                icon = '🪴';
                primaryColor = '#16a34a';
                partTitle = 'Sidewalk Planter & Shrubbery Element';
                desc = 'Place the ornamental green sidewalk planter for outdoor patio decor.';
              } else if (i < 15) {
                category = 'plates';
                catLabel = 'Plates';
                icon = '🧱';
                primaryColor = '#f8fafc';
                partTitle = `Sidewalk Pavement Tile ${i}`;
                desc = 'Tile the pedestrian sidewalk and café entryway floor.';
              } else {
                category = 'bricks';
                catLabel = 'Walls';
                icon = '🧱';
                primaryColor = '#facc15';
                partTitle = `Ground Floor Yellow Wall Brick ${i - 14}`;
                desc = 'Erect the sturdy yellow structural corner walls of the ground floor café.';
              }
            } else if (i < 82) {
              // Bag 2: Windows, Counter & Awning
              if (i >= 45 && i <= 52) {
                category = 'special';
                catLabel = 'Windows';
                icon = '🪟';
                primaryColor = '#bae6fd';
                partTitle = `Ground Floor Clear Picture Window ${i - 44}`;
                desc = 'Install large transparent picture window panes for the café storefront.';
              } else if (i >= 56 && i <= 72) {
                category = 'slopes';
                catLabel = 'Awning';
                icon = '🎪';
                primaryColor = i % 2 === 0 ? '#d91e18' : '#f8fafc';
                partTitle = `Striped Sun Awning Canopy Section ${i - 55}`;
                desc = 'Mount the stylish red and white striped awning canopy over the café entrance.';
              } else {
                category = 'bricks';
                catLabel = 'Counter';
                icon = '☕';
                primaryColor = '#0284c7';
                partTitle = `Espresso Bar & Counter Element ${i - 40}`;
                desc = 'Build the interior barista coffee counter and customer service display.';
              }
            } else if (i < 123) {
              // Bag 3: Second Floor Dining & Attic
              if (i >= 111 && i <= 116) {
                category = 'special';
                catLabel = 'Windows';
                icon = '🪟';
                primaryColor = '#bae6fd';
                partTitle = `Second Floor Dining Bay Window ${i - 110}`;
                desc = 'Set the upper floor dining room panoramic bay windows.';
              } else if (i >= 88 && i <= 92) {
                category = 'special';
                catLabel = 'Lantern';
                icon = '💡';
                primaryColor = '#fef08a';
                partTitle = 'Vintage Wall Sconce Street Lantern';
                desc = 'Mount warm translucent yellow illumination lanterns on the exterior facade.';
              } else {
                category = 'slopes';
                catLabel = 'Roof Gable';
                icon = '📐';
                primaryColor = '#d91e18';
                partTitle = `Gable Roof Support Truss ${i - 81}`;
                desc = 'Construct the angled attic roof trusses and second-storey walls.';
              }
            } else {
              // Bag 4: Roof, Chimney & Outdoor Patio
              if (i >= 144 && i <= 147) {
                category = 'special';
                catLabel = 'Patio';
                icon = '🪑';
                primaryColor = '#0284c7';
                partTitle = `Outdoor Café Dining Chair ${i - 143}`;
                desc = 'Place the blue outdoor bistro chairs on the sidewalk patio.';
              } else if (i >= 148 && i <= 152) {
                category = 'special';
                catLabel = 'Patio Table';
                icon = '☕';
                primaryColor = '#f8fafc';
                partTitle = 'Sidewalk Coffee Table with Mug';
                desc = 'Arrange the outdoor bistro dining table with coffee cups.';
              } else if (i >= 150 && i <= 154) {
                category = 'special';
                catLabel = 'Chimney';
                icon = '🧱';
                primaryColor = '#1e293b';
                partTitle = 'Attic Rooftop Smoke Chimney Cap';
                desc = 'Crown the chimney flue atop the red tiled cafe roof.';
              } else {
                category = 'slopes';
                catLabel = 'Roof Tile';
                icon = '🏠';
                primaryColor = '#d91e18';
                partTitle = `Red Terracotta Roof Tile ${i - 122}`;
                desc = 'Shingle the vibrant red roof slope with interlocking tiles.';
              }
            }

            nodes.forEach((node) => {
              node.traverse((c) => {
                if (c.isMesh) {
                  stepMeshes.push(c);
                  const origMatName = c.material?.name || (Array.isArray(c.material) ? c.material[0]?.name : '');
                  applyCafeLegoMaterial(c, origMatName);

                  c.castShadow = true;
                  c.receiveShadow = true;

                  const edgeLines = createBrickEdgeLines(c.geometry, c.material);
                  if (edgeLines) c.add(edgeLines);

                  c.userData = {
                    stepIndex: i,
                    stepNumber: i + 1,
                    pieceName: pad,
                    isTrainMesh: true,
                    isHouseMesh: true,
                    isCafeMesh: true
                  };

                  // Set visible = false initially for step-by-step assembly
                  c.visible = false;
                }
              });
            });

            cafeGroup.updateMatrixWorld(true);
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

          cafeGroup.updateMatrixWorld(true);
          const finalBounds = new THREE.Box3().setFromObject(primaryRoot);

          resolve({
            trainGroup: cafeGroup,
            trainAssemblyGroup: cafeGroup,
            model: primaryRoot,
            box: finalBounds,
            size: finalBounds.getSize(new THREE.Vector3()),
            steps,
            stepCount: steps.length,
            totalSteps: steps.length,
            stages: CAFE_ASSEMBLY_STAGES,
            scale,
            name: 'Corner Street Café',
            icon: '☕'
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
            console.error('[CafeLoader] Error loading SMALL_CAFE.glb:', error);
            reject(error);
          }
        }
      );
    };

    tryLoad(candidateUrls[0]);
  });
}
