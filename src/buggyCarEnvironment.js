import * as THREE from 'three';

export const BUGGY_CAR_SKY_COLOR = 0x82d8f7;
export const BUGGY_CAR_CAMERA_POSITION = new THREE.Vector3(11.5, 10, 20.5);
export const BUGGY_CAR_CAMERA_TARGET = new THREE.Vector3(0, 1.2, -0.8);

function makeSkyDome() {
  const geometry = new THREE.SphereGeometry(180, 40, 24);
  const positions = geometry.attributes.position;
  const colors = [];
  const horizon = new THREE.Color(0xd7f7ff);
  const zenith = new THREE.Color(0x64c7f4);

  for (let i = 0; i < positions.count; i++) {
    const height = THREE.MathUtils.clamp((positions.getY(i) / 180 + 0.08) / 0.92, 0, 1);
    const color = horizon.clone().lerp(zenith, height * height);
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false
  }));
}

function makeRoadRing() {
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, 20, 15.5, 0, Math.PI * 2, false, 0);
  const inner = new THREE.Path();
  inner.absellipse(0, 0, 15, 10.35, 0, Math.PI * 2, true, 0);
  shape.holes.push(inner);

  const road = new THREE.Mesh(
    new THREE.ShapeGeometry(shape, 128),
    new THREE.MeshStandardMaterial({ color: 0x38414a, roughness: 0.94, metalness: 0 })
  );
  road.name = 'buggy-oval-race-track';
  road.rotation.x = -Math.PI / 2;
  road.position.y = -0.16;
  road.receiveShadow = true;
  return road;
}

function addOvalLine(group, radiusX, radiusZ, color, y, opacity = 1) {
  const points = [];
  const count = 192;
  for (let i = 0; i <= count; i++) {
    const angle = (i / count) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radiusX, y, Math.sin(angle) * radiusZ));
  }
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity })
  );
  group.add(line);
}

function addLaneDashes(group) {
  const geometry = new THREE.BoxGeometry(0.16, 0.025, 0.8);
  const material = new THREE.MeshStandardMaterial({ color: 0xfff8df, roughness: 0.82 });
  const count = 64;
  const dashes = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  const radiusX = 17.5;
  const radiusZ = 12.925;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const tangentX = -radiusX * Math.sin(angle);
    const tangentZ = radiusZ * Math.cos(angle);
    dummy.position.set(radiusX * Math.cos(angle), -0.125, radiusZ * Math.sin(angle));
    dummy.rotation.set(0, Math.atan2(tangentX, tangentZ), 0);
    dummy.updateMatrix();
    dashes.setMatrixAt(i, dummy.matrix);
  }

  dashes.instanceMatrix.needsUpdate = true;
  group.add(dashes);
}

function addColorfulCurbs(group) {
  const countPerSide = 80;
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.78, 0.16, 0.56),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72 }),
    countPerSide * 2
  );
  const dummy = new THREE.Object3D();
  const red = new THREE.Color(0xff5964);
  const cream = new THREE.Color(0xfff1c7);
  const centerX = 17.5;
  const centerZ = 12.925;
  let instance = 0;

  for (let i = 0; i < countPerSide; i++) {
    const angle = (i / countPerSide) * Math.PI * 2;
    const tangentX = -centerX * Math.sin(angle);
    const tangentZ = centerZ * Math.cos(angle);
    for (const side of [-1, 1]) {
      const radiusOffset = side * 2.37;
      const radiusX = centerX + radiusOffset;
      const radiusZ = centerZ + radiusOffset * (centerZ / centerX);
      dummy.position.set(radiusX * Math.cos(angle), -0.045, radiusZ * Math.sin(angle));
      dummy.rotation.set(0, Math.atan2(tangentX, tangentZ), 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(instance, dummy.matrix);
      mesh.setColorAt(instance, i % 2 ? red : cream);
      instance++;
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = true;
  group.add(mesh);
}

function addFinishLine(group) {
  const black = new THREE.MeshBasicMaterial({ color: 0x202a32 });
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const tile = new THREE.BoxGeometry(0.45, 0.028, 0.45);
  for (let row = 0; row < 2; row++) {
    for (let column = 0; column < 12; column++) {
      const square = new THREE.Mesh(tile, (row + column) % 2 ? black : white);
      square.position.set(-2.7 + column * 0.49, -0.125, -13.0 + row * 0.49);
      group.add(square);
    }
  }
}

function addFinishArch(group) {
  const postGeometry = new THREE.CylinderGeometry(0.14, 0.2, 3.3, 12);
  const postMaterial = new THREE.MeshStandardMaterial({ color: 0xffad32, roughness: 0.48 });
  for (const x of [-3.2, 3.2]) {
    const post = new THREE.Mesh(postGeometry, postMaterial);
    post.position.set(x, 1.55, -13.1);
    post.castShadow = true;
    group.add(post);
  }

  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(6.7, 0.3, 0.38),
    new THREE.MeshStandardMaterial({ color: 0x12a8bb, roughness: 0.5 })
  );
  beam.position.set(0, 3.15, -13.1);
  beam.castShadow = true;
  group.add(beam);

  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512;
  signCanvas.height = 128;
  const context = signCanvas.getContext('2d');
  context.fillStyle = '#fff4cc';
  context.fillRect(0, 0, signCanvas.width, signCanvas.height);
  context.fillStyle = '#134154';
  context.font = '900 64px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('BUGGY CUP', 256, 65);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 1.05),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas), toneMapped: false })
  );
  sign.position.set(0, 3.16, -12.88);
  group.add(sign);
}

function addTrees(group) {
  const treeCount = 10;
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.22, 0.34, 1.65, 8),
    new THREE.MeshStandardMaterial({ color: 0x9c6038, roughness: 0.88 }),
    treeCount
  );
  const crowns = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }),
    treeCount * 3
  );
  const dummy = new THREE.Object3D();
  const greens = [new THREE.Color(0x36b96c), new THREE.Color(0x78d66f), new THREE.Color(0x22a967)];
  let crownIndex = 0;

  for (let i = 0; i < treeCount; i++) {
    const angle = (i / treeCount) * Math.PI * 2 + 0.18;
    const x = Math.cos(angle) * 25.6;
    const z = Math.sin(angle) * 20.0;
    const groundY = -0.17;

    dummy.position.set(x, groundY + 0.83, z);
    dummy.rotation.set(0, angle, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);

    for (let puff = 0; puff < 3; puff++) {
      const spread = puff - 1;
      dummy.position.set(x + spread * 0.55, groundY + 2.0 + (puff === 1 ? 0.42 : 0), z + (puff % 2 ? 0.28 : -0.18));
      dummy.rotation.set(0, angle, 0);
      dummy.scale.set(1.0 + (puff === 1 ? 0.05 : 0), 0.95 + (puff === 1 ? 0.08 : 0), 1.0);
      dummy.updateMatrix();
      crowns.setMatrixAt(crownIndex, dummy.matrix);
      crowns.setColorAt(crownIndex, greens[(i + puff) % greens.length]);
      crownIndex++;
    }
  }

  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
  trunks.castShadow = true;
  crowns.castShadow = true;
  group.add(trunks, crowns);
}

function addCones(group) {
  const base = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.52, 0.52, 0.1, 12),
    new THREE.MeshStandardMaterial({ color: 0xffe4a3, roughness: 0.78 }),
    8
  );
  const cones = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.42, 1.05, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65 }),
    8
  );
  const dummy = new THREE.Object3D();
  const coneColors = [0xff754c, 0xffcf42, 0x56c9d9, 0xf36fa8];

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + 0.3;
    const x = Math.cos(angle) * 22.1;
    const z = Math.sin(angle) * 17.2;
    dummy.position.set(x, -0.115, z);
    dummy.updateMatrix();
    base.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, 0.43, z);
    dummy.updateMatrix();
    cones.setMatrixAt(i, dummy.matrix);
    cones.setColorAt(i, new THREE.Color(coneColors[i % coneColors.length]));
  }

  base.instanceMatrix.needsUpdate = true;
  cones.instanceMatrix.needsUpdate = true;
  if (cones.instanceColor) cones.instanceColor.needsUpdate = true;
  group.add(base, cones);
}

function addPitStop(group) {
  const pit = new THREE.Group();
  pit.name = 'buggy-pit-stop';
  pit.position.set(-23, -0.16, 1.2);

  const foundation = new THREE.Mesh(
    new THREE.BoxGeometry(6.2, 0.26, 4.4),
    new THREE.MeshStandardMaterial({ color: 0xffcf71, roughness: 0.85 })
  );
  foundation.position.y = -0.02;
  pit.add(foundation);

  const postGeometry = new THREE.BoxGeometry(0.2, 2.5, 0.2);
  const postMaterial = new THREE.MeshStandardMaterial({ color: 0x12a8bb, roughness: 0.58 });
  for (const x of [-2.65, 2.65]) {
    for (const z of [-1.65, 1.65]) {
      const post = new THREE.Mesh(postGeometry, postMaterial);
      post.position.set(x, 1.23, z);
      post.castShadow = true;
      pit.add(post);
    }
  }

  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(6.4, 0.28, 4.5),
    new THREE.MeshStandardMaterial({ color: 0xf15b73, roughness: 0.58 })
  );
  canopy.position.set(0, 2.55, 0);
  canopy.castShadow = true;
  pit.add(canopy);

  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512;
  signCanvas.height = 128;
  const context = signCanvas.getContext('2d');
  context.fillStyle = '#123f53';
  context.fillRect(0, 0, 512, 128);
  context.fillStyle = '#fff3c4';
  context.font = '900 64px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('PIT STOP', 256, 65);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 1.1),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas), toneMapped: false })
  );
  sign.position.set(0, 1.9, 2.22);
  pit.add(sign);

  pit.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  group.add(pit);
}

function addClouds(group) {
  const cloud = new THREE.Group();
  cloud.name = 'buggy-race-clouds';
  const puffGeometry = new THREE.SphereGeometry(1, 16, 12);
  const puffMaterial = new THREE.MeshBasicMaterial({ color: 0xf4fdff, fog: false });
  const cloudSpots = [
    [-27, 14, -25, 3.4], [25, 16, -31, 3.1], [32, 12, 9, 2.7], [-34, 15, 12, 3.2], [-11, 18, -41, 2.7]
  ];
  cloudSpots.forEach(([x, y, z, size]) => {
    const center = new THREE.Group();
    center.position.set(x, y, z);
    const offsets = [[0, 0, 0], [0.9, 0.3, 0], [-0.85, 0.14, 0.1], [0.15, 0.52, -0.1]];
    offsets.forEach(([ox, oy, oz], index) => {
      const puff = new THREE.Mesh(puffGeometry, puffMaterial);
      puff.position.set(ox * size, oy * size, oz * size);
      puff.scale.setScalar(size * (index === 0 ? 0.58 : 0.42));
      center.add(puff);
    });
    cloud.add(center);
  });
  group.add(cloud);
}

export function createBuggyCarEnvironment(environmentGroup) {
  environmentGroup.name = 'buggy-car-race-park';
  environmentGroup.userData.isEnvironment = true;

  const sky = makeSkyDome();
  sky.name = 'buggy-race-sky';
  environmentGroup.add(sky);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshStandardMaterial({ color: 0x8dd58b, roughness: 1 })
  );
  ground.name = 'buggy-race-grass-horizon';
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.96;
  ground.receiveShadow = true;
  environmentGroup.add(ground);

  const islandBase = new THREE.Mesh(
    new THREE.CylinderGeometry(30, 31, 0.68, 128),
    new THREE.MeshStandardMaterial({ color: 0x9b633d, roughness: 0.92 })
  );
  islandBase.name = 'race-park-island-edge';
  islandBase.position.y = -0.65;
  islandBase.receiveShadow = true;
  environmentGroup.add(islandBase);

  const islandGrass = new THREE.Mesh(
    new THREE.CylinderGeometry(29.95, 30.2, 0.13, 128),
    new THREE.MeshStandardMaterial({ color: 0x6fcd79, roughness: 0.94 })
  );
  islandGrass.name = 'race-park-meadow';
  islandGrass.position.y = -0.245;
  islandGrass.receiveShadow = true;
  environmentGroup.add(islandGrass);

  const buildDeckBase = new THREE.Mesh(
    new THREE.CylinderGeometry(13.0, 13.3, 0.28, 96),
    new THREE.MeshStandardMaterial({ color: 0xf29a58, roughness: 0.7 })
  );
  buildDeckBase.name = 'buggy-build-deck-coral-edge';
  buildDeckBase.position.y = -0.28;
  buildDeckBase.receiveShadow = true;
  environmentGroup.add(buildDeckBase);

  const buildDeck = new THREE.Mesh(
    new THREE.CylinderGeometry(12.78, 13.0, 0.28, 96),
    new THREE.MeshStandardMaterial({ color: 0x94df99, roughness: 0.9 })
  );
  buildDeck.name = 'buggy-build-deck-grass';
  buildDeck.position.y = -0.14;
  buildDeck.receiveShadow = true;
  environmentGroup.add(buildDeck);

  environmentGroup.add(makeRoadRing());
  addOvalLine(environmentGroup, 19.92, 15.44, 0xfff3d0, -0.145, 0.95);
  addOvalLine(environmentGroup, 15.08, 10.42, 0xfff3d0, -0.145, 0.95);
  addLaneDashes(environmentGroup);
  addColorfulCurbs(environmentGroup);
  addFinishLine(environmentGroup);
  addFinishArch(environmentGroup);
  addTrees(environmentGroup);
  addCones(environmentGroup);
  addPitStop(environmentGroup);
  addClouds(environmentGroup);

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(2.3, 24, 18),
    new THREE.MeshBasicMaterial({ color: 0xffdf88, fog: false })
  );
  sun.name = 'buggy-race-sun';
  sun.position.set(-33, 22, -42);
  environmentGroup.add(sun);

  const hemisphere = new THREE.HemisphereLight(0xcaf3ff, 0x54784b, 1.15);
  hemisphere.name = 'buggy-race-sky-light';
  environmentGroup.add(hemisphere);

  const sunlight = new THREE.DirectionalLight(0xfff1d3, 1.8);
  sunlight.name = 'buggy-race-sunlight';
  sunlight.position.set(-15, 26, 12);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(1536, 1536);
  sunlight.shadow.camera.left = -36;
  sunlight.shadow.camera.right = 36;
  sunlight.shadow.camera.top = 36;
  sunlight.shadow.camera.bottom = -36;
  sunlight.shadow.bias = -0.00035;
  environmentGroup.add(sunlight);

  return environmentGroup;
}
