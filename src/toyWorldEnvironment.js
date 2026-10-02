import * as THREE from 'three';

/**
 * ToyWorldEnvironment
 * A polished, colorful miniature toy world for the LEGO 3D builder.
 *
 * Visual design:
 * - Cheerful, warm daylight with soft contact shadows
 * - Soft green meadows with rolling hills and winding dirt path
 * - Miniature toy village: rotating windmill, cozy red-roof houses, wooden bridge over a cartoon river
 * - Stylized low-poly trees (gumdrop & tiered pine), bushes, flowers, tiny stones & wooden fences
 * - Fluffy 3D clouds drifting lazily across a soft blue sky
 * - UNCLUTTERED: The green studded building baseplate occupies the center 50-65% with a clear safety zone
 */
export class ToyWorldEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'toyWorldEnvironment';
    this.scene.add(this.group);

    // Animation tracking
    this.clouds = [];
    this.animatedObjects = [];
    this.windmillSails = null;
    this.birds = [];
    this.waterMesh = null;

    this.initAtmosphere();
    this.initMaterials();
    this.buildSkyAndDistantMountains();
    this.buildTerrainAndMeadow();
    this.buildRiverAndBridge();
    this.buildToyVillage();
    this.buildVegetation();
    this.buildFencesAndDetails();
    this.buildPollenParticles();
    this.buildBaseplate();
  }

  initAtmosphere() {
    // Soft, sunny sky blue with matching horizon haze
    const skyColor = new THREE.Color(0x93c5fd); // Soft sky blue

    this.scene.background = skyColor;
    this.scene.fog = null;
  }

  initMaterials() {
    // Meadow Grass
    this.matGrass = new THREE.MeshStandardMaterial({
      color: 0x6bb339,
      roughness: 0.8,
      metalness: 0.0
    });
    this.matGrassKnoll = new THREE.MeshStandardMaterial({
      color: 0x5a9e2d,
      roughness: 0.82,
      metalness: 0.0
    });
    this.matGrassSunlit = new THREE.MeshStandardMaterial({
      color: 0x7ecc43,
      roughness: 0.78,
      metalness: 0.0
    });

    // Dirt Path
    this.matPath = new THREE.MeshStandardMaterial({
      color: 0xddb886,
      roughness: 0.88,
      metalness: 0.0
    });

    // Cartoon River Water
    this.matWater = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9
    });

    // River Stones
    this.matStone = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.75,
      metalness: 0.05
    });

    // Warm Woods (Fences, Bridges, Windmill Cap)
    this.matWood = new THREE.MeshStandardMaterial({
      color: 0x935f37,
      roughness: 0.7,
      metalness: 0.0
    });
    this.matWoodPlank = new THREE.MeshStandardMaterial({
      color: 0xb47d4e,
      roughness: 0.65,
      metalness: 0.0
    });

    // Toy Village Houses
    this.matWallWhite = new THREE.MeshStandardMaterial({ color: 0xfffbf0, roughness: 0.6 });
    this.matWallYellow = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.55 });
    this.matWallBlue = new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.55 });
    this.matRoofRed = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.45 });
    this.matRoofBlue = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.45 });
    this.matRoofOrange = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45 });
    this.matTrimWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });

    // Tree Foliage
    this.matCanopyApple = new THREE.MeshStandardMaterial({
      color: 0x4ade80,
      roughness: 0.65,
      metalness: 0.0,
      flatShading: true
    });
    this.matCanopyEmerald = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.65,
      metalness: 0.0,
      flatShading: true
    });
    this.matCanopyGolden = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.6,
      metalness: 0.0,
      flatShading: true
    });
    this.matPine = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.7,
      metalness: 0.0,
      flatShading: true
    });
    this.matTrunk = new THREE.MeshStandardMaterial({
      color: 0x784e2d,
      roughness: 0.85,
      metalness: 0.0
    });

    // Flowers & Details
    this.matFlowerWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    this.matFlowerPink = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.4 });
    this.matFlowerYellow = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
    this.matFlowerCore = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.3 });

    // Cloud & Mountain Materials
    this.matCloud = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: true
    });
    this.matMountainNear = new THREE.MeshStandardMaterial({
      color: 0x82b2c9,
      roughness: 0.85,
      flatShading: true
    });
    this.matMountainFar = new THREE.MeshStandardMaterial({
      color: 0x9bc3d8,
      roughness: 0.9,
      flatShading: true
    });

    // LEGO Classic Green Baseplate
    this.matBaseplate = new THREE.MeshStandardMaterial({
      color: 0x237841, // Classic LEGO bright green
      roughness: 0.3,
      metalness: 0.0
    });
  }

  /**
   * Sky dome, drifting cartoon clouds & distant rounded mountains
   */
  buildSkyAndDistantMountains() {
    const skyGroup = new THREE.Group();
    skyGroup.name = 'skyGroup';

    // 1. Distant Rounded Mountain Ridges (Far Background)
    const mountainPositions = [
      { x: -32, y: 3.5, z: -52, r: 18, h: 14, mat: this.matMountainFar },
      { x: -14, y: 4.0, z: -58, r: 22, h: 16, mat: this.matMountainFar },
      { x: 8, y: 3.8, z: -55, r: 20, h: 15, mat: this.matMountainFar },
      { x: 28, y: 3.0, z: -50, r: 17, h: 13, mat: this.matMountainFar },
      // Nearer secondary ridge
      { x: -24, y: 2.2, z: -42, r: 14, h: 10, mat: this.matMountainNear },
      { x: 2, y: 2.5, z: -45, r: 15, h: 11, mat: this.matMountainNear },
      { x: 22, y: 2.0, z: -40, r: 13, h: 9, mat: this.matMountainNear }
    ];

    mountainPositions.forEach((m) => {
      const geom = new THREE.ConeGeometry(m.r, m.h, 7, 1);
      geom.scale(1.0, 0.7, 0.8);
      const mesh = new THREE.Mesh(geom, m.mat);
      mesh.position.set(m.x, m.y, m.z);
      mesh.rotation.y = Math.random() * Math.PI;
      skyGroup.add(mesh);
    });

    // 2. Fluffy 3D Low-Poly Clouds (Drifting smoothly across upper sky)
    const cloudConfigs = [
      { x: -28, y: 17, z: -32, s: 1.2, speed: 0.45 },
      { x: -8, y: 20, z: -42, s: 1.5, speed: 0.35 },
      { x: 12, y: 18, z: -36, s: 1.1, speed: 0.5 },
      { x: 30, y: 21, z: -46, s: 1.4, speed: 0.38 },
      { x: -38, y: 19, z: -48, s: 1.3, speed: 0.42 },
      { x: 2, y: 16, z: -28, s: 0.9, speed: 0.48 }
    ];

    cloudConfigs.forEach((c) => {
      const cloud = this.createPuffyCloud(c.s);
      cloud.position.set(c.x, c.y, c.z);
      cloud.userData.speed = c.speed;
      skyGroup.add(cloud);
      this.clouds.push(cloud);
    });

    // 3. Tiny Cartoon Birds in distant sky
    for (let b = 0; b < 3; b++) {
      const bird = this.createCartoonBird();
      bird.position.set(-10 + b * 7, 16 + b * 1.5, -34 - b * 4);
      bird.userData.angle = b * 2.1;
      bird.userData.speed = 0.5 + b * 0.15;
      bird.userData.radius = 5 + b * 2;
      bird.userData.basePos = bird.position.clone();
      skyGroup.add(bird);
      this.birds.push(bird);
    }

    this.group.add(skyGroup);
  }

  createPuffyCloud(scale = 1.0) {
    const cloud = new THREE.Group();
    const sphereGeom = new THREE.SphereGeometry(1.6, 7, 6);

    const puffs = [
      { x: 0, y: 0, z: 0, s: 1.0 },
      { x: -1.3, y: -0.2, z: 0.1, s: 0.78 },
      { x: 1.3, y: -0.15, z: -0.1, s: 0.82 },
      { x: -0.6, y: 0.55, z: 0, s: 0.8 },
      { x: 0.7, y: 0.45, z: 0.1, s: 0.75 }
    ];

    puffs.forEach((p) => {
      const puff = new THREE.Mesh(sphereGeom, this.matCloud);
      puff.position.set(p.x, p.y, p.z);
      puff.scale.set(p.s, p.s * 0.75, p.s * 0.9);
      cloud.add(puff);
    });

    cloud.scale.set(scale, scale, scale);
    return cloud;
  }

  createCartoonBird() {
    const bird = new THREE.Group();
    const wingGeom = new THREE.BoxGeometry(0.5, 0.04, 0.18);
    const birdMat = new THREE.MeshBasicMaterial({ color: 0x475569 });

    const leftWing = new THREE.Mesh(wingGeom, birdMat);
    leftWing.position.x = -0.26;
    leftWing.rotation.z = 0.25;
    bird.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeom, birdMat);
    rightWing.position.x = 0.26;
    rightWing.rotation.z = -0.25;
    bird.add(rightWing);

    bird.scale.set(0.7, 0.7, 0.7);
    return bird;
  }

  /**
   * Stylized rolling green ground and playful dirt path
   */
  buildTerrainAndMeadow() {
    const terrainGroup = new THREE.Group();
    terrainGroup.name = 'terrainGroup';

    // 1. Expansive Main Meadow (Grass floor extending well beyond camera frustum)
    const mainFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 140),
      this.matGrass
    );
    mainFloor.rotation.x = -Math.PI / 2;
    mainFloor.position.y = -0.04;
    mainFloor.receiveShadow = true;
    terrainGroup.add(mainFloor);

    // 2. Rolling Soft Knolls (Framing the left and right flanks + rear)
    const knolls = [
      // Left knoll hosting the windmill
      { x: -16, y: 0.4, z: -17, rx: 9.0, rz: 7.5, h: 1.4, mat: this.matGrassKnoll },
      { x: -21, y: 0.8, z: -8, rx: 7.5, rz: 6.0, h: 1.2, mat: this.matGrassSunlit },
      // Right knoll hosting the village houses
      { x: 17, y: 0.5, z: -14, rx: 8.5, rz: 7.0, h: 1.3, mat: this.matGrassKnoll },
      { x: 20, y: 0.8, z: -6, rx: 7.0, rz: 6.5, h: 1.1, mat: this.matGrassSunlit },
      // Distant rolling knolls in rear
      { x: -6, y: 0.6, z: -26, rx: 11.0, rz: 6.5, h: 1.6, mat: this.matGrassKnoll },
      { x: 10, y: 0.7, z: -29, rx: 12.0, rz: 7.0, h: 1.8, mat: this.matGrassSunlit },
      // Gentle foreground corner mounds
      { x: -14, y: 0.2, z: 9, rx: 6.0, rz: 5.0, h: 0.6, mat: this.matGrassSunlit },
      { x: 14, y: 0.2, z: 9, rx: 6.0, rz: 5.0, h: 0.6, mat: this.matGrassSunlit }
    ];

    knolls.forEach((k) => {
      const geom = new THREE.SphereGeometry(k.rx, 16, 12);
      geom.scale(1.0, k.h / k.rx, k.rz / k.rx);
      const knoll = new THREE.Mesh(geom, k.mat);
      knoll.position.set(k.x, k.y - k.h * 0.4, k.z);
      knoll.receiveShadow = true;
      terrainGroup.add(knoll);
    });

    // 3. Stylized Curved Dirt Path (Winding around baseplate to the village bridge)
    const pathGroup = new THREE.Group();
    const pathPoints = [
      new THREE.Vector3(12, 0.01, 7),
      new THREE.Vector3(13, 0.01, 1),
      new THREE.Vector3(12.5, 0.01, -5),
      new THREE.Vector3(9.5, 0.01, -10),
      new THREE.Vector3(4.5, 0.01, -13),
      new THREE.Vector3(-3.5, 0.01, -15), // Crosses under bridge here
      new THREE.Vector3(-10, 0.01, -16),
      new THREE.Vector3(-15, 0.01, -15)
    ];

    const curve = new THREE.CatmullRomCurve3(pathPoints);
    const pathCurvePoints = curve.getPoints(36);
    const pathShape = new THREE.BufferGeometry();
    const vertices = [];
    const pathWidth = 1.9;

    for (let i = 0; i < pathCurvePoints.length - 1; i++) {
      const p1 = pathCurvePoints[i];
      const p2 = pathCurvePoints[i + 1];
      const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
      const normal = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(pathWidth * 0.5);

      vertices.push(
        p1.x + normal.x, 0.01, p1.z + normal.z,
        p1.x - normal.x, 0.01, p1.z - normal.z,
        p2.x + normal.x, 0.01, p2.z + normal.z,

        p2.x + normal.x, 0.01, p2.z + normal.z,
        p1.x - normal.x, 0.01, p1.z - normal.z,
        p2.x - normal.x, 0.01, p2.z - normal.z
      );
    }

    pathShape.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    pathShape.computeVertexNormals();

    const pathMesh = new THREE.Mesh(pathShape, this.matPath);
    pathMesh.receiveShadow = true;
    pathGroup.add(pathMesh);
    terrainGroup.add(pathGroup);

    this.group.add(terrainGroup);
  }

  /**
   * Sparkling cyan river and miniature wooden plank bridge
   */
  buildRiverAndBridge() {
    const riverGroup = new THREE.Group();
    riverGroup.name = 'riverAndBridgeGroup';

    // 1. Winding River Ribbon
    const riverPoints = [
      new THREE.Vector3(-24, 0.02, -22),
      new THREE.Vector3(-16, 0.02, -20),
      new THREE.Vector3(-8, 0.02, -18),
      new THREE.Vector3(-3.5, 0.02, -15),
      new THREE.Vector3(2, 0.02, -17),
      new THREE.Vector3(11, 0.02, -21),
      new THREE.Vector3(22, 0.02, -25)
    ];

    const riverCurve = new THREE.CatmullRomCurve3(riverPoints);
    const riverCurvePoints = riverCurve.getPoints(32);
    const riverGeo = new THREE.BufferGeometry();
    const vertices = [];
    const riverWidth = 3.2;

    for (let i = 0; i < riverCurvePoints.length - 1; i++) {
      const p1 = riverCurvePoints[i];
      const p2 = riverCurvePoints[i + 1];
      const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
      const normal = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(riverWidth * 0.5);

      vertices.push(
        p1.x + normal.x, 0.02, p1.z + normal.z,
        p1.x - normal.x, 0.02, p1.z - normal.z,
        p2.x + normal.x, 0.02, p2.z + normal.z,

        p2.x + normal.x, 0.02, p2.z + normal.z,
        p1.x - normal.x, 0.02, p1.z - normal.z,
        p2.x - normal.x, 0.02, p2.z - normal.z
      );
    }

    riverGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    riverGeo.computeVertexNormals();

    this.waterMesh = new THREE.Mesh(riverGeo, this.matWater);
    this.waterMesh.receiveShadow = true;
    riverGroup.add(this.waterMesh);

    // 2. Miniature Wooden Arch Bridge (Crossing the stream at X: -3.5, Z: -15)
    const bridge = new THREE.Group();
    bridge.position.set(-3.5, 0, -15);
    bridge.rotation.y = 0.35;

    // Bridge deck planks
    const deckGeo = new THREE.BoxGeometry(2.4, 0.12, 4.4);
    const deck = new THREE.Mesh(deckGeo, this.matWoodPlank);
    deck.position.set(0, 0.38, 0);
    deck.castShadow = true;
    deck.receiveShadow = true;
    bridge.add(deck);

    // Bridge Side Railings
    [-1.15, 1.15].forEach((sideX) => {
      // Rail bar
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 4.4), this.matWood);
      rail.position.set(sideX, 0.85, 0);
      rail.castShadow = true;
      bridge.add(rail);

      // Posts
      [-1.9, -0.6, 0.6, 1.9].forEach((postZ) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.7, 0.14), this.matWood);
        post.position.set(sideX, 0.55, postZ);
        post.castShadow = true;
        bridge.add(post);
      });
    });

    riverGroup.add(bridge);
    this.group.add(riverGroup);
  }

  /**
   * Toy village landmarks: Windmill with rotating sails, colorful cottages
   */
  buildToyVillage() {
    const villageGroup = new THREE.Group();
    villageGroup.name = 'toyVillageGroup';

    // 1. Windmill on Left Elevated Knoll (X: -15, Z: -17)
    const windmill = new THREE.Group();
    windmill.position.set(-15, 0.9, -17);
    windmill.rotation.y = 0.25;

    // Tower base (tapered cylinder)
    const towerGeo = new THREE.CylinderGeometry(1.3, 1.8, 4.2, 10);
    const tower = new THREE.Mesh(towerGeo, this.matWallWhite);
    tower.position.y = 2.1;
    tower.castShadow = true;
    tower.receiveShadow = true;
    windmill.add(tower);

    // Windmill Roof Cap
    const capGeo = new THREE.ConeGeometry(1.6, 1.6, 10);
    const cap = new THREE.Mesh(capGeo, this.matRoofOrange);
    cap.position.y = 4.9;
    cap.castShadow = true;
    windmill.add(cap);

    // Tiny door
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.15), this.matWood);
    door.position.set(0, 0.5, 1.72);
    windmill.add(door);

    // Windmill Sails (Rotating Hub + 4 Cross Blades)
    const sailsGroup = new THREE.Group();
    sailsGroup.position.set(0, 4.4, 1.45);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.35, 8), this.matWood);
    hub.rotation.x = Math.PI / 2;
    sailsGroup.add(hub);

    for (let s = 0; s < 4; s++) {
      const sailArm = new THREE.Group();
      sailArm.rotation.z = s * (Math.PI / 2);

      // Wood spar
      const spar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.5, 0.08), this.matWood);
      spar.position.y = 1.35;
      sailArm.add(spar);

      // Lattice blade cloth
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.8, 0.04), this.matTrimWhite);
      blade.position.set(0.28, 1.5, 0.02);
      blade.castShadow = true;
      sailArm.add(blade);

      sailsGroup.add(sailArm);
    }

    windmill.add(sailsGroup);
    this.windmillSails = sailsGroup;
    villageGroup.add(windmill);

    // 2. Cozy Red-Roof House (Right Flank at X: 13.5, Z: -12)
    const houseRed = this.createToyHouse({
      wallMat: this.matWallWhite,
      roofMat: this.matRoofRed,
      width: 3.2,
      depth: 2.6,
      height: 2.2,
      hasChimney: true
    });
    houseRed.position.set(13.5, 0.5, -12);
    houseRed.rotation.y = -0.3;
    villageGroup.add(houseRed);

    // 3. Sunshine Cottage (Right Midground at X: 17, Z: -19)
    const houseYellow = this.createToyHouse({
      wallMat: this.matWallYellow,
      roofMat: this.matRoofBlue,
      width: 2.8,
      depth: 2.2,
      height: 1.9,
      hasChimney: false
    });
    houseYellow.position.set(17, 1.2, -19);
    houseYellow.rotation.y = -0.55;
    villageGroup.add(houseYellow);

    // 4. Distant Castle Spire on Far Hill (X: 6, Z: -33)
    const castle = new THREE.Group();
    castle.position.set(6, 2.4, -33);
    const cTower = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 4.5, 8), this.matWallWhite);
    cTower.position.y = 2.25;
    castle.add(cTower);
    const cSpire = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3.2, 8), this.matRoofBlue);
    cSpire.position.y = 5.8;
    castle.add(cSpire);
    villageGroup.add(castle);

    this.group.add(villageGroup);
  }

  createToyHouse({ wallMat, roofMat, width, depth, height, hasChimney = true }) {
    const house = new THREE.Group();

    // Main Wall Box
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMat);
    body.position.y = height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    house.add(body);

    // Gabled Roof (Prism)
    const roofHeight = 1.3;
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-width / 2 - 0.25, 0);
    roofShape.lineTo(0, roofHeight);
    roofShape.lineTo(width / 2 + 0.25, 0);
    roofShape.closePath();

    const roofGeom = new THREE.ExtrudeGeometry(roofShape, {
      steps: 1,
      depth: depth + 0.5,
      bevelEnabled: false
    });
    roofGeom.center();
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.y = height + roofHeight / 2 - 0.05;
    roof.castShadow = true;
    house.add(roof);

    // Front Door
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.0, 0.1), this.matWood);
    door.position.set(0, 0.5, depth / 2 + 0.05);
    house.add(door);

    // Windows
    [-0.85, 0.85].forEach((wX) => {
      const windowFrame = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.08), this.matTrimWhite);
      windowFrame.position.set(wX, height * 0.65, depth / 2 + 0.05);
      house.add(windowFrame);
    });

    // Optional Chimney
    if (hasChimney) {
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.4, 0.45), this.matRoofRed);
      chimney.position.set(width * 0.28, height + 0.9, 0);
      chimney.castShadow = true;
      house.add(chimney);
    }

    return house;
  }

  /**
   * Stylized low-poly trees (gumdrop & tiered pine) and bushes
   */
  buildVegetation() {
    const vegGroup = new THREE.Group();
    vegGroup.name = 'vegetationGroup';

    // 1. Stylized Deciduous Trees (Grouped on side knolls and rear hills)
    const deciduousTrees = [
      // Left side grove
      { x: -19, z: -11, scale: 1.3, mat: this.matCanopyApple },
      { x: -21, z: -15, scale: 1.1, mat: this.matCanopyEmerald },
      { x: -13, z: -11, scale: 0.9, mat: this.matCanopyGolden },
      { x: -18, z: 2, scale: 1.15, mat: this.matCanopyApple },
      { x: -16, z: 6, scale: 0.85, mat: this.matCanopyEmerald },
      // Right side grove (behind houses)
      { x: 19, z: -15, scale: 1.25, mat: this.matCanopyEmerald },
      { x: 15, z: -16, scale: 0.95, mat: this.matCanopyGolden },
      { x: 21, z: -10, scale: 1.1, mat: this.matCanopyApple },
      { x: 18, z: 2, scale: 1.0, mat: this.matCanopyEmerald },
      // Rear hill groves
      { x: -9, z: -25, scale: 1.4, mat: this.matCanopyApple },
      { x: -2, z: -27, scale: 1.1, mat: this.matCanopyGolden },
      { x: 12, z: -26, scale: 1.3, mat: this.matCanopyEmerald }
    ];

    deciduousTrees.forEach((t) => {
      const tree = this.createDeciduousTree(t.scale, t.mat);
      tree.position.set(t.x, 0, t.z);
      vegGroup.add(tree);
      this.animatedObjects.push({ obj: tree, speed: 1.2, offset: Math.random() * 6 });
    });

    // 2. Tiered Pine Trees (Clustered on higher distant slopes)
    const pineTrees = [
      { x: -24, z: -22, scale: 1.4 },
      { x: -22, z: -26, scale: 1.1 },
      { x: -13, z: -28, scale: 1.3 },
      { x: 23, z: -23, scale: 1.35 },
      { x: 19, z: -27, scale: 1.1 },
      { x: 2, z: -32, scale: 1.25 }
    ];

    pineTrees.forEach((p) => {
      const pine = this.createPineTree(p.scale);
      pine.position.set(p.x, 0, p.z);
      vegGroup.add(pine);
    });

    // 3. Rounded Bush Shrubs (Along path and village perimeters)
    const bushes = [
      { x: 11.5, z: -10.5, s: 0.75, mat: this.matCanopyApple },
      { x: 15.5, z: -13.5, s: 0.9, mat: this.matCanopyEmerald },
      { x: -13, z: -15.5, s: 0.8, mat: this.matCanopyEmerald },
      { x: -1.8, z: -14.2, s: 0.65, mat: this.matCanopyApple },
      { x: -5.2, z: -15.8, s: 0.7, mat: this.matCanopyGolden },
      { x: -13.5, z: 4.5, s: 0.6, mat: this.matCanopyApple },
      { x: 13.5, z: 4.5, s: 0.6, mat: this.matCanopyEmerald }
    ];

    bushes.forEach((b) => {
      const bush = new THREE.Mesh(new THREE.SphereGeometry(b.s, 7, 6), b.mat);
      bush.scale.set(1.2, 0.8, 1.0);
      bush.position.set(b.x, b.s * 0.6, b.z);
      bush.castShadow = true;
      bush.receiveShadow = true;
      vegGroup.add(bush);
    });

    this.group.add(vegGroup);
  }

  createDeciduousTree(scale = 1.0, canopyMat = this.matCanopyApple) {
    const tree = new THREE.Group();

    // Trunk
    const trunkHeight = 1.6;
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.32, trunkHeight, 7);
    const trunk = new THREE.Mesh(trunkGeo, this.matTrunk);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    // Canopy (Cluster of 3 puffy spheres)
    const canopy = new THREE.Group();
    canopy.name = 'treeCanopy';
    const mainPuff = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 7), canopyMat);
    mainPuff.position.y = trunkHeight + 0.9;
    mainPuff.castShadow = true;
    canopy.add(mainPuff);

    const sidePuff1 = new THREE.Mesh(new THREE.SphereGeometry(0.85, 7, 6), canopyMat);
    sidePuff1.position.set(-0.5, trunkHeight + 0.7, 0.3);
    sidePuff1.castShadow = true;
    canopy.add(sidePuff1);

    const sidePuff2 = new THREE.Mesh(new THREE.SphereGeometry(0.9, 7, 6), canopyMat);
    sidePuff2.position.set(0.5, trunkHeight + 0.75, -0.2);
    sidePuff2.castShadow = true;
    canopy.add(sidePuff2);

    tree.add(canopy);
    tree.scale.set(scale, scale, scale);
    return tree;
  }

  createPineTree(scale = 1.0) {
    const pine = new THREE.Group();

    // Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 1.2, 7), this.matTrunk);
    trunk.position.y = 0.6;
    trunk.castShadow = true;
    pine.add(trunk);

    // 3 Stacked Cones
    const tiers = [
      { y: 1.5, r: 1.3, h: 1.4 },
      { y: 2.3, r: 1.05, h: 1.2 },
      { y: 3.0, r: 0.75, h: 1.0 }
    ];

    tiers.forEach((t) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(t.r, t.h, 7), this.matPine);
      cone.position.y = t.y;
      cone.castShadow = true;
      pine.add(cone);
    });

    pine.scale.set(scale, scale, scale);
    return pine;
  }

  /**
   * Wooden post-and-rail fences, colorful flower patches & river pebbles
   */
  buildFencesAndDetails() {
    const detailGroup = new THREE.Group();
    detailGroup.name = 'fencesAndDetailsGroup';

    // 1. Miniature Wooden Fence along the Village Pathway
    const fenceSegments = [
      { x: 10.5, z: 5.5, rot: 0.1 },
      { x: 11.2, z: 2.0, rot: -0.15 },
      { x: 11.0, z: -1.5, rot: -0.25 },
      { x: 9.8, z: -5.0, rot: -0.5 },
      // Left windmill pasture fence
      { x: -11.5, z: -12.5, rot: 0.4 },
      { x: -14.2, z: -13.5, rot: 0.2 }
    ];

    fenceSegments.forEach((f) => {
      const fence = this.createWoodenFenceSegment();
      fence.position.set(f.x, 0, f.z);
      fence.rotation.y = f.rot;
      detailGroup.add(fence);
    });

    // 2. Colorful Flower Patches
    const flowerClusters = [
      { x: -11, z: 7, count: 6 },
      { x: 11, z: 7, count: 6 },
      { x: 12.8, z: -8.5, count: 8 },
      { x: -12.5, z: -8.5, count: 7 },
      { x: -1.5, z: -13.5, count: 5 },
      { x: -5.5, z: -14.0, count: 6 }
    ];

    const fGeom = new THREE.CylinderGeometry(0.14, 0.14, 0.04, 6);
    const stemGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.25, 4);

    flowerClusters.forEach((c) => {
      for (let i = 0; i < c.count; i++) {
        const flower = new THREE.Group();
        const colorMat = (i % 3 === 0) ? this.matFlowerPink : ((i % 3 === 1) ? this.matFlowerYellow : this.matFlowerWhite);

        const stem = new THREE.Mesh(stemGeom, this.matCanopyEmerald);
        stem.position.y = 0.12;
        flower.add(stem);

        const petal = new THREE.Mesh(fGeom, colorMat);
        petal.position.y = 0.25;
        flower.add(petal);

        const core = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), this.matFlowerCore);
        core.position.y = 0.28;
        flower.add(core);

        const spread = 1.2;
        flower.position.set(
          c.x + (Math.random() - 0.5) * spread,
          0,
          c.z + (Math.random() - 0.5) * spread
        );
        detailGroup.add(flower);
      }
    });

    // 3. Smooth River Stones
    const stonePositions = [
      { x: -4.8, z: -14.2, s: 0.35 },
      { x: -2.2, z: -15.5, s: 0.4 },
      { x: 3.5, z: -16.8, s: 0.45 },
      { x: 7.2, z: -19.2, s: 0.38 },
      { x: -10.5, z: -17.5, s: 0.42 },
      { x: 10.2, z: 3.2, s: 0.3 },
      { x: 10.8, z: -3.5, s: 0.32 }
    ];

    stonePositions.forEach((st) => {
      const stone = new THREE.Mesh(new THREE.SphereGeometry(st.s, 6, 5), this.matStone);
      stone.scale.set(1.3, 0.55, 1.0);
      stone.position.set(st.x, st.s * 0.3, st.z);
      stone.rotation.y = Math.random() * Math.PI;
      stone.castShadow = true;
      stone.receiveShadow = true;
      detailGroup.add(stone);
    });

    this.group.add(detailGroup);
  }

  createWoodenFenceSegment() {
    const fence = new THREE.Group();
    const len = 3.2;

    // Horizontal rails
    [0.24, 0.55].forEach((rY) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.08), this.matWoodPlank);
      rail.position.set(0, rY, 0);
      rail.castShadow = true;
      fence.add(rail);
    });

    // Vertical posts
    [-len * 0.45, 0, len * 0.45].forEach((pX) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.72, 0.12), this.matWood);
      post.position.set(pX, 0.36, 0);
      post.castShadow = true;
      fence.add(post);
    });

    return fence;
  }

  /**
   * Floating cheerful pollen / sparkling dust particles
   */
  buildPollenParticles() {
    const count = 48;
    const geom = new THREE.BufferGeometry();
    const pos = [];

    for (let i = 0; i < count; i++) {
      pos.push(
        (Math.random() - 0.5) * 32,
        0.5 + Math.random() * 5.0,
        (Math.random() - 0.5) * 26
      );
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));

    const pMat = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 0.18,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });

    this.pollen = new THREE.Points(geom, pMat);
    this.group.add(this.pollen);
  }

  /**
   * THE PRIMARY FOCUS: Authentic LEGO Green Studded Building Baseplate
   * Sits neatly in the center 50-65% of the camera view with clean clear borders.
   * Stud coordinates align with integer multiples of 0.8 stud pitch.
   */
  buildBaseplate() {
    const baseGroup = new THREE.Group();
    baseGroup.name = 'primaryBuildingBaseplate';

    const STUD_PITCH = 0.8;
    const MIN_IX = -14;
    const MAX_IX = 14; // 29 studs along X (X: -11.2 to +11.2)
    const MIN_IZ = -12;
    const MAX_IZ = 12; // 25 studs along Z (Z: -9.6 to +9.6)

    const numStudsX = (MAX_IX - MIN_IX + 1);
    const numStudsZ = (MAX_IZ - MIN_IZ + 1);
    const plateWidth = numStudsX * STUD_PITCH; // 23.2 units
    const plateDepth = numStudsZ * STUD_PITCH; // 20.0 units
    const plateHeight = 0.28;

    // 1. Green Foundation Slab (Flush at y = 0, sits down to -0.28)
    const slabGeo = new THREE.BoxGeometry(plateWidth, plateHeight, plateDepth);
    const slab = new THREE.Mesh(slabGeo, this.matBaseplate);
    slab.position.set(0, -plateHeight / 2, 0);
    slab.receiveShadow = true;
    slab.userData.isBaseplate = true;
    baseGroup.add(slab);

    // 2. Crisp White / Cream Outer Bevel Trim Border
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0x1e6837,
      roughness: 0.35,
      metalness: 0.0
    });
    const borderThick = 0.25;
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(plateWidth + borderThick * 2, plateHeight * 0.95, plateDepth + borderThick * 2),
      borderMat
    );
    border.position.set(0, -plateHeight / 2 - 0.01, 0);
    border.receiveShadow = true;
    baseGroup.add(border);

    // 3. Authentic Instanced LEGO Studs on Top
    const STUD_R = 0.28;
    const STUD_H = 0.16;
    const studGeom = new THREE.CylinderGeometry(STUD_R, STUD_R, STUD_H, 16);

    const totalStuds = numStudsX * numStudsZ;
    const instancedStuds = new THREE.InstancedMesh(studGeom, this.matBaseplate, totalStuds);
    instancedStuds.receiveShadow = true;
    instancedStuds.castShadow = true;

    const dummy = new THREE.Object3D();
    let idx = 0;

    for (let ix = MIN_IX; ix <= MAX_IX; ix++) {
      for (let iz = MIN_IZ; iz <= MAX_IZ; iz++) {
        const x = ix * STUD_PITCH;
        const z = iz * STUD_PITCH;

        dummy.position.set(x, STUD_H / 2, z);
        dummy.updateMatrix();
        instancedStuds.setMatrixAt(idx++, dummy.matrix);
      }
    }

    instancedStuds.instanceMatrix.needsUpdate = true;
    baseGroup.add(instancedStuds);

    this.baseplateMesh = slab;
    this.group.add(baseGroup);
  }

  /**
   * Continuous environmental animations:
   * - Clouds gently drifting
   * - Windmill sails smoothly turning
   * - Trees softly swaying in the breeze
   * - Distant birds circling
   * - Water shimmer & floating pollen
   */
  update(delta, now = performance.now()) {
    const t = now * 0.001;

    // 1. Drifting Clouds (Slow, seamless left-to-right drift)
    this.clouds.forEach((cloud) => {
      cloud.position.x += cloud.userData.speed * delta;
      if (cloud.position.x > 45) {
        cloud.position.x = -45;
      }
    });

    // 2. Windmill Sails Rotation
    if (this.windmillSails) {
      this.windmillSails.rotation.z -= delta * 0.45;
    }

    // 3. Gentle Canopy Sway in Breeze
    this.animatedObjects.forEach((item) => {
      if (item.obj) {
        const sway = Math.sin(t * item.speed + item.offset) * 0.015;
        item.obj.rotation.z = sway;
      }
    });

    // 4. Distant Birds Circling
    this.birds.forEach((bird) => {
      bird.userData.angle += delta * bird.userData.speed * 0.35;
      const a = bird.userData.angle;
      const r = bird.userData.radius;
      bird.position.x = bird.userData.basePos.x + Math.cos(a) * r;
      bird.position.z = bird.userData.basePos.z + Math.sin(a) * r;
      bird.rotation.y = -a + Math.PI / 2;
    });

    // 5. Pollen particle float
    if (this.pollen) {
      const pos = this.pollen.geometry.attributes.position;
      for (let i = 1; i < pos.count * 3; i += 3) {
        pos.array[i] += Math.sin(t + i) * 0.003;
      }
      pos.needsUpdate = true;
    }
  }

  destroy() {
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
