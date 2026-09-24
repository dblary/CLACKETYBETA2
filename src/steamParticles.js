import * as THREE from 'three';

export class SteamParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.maxParticles = 60;
    this.particleGeom = new THREE.SphereGeometry(0.35, 12, 10);
    this.particleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.0,
      transparent: true,
      opacity: 0.6,
      depthWrite: false
    });

    this.emitterPos = new THREE.Vector3(0, 3.2, 3.5);
    this.lastPuffTime = 0;
  }

  setEmitterPosition(x, y, z) {
    this.emitterPos.set(x, y, z);
  }

  /**
   * Emit a single steam puff sphere
   */
  emitPuff(speed = 0, scaleMultiplier = 1.0, extraVy = 0) {
    let mesh;

    // Check pool
    if (this.particles.length >= this.maxParticles) {
      // Recycle oldest particle
      const oldest = this.particles.shift();
      mesh = oldest.mesh;
    } else {
      mesh = new THREE.Mesh(this.particleGeom, this.particleMat.clone());
      this.scene.add(mesh);
    }

    const initialScale = 0.25 * scaleMultiplier;
    mesh.scale.setScalar(initialScale);
    mesh.position.copy(this.emitterPos);

    // Random offset around chimney opening
    mesh.position.x += (Math.random() - 0.5) * 0.15;
    mesh.position.z += (Math.random() - 0.5) * 0.15;

    const particle = {
      mesh,
      life: 1.0,
      maxLife: 1.4 + Math.random() * 0.5,
      scaleStart: initialScale,
      scaleEnd: (0.9 + Math.random() * 0.4) * scaleMultiplier,
      vx: (Math.random() - 0.5) * 0.35,
      vy: 1.8 + Math.random() * 0.8 + extraVy,
      vz: -speed * 0.8 + (Math.random() - 0.5) * 0.3
    };

    this.particles.push(particle);
  }

  /**
   * Large celebratory steam cloud for whistle
   */
  emitWhistleBurst(speed = 0) {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this.emitPuff(speed, 1.6 + i * 0.1, 1.2);
      }, i * 70);
    }
  }

  /**
   * Update particle positions, scales, and opacity
   */
  update(delta, trainMoving = false, trainSpeed = 0) {
    const now = performance.now();

    // Auto-puff rhythmically if train is moving
    if (trainMoving && now - this.lastPuffTime > (320 / Math.max(0.6, Math.abs(trainSpeed)))) {
      this.emitPuff(trainSpeed, 1.0);
      this.lastPuffTime = now;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta / p.maxLife;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        if (p.mesh.material && p.mesh.material !== this.particleMat) {
          p.mesh.material.dispose();
        }
        this.particles.splice(i, 1);
        continue;
      }

      // Physics
      p.mesh.position.x += p.vx * delta;
      p.mesh.position.y += p.vy * delta;
      p.mesh.position.z += p.vz * delta;

      // Slight drag & buoyancy
      p.vy *= (1 - 0.2 * delta);
      p.vx *= (1 - 0.4 * delta);
      p.vz *= (1 - 0.4 * delta);

      // Expansion
      const progress = 1.0 - p.life;
      const currentScale = THREE.MathUtils.lerp(p.scaleStart, p.scaleEnd, Math.sqrt(progress));
      p.mesh.scale.setScalar(currentScale);

      // Fade out
      p.mesh.material.opacity = Math.max(0, p.life * 0.65);
    }
  }

  clear() {
    this.particles.forEach(p => {
      this.scene.remove(p.mesh);
      if (p.mesh.material) p.mesh.material.dispose();
    });
    this.particles = [];
  }
}
