import * as THREE from 'three';

/**
 * homeEnvironment.js
 * 
 * Playroom 3D environment for Clackety 3D Builder Home Screen:
 * - Warm wooden plank floor, cedar walls, oak ceiling beams
 * - Large arched window on the right with mountain scenery, waterfall, castle, trees, animated clouds
 * - Circular braided children's play rug in foreground
 * - Furniture: toy shelves, teepee tent, workbench, chalkboard, beanbag chair
 * - Hanging fairy lights with soft twinkle/flicker
 * - Golden dust sparkle particles in sunbeams
 * - Perimeter floating colorful bricks
 */

export class HomeEnvironment {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

    this.group = new THREE.Group();
    this.group.name = 'home_environment_root';
    this.group.userData.isEnvironment = true;

    this.animatedObjects = {
      clouds: [],
      fairyLights: [],
      particles: null,
      floatingBricks: [],
      waterfall: null,
      trees: []
    };

    this.time = 0;

    this.initMaterials();
    this.build();
    this.scene.add(this.group);
  }

  initMaterials() {
    this.materials = {
      woodFloor: new THREE.MeshStandardMaterial({ color: 0xc48c52, roughness: 0.65, metalness: 0.05 }),
      woodDarkOak: new THREE.MeshStandardMaterial({ color: 0x6e3c1b, roughness: 0.72, metalness: 0.04 }),
      woodWarmOak: new THREE.MeshStandardMaterial({ color: 0xaa6e35, roughness: 0.65, metalness: 0.05 }),
      wallPlanks: new THREE.MeshStandardMaterial({ color: 0xe8bc8a, roughness: 0.75, metalness: 0.02, side: THREE.FrontSide }),
      windowFrame: new THREE.MeshStandardMaterial({ color: 0xb5783f, roughness: 0.6, metalness: 0.05 }),
      windowGlass: new THREE.MeshPhysicalMaterial({
        color: 0xdaf2ff,
        transparent: true,
        opacity: 0.22,
        roughness: 0.1,
        transmission: 0.85,
        thickness: 0.2
      }),
      skyBlue: new THREE.MeshBasicMaterial({ color: 0x60bbf5 }),
      cloudWhite: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
      mountainRock: new THREE.MeshStandardMaterial({ color: 0x7c8ba1, roughness: 0.85, flatShading: true }),
      snowCap: new THREE.MeshStandardMaterial({ color: 0xf0f6ff, roughness: 0.5, flatShading: true }),
      hillGreenFar: new THREE.MeshStandardMaterial({ color: 0x5fa84d, roughness: 0.8, flatShading: true }),
      hillGreenNear: new THREE.MeshStandardMaterial({ color: 0x489635, roughness: 0.75, flatShading: true }),
      treeTrunk: new THREE.MeshStandardMaterial({ color: 0x5d3a1a, roughness: 0.85 }),
      foliageGreen: new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.7, flatShading: true }),
      waterfallWater: new THREE.MeshStandardMaterial({ color: 0xa5f3fc, roughness: 0.1, transparent: true, opacity: 0.9 }),
      castleStone: new THREE.MeshStandardMaterial({ color: 0xefd8b8, roughness: 0.7 }),
      castleRoof: new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.6 }),
      rugBase: new THREE.MeshStandardMaterial({ color: 0xfbf8ee, roughness: 0.85 }),
      rugBorderBlue: new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.8 }),
      rugBorderYellow: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.8 }),
      brickRed: new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.25, metalness: 0.05 }),
      brickBlue: new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.25, metalness: 0.05 }),
      brickYellow: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.05 }),
      brickGreen: new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.25, metalness: 0.05 })
    };
  }

  build() {
    this.createRoomStructure();
    this.createArchedWindowScenery();
    this.createPlayAreaRug();
    this.createPlayroomDecorations();
    this.createFloatingDecorBricks();
    this.createFairyLights();
    this.createSunbeamSparkles();
  }

  createRoomStructure() {
    const roomW = 28;
    const roomD = 24;
    const roomH = 14;

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), this.materials.woodFloor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    floor.receiveShadow = true;
    this.group.add(floor);

    const lineMat = new THREE.MeshBasicMaterial({ color: 0x8a5528, transparent: true, opacity: 0.3 });
    for (let x = -roomW / 2 + 1.2; x < roomW / 2; x += 1.2) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.02, roomD), lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.002, 0);
      this.group.add(line);
    }

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(roomW, roomH, 0.4), this.materials.wallPlanks);
    backWall.name = 'backWall';
    backWall.position.set(0, roomH / 2, -10);
    backWall.receiveShadow = true;
    this.group.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, roomH, roomD), this.materials.wallPlanks);
    leftWall.name = 'leftWall';
    leftWall.position.set(-roomW / 2, roomH / 2, 0);
    leftWall.receiveShadow = true;
    this.group.add(leftWall);

    this.group.traverse((child) => {
      if (child.isMesh && (child.name.toLowerCase().includes('wall') || child.material?.name?.toLowerCase().includes('wall'))) {
        child.material.side = THREE.FrontSide;
        child.material.needsUpdate = true;
      }
    });

    const baseBack = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.45, 0.12), this.materials.woodDarkOak);
    baseBack.position.set(0, 0.225, -9.8);
    this.group.add(baseBack);

    [-7, -3, 1, 5].forEach((bz) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.4, 0.5), this.materials.woodDarkOak);
      beam.position.set(0, roomH - 0.2, bz);
      beam.castShadow = true;
      this.group.add(beam);
    });
  }

  createArchedWindowScenery() {
    const winGroup = new THREE.Group();
    winGroup.name = 'arched_window_group';

    const winX = 6.8;
    const winY = 4.2;
    const winZ = -9.75;
    const winW = 6.8;
    const winH = 5.2;
    const archR = winW / 2;

    winGroup.position.set(winX, winY, winZ);

    const frameThick = 0.32;
    const frameD = 0.45;

    const sill = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.8, 0.4, 0.7), this.materials.woodDarkOak);
    sill.position.set(0, -winH / 2 - 0.15, 0.15);
    sill.castShadow = true;
    winGroup.add(sill);

    const postL = new THREE.Mesh(new THREE.BoxGeometry(frameThick, winH, frameD), this.materials.windowFrame);
    postL.position.set(-winW / 2 + frameThick / 2, 0, 0);
    winGroup.add(postL);

    const postR = new THREE.Mesh(new THREE.BoxGeometry(frameThick, winH, frameD), this.materials.windowFrame);
    postR.position.set(winW / 2 - frameThick / 2, 0, 0);
    winGroup.add(postR);

    const archGeom = new THREE.TorusGeometry(archR - frameThick / 2, frameThick / 2, 16, 36, Math.PI);
    const archMesh = new THREE.Mesh(archGeom, this.materials.windowFrame);
    archMesh.position.set(0, winH / 2, 0);
    winGroup.add(archMesh);

    const centerMullion = new THREE.Mesh(new THREE.BoxGeometry(0.14, winH + archR * 0.9, frameD * 0.85), this.materials.windowFrame);
    centerMullion.position.set(0, archR * 0.45, 0);
    winGroup.add(centerMullion);

    const transom1 = new THREE.Mesh(new THREE.BoxGeometry(winW, 0.12, frameD * 0.8), this.materials.windowFrame);
    transom1.position.set(0, -0.6, 0);
    winGroup.add(transom1);

    const transom2 = new THREE.Mesh(new THREE.BoxGeometry(winW, 0.12, frameD * 0.8), this.materials.windowFrame);
    transom2.position.set(0, 1.4, 0);
    winGroup.add(transom2);

    const glass = new THREE.Mesh(new THREE.PlaneGeometry(winW - 0.2, winH), this.materials.windowGlass);
    glass.position.set(0, 0, 0.05);
    winGroup.add(glass);

    const glassArch = new THREE.Mesh(new THREE.CircleGeometry(archR - 0.15, 32, 0, Math.PI), this.materials.windowGlass);
    glassArch.position.set(0, winH / 2, 0.05);
    winGroup.add(glassArch);

    // Outside Scenery Backdrop
    const sceneryGroup = new THREE.Group();
    sceneryGroup.position.set(0, 0, -1.8);

    const sky = new THREE.Mesh(new THREE.PlaneGeometry(36, 26), this.materials.skyBlue);
    sky.position.set(0, 4, -14);
    sceneryGroup.add(sky);

    const mtnBack1 = new THREE.Mesh(new THREE.ConeGeometry(8.5, 12, 6), this.materials.mountainRock);
    mtnBack1.position.set(-4.5, 3.5, -11.5);
    sceneryGroup.add(mtnBack1);

    const snow1 = new THREE.Mesh(new THREE.ConeGeometry(3.0, 4.4, 6), this.materials.snowCap);
    snow1.position.set(-4.5, 7.3, -11.4);
    sceneryGroup.add(snow1);

    const mtnBack2 = new THREE.Mesh(new THREE.ConeGeometry(7.2, 10.5, 6), this.materials.mountainRock);
    mtnBack2.position.set(4.2, 2.8, -10.5);
    sceneryGroup.add(mtnBack2);

    const snow2 = new THREE.Mesh(new THREE.ConeGeometry(2.6, 3.8, 6), this.materials.snowCap);
    snow2.position.set(4.2, 6.2, -10.4);
    sceneryGroup.add(snow2);

    const castleGroup = new THREE.Group();
    castleGroup.position.set(5.2, 3.2, -8.5);
    castleGroup.scale.set(0.65, 0.65, 0.65);
    const castleTower = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 3.5, 10), this.materials.castleStone);
    castleTower.position.y = 1.75;
    castleGroup.add(castleTower);
    const castleCone = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.2, 10), this.materials.castleRoof);
    castleCone.position.y = 4.6;
    castleGroup.add(castleCone);
    sceneryGroup.add(castleGroup);

    const hill1 = new THREE.Mesh(new THREE.SphereGeometry(12, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), this.materials.hillGreenFar);
    hill1.scale.set(1.5, 0.45, 0.7);
    hill1.position.set(-3.5, -3.2, -7.5);
    sceneryGroup.add(hill1);

    const hill2 = new THREE.Mesh(new THREE.SphereGeometry(10, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), this.materials.hillGreenNear);
    hill2.scale.set(1.4, 0.4, 0.6);
    hill2.position.set(3.8, -2.8, -5.5);
    sceneryGroup.add(hill2);

    const wfMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 4.2), this.materials.waterfallWater);
    wfMesh.position.set(-1.8, 0.2, -6.0);
    sceneryGroup.add(wfMesh);
    this.animatedObjects.waterfall = wfMesh;

    [
      { x: -3.8, y: -0.4, z: -5.2, s: 0.9 },
      { x: -2.2, y: -0.8, z: -4.5, s: 0.7 },
      { x: 2.2, y: -0.6, z: -4.8, s: 0.8 },
      { x: 3.6, y: -0.2, z: -5.2, s: 1.0 }
    ].forEach((tp) => {
      const tree = new THREE.Group();
      tree.position.set(tp.x, tp.y, tp.z);
      tree.scale.set(tp.s, tp.s, tp.s);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.2, 6), this.materials.treeTrunk);
      trunk.position.y = 0.6;
      tree.add(trunk);
      for (let t = 0; t < 3; t++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.95 - t * 0.22, 1.1, 7), this.materials.foliageGreen);
        cone.position.y = 1.3 + t * 0.65;
        tree.add(cone);
      }
      this.animatedObjects.trees.push(tree);
      sceneryGroup.add(tree);
    });

    const createCloud = (x, y, z, s) => {
      const c = new THREE.Group();
      c.position.set(x, y, z);
      c.scale.set(s, s, s);
      c.userData.speed = 0.18 + Math.random() * 0.12;
      const puffs = [
        { x: 0, y: 0, z: 0, r: 1.0 },
        { x: 0.85, y: -0.1, z: 0, r: 0.75 },
        { x: -0.85, y: -0.12, z: 0, r: 0.7 },
        { x: 0.35, y: 0.5, z: 0, r: 0.78 }
      ];
      puffs.forEach((p) => {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.r, 10, 10), this.materials.cloudWhite);
        mesh.position.set(p.x, p.y, p.z);
        c.add(mesh);
      });
      return c;
    };

    const cloud1 = createCloud(-4.2, 5.2, -9.5, 1.25);
    const cloud2 = createCloud(3.2, 6.4, -9.0, 0.95);
    this.animatedObjects.clouds.push(cloud1, cloud2);
    sceneryGroup.add(cloud1, cloud2);

    winGroup.add(sceneryGroup);
    this.group.add(winGroup);
  }

  createPlayAreaRug() {
    const rugGroup = new THREE.Group();
    rugGroup.position.set(-0.6, 0.015, 0.8);
    const radius = 4.6;

    const rugCenter = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), this.materials.rugBase);
    rugCenter.rotation.x = -Math.PI / 2;
    rugCenter.receiveShadow = true;
    rugGroup.add(rugCenter);

    const ringBlue = new THREE.Mesh(new THREE.RingGeometry(radius - 0.38, radius, 48), this.materials.rugBorderBlue);
    ringBlue.rotation.x = -Math.PI / 2;
    ringBlue.position.y = 0.002;
    rugGroup.add(ringBlue);

    const ringYellow = new THREE.Mesh(new THREE.RingGeometry(radius - 0.75, radius - 0.52, 48), this.materials.rugBorderYellow);
    ringYellow.rotation.x = -Math.PI / 2;
    ringYellow.position.y = 0.003;
    rugGroup.add(ringYellow);

    const dotsCount = 28;
    const dotGeo = new THREE.CircleGeometry(0.08, 12);
    for (let i = 0; i < dotsCount; i++) {
      const angle = (i / dotsCount) * Math.PI * 2;
      const dot = new THREE.Mesh(dotGeo, this.materials.rugBorderBlue);
      dot.rotation.x = -Math.PI / 2;
      dot.position.set(Math.cos(angle) * (radius - 1.1), 0.004, Math.sin(angle) * (radius - 1.1));
      rugGroup.add(dot);
    }

    this.group.add(rugGroup);
  }

  createPlayroomDecorations() {
    const shelfGroup = new THREE.Group();
    shelfGroup.position.set(-10.5, 0, -4.5);
    const shelfW = 4.8, shelfH = 7.5, shelfD = 1.6;
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.2, shelfH, shelfD), this.materials.woodWarmOak);
    sideL.position.set(-shelfW / 2, shelfH / 2, 0);
    shelfGroup.add(sideL);
    const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.2, shelfH, shelfD), this.materials.woodWarmOak);
    sideR.position.set(shelfW / 2, shelfH / 2, 0);
    shelfGroup.add(sideR);
    for (let y = 0.4; y <= shelfH; y += 1.8) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(shelfW, 0.18, shelfD), this.materials.woodWarmOak);
      plank.position.set(0, y, 0);
      shelfGroup.add(plank);
    }
    this.group.add(shelfGroup);

    const teepeeGroup = new THREE.Group();
    teepeeGroup.position.set(-8.5, 0, 1.8);
    const teepeeMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.8 });
    const teepeeCone = new THREE.Mesh(new THREE.ConeGeometry(2.4, 4.5, 7, 1, true), teepeeMat);
    teepeeCone.position.y = 2.25;
    teepeeGroup.add(teepeeCone);
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 5.6, 6), this.materials.woodDarkOak);
      pole.position.set(Math.cos(a) * 0.25, 2.8, Math.sin(a) * 0.25);
      pole.rotation.x = 0.22 * Math.cos(a);
      pole.rotation.z = 0.22 * Math.sin(a);
      teepeeGroup.add(pole);
    }
    this.group.add(teepeeGroup);

    const cbGroup = new THREE.Group();
    cbGroup.position.set(-2.5, 5.2, -9.75);
    const cbFrame = new THREE.Mesh(new THREE.BoxGeometry(5.1, 3.3, 0.1), this.materials.woodDarkOak);
    cbGroup.add(cbFrame);

    const cbCanvas = document.createElement('canvas');
    cbCanvas.width = 1024;
    cbCanvas.height = 640;
    const ctx = cbCanvas.getContext('2d');
    ctx.fillStyle = '#1e3328';
    ctx.fillRect(0, 0, 1024, 640);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 6;
    ctx.strokeRect(25, 25, 974, 590);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Dream', 512, 160);
    ctx.fillText('Build', 512, 250);
    ctx.fillText('Create ✨', 512, 340);
    ctx.font = '40px sans-serif';
    ctx.fillText('🚀', 780, 220);
    ctx.fillText('⭐', 220, 440);

    const cbTex = new THREE.CanvasTexture(cbCanvas);
    const cbMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 3.0), new THREE.MeshStandardMaterial({ map: cbTex, roughness: 0.7 }));
    cbMesh.position.z = 0.06;
    cbGroup.add(cbMesh);
    this.group.add(cbGroup);

    const benchGroup = new THREE.Group();
    benchGroup.position.set(-2.5, 0, -8.6);
    const bTop = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.22, 1.8), this.materials.woodWarmOak);
    bTop.position.y = 2.1;
    benchGroup.add(bTop);
    [[-1.8, -0.7], [1.8, -0.7], [-1.8, 0.7], [1.8, 0.7]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.1, 8), this.materials.woodDarkOak);
      leg.position.set(lx, 1.05, lz);
      benchGroup.add(leg);
    });
    this.group.add(benchGroup);

    const bbGroup = new THREE.Group();
    bbGroup.position.set(2.4, 0, -5.2);
    const bbMesh = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 12), this.materials.brickBlue);
    bbMesh.scale.set(1.2, 0.7, 1.2);
    bbMesh.position.y = 0.65;
    bbGroup.add(bbMesh);
    this.group.add(bbGroup);
  }

  createFloatingDecorBricks() {
    const configs = [
      { type: '2x4', mat: this.materials.brickRed, pos: [-4.6, 3.8, 4.5], scale: 0.9, speed: 0.8 },
      { type: '2x2', mat: this.materials.brickYellow, pos: [-5.2, 1.6, 5.0], scale: 0.8, speed: 1.1 },
      { type: '2x4', mat: this.materials.brickBlue, pos: [4.8, 4.8, 4.0], scale: 0.85, speed: 0.7 },
      { type: 'slope', mat: this.materials.brickGreen, pos: [5.4, 0.8, 4.8], scale: 0.95, speed: 0.9 }
    ];

    const studGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12);

    configs.forEach((cfg, idx) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      bGroup.scale.set(cfg.scale, cfg.scale, cfg.scale);
      bGroup.userData.baseY = cfg.pos[1];
      bGroup.userData.speed = cfg.speed;
      bGroup.userData.offset = idx * 1.3;

      let w = 0.6, h = 0.38, d = 1.0;
      if (cfg.type === '2x2') { w = 0.6; d = 0.6; }

      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cfg.mat);
      bGroup.add(body);

      const nx = Math.round(w / 0.3);
      const nz = Math.round(d / 0.3);
      const stepX = w / (nx + 1);
      const stepZ = d / (nz + 1);
      for (let ix = 1; ix <= nx; ix++) {
        for (let iz = 1; iz <= nz; iz++) {
          const stud = new THREE.Mesh(studGeo, cfg.mat);
          stud.position.set(-w / 2 + ix * stepX, h / 2 + 0.025, -d / 2 + iz * stepZ);
          bGroup.add(stud);
        }
      }

      this.animatedObjects.floatingBricks.push(bGroup);
      this.group.add(bGroup);
    });
  }

  createFairyLights() {
    const lightGroup = new THREE.Group();
    const bulbGeo = new THREE.SphereGeometry(0.09, 10, 10);
    const bulbColors = [0xfff176, 0xffb74d, 0xffd54f, 0xffecb3];

    for (let i = 0; i < 18; i++) {
      const t = i / 18;
      const x = -10 + t * 20;
      const y = 8.8 - Math.sin(t * Math.PI) * 0.9;
      const z = -6.5 + Math.cos(t * Math.PI * 2) * 0.3;

      const bulbMat = new THREE.MeshBasicMaterial({ color: bulbColors[i % bulbColors.length] });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(x, y, z);
      bulb.userData.phase = i * 0.6;

      this.animatedObjects.fairyLights.push(bulb);
      lightGroup.add(bulb);
    }
    this.group.add(lightGroup);
  }

  createSunbeamSparkles() {
    const count = 45;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 1] = 1.0 + Math.random() * 5.5;
      positions[i * 3 + 2] = -2.0 + Math.random() * 7.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 245, 180, 0.95)');
    grad.addColorStop(0.35, 'rgba(255, 220, 120, 0.6)');
    grad.addColorStop(1, 'rgba(255, 200, 80, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      map: texture,
      size: 0.28,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    this.animatedObjects.particles = particles;
    this.group.add(particles);
  }

  update(delta) {
    this.time += delta;
    const t = this.time;

    this.animatedObjects.clouds.forEach((cloud) => {
      cloud.position.x += cloud.userData.speed * delta * 0.45;
      if (cloud.position.x > 8.0) cloud.position.x = -8.0;
    });

    this.animatedObjects.fairyLights.forEach((bulb) => {
      const flicker = 0.75 + Math.sin(t * 3.5 + bulb.userData.phase) * 0.25;
      bulb.scale.setScalar(0.85 + flicker * 0.25);
    });

    this.animatedObjects.trees.forEach((tree, idx) => {
      tree.rotation.z = Math.sin(t * 1.5 + idx) * 0.03;
    });

    this.animatedObjects.floatingBricks.forEach((brick) => {
      const bob = Math.sin(t * brick.userData.speed + brick.userData.offset) * 0.15;
      brick.position.y = brick.userData.baseY + bob;
      brick.rotation.y += delta * 0.35;
    });

    if (this.animatedObjects.particles) {
      const pos = this.animatedObjects.particles.geometry.attributes.position.array;
      for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3 + 1] -= delta * 0.18;
        if (pos[i * 3 + 1] < 0.6) pos[i * 3 + 1] = 6.2;
      }
      this.animatedObjects.particles.geometry.attributes.position.needsUpdate = true;
    }
  }

  setVisible(visible) {
    this.group.visible = visible;
  }

  dispose() {
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
