import * as THREE from 'three';

export const HELIPAD_SKY_COLOR = 0x72c4ec;
export const HELICOPTER_CAMERA_POSITION = new THREE.Vector3(9.5, 8.2, 13.5);
export const HELICOPTER_CAMERA_TARGET = new THREE.Vector3(0, 1.0, 0);

/**
 * Creates a dedicated Helipad environment for the Rescue Helicopter build.
 * - Circular landing pad disc with asphalt texture, yellow border ring, and bold 'H' markings
 * - Perimeter runway/helipad beacon lights (amber, blue, green)
 * - Decorative windsock mast and horizon low-poly clouds
 * - Soft sunny airfield directional and ambient lighting
 */
export function createHelipadEnvironment(parentGroup) {
  const envGroup = new THREE.Group();
  envGroup.name = 'helipad-environment-group';
  envGroup.userData.isEnvironment = true;

  // 1. Airfield Base Ground Platform
  const baseRadius = 20;
  const baseGeom = new THREE.CylinderGeometry(baseRadius, baseRadius + 0.8, 0.4, 64);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.88,
    metalness: 0.05
  });
  const baseMesh = new THREE.Mesh(baseGeom, baseMat);
  baseMesh.position.y = -0.2;
  baseMesh.receiveShadow = true;
  envGroup.add(baseMesh);

  // 2. Circular Helipad Landing Deck
  const padRadius = 9.5;
  const padGeom = new THREE.CylinderGeometry(padRadius, padRadius, 0.06, 64);
  const padMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.80,
    metalness: 0.10
  });
  const helipadMesh = new THREE.Mesh(padGeom, padMat);
  helipadMesh.name = 'helipad-surface';
  helipadMesh.position.y = 0.01;
  helipadMesh.receiveShadow = true;
  envGroup.add(helipadMesh);

  // 3. Markings: Yellow Outer Ring
  const ringGeom = new THREE.RingGeometry(padRadius - 0.7, padRadius - 0.2, 64);
  const yellowMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    side: THREE.DoubleSide
  });
  const ringMesh = new THREE.Mesh(ringGeom, yellowMat);
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = 0.042;
  ringMesh.receiveShadow = true;
  envGroup.add(ringMesh);

  // Inner dashed guide ring
  const innerRingGeom = new THREE.RingGeometry(padRadius - 2.8, padRadius - 2.5, 48);
  const whiteMarkingMat = new THREE.MeshBasicMaterial({
    color: 0xf8fafc,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85
  });
  const innerRingMesh = new THREE.Mesh(innerRingGeom, whiteMarkingMat);
  innerRingMesh.rotation.x = -Math.PI / 2;
  innerRingMesh.position.y = 0.042;
  innerRingMesh.receiveShadow = true;
  envGroup.add(innerRingMesh);

  // 4. Bold Yellow "H" Marking in Center
  const hGroup = new THREE.Group();
  hGroup.position.set(0, 0.043, 0);

  const barMat = yellowMat;
  const hHeight = 5.2;
  const barWidth = 0.75;
  const hSpread = 1.6;

  // Left vertical leg
  const leftLegGeom = new THREE.PlaneGeometry(barWidth, hHeight);
  const leftLeg = new THREE.Mesh(leftLegGeom, barMat);
  leftLeg.rotation.x = -Math.PI / 2;
  leftLeg.position.x = -hSpread;
  leftLeg.receiveShadow = true;
  hGroup.add(leftLeg);

  // Right vertical leg
  const rightLeg = new THREE.Mesh(leftLegGeom, barMat);
  rightLeg.rotation.x = -Math.PI / 2;
  rightLeg.position.x = hSpread;
  rightLeg.receiveShadow = true;
  hGroup.add(rightLeg);

  // Cross horizontal bar
  const crossGeom = new THREE.PlaneGeometry(hSpread * 2, barWidth);
  const crossBar = new THREE.Mesh(crossGeom, barMat);
  crossBar.rotation.x = -Math.PI / 2;
  crossBar.receiveShadow = true;
  hGroup.add(crossBar);

  envGroup.add(hGroup);

  // 5. Perimeter Helipad Lights (Green, Amber, Blue)
  const lightCount = 16;
  const lightRadius = padRadius + 0.5;
  const lightGeom = new THREE.CylinderGeometry(0.12, 0.16, 0.32, 12);
  const amberLightMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.65,
    roughness: 0.25
  });
  const greenLightMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x16a34a,
    emissiveIntensity: 0.65,
    roughness: 0.25
  });
  const blueLightMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.65,
    roughness: 0.25
  });

  for (let i = 0; i < lightCount; i++) {
    const angle = (i / lightCount) * Math.PI * 2;
    const lx = Math.cos(angle) * lightRadius;
    const lz = Math.sin(angle) * lightRadius;
    const mat = (i % 4 === 0) ? greenLightMat : (i % 2 === 0) ? amberLightMat : blueLightMat;

    const fixture = new THREE.Mesh(lightGeom, mat);
    fixture.position.set(lx, 0.16, lz);
    fixture.castShadow = true;
    envGroup.add(fixture);
  }

  // 6. Windsock Mast on Perimeter
  const poleGeom = new THREE.CylinderGeometry(0.08, 0.08, 3.8, 12);
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.6,
    roughness: 0.3
  });
  const pole = new THREE.Mesh(poleGeom, poleMat);
  pole.position.set(-13, 1.9, -11);
  pole.castShadow = true;
  envGroup.add(pole);

  // Windsock fabric cone
  const coneGeom = new THREE.ConeGeometry(0.38, 1.8, 16, 1, true);
  const sockMat = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    roughness: 0.6,
    side: THREE.DoubleSide
  });
  const windsock = new THREE.Mesh(coneGeom, sockMat);
  windsock.position.set(-13, 3.7, -10.2);
  windsock.rotation.x = Math.PI / 2.3;
  windsock.castShadow = true;
  envGroup.add(windsock);

  // 7. Decorative Fluffy Clouds in Horizon
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
    envGroup.add(cg);
  }

  makeCloud(-22, 11, -26, 3.2);
  makeCloud(24, 13, -28, 3.6);
  makeCloud(-30, 9, 20, 2.8);
  makeCloud(28, 10, 18, 3.0);
  makeCloud(0, 15, -34, 4.0);

  // 8. Airfield Lighting
  const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.8);
  sunLight.position.set(16, 26, 18);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 1.0;
  sunLight.shadow.camera.far = 80;
  sunLight.shadow.camera.left = -22;
  sunLight.shadow.camera.right = 22;
  sunLight.shadow.camera.top = 22;
  sunLight.shadow.camera.bottom = -22;
  sunLight.shadow.bias = -0.0004;
  envGroup.add(sunLight);

  const hemiLight = new THREE.HemisphereLight(0x72c4ec, 0x334155, 1.1);
  envGroup.add(hemiLight);

  parentGroup.add(envGroup);

  return {
    environmentGroup: envGroup,
    helipadMesh,
    update: (delta, elapsed) => {
      if (windsock) {
        windsock.rotation.z = Math.sin((elapsed || 0) * 1.8) * 0.15;
      }
    }
  };
}
