import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Curated ABS Plastic Materials with High-Contrast Readability
const MAT_WHEELS = new THREE.MeshPhysicalMaterial({
  color: 0x222528,
  roughness: 0.32,
  metalness: 0.12,
  clearcoat: 0.45,
  clearcoatRoughness: 0.2
});

const MAT_ALLOY_RIM = new THREE.MeshPhysicalMaterial({
  color: 0xc8d0d6,
  roughness: 0.18,
  metalness: 0.72,
  clearcoat: 0.5,
  clearcoatRoughness: 0.15
});

const MAT_CHASSIS_DARK = new THREE.MeshPhysicalMaterial({
  color: 0x2e3338, // Rich dark slate grey instead of pitch black
  roughness: 0.3,
  metalness: 0.08,
  clearcoat: 0.42,
  clearcoatRoughness: 0.2
});

const MAT_BODY_RED = new THREE.MeshPhysicalMaterial({
  color: 0xd91e18, // Classic fire red
  roughness: 0.24,
  metalness: 0.0,
  clearcoat: 0.45,
  clearcoatRoughness: 0.15
});

const MAT_YELLOW_ACCENT = new THREE.MeshPhysicalMaterial({
  color: 0xf6bb12, // Vibrant warning yellow
  roughness: 0.24,
  metalness: 0.0,
  clearcoat: 0.4,
  clearcoatRoughness: 0.15
});

const MAT_ROOF_GREY = new THREE.MeshPhysicalMaterial({
  color: 0x505559, // Balanced slate grey for roof & fittings
  roughness: 0.28,
  metalness: 0.06,
  clearcoat: 0.35,
  clearcoatRoughness: 0.2
});

const MAT_WINDOW_GLASS = new THREE.MeshStandardMaterial({
  color: 0x709fc8, // Transparent cyan for windows
  roughness: 0.1,
  metalness: 0.1,
  transparent: true,
  opacity: 0.65,
  depthWrite: false
});

const MAT_MAGNET = new THREE.MeshStandardMaterial({
  color: 0x9aa2a9,
  roughness: 0.28,
  metalness: 0.65
});

/**
 * Creates high-contrast rim/seam edges.
 * Black and dark-gray pieces (chassis, bogies, ladder, wheels) receive
 * a subtle contrasting silver-slate rim outline so studs, bogies,
 * and seams remain crisp and never blend into an indistinct black silhouette.
 */
export function createBrickEdgeLines(geometry, material) {
  try {
    const edgeGeom = new THREE.EdgesGeometry(geometry, 24);
    let isDark = false;
    const mat = Array.isArray(material) ? material[0] : material;
    if (mat && mat.color) {
      const lum = 0.299 * mat.color.r + 0.587 * mat.color.g + 0.114 * mat.color.b;
      if (lum < 0.38) isDark = true;
    }
    const edgeColor = isDark ? 0x9fb3c8 : 0x22272e;
    const edgeOpacity = isDark ? 0.82 : 0.35;
    const edgeMat = new THREE.LineBasicMaterial({
      color: edgeColor,
      transparent: true,
      opacity: edgeOpacity,
      depthWrite: false
    });
    const edgeLines = new THREE.LineSegments(edgeGeom, edgeMat);
    edgeLines.name = 'brick-seam-edge';
    return edgeLines;
  } catch (e) {
    return null;
  }
}

// Backwards compatibility alias
export const createLegoEdgeLines = createBrickEdgeLines;


export const TRAIN_ASSEMBLY_STAGES = [
  {
    id: 1,
    bagNumber: 1,
    name: 'Wheel Bogies & Rails',
    label: 'Bag 1: Wheels',
    shortName: 'Wheels',
    icon: '⚙️',
    totalParts: 6,
    color: '#ef4444',
    bgLight: '#fee2e2',
    badgeColor: '#b91c1c',
    stepIndices: [0, 1, 2, 3, 4, 5]
  },
  {
    id: 2,
    bagNumber: 2,
    name: 'Chassis & Couplers',
    label: 'Bag 2: Chassis',
    shortName: 'Chassis',
    icon: '🧱',
    totalParts: 8,
    color: '#0ea5e9',
    bgLight: '#e0f2fe',
    badgeColor: '#0284c7',
    stepIndices: [6, 7, 8, 9, 10, 11, 12, 13]
  },
  {
    id: 3,
    bagNumber: 3,
    name: 'Boiler & Cab Floor',
    label: 'Bag 3: Boiler/Cab',
    shortName: 'Boiler',
    icon: '🔥',
    totalParts: 14,
    color: '#f59e0b',
    bgLight: '#fef3c7',
    badgeColor: '#d97706',
    stepIndices: [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27]
  },
  {
    id: 4,
    bagNumber: 4,
    name: 'Cab Roof & Whistle',
    label: 'Bag 4: Roof/Whistle',
    shortName: 'Roof',
    icon: '🔔',
    totalParts: 14,
    color: '#8b5cf6',
    bgLight: '#f3e8ff',
    badgeColor: '#6d28d9',
    stepIndices: [28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41]
  }
];

// Step metadata configuration for the 42 granular assembly steps
export const GRANULAR_STEPS_METADATA = [
  { step: 1, title: 'Front Wheel Bogie & Axles', shortTitle: 'Front Bogie', category: 'wheels', catLabel: 'Wheels', icon: '⚙️', primaryColor: '#222528', colors: ['#222528', '#c8d0d6'], desc: 'Heavy-duty electric contact alloy wheels and dual bogie truck.' },
  { step: 2, title: 'Rear Wheel Bogie & Axles', shortTitle: 'Rear Bogie', category: 'wheels', catLabel: 'Wheels', icon: '⚙️', primaryColor: '#222528', colors: ['#222528', '#c8d0d6'], desc: 'Rear trailing wheel truck with alloy flanged wheelset.' },
  { step: 3, title: 'Bogie Swivel Pivot Brackets', shortTitle: 'Bogie Pivots', category: 'plates', catLabel: 'Plates', icon: '▬', primaryColor: '#2e3338', colors: ['#2e3338'], desc: 'Reinforced 2x2 turntable swivel mount brackets.' },
  { step: 4, title: 'Left Chassis Backbone Beam', shortTitle: 'Chassis Beam (L)', category: 'plates', catLabel: 'Plates', icon: '▬', primaryColor: '#2e3338', colors: ['#2e3338'], desc: 'Longitudinal dark grey chassis girder beam (Left).' },
  { step: 5, title: 'Right Chassis Backbone Beam', shortTitle: 'Chassis Beam (R)', category: 'plates', catLabel: 'Plates', icon: '▬', primaryColor: '#2e3338', colors: ['#2e3338'], desc: 'Longitudinal dark grey chassis girder beam (Right).' },
  { step: 6, title: 'Front Magnetic Coupler & Pilot', shortTitle: 'Front Coupler', category: 'wheels', catLabel: 'Wheels', icon: '🧲', primaryColor: '#9aa2a9', colors: ['#9aa2a9', '#2e3338'], desc: 'Front magnetic coupling block with dual crash buffers.' },
  { step: 7, title: 'Rear Magnetic Coupler & Buffer', shortTitle: 'Rear Coupler', category: 'wheels', catLabel: 'Wheels', icon: '🧲', primaryColor: '#9aa2a9', colors: ['#9aa2a9', '#2e3338'], desc: 'Rear rolling stock hitch coupler and buffer plate.' },
  { step: 8, title: 'Lower Chassis Foundation Plate (Front)', shortTitle: 'Baseplate Front', category: 'plates', catLabel: 'Plates', icon: '▬', primaryColor: '#d91e18', colors: ['#d91e18'], desc: 'Red 2x4 foundation plate securing front underframe.' },
  { step: 9, title: 'Lower Chassis Foundation Plate (Rear)', shortTitle: 'Baseplate Rear', category: 'plates', catLabel: 'Plates', icon: '▬', primaryColor: '#d91e18', colors: ['#d91e18'], desc: 'Red 2x4 foundation plate securing rear cabin deck.' },
  { step: 10, title: 'Center Frame Cross-Tie Plate', shortTitle: 'Center Plate', category: 'plates', catLabel: 'Plates', icon: '▬', primaryColor: '#2e3338', colors: ['#2e3338'], desc: 'Mid-span 2x4 chassis interlocking bridge tie.' },
  { step: 11, title: 'Firebox Foundation Bed', shortTitle: 'Firebox Bed', category: 'bricks', catLabel: 'Bricks', icon: '■', primaryColor: '#2e3338', colors: ['#2e3338'], desc: 'High-temperature firebox support blocks.' },
  { step: 12, title: 'Locomotive Engine Floor Deck', shortTitle: 'Engine Floor', category: 'plates', catLabel: 'Plates', icon: '▬', primaryColor: '#d91e18', colors: ['#d91e18'], desc: 'Reinforced 4x6 firebox floor plates.' },
  { step: 13, title: 'Engineer Cab Walkway Deck', shortTitle: 'Cab Walkway', category: 'plates', catLabel: 'Plates', icon: '▬', primaryColor: '#d91e18', colors: ['#d91e18'], desc: 'Anti-slip studded engineer cabin platform.' },
  { step: 14, title: 'Driver Throttle Lever & Control Console', shortTitle: 'Cab Console', category: 'special', catLabel: 'Special', icon: '🕹️', primaryColor: '#f6bb12', colors: ['#f6bb12', '#2e3338'], desc: 'Steam pressure regulator levers and inspection hatch.' },
  { step: 15, title: 'Yellow Racing Stripe - Left Flank', shortTitle: 'Stripe (Left)', category: 'plates', catLabel: 'Plates', icon: '⚡', primaryColor: '#f6bb12', colors: ['#f6bb12'], desc: 'Signature speed livery trim plate (Left).' },
  { step: 16, title: 'Yellow Racing Stripe - Right Flank', shortTitle: 'Stripe (Right)', category: 'plates', catLabel: 'Plates', icon: '⚡', primaryColor: '#f6bb12', colors: ['#f6bb12'], desc: 'Signature speed livery trim plate (Right).' },
  { step: 17, title: 'Boiler Lower Curved Shell (Front)', shortTitle: 'Boiler Shell (F)', category: 'round', catLabel: 'Round', icon: '●', primaryColor: '#d91e18', colors: ['#d91e18'], desc: 'Cylindrical red boiler curved casing bottom.' },
  { step: 18, title: 'Boiler Lower Curved Shell (Rear)', shortTitle: 'Boiler Shell (R)', category: 'round', catLabel: 'Round', icon: '●', primaryColor: '#d91e18', colors: ['#d91e18'], desc: 'Aft boiler casing cradle segment.' },
  { step: 19, title: 'Cab Lower Wall - Left (Red 1x4)', shortTitle: 'Cab Wall (L)', category: 'bricks', catLabel: 'Bricks', icon: '■', primaryColor: '#d91e18', colors: ['#d91e18'], desc: 'Standard 1x4 red wall brick with interlocking studs.' },
  { step: 20, title: 'Cab Lower Wall - Right (Red 1x4)', shortTitle: 'Cab Wall (R)', category: 'bricks', catLabel: 'Bricks', icon: '■', primaryColor: '#d91e18', colors: ['#d91e18'], desc: 'Standard 1x4 red wall brick with interlocking studs.' },
  { step: 21, title: 'Cab Rear Door Bulkhead Wall', shortTitle: 'Rear Door Wall', category: 'bricks', catLabel: 'Bricks', icon: '■', primaryColor: '#2e3338', colors: ['#2e3338'], desc: 'Cab access doorframe pillar bricks.' },
  { step: 22, title: 'Cab Front Partition Bulkhead', shortTitle: 'Front Bulkhead', category: 'bricks', catLabel: 'Bricks', icon: '■', primaryColor: '#2e3338', colors: ['#2e3338'], desc: 'Boiler firewall isolating the cabin from steam chamber.' },
  { step: 23, title: 'Side Window Frame - Front Left', shortTitle: 'Window Frame FL', category: 'special', catLabel: 'Special', icon: '🪟', primaryColor: '#709fc8', colors: ['#709fc8', '#2e3338'], desc: '1x2 window sill frame with recessed groove.' },
  { step: 24, title: 'Side Window Frame - Front Right', shortTitle: 'Window Frame FR', category: 'special', catLabel: 'Special', icon: '🪟', primaryColor: '#709fc8', colors: ['#709fc8', '#2e3338'], desc: '1x2 window sill frame with recessed groove.' },
  { step: 25, title: 'Side Window Frame - Rear Left', shortTitle: 'Window Frame RL', category: 'special', catLabel: 'Special', icon: '🪟', primaryColor: '#709fc8', colors: ['#709fc8', '#2e3338'], desc: '1x2 aft cab side window frame.' },
  { step: 26, title: 'Side Window Frame - Rear Right', shortTitle: 'Window Frame RR', category: 'special', catLabel: 'Special', icon: '🪟', primaryColor: '#709fc8', colors: ['#709fc8', '#2e3338'], desc: '1x2 aft cab side window frame.' },
  { step: 27, title: 'Translucent Cyan Window Glass (Left)', shortTitle: 'Window Glass (L)', category: 'special', catLabel: 'Special', icon: '💎', primaryColor: '#709fc8', colors: ['#709fc8'], desc: 'Clear acrylic transparent window insert panes.' },
  { step: 28, title: 'Translucent Cyan Window Glass (Right)', shortTitle: 'Window Glass (R)', category: 'special', catLabel: 'Special', icon: '💎', primaryColor: '#709fc8', colors: ['#709fc8'], desc: 'Clear acrylic transparent window insert panes.' },
  { step: 29, title: 'Forward Smokebox End Cap', shortTitle: 'Smokebox Cap', category: 'round', catLabel: 'Round', icon: '●', primaryColor: '#2e3338', colors: ['#2e3338'], desc: 'Convex round front boiler door with latch.' },
  { step: 30, title: 'Locomotive Brass Headlamp', shortTitle: 'Headlamp', category: 'round', catLabel: 'Round', icon: '💡', primaryColor: '#f6bb12', colors: ['#f6bb12'], desc: 'Forward warning lantern with reflector dish.' },
  { step: 31, title: 'Pressurized Steam Boiler Core (Lower)', shortTitle: 'Boiler Core (L)', category: 'round', catLabel: 'Round', icon: '●', primaryColor: '#d91e18', colors: ['#d91e18'], desc: 'Mid-boiler cylinder block with steam conduit ribs.' },
  { step: 32, title: 'Pressurized Steam Boiler Core (Upper)', shortTitle: 'Boiler Core (U)', category: 'round', catLabel: 'Round', icon: '●', primaryColor: '#d91e18', colors: ['#d91e18'], desc: 'Upper pressurized boiler steam dome casing.' },
  { step: 33, title: 'Left Steam Piston & Valve Block', shortTitle: 'Piston Block (L)', category: 'round', catLabel: 'Round', icon: '●', primaryColor: '#2e3338', colors: ['#2e3338'], desc: 'High-pressure cast-iron steam cylinder drive.' },
  { step: 34, title: 'Right Steam Piston & Valve Block', shortTitle: 'Piston Block (R)', category: 'round', catLabel: 'Round', icon: '●', primaryColor: '#2e3338', colors: ['#2e3338'], desc: 'High-pressure cast-iron steam cylinder drive.' },
  { step: 35, title: 'Upper Boiler Cowl Slope', shortTitle: 'Boiler Cowl', category: 'slopes', catLabel: 'Slopes', icon: '▲', primaryColor: '#d91e18', colors: ['#d91e18'], desc: 'Curved 45° aerodynamic red cowl transition block.' },
  { step: 36, title: 'Panoramic Cab Windshield (Front)', shortTitle: 'Front Windshield', category: 'special', catLabel: 'Special', icon: '💎', primaryColor: '#709fc8', colors: ['#709fc8'], desc: 'Upper beveled clear panoramic windshield.' },
  { step: 37, title: 'Smokestack Chimney Flue Base', shortTitle: 'Chimney Base', category: 'round', catLabel: 'Round', icon: '●', primaryColor: '#505559', colors: ['#505559'], desc: 'Cast dark iron smokestack riser column.' },
  { step: 38, title: 'Dual-Tone Brass Steam Whistle', shortTitle: 'Steam Whistle', category: 'round', catLabel: 'Round', icon: '🔔', primaryColor: '#f6bb12', colors: ['#f6bb12'], desc: 'High-pressure dual-chamber brass chime whistle.' },
  { step: 39, title: 'Cab Roof Curved Slope (Left)', shortTitle: 'Roof Slope (L)', category: 'slopes', catLabel: 'Slopes', icon: '▲', primaryColor: '#505559', colors: ['#505559'], desc: 'Curved 1x4 dark grey roof slope brick (Left).' },
  { step: 40, title: 'Cab Roof Curved Slope (Right)', shortTitle: 'Roof Slope (R)', category: 'slopes', catLabel: 'Slopes', icon: '▲', primaryColor: '#505559', colors: ['#505559'], desc: 'Curved 1x4 dark grey roof slope brick (Right).' },
  { step: 41, title: 'Cab Roof Aerodynamic Center Cap', shortTitle: 'Roof Center Cap', category: 'slopes', catLabel: 'Slopes', icon: '▲', primaryColor: '#505559', colors: ['#505559'], desc: 'Central crowned roof cap with ventilation ribs.' },
  { step: 42, title: 'Flanged Smokestack Exhaust Crown', shortTitle: 'Chimney Crown', category: 'round', catLabel: 'Round', icon: '●', primaryColor: '#505559', colors: ['#505559'], desc: 'Flanged exhaust crown cap atop the smokestack.' }
];

export const STEP_METADATA = GRANULAR_STEPS_METADATA;

/**
 * Loads the local train.glb, normalizes orientation and coordinates,
 * and groups the 170 pieces into 16 sequential building steps.
 */
export function loadTrainModel(onProgress) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();

    // Support both Vite dev server and relative paths
    const modelUrl = './train.glb';

    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;

        // 1. Fix orientation: Wheels face down, train lies horizontally flat along Z rail tracks
        model.rotation.set(0, 0, 0);
        model.rotation.x = Math.PI;

        model.updateMatrixWorld(true);

        const trainGroup = new THREE.Group();
        trainGroup.name = 'trainAssemblyGroup';
        trainGroup.add(model);

        // 2. Compute Box3 and scale
        let box = new THREE.Box3().setFromObject(model);
        let size = new THREE.Vector3();
        box.getSize(size);

        const currentLength = Math.max(size.x, size.z);
        const targetLength = 11.5;
        const scale = targetLength / currentLength;
        model.scale.setScalar(scale);

        // Center on X and Z at (0, 0)
        const center = new THREE.Vector3();
        box.getCenter(center);
        model.position.x = -center.x * scale;
        model.position.z = -center.z * scale;

        // Ensure the wheels / bogie base Y sits directly flush on top of the rails (rail surface is at Y = 0.28)
        const RAIL_TOP_SURFACE_Y = 0.28;
        model.position.y = -box.min.y * scale + RAIL_TOP_SURFACE_Y;

        trainGroup.scale.set(1, 1, 1);
        trainGroup.position.set(0, 0, 0);
        trainGroup.rotation.set(0, 0, 0);
        trainGroup.updateMatrixWorld(true);
        box = new THREE.Box3().setFromObject(trainGroup);
        box.getSize(size);

        // 3. Decompose all pieces/nodes
        const pieces = [];
        const handledNodes = new Set();

        model.traverse((child) => {
          if (child.isMesh) {
            let node = child;
            if (child.parent && child.parent.name && child.parent.name.startsWith('Piece')) {
              node = child.parent;
            }
            if (!handledNodes.has(node)) {
              handledNodes.add(node);

              const nodeBox = new THREE.Box3().setFromObject(node);
              const nodeCenter = new THREE.Vector3();
              nodeBox.getCenter(nodeCenter);
              const nodeSize = new THREE.Vector3();
              nodeBox.getSize(nodeSize);

              const meshes = [];
              const matNames = new Set();
              node.traverse((c) => {
                if (c.isMesh) {
                  meshes.push(c);
                  if (c.material) {
                    if (Array.isArray(c.material)) {
                      c.material.forEach((m) => matNames.add(m.name));
                    } else {
                      matNames.add(c.material.name);
                    }
                  }
                }
              });

              pieces.push({
                node,
                name: node.name,
                meshes,
                centerY: nodeCenter.y,
                centerX: nodeCenter.x,
                centerZ: nodeCenter.z,
                sizeX: nodeSize.x,
                sizeY: nodeSize.y,
                sizeZ: nodeSize.z,
                minY: nodeBox.min.y,
                maxY: nodeBox.max.y,
                materials: Array.from(matNames)
              });
            }
          }
        });

        // 4. Sort pieces vertically from ground up (bottom to top), then along Z
        pieces.sort((a, b) => {
          if (Math.abs(a.centerY - b.centerY) > 0.28) {
            return a.centerY - b.centerY;
          }
          return a.centerZ - b.centerZ;
        });

        // 5. Partition into 42 granular building steps (stacking individual plates and blocks)
        const stepCount = GRANULAR_STEPS_METADATA.length; // 42
        const steps = [];
        let pieceOffset = 0;

        for (let i = 0; i < stepCount; i++) {
          const remainingPieces = pieces.length - pieceOffset;
          const remainingSteps = stepCount - i;
          const count = Math.max(1, Math.floor(remainingPieces / remainingSteps));
          const chunk = pieces.slice(pieceOffset, pieceOffset + count);
          pieceOffset += count;
          if (chunk.length === 0) continue;

          const stepMeta = GRANULAR_STEPS_METADATA[i] || {
            step: i + 1,
            title: `Assembly Step ${i + 1}`,
            shortTitle: `Step ${i + 1}`,
            category: 'bricks',
            catLabel: 'Bricks',
            desc: 'Interlock the next granular building brick pieces.',
            colors: ['#d91e18', '#2e3338'],
            primaryColor: '#d91e18',
            icon: '■'
          };

          const stepMeshes = [];
          chunk.forEach((p) => {
            p.meshes.forEach((m) => {
              stepMeshes.push(m);

              // Assign realistic ABS materials
              applyLegoMaterials(m, p, i / stepCount);

              // Enable shadows
              m.castShadow = true;
              m.receiveShadow = true;

              // Brick seam & edge definition with high-contrast outlines on dark parts
              const edgeLines = createLegoEdgeLines(m.geometry, m.material);
              if (edgeLines) m.add(edgeLines);

              // Tag userData for direct 3D raycast selection
              m.userData = {
                stepIndex: i,
                stepNumber: i + 1,
                pieceName: p.name,
                isTrainMesh: true
              };

              // Hide initially (to be assembled step by step)
              m.visible = false;
            });
          });

          if (i === 0) {
            // Attach wheels to bogie relative coordinate frame inside model
            const frontBogie = new THREE.Group();
            frontBogie.name = 'frontBogie';
            model.add(frontBogie);

            const leftWheel = stepMeshes[0] || new THREE.Group();
            const rightWheel = stepMeshes[1] || new THREE.Group();
            leftWheel.name = 'leftWheel';
            rightWheel.name = 'rightWheel';

            frontBogie.attach(leftWheel);
            frontBogie.attach(rightWheel);
            for (let mIdx = 2; mIdx < stepMeshes.length; mIdx++) {
              frontBogie.attach(stepMeshes[mIdx]);
            }
          } else if (i === 1) {
            // Attach wheels to rear bogie relative coordinate frame inside model
            const rearBogie = new THREE.Group();
            rearBogie.name = 'rearBogie';
            model.add(rearBogie);

            const rearLeftWheel = stepMeshes[0] || new THREE.Group();
            const rearRightWheel = stepMeshes[1] || new THREE.Group();
            rearLeftWheel.name = 'rearLeftWheel';
            rearRightWheel.name = 'rearRightWheel';

            rearBogie.attach(rearLeftWheel);
            rearBogie.attach(rearRightWheel);
            for (let mIdx = 2; mIdx < stepMeshes.length; mIdx++) {
              rearBogie.attach(stepMeshes[mIdx]);
            }
          }

          trainGroup.updateMatrixWorld(true);
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
          const isSquareOrRound = (stepMeta.category === 'round') || 
            (Math.abs(stepSize.x - stepSize.z) < 0.28) || 
            (stepMeta.icon === '●' || stepMeta.icon === '💡' || stepMeta.icon === '🔔');

          const studsX = Math.max(1, Math.round(stepSize.x / 0.8));
          const platesY = Math.max(1, Math.round(stepSize.y / 0.32));
          const studsZ = Math.max(1, Math.round(stepSize.z / 0.8));
          const dimensions = { studsX, studsZ, platesY };

          stepMeshes.forEach((m) => {
            m.userData.dimensions = { ...dimensions };
          });

          steps.push({
            step: i + 1,
            title: stepMeta.title,
            shortTitle: stepMeta.shortTitle,
            category: stepMeta.category,
            catLabel: stepMeta.catLabel,
            desc: stepMeta.desc,
            colors: stepMeta.colors,
            primaryColor: stepMeta.primaryColor,
            quantity: chunk.length,
            icon: stepMeta.icon,
            pieces: chunk,
            meshes: stepMeshes,
            meshCount: stepMeshes.length,
            pieceCount: chunk.length,
            mountPos,
            box: stepBox,
            targetRotationY,
            rotationBakedIn: true,
            isSquareOrRound,
            stepSize,
            dimensions
          });
        }

        // Chimney smoke emitter position
        const chimneyPos = new THREE.Vector3(0, 8.58, 1.18);

        resolve({
          trainGroup,
          trainAssemblyGroup: trainGroup,
          model,
          box,
          size,
          chimneyPos,
          steps,
          stepCount: steps.length,
          totalSteps: steps.length,
          stages: TRAIN_ASSEMBLY_STAGES,
          name: 'Steam Locomotive Workshop',
          icon: '🚂',
          scale
        });
      },
      (xhr) => {
        if (onProgress && xhr.total) {
          const percent = Math.round((xhr.loaded / xhr.total) * 100);
          onProgress(percent);
        }
      },
      (error) => {
        console.error('Error loading train.glb:', error);
        reject(error);
      }
    );
  });
}

function applyLegoMaterials(mesh, piece, heightFraction) {
  const origMatName = mesh.material?.name || (Array.isArray(mesh.material) ? mesh.material[0]?.name : '');

  // Transparent windows
  if (
    origMatName.includes('Trans_') ||
    origMatName === 'Trans_Medium_Blue' ||
    piece.materials.some((m) => m.includes('Trans_'))
  ) {
    assignMat(mesh, MAT_WINDOW_GLASS.clone());
    return;
  }

  // Magnetic couplers
  if (origMatName === 'Magnet' || piece.materials.includes('Magnet')) {
    assignMat(mesh, MAT_MAGNET.clone());
    return;
  }

  // Wheels and alloy rims
  if (origMatName === 'Electric_Contact_Alloy' || piece.materials.includes('Electric_Contact_Alloy')) {
    assignMat(mesh, MAT_ALLOY_RIM.clone());
    return;
  }

  // Yellow trim
  if (origMatName === 'Yellow' || piece.materials.includes('Yellow')) {
    assignMat(mesh, MAT_YELLOW_ACCENT.clone());
    return;
  }

  // Vertical layering for other plastic parts
  if (heightFraction <= 0.22) {
    assignMat(mesh, MAT_WHEELS.clone());
  } else if (heightFraction <= 0.78) {
    if (origMatName === 'Black') {
      assignMat(mesh, MAT_CHASSIS_DARK.clone());
    } else {
      assignMat(mesh, MAT_BODY_RED.clone());
    }
  } else {
    assignMat(mesh, MAT_ROOF_GREY.clone());
  }
}

function assignMat(mesh, mat) {
  if (Array.isArray(mesh.material)) {
    mesh.material = mesh.material.map(() => mat);
  } else {
    mesh.material = mat;
  }
}

/**
 * Creates a glowing semi-transparent holographic ghost preview for a specific step
 * Includes an animated mount ring and downward-pointing holographic indicator arrow.
 */
export function createGhostStepPreview(stepData, trainGroup) {
  const ghostGroup = new THREE.Group();
  ghostGroup.name = 'step-ghost-preview';
  ghostGroup.userData = {
    isGhostStepGroup: true,
    stepIndex: stepData.step - 1,
    step: stepData.step
  };

  const ghostMaterial = new THREE.MeshStandardMaterial({
    color: 0x00f0ff, // Vibrant holographic cyan
    emissive: 0x00a8e8,
    emissiveIntensity: 0.5,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.55,
    depthWrite: false
  });

  trainGroup.updateMatrixWorld(true);
  const invTrainMatrix = trainGroup.matrixWorld.clone().invert();

  stepData.meshes.forEach((origMesh) => {
    origMesh.updateMatrixWorld(true);
    const ghostMesh = new THREE.Mesh(origMesh.geometry, ghostMaterial);

    const relMatrix = new THREE.Matrix4().multiplyMatrices(invTrainMatrix, origMesh.matrixWorld);
    relMatrix.decompose(ghostMesh.position, ghostMesh.quaternion, ghostMesh.scale);
    ghostMesh.userData = {
      isGhostStepPart: true,
      targetMesh: origMesh,
      step: stepData.step,
      stepIndex: stepData.step - 1
    };

    ghostGroup.add(ghostMesh);
  });

  // Dynamic snap feedback for optional step preview: subtle color tinting
  ghostGroup.userData.setGhostState = (canSnap) => {
    ghostGroup.traverse((child) => {
      if (child.isMesh && child.userData?.isGhostStepPart) {
        if (canSnap) {
          child.material.color.setHex(0x00ff88);
          child.material.emissive.setHex(0x00ff88);
          child.material.emissiveIntensity = 0.85;
          child.material.opacity = 0.72;
        } else {
          child.material.color.setHex(0x00d4ff);
          child.material.emissive.setHex(0x00a8e8);
          child.material.emissiveIntensity = 0.45;
          child.material.opacity = 0.48;
        }
      }
    });
  };

  return ghostGroup;
}
