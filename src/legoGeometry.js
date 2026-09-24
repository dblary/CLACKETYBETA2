import * as THREE from 'three';

// Curated authentic LEGO color palette
export const LEGO_COLORS = {
  red: { name: 'Fire Red', hex: '#d91e18', threeHex: 0xd91e18 },
  blue: { name: 'Bright Blue', hex: '#0055bf', threeHex: 0x0055bf },
  yellow: { name: 'Bright Yellow', hex: '#f6bb12', threeHex: 0xf6bb12 },
  green: { name: 'Bright Green', hex: '#237841', threeHex: 0x237841 },
  white: { name: 'Classic White', hex: '#f4f5f8', threeHex: 0xf4f5f8 },
  black: { name: 'Jet Black', hex: '#1b2a34', threeHex: 0x1b2a34 },
  orange: { name: 'Sun Orange', hex: '#fa8020', threeHex: 0xfa8020 },
  purple: { name: 'Magic Purple', hex: '#8a2be2', threeHex: 0x8a2be2 },
  lime: { name: 'Lime Green', hex: '#9aca3a', threeHex: 0x9aca3a }
};

// Reusable standard stud geometry
const STUD_RADIUS = 0.3;
const STUD_HEIGHT = 0.18;
const studGeom = new THREE.CylinderGeometry(STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 16);

/**
 * Creates an ABS toy plastic material with specified color
 */
export function createPlasticMaterial(colorHex, isGhost = false, isValid = true) {
  if (isGhost) {
    return new THREE.MeshStandardMaterial({
      color: isValid ? colorHex : 0xff3333,
      roughness: 0.2,
      metalness: 0.0,
      transparent: true,
      opacity: isValid ? 0.65 : 0.45,
      depthWrite: false
    });
  }

  return new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.25,
    metalness: 0.0,
    shadowSide: THREE.FrontSide
  });
}

// Rubber tire material
const tireMaterial = new THREE.MeshStandardMaterial({
  color: 0x181818,
  roughness: 0.8,
  metalness: 0.1
});

// Wheel rim material
const rimMaterial = new THREE.MeshStandardMaterial({
  color: 0xe0e0e0,
  roughness: 0.3,
  metalness: 0.1
});

/**
 * Brick Definitions:
 * - 2x4 Brick: 2x4 studs, 1.2 height
 * - 2x2 Brick: 2x2 studs, 1.2 height
 * - 1x2 Plate: 1x2 studs, 0.4 height
 * - Slope Roof: 2x2 wedge, 1.2 height
 * - Wheel Axle: Chassis with 2 rolling wheels
 */
export const BRICK_TYPES = {
  'brick-2x4': {
    name: '2x4 Brick',
    width: 2.0,
    length: 4.0,
    height: 1.2,
    icon: '🧱',
    createMesh: (mat) => createBrick2x4(mat)
  },
  'brick-2x2': {
    name: '2x2 Brick',
    width: 2.0,
    length: 2.0,
    height: 1.2,
    icon: '⏹️',
    createMesh: (mat) => createBrick2x2(mat)
  },
  'plate-1x2': {
    name: '1x2 Plate',
    width: 1.0,
    length: 2.0,
    height: 0.4,
    icon: '➖',
    createMesh: (mat) => createPlate1x2(mat)
  },
  'slope-roof': {
    name: 'Slope Roof',
    width: 2.0,
    length: 2.0,
    height: 1.2,
    icon: '📐',
    createMesh: (mat) => createSlopeRoof(mat)
  },
  'wheel-axle': {
    name: 'Wheel Axle',
    width: 2.6,
    length: 2.0,
    height: 1.2,
    icon: '🚜',
    createMesh: (mat) => createWheelAxle(mat)
  }
};

/**
 * 2x4 Standard Brick
 */
function createBrick2x4(material) {
  const group = new THREE.Group();

  // Main body: 2 wide (X), 1.2 high (Y), 4 long (Z)
  const bodyGeom = new THREE.BoxGeometry(2.0, 1.2, 4.0);
  const body = new THREE.Mesh(bodyGeom, material);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // 8 Studs on top (Y = +0.6 + 0.09 = 0.69)
  const topY = 0.6 + STUD_HEIGHT / 2;
  const xOffsets = [-0.5, 0.5];
  const zOffsets = [-1.5, -0.5, 0.5, 1.5];

  xOffsets.forEach(x => {
    zOffsets.forEach(z => {
      const stud = new THREE.Mesh(studGeom, material);
      stud.position.set(x, topY, z);
      stud.castShadow = true;
      stud.receiveShadow = true;
      group.add(stud);
    });
  });

  group.userData = { width: 2.0, length: 4.0, height: 1.2, type: 'brick-2x4' };
  return group;
}

/**
 * 2x2 Standard Brick
 */
function createBrick2x2(material) {
  const group = new THREE.Group();

  const bodyGeom = new THREE.BoxGeometry(2.0, 1.2, 2.0);
  const body = new THREE.Mesh(bodyGeom, material);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const topY = 0.6 + STUD_HEIGHT / 2;
  const xOffsets = [-0.5, 0.5];
  const zOffsets = [-0.5, 0.5];

  xOffsets.forEach(x => {
    zOffsets.forEach(z => {
      const stud = new THREE.Mesh(studGeom, material);
      stud.position.set(x, topY, z);
      stud.castShadow = true;
      stud.receiveShadow = true;
      group.add(stud);
    });
  });

  group.userData = { width: 2.0, length: 2.0, height: 1.2, type: 'brick-2x2' };
  return group;
}

/**
 * 1x2 Plate (thin 0.4 height)
 */
function createPlate1x2(material) {
  const group = new THREE.Group();

  const bodyGeom = new THREE.BoxGeometry(1.0, 0.4, 2.0);
  const body = new THREE.Mesh(bodyGeom, material);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const topY = 0.2 + STUD_HEIGHT / 2;
  const zOffsets = [-0.5, 0.5];

  zOffsets.forEach(z => {
    const stud = new THREE.Mesh(studGeom, material);
    stud.position.set(0, topY, z);
    stud.castShadow = true;
    stud.receiveShadow = true;
    group.add(stud);
  });

  group.userData = { width: 1.0, length: 2.0, height: 0.4, type: 'plate-1x2' };
  return group;
}

/**
 * 2x2 Slope Roof (45 degree slope)
 */
function createSlopeRoof(material) {
  const group = new THREE.Group();

  // Wedge shape in Z-Y plane: width in X is 2.0, depth in Z is 2.0, height in Y is 1.2
  // Extrude along X from -1.0 to +1.0
  const shape = new THREE.Shape();
  // Side profile (Z, Y):
  // bottom-left: z = -1.0, y = -0.6
  // bottom-right: z = 1.0, y = -0.6
  // top-right: z = 1.0, y = 0.6
  // top-plateau: z = 0.0, y = 0.6
  shape.moveTo(-1.0, -0.6);
  shape.lineTo(1.0, -0.6);
  shape.lineTo(1.0, 0.6);
  shape.lineTo(0.0, 0.6);
  shape.closePath();

  const extrudeSettings = {
    steps: 1,
    depth: 2.0,
    bevelEnabled: false
  };

  const wedgeGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  wedgeGeom.center(); // centers at (0, 0, 0)
  // Extrusion is along Z by default in Three.js, let's rotate so slope goes along Z and width along X
  wedgeGeom.rotateY(Math.PI / 2);

  const wedge = new THREE.Mesh(wedgeGeom, material);
  wedge.castShadow = true;
  wedge.receiveShadow = true;
  group.add(wedge);

  // 2 Studs on the top flat plateau (Z in [0.0, 1.0])
  const topY = 0.6 + STUD_HEIGHT / 2;
  const xOffsets = [-0.5, 0.5];
  xOffsets.forEach(x => {
    const stud = new THREE.Mesh(studGeom, material);
    stud.position.set(x, topY, 0.5);
    stud.castShadow = true;
    stud.receiveShadow = true;
    group.add(stud);
  });

  group.userData = { width: 2.0, length: 2.0, height: 1.2, type: 'slope-roof' };
  return group;
}

/**
 * Wheel Axle Piece
 */
function createWheelAxle(material) {
  const group = new THREE.Group();

  // Central plate base: 2 wide (X), 0.4 high (Y), 2 long (Z)
  const baseGeom = new THREE.BoxGeometry(2.0, 0.4, 2.0);
  const base = new THREE.Mesh(baseGeom, material);
  base.position.y = 0.1;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // 4 Studs on top of base
  const topY = 0.3 + STUD_HEIGHT / 2;
  const xOffsets = [-0.5, 0.5];
  const zOffsets = [-0.5, 0.5];
  xOffsets.forEach(x => {
    zOffsets.forEach(z => {
      const stud = new THREE.Mesh(studGeom, material);
      stud.position.set(x, topY, z);
      stud.castShadow = true;
      stud.receiveShadow = true;
      group.add(stud);
    });
  });

  // Cylindrical steel axle rod across X
  const axleGeom = new THREE.CylinderGeometry(0.08, 0.08, 2.7, 12);
  axleGeom.rotateZ(Math.PI / 2);
  const axleMesh = new THREE.Mesh(axleGeom, rimMaterial);
  axleMesh.position.y = -0.2;
  axleMesh.castShadow = true;
  group.add(axleMesh);

  // Two rubber wheels on sides (X = -1.35 and +1.35)
  const wheelRadius = 0.42;
  const wheelWidth = 0.28;
  const tireGeom = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 20);
  tireGeom.rotateZ(Math.PI / 2);

  const rimGeom = new THREE.CylinderGeometry(wheelRadius * 0.65, wheelRadius * 0.65, wheelWidth + 0.02, 16);
  rimGeom.rotateZ(Math.PI / 2);

  [-1.35, 1.35].forEach(x => {
    const tire = new THREE.Mesh(tireGeom, tireMaterial);
    tire.position.set(x, -0.2, 0);
    tire.castShadow = true;
    tire.receiveShadow = true;

    const rim = new THREE.Mesh(rimGeom, rimMaterial);
    rim.position.set(x, -0.2, 0);
    rim.castShadow = true;

    group.add(tire);
    group.add(rim);
  });

  group.userData = { width: 2.0, length: 2.0, height: 1.2, type: 'wheel-axle' };
  return group;
}
