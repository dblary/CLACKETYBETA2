import * as THREE from 'three';

/**
 * Shared, optimized materials for PlayroomEnvironment.
 * High visual charm with warm, soft, child-friendly color palettes and balanced roughness.
 */
export function createEnvironmentMaterials() {
  // --- Wood Finishes ---
  const matWarmOak = new THREE.MeshStandardMaterial({
    color: 0xc48a48, // Warm honey oak
    roughness: 0.55,
    metalness: 0.02
  });

  const matDarkOak = new THREE.MeshStandardMaterial({
    color: 0x854d0e, // Rich dark amber oak for trims and beams
    roughness: 0.5,
    metalness: 0.05
  });

  const matLightPine = new THREE.MeshStandardMaterial({
    color: 0xedd6b1, // Pale blonde pine for furniture accents
    roughness: 0.6,
    metalness: 0.0
  });

  const matFloorPlank = new THREE.MeshStandardMaterial({
    color: 0xb57a3c, // Golden wood plank base
    roughness: 0.52,
    metalness: 0.02
  });

  // --- Room Architecture ---
  const matBackWall = new THREE.MeshStandardMaterial({
    name: 'matBackWall',
    color: 0xfbf4ea, // Soft warm cream butterscotch wall
    roughness: 0.88,
    metalness: 0.0,
    side: THREE.FrontSide
  });

  const matSideWall = new THREE.MeshStandardMaterial({
    name: 'matSideWall',
    color: 0xf5ebd9, // Slightly deeper cozy almond side wall
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.FrontSide
  });

  const matTrim = new THREE.MeshStandardMaterial({
    color: 0xffffff, // Crisp clean white baseboards & window trims
    roughness: 0.45,
    metalness: 0.02
  });

  // --- Central Play Rug / Build Zone ---
  const matRugBase = new THREE.MeshStandardMaterial({
    color: 0xe8dfd1, // Neutral soft woven linen cream
    roughness: 0.95,
    metalness: 0.0
  });

  const matRugBorder = new THREE.MeshStandardMaterial({
    color: 0x93c5fd, // Playful baby blue circular fringe border
    roughness: 0.85,
    metalness: 0.0
  });

  const matRugPillow = new THREE.MeshStandardMaterial({
    color: 0xfca5a5, // Soft pastel coral
    roughness: 0.85,
    metalness: 0.0
  });

  // --- Window & Outdoor Diorama ---
  const matWindowFrame = new THREE.MeshStandardMaterial({
    color: 0xfffcf5,
    roughness: 0.35,
    metalness: 0.05
  });

  const matWindowGlass = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.25,
    depthWrite: false
  });

  const matSkyBackdrop = new THREE.MeshBasicMaterial({
    color: 0xa5d8ff,
    side: THREE.BackSide
  });

  const matHillNear = new THREE.MeshStandardMaterial({
    color: 0x86efac, // Vibrant spring meadow green
    roughness: 0.85,
    metalness: 0.0,
    flatShading: true
  });

  const matHillFar = new THREE.MeshStandardMaterial({
    color: 0x4ade80, // Rich rolling green
    roughness: 0.9,
    metalness: 0.0,
    flatShading: true
  });

  const matMountain = new THREE.MeshStandardMaterial({
    color: 0x818cf8, // Distant misty lilac mountains
    roughness: 0.92,
    metalness: 0.0,
    flatShading: true
  });

  const matSnowCap = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.7,
    metalness: 0.0,
    flatShading: true
  });

  const matRiver = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity: 0.88
  });

  const matCloud = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.0,
    flatShading: true
  });

  const matFoliage = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    roughness: 0.8,
    metalness: 0.0,
    flatShading: true
  });

  const matTrunk = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.85,
    metalness: 0.0
  });

  // --- Saturated Toy Plastics & Metals ---
  const matToyRed = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.35,
    metalness: 0.05
  });

  const matToyBlue = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    roughness: 0.35,
    metalness: 0.05
  });

  const matToyYellow = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.35,
    metalness: 0.05
  });

  const matToyGreen = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    roughness: 0.35,
    metalness: 0.05
  });

  const matToyOrange = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    roughness: 0.35,
    metalness: 0.05
  });

  const matToyPurple = new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    roughness: 0.35,
    metalness: 0.05
  });

  const matToyTeal = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    roughness: 0.35,
    metalness: 0.05
  });

  const matToyMetal = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.28,
    metalness: 0.75
  });

  const matToyWheelRubber = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.85,
    metalness: 0.0
  });

  // --- Bed & Cozy Corner ---
  const matBedSheet = new THREE.MeshStandardMaterial({
    color: 0xfef08a, // Soft warm buttercup yellow quilt
    roughness: 0.85,
    metalness: 0.0
  });

  const matBlanketStripe = new THREE.MeshStandardMaterial({
    color: 0x67e8f9, // Turquoise blanket fold
    roughness: 0.85,
    metalness: 0.0
  });

  const matPillow = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.0
  });

  const matTeddyBear = new THREE.MeshStandardMaterial({
    color: 0x9a3412, // Warm teddy brown
    roughness: 0.95,
    metalness: 0.0
  });

  // --- Workbench & Pegboard ---
  const matPegboard = new THREE.MeshStandardMaterial({
    color: 0xd6c29e, // Perforated board tone
    roughness: 0.75,
    metalness: 0.0
  });

  const matChalkboardSurface = new THREE.MeshStandardMaterial({
    color: 0x1c382b, // Forest chalkboard green
    roughness: 0.7,
    metalness: 0.02
  });

  return {
    matWarmOak,
    matDarkOak,
    matLightPine,
    matFloorPlank,
    matBackWall,
    matSideWall,
    matTrim,
    matRugBase,
    matRugBorder,
    matRugPillow,
    matWindowFrame,
    matWindowGlass,
    matSkyBackdrop,
    matHillNear,
    matHillFar,
    matMountain,
    matSnowCap,
    matRiver,
    matCloud,
    matFoliage,
    matTrunk,
    matToyRed,
    matToyBlue,
    matToyYellow,
    matToyGreen,
    matToyOrange,
    matToyPurple,
    matToyTeal,
    matToyMetal,
    matToyWheelRubber,
    matBedSheet,
    matBlanketStripe,
    matPillow,
    matTeddyBear,
    matPegboard,
    matChalkboardSurface
  };
}
