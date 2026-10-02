import * as THREE from 'three';
import { loadTrainModel, createBrickEdgeLines } from '../trainLoader.js';
import { loadBoatModel, BOAT_ASSEMBLY_STAGES } from '../boatLoader.js';
import { loadHouseModel, HOUSE_ASSEMBLY_STAGES } from '../houseLoader.js';
import { loadBuggyCarModel, BUGGY_CAR_ASSEMBLY_STAGES } from '../buggyLoader.js';
import { loadPlaneModel, PLANE_ASSEMBLY_STAGES } from '../planeLoader.js';
import { loadAeroplaneModel, AEROPLANE_ASSEMBLY_STAGES } from '../aeroplaneLoader.js';
import { loadHelicopterModel, HELICOPTER_ASSEMBLY_STAGES } from '../helicopterLoader.js';
import { loadCafeModel, CAFE_ASSEMBLY_STAGES } from '../cafeLoader.js';

// LeoCAD standard LEGO metrics
const STUD_PITCH = 0.8;
const PLATE_HEIGHT = 0.32;
const BRICK_HEIGHT = 0.96;

// Shared ABS Plastic Materials
const MAT_RED = new THREE.MeshPhysicalMaterial({ color: 0xd91e18, roughness: 0.24, clearcoat: 0.45, clearcoatRoughness: 0.15 });
const MAT_BLUE = new THREE.MeshPhysicalMaterial({ color: 0x0284c7, roughness: 0.24, clearcoat: 0.45, clearcoatRoughness: 0.15 });
const MAT_YELLOW = new THREE.MeshPhysicalMaterial({ color: 0xfacc15, roughness: 0.24, clearcoat: 0.45, clearcoatRoughness: 0.15 });
const MAT_WHITE = new THREE.MeshPhysicalMaterial({ color: 0xf8fafc, roughness: 0.22, clearcoat: 0.5, clearcoatRoughness: 0.12 });
const MAT_DARK = new THREE.MeshPhysicalMaterial({ color: 0x2e3338, roughness: 0.3, clearcoat: 0.4, clearcoatRoughness: 0.2 });
const MAT_GREY = new THREE.MeshPhysicalMaterial({ color: 0x64748b, roughness: 0.28, clearcoat: 0.38, clearcoatRoughness: 0.18 });
const MAT_ORANGE = new THREE.MeshPhysicalMaterial({ color: 0xea580c, roughness: 0.24, clearcoat: 0.45, clearcoatRoughness: 0.15 });
const MAT_GREEN = new THREE.MeshPhysicalMaterial({ color: 0x16a34a, roughness: 0.24, clearcoat: 0.45, clearcoatRoughness: 0.15 });
const MAT_PURPLE = new THREE.MeshPhysicalMaterial({ color: 0x8b5cf6, roughness: 0.24, clearcoat: 0.45, clearcoatRoughness: 0.15 });
const MAT_GLASS_CYAN = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.08, transparent: true, opacity: 0.65, depthWrite: false });
const MAT_GLASS_ORANGE = new THREE.MeshStandardMaterial({ color: 0xfb923c, roughness: 0.08, transparent: true, opacity: 0.75, depthWrite: false });
const MAT_TIRE = new THREE.MeshPhysicalMaterial({ color: 0x18181b, roughness: 0.65, metalness: 0.05 });
const MAT_GOLD = new THREE.MeshPhysicalMaterial({ color: 0xf59e0b, roughness: 0.18, metalness: 0.65, clearcoat: 0.6 });

/**
 * Standard Stud Generator
 */
function createStuds(studCountX, studCountZ, material) {
  const studGroup = new THREE.Group();
  const radius = 0.24;
  const height = 0.16;
  const studGeom = new THREE.CylinderGeometry(radius, radius, height, 16);

  const startX = -((studCountX - 1) * STUD_PITCH) / 2;
  const startZ = -((studCountZ - 1) * STUD_PITCH) / 2;

  for (let x = 0; x < studCountX; x++) {
    for (let z = 0; z < studCountZ; z++) {
      const stud = new THREE.Mesh(studGeom, material);
      stud.position.set(startX + x * STUD_PITCH, height / 2, startZ + z * STUD_PITCH);
      stud.castShadow = true;
      stud.receiveShadow = true;
      studGroup.add(stud);
    }
  }
  return studGroup;
}

/**
 * Standard Brick Builder (with studs and edge lines)
 */
function createLegoBrick(studsX, studsZ, heightType = 'brick', material = MAT_RED) {
  const group = new THREE.Group();
  const width = studsX * STUD_PITCH;
  const depth = studsZ * STUD_PITCH;
  const height = heightType === 'plate' ? PLATE_HEIGHT : BRICK_HEIGHT;

  const boxGeom = new THREE.BoxGeometry(width - 0.02, height, depth - 0.02);
  const body = new THREE.Mesh(boxGeom, material);
  body.position.y = height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const edges = createBrickEdgeLines(boxGeom, material);
  if (edges) {
    edges.position.copy(body.position);
    group.add(edges);
  }

  // Add studs on top
  const studs = createStuds(studsX, studsZ, material);
  studs.position.y = height;
  group.add(studs);

  return group;
}

/**
 * Procedural Space Rocket Builder
 */
function buildCosmicRocketModel() {
  const modelGroup = new THREE.Group();
  modelGroup.name = 'rocketAssemblyGroup';
  const steps = [];

  const addStep = (name, shortTitle, category, icon, color, createMeshFn, desc) => {
    const mesh = createMeshFn();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    modelGroup.add(mesh);

    const stepIndex = steps.length;
    steps.push({
      step: stepIndex + 1,
      name,
      title: name,
      shortTitle,
      category,
      icon,
      primaryColor: color,
      colors: [color],
      desc,
      mesh,
      targetPosition: mesh.position.clone(),
      targetRotation: mesh.rotation.clone()
    });
  };

  // Step 1: Heavy Rocket Base Engine Booster Core
  addStep('Rocket Launch Base & Exhaust Nozzles', 'Launch Base', 'plates', '🚀', '#2e3338', () => {
    const g = new THREE.Group();
    const base = createLegoBrick(6, 6, 'plate', MAT_DARK);
    base.position.set(0, 0.28, 0);
    g.add(base);

    // 4 rocket thrusters
    const nozzGeom = new THREE.CylinderGeometry(0.35, 0.55, 0.6, 16);
    const nozzMat = MAT_DARK;
    [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]].forEach(([nx, nz]) => {
      const nozz = new THREE.Mesh(nozzGeom, nozzMat);
      nozz.position.set(nx, 0.1, nz);
      g.add(nozz);
    });
    return g;
  }, 'Heavy heat-shield base plate with 4 high-thrust rocket engine bells.');

  // Step 2: Lower Stage-1 Booster Fuel Tank
  addStep('Stage-1 White Booster Fuel Tank', 'Booster Tank 1', 'bricks', '⛽', '#f8fafc', () => {
    const g = new THREE.Group();
    const tank = createLegoBrick(4, 4, 'brick', MAT_WHITE);
    tank.position.set(0, 0.28 + PLATE_HEIGHT, 0);
    g.add(tank);
    return g;
  }, 'Primary liquid oxygen propellant cylinder tank.');

  // Step 3: Dual Aerodynamic Stabilizer Fins
  addStep('Left & Right Aerodynamic Stabilizer Fins', 'Stabilizer Fins', 'slopes', '📐', '#d91e18', () => {
    const g = new THREE.Group();
    const leftFin = createLegoBrick(2, 4, 'brick', MAT_RED);
    leftFin.position.set(-2.4, 0.28 + PLATE_HEIGHT, 0);
    leftFin.rotation.z = Math.PI / 8;
    g.add(leftFin);

    const rightFin = createLegoBrick(2, 4, 'brick', MAT_RED);
    rightFin.position.set(2.4, 0.28 + PLATE_HEIGHT, 0);
    rightFin.rotation.z = -Math.PI / 8;
    g.add(rightFin);
    return g;
  }, 'High-altitude titanium fins for aerodynamic vector stabilization.');

  // Step 4: Mid-Stage Interstage Ring
  addStep('Mid-Stage Interstage Coupling Ring', 'Interstage Ring', 'plates', '⚡', '#ea580c', () => {
    const g = new THREE.Group();
    const ring = createLegoBrick(4, 4, 'plate', MAT_ORANGE);
    ring.position.set(0, 0.28 + PLATE_HEIGHT + BRICK_HEIGHT, 0);
    g.add(ring);
    return g;
  }, 'High-visibility safety orange stage separation ring.');

  // Step 5: Stage-2 Avionics Guidance Tank
  addStep('Stage-2 Blue Avionics Guidance Tank', 'Avionics Tank', 'bricks', '🛰️', '#0284c7', () => {
    const g = new THREE.Group();
    const tank = createLegoBrick(4, 4, 'brick', MAT_BLUE);
    tank.position.set(0, 0.28 + PLATE_HEIGHT * 2 + BRICK_HEIGHT, 0);
    g.add(tank);
    return g;
  }, 'Computer guidance flight computer and telemetry section.');

  // Step 6: Astronaut Crew Capsule Cockpit
  addStep('Astronaut Crew Capsule Cockpit', 'Crew Capsule', 'special', '👨‍🚀', '#f8fafc', () => {
    const g = new THREE.Group();
    const cap = createLegoBrick(3, 3, 'brick', MAT_WHITE);
    cap.position.set(0, 0.28 + PLATE_HEIGHT * 2 + BRICK_HEIGHT * 2, 0);
    g.add(cap);

    // Panoramic view canopy
    const glassGeom = new THREE.SphereGeometry(0.7, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const glass = new THREE.Mesh(glassGeom, MAT_GLASS_CYAN);
    glass.position.set(0, 0.28 + PLATE_HEIGHT * 2 + BRICK_HEIGHT * 3, 0);
    g.add(glass);
    return g;
  }, 'Pressurized two-astronaut crew cabin with reinforced glass viewport.');

  // Step 7: Aerodynamic Nose Cone & Escape Tower
  addStep('Aerodynamic Nose Cone & Escape Tower', 'Nose Cone', 'round', '✨', '#d91e18', () => {
    const g = new THREE.Group();
    const coneGeom = new THREE.ConeGeometry(1.2, 1.6, 16);
    const cone = new THREE.Mesh(coneGeom, MAT_RED);
    cone.position.set(0, 0.28 + PLATE_HEIGHT * 2 + BRICK_HEIGHT * 3 + 1.2, 0);
    g.add(cone);

    const needleGeom = new THREE.CylinderGeometry(0.08, 0.12, 1.4, 8);
    const needle = new THREE.Mesh(needleGeom, MAT_GOLD);
    needle.position.set(0, 0.28 + PLATE_HEIGHT * 2 + BRICK_HEIGHT * 3 + 2.5, 0);
    g.add(needle);
    return g;
  }, 'Supersonic nose fairing with abort rescue launch tower.');

  return { modelGroup, steps };
}

/**
 * Procedural City Fire Engine Builder
 */
function buildFireTruckModel() {
  const modelGroup = new THREE.Group();
  modelGroup.name = 'fireTruckAssemblyGroup';
  const steps = [];

  const addStep = (name, shortTitle, category, icon, color, createMeshFn, desc) => {
    const mesh = createMeshFn();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    modelGroup.add(mesh);

    const stepIndex = steps.length;
    steps.push({
      step: stepIndex + 1,
      name,
      title: name,
      shortTitle,
      category,
      icon,
      primaryColor: color,
      colors: [color],
      desc,
      mesh,
      targetPosition: mesh.position.clone(),
      targetRotation: mesh.rotation.clone()
    });
  };

  // Step 1: Heavy-Duty 6-Wheel Chassis Frame
  addStep('Heavy-Duty 6-Wheel Chassis Frame', 'Chassis Frame', 'wheels', '⚙️', '#2e3338', () => {
    const g = new THREE.Group();
    const chassis = createLegoBrick(8, 4, 'plate', MAT_DARK);
    chassis.position.set(0, 0.52, 0);
    g.add(chassis);

    // 6 wheels
    const wheelGeom = new THREE.CylinderGeometry(0.38, 0.38, 0.32, 16);
    wheelGeom.rotateZ(Math.PI / 2);
    const zCoords = [-1.8, 0, 1.8];
    zCoords.forEach((z) => {
      const wL = new THREE.Mesh(wheelGeom, MAT_TIRE);
      wL.position.set(-1.8, 0.38, z);
      g.add(wL);
      const wR = new THREE.Mesh(wheelGeom, MAT_TIRE);
      wR.position.set(1.8, 0.38, z);
      g.add(wR);
    });
    return g;
  }, 'Reinforced steel chassis with 6 all-terrain emergency response tires.');

  // Step 2: Front Bumper & Dual Foglights
  addStep('Front Chrome Bumper & Foglights', 'Front Bumper', 'plates', '💡', '#facc15', () => {
    const g = new THREE.Group();
    const bumper = createLegoBrick(4, 1, 'plate', MAT_GREY);
    bumper.position.set(0, 0.52, -3.4);
    g.add(bumper);

    const lightGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 12);
    lightGeom.rotateX(Math.PI / 2);
    const l1 = new THREE.Mesh(lightGeom, MAT_YELLOW);
    l1.position.set(-1.0, 0.52, -3.6);
    g.add(l1);
    const l2 = new THREE.Mesh(lightGeom, MAT_YELLOW);
    l2.position.set(1.0, 0.52, -3.6);
    g.add(l2);
    return g;
  }, 'Impact bumper with dual high-intensity foglights.');

  // Step 3: Driver Cabin Lower Red Walls
  addStep('Driver Cabin Lower Red Body', 'Cab Body', 'bricks', '🚒', '#d91e18', () => {
    const g = new THREE.Group();
    const cab = createLegoBrick(4, 4, 'brick', MAT_RED);
    cab.position.set(0, 0.52 + PLATE_HEIGHT, -1.6);
    g.add(cab);
    return g;
  }, 'Fire truck cab foundation block with side entry doors.');

  // Step 4: Panoramic Windshield & Blue Sirens
  addStep('Panoramic Windshield & Dual Sirens', 'Windshield & Sirens', 'special', '🚨', '#0284c7', () => {
    const g = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.8, 1.4), MAT_GLASS_CYAN);
    glass.position.set(0, 0.52 + PLATE_HEIGHT + BRICK_HEIGHT + 0.4, -1.6);
    g.add(glass);

    // Dual blue flashers
    const sirenGeom = new THREE.CylinderGeometry(0.18, 0.22, 0.28, 12);
    const s1 = new THREE.Mesh(sirenGeom, MAT_BLUE);
    s1.position.set(-1.1, 0.52 + PLATE_HEIGHT + BRICK_HEIGHT + 1.0, -1.6);
    g.add(s1);
    const s2 = new THREE.Mesh(sirenGeom, MAT_RED);
    s2.position.set(1.1, 0.52 + PLATE_HEIGHT + BRICK_HEIGHT + 1.0, -1.6);
    g.add(s2);
    return g;
  }, 'Clear polycarbonate windshield with flashing emergency beacons.');

  // Step 5: Rear Equipment Box & Hose Bay
  addStep('Rear Equipment Locker & Water Tank', 'Water Tank', 'bricks', '💧', '#d91e18', () => {
    const g = new THREE.Group();
    const tank = createLegoBrick(4, 4, 'brick', MAT_RED);
    tank.position.set(0, 0.52 + PLATE_HEIGHT, 1.6);
    g.add(tank);

    // Yellow stripe
    const stripe = createLegoBrick(4, 4, 'plate', MAT_YELLOW);
    stripe.position.set(0, 0.52 + PLATE_HEIGHT + BRICK_HEIGHT, 1.6);
    g.add(stripe);
    return g;
  }, '1,000-liter pressurized water tank and tool storage bay.');

  // Step 6: 360° Extendable Rescue Ladder Turntable
  addStep('360° Extendable Rescue Ladder Turntable', 'Rescue Ladder', 'special', '🪜', '#f8fafc', () => {
    const g = new THREE.Group();
    const base = createLegoBrick(2, 2, 'plate', MAT_DARK);
    base.position.set(0, 0.52 + PLATE_HEIGHT * 2 + BRICK_HEIGHT, 1.6);
    g.add(base);

    // Ladder beam
    const ladderGeom = new THREE.BoxGeometry(0.8, 0.25, 4.8);
    const ladder = new THREE.Mesh(ladderGeom, MAT_WHITE);
    ladder.position.set(0, 0.52 + PLATE_HEIGHT * 2 + BRICK_HEIGHT + 0.6, 1.2);
    ladder.rotation.x = -Math.PI / 12;
    g.add(ladder);
    return g;
  }, 'High-reach aerial rescue ladder with swivel turntable.');

  return { modelGroup, steps };
}

/**
 * Procedural Rainbow Castle Builder
 */
function buildRainbowCastleModel() {
  const modelGroup = new THREE.Group();
  modelGroup.name = 'castleAssemblyGroup';
  const steps = [];

  const addStep = (name, shortTitle, category, icon, color, createMeshFn, desc) => {
    const mesh = createMeshFn();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    modelGroup.add(mesh);

    const stepIndex = steps.length;
    steps.push({
      step: stepIndex + 1,
      name,
      title: name,
      shortTitle,
      category,
      icon,
      primaryColor: color,
      colors: [color],
      desc,
      mesh,
      targetPosition: mesh.position.clone(),
      targetRotation: mesh.rotation.clone()
    });
  };

  // Step 1: Castle Moat Foundation Baseplate
  addStep('Castle Moat Foundation Baseplate', 'Moat Base', 'plates', '🏰', '#0284c7', () => {
    const g = new THREE.Group();
    const base = createLegoBrick(8, 8, 'plate', MAT_BLUE);
    base.position.set(0, 0.28, 0);
    g.add(base);
    return g;
  }, 'Deep moat water foundation plate.');

  // Step 2: Main Courtyard Cobblestone Foundation
  addStep('Main Courtyard Cobblestone Deck', 'Courtyard Floor', 'plates', '🧱', '#64748b', () => {
    const g = new THREE.Group();
    const floor = createLegoBrick(6, 6, 'plate', MAT_GREY);
    floor.position.set(0, 0.28 + PLATE_HEIGHT, 0);
    g.add(floor);
    return g;
  }, 'Smooth stone flagstone courtyard floor.');

  // Step 3: Gatehouse Archway & Portcullis Pillars
  addStep('Gatehouse Archway & Portcullis Pillars', 'Gatehouse Arch', 'bricks', '🚪', '#f8fafc', () => {
    const g = new THREE.Group();
    const leftPillar = createLegoBrick(2, 2, 'brick', MAT_WHITE);
    leftPillar.position.set(-1.8, 0.28 + PLATE_HEIGHT * 2, -1.8);
    g.add(leftPillar);

    const rightPillar = createLegoBrick(2, 2, 'brick', MAT_WHITE);
    rightPillar.position.set(1.8, 0.28 + PLATE_HEIGHT * 2, -1.8);
    g.add(rightPillar);

    const archBeam = createLegoBrick(6, 2, 'plate', MAT_GOLD);
    archBeam.position.set(0, 0.28 + PLATE_HEIGHT * 2 + BRICK_HEIGHT, -1.8);
    g.add(archBeam);
    return g;
  }, 'Reinforced marble pillars with golden reinforced gate arch.');

  // Step 4: Twin Defensive Watchtowers
  addStep('Twin Left & Right Defensive Watchtowers', 'Twin Watchtowers', 'round', '🗼', '#facc15', () => {
    const g = new THREE.Group();
    const towerL = createLegoBrick(2, 2, 'brick', MAT_YELLOW);
    towerL.position.set(-1.8, 0.28 + PLATE_HEIGHT * 2, 1.8);
    g.add(towerL);

    const towerR = createLegoBrick(2, 2, 'brick', MAT_YELLOW);
    towerR.position.set(1.8, 0.28 + PLATE_HEIGHT * 2, 1.8);
    g.add(towerR);
    return g;
  }, 'Twin lookout watchtowers with arrow-slit embrasures.');

  // Step 5: Royal Great Hall Central Keep
  addStep('Royal Great Hall Central Keep', 'Central Keep', 'bricks', '👑', '#8b5cf6', () => {
    const g = new THREE.Group();
    const keep = createLegoBrick(4, 4, 'brick', MAT_PURPLE);
    keep.position.set(0, 0.28 + PLATE_HEIGHT * 3 + BRICK_HEIGHT, 0);
    g.add(keep);
    return g;
  }, 'The majestic throne room and sovereign keep.');

  // Step 6: Conical Tower Spires & Royal Banners
  addStep('Conical Tower Spires & Royal Banners', 'Castle Spires', 'slopes', '🚩', '#d91e18', () => {
    const g = new THREE.Group();
    const spireGeom = new THREE.ConeGeometry(0.9, 1.8, 16);
    const spire1 = new THREE.Mesh(spireGeom, MAT_RED);
    spire1.position.set(-1.8, 0.28 + PLATE_HEIGHT * 3 + BRICK_HEIGHT * 2, 1.8);
    g.add(spire1);

    const spire2 = new THREE.Mesh(spireGeom, MAT_RED);
    spire2.position.set(1.8, 0.28 + PLATE_HEIGHT * 3 + BRICK_HEIGHT * 2, 1.8);
    g.add(spire2);

    const spireCenter = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.2, 16), MAT_BLUE);
    spireCenter.position.set(0, 0.28 + PLATE_HEIGHT * 3 + BRICK_HEIGHT * 2 + 1.1, 0);
    g.add(spireCenter);
    return g;
  }, 'Sky-blue grand conical roof spires crowned with pennant flags.');

  return { modelGroup, steps };
}

/**
 * Model Blueprints Catalog Registry
 */
export const MODEL_BLUEPRINTS = [
  {
    id: 'train',
    name: 'Steam Locomotive Workshop',
    shortName: 'Steam Train',
    icon: '🚂',
    badge: '42 Steps',
    difficulty: 'Master',
    brickCount: 170,
    category: 'Vehicles',
    desc: 'Classic red and dark-slate heavy freight steam locomotive with alloy wheels, cabin throttle, and brass whistle.',
    source: 'glb',
    loadFn: (onProgress) => loadTrainModel(onProgress)
  },
  {
    id: 'boat',
    name: 'Speedboat Adventure',
    shortName: 'Speedboat',
    icon: '🚤',
    badge: '4 Bags • 28 Parts',
    difficulty: 'Intermediate',
    brickCount: 28,
    category: 'Marine',
    desc: 'High-speed marine speedboat with hydrodynamic red and white hull, aerodynamic cyan windshield, and outboard motor.',
    source: 'glb',
    path: './public/assets/boat.glb',
    loadFn: (onProgress) => loadBoatModel(onProgress)
  },
  {
    id: 'housetree',
    name: 'Cozy House & Tree',
    shortName: 'House & Tree',
    icon: '🏡',
    badge: '4 Bags • 196 Parts',
    difficulty: 'Advanced',
    brickCount: 196,
    category: 'Architecture',
    desc: 'Charming garden cottage with red tiled gable roof, sunny windows, white picket fence, and a lush leafy shade tree.',
    source: 'glb',
    path: './public/assets/housetree.glb',
    loadFn: (onProgress) => loadHouseModel(onProgress)
  },
  {
    id: 'buggy_car',
    name: 'Buggy Car Workshop',
    shortName: 'Buggy Car',
    icon: '🏎️',
    badge: '4 Bags • 22 Pieces',
    difficulty: 'Easy',
    brickCount: 22,
    category: 'Vehicles',
    desc: 'A sporty red buggy with a sturdy chassis, cockpit details, silver rims, and chunky rubber tires.',
    source: 'glb',
    path: './assets/buggy_car.glb',
    stages: BUGGY_CAR_ASSEMBLY_STAGES,
    loadFn: (onProgress) => loadBuggyCarModel(onProgress)
  },
  {
    id: 'plane',
    name: 'Sky High! Propeller Plane',
    shortName: 'Propeller Plane',
    icon: '✈️',
    badge: '4 Bags • 80 Parts',
    difficulty: 'Intermediate',
    brickCount: 80,
    category: 'Aviation',
    desc: 'Classic dual-color aerobatic propeller airplane with spinning rotor, transparent cockpit canopy, sturdy landing gear, and high-visibility wingtip navigation beacons.',
    source: 'glb',
    path: './public/assets/mini_plane.glb',
    stages: PLANE_ASSEMBLY_STAGES,
    loadFn: (onProgress) => loadPlaneModel(onProgress)
  },
  {
    id: 'aeroplane',
    name: 'Commercial Airliner Jet',
    shortName: 'Aero Plane',
    icon: '✈️',
    badge: '4 Bags • 126 Parts',
    difficulty: 'Advanced',
    brickCount: 126,
    category: 'Aviation',
    desc: 'Full-scale commercial passenger airliner with high-thrust twin jet turbofan nacelles, passenger cabin windows, cockpit flight deck, and rear vertical stabilizer fin.',
    source: 'glb',
    path: './public/assets/aeroplane.glb',
    stages: AEROPLANE_ASSEMBLY_STAGES,
    loadFn: (onProgress) => loadAeroplaneModel(onProgress)
  },
  {
    id: 'helicopter',
    name: 'Sky Rescue Helicopter',
    shortName: 'Helicopter',
    icon: '🚁',
    badge: '4 Bags • 59 Parts',
    difficulty: 'Intermediate',
    brickCount: 59,
    category: 'Aviation',
    desc: 'High-visibility emergency rescue helicopter with shock-absorbing landing skids, forward searchlights, rear counter-torque tail rotor, and rotating twin main rotor blades.',
    source: 'glb',
    path: './public/assets/helicopter.glb',
    stages: HELICOPTER_ASSEMBLY_STAGES,
    loadFn: (onProgress) => loadHelicopterModel(onProgress)
  },
  {
    id: 'small_cafe',
    name: 'Corner Street Café',
    shortName: 'Corner Café',
    icon: '☕',
    badge: '4 Bags • 162 Parts',
    difficulty: 'Master',
    brickCount: 162,
    category: 'Architecture',
    desc: 'Two-storey Parisian corner street café with outdoor bistro seating, striped sun awning, espresso bar, and panoramic picture windows.',
    source: 'glb',
    path: './public/assets/SMALL_CAFE.glb',
    stages: CAFE_ASSEMBLY_STAGES,
    loadFn: (onProgress) => loadCafeModel(onProgress)
  },
  {
    id: 'rocket',
    name: 'Cosmic Explorer Rocket',
    shortName: 'Space Rocket',
    icon: '🚀',
    badge: '7 Stages',
    difficulty: 'Intermediate',
    brickCount: 58,
    category: 'Space',
    desc: 'Multi-stage exploration spacecraft with 4 booster engines, guidance avionics, and crew cockpit canopy.',
    source: 'procedural',
    loadFn: (onProgress) => {
      return new Promise((resolve) => {
        if (onProgress) onProgress(100);
        const { modelGroup, steps } = buildCosmicRocketModel();
        resolve({
          trainGroup: modelGroup,
          trainAssemblyGroup: modelGroup,
          steps,
          stepMeshes: steps.map((s) => s.mesh),
          totalSteps: steps.length,
          name: 'Cosmic Explorer Rocket',
          icon: '🚀'
        });
      });
    }
  },
  {
    id: 'firetruck',
    name: 'City Rescue Fire Engine',
    shortName: 'Fire Engine',
    icon: '🚒',
    badge: '6 Stages',
    difficulty: 'Easy',
    brickCount: 48,
    category: 'City',
    desc: 'Heavy emergency response truck with 6 all-terrain wheels, panoramic cab, dual sirens, and 360° extendable rescue ladder.',
    source: 'procedural',
    loadFn: (onProgress) => {
      return new Promise((resolve) => {
        if (onProgress) onProgress(100);
        const { modelGroup, steps } = buildFireTruckModel();
        resolve({
          trainGroup: modelGroup,
          trainAssemblyGroup: modelGroup,
          steps,
          stepMeshes: steps.map((s) => s.mesh),
          totalSteps: steps.length,
          name: 'City Rescue Fire Engine',
          icon: '🚒'
        });
      });
    }
  },
  {
    id: 'castle',
    name: 'Rainbow Kingdom Castle',
    shortName: 'Rainbow Castle',
    icon: '🏰',
    badge: '6 Stages',
    difficulty: 'Intermediate',
    brickCount: 94,
    category: 'Fantasy',
    desc: 'Enchanted fortress with deep moat water foundation, portcullis pillars, royal keep, and grand spires.',
    source: 'procedural',
    loadFn: (onProgress) => {
      return new Promise((resolve) => {
        if (onProgress) onProgress(100);
        const { modelGroup, steps } = buildRainbowCastleModel();
        resolve({
          trainGroup: modelGroup,
          trainAssemblyGroup: modelGroup,
          steps,
          stepMeshes: steps.map((s) => s.mesh),
          totalSteps: steps.length,
          name: 'Rainbow Kingdom Castle',
          icon: '🏰'
        });
      });
    }
  }
];

/**
 * Universal Model Loader
 */
export function loadModelById(modelId = 'train', onProgress) {
  const bp = MODEL_BLUEPRINTS.find((m) => m.id === modelId) || MODEL_BLUEPRINTS[0];
  return bp.loadFn(onProgress);
}

export const MODEL_CONFIGS = MODEL_BLUEPRINTS;
