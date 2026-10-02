import * as THREE from 'three';

export const SKY_AIRY_COLOR = 0x90e0ef;
export const PLANE_CAMERA_POSITION = new THREE.Vector3(10.5, 9.0, 14.5);
export const PLANE_CAMERA_TARGET = new THREE.Vector3(0, 1.2, 0);

/**
 * Creates the dedicated Sky & Runway airport environment theme for the airplane build.
 * - scene.background = #90e0ef
 * - Stylized gray landing strip runway base (#457b9d / #2b2d42) with soft white striping markings
 * - Bright outdoor lighting (directional sun with soft shadows + hemisphere light)
 * - Low-poly decorative fluffy sky clouds on horizon
 */
export function createSkyEnvironment(parentGroup) {
  const envGroup = new THREE.Group();
  envGroup.name = 'sky-runway-environment-group';
  envGroup.userData.isEnvironment = true;

  // 1. Runway Platform Base (Disc + Asphalt Strip)
  // Large circular airfield disc (#457b9d)
  const platformRadius = 19;
  const platformGeom = new THREE.CylinderGeometry(platformRadius, platformRadius + 0.6, 0.4, 64);
  const platformMat = new THREE.MeshStandardMaterial({
    color: 0x457b9d,
    roughness: 0.85,
    metalness: 0.05
  });
  const platformMesh = new THREE.Mesh(platformGeom, platformMat);
  platformMesh.position.y = -0.2;
  platformMesh.receiveShadow = true;
  envGroup.add(platformMesh);

  // Runway Landing Strip (#2b2d42) running along the Z axis
  const runwayWidth = 9.6;
  const runwayLength = 34;
  const runwayGeom = new THREE.BoxGeometry(runwayWidth, 0.04, runwayLength);
  const runwayMat = new THREE.MeshStandardMaterial({
    color: 0x2b2d42,
    roughness: 0.78,
    metalness: 0.08
  });
  const runwayMesh = new THREE.Mesh(runwayGeom, runwayMat);
  runwayMesh.name = 'airport-runway-surface';
  runwayMesh.position.y = 0.01;
  runwayMesh.receiveShadow = true;
  envGroup.add(runwayMesh);

  // Soft white striping material
  const stripeMat = new THREE.MeshBasicMaterial({
    color: 0xf8fafc,
    transparent: true,
    opacity: 0.92
  });

  // Centerline dashed stripes
  const dashCount = 14;
  const dashLength = 1.3;
  const dashWidth = 0.32;
  const dashSpacing = runwayLength / dashCount;
  const dashGeom = new THREE.PlaneGeometry(dashWidth, dashLength);

  for (let i = 0; i < dashCount; i++) {
    const dash = new THREE.Mesh(dashGeom, stripeMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.035, -runwayLength / 2 + (i + 0.5) * dashSpacing);
    dash.receiveShadow = true;
    envGroup.add(dash);
  }

  // Runway border stripes (white outer edge lines)
  const edgeStripeGeom = new THREE.PlaneGeometry(0.24, runwayLength - 2);
  const leftEdge = new THREE.Mesh(edgeStripeGeom, stripeMat);
  leftEdge.rotation.x = -Math.PI / 2;
  leftEdge.position.set(-runwayWidth / 2 + 0.45, 0.035, 0);
  envGroup.add(leftEdge);

  const rightEdge = new THREE.Mesh(edgeStripeGeom, stripeMat);
  rightEdge.rotation.x = -Math.PI / 2;
  rightEdge.position.set(runwayWidth / 2 - 0.45, 0.035, 0);
  envGroup.add(rightEdge);

  // Threshold piano-key stripes (both ends of runway)
  const thresholdKeys = 6;
  const keyWidth = 0.45;
  const keyLength = 2.4;
  const keyGeom = new THREE.PlaneGeometry(keyWidth, keyLength);
  [-1, 1].forEach((endDir) => {
    const endZ = endDir * (runwayLength / 2 - 2.0);
    for (let k = 0; k < thresholdKeys; k++) {
      const kx = (k - (thresholdKeys - 1) / 2) * 1.05;
      const keyMesh = new THREE.Mesh(keyGeom, stripeMat);
      keyMesh.rotation.x = -Math.PI / 2;
      keyMesh.position.set(kx, 0.035, endZ);
      envGroup.add(keyMesh);
    }
  });

  // Touchdown aim point blocks
  const aimGeom = new THREE.PlaneGeometry(0.85, 3.2);
  [-1, 1].forEach((endDir) => {
    const aimZ = endDir * 7.5;
    [-2.2, 2.2].forEach((aimX) => {
      const aimMesh = new THREE.Mesh(aimGeom, stripeMat);
      aimMesh.rotation.x = -Math.PI / 2;
      aimMesh.position.set(aimX, 0.035, aimZ);
      envGroup.add(aimMesh);
    });
  });

  // Runway edge taxiway marker cones / lights
  const lightGeom = new THREE.CylinderGeometry(0.12, 0.16, 0.35, 12);
  const amberLightMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.6,
    roughness: 0.3
  });
  const cyanLightMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.6,
    roughness: 0.3
  });

  for (let z = -runwayLength / 2 + 1; z <= runwayLength / 2 - 1; z += 3.5) {
    const isEnd = Math.abs(z) > runwayLength / 2 - 3;
    const mat = isEnd ? cyanLightMat : amberLightMat;

    const leftLight = new THREE.Mesh(lightGeom, mat);
    leftLight.position.set(-runwayWidth / 2 - 0.3, 0.18, z);
    leftLight.castShadow = true;
    envGroup.add(leftLight);

    const rightLight = new THREE.Mesh(lightGeom, mat);
    rightLight.position.set(runwayWidth / 2 + 0.3, 0.18, z);
    rightLight.castShadow = true;
    envGroup.add(rightLight);
  }

  // 2. Decorative Fluffy Low-Poly Clouds in Perimeter
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.0
  });

  function makeCloud(cx, cy, cz, s) {
    const cg = new THREE.Group();
    const puffCount = 5;
    const puffGeom = new THREE.DodecahedronGeometry(1.2, 1);
    for (let p = 0; p < puffCount; p++) {
      const puff = new THREE.Mesh(puffGeom, cloudMat);
      puff.position.set(
        (p - 2) * 0.9 + (Math.sin(p * 2.1) * 0.3),
        Math.cos(p * 1.5) * 0.4,
        Math.sin(p * 1.8) * 0.4
      );
      puff.scale.setScalar(0.7 + (1 - Math.abs(p - 2) * 0.25));
      puff.castShadow = false;
      puff.receiveShadow = false;
      cg.add(puff);
    }
    cg.position.set(cx, cy, cz);
    cg.scale.setScalar(s);
    return cg;
  }

  const clouds = [
    makeCloud(-22, 6.5, -18, 1.8),
    makeCloud(24, 7.2, -16, 2.0),
    makeCloud(-25, 8.0, 16, 2.2),
    makeCloud(21, 6.8, 20, 1.9),
    makeCloud(0, 9.5, -28, 2.4),
    makeCloud(-14, 11.0, 26, 2.1)
  ];
  clouds.forEach(c => envGroup.add(c));

  // 3. Bright Outdoor Lighting
  // Directional Sun Light
  const sunLight = new THREE.DirectionalLight(0xfffdf5, 2.1);
  sunLight.position.set(16, 24, 18);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 2.0;
  sunLight.shadow.camera.far = 65;
  const d = 16;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.radius = 2.0;
  envGroup.add(sunLight);

  // Hemisphere Light (airy sky #90e0ef down to ground #457b9d)
  const hemiLight = new THREE.HemisphereLight(0x90e0ef, 0x457b9d, 1.35);
  hemiLight.position.set(0, 25, 0);
  envGroup.add(hemiLight);

  // Soft outdoor fill light for underside of wings and wheels
  const groundBounceLight = new THREE.DirectionalLight(0xcdebf7, 0.55);
  groundBounceLight.position.set(-10, -5, -10);
  envGroup.add(groundBounceLight);

  parentGroup.add(envGroup);

  return {
    group: envGroup,
    runwayMesh,
    platformMesh,
    sunLight,
    hemiLight,
    update: (delta, time) => {
      // Gentle cloud drift
      clouds.forEach((c, idx) => {
        c.position.x += Math.sin(time * 0.15 + idx) * 0.008;
      });
    }
  };
}
