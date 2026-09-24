import * as THREE from 'three';

/**
 * Creates the Procedural Enchanted Sunset Forest Environment
 * Built with standard Three.js primitives:
 * CylinderGeometry, SphereGeometry, ConeGeometry, BoxGeometry, IcosahedronGeometry
 */
export class ForestEnvironment {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'forestEnvironment';

    this.initMaterials();
    this.buildGroundAndPath();
    this.buildAncientTrees();
    this.buildBackgroundTrees();
    this.buildMushrooms();
    this.buildWildflowers();
    this.buildFireflies();
    this.buildSkyDome();
  }

  initMaterials() {
    // 1. Earthy Dirt Path
    this.matPath = new THREE.MeshStandardMaterial({
      color: 0x825437,
      roughness: 0.85,
      metalness: 0.0
    });

    // 2. Lush Mossy Hills
    this.matGrass = new THREE.MeshStandardMaterial({
      color: 0x548737,
      roughness: 0.8,
      metalness: 0.0
    });

    this.matGrassAccent = new THREE.MeshStandardMaterial({
      color: 0x6ca345,
      roughness: 0.75,
      metalness: 0.0
    });

    // 3. Ancient Tree Bark
    this.matBark = new THREE.MeshStandardMaterial({
      color: 0x4f3424,
      roughness: 0.9,
      metalness: 0.05
    });

    this.matBarkHighlight = new THREE.MeshStandardMaterial({
      color: 0x6e4933,
      roughness: 0.85,
      metalness: 0.05
    });

    // 4. Stylized Tree Foliage
    this.matFoliageDeep = new THREE.MeshStandardMaterial({
      color: 0x3d6124,
      roughness: 0.75,
      metalness: 0.0,
      flatShading: true
    });

    this.matFoliageSunlit = new THREE.MeshStandardMaterial({
      color: 0x769e38,
      roughness: 0.7,
      metalness: 0.0,
      flatShading: true
    });

    // 5. Mushrooms
    this.matMushroomCapRed = new THREE.MeshStandardMaterial({
      color: 0xa83827,
      roughness: 0.45,
      metalness: 0.0
    });

    this.matMushroomCapAmber = new THREE.MeshStandardMaterial({
      color: 0xc45c29,
      roughness: 0.45,
      metalness: 0.0
    });

    this.matMushroomStem = new THREE.MeshStandardMaterial({
      color: 0xeee6d5,
      roughness: 0.6,
      metalness: 0.0
    });

    this.matMushroomDot = new THREE.MeshBasicMaterial({ color: 0xfffaed });

    // 6. Glowing Wildflowers
    this.matFlowerPeach = new THREE.MeshStandardMaterial({
      color: 0xf59882,
      roughness: 0.5,
      metalness: 0.0
    });

    this.matFlowerPink = new THREE.MeshStandardMaterial({
      color: 0xe884a8,
      roughness: 0.5,
      metalness: 0.0
    });

    this.matFlowerCore = new THREE.MeshStandardMaterial({
      color: 0xffea75,
      emissive: 0xffaa00,
      emissiveIntensity: 1.2,
      roughness: 0.3
    });

    // 7. Golden Fireflies
    this.matFirefly = new THREE.MeshStandardMaterial({
      color: 0xfff59e,
      emissive: 0xffd000,
      emissiveIntensity: 2.5,
      roughness: 0.2
    });
  }

  /**
   * Central Meandering Dirt Path & Flanking Mossy Hills
   */
  buildGroundAndPath() {
    this.groundGroup = new THREE.Group();
    this.groundGroup.name = 'groundAndPathGroup';

    // 1. Meandering Trail
    const pathSegments = 16;
    const pathLength = 28;
    const pathWidth = 2.4;

    const pathGeo = new THREE.PlaneGeometry(pathWidth, pathLength, 8, pathSegments);
    // Deform path vertices into gentle curve into the distance
    const pos = pathGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getY(i); // Y in PlaneGeometry is Z in world
      // Meander curve
      const curveX = Math.sin(z * 0.18) * 0.9;
      pos.setX(i, pos.getX(i) + curveX);
      // Subtle dips in path
      const depth = -Math.cos(pos.getX(i) * 0.8) * 0.04;
      pos.setZ(i, depth);
    }
    pathGeo.computeVertexNormals();

    const pathMesh = new THREE.Mesh(pathGeo, this.matPath);
    pathMesh.rotation.x = -Math.PI / 2;
    pathMesh.position.set(0, -0.01, -2);
    pathMesh.receiveShadow = true;
    this.groundGroup.add(pathMesh);

    // 2. Rolling Mossy Knolls (Left and Right)
    // Left Mound
    const leftMoundGeo = new THREE.SphereGeometry(6.5, 24, 18);
    leftMoundGeo.scale(1.2, 0.28, 2.2);
    const leftMound = new THREE.Mesh(leftMoundGeo, this.matGrass);
    leftMound.position.set(-6.2, -0.8, -3);
    leftMound.receiveShadow = true;
    this.groundGroup.add(leftMound);

    // Right Mound
    const rightMoundGeo = new THREE.SphereGeometry(6.8, 24, 18);
    rightMoundGeo.scale(1.15, 0.26, 2.3);
    const rightMound = new THREE.Mesh(rightMoundGeo, this.matGrass);
    rightMound.position.set(6.4, -0.8, -3);
    rightMound.receiveShadow = true;
    this.groundGroup.add(rightMound);

    // Foreground grass mounds for framing
    const fgLeftMound = new THREE.Mesh(new THREE.SphereGeometry(2.8, 16, 12), this.matGrassAccent);
    fgLeftMound.scale.set(1.4, 0.35, 1.2);
    fgLeftMound.position.set(-3.2, -0.4, 3.5);
    this.groundGroup.add(fgLeftMound);

    const fgRightMound = new THREE.Mesh(new THREE.SphereGeometry(3.0, 16, 12), this.matGrassAccent);
    fgRightMound.scale.set(1.3, 0.35, 1.2);
    fgRightMound.position.set(3.4, -0.4, 3.2);
    this.groundGroup.add(fgRightMound);

    this.group.add(this.groundGroup);
  }

  /**
   * Massive Ancient Gnarled Framing Trees
   */
  buildAncientTrees() {
    this.treesGroup = new THREE.Group();
    this.treesGroup.name = 'ancientTreesGroup';

    // Left Framing Tree
    const left = this.buildFramingTree(-4.6, 0, -1.5, 1.25, 1);
    this.leftTreeGroup = left.treeGroup;
    this.leftTreeTrunk = left.trunkGroup;
    this.leftTreeFoliage = left.foliageGroup;

    // Right Framing Tree
    const right = this.buildFramingTree(4.8, 0, -1.8, 1.3, -1);
    this.rightTreeGroup = right.treeGroup;
    this.rightTreeTrunk = right.trunkGroup;
    this.rightTreeFoliage = right.foliageGroup;

    this.treesGroup.add(this.leftTreeGroup);
    this.treesGroup.add(this.rightTreeGroup);
    this.group.add(this.treesGroup);
  }

  /**
   * Builds an individual massive ancient tree with gnarled trunk,
   * spreading surface roots, and stylized foliage clusters.
   */
  buildFramingTree(x, y, z, scale, dir) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, y, z);
    treeGroup.scale.set(scale, scale, scale);

    const trunkGroup = new THREE.Group();
    trunkGroup.name = 'treeTrunk';
    treeGroup.add(trunkGroup);

    const foliageGroup = new THREE.Group();
    foliageGroup.name = 'treeFoliage';
    treeGroup.add(foliageGroup);

    // 1. Trunk segments curving gracefully inward to create the canopy arch
    const trunkHeight = 10;
    const trunkGeo = new THREE.CylinderGeometry(0.85, 1.5, trunkHeight, 20, 8);
    // Curve trunk inward
    const pos = trunkGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vY = pos.getY(i);
      const normalizedY = (vY + trunkHeight / 2) / trunkHeight;
      // Inward arching curve
      const arch = Math.pow(normalizedY, 1.6) * 1.5 * dir;
      pos.setX(i, pos.getX(i) + arch);
    }
    trunkGeo.computeVertexNormals();

    const trunk = new THREE.Mesh(trunkGeo, this.matBark);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    trunkGroup.add(trunk);

    // 2. Thick snaking surface roots
    const rootAngles = [0.2, 0.8, 1.6, 2.4, 3.2];
    rootAngles.forEach((angle, idx) => {
      const rootLength = 2.2 + Math.random() * 0.8;
      const rootGeo = new THREE.CylinderGeometry(0.12, 0.38, rootLength, 12);
      rootGeo.rotateZ(Math.PI / 2);
      const root = new THREE.Mesh(rootGeo, this.matBark);

      const rX = Math.cos(angle) * 1.1;
      const rZ = Math.sin(angle) * 1.1;
      root.position.set(rX, 0.15, rZ);
      root.rotation.y = angle + 0.3;
      root.rotation.z = -0.12;
      root.castShadow = true;
      trunkGroup.add(root);
    });

    // 3. Branches branching across the top
    const branchGeo = new THREE.CylinderGeometry(0.35, 0.65, 5.0, 14);
    const branch1 = new THREE.Mesh(branchGeo, this.matBark);
    branch1.position.set(1.4 * dir, 7.8, 0.4);
    branch1.rotation.z = -0.65 * dir;
    branch1.rotation.y = 0.3 * dir;
    trunkGroup.add(branch1);

    const branch2 = new THREE.Mesh(branchGeo, this.matBark);
    branch2.position.set(1.8 * dir, 8.5, -0.6);
    branch2.rotation.z = -0.85 * dir;
    branch2.rotation.y = -0.4 * dir;
    trunkGroup.add(branch2);

    // 4. Stylized Volumetric Foliage Clouds (Clustered Icosahedrons)
    const foliageClusters = [
      { x: 1.2 * dir, y: 8.5, z: 0.8, r: 2.2, mat: this.matFoliageDeep },
      { x: 2.2 * dir, y: 9.6, z: 0.2, r: 2.6, mat: this.matFoliageSunlit },
      { x: 0.4 * dir, y: 9.8, z: -0.6, r: 2.1, mat: this.matFoliageDeep },
      { x: 2.8 * dir, y: 8.8, z: -0.8, r: 2.3, mat: this.matFoliageSunlit },
      { x: 3.5 * dir, y: 10.2, z: 0.5, r: 2.5, mat: this.matFoliageSunlit }
    ];

    foliageClusters.forEach(f => {
      const folGeo = new THREE.IcosahedronGeometry(f.r, 2);
      const folMesh = new THREE.Mesh(folGeo, f.mat);
      folMesh.position.set(f.x, f.y, f.z);
      folMesh.castShadow = true;
      folMesh.receiveShadow = true;
      foliageGroup.add(folMesh);
    });

    return { treeGroup, trunkGroup, foliageGroup };
  }

  /**
   * Slender background trees receding toward the golden horizon
   */
  buildBackgroundTrees() {
    this.bgTreesGroup = new THREE.Group();
    this.bgTreesGroup.name = 'backgroundTrees';

    const bgTreePositions = [
      { x: -2.8, z: -9, h: 12, r: 0.45 },
      { x: -1.8, z: -12, h: 11, r: 0.35 },
      { x: 1.9, z: -11, h: 11, r: 0.38 },
      { x: 3.1, z: -9, h: 12, r: 0.42 },
      { x: -4.5, z: -14, h: 13, r: 0.3 },
      { x: 4.6, z: -13, h: 13, r: 0.3 }
    ];

    bgTreePositions.forEach(p => {
      const tree = new THREE.Group();
      tree.position.set(p.x, 0, p.z);

      const trunkGeo = new THREE.CylinderGeometry(p.r * 0.7, p.r, p.h, 12);
      const trunk = new THREE.Mesh(trunkGeo, this.matBark);
      trunk.position.y = p.h / 2;
      tree.add(trunk);

      // Soft canopy puff
      const canopyGeo = new THREE.IcosahedronGeometry(p.r * 3.8, 1);
      const canopy = new THREE.Mesh(canopyGeo, this.matFoliageDeep);
      canopy.position.y = p.h * 0.92;
      tree.add(canopy);

      this.bgTreesGroup.add(tree);
    });

    this.group.add(this.bgTreesGroup);
  }

  /**
   * Fairy Mushrooms (Red and Amber spotted toadstools)
   */
  buildMushrooms() {
    this.mushroomsGroup = new THREE.Group();
    this.mushroomsGroup.name = 'mushrooms';

    const mushroomData = [
      // Left foreground near root
      { x: -2.8, y: 0.05, z: 2.4, scale: 0.42, color: 'red' },
      { x: -3.3, y: 0.12, z: 2.1, scale: 0.32, color: 'amber' },
      { x: -2.5, y: 0.02, z: 3.0, scale: 0.28, color: 'red' },
      // Right foreground near flower
      { x: 2.7, y: 0.05, z: 2.5, scale: 0.45, color: 'red' },
      { x: 3.1, y: 0.15, z: 2.2, scale: 0.35, color: 'amber' },
      { x: 2.3, y: 0.03, z: 3.2, scale: 0.26, color: 'red' },
      // Midground accents
      { x: -3.8, y: 0.35, z: -0.5, scale: 0.5, color: 'red' },
      { x: 3.9, y: 0.4, z: -0.8, scale: 0.48, color: 'amber' }
    ];

    mushroomData.forEach(m => {
      const shroom = new THREE.Group();
      shroom.position.set(m.x, m.y, m.z);
      shroom.scale.set(m.scale, m.scale, m.scale);

      // Curved Stem
      const stemGeo = new THREE.CylinderGeometry(0.12, 0.18, 0.8, 16);
      stemGeo.translate(0, 0.4, 0);
      const stem = new THREE.Mesh(stemGeo, this.matMushroomStem);
      stem.rotation.z = (Math.random() - 0.5) * 0.2;
      shroom.add(stem);

      // Cap (Hemisphere / Dome)
      const capMat = m.color === 'red' ? this.matMushroomCapRed : this.matMushroomCapAmber;
      const capGeo = new THREE.SphereGeometry(0.48, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = 0.78;
      shroom.add(cap);

      // White Polka Dots on Cap
      const dotGeo = new THREE.CircleGeometry(0.065, 12);
      const dotCoords = [
        { r: 0.38, theta: 0.4, phi: 0.6 },
        { r: 0.42, theta: 1.8, phi: 0.7 },
        { r: 0.40, theta: 3.2, phi: 0.5 },
        { r: 0.44, theta: 4.6, phi: 0.8 },
        { r: 0.46, theta: 0.0, phi: 0.2 }
      ];

      dotCoords.forEach(c => {
        const dot = new THREE.Mesh(dotGeo, this.matMushroomDot);
        const dX = c.r * Math.sin(c.phi) * Math.cos(c.theta);
        const dZ = c.r * Math.sin(c.phi) * Math.sin(c.theta);
        const dY = 0.78 + c.r * Math.cos(c.phi);
        dot.position.set(dX, dY, dZ);
        dot.lookAt(new THREE.Vector3(dX * 2, dY + 0.5, dZ * 2));
        shroom.add(dot);
      });

      this.mushroomsGroup.add(shroom);
    });

    this.group.add(this.mushroomsGroup);
  }

  /**
   * Blooming Storybook Wildflowers
   * Large peach/pink flowers with glowing golden pistils
   */
  buildWildflowers() {
    this.flowersGroup = new THREE.Group();
    this.flowersGroup.name = 'wildflowers';

    const flowerPositions = [
      // Left foreground big blossom
      { x: -3.5, y: 0.3, z: 4.2, scale: 0.85, type: 'pink' },
      { x: -2.8, y: 0.15, z: 4.5, scale: 0.65, type: 'peach' },
      // Right foreground big blossoms
      { x: 3.4, y: 0.35, z: 4.1, scale: 0.95, type: 'pink' },
      { x: 4.1, y: 0.2, z: 3.8, scale: 0.75, type: 'peach' },
      { x: 2.6, y: 0.1, z: 4.4, scale: 0.6, type: 'pink' }
    ];

    flowerPositions.forEach(fl => {
      const flower = new THREE.Group();
      flower.position.set(fl.x, fl.y, fl.z);
      flower.scale.set(fl.scale, fl.scale, fl.scale);

      // Angled face towards camera
      flower.rotation.x = -0.4;
      flower.rotation.y = fl.x > 0 ? -0.3 : 0.3;

      const petalMat = fl.type === 'pink' ? this.matFlowerPink : this.matFlowerPeach;
      const numPetals = 5;

      for (let i = 0; i < numPetals; i++) {
        const angle = (i / numPetals) * Math.PI * 2;
        const petalGeo = new THREE.SphereGeometry(0.24, 16, 12);
        petalGeo.scale(0.85, 1.4, 0.25);
        const petal = new THREE.Mesh(petalGeo, petalMat);

        petal.position.set(Math.cos(angle) * 0.28, Math.sin(angle) * 0.28, 0);
        petal.rotation.z = angle - Math.PI / 2;
        flower.add(petal);
      }

      // Luminous Golden Core
      const coreGeo = new THREE.SphereGeometry(0.18, 16, 16);
      const core = new THREE.Mesh(coreGeo, this.matFlowerCore);
      core.position.z = 0.06;
      flower.add(core);

      // Thin curved green stem
      const stemGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.8, 10);
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x486b2b, roughness: 0.7 });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.set(0, -0.42, -0.15);
      stem.rotation.x = 0.4;
      flower.add(stem);

      this.flowersGroup.add(flower);
    });

    this.group.add(this.flowersGroup);
  }

  /**
   * Floating Animated Golden Fireflies / Wisps
   */
  buildFireflies() {
    this.firefliesGroup = new THREE.Group();
    this.firefliesGroup.name = 'firefliesGroup';

    this.fireflyCount = 42;
    this.fireflyData = [];

    const fireflyGeo = new THREE.SphereGeometry(0.065, 12, 12);

    for (let i = 0; i < this.fireflyCount; i++) {
      const mesh = new THREE.Mesh(fireflyGeo, this.matFirefly);

      // Random distribution within the forest glade
      const baseX = (Math.random() - 0.5) * 11;
      const baseY = 0.8 + Math.random() * 6.5;
      const baseZ = -8 + Math.random() * 12;

      mesh.position.set(baseX, baseY, baseZ);

      // Store initial animation parameters
      this.fireflyData.push({
        mesh,
        baseX,
        baseY,
        baseZ,
        speedX: 0.8 + Math.random() * 1.2,
        speedY: 1.2 + Math.random() * 1.8,
        amplitudeX: 0.3 + Math.random() * 0.5,
        amplitudeY: 0.4 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2
      });

      this.firefliesGroup.add(mesh);
    }

    this.group.add(this.firefliesGroup);
  }

  /**
   * Sunset Gradient Sky Dome & God-Ray Sun Glow
   */
  buildSkyDome() {
    this.skyGroup = new THREE.Group();
    this.skyGroup.name = 'skyAndAtmosphere';

    // Sky Dome with procedural canvas sunset gradient
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Vertical sunset gradient: golden horizon, peach clouds, lavender sky, purple top
    const grad = ctx.createLinearGradient(0, 1024, 0, 0);
    grad.addColorStop(0, '#fff4cc'); // Intense golden sun on horizon
    grad.addColorStop(0.18, '#ffba7a'); // Warm apricot peach
    grad.addColorStop(0.42, '#f08975'); // Sunset rose
    grad.addColorStop(0.7, '#966d92'); // Soft dusk lavender
    grad.addColorStop(1.0, '#534666'); // Deep dusk violet
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Soft fluffy sunset cloud bands
    ctx.fillStyle = 'rgba(255, 175, 140, 0.45)';
    ctx.beginPath();
    ctx.ellipse(350, 480, 240, 60, -0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(235, 145, 130, 0.4)';
    ctx.beginPath();
    ctx.ellipse(720, 520, 300, 75, 0.05, 0, Math.PI * 2);
    ctx.fill();

    const skyTex = new THREE.CanvasTexture(canvas);
    const skyGeo = new THREE.SphereGeometry(38, 32, 24);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide
    });

    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.skyGroup.add(skyDome);

    // Radiant Sun Disc along the path horizon
    const sunGeo = new THREE.CircleGeometry(2.4, 32);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xfffae6,
      transparent: true,
      opacity: 0.95
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(0, 3.2, -18);
    this.skyGroup.add(sunMesh);

    this.group.add(this.skyGroup);
  }

  /**
   * Updates floating firefly positions and pulsing luminescence
   */
  update(time) {
    this.fireflyData.forEach(d => {
      d.mesh.position.x = d.baseX + Math.sin(time * d.speedX + d.phase) * d.amplitudeX;
      d.mesh.position.y = d.baseY + Math.cos(time * d.speedY + d.phase) * d.amplitudeY;
      d.mesh.position.z = d.baseZ + Math.sin(time * 0.5 + d.phase) * 0.2;

      // Pulsing scale/glow
      const pulse = 1.0 + Math.sin(time * 4 + d.phase) * 0.3;
      d.mesh.scale.set(pulse, pulse, pulse);
    });
  }
}
