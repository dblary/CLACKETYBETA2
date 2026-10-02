import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const ASSET_ROOT = '/assets/kenney-pirate-kit/';

function makeBoatSkyBackground() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext('2d');
  const sky = context.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#168ee1');
  sky.addColorStop(0.48, '#39b8eb');
  sky.addColorStop(0.79, '#aae5f3');
  sky.addColorStop(1, '#66cbe5');
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const sun = context.createRadialGradient(1540, 230, 12, 1540, 230, 280);
  sun.addColorStop(0, 'rgba(255, 245, 180, 0.92)');
  sun.addColorStop(0.2, 'rgba(255, 240, 172, 0.32)');
  sun.addColorStop(1, 'rgba(255, 240, 172, 0)');
  context.fillStyle = sun;
  context.fillRect(1240, 0, 600, 530);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const BOAT_SKY_BACKGROUND = makeBoatSkyBackground();

function makeSkyDome() {
  const geometry = new THREE.SphereGeometry(260, 48, 28, 0, Math.PI * 2, 0, Math.PI / 2);
  const positions = geometry.attributes.position;
  const colors = [];
  const zenith = new THREE.Color(0x168ee1);
  const midSky = new THREE.Color(0x39b8eb);
  const horizon = new THREE.Color(0x66cbe5);

  for (let i = 0; i < positions.count; i++) {
    const height = THREE.MathUtils.clamp(positions.getY(i) / 260, 0, 1);
    const color = height < 0.32
      ? horizon.clone().lerp(midSky, height / 0.32)
      : midSky.clone().lerp(zenith, (height - 0.32) / 0.68);
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false,
    fog: false,
    toneMapped: false
  });
  const dome = new THREE.Mesh(geometry, material);
  dome.name = 'lagoon-gradient-sky';
  dome.renderOrder = -10;
  return dome;
}

function makeWaterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  context.fillStyle = '#43bfdc';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const wash = context.createLinearGradient(0, 0, 512, 512);
  wash.addColorStop(0, 'rgba(20, 151, 207, 0.30)');
  wash.addColorStop(0.48, 'rgba(168, 247, 241, 0.13)');
  wash.addColorStop(1, 'rgba(9, 126, 190, 0.31)');
  context.fillStyle = wash;
  context.fillRect(0, 0, 512, 512);

  for (let row = -1; row < 8; row++) {
    const y = row * 78 + 34;
    context.beginPath();
    context.moveTo(-30, y);
    for (let x = 0; x <= 560; x += 28) {
      const yy = y + Math.sin((x / 560) * Math.PI * 4 + row * 1.7) * 9;
      context.lineTo(x, yy);
    }
    context.strokeStyle = row % 2 === 0 ? 'rgba(224, 255, 251, 0.34)' : 'rgba(11, 133, 191, 0.14)';
    context.lineWidth = row % 2 === 0 ? 3 : 2;
    context.stroke();
  }

  for (let i = 0; i < 58; i++) {
    const x = (i * 137.5 + 23) % 512;
    const y = (i * 83.7 + 57) % 512;
    const length = 4 + (i % 5) * 2;
    context.beginPath();
    context.ellipse(x, y, length, 1.3 + (i % 3) * 0.35, -0.16, 0, Math.PI * 2);
    context.fillStyle = `rgba(245, 255, 245, ${0.18 + (i % 4) * 0.07})`;
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(15, 15);
  texture.anisotropy = 4;
  return texture;
}

function makeWaterMaterial() {
  const texture = makeWaterTexture();
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x8ee8ef,
    map: texture,
    roughness: 0.25,
    metalness: 0.02,
    clearcoat: 0.55,
    clearcoatRoughness: 0.32
  });

  let timeUniform;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uLagoonTime = { value: 0 };
    timeUniform = shader.uniforms.uLagoonTime;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\nuniform float uLagoonTime;\nvarying vec3 vLagoonWorldPosition;'
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       float lagoonWaveA = sin(position.x * 0.095 + uLagoonTime * 0.75);
       float lagoonWaveB = cos(position.y * 0.082 - uLagoonTime * 0.58);
       transformed.z += lagoonWaveA * 0.065 + lagoonWaveB * 0.045;
       vLagoonWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      '#include <common>\nuniform float uLagoonTime;\nvarying vec3 vLagoonWorldPosition;'
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
       float lagoonFlow = sin(vLagoonWorldPosition.x * 0.18 +
         sin(vLagoonWorldPosition.z * 0.12 + uLagoonTime * 0.22) * 1.35 + uLagoonTime * 0.38) *
         cos(vLagoonWorldPosition.z * 0.16 - uLagoonTime * 0.31);
       float lagoonFoam = smoothstep(0.72, 0.95, lagoonFlow);
       diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.70, 0.96, 0.95), lagoonFoam * 0.24);`
    );
  };
  material.customProgramCacheKey = () => 'clackety-lagoon-water-v1';
  return {
    material,
    update(time) {
      texture.offset.x = (time * 0.006) % 1;
      if (timeUniform) timeUniform.value = time;
    }
  };
}

function makeCloud(seed, radius, angle, scale) {
  const group = new THREE.Group();
  group.name = 'lagoon-cloud';
  const cloudMaterial = new THREE.MeshBasicMaterial({ color: 0xf5fdff, fog: false });
  const shadeMaterial = new THREE.MeshBasicMaterial({ color: 0xc9f0f8, fog: false });
  const puffs = [
    [-0.75, 0.00, 0.08, 0.88],
    [-0.28, 0.28, 0.00, 1.05],
    [0.32, 0.20, -0.03, 0.92],
    [0.78, 0.02, 0.04, 0.73],
    [-0.02, -0.02, 0.08, 0.96]
  ];
  const puffGeometry = new THREE.SphereGeometry(1, 12, 9);
  puffs.forEach(([x, y, z, size], index) => {
    const puff = new THREE.Mesh(puffGeometry, index === 0 && seed % 2 === 0 ? shadeMaterial : cloudMaterial);
    puff.position.set(x, y, z);
    puff.scale.set(1.35 * size, 0.62 * size, 0.82 * size);
    group.add(puff);
  });
  group.scale.setScalar(scale);
  group.position.set(Math.cos(angle) * radius, 12.5 + (seed % 3) * 0.8, Math.sin(angle) * radius);
  group.rotation.y = -angle + Math.PI / 2;
  return group;
}

function normalizeAsset(root, horizontalSize, verticalSize = null) {
  const model = root.clone(true);
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  bounds.getSize(size);
  const horizontal = Math.max(size.x, size.z, 0.001);
  const ratio = verticalSize && size.y > 0.001
    ? verticalSize / size.y
    : horizontalSize / horizontal;
  model.scale.multiplyScalar(ratio);
  model.updateMatrixWorld(true);
  const scaledBounds = new THREE.Box3().setFromObject(model);
  const scaledSize = new THREE.Vector3();
  scaledBounds.getSize(scaledSize);
  model.position.x -= scaledBounds.getCenter(new THREE.Vector3()).x;
  model.position.z -= scaledBounds.getCenter(new THREE.Vector3()).z;
  model.position.y -= scaledBounds.min.y;
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return { model, size: scaledSize };
}

function createBuoy(index, x, z) {
  const group = new THREE.Group();
  group.name = `lagoon-marker-${index + 1}`;
  const white = new THREE.MeshStandardMaterial({ color: 0xfff9e8, roughness: 0.42 });
  const accent = new THREE.MeshStandardMaterial({ color: [0xff735d, 0xffd24a, 0xa78bfa, 0x4ade80][index], roughness: 0.34 });
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.48, 0.56, 10), white);
  collar.position.y = 0.38;
  collar.castShadow = true;
  group.add(collar);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), accent);
  cap.position.y = 0.82;
  cap.castShadow = true;
  group.add(cap);
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.405, 0.07, 6, 16), accent);
  stripe.rotation.x = Math.PI / 2;
  stripe.position.y = 0.52;
  group.add(stripe);
  group.position.set(x, 0, z);
  group.userData.bobOffset = index * 1.37;
  return group;
}

export function createBoatEnvironment(environmentGroup, waterDisc) {
  const water = makeWaterMaterial();
  waterDisc.geometry.dispose();
  waterDisc.geometry = new THREE.CylinderGeometry(300, 301, 0.42, 128, 1);
  waterDisc.material.dispose();
  waterDisc.material = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  waterDisc.position.set(0, -0.21, 0);
  waterDisc.name = 'lagoon-placement-surface';

  const waterPlane = new THREE.Mesh(new THREE.PlaneGeometry(600, 600, 160, 160), water.material);
  waterPlane.name = 'lagoon-animated-water';
  waterPlane.rotation.x = -Math.PI / 2;
  waterPlane.position.y = -0.008;
  waterPlane.receiveShadow = true;
  environmentGroup.add(waterPlane);
  environmentGroup.add(makeSkyDome());

  const clouds = [];
  for (let i = 0; i < 7; i++) {
    const cloud = makeCloud(i, 36 + (i % 3) * 5, (i / 7) * Math.PI * 2 + 0.12, 2.45 + (i % 4) * 0.3);
    clouds.push(cloud);
    environmentGroup.add(cloud);
  }

  const sunGlow = new THREE.Mesh(
    new THREE.SphereGeometry(2.6, 20, 14),
    new THREE.MeshBasicMaterial({ color: 0xffe38a, fog: false })
  );
  sunGlow.name = 'lagoon-sun';
  sunGlow.position.set(-22, 12.5, -34);
  environmentGroup.add(sunGlow);

  const buoys = [
    createBuoy(0, -14.5, -11.5),
    createBuoy(1, 15.8, -9.2),
    createBuoy(2, -16.0, 10.8),
    createBuoy(3, 13.8, 13.8)
  ];
  buoys.forEach((buoy) => environmentGroup.add(buoy));

  const rimLights = new THREE.Group();
  rimLights.name = 'lagoon-floating-ripples';
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.5 + (i % 3) * 0.25, 0.025, 5, 48),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0xc9fbf6 : 0xffffff, transparent: true, opacity: 0.55 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(Math.cos(angle) * 10.5, 0.03, Math.sin(angle) * 10.5);
    ring.scale.set(1.45, 0.63, 1);
    rimLights.add(ring);
  }
  environmentGroup.add(rimLights);

  const hemisphere = new THREE.HemisphereLight(0xc6f8ff, 0x347d89, 0.8);
  hemisphere.name = 'lagoon-sky-fill';
  environmentGroup.add(hemisphere);
  const sun = new THREE.DirectionalLight(0xfff2c6, 1.35);
  sun.name = 'lagoon-warm-sunlight';
  sun.position.set(-24, 35, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.bias = -0.0003;
  environmentGroup.add(sun);

  const loader = new GLTFLoader();
  const assetNames = [
    'palm-straight.glb',
    'palm-detailed-bend.glb',
    'rocks-sand-a.glb',
    'rocks-sand-b.glb',
    'patch-sand-foliage.glb',
    'ship-small.glb'
  ];
  const prototypes = {};
  Promise.allSettled(assetNames.map((name) => loader.loadAsync(`${ASSET_ROOT}${name}`))).then((results) => {
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') prototypes[assetNames[index]] = result.value.scene;
      else console.warn(`Lagoon scenery asset could not be loaded: ${assetNames[index]}`, result.reason);
    });

    const rockA = prototypes['rocks-sand-a.glb'];
    const rockB = prototypes['rocks-sand-b.glb'] || rockA;
    const sandPatch = prototypes['patch-sand-foliage.glb'];
    const palms = [prototypes['palm-straight.glb'], prototypes['palm-detailed-bend.glb']].filter(Boolean);

    const islandPlan = [
      { angle: -2.55, radius: 27, scale: 0.66, trees: 2 },
      { angle: -2.32, radius: 32, scale: 0.74, trees: 3 },
      { angle: -2.09, radius: 28, scale: 0.68, trees: 2 },
      { angle: -1.86, radius: 31, scale: 0.78, trees: 3 },
      { angle: -1.63, radius: 26, scale: 0.62, trees: 2 }
    ];

    if (rockA && sandPatch && palms.length) {
      islandPlan.forEach((spec, islandIndex) => {
        const island = new THREE.Group();
        island.name = `kenney-tropical-island-${islandIndex + 1}`;
        island.position.set(Math.cos(spec.angle) * spec.radius, -0.12, Math.sin(spec.angle) * spec.radius);
        island.rotation.y = -spec.angle;
        island.scale.setScalar(spec.scale);

        const rockSource = islandIndex % 2 ? rockB : rockA;
        const base = normalizeAsset(rockSource, 14.5);
        base.model.position.y = -0.35;
        island.add(base.model);

        const ground = normalizeAsset(sandPatch, 13.3);
        ground.model.position.y = Math.max(0.55, base.size.y * 0.35);
        island.add(ground.model);

        for (let treeIndex = 0; treeIndex < spec.trees; treeIndex++) {
          const source = palms[(treeIndex + islandIndex) % palms.length];
          const palm = normalizeAsset(source, null, 8.4 + (treeIndex % 2) * 0.7);
          const angle = (treeIndex / spec.trees) * Math.PI * 2 + islandIndex * 0.61;
          palm.model.position.set(Math.cos(angle) * (2.0 + (treeIndex % 2) * 1.0), ground.model.position.y, Math.sin(angle) * (1.4 + (treeIndex % 2) * 0.8));
          palm.model.rotation.y = angle + islandIndex * 0.4;
          island.add(palm.model);
        }

        environmentGroup.add(island);
      });
    } else {
      console.warn('Lagoon island assets are incomplete; showing the low-poly island fallback.');
      const sandMaterial = new THREE.MeshStandardMaterial({ color: 0xf7cd70, roughness: 0.92 });
      const grassMaterial = new THREE.MeshStandardMaterial({ color: 0x78ce73, roughness: 0.94 });
      const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0xa97145, roughness: 0.88 });
      const leafMaterials = [
        new THREE.MeshStandardMaterial({ color: 0x29b66c, roughness: 0.86 }),
        new THREE.MeshStandardMaterial({ color: 0x70cf65, roughness: 0.86 })
      ];

      islandPlan.forEach((spec, islandIndex) => {
        const island = new THREE.Group();
        island.name = `lagoon-fallback-island-${islandIndex + 1}`;
        island.position.set(Math.cos(spec.angle) * spec.radius, 0, Math.sin(spec.angle) * spec.radius);
        island.rotation.y = -spec.angle;
        island.scale.setScalar(spec.scale);

        const sandMound = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 9), sandMaterial);
        sandMound.scale.set(7.1, 1.35, 5.4);
        sandMound.position.y = 0.15;
        sandMound.castShadow = true;
        island.add(sandMound);

        const grassyTop = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), grassMaterial);
        grassyTop.scale.set(5.25, 0.42, 3.95);
        grassyTop.position.set(0, 1.18, -0.25);
        grassyTop.receiveShadow = true;
        island.add(grassyTop);

        for (let treeIndex = 0; treeIndex < spec.trees; treeIndex++) {
          const angle = (treeIndex / spec.trees) * Math.PI * 2 + islandIndex * 0.55;
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.30, 4.8, 7), trunkMaterial);
          trunk.position.set(Math.cos(angle) * 2.2, 3.1, Math.sin(angle) * 1.7);
          trunk.rotation.z = Math.cos(angle) * -0.08;
          trunk.castShadow = true;
          island.add(trunk);

          const crown = new THREE.Group();
          crown.position.copy(trunk.position).add(new THREE.Vector3(0, 2.25, 0));
          for (let leafIndex = 0; leafIndex < 7; leafIndex++) {
            const leaf = new THREE.Mesh(
              new THREE.SphereGeometry(1, 8, 6),
              leafMaterials[(leafIndex + treeIndex + islandIndex) % leafMaterials.length]
            );
            const leafAngle = (leafIndex / 7) * Math.PI * 2;
            leaf.position.set(Math.cos(leafAngle) * 1.05, -0.20, Math.sin(leafAngle) * 0.62);
            leaf.scale.set(1.35, 0.18, 0.32);
            leaf.rotation.y = -leafAngle;
            leaf.rotation.z = -0.18;
            leaf.castShadow = true;
            crown.add(leaf);
          }
          island.add(crown);
        }

        environmentGroup.add(island);
      });
    }

    const distantShip = prototypes['ship-small.glb'];
    if (distantShip) {
      const ship = normalizeAsset(distantShip, 11.0);
      ship.model.name = 'kenney-distant-lagoon-sailboat';
      ship.model.position.set(-8, 0.22, -18);
      ship.model.rotation.y = -0.38;
      environmentGroup.add(ship.model);
    } else {
      const sailboat = new THREE.Group();
      sailboat.name = 'lagoon-fallback-sailboat';
      const hullMaterial = new THREE.MeshStandardMaterial({ color: 0xf66b71, roughness: 0.5 });
      const deckMaterial = new THREE.MeshStandardMaterial({ color: 0xffe6a6, roughness: 0.7 });
      const mastMaterial = new THREE.MeshStandardMaterial({ color: 0x8c6242, roughness: 0.8 });
      const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.58, 4.8, 8), hullMaterial);
      hull.rotation.z = Math.PI / 2;
      hull.position.y = 0.6;
      hull.castShadow = true;
      sailboat.add(hull);

      const deck = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.18, 1.2), deckMaterial);
      deck.position.y = 1.02;
      sailboat.add(deck);

      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 5.3, 8), mastMaterial);
      mast.position.set(-0.35, 3.55, 0);
      mast.castShadow = true;
      sailboat.add(mast);

      const sailMaterial = new THREE.MeshStandardMaterial({ color: 0xf9fbff, roughness: 0.62, side: THREE.DoubleSide });
      const sailGeometry = new THREE.BufferGeometry();
      sailGeometry.setFromPoints([
        new THREE.Vector3(-0.25, 5.9, 0),
        new THREE.Vector3(2.0, 1.55, 0),
        new THREE.Vector3(-0.25, 1.55, 0)
      ]);
      sailGeometry.computeVertexNormals();
      const sail = new THREE.Mesh(sailGeometry, sailMaterial);
      sail.position.y = 0.5;
      sailboat.add(sail);

      const accentSail = new THREE.Mesh(
        new THREE.PlaneGeometry(1.25, 2.4),
        new THREE.MeshStandardMaterial({ color: 0xff7ba8, roughness: 0.6, side: THREE.DoubleSide })
      );
      accentSail.position.set(-0.95, 3.35, 0.08);
      accentSail.rotation.z = -0.12;
      sailboat.add(accentSail);

      sailboat.position.set(-8, 0.18, -18);
      sailboat.rotation.y = -0.38;
      sailboat.scale.setScalar(0.82);
      environmentGroup.add(sailboat);
    }
  }).catch((error) => console.warn('Lagoon scenery could not be prepared.', error));

  let elapsed = 0;
  return {
    update(delta) {
      elapsed += delta;
      water.update(elapsed);
      clouds.forEach((cloud, index) => {
        cloud.position.x += Math.sin(elapsed * 0.025 + index) * delta * 0.05;
      });
      buoys.forEach((buoy) => {
        buoy.position.y = Math.sin(elapsed * 1.3 + buoy.userData.bobOffset) * 0.11;
        buoy.rotation.y = Math.sin(elapsed * 0.4 + buoy.userData.bobOffset) * 0.06;
      });
      rimLights.rotation.y = elapsed * 0.025;
    }
  };
}
