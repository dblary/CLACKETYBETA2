import * as THREE from 'three';

/**
 * Creates the procedural chalkboard canvas texture with "LET'S BUILD!" and playful drawings.
 */
function createChalkboardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Dark slate-green background with subtle chalk dust texture
  ctx.fillStyle = '#1c382b';
  ctx.fillRect(0, 0, 1024, 512);

  // Subtle chalk dust smudges
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  for (let i = 0; i < 40; i++) {
    const rx = Math.random() * 1024;
    const ry = Math.random() * 512;
    const rad = 20 + Math.random() * 80;
    ctx.beginPath();
    ctx.arc(rx, ry, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Border chalk line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 5;
  ctx.strokeRect(30, 25, 964, 462);

  // Main playful hand-lettered text: "LET'S BUILD!"
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 78px "Comic Sans MS", "Fredoka", "Bubblegum Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText("LET'S BUILD!", 512, 190);

  // Subtitle / Motto
  ctx.fillStyle = '#fde047'; // Sunny yellow chalk
  ctx.font = 'bold 36px "Comic Sans MS", sans-serif';
  ctx.fillText('⭐ TOY WORKSHOP ⭐', 512, 275);

  // Playful Hand-drawn Icons
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Star (top-left)
  drawChalkStar(ctx, 150, 110, 36, '#facc15');

  // 2. Cozy House with Chimney (bottom-left)
  drawChalkHouse(ctx, 150, 370, '#67e8f9');

  // 3. Rocket (top-right)
  drawChalkRocket(ctx, 870, 120, '#f472b6');

  // 4. Toy Car (bottom-right)
  drawChalkCar(ctx, 860, 380, '#4ade80');

  // 5. Happy Smiley Face (bottom-center)
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
  // Walls
  ctx.strokeRect(cx - 35, cy - 20, 70, 50);
  // Roof
  ctx.moveTo(cx - 45, cy - 20);
  ctx.lineTo(cx, cy - 60);
  ctx.lineTo(cx + 45, cy - 20);
  // Door & Window
  ctx.rect(cx - 12, cy + 5, 24, 25);
  ctx.rect(cx + 12, cy - 10, 14, 14);
  // Chimney
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
  // Body
  ctx.ellipse(cx, cy, 18, 45, -Math.PI / 6, 0, Math.PI * 2);
  // Fins
  ctx.moveTo(cx - 18, cy + 18);
  ctx.lineTo(cx - 36, cy + 38);
  ctx.lineTo(cx - 10, cy + 30);
  ctx.moveTo(cx + 18, cy + 18);
  ctx.lineTo(cx + 36, cy + 38);
  ctx.lineTo(cx + 10, cy + 30);
  // Window
  ctx.moveTo(cx + 8, cy - 8);
  ctx.arc(cx, cy - 8, 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawChalkCar(ctx, cx, cy, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.beginPath();
  // Body bottom
  ctx.strokeRect(cx - 45, cy - 5, 90, 22);
  // Cabin
  ctx.moveTo(cx - 20, cy - 5);
  ctx.lineTo(cx - 10, cy - 25);
  ctx.lineTo(cx + 20, cy - 25);
  ctx.lineTo(cx + 30, cy - 5);
  // Wheels
  ctx.moveTo(cx - 25 + 10, cy + 18);
  ctx.arc(cx - 25, cy + 18, 10, 0, Math.PI * 2);
  ctx.moveTo(cx + 25 + 10, cy + 18);
  ctx.arc(cx + 25, cy + 18, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawChalkSmiley(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  // Eyes
  ctx.moveTo(cx - 14, cy - 10);
  ctx.arc(cx - 14, cy - 10, 3, 0, Math.PI * 2);
  ctx.moveTo(cx + 14, cy - 10);
  ctx.arc(cx + 14, cy - 10, 3, 0, Math.PI * 2);
  // Smile
  ctx.moveTo(cx - 20, cy + 6);
  ctx.arc(cx, cy + 6, 20, 0.15 * Math.PI, 0.85 * Math.PI, false);
  ctx.stroke();
  ctx.restore();
}

/**
 * 1. ROOM STRUCTURE:
 * Wooden plank floor (InstancedMesh with warm color variation),
 * walls, ceiling beams, and wooden baseboard trims.
 */
export function createRoomStructure(materials) {
  const group = new THREE.Group();
  group.name = 'room_structure';
  group.userData.isEnvironment = true;

  // --- Expansive Warm Wood Foundation Subfloor (Prevents Any Void/Sky Under Floor) ---
  const subFloorGeo = new THREE.PlaneGeometry(140, 140);
  const subFloor = new THREE.Mesh(subFloorGeo, materials.matFloorPlank);
  subFloor.rotation.x = -Math.PI / 2;
  subFloor.position.set(0, -0.09, 0);
  subFloor.receiveShadow = true;
  subFloor.userData.isEnvironment = true;
  group.add(subFloor);

  // --- Instanced Wooden Floor Planks (High Performance, Single Draw Call) ---
  const roomW = 34;
  const roomD = 32;
  const plankW = 1.0;
  const plankL = 3.8;
  const plankH = 0.08;

  const cols = Math.ceil(roomW / plankW);
  const rows = Math.ceil(roomD / plankL);
  const totalPlanks = cols * rows;

  const plankGeo = new THREE.BoxGeometry(plankW * 0.97, plankH, plankL * 0.98);
  const instancedFloor = new THREE.InstancedMesh(plankGeo, materials.matFloorPlank, totalPlanks);
  instancedFloor.name = 'instanced_floor_planks';
  instancedFloor.receiveShadow = true;
  instancedFloor.userData.isEnvironment = true;

  const dummy = new THREE.Object3D();
  const plankTones = [
    new THREE.Color(0xb57a3c), // Honey oak
    new THREE.Color(0xc18645), // Golden pine
    new THREE.Color(0xa76d33), // Warm amber
    new THREE.Color(0xb97e3f), // Soft cedar
    new THREE.Color(0x9d642d)  // Deep chestnut
  ];

  let idx = 0;
  const startX = -roomW / 2 + plankW / 2;
  const startZ = -roomD / 2 + plankL / 2;

  for (let c = 0; c < cols; c++) {
    const x = startX + c * plankW;
    const staggeredOffset = (c % 2) * (plankL * 0.45);
    for (let r = 0; r < rows; r++) {
      let z = startZ + r * plankL + staggeredOffset;
      if (z > roomD / 2) z -= roomD;

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

  // --- Walls (Height 16.0 to prevent any sky showing when zooming out or rotating) ---
  const wallH = 16.0;
  const wallThick = 0.45;

  // 1. Back Wall
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(roomW + 2, wallH, wallThick),
    materials.matBackWall
  );
  backWall.name = 'backWall';
  backWall.position.set(0, wallH / 2, -14.2);
  backWall.receiveShadow = true;
  backWall.userData.isEnvironment = true;
  group.add(backWall);

  // 2. Left Wall
  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThick, wallH, 30),
    materials.matSideWall
  );
  leftWall.name = 'leftWall';
  leftWall.position.set(-16.0, wallH / 2, 0);
  leftWall.receiveShadow = true;
  leftWall.userData.isEnvironment = true;
  group.add(leftWall);

  // 3. Right Wall
  const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThick, wallH, 30),
    materials.matSideWall
  );
  rightWall.name = 'rightWall';
  rightWall.position.set(16.0, wallH / 2, 0);
  rightWall.receiveShadow = true;
  rightWall.userData.isEnvironment = true;
  group.add(rightWall);

  // 4. Front Wall with Wide Open Playroom Entrance (No blocking the build view)
  const frontZ = 14.2;
  const doorW = 13.0;
  const doorH = 11.5;
  const sideW = (roomW - doorW) / 2; // 10.5 each side

  // Front Left Section
  const frontLeft = new THREE.Mesh(
    new THREE.BoxGeometry(sideW, wallH, wallThick),
    materials.matSideWall
  );
  frontLeft.name = 'frontWall_left';
  frontLeft.position.set(-roomW / 2 + sideW / 2, wallH / 2, frontZ);
  frontLeft.receiveShadow = true;
  frontLeft.userData.isEnvironment = true;
  group.add(frontLeft);

  // Front Right Section
  const frontRight = new THREE.Mesh(
    new THREE.BoxGeometry(sideW, wallH, wallThick),
    materials.matSideWall
  );
  frontRight.name = 'frontWall_right';
  frontRight.position.set(roomW / 2 - sideW / 2, wallH / 2, frontZ);
  frontRight.receiveShadow = true;
  frontRight.userData.isEnvironment = true;
  group.add(frontRight);

  // Front Top Lintel above Doorway
  const frontTop = new THREE.Mesh(
    new THREE.BoxGeometry(doorW, wallH - doorH, wallThick),
    materials.matSideWall
  );
  frontTop.name = 'frontWall_top';
  frontTop.position.set(0, doorH + (wallH - doorH) / 2, frontZ);
  frontTop.receiveShadow = true;
  frontTop.userData.isEnvironment = true;
  group.add(frontTop);

  // Doorway Wooden Trim Casing
  const doorCasingL = new THREE.Mesh(new THREE.BoxGeometry(0.35, doorH, 0.55), materials.matWarmOak);
  doorCasingL.position.set(-doorW / 2 + 0.17, doorH / 2, frontZ);
  doorCasingL.userData.isEnvironment = true;
  group.add(doorCasingL);

  const doorCasingR = new THREE.Mesh(new THREE.BoxGeometry(0.35, doorH, 0.55), materials.matWarmOak);
  doorCasingR.position.set(doorW / 2 - 0.17, doorH / 2, frontZ);
  doorCasingR.userData.isEnvironment = true;
  group.add(doorCasingR);

  const doorCasingTop = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.6, 0.35, 0.55), materials.matWarmOak);
  doorCasingTop.position.set(0, doorH + 0.17, frontZ);
  doorCasingTop.userData.isEnvironment = true;
  group.add(doorCasingTop);

  // --- Baseboard Trims ---
  const trimH = 0.55;
  const trimD = 0.15;

  const baseBack = new THREE.Mesh(
    new THREE.BoxGeometry(roomW + 1, trimH, trimD),
    materials.matTrim
  );
  baseBack.position.set(0, trimH / 2, -14.2 + wallThick / 2 + trimD / 2);
  baseBack.receiveShadow = true;
  baseBack.userData.isEnvironment = true;
  group.add(baseBack);

  const baseLeft = new THREE.Mesh(
    new THREE.BoxGeometry(trimD, trimH, 30),
    materials.matTrim
  );
  baseLeft.position.set(-16.0 + wallThick / 2 + trimD / 2, trimH / 2, 0);
  baseLeft.receiveShadow = true;
  baseLeft.userData.isEnvironment = true;
  group.add(baseLeft);

  const baseRight = new THREE.Mesh(
    new THREE.BoxGeometry(trimD, trimH, 30),
    materials.matTrim
  );
  baseRight.position.set(16.0 - wallThick / 2 - trimD / 2, trimH / 2, 0);
  baseRight.receiveShadow = true;
  baseRight.userData.isEnvironment = true;
  group.add(baseRight);

  const baseFrontL = new THREE.Mesh(
    new THREE.BoxGeometry(sideW, trimH, trimD),
    materials.matTrim
  );
  baseFrontL.position.set(-roomW / 2 + sideW / 2, trimH / 2, frontZ - wallThick / 2 - trimD / 2);
  baseFrontL.userData.isEnvironment = true;
  group.add(baseFrontL);

  const baseFrontR = new THREE.Mesh(
    new THREE.BoxGeometry(sideW, trimH, trimD),
    materials.matTrim
  );
  baseFrontR.position.set(roomW / 2 - sideW / 2, trimH / 2, frontZ - wallThick / 2 - trimD / 2);
  baseFrontR.userData.isEnvironment = true;
  group.add(baseFrontR);

  // --- Warm Wooden Crown Moldings along Wall Tops ---
  const crownH = 0.35;
  const crownD = 0.35;

  const crownBack = new THREE.Mesh(new THREE.BoxGeometry(roomW + 2, crownH, crownD), materials.matDarkOak);
  crownBack.position.set(0, wallH - crownH / 2, -14.2 + wallThick / 2 + crownD / 2);
  crownBack.userData.isEnvironment = true;
  group.add(crownBack);

  const crownLeft = new THREE.Mesh(new THREE.BoxGeometry(crownD, crownH, 30), materials.matDarkOak);
  crownLeft.position.set(-16.0 + wallThick / 2 + crownD / 2, wallH - crownH / 2, 0);
  crownLeft.userData.isEnvironment = true;
  group.add(crownLeft);

  const crownRight = new THREE.Mesh(new THREE.BoxGeometry(crownD, crownH, 30), materials.matDarkOak);
  crownRight.position.set(16.0 - wallThick / 2 - crownD / 2, wallH - crownH / 2, 0);
  crownRight.userData.isEnvironment = true;
  group.add(crownRight);

  // --- Sturdy Dark Oak Ceiling Beams ---
  const beamW = 0.65;
  const beamH = 0.45;
  const beamZPositions = [-10, -5, 0, 5, 10];

  beamZPositions.forEach((bz) => {
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(roomW + 0.5, beamH, beamW),
      materials.matDarkOak
    );
    beam.position.set(0, wallH - beamH / 2 - 0.1, bz);
    beam.castShadow = true;
    beam.receiveShadow = true;
    beam.userData.isEnvironment = true;
    group.add(beam);
  });

  return group;
}

/**
 * 2. LARGE ARCHED WINDOW & OUTSIDE SCENERY:
 * A focal arched window on the back-right wall with layered rolling hills,
 * distant mountains, low-poly trees, cartoon river, and fluffy 3D clouds.
 */
export function createArchedWindowAndScenery(materials) {
  const group = new THREE.Group();
  group.name = 'arched_window_and_scenery';
  group.userData.isEnvironment = true;

  const winX = 7.2;
  const winY = 4.8;
  const winZ = -13.78;
  const winW = 6.2;
  const winH = 4.6;
  const archR = winW / 2;

  // Window Sill (Warm Oak ledge)
  const sill = new THREE.Mesh(
    new THREE.BoxGeometry(winW + 0.8, 0.35, 0.65),
    materials.matDarkOak
  );
  sill.position.set(winX, winY - winH / 2 - 0.15, winZ + 0.2);
  sill.castShadow = true;
  sill.receiveShadow = true;
  sill.userData.isEnvironment = true;
  group.add(sill);

  // Window Frame Sides
  const frameThick = 0.25;
  const frameD = 0.35;

  const frameL = new THREE.Mesh(
    new THREE.BoxGeometry(frameThick, winH, frameD),
    materials.matWindowFrame
  );
  frameL.position.set(winX - winW / 2 + frameThick / 2, winY, winZ);
  frameL.castShadow = true;
  frameL.userData.isEnvironment = true;
  group.add(frameL);

  const frameR = new THREE.Mesh(
    new THREE.BoxGeometry(frameThick, winH, frameD),
    materials.matWindowFrame
  );
  frameR.position.set(winX + winW / 2 - frameThick / 2, winY, winZ);
  frameR.castShadow = true;
  frameR.userData.isEnvironment = true;
  group.add(frameR);

  // Frame Bottom
  const frameB = new THREE.Mesh(
    new THREE.BoxGeometry(winW, frameThick, frameD),
    materials.matWindowFrame
  );
  frameB.position.set(winX, winY - winH / 2 + frameThick / 2, winZ);
  frameB.castShadow = true;
  frameB.userData.isEnvironment = true;
  group.add(frameB);

  // Middle Mullions (Muntin Bars)
  const mullionV = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, winH + archR * 0.9, frameD * 0.85),
    materials.matWindowFrame
  );
  mullionV.position.set(winX, winY + archR * 0.45, winZ);
  mullionV.castShadow = true;
  mullionV.userData.isEnvironment = true;
  group.add(mullionV);

  const mullionH1 = new THREE.Mesh(
    new THREE.BoxGeometry(winW, 0.12, frameD * 0.85),
    materials.matWindowFrame
  );
  mullionH1.position.set(winX, winY - 0.6, winZ);
  mullionH1.castShadow = true;
  mullionH1.userData.isEnvironment = true;
  group.add(mullionH1);

  const mullionH2 = new THREE.Mesh(
    new THREE.BoxGeometry(winW, 0.12, frameD * 0.85),
    materials.matWindowFrame
  );
  mullionH2.position.set(winX, winY + 1.2, winZ);
  mullionH2.castShadow = true;
  mullionH2.userData.isEnvironment = true;
  group.add(mullionH2);

  // Arched Arch Top (Torus segment)
  const archGeom = new THREE.TorusGeometry(archR - frameThick / 2, frameThick / 2, 12, 32, Math.PI);
  const archMesh = new THREE.Mesh(archGeom, materials.matWindowFrame);
  archMesh.rotation.z = 0;
  archMesh.position.set(winX, winY + winH / 2, winZ);
  archMesh.castShadow = true;
  archMesh.userData.isEnvironment = true;
  group.add(archMesh);

  // Glass Panes (Transparent sky tint)
  const glassRect = new THREE.Mesh(
    new THREE.PlaneGeometry(winW - 0.2, winH),
    materials.matWindowGlass
  );
  glassRect.position.set(winX, winY, winZ + 0.02);
  glassRect.userData.isEnvironment = true;
  group.add(glassRect);

  const glassArch = new THREE.Mesh(
    new THREE.CircleGeometry(archR - 0.15, 32, 0, Math.PI),
    materials.matWindowGlass
  );
  glassArch.position.set(winX, winY + winH / 2, winZ + 0.02);
  glassArch.userData.isEnvironment = true;
  group.add(glassArch);

  // --- Outside World Backdrop (Visible Beyond the Arch) ---
  const sceneryGroup = new THREE.Group();
  sceneryGroup.name = 'window_outside_scenery';
  sceneryGroup.position.set(winX, winY, winZ - 1.2);
  sceneryGroup.userData.isEnvironment = true;

  // Sky Backdrop Quad
  const skyPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 18),
    new THREE.MeshBasicMaterial({ color: 0xa5d8ff })
  );
  skyPlane.position.set(0, 3, -12);
  skyPlane.userData.isEnvironment = true;
  sceneryGroup.add(skyPlane);

  // Distant Mountain Peaks with Snow
  const mtn1 = new THREE.Mesh(new THREE.ConeGeometry(7.0, 10.0, 6), materials.matMountain);
  mtn1.position.set(-4.5, 2.5, -10.5);
  mtn1.userData.isEnvironment = true;
  sceneryGroup.add(mtn1);

  const snow1 = new THREE.Mesh(new THREE.ConeGeometry(2.5, 3.6, 6), materials.matSnowCap);
  snow1.position.set(-4.5, 5.7, -10.45);
  snow1.userData.isEnvironment = true;
  sceneryGroup.add(snow1);

  const mtn2 = new THREE.Mesh(new THREE.ConeGeometry(6.2, 8.5, 6), materials.matMountain);
  mtn2.position.set(4.0, 1.8, -9.5);
  mtn2.userData.isEnvironment = true;
  sceneryGroup.add(mtn2);

  const snow2 = new THREE.Mesh(new THREE.ConeGeometry(2.2, 3.0, 6), materials.matSnowCap);
  snow2.position.set(4.0, 4.5, -9.45);
  snow2.userData.isEnvironment = true;
  sceneryGroup.add(snow2);

  // Mid-ground Rolling Green Hills
  const hillFar = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), materials.matHillFar);
  hillFar.scale.set(1.4, 0.45, 0.7);
  hillFar.position.set(-3.0, -2.5, -6.5);
  hillFar.userData.isEnvironment = true;
  sceneryGroup.add(hillFar);

  const hillNear = new THREE.Mesh(new THREE.SphereGeometry(9, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), materials.matHillNear);
  hillNear.scale.set(1.3, 0.4, 0.6);
  hillNear.position.set(3.2, -2.2, -4.5);
  hillNear.userData.isEnvironment = true;
  sceneryGroup.add(hillNear);

  // Low-poly Pine and Puff Trees on Hills
  const treeCoords = [
    { x: -3.5, y: 0.2, z: -4.8, scale: 0.8 },
    { x: -2.0, y: -0.4, z: -4.2, scale: 0.65 },
    { x: 2.8, y: 0.1, z: -3.8, scale: 0.75 },
    { x: 4.5, y: -0.2, z: -4.5, scale: 0.9 }
  ];

  treeCoords.forEach((tc) => {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(tc.x, tc.y, tc.z);
    treeGroup.scale.set(tc.scale, tc.scale, tc.scale);
    treeGroup.userData.isEnvironment = true;

    // Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.2, 6), materials.matTrunk);
    trunk.position.y = 0.6;
    trunk.userData.isEnvironment = true;
    treeGroup.add(trunk);

    // Tiered Pine Foliage
    for (let t = 0; t < 3; t++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.9 - t * 0.2, 1.0, 7), materials.matFoliage);
      cone.position.y = 1.3 + t * 0.6;
      cone.userData.isEnvironment = true;
      treeGroup.add(cone);
    }
    sceneryGroup.add(treeGroup);
  });

  // Winding Cartoon Blue River
  const riverCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.0, -1.8, -7.0),
    new THREE.Vector3(0.5, -2.1, -5.0),
    new THREE.Vector3(-0.4, -2.4, -3.2),
    new THREE.Vector3(1.2, -2.6, -1.8)
  ]);
  const riverGeo = new THREE.TubeGeometry(riverCurve, 16, 0.55, 6, false);
  const riverMesh = new THREE.Mesh(riverGeo, materials.matRiver);
  riverMesh.userData.isEnvironment = true;
  sceneryGroup.add(riverMesh);

  // Fluffy 3D Clouds (Sphere Clusters)
  function createCloud(cx, cy, cz, scale = 1.0) {
    const cGroup = new THREE.Group();
    cGroup.position.set(cx, cy, cz);
    cGroup.scale.set(scale, scale, scale);
    cGroup.userData.isEnvironment = true;

    const puffs = [
      { x: 0, y: 0, z: 0, r: 0.9 },
      { x: 0.75, y: -0.1, z: 0, r: 0.7 },
      { x: -0.75, y: -0.15, z: 0, r: 0.65 },
      { x: 0.35, y: 0.45, z: 0, r: 0.72 },
      { x: -0.35, y: 0.35, z: 0, r: 0.6 }
    ];
    puffs.forEach((p) => {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(p.r, 8, 8), materials.matCloud);
      puff.position.set(p.x, p.y, p.z);
      puff.userData.isEnvironment = true;
      cGroup.add(puff);
    });
    return cGroup;
  }

  sceneryGroup.add(createCloud(-3.2, 5.0, -9.0, 1.2));
  sceneryGroup.add(createCloud(3.8, 6.2, -8.0, 0.9));

  // Glowing Golden Sun Disc
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(1.6, 24),
    new THREE.MeshBasicMaterial({ color: 0xfef08a })
  );
  sunDisc.position.set(5.5, 7.5, -11.5);
  sunDisc.userData.isEnvironment = true;
  sceneryGroup.add(sunDisc);

  group.add(sceneryGroup);
  return group;
}

/**
 * 3. BACK WALL DECORATIONS:
 * Chalkboard with "LET'S BUILD!" and colorful children's bunting flags across the top.
 */
export function createBackWallDecorations(materials) {
  const group = new THREE.Group();
  group.name = 'back_wall_decorations';
  group.userData.isEnvironment = true;

  // --- Chalkboard (Positioned Left-Center Back Wall: X: -3.8, Y: 5.4, Z: -13.7) ---
  const boardW = 6.2;
  const boardH = 3.2;
  const boardFrameThick = 0.22;
  const boardZ = -13.7;

  const cbGroup = new THREE.Group();
  cbGroup.position.set(-3.6, 5.4, boardZ);
  cbGroup.userData.isEnvironment = true;

  // Wooden Outer Frame
  const frameBack = new THREE.Mesh(
    new THREE.BoxGeometry(boardW + boardFrameThick * 2, boardH + boardFrameThick * 2, 0.12),
    materials.matWarmOak
  );
  frameBack.castShadow = true;
  frameBack.receiveShadow = true;
  frameBack.userData.isEnvironment = true;
  cbGroup.add(frameBack);

  // Slate Green Canvas Board with "LET'S BUILD!"
  const cbTex = createChalkboardTexture();
  const cbMat = new THREE.MeshStandardMaterial({
    map: cbTex,
    roughness: 0.65,
    metalness: 0.02
  });
  const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(boardW, boardH), cbMat);
  boardMesh.position.set(0, 0, 0.08);
  boardMesh.userData.isEnvironment = true;
  cbGroup.add(boardMesh);

  // Lower Chalk Ledge with Chalk Pieces & Eraser
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(boardW + 0.4, 0.14, 0.35), materials.matDarkOak);
  ledge.position.set(0, -boardH / 2 - 0.07, 0.18);
  ledge.castShadow = true;
  ledge.userData.isEnvironment = true;
  cbGroup.add(ledge);

  // Colored Chalk Sticks
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

  // --- Colorful Children's Bunting Garland (Catenary Arc along Top Back Wall) ---
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

  const totalFlags = 18;
  const buntingStartX = -14.0;
  const buntingEndX = 14.0;
  const buntingY = 8.5;

  // Thin hanging string
  const curvePoints = [];
  for (let i = 0; i <= totalFlags; i++) {
    const t = i / totalFlags;
    const x = THREE.MathUtils.lerp(buntingStartX, buntingEndX, t);
    // Slight sag in middle
    const sag = Math.sin(t * Math.PI) * 0.9;
    const y = buntingY - sag;
    const z = -13.6 + Math.sin(t * Math.PI) * 0.2;
    curvePoints.push(new THREE.Vector3(x, y, z));

    if (i < totalFlags) {
      // Triangle Flag
      const flagGeo = new THREE.BufferGeometry();
      const hw = 0.45;
      const fh = 0.75;
      const vertices = new Float32Array([
        -hw, 0, 0,
         hw, 0, 0,
          0, -fh, 0
      ]);
      flagGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      flagGeo.computeVertexNormals();

      const flagMesh = new THREE.Mesh(flagGeo, flagColors[i % flagColors.length]);
      flagMesh.position.set(x + 0.4, y, z);
      flagMesh.castShadow = true;
      flagMesh.userData.isEnvironment = true;
      buntingGroup.add(flagMesh);
    }
  }

  const stringCurve = new THREE.CatmullRomCurve3(curvePoints);
  const stringGeo = new THREE.TubeGeometry(stringCurve, 40, 0.02, 4, false);
  const stringMesh = new THREE.Mesh(stringGeo, materials.matWarmOak);
  stringMesh.userData.isEnvironment = true;
  buntingGroup.add(stringMesh);

  group.add(buntingGroup);
  return group;
}

/**
 * 4. CHILDREN'S WORKBENCH:
 * Wooden tabletop, 4 sturdy legs, lower shelf, pegboard back,
 * and colorful toy tools (hammer, screwdriver, wrench, pliers, saw).
 * Positioned on the left-back wall (X: -9.5, Z: -12.0) well away from the build zone.
 */
export function createChildrenWorkbench(materials) {
  const group = new THREE.Group();
  group.name = 'children_workbench';
  group.position.set(-9.2, 0, -11.8);
  group.userData.isEnvironment = true;

  const tableW = 4.2;
  const tableD = 1.9;
  const tableH = 2.4;
  const topThick = 0.22;

  // 1. Tabletop with warm rounded feel
  const top = new THREE.Mesh(new THREE.BoxGeometry(tableW, topThick, tableD), materials.matWarmOak);
  top.position.y = tableH;
  top.castShadow = true;
  top.receiveShadow = true;
  top.userData.isEnvironment = true;
  group.add(top);

  // 2. Four Legs
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

  // 3. Lower Shelf
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(tableW - 0.4, 0.12, tableD - 0.4), materials.matLightPine);
  shelf.position.y = 0.7;
  shelf.castShadow = true;
  shelf.receiveShadow = true;
  shelf.userData.isEnvironment = true;
  group.add(shelf);

  // 4. Pegboard Back Wall (Perforated board for hanging tools)
  const pbH = 2.4;
  const pb = new THREE.Mesh(new THREE.BoxGeometry(tableW, pbH, 0.12), materials.matPegboard);
  pb.position.set(0, tableH + pbH / 2, -tableD / 2 + 0.06);
  pb.castShadow = true;
  pb.receiveShadow = true;
  pb.userData.isEnvironment = true;
  group.add(pb);

  // 5. Hanging Toy Tools on Pegboard
  const toolsGroup = new THREE.Group();
  toolsGroup.position.set(0, tableH + 1.2, -tableD / 2 + 0.16);
  toolsGroup.userData.isEnvironment = true;

  // Tool 1: Toy Hammer (Red handle + grey box head)
  const hammer = new THREE.Group();
  hammer.position.set(-1.2, 0, 0);
  hammer.userData.isEnvironment = true;
  const hHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.7, 8), materials.matToyRed);
  hHandle.position.y = -0.15;
  hHandle.castShadow = true;
  hHandle.userData.isEnvironment = true;
  hammer.add(hHandle);
  const hHead = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.16), materials.matToyMetal);
  hHead.position.set(0.05, 0.22, 0);
  hHead.castShadow = true;
  hHead.userData.isEnvironment = true;
  hammer.add(hHead);
  toolsGroup.add(hammer);

  // Tool 2: Toy Screwdriver (Yellow handle + metal shaft)
  const driver = new THREE.Group();
  driver.position.set(-0.4, 0, 0);
  driver.userData.isEnvironment = true;
  const dHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.35, 10), materials.matToyYellow);
  dHandle.position.y = 0.15;
  dHandle.castShadow = true;
  dHandle.userData.isEnvironment = true;
  driver.add(dHandle);
  const dShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 8), materials.matToyMetal);
  dShaft.position.y = -0.2;
  dShaft.castShadow = true;
  dShaft.userData.isEnvironment = true;
  driver.add(dShaft);
  toolsGroup.add(driver);

  // Tool 3: Toy Wrench (Blue handle + metal open C-jaw)
  const wrench = new THREE.Group();
  wrench.position.set(0.4, 0, 0);
  wrench.userData.isEnvironment = true;
  const wBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.05), materials.matToyBlue);
  wBody.castShadow = true;
  wBody.userData.isEnvironment = true;
  wrench.add(wBody);
  const wJaw = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 8, 12, Math.PI * 1.5), materials.matToyMetal);
  wJaw.position.set(0, 0.32, 0);
  wJaw.castShadow = true;
  wJaw.userData.isEnvironment = true;
  wrench.add(wJaw);
  toolsGroup.add(wrench);

  // Tool 4: Toy Hand Saw (Green handle + silver blade)
  const saw = new THREE.Group();
  saw.position.set(1.2, 0, 0);
  saw.userData.isEnvironment = true;
  const sHandle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.05, 8, 16, Math.PI), materials.matToyGreen);
  sHandle.rotation.z = Math.PI / 2;
  sHandle.position.set(-0.15, 0.15, 0);
  sHandle.castShadow = true;
  sHandle.userData.isEnvironment = true;
  saw.add(sHandle);
  const sBlade = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.03), materials.matToyMetal);
  sBlade.position.set(0.18, 0.0, 0);
  sBlade.castShadow = true;
  sBlade.userData.isEnvironment = true;
  saw.add(sBlade);
  toolsGroup.add(saw);

  group.add(toolsGroup);

  // 6. Cute Toy Wooden Vise Clamp on Table Corner
  const vise = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.35), materials.matToyOrange);
  vise.position.set(-tableW / 2 + 0.35, tableH + 0.18, tableD / 2 - 0.25);
  vise.castShadow = true;
  vise.userData.isEnvironment = true;
  group.add(vise);

  return group;
}

/**
 * 5. LEFT WALL TOY SHELVES:
 * Multi-tier wooden shelves filled with 25+ colorful toys
 * (toy cars, trucks, colorful building block stacks, balls, puzzle cubes).
 */
export function createToyShelvesLeft(materials) {
  const group = new THREE.Group();
  group.name = 'toy_shelves_left';
  group.position.set(-14.4, 0, 2.5);
  group.rotation.y = Math.PI / 2;
  group.userData.isEnvironment = true;

  const unitW = 7.5;
  const unitD = 1.35;
  const unitH = 6.2;
  const shelfCount = 4;

  // Vertical Side Panels
  const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.18, unitH, unitD), materials.matWarmOak);
  sideL.position.set(-unitW / 2, unitH / 2, 0);
  sideL.castShadow = true;
  sideL.receiveShadow = true;
  sideL.userData.isEnvironment = true;
  group.add(sideL);

  const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.18, unitH, unitD), materials.matWarmOak);
  sideR.position.set(unitW / 2, unitH / 2, 0);
  sideR.castShadow = true;
  sideR.receiveShadow = true;
  sideR.userData.isEnvironment = true;
  group.add(sideR);

  // Shelves
  const shelfSpacing = (unitH - 0.4) / (shelfCount - 1);
  for (let s = 0; s < shelfCount; s++) {
    const y = 0.4 + s * shelfSpacing;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(unitW, 0.14, unitD), materials.matWarmOak);
    plank.position.set(0, y, 0);
    plank.castShadow = true;
    plank.receiveShadow = true;
    plank.userData.isEnvironment = true;
    group.add(plank);

    // Populate Each Shelf with Stylized Toys
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
    // Bottom Shelf: Colorful Storage Bins and Heavy Wooden Block Bins
    for (let b = 0; b < 3; b++) {
      const bx = -2.2 + b * 2.2;
      const bin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1.0), toyPlasticColors[(b * 2) % toyPlasticColors.length]);
      bin.position.set(bx, shelfY + 0.45, 0);
      bin.castShadow = true;
      bin.receiveShadow = true;
      bin.userData.isEnvironment = true;
      group.add(bin);
    }
  } else if (shelfIndex === 1) {
    // Shelf 1: Toy Cars and Trucks
    // Toy Car 1
    createToyCar(group, materials, -2.4, shelfY, materials.matToyRed);
    // Toy Truck 1
    createToyTruck(group, materials, 0.2, shelfY, materials.matToyBlue);
    // Striped Toy Ball
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), materials.matToyYellow);
    ball.position.set(2.4, shelfY + 0.45, 0);
    ball.castShadow = true;
    ball.userData.isEnvironment = true;
    group.add(ball);
  } else if (shelfIndex === 2) {
    // Shelf 2: Stacks of Colorful Building Blocks & Pyramids
    // Block Stack A
    for (let l = 0; l < 3; l++) {
      const blk = new THREE.Mesh(new THREE.BoxGeometry(0.7 - l * 0.15, 0.35, 0.6), toyPlasticColors[l % toyPlasticColors.length]);
      blk.position.set(-2.5, shelfY + 0.18 + l * 0.35, 0);
      blk.castShadow = true;
      blk.userData.isEnvironment = true;
      group.add(blk);
    }
    // Pull-along Wooden Train Engine
    createToyTrainEngine(group, materials, 0.0, shelfY);
    // Stack of round wooden rings (Rock-a-Stack)
    createRingStack(group, materials, 2.4, shelfY);
  } else if (shelfIndex === 3) {
    // Top Shelf: Toy Airplane, Star Blocks, Mini Clock
    createToyAirplane(group, materials, -1.8, shelfY, materials.matToyGreen);
    createToyCar(group, materials, 1.8, shelfY, materials.matToyYellow);
  }
}

function createToyCar(group, materials, x, y, bodyMat) {
  const car = new THREE.Group();
  car.position.set(x, y, 0);
  car.userData.isEnvironment = true;

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.38, 0.65), bodyMat);
  body.position.y = 0.32;
  body.castShadow = true;
  body.userData.isEnvironment = true;
  car.add(body);

  // Cabin
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.32, 0.58), materials.matWindowGlass);
  cab.position.set(-0.05, 0.64, 0);
  cab.castShadow = true;
  cab.userData.isEnvironment = true;
  car.add(cab);

  // Wheels
  const wGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.14, 12);
  const wOffsets = [
    [-0.38, 0.18, -0.36],
    [ 0.38, 0.18, -0.36],
    [-0.38, 0.18,  0.36],
    [ 0.38, 0.18,  0.36]
  ];
  wOffsets.forEach(([wx, wy, wz]) => {
    const wheel = new THREE.Mesh(wGeo, materials.matToyWheelRubber);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, wy, wz);
    wheel.castShadow = true;
    wheel.userData.isEnvironment = true;
    car.add(wheel);
  });

  group.add(car);
}

function createToyTruck(group, materials, x, y, cabMat) {
  const truck = new THREE.Group();
  truck.position.set(x, y, 0);
  truck.userData.isEnvironment = true;

  // Cab
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.7, 0.72), cabMat);
  cab.position.set(0.5, 0.48, 0);
  cab.castShadow = true;
  cab.userData.isEnvironment = true;
  truck.add(cab);

  // Bed
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 0.78), materials.matToyOrange);
  bed.position.set(-0.45, 0.4, 0);
  bed.castShadow = true;
  bed.userData.isEnvironment = true;
  truck.add(bed);

  // 6 Wheels
  const wGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.14, 12);
  const wOffsets = [
    [-0.75, 0.2, -0.42],
    [-0.15, 0.2, -0.42],
    [ 0.55, 0.2, -0.42],
    [-0.75, 0.2,  0.42],
    [-0.15, 0.2,  0.42],
    [ 0.55, 0.2,  0.42]
  ];
  wOffsets.forEach(([wx, wy, wz]) => {
    const wheel = new THREE.Mesh(wGeo, materials.matToyWheelRubber);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, wy, wz);
    wheel.castShadow = true;
    wheel.userData.isEnvironment = true;
    truck.add(wheel);
  });

  group.add(truck);
}

function createToyTrainEngine(group, materials, x, y) {
  const train = new THREE.Group();
  train.position.set(x, y, 0);
  train.userData.isEnvironment = true;

  // Boiler
  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.1, 14), materials.matToyBlue);
  boiler.rotation.z = Math.PI / 2;
  boiler.position.set(-0.15, 0.48, 0);
  boiler.castShadow = true;
  boiler.userData.isEnvironment = true;
  train.add(boiler);

  // Cab
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.75, 0.65), materials.matToyRed);
  cab.position.set(0.55, 0.55, 0);
  cab.castShadow = true;
  cab.userData.isEnvironment = true;
  train.add(cab);

  // Smokestack
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.35, 10), materials.matToyYellow);
  stack.position.set(-0.5, 0.85, 0);
  stack.castShadow = true;
  stack.userData.isEnvironment = true;
  train.add(stack);

  group.add(train);
}

function createRingStack(group, materials, x, y) {
  const stack = new THREE.Group();
  stack.position.set(x, y, 0);
  stack.userData.isEnvironment = true;

  // Base and rod
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.9, 10), materials.matWarmOak);
  rod.position.y = 0.45;
  rod.castShadow = true;
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
    const ringR = 0.42 - r * 0.06;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(ringR, 0.08, 8, 16), colors[r]);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.1 + r * 0.15;
    ring.castShadow = true;
    ring.userData.isEnvironment = true;
    stack.add(ring);
  }

  group.add(stack);
}

function createToyAirplane(group, materials, x, y, bodyMat) {
  const plane = new THREE.Group();
  plane.position.set(x, y, 0);
  plane.userData.isEnvironment = true;

  // Fuselage
  const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.4, 12), bodyMat);
  fuse.rotation.z = Math.PI / 2;
  fuse.position.y = 0.4;
  fuse.castShadow = true;
  fuse.userData.isEnvironment = true;
  plane.add(fuse);

  // Wings
  const wings = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 1.8), materials.matToyYellow);
  wings.position.set(0.15, 0.42, 0);
  wings.castShadow = true;
  wings.userData.isEnvironment = true;
  plane.add(wings);

  // Tail Fin
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.35, 0.05), materials.matToyRed);
  tail.position.set(-0.55, 0.62, 0);
  tail.castShadow = true;
  tail.userData.isEnvironment = true;
  plane.add(tail);

  // Propeller Spinner
  const prop = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.08), materials.matToyBlue);
  prop.position.set(0.72, 0.4, 0);
  prop.castShadow = true;
  prop.userData.isEnvironment = true;
  plane.add(prop);

  group.add(plane);
}

/**
 * 6. RIGHT WALL TOY STORAGE:
 * 3x2 cubby storage organizer, toy construction vehicle,
 * storage bins, and stacked toy blocks along the right wall.
 */
export function createToyStorageRight(materials) {
  const group = new THREE.Group();
  group.name = 'toy_storage_right';
  group.position.set(14.4, 0, 1.0);
  group.rotation.y = -Math.PI / 2;
  group.userData.isEnvironment = true;

  const cubbyW = 6.4;
  const cubbyH = 4.2;
  const cubbyD = 1.35;

  // Outer frame
  const frameMat = materials.matLightPine;
  const outerBox = new THREE.Mesh(new THREE.BoxGeometry(cubbyW, cubbyH, cubbyD), frameMat);
  outerBox.position.y = cubbyH / 2;
  outerBox.castShadow = true;
  outerBox.receiveShadow = true;
  outerBox.userData.isEnvironment = true;
  group.add(outerBox);

  // 6 Open Cubby Insets
  const cellW = cubbyW / 3 - 0.2;
  const cellH = cubbyH / 2 - 0.2;
  const cellD = cubbyD + 0.05;

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
    const cy = 1.0 + row * 2.0;
    for (let col = 0; col < 3; col++) {
      const cx = -2.1 + col * 2.1;
      const binMesh = new THREE.Mesh(new THREE.BoxGeometry(cellW * 0.9, cellH * 0.85, cubbyD * 0.9), binColors[bIdx % binColors.length]);
      binMesh.position.set(cx, cy, 0.08);
      binMesh.castShadow = true;
      binMesh.receiveShadow = true;
      binMesh.userData.isEnvironment = true;
      group.add(binMesh);
      bIdx++;
    }
  }

  // Large Toy Crane on Top of Cubby
  const craneGroup = new THREE.Group();
  craneGroup.position.set(-1.4, cubbyH, 0);
  craneGroup.userData.isEnvironment = true;

  const craneBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 0.8), materials.matToyYellow);
  craneBase.position.y = 0.25;
  craneBase.castShadow = true;
  craneBase.userData.isEnvironment = true;
  craneGroup.add(craneBase);

  const craneBoom = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.4, 0.14), materials.matToyMetal);
  craneBoom.rotation.z = -Math.PI / 4;
  craneBoom.position.set(0.4, 0.9, 0);
  craneBoom.castShadow = true;
  craneBoom.userData.isEnvironment = true;
  craneGroup.add(craneBoom);
  group.add(craneGroup);

  // Decorative Toy Rocket on Top Right
  const rocket = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.2, 10), materials.matToyRed);
  rocket.position.set(1.8, cubbyH + 0.6, 0);
  rocket.castShadow = true;
  rocket.userData.isEnvironment = true;
  group.add(rocket);

  return group;
}

/**
 * 7. BED / COZY READING CORNER:
 * Wooden four-post child's bed on far left (X: -12.5, Z: -6.5)
 * with soft quilted mattress, pillows, and a cute teddy bear.
 */
export function createBedCozyCorner(materials) {
  const group = new THREE.Group();
  group.name = 'bed_cozy_corner';
  group.position.set(-13.0, 0, -6.5);
  group.rotation.y = Math.PI / 2;
  group.userData.isEnvironment = true;

  const bedW = 3.6;
  const bedL = 5.2;
  const bedH = 1.2;

  // Sturdy Wooden Frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(bedW, 0.45, bedL), materials.matWarmOak);
  frame.position.y = 0.45;
  frame.castShadow = true;
  frame.receiveShadow = true;
  frame.userData.isEnvironment = true;
  group.add(frame);

  // Four Corner Posts with Rounded Finials
  const postH = 1.6;
  const postOffsets = [
    [-bedW / 2 + 0.15, -bedL / 2 + 0.15],
    [ bedW / 2 - 0.15, -bedL / 2 + 0.15],
    [-bedW / 2 + 0.15,  bedL / 2 - 0.15],
    [ bedW / 2 - 0.15,  bedL / 2 - 0.15]
  ];

  postOffsets.forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, postH, 10), materials.matDarkOak);
    post.position.set(px, postH / 2, pz);
    post.castShadow = true;
    post.userData.isEnvironment = true;
    group.add(post);

    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), materials.matDarkOak);
    finial.position.set(px, postH + 0.12, pz);
    finial.castShadow = true;
    finial.userData.isEnvironment = true;
    group.add(finial);
  });

  // Headboard
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(bedW - 0.2, 1.4, 0.18), materials.matWarmOak);
  headboard.position.set(0, 1.2, -bedL / 2 + 0.15);
  headboard.castShadow = true;
  headboard.userData.isEnvironment = true;
  group.add(headboard);

  // Soft Mattress & Yellow Quilt
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(bedW - 0.25, 0.55, bedL - 0.25), materials.matBedSheet);
  mattress.position.set(0, 0.85, 0);
  mattress.castShadow = true;
  mattress.receiveShadow = true;
  mattress.userData.isEnvironment = true;
  group.add(mattress);

  // Folded Turquoise Blanket at Foot
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(bedW - 0.2, 0.15, 1.6), materials.matBlanketStripe);
  blanket.position.set(0, 1.15, bedL / 2 - 1.0);
  blanket.castShadow = true;
  blanket.userData.isEnvironment = true;
  group.add(blanket);

  // Puffy White Pillow
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(bedW * 0.7, 0.24, 0.9), materials.matPillow);
  pillow.position.set(0, 1.22, -bedL / 2 + 0.85);
  pillow.castShadow = true;
  pillow.userData.isEnvironment = true;
  group.add(pillow);

  // Cute Little Brown Teddy Bear on the Bed
  const bear = new THREE.Group();
  bear.position.set(0.6, 1.25, -bedL / 2 + 1.6);
  bear.rotation.y = -Math.PI / 4;
  bear.userData.isEnvironment = true;

  // Body
  const bBody = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), materials.matTeddyBear);
  bBody.position.y = 0.32;
  bBody.castShadow = true;
  bBody.userData.isEnvironment = true;
  bear.add(bBody);

  // Head
  const bHead = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), materials.matTeddyBear);
  bHead.position.y = 0.72;
  bHead.castShadow = true;
  bHead.userData.isEnvironment = true;
  bear.add(bHead);

  // Ears
  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), materials.matTeddyBear);
  earL.position.set(-0.16, 0.9, 0);
  earL.userData.isEnvironment = true;
  bear.add(earL);

  const earR = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), materials.matTeddyBear);
  earR.position.set(0.16, 0.9, 0);
  earR.userData.isEnvironment = true;
  bear.add(earR);

  group.add(bear);
  return group;
}

/**
 * 8. CENTRAL BUILD ZONE & PLAY RUG:
 * Subtle large rounded play mat / rug under the central building area
 * (60% open central floor, soft neutral linen pastel with blue fringe).
 */
export function createBuildZoneRug(materials) {
  const group = new THREE.Group();
  group.name = 'central_build_zone_rug';
  group.userData.isEnvironment = true;

  const rugW = 14.5;
  const rugD = 15.5;

  // Main soft rug center (pure, clean soft linen play mat)
  const rugGeo = new THREE.PlaneGeometry(rugW, rugD);
  const rugMesh = new THREE.Mesh(rugGeo, materials.matRugBase);
  rugMesh.rotation.x = -Math.PI / 2;
  rugMesh.position.set(0, 0.005, 0);
  rugMesh.receiveShadow = true;
  rugMesh.userData.isEnvironment = true;
  group.add(rugMesh);

  return group;
}
