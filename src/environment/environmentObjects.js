import * as THREE from 'three';

/**
 * Creates the procedural chalkboard canvas texture with "LET'S BUILD!" and playful drawings.
 */
function createChalkboardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1c382b';
  ctx.fillRect(0, 0, 1024, 512);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  for (let i = 0; i < 40; i++) {
    const rx = Math.random() * 1024;
    const ry = Math.random() * 512;
    const rad = 20 + Math.random() * 80;
    ctx.beginPath();
    ctx.arc(rx, ry, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 5;
  ctx.strokeRect(30, 25, 964, 462);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 78px "Comic Sans MS", "Fredoka", "Bubblegum Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText("LET'S BUILD!", 512, 190);

  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 36px "Comic Sans MS", sans-serif';
  ctx.fillText('⭐ TOY WORKSHOP ⭐', 512, 275);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  drawChalkStar(ctx, 150, 110, 36, '#facc15');
  drawChalkHouse(ctx, 150, 370, '#67e8f9');
  drawChalkRocket(ctx, 870, 120, '#f472b6');
  drawChalkCar(ctx, 860, 380, '#4ade80');
  drawChalkSmiley(ctx, 512, 385, 38, '#fde047');

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function drawChalkStar(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color + '44';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

function drawChalkHouse(ctx, cx, cy, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.strokeRect(cx - 35, cy - 20, 70, 50);
  ctx.moveTo(cx - 45, cy - 20);
  ctx.lineTo(cx, cy - 60);
  ctx.lineTo(cx + 45, cy - 20);
  ctx.rect(cx - 12, cy + 5, 24, 25);
  ctx.rect(cx + 12, cy - 10, 14, 14);
  ctx.moveTo(cx + 22, cy - 40);
  ctx.lineTo(cx + 22, cy - 65);
  ctx.lineTo(cx + 32, cy - 65);
  ctx.lineTo(cx + 32, cy - 30);
  ctx.stroke();
  ctx.restore();
}

function drawChalkRocket(ctx, cx, cy, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 18, 45, -Math.PI / 6, 0, Math.PI * 2);
  ctx.moveTo(cx - 18, cy + 18);
  ctx.lineTo(cx - 36, cy + 38);
  ctx.lineTo(cx - 10, cy + 30);
  ctx.moveTo(cx + 18, cy + 18);
  ctx.lineTo(cx + 36, cy + 38);
  ctx.lineTo(cx + 10, cy + 30);
  ctx.moveTo(cx + 8, cy - 8);
  ctx.arc(cx, cy - 8, 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawChalkCar(ctx, cx, cy, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.strokeRect(cx - 40, cy - 5, 80, 25);
  ctx.strokeRect(cx - 20, cy - 30, 40, 25);
  ctx.arc(cx - 22, cy + 20, 12, 0, Math.PI * 2);
  ctx.moveTo(cx + 34, cy + 20);
  ctx.arc(cx + 22, cy + 20, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawChalkSmiley(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx - 14, cy - 10, 4.5, 0, Math.PI * 2);
  ctx.arc(cx + 14, cy - 10, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy + 2, 20, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

/**
 * 1. OPEN-AIR WORKSHOP PATIO DECK & LOW RAILING:
 * Warm wooden plank deck platform with charming low wooden railings,
 * corner newel posts with spherical finials, and flower planter boxes.
 * Completely open to the panoramic sky and nature!
 */
export function createRoomStructure(materials) {
  const group = new THREE.Group();
  group.name = 'open_air_workshop_structure';
  group.userData.isEnvironment = true;

  const deckW = 56.0;
  const deckD = 52.0;

  // --- Instanced Wood Planks Floor ---
  const plankW = 2.0;
  const plankL = 8.0;
  const plankH = 0.12;
  const cols = Math.ceil(deckW / plankW);
  const rows = Math.ceil(deckD / plankL) + 1;
  const totalPlanks = cols * rows;

  const plankGeo = new THREE.BoxGeometry(plankW * 0.98, plankH, plankL * 0.98);
  const instancedFloor = new THREE.InstancedMesh(plankGeo, materials.matFloorPlank, totalPlanks);
  instancedFloor.name = 'playroom_instanced_floor';
  instancedFloor.receiveShadow = true;
  instancedFloor.userData.isEnvironment = true;

  const dummy = new THREE.Object3D();
  const plankTones = [
    new THREE.Color(0xb57a3c),
    new THREE.Color(0xc18645),
    new THREE.Color(0xa76d33),
    new THREE.Color(0xb97e3f),
    new THREE.Color(0x9d642d)
  ];

  let idx = 0;
  const startX = -deckW / 2 + plankW / 2;
  const startZ = -deckD / 2 + plankL / 2;

  for (let c = 0; c < cols; c++) {
    const x = startX + c * plankW;
    const staggeredOffset = (c % 2) * (plankL * 0.45);
    for (let r = 0; r < rows; r++) {
      let z = startZ + r * plankL + staggeredOffset;
      if (z > deckD / 2) z -= deckD;

      dummy.position.set(x, -plankH / 2, z);
      dummy.updateMatrix();
      instancedFloor.setMatrixAt(idx, dummy.matrix);

      const tone = plankTones[(c * 3 + r * 7) % plankTones.length];
      instancedFloor.setColorAt(idx, tone);
      idx++;
    }
  }
  instancedFloor.instanceMatrix.needsUpdate = true;
  if (instancedFloor.instanceColor) instancedFloor.instanceColor.needsUpdate = true;
  group.add(instancedFloor);

  // Deck Side Fascia Trim (Wooden edge border)
  const fasciaThick = 0.35;
  const fasciaH = 0.45;
  const fasciaGeoX = new THREE.BoxGeometry(deckW + 0.7, fasciaH, fasciaThick);
  const fasciaGeoZ = new THREE.BoxGeometry(fasciaThick, fasciaH, deckD + 0.7);

  const fasciaN = new THREE.Mesh(fasciaGeoX, materials.matDarkOak);
  fasciaN.position.set(0, -fasciaH / 2, -deckD / 2 - fasciaThick / 2);
  fasciaN.userData.isEnvironment = true;
  group.add(fasciaN);

  const fasciaS = new THREE.Mesh(fasciaGeoX, materials.matDarkOak);
  fasciaS.position.set(0, -fasciaH / 2, deckD / 2 + fasciaThick / 2);
  fasciaS.userData.isEnvironment = true;
  group.add(fasciaS);

  const fasciaW = new THREE.Mesh(fasciaGeoZ, materials.matDarkOak);
  fasciaW.position.set(-deckW / 2 - fasciaThick / 2, -fasciaH / 2, 0);
  fasciaW.userData.isEnvironment = true;
  group.add(fasciaW);

  const fasciaE = new THREE.Mesh(fasciaGeoZ, materials.matDarkOak);
  fasciaE.position.set(deckW / 2 + fasciaThick / 2, -fasciaH / 2, 0);
  fasciaE.userData.isEnvironment = true;
  group.add(fasciaE);

  // --- Low Wooden Balustrade Railings (h = 2.2) ---
  const railH = 2.2;
  const railTopH = 0.22;
  const railTopW = 0.38;

  function buildRailingSection(startX, startZ, endX, endZ) {
    const rGroup = new THREE.Group();
    rGroup.userData.isEnvironment = true;

    const length = Math.hypot(endX - startX, endZ - startZ);
    const midX = (startX + endX) / 2;
    const midZ = (startZ + endZ) / 2;
    const angle = Math.atan2(endZ - startZ, endX - startX);

    // Top Handrail
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(length, railTopH, railTopW), materials.matWarmOak);
    topRail.position.set(0, railH, 0);
    topRail.castShadow = true;
    topRail.receiveShadow = true;
    topRail.userData.isEnvironment = true;
    rGroup.add(topRail);

    // Bottom Rail
    const botRail = new THREE.Mesh(new THREE.BoxGeometry(length, 0.15, 0.25), materials.matWarmOak);
    botRail.position.set(0, 0.25, 0);
    botRail.castShadow = true;
    botRail.userData.isEnvironment = true;
    rGroup.add(botRail);

    // Vertical Baluster Spindles
    const spindleSpacing = 1.4;
    const spindleCount = Math.floor(length / spindleSpacing);
    const balGeo = new THREE.CylinderGeometry(0.06, 0.06, railH - 0.35, 8);
    for (let s = 1; s <= spindleCount; s++) {
      const sx = -length / 2 + s * (length / (spindleCount + 1));
      const bal = new THREE.Mesh(balGeo, materials.matLightPine);
      bal.position.set(sx, (railH + 0.25) / 2, 0);
      bal.castShadow = true;
      bal.userData.isEnvironment = true;
      rGroup.add(bal);
    }

    rGroup.position.set(midX, 0, midZ);
    rGroup.rotation.y = -angle;
    group.add(rGroup);
  }

  // Build perimeter railings (Left, Right, and Back sections)
  buildRailingSection(-deckW / 2 + 1, -deckD / 2 + 1, -deckW / 2 + 1, deckD / 2 - 1);
  buildRailingSection(deckW / 2 - 1, -deckD / 2 + 1, deckW / 2 - 1, deckD / 2 - 1);
  buildRailingSection(-deckW / 2 + 1, -deckD / 2 + 1, deckW / 2 - 1, -deckD / 2 + 1);

  // Sturdy Corner Posts with Spherical Finials
  const postCoords = [
    [-deckW / 2 + 1, -deckD / 2 + 1],
    [ deckW / 2 - 1, -deckD / 2 + 1],
    [-deckW / 2 + 1,  deckD / 2 - 1],
    [ deckW / 2 - 1,  deckD / 2 - 1]
  ];

  postCoords.forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.65, railH + 0.4, 0.65), materials.matDarkOak);
    post.position.set(px, (railH + 0.4) / 2, pz);
    post.castShadow = true;
    post.userData.isEnvironment = true;
    group.add(post);

    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), materials.matWarmOak);
    ball.position.set(px, railH + 0.55, pz);
    ball.castShadow = true;
    ball.userData.isEnvironment = true;
    group.add(ball);
  });

  // --- Planter Boxes with 3D Colorful Flowers on Railings ---
  function addPlanter(x, z, rotY) {
    const pGroup = new THREE.Group();
    pGroup.position.set(x, railH + 0.15, z);
    pGroup.rotation.y = rotY;
    pGroup.userData.isEnvironment = true;

    // Cedar Box
    const box = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.4, 0.6), materials.matToyChest);
    box.castShadow = true;
    box.userData.isEnvironment = true;
    pGroup.add(box);

    // Soil
    const soil = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.1, 0.45), materials.matDarkOak);
    soil.position.y = 0.16;
    soil.userData.isEnvironment = true;
    pGroup.add(soil);

    // Flowers
    const flowerMats = [materials.matFlowerRed, materials.matFlowerYellow, materials.matFlowerBlue];
    for (let f = 0; f < 6; f++) {
      const fx = -1.4 + f * 0.55;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 6), materials.matFoliage);
      stem.position.set(fx, 0.28, (f % 2 === 0 ? 0.08 : -0.08));
      stem.userData.isEnvironment = true;
      pGroup.add(stem);

      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), flowerMats[f % flowerMats.length]);
      petal.position.set(fx, 0.42, (f % 2 === 0 ? 0.08 : -0.08));
      petal.userData.isEnvironment = true;
      pGroup.add(petal);
    }
    group.add(pGroup);
  }

  addPlanter(-deckW / 2 + 1, -8, Math.PI / 2);
  addPlanter(-deckW / 2 + 1, 8, Math.PI / 2);
  addPlanter(deckW / 2 - 1, -8, -Math.PI / 2);
  addPlanter(deckW / 2 - 1, 8, -Math.PI / 2);
  addPlanter(-12, -deckD / 2 + 1, 0);
  addPlanter(12, -deckD / 2 + 1, 0);

  return group;
}

/**
 * 2. 360-DEGREE PANORAMIC OPEN SKY & OUTDOOR DIORAMA:
 * Massive sunny sky dome, rolling green hills, lavender mountains with snow caps,
 * winding cartoon river, floating 3D clouds, hot air balloons, flying birds, and shining sun.
 */
export function createPanoramicOutdoorWorld(materials) {
  const group = new THREE.Group();
  group.name = 'panoramic_outdoor_world';
  group.userData.isEnvironment = true;

  // 1. Sky Dome (Radius 140)
  const skyGeo = new THREE.SphereGeometry(140, 32, 24);
  const skyMesh = new THREE.Mesh(skyGeo, materials.matSkyDome);
  skyMesh.userData.isEnvironment = true;
  group.add(skyMesh);

  // 2. Distant Glowing Golden Sun Disc
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(9.0, 32),
    new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide })
  );
  sunDisc.position.set(45, 60, -90);
  sunDisc.lookAt(0, 0, 0);
  sunDisc.userData.isEnvironment = true;
  group.add(sunDisc);

  // Outer Sun Glow Ring
  const sunGlow = new THREE.Mesh(
    new THREE.RingGeometry(9.2, 16.0, 32),
    new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  sunGlow.position.set(45, 60, -89.8);
  sunGlow.lookAt(0, 0, 0);
  sunGlow.userData.isEnvironment = true;
  group.add(sunGlow);

  // 3. Panoramic Mountain Peaks in Distance
  const mountainAngles = [-Math.PI * 0.75, -Math.PI * 0.5, -Math.PI * 0.25, 0, Math.PI * 0.35, Math.PI * 0.7];
  mountainAngles.forEach((ang, i) => {
    const dist = 95 + (i % 3) * 12;
    const mx = Math.cos(ang) * dist;
    const mz = Math.sin(ang) * dist;
    const mHeight = 24.0 + (i % 2) * 8.0;
    const mRadius = 18.0 + (i % 3) * 5.0;

    const mtn = new THREE.Mesh(new THREE.ConeGeometry(mRadius, mHeight, 7), materials.matMountain);
    mtn.position.set(mx, mHeight / 2 - 4.0, mz);
    mtn.userData.isEnvironment = true;
    group.add(mtn);

    // Snow cap
    const snow = new THREE.Mesh(new THREE.ConeGeometry(mRadius * 0.4, mHeight * 0.38, 7), materials.matSnowCap);
    snow.position.set(mx, mHeight - mHeight * 0.19 - 4.0, mz);
    snow.userData.isEnvironment = true;
    group.add(snow);
  });

  // 4. Rolling Green Meadow Hills (360 degrees around deck)
  const hillAngles = 12;
  for (let h = 0; h < hillAngles; h++) {
    const ang = (h / hillAngles) * Math.PI * 2;
    const hDist = 48.0 + (h % 3) * 8.0;
    const hx = Math.cos(ang) * hDist;
    const hz = Math.sin(ang) * hDist;
    const hRad = 16.0 + (h % 2) * 6.0;

    const hillMat = (h % 2 === 0) ? materials.matHillNear : materials.matHillFar;
    const hill = new THREE.Mesh(
      new THREE.SphereGeometry(hRad, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      hillMat
    );
    hill.scale.set(1.4, 0.45, 1.4);
    hill.position.set(hx, -4.0, hz);
    hill.userData.isEnvironment = true;
    group.add(hill);

    // Add 2-3 low poly pine trees on hills
    for (let t = 0; t < 2; t++) {
      const treeGroup = new THREE.Group();
      const tx = hx + (t === 0 ? -3.0 : 3.0);
      const tz = hz + (t === 0 ? 2.0 : -2.0);
      treeGroup.position.set(tx, 1.5, tz);
      treeGroup.scale.set(1.4, 1.4, 1.4);
      treeGroup.userData.isEnvironment = true;

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.6, 6), materials.matTrunk);
      trunk.position.y = 0.8;
      trunk.userData.isEnvironment = true;
      treeGroup.add(trunk);

      for (let k = 0; k < 3; k++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(1.2 - k * 0.25, 1.3, 7), materials.matFoliage);
        cone.position.y = 1.6 + k * 0.8;
        cone.userData.isEnvironment = true;
        treeGroup.add(cone);
      }
      group.add(treeGroup);
    }
  }

  // 5. Miniature Windmill on a Distant Hill
  const wmGroup = new THREE.Group();
  wmGroup.name = 'distant_windmill';
  wmGroup.position.set(38, 2.5, -42);
  wmGroup.userData.isEnvironment = true;

  const wmTower = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.8, 6.5, 8), materials.matLightPine);
  wmTower.position.y = 3.25;
  wmTower.userData.isEnvironment = true;
  wmGroup.add(wmTower);

  const wmCap = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.8, 8), materials.matToyRed);
  wmCap.position.y = 7.2;
  wmCap.userData.isEnvironment = true;
  wmGroup.add(wmCap);

  // Windmill 4 Sails
  for (let s = 0; s < 4; s++) {
    const sail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.5, 0.08), materials.matTrim);
    sail.position.set(0, 6.2, 1.4);
    sail.rotation.z = (s * Math.PI) / 2 + Math.PI / 4;
    sail.userData.isEnvironment = true;
    wmGroup.add(sail);
  }
  group.add(wmGroup);

  // 6. Floating 3D Clouds in Sky
  function createCloud(cx, cy, cz, scale = 1.0) {
    const cGroup = new THREE.Group();
    cGroup.position.set(cx, cy, cz);
    cGroup.scale.set(scale, scale, scale);
    cGroup.userData.isEnvironment = true;

    const puffs = [
      { x: 0, y: 0, z: 0, r: 2.2 },
      { x: 2.0, y: -0.2, z: 0, r: 1.8 },
      { x: -2.0, y: -0.3, z: 0, r: 1.6 },
      { x: 0.8, y: 1.1, z: 0, r: 1.7 },
      { x: -0.8, y: 0.9, z: 0, r: 1.5 }
    ];
    puffs.forEach((p) => {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(p.r, 10, 8), materials.matCloud);
      puff.position.set(p.x, p.y, p.z);
      puff.userData.isEnvironment = true;
      cGroup.add(puff);
    });
    return cGroup;
  }

  group.add(createCloud(-32, 28, -55, 1.6));
  group.add(createCloud(36, 32, -48, 1.4));
  group.add(createCloud(-45, 26, 25, 1.5));
  group.add(createCloud(42, 29, 32, 1.7));
  group.add(createCloud(0, 36, -65, 2.0));

  // 7. Whimsical Hot Air Balloons in the Sky
  function createHotAirBalloon(bx, by, bz, balloonMat, scale = 1.0) {
    const bGroup = new THREE.Group();
    bGroup.position.set(bx, by, bz);
    bGroup.scale.set(scale, scale, scale);
    bGroup.userData.isEnvironment = true;

    // Balloon Envelope
    const envGeo = new THREE.SphereGeometry(2.4, 16, 16);
    const envMesh = new THREE.Mesh(envGeo, balloonMat);
    envMesh.scale.set(1.0, 1.35, 1.0);
    envMesh.position.y = 3.5;
    envMesh.userData.isEnvironment = true;
    bGroup.add(envMesh);

    // Basket
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.8), materials.matDarkOak);
    basket.position.y = 0.5;
    basket.userData.isEnvironment = true;
    bGroup.add(basket);

    // 4 Ropes
    const ropeCoords = [
      [-0.35, -0.35],
      [ 0.35, -0.35],
      [-0.35,  0.35],
      [ 0.35,  0.35]
    ];
    ropeCoords.forEach(([rx, rz]) => {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.8, 4), materials.matWarmOak);
      rope.position.set(rx, 1.5, rz);
      rope.userData.isEnvironment = true;
      bGroup.add(rope);
    });

    return bGroup;
  }

  group.add(createHotAirBalloon(-28, 22, -60, materials.matToyRed, 1.3));
  group.add(createHotAirBalloon(30, 26, -50, materials.matToyYellow, 1.1));

  // 8. Flocks of Flying Birds (V-Formation)
  const flock = new THREE.Group();
  flock.position.set(-15, 34, -40);
  flock.userData.isEnvironment = true;
  for (let b = 0; b < 5; b++) {
    const bird = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.8, 4), materials.matTrim);
    bird.rotation.x = Math.PI / 2;
    bird.position.set(b * 1.5 - 3.0, -Math.abs(b - 2) * 0.8, b * 0.4);
    bird.userData.isEnvironment = true;
    flock.add(bird);
  }
  group.add(flock);

  return group;
}

/**
 * 3. BACK TIMBER PERGOLA, CHALKBOARD & BLUEPRINT:
 * Open-air timber arbor structure on the back-left of the deck
 * holding the "LET'S BUILD!" chalkboard, framed blueprint, and bunting garland.
 */
export function createBackWallDecorations(materials) {
  const group = new THREE.Group();
  group.name = 'timber_pergola_and_decorations';
  group.userData.isEnvironment = true;

  const pergolaZ = -22.0;

  // 4 Sturdy Timber Upright Posts (h = 7.5)
  const postH = 7.5;
  const postThick = 0.55;
  const postXCoords = [-24.0, -13.0, -2.0, 9.0];

  postXCoords.forEach((px) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(postThick, postH, postThick), materials.matDarkOak);
    post.position.set(px, postH / 2, pergolaZ);
    post.castShadow = true;
    post.receiveShadow = true;
    post.userData.isEnvironment = true;
    group.add(post);
  });

  // Top Overhead Timber Beam
  const beamLength = 36.0;
  const beam = new THREE.Mesh(new THREE.BoxGeometry(beamLength, 0.45, 0.65), materials.matDarkOak);
  beam.position.set(-7.5, postH, pergolaZ);
  beam.castShadow = true;
  beam.receiveShadow = true;
  beam.userData.isEnvironment = true;
  group.add(beam);

  // --- Chalkboard ("LET'S BUILD!") Mounted between Posts ---
  const boardW = 8.5;
  const boardH = 4.6;
  const cbGroup = new THREE.Group();
  cbGroup.position.set(-18.5, 4.4, pergolaZ);
  cbGroup.userData.isEnvironment = true;

  const frameBack = new THREE.Mesh(
    new THREE.BoxGeometry(boardW + 0.4, boardH + 0.4, 0.12),
    materials.matWarmOak
  );
  frameBack.castShadow = true;
  frameBack.userData.isEnvironment = true;
  cbGroup.add(frameBack);

  const cbTex = createChalkboardTexture();
  const cbMat = new THREE.MeshStandardMaterial({ map: cbTex, roughness: 0.65, metalness: 0.02 });
  const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(boardW, boardH), cbMat);
  boardMesh.position.set(0, 0, 0.08);
  boardMesh.userData.isEnvironment = true;
  cbGroup.add(boardMesh);

  const ledge = new THREE.Mesh(new THREE.BoxGeometry(boardW + 0.4, 0.14, 0.35), materials.matDarkOak);
  ledge.position.set(0, -boardH / 2 - 0.07, 0.18);
  ledge.userData.isEnvironment = true;
  cbGroup.add(ledge);

  const chalkColors = [0xffffff, 0xfacc15, 0xf472b6, 0x38bdf8];
  chalkColors.forEach((col, i) => {
    const ch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.9 })
    );
    ch.rotation.z = Math.PI / 2;
    ch.position.set(-1.2 + i * 0.45, -boardH / 2 + 0.05, 0.22);
    ch.userData.isEnvironment = true;
    cbGroup.add(ch);
  });
  group.add(cbGroup);

  // --- Framed Technical Blueprint Mounted Next to Chalkboard ---
  const bpGroup = new THREE.Group();
  bpGroup.position.set(-7.5, 4.4, pergolaZ);
  bpGroup.userData.isEnvironment = true;

  const bpW = 7.2;
  const bpH = 4.6;

  const bpFrame = new THREE.Mesh(new THREE.BoxGeometry(bpW + 0.4, bpH + 0.4, 0.12), materials.matDarkOak);
  bpFrame.castShadow = true;
  bpFrame.userData.isEnvironment = true;
  bpGroup.add(bpFrame);

  const bpMesh = new THREE.Mesh(new THREE.PlaneGeometry(bpW, bpH), materials.matBlueprint);
  bpMesh.position.set(0, 0, 0.07);
  bpMesh.userData.isEnvironment = true;
  bpGroup.add(bpMesh);

  group.add(bpGroup);

  // --- Colorful Festive Bunting Garland across Timber Beam ---
  const buntingGroup = new THREE.Group();
  buntingGroup.userData.isEnvironment = true;
  const flagColors = [
    materials.matToyRed,
    materials.matToyYellow,
    materials.matToyBlue,
    materials.matToyGreen,
    materials.matToyOrange,
    materials.matToyPurple
  ];

  const totalFlags = 24;
  const buntingStartX = -24.0;
  const buntingEndX = 9.0;
  const buntingY = postH - 0.1;

  const curvePoints = [];
  for (let i = 0; i <= totalFlags; i++) {
    const t = i / totalFlags;
    const x = THREE.MathUtils.lerp(buntingStartX, buntingEndX, t);
    const sag = Math.sin(t * Math.PI) * 1.2;
    const y = buntingY - sag;
    const z = pergolaZ + 0.25;
    curvePoints.push(new THREE.Vector3(x, y, z));

    if (i < totalFlags) {
      const flagGeo = new THREE.BufferGeometry();
      const hw = 0.55;
      const fh = 0.95;
      const vertices = new Float32Array([
        -hw, 0, 0,
         hw, 0, 0,
          0, -fh, 0
      ]);
      flagGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      flagGeo.computeVertexNormals();

      const flagMesh = new THREE.Mesh(flagGeo, flagColors[i % flagColors.length]);
      flagMesh.position.set(x + 0.5, y, z);
      flagMesh.castShadow = true;
      flagMesh.userData.isEnvironment = true;
      buntingGroup.add(flagMesh);
    }
  }

  const stringCurve = new THREE.CatmullRomCurve3(curvePoints);
  const stringGeo = new THREE.TubeGeometry(stringCurve, 48, 0.02, 4, false);
  const stringMesh = new THREE.Mesh(stringGeo, materials.matWarmOak);
  stringMesh.userData.isEnvironment = true;
  buntingGroup.add(stringMesh);

  group.add(buntingGroup);
  return group;
}

/**
 * 4. CHILDREN'S WORKBENCH:
 * Positioned under the pergola arbor on the back-left.
 */
export function createChildrenWorkbench(materials) {
  const group = new THREE.Group();
  group.name = 'children_workbench';
  group.position.set(-18.5, 0, -17.5);
  group.userData.isEnvironment = true;

  const tableW = 4.2;
  const tableD = 1.9;
  const tableH = 2.4;
  const topThick = 0.22;

  // Tabletop
  const top = new THREE.Mesh(new THREE.BoxGeometry(tableW, topThick, tableD), materials.matWarmOak);
  top.position.y = tableH;
  top.castShadow = true;
  top.receiveShadow = true;
  top.userData.isEnvironment = true;
  group.add(top);

  // Legs
  const legR = 0.12;
  const legH = tableH;
  const legOffsets = [
    [-tableW / 2 + 0.25, -tableD / 2 + 0.25],
    [ tableW / 2 - 0.25, -tableD / 2 + 0.25],
    [-tableW / 2 + 0.25,  tableD / 2 - 0.25],
    [ tableW / 2 - 0.25,  tableD / 2 - 0.25]
  ];

  legOffsets.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(legR, legR, legH, 12), materials.matDarkOak);
    leg.position.set(lx, legH / 2, lz);
    leg.castShadow = true;
    leg.receiveShadow = true;
    leg.userData.isEnvironment = true;
    group.add(leg);
  });

  // Lower Shelf
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(tableW - 0.4, 0.12, tableD - 0.4), materials.matLightPine);
  shelf.position.y = 0.7;
  shelf.castShadow = true;
  shelf.userData.isEnvironment = true;
  group.add(shelf);

  // Vise Clamp
  const vise = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.35), materials.matToyOrange);
  vise.position.set(-tableW / 2 + 0.35, tableH + 0.18, tableD / 2 - 0.25);
  vise.castShadow = true;
  vise.userData.isEnvironment = true;
  group.add(vise);

  // Toy Tool Box on Table
  const toolBox = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 0.8), materials.matToyRed);
  toolBox.position.set(0.6, tableH + 0.24, 0);
  toolBox.castShadow = true;
  toolBox.userData.isEnvironment = true;
  group.add(toolBox);

  return group;
}

/**
 * 5. LEFT WALL / DECK EDGE TOY SHELVES:
 */
export function createToyShelvesLeft(materials) {
  const group = new THREE.Group();
  group.name = 'toy_shelves_left';
  group.position.set(-23.0, 0, 4.0);
  group.rotation.y = Math.PI / 2;
  group.userData.isEnvironment = true;

  const unitW = 6.8;
  const unitD = 1.35;
  const unitH = 5.2;
  const shelfCount = 3;

  const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.18, unitH, unitD), materials.matWarmOak);
  sideL.position.set(-unitW / 2, unitH / 2, 0);
  sideL.castShadow = true;
  sideL.userData.isEnvironment = true;
  group.add(sideL);

  const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.18, unitH, unitD), materials.matWarmOak);
  sideR.position.set(unitW / 2, unitH / 2, 0);
  sideR.castShadow = true;
  sideR.userData.isEnvironment = true;
  group.add(sideR);

  const shelfSpacing = (unitH - 0.4) / (shelfCount - 1);
  for (let s = 0; s < shelfCount; s++) {
    const y = 0.4 + s * shelfSpacing;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(unitW, 0.14, unitD), materials.matWarmOak);
    plank.position.set(0, y, 0);
    plank.castShadow = true;
    plank.userData.isEnvironment = true;
    group.add(plank);

    populateShelfToys(group, materials, s, y + 0.07, unitW);
  }

  return group;
}

function populateShelfToys(group, materials, shelfIndex, shelfY, unitW) {
  const toyPlasticColors = [
    materials.matToyRed,
    materials.matToyBlue,
    materials.matToyYellow,
    materials.matToyGreen,
    materials.matToyOrange,
    materials.matToyPurple,
    materials.matToyTeal
  ];

  if (shelfIndex === 0) {
    for (let b = 0; b < 3; b++) {
      const bx = -2.0 + b * 2.0;
      const bin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.85, 0.9), toyPlasticColors[(b * 2) % toyPlasticColors.length]);
      bin.position.set(bx, shelfY + 0.42, 0);
      bin.castShadow = true;
      bin.userData.isEnvironment = true;
      group.add(bin);
    }
  } else if (shelfIndex === 1) {
    createToyCar(group, materials, -2.0, shelfY, materials.matToyRed);
    createToyTruck(group, materials, 0.4, shelfY, materials.matToyBlue);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 14), materials.matToyYellow);
    ball.position.set(2.2, shelfY + 0.42, 0);
    ball.castShadow = true;
    ball.userData.isEnvironment = true;
    group.add(ball);
  } else if (shelfIndex === 2) {
    createToyTrainEngine(group, materials, -1.2, shelfY);
    createRingStack(group, materials, 1.4, shelfY);
  }
}

function createToyCar(group, materials, x, y, bodyMat) {
  const car = new THREE.Group();
  car.position.set(x, y, 0);
  car.userData.isEnvironment = true;

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 0.6), bodyMat);
  body.position.y = 0.3;
  body.castShadow = true;
  body.userData.isEnvironment = true;
  car.add(body);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.52), materials.matTrim);
  cab.position.set(-0.05, 0.6, 0);
  cab.userData.isEnvironment = true;
  car.add(cab);

  const wGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.12, 10);
  const wOffsets = [
    [-0.35, 0.16, -0.32],
    [ 0.35, 0.16, -0.32],
    [-0.35, 0.16,  0.32],
    [ 0.35, 0.16,  0.32]
  ];
  wOffsets.forEach(([wx, wy, wz]) => {
    const wheel = new THREE.Mesh(wGeo, materials.matToyWheelRubber);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, wy, wz);
    wheel.userData.isEnvironment = true;
    car.add(wheel);
  });
  group.add(car);
}

function createToyTruck(group, materials, x, y, cabMat) {
  const truck = new THREE.Group();
  truck.position.set(x, y, 0);
  truck.userData.isEnvironment = true;

  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.65, 0.68), cabMat);
  cab.position.set(0.45, 0.45, 0);
  cab.castShadow = true;
  cab.userData.isEnvironment = true;
  truck.add(cab);

  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.4, 0.72), materials.matToyOrange);
  bed.position.set(-0.4, 0.38, 0);
  bed.castShadow = true;
  bed.userData.isEnvironment = true;
  truck.add(bed);

  const wGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 10);
  const wOffsets = [
    [-0.7, 0.18, -0.38],
    [ 0.5, 0.18, -0.38],
    [-0.7, 0.18,  0.38],
    [ 0.5, 0.18,  0.38]
  ];
  wOffsets.forEach(([wx, wy, wz]) => {
    const wheel = new THREE.Mesh(wGeo, materials.matToyWheelRubber);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, wy, wz);
    wheel.userData.isEnvironment = true;
    truck.add(wheel);
  });
  group.add(truck);
}

function createToyTrainEngine(group, materials, x, y) {
  const train = new THREE.Group();
  train.position.set(x, y, 0);
  train.userData.isEnvironment = true;

  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.0, 12), materials.matToyBlue);
  boiler.rotation.z = Math.PI / 2;
  boiler.position.set(-0.15, 0.45, 0);
  boiler.castShadow = true;
  boiler.userData.isEnvironment = true;
  train.add(boiler);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.6), materials.matToyRed);
  cab.position.set(0.5, 0.52, 0);
  cab.castShadow = true;
  cab.userData.isEnvironment = true;
  train.add(cab);

  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.32, 8), materials.matToyYellow);
  stack.position.set(-0.45, 0.8, 0);
  stack.userData.isEnvironment = true;
  train.add(stack);

  group.add(train);
}

function createRingStack(group, materials, x, y) {
  const stack = new THREE.Group();
  stack.position.set(x, y, 0);
  stack.userData.isEnvironment = true;

  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.9, 10), materials.matWarmOak);
  rod.position.y = 0.45;
  rod.userData.isEnvironment = true;
  stack.add(rod);

  const colors = [
    materials.matToyRed,
    materials.matToyOrange,
    materials.matToyYellow,
    materials.matToyGreen,
    materials.matToyBlue
  ];

  for (let r = 0; r < 5; r++) {
    const ringR = 0.38 - r * 0.05;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(ringR, 0.07, 8, 14), colors[r]);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.1 + r * 0.14;
    ring.castShadow = true;
    ring.userData.isEnvironment = true;
    stack.add(ring);
  }
  group.add(stack);
}

/**
 * 6. RIGHT WALL / DECK STORAGE & PROPS:
 */
export function createToyStorageRight(materials) {
  const group = new THREE.Group();
  group.name = 'toy_storage_right';
  group.position.set(23.0, 0, 4.0);
  group.rotation.y = -Math.PI / 2;
  group.userData.isEnvironment = true;

  const cubbyW = 6.4;
  const cubbyH = 3.8;
  const cubbyD = 1.35;

  const outerBox = new THREE.Mesh(new THREE.BoxGeometry(cubbyW, cubbyH, cubbyD), materials.matLightPine);
  outerBox.position.y = cubbyH / 2;
  outerBox.castShadow = true;
  outerBox.userData.isEnvironment = true;
  group.add(outerBox);

  // 6 Open Bins
  const cellW = cubbyW / 3 - 0.2;
  const cellH = cubbyH / 2 - 0.2;
  const binColors = [
    materials.matToyTeal,
    materials.matToyOrange,
    materials.matToyPurple,
    materials.matToyGreen,
    materials.matToyYellow,
    materials.matToyRed
  ];

  let bIdx = 0;
  for (let row = 0; row < 2; row++) {
    const cy = 0.9 + row * 1.8;
    for (let col = 0; col < 3; col++) {
      const cx = -2.1 + col * 2.1;
      const binMesh = new THREE.Mesh(new THREE.BoxGeometry(cellW * 0.9, cellH * 0.85, cubbyD * 0.9), binColors[bIdx % binColors.length]);
      binMesh.position.set(cx, cy, 0.08);
      binMesh.castShadow = true;
      binMesh.userData.isEnvironment = true;
      group.add(binMesh);
      bIdx++;
    }
  }

  // Toy Crane on Top
  const craneGroup = new THREE.Group();
  craneGroup.position.set(-1.4, cubbyH, 0);
  craneGroup.userData.isEnvironment = true;

  const craneBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.4, 0.75), materials.matToyYellow);
  craneBase.position.y = 0.22;
  craneBase.userData.isEnvironment = true;
  craneGroup.add(craneBase);

  const craneBoom = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.12), materials.matToyMetal);
  craneBoom.rotation.z = -Math.PI / 4;
  craneBoom.position.set(0.35, 0.8, 0);
  craneBoom.userData.isEnvironment = true;
  craneGroup.add(craneBoom);
  group.add(craneGroup);

  // Plush Beanbag
  const beanbag = new THREE.Group();
  beanbag.position.set(-4.8, 0, 1.6);
  beanbag.userData.isEnvironment = true;

  const bagMesh = new THREE.Mesh(new THREE.SphereGeometry(1.2, 14, 12), materials.matBeanbag);
  bagMesh.scale.set(1.2, 0.68, 1.2);
  bagMesh.position.y = 0.75;
  bagMesh.castShadow = true;
  bagMesh.userData.isEnvironment = true;
  beanbag.add(bagMesh);
  group.add(beanbag);

  // Stack of Wooden Blocks
  const blocksGroup = new THREE.Group();
  blocksGroup.position.set(4.5, 0, 1.5);
  blocksGroup.userData.isEnvironment = true;

  const blkColors = [materials.matToyRed, materials.matToyBlue, materials.matToyYellow, materials.matToyGreen];
  for (let i = 0; i < 3; i++) {
    const blk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), blkColors[i % blkColors.length]);
    blk.position.set(-0.6 + i * 0.6, 0.25, 0);
    blk.castShadow = true;
    blk.userData.isEnvironment = true;
    blocksGroup.add(blk);
  }
  const topBlk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), materials.matToyOrange);
  topBlk.position.set(0, 0.75, 0);
  topBlk.castShadow = true;
  topBlk.userData.isEnvironment = true;
  blocksGroup.add(topBlk);
  group.add(blocksGroup);

  // Wooden Toy Chest
  const chestGroup = new THREE.Group();
  chestGroup.position.set(-7.5, 0, -1.2);
  chestGroup.rotation.y = Math.PI / 6;
  chestGroup.userData.isEnvironment = true;

  const chestBox = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.3, 1.5), materials.matToyChest);
  chestBox.position.y = 0.65;
  chestBox.castShadow = true;
  chestBox.userData.isEnvironment = true;
  chestGroup.add(chestBox);

  const lidGeo = new THREE.CylinderGeometry(0.75, 0.75, 2.6, 14, 1, false, 0, Math.PI);
  const lidMesh = new THREE.Mesh(lidGeo, materials.matToyChest);
  lidMesh.rotation.z = Math.PI / 2;
  lidMesh.position.set(0, 1.3, 0);
  lidMesh.castShadow = true;
  lidMesh.userData.isEnvironment = true;
  chestGroup.add(lidMesh);
  group.add(chestGroup);

  return group;
}

/**
 * 7. COZY BENCH / BED CORNER:
 */
export function createBedCozyCorner(materials) {
  const group = new THREE.Group();
  group.name = 'bed_cozy_corner';
  group.position.set(-20.0, 0, -6.0);
  group.rotation.y = Math.PI / 2;
  group.userData.isEnvironment = true;

  const bedW = 3.2;
  const bedL = 4.8;

  const frame = new THREE.Mesh(new THREE.BoxGeometry(bedW, 0.4, bedL), materials.matWarmOak);
  frame.position.y = 0.4;
  frame.castShadow = true;
  frame.userData.isEnvironment = true;
  group.add(frame);

  const mattress = new THREE.Mesh(new THREE.BoxGeometry(bedW - 0.2, 0.5, bedL - 0.2), materials.matBedSheet);
  mattress.position.set(0, 0.75, 0);
  mattress.castShadow = true;
  mattress.userData.isEnvironment = true;
  group.add(mattress);

  const blanket = new THREE.Mesh(new THREE.BoxGeometry(bedW - 0.15, 0.14, 1.4), materials.matBlanketStripe);
  blanket.position.set(0, 1.05, bedL / 2 - 0.9);
  blanket.castShadow = true;
  blanket.userData.isEnvironment = true;
  group.add(blanket);

  const pillow = new THREE.Mesh(new THREE.BoxGeometry(bedW * 0.7, 0.22, 0.8), materials.matPillow);
  pillow.position.set(0, 1.1, -bedL / 2 + 0.75);
  pillow.userData.isEnvironment = true;
  group.add(pillow);

  // Teddy Bear
  const bear = new THREE.Group();
  bear.position.set(0.5, 1.1, -bedL / 2 + 1.4);
  bear.rotation.y = -Math.PI / 4;
  bear.userData.isEnvironment = true;

  const bBody = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), materials.matTeddyBear);
  bBody.position.y = 0.3;
  bBody.userData.isEnvironment = true;
  bear.add(bBody);

  const bHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), materials.matTeddyBear);
  bHead.position.y = 0.65;
  bHead.userData.isEnvironment = true;
  bear.add(bHead);

  group.add(bear);
  return group;
}

/**
 * 8. CENTRAL BUILD ZONE & SOFT LAYERED PLAY RUG:
 */
export function createBuildZoneRug(materials) {
  const group = new THREE.Group();
  group.name = 'central_build_zone_rug';
  group.userData.isEnvironment = true;

  const rugW = 25.0;
  const rugD = 27.0;

  // 1. Soft Ambient Occlusion Drop Shadow Plane
  const shadowGeo = new THREE.PlaneGeometry(rugW + 4.0, rugD + 4.0);
  const shadowMesh = new THREE.Mesh(shadowGeo, materials.matRugShadow);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.set(0, 0.002, 0);
  shadowMesh.userData.isEnvironment = true;
  group.add(shadowMesh);

  // 2. Main Soft Woven Linen Play Rug
  const rugGeo = new THREE.PlaneGeometry(rugW, rugD);
  const rugMesh = new THREE.Mesh(rugGeo, materials.matRugBase);
  rugMesh.rotation.x = -Math.PI / 2;
  rugMesh.position.set(0, 0.006, 0);
  rugMesh.receiveShadow = true;
  rugMesh.userData.isEnvironment = true;
  group.add(rugMesh);

  // 3. Braided Piping Outer Border Trim
  const borderThickness = 0.14;
  const borderH = 0.06;

  const borderN = new THREE.Mesh(new THREE.BoxGeometry(rugW, borderH, borderThickness), materials.matRugBorder);
  borderN.position.set(0, 0.015, -rugD / 2);
  borderN.userData.isEnvironment = true;
  group.add(borderN);

  const borderS = new THREE.Mesh(new THREE.BoxGeometry(rugW, borderH, borderThickness), materials.matRugBorder);
  borderS.position.set(0, 0.015, rugD / 2);
  borderS.userData.isEnvironment = true;
  group.add(borderS);

  const borderW_m = new THREE.Mesh(new THREE.BoxGeometry(borderThickness, borderH, rugD), materials.matRugBorder);
  borderW_m.position.set(-rugW / 2, 0.015, 0);
  borderW_m.userData.isEnvironment = true;
  group.add(borderW_m);

  const borderE_m = new THREE.Mesh(new THREE.BoxGeometry(borderThickness, borderH, rugD), materials.matRugBorder);
  borderE_m.position.set(rugW / 2, 0.015, 0);
  borderE_m.userData.isEnvironment = true;
  group.add(borderE_m);

  // 4. Soft Pastel Corner Floor Cushions
  const cushion1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 2.4), materials.matRugPillow);
  cushion1.rotation.y = Math.PI / 5;
  cushion1.position.set(-rugW / 2 + 2.2, 0.18, rugD / 2 - 2.2);
  cushion1.castShadow = true;
  cushion1.userData.isEnvironment = true;
  group.add(cushion1);

  const cushion2 = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.3, 1.9), materials.matToyTeal);
  cushion2.rotation.y = -Math.PI / 7;
  cushion2.position.set(-rugW / 2 + 3.2, 0.38, rugD / 2 - 2.8);
  cushion2.castShadow = true;
  cushion2.userData.isEnvironment = true;
  group.add(cushion2);

  return group;
}
