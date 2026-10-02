import * as THREE from 'three';

/**
 * Procedural texture helpers for rich open-air playroom textures
 */
export function createSkyDomeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#0284c7'); // Deep azure sky top
  grad.addColorStop(0.25, '#38bdf8'); // Sunny bright cyan
  grad.addColorStop(0.55, '#7dd3fc'); // Soft daylight blue
  grad.addColorStop(0.75, '#fed7aa'); // Warm apricot horizon glow
  grad.addColorStop(0.90, '#fef08a'); // Golden sunlit horizon haze
  grad.addColorStop(1.0, '#86efac'); // Gentle spring meadow transition
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createStripedWallpaperTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#fdfaf5';
  ctx.fillRect(0, 0, 128, 512);

  ctx.fillStyle = '#f3ebe0';
  ctx.fillRect(0, 0, 64, 512);

  ctx.fillStyle = '#e8ded0';
  ctx.fillRect(62, 0, 2, 512);
  ctx.fillRect(126, 0, 2, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createWainscotingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#8ea794'; // Warm cozy sage green
  ctx.fillRect(0, 0, 256, 256);

  const slatW = 32;
  for (let x = 0; x < 256; x += slatW) {
    ctx.fillStyle = '#92ab98';
    ctx.fillRect(x + 2, 0, slatW - 4, 256);

    ctx.fillStyle = '#a6bea9';
    ctx.fillRect(x + 2, 0, 2, 256);

    ctx.fillStyle = '#7a927f';
    ctx.fillRect(x + slatW - 2, 0, 2, 256);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBlueprintTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(0, 0, 1024, 768);

  ctx.strokeStyle = 'rgba(147, 197, 253, 0.15)';
  ctx.lineWidth = 1;
  const gridSize = 32;
  for (let x = 0; x <= 1024; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 768);
    ctx.stroke();
  }
  for (let y = 0; y <= 768; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#93c5fd';
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 24, 976, 720);

  ctx.strokeRect(620, 620, 370, 114);
  ctx.fillStyle = '#bfdbfe';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('CLACKETY 3D BUILDER', 640, 655);
  ctx.font = '16px monospace';
  ctx.fillText('MODEL: EXPRESS STEAM ENGINE', 640, 685);
  ctx.fillText('SCALE: 1:32  |  SHEET: 01-A', 640, 712);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;

  ctx.strokeRect(180, 260, 360, 150);
  ctx.strokeRect(540, 190, 180, 220);
  ctx.strokeRect(580, 230, 90, 80);

  ctx.strokeRect(230, 170, 50, 90);
  ctx.strokeRect(380, 210, 60, 50);

  ctx.beginPath();
  ctx.arc(280, 460, 55, 0, Math.PI * 2);
  ctx.arc(440, 460, 55, 0, Math.PI * 2);
  ctx.arc(600, 460, 55, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(80, 520);
  ctx.lineTo(820, 520);
  ctx.moveTo(80, 535);
  ctx.lineTo(820, 535);
  ctx.stroke();

  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(180, 140);
  ctx.lineTo(720, 140);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#60a5fa';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('LENGTH: 540mm', 400, 132);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRugTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f8f4ec';
  ctx.fillRect(0, 0, 1024, 1024);

  ctx.fillStyle = 'rgba(215, 203, 185, 0.25)';
  for (let i = 0; i < 1024; i += 8) {
    ctx.fillRect(i, 0, 4, 1024);
    ctx.fillRect(0, i, 1024, 4);
  }

  ctx.strokeStyle = '#93c5fd';
  ctx.lineWidth = 36;
  ctx.strokeRect(40, 40, 944, 944);

  ctx.strokeStyle = '#fca5a5';
  ctx.lineWidth = 12;
  ctx.strokeRect(68, 68, 888, 888);

  ctx.strokeStyle = 'rgba(147, 197, 253, 0.4)';
  ctx.lineWidth = 6;
  ctx.setLineDash([16, 12]);
  ctx.beginPath();
  ctx.arc(512, 512, 360, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const corners = [
    [120, 120],
    [904, 120],
    [120, 904],
    [904, 904]
  ];
  corners.forEach(([cx, cy]) => {
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRugShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(256, 256, 160, 256, 256, 256);
  grad.addColorStop(0.0, 'rgba(40, 25, 10, 0.35)');
  grad.addColorStop(0.6, 'rgba(40, 25, 10, 0.18)');
  grad.addColorStop(1.0, 'rgba(40, 25, 10, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

/**
 * Shared, optimized materials for PlayroomEnvironment.
 */
export function createEnvironmentMaterials() {
  // --- Sky Dome Material ---
  const skyTex = createSkyDomeTexture();
  const matSkyDome = new THREE.MeshBasicMaterial({
    map: skyTex,
    side: THREE.BackSide,
    depthWrite: false
  });

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

  // --- Two-Tone Wall Materials & Balustrade Railings ---
  const wallpaperTex = createStripedWallpaperTexture();
  const wainscotTex = createWainscotingTexture();

  const matBackWall = new THREE.MeshStandardMaterial({
    name: 'matBackWall',
    map: wallpaperTex,
    color: 0xfbf4ea,
    roughness: 0.88,
    metalness: 0.0,
    side: THREE.FrontSide
  });

  const matSideWall = new THREE.MeshStandardMaterial({
    name: 'matSideWall',
    map: wallpaperTex,
    color: 0xf5ebd9,
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.FrontSide
  });

  const matWainscotLower = new THREE.MeshStandardMaterial({
    name: 'matWainscotLower',
    map: wainscotTex,
    color: 0x8ea794,
    roughness: 0.75,
    metalness: 0.02,
    side: THREE.FrontSide
  });

  const matChairRail = new THREE.MeshStandardMaterial({
    name: 'matChairRail',
    color: 0xa16207,
    roughness: 0.48,
    metalness: 0.04
  });

  const matBaseboard = new THREE.MeshStandardMaterial({
    name: 'matBaseboard',
    color: 0x854d0e,
    roughness: 0.5,
    metalness: 0.03
  });

  const matTrim = new THREE.MeshStandardMaterial({
    color: 0xfffcf5,
    roughness: 0.45,
    metalness: 0.02
  });

  // --- Central Play Rug / Build Zone ---
  const rugTex = createRugTexture();
  const rugShadowTex = createRugShadowTexture();

  const matRugBase = new THREE.MeshStandardMaterial({
    map: rugTex,
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.0
  });

  const matRugShadow = new THREE.MeshBasicMaterial({
    map: rugShadowTex,
    transparent: true,
    opacity: 0.8,
    depthWrite: false
  });

  const matRugBorder = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.85,
    metalness: 0.0
  });

  const matRugPillow = new THREE.MeshStandardMaterial({
    color: 0xfca5a5,
    roughness: 0.85,
    metalness: 0.0
  });

  // --- Volumetric Sunlight Beams ---
  const matSunbeam = new THREE.MeshBasicMaterial({
    color: 0xfff6d6,
    transparent: true,
    opacity: 0.13,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  // --- Blueprint / Pegboard Artwork ---
  const blueprintTex = createBlueprintTexture();
  const matBlueprint = new THREE.MeshStandardMaterial({
    map: blueprintTex,
    roughness: 0.6,
    metalness: 0.05
  });

  // --- Outdoor Landscape Diorama Materials ---
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

  const matFlowerRed = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    roughness: 0.6,
    metalness: 0.0
  });

  const matFlowerYellow = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    roughness: 0.6,
    metalness: 0.0
  });

  const matFlowerBlue = new THREE.MeshStandardMaterial({
    color: 0x60a5fa,
    roughness: 0.6,
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

  // --- Cozy Props & Furniture ---
  const matBeanbag = new THREE.MeshStandardMaterial({
    color: 0xfb7185,
    roughness: 0.95,
    metalness: 0.0
  });

  const matToyChest = new THREE.MeshStandardMaterial({
    color: 0x92400e,
    roughness: 0.5,
    metalness: 0.04
  });

  const matLampShade = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfde047,
    emissiveIntensity: 0.45,
    roughness: 0.8,
    metalness: 0.0
  });

  // --- Bed & Cozy Corner ---
  const matBedSheet = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    roughness: 0.85,
    metalness: 0.0
  });

  const matBlanketStripe = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    roughness: 0.85,
    metalness: 0.0
  });

  const matPillow = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.0
  });

  const matTeddyBear = new THREE.MeshStandardMaterial({
    color: 0x9a3412,
    roughness: 0.95,
    metalness: 0.0
  });

  // --- Workbench & Pegboard ---
  const matPegboard = new THREE.MeshStandardMaterial({
    color: 0xd6c29e,
    roughness: 0.75,
    metalness: 0.0
  });

  const matChalkboardSurface = new THREE.MeshStandardMaterial({
    color: 0x1c382b,
    roughness: 0.7,
    metalness: 0.02
  });

  return {
    matSkyDome,
    matWarmOak,
    matDarkOak,
    matLightPine,
    matFloorPlank,
    matBackWall,
    matSideWall,
    matWainscotLower,
    matChairRail,
    matBaseboard,
    matTrim,
    matRugBase,
    matRugShadow,
    matRugBorder,
    matRugPillow,
    matSunbeam,
    matBlueprint,
    matBeanbag,
    matToyChest,
    matLampShade,
    matHillNear,
    matHillFar,
    matMountain,
    matSnowCap,
    matRiver,
    matCloud,
    matFoliage,
    matTrunk,
    matFlowerRed,
    matFlowerYellow,
    matFlowerBlue,
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
