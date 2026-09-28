import * as THREE from 'three';
import { createEnvironmentMaterials } from './environmentMaterials.js';
import { EnvironmentLights } from './environmentLights.js';
import {
  createRoomStructure,
  createArchedWindowAndScenery,
  createBackWallDecorations,
  createChildrenWorkbench,
  createToyShelvesLeft,
  createToyStorageRight,
  createBedCozyCorner,
  createBuildZoneRug
} from './environmentObjects.js';

/**
 * PlayroomEnvironment
 * 
 * Beautiful, polished, kid-friendly "toy workshop / playroom" 3D environment
 * surrounding the central LDraw brick-building area.
 * 
 * Pure Three.js / WebGL procedural geometry and materials.
 * Leaves 55-65% of the central floor completely open for construction.
 * Tagged with `userData.isEnvironment = true` so raycasting ignores it.
 */
export class PlayroomEnvironment {
  constructor(scene, renderer, quality = 'high') {
    this.scene = scene;
    this.renderer = renderer;
    this.quality = quality; // 'high' | 'medium' | 'low'

    // Root container
    this.environmentGroup = new THREE.Group();
    this.environmentGroup.name = 'playroom_environment_root';
    this.environmentGroup.userData.isEnvironment = true;

    // Component containers
    this.roomGroup = null;
    this.windowGroup = null;
    this.decorationsGroup = null;
    this.workbenchGroup = null;
    this.shelvesLeftGroup = null;
    this.storageRightGroup = null;
    this.bedGroup = null;
    this.buildZoneGroup = null;
    this.lights = null;

    // Build zone flat contact surface for raycasting
    this.buildZoneContactMesh = null;

    // Materials dictionary
    this.materials = createEnvironmentMaterials();

    // Recommended camera settings
    this.recommendedCameraPos = new THREE.Vector3(0, 4.8, 8.2);
    this.recommendedCameraTarget = new THREE.Vector3(0, 0.4, 0);

    // Build the environment
    this.build();
  }

  build() {
    // 1. Lighting Setup
    this.createLighting();

    // 2. Room Structure (Floor planks, walls, trims, beams)
    this.createRoom();

    // 3. Central Build Area Rug & Contact Surface
    this.createFloor();

    // 4. Large Arched Window & Outside Scenery
    this.createWindow();

    // 5. Back Wall Decorations (Chalkboard "LET'S BUILD!", bunting flags)
    this.createDecorations();

    // 6. Workbench & Tools (Left-back)
    this.createFurniture();

    // 7. Shelves & Toy Storage (Left & Right walls)
    this.createShelves();

    // 8. Bed / Cozy Reading Corner (Far left)
    this.createBedCorner();

    // Add root group to scene
    this.scene.add(this.environmentGroup);

    // Apply quality settings
    this.applyQualitySettings();

    // Traverse all children to ensure userData.isEnvironment is consistently set
    this.environmentGroup.traverse((child) => {
      child.userData.isEnvironment = true;
    });

    // Provide a dedicated invisible or baseplate contact plane for raycasting
    this.setupBuildContactSurface();
  }

  createLighting() {
    this.lights = new EnvironmentLights(this.scene, this.quality);
  }

  createRoom() {
    this.roomGroup = createRoomStructure(this.materials);
    this.environmentGroup.add(this.roomGroup);
  }

  createFloor() {
    this.buildZoneGroup = createBuildZoneRug(this.materials);
    this.environmentGroup.add(this.buildZoneGroup);
  }

  setupBuildContactSurface() {
    // Dedicated flat plane flush with the floor (y = 0) specifically for LDraw piece placement
    const contactGeo = new THREE.PlaneGeometry(16.0, 16.0);
    const contactMat = new THREE.MeshBasicMaterial({
      visible: false,
      depthWrite: false
    });
    this.buildZoneContactMesh = new THREE.Mesh(contactGeo, contactMat);
    this.buildZoneContactMesh.rotation.x = -Math.PI / 2;
    this.buildZoneContactMesh.position.set(0, 0, 0);
    this.buildZoneContactMesh.name = 'build_zone_contact_floor';
    this.buildZoneContactMesh.userData.isBaseplate = true;
    // Note: Do NOT mark isEnvironment = true on this contact mesh so raycaster can hit it as a baseplate!
    this.buildZoneContactMesh.userData.isEnvironment = false;
    this.scene.add(this.buildZoneContactMesh);
  }

  createWindow() {
    this.windowGroup = createArchedWindowAndScenery(this.materials);
    this.environmentGroup.add(this.windowGroup);
  }

  createDecorations() {
    this.decorationsGroup = createBackWallDecorations(this.materials);
    this.environmentGroup.add(this.decorationsGroup);
  }

  createFurniture() {
    this.workbenchGroup = createChildrenWorkbench(this.materials);
    this.environmentGroup.add(this.workbenchGroup);
  }

  createShelves() {
    this.shelvesLeftGroup = createToyShelvesLeft(this.materials);
    this.environmentGroup.add(this.shelvesLeftGroup);

    this.storageRightGroup = createToyStorageRight(this.materials);
    this.environmentGroup.add(this.storageRightGroup);
  }

  createToys() {
    // Toys are already integrated into the shelves, storage cubbies, and workbench
  }

  createBedCorner() {
    this.bedGroup = createBedCozyCorner(this.materials);
    this.environmentGroup.add(this.bedGroup);
  }

  getRecommendedCameraPosition() {
    return this.recommendedCameraPos.clone();
  }

  getRecommendedCameraTarget() {
    return this.recommendedCameraTarget.clone();
  }

  getBuildContactMesh() {
    return this.buildZoneContactMesh;
  }

  setQuality(quality) {
    if (this.quality === quality) return;
    this.quality = quality;
    this.applyQualitySettings();
    if (this.lights) {
      this.lights.setQuality(quality);
    }
  }

  applyQualitySettings() {
    if (this.quality === 'low') {
      // Reduce shadow casting and simplify small decorative meshes
      if (this.renderer && this.renderer.shadowMap) {
        this.renderer.shadowMap.enabled = false;
      }
      if (this.decorationsGroup) this.decorationsGroup.visible = false;
      if (this.bedGroup) this.bedGroup.visible = false;
    } else if (this.quality === 'medium') {
      if (this.renderer && this.renderer.shadowMap) {
        this.renderer.shadowMap.enabled = true;
      }
      if (this.decorationsGroup) this.decorationsGroup.visible = true;
      if (this.bedGroup) this.bedGroup.visible = true;
    } else {
      // High quality
      if (this.renderer && this.renderer.shadowMap) {
        this.renderer.shadowMap.enabled = true;
      }
      if (this.decorationsGroup) this.decorationsGroup.visible = true;
      if (this.bedGroup) this.bedGroup.visible = true;
    }
  }

  dispose() {
    // 1. Remove from scene
    if (this.environmentGroup.parent) {
      this.environmentGroup.parent.remove(this.environmentGroup);
    }
    if (this.buildZoneContactMesh && this.buildZoneContactMesh.parent) {
      this.buildZoneContactMesh.parent.remove(this.buildZoneContactMesh);
    }

    // 2. Dispose lights
    if (this.lights) {
      this.lights.dispose();
      this.lights = null;
    }

    // 3. Dispose materials & geometries
    this.environmentGroup.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
    });

    Object.values(this.materials).forEach((mat) => {
      if (mat && typeof mat.dispose === 'function') {
        mat.dispose();
      }
    });
  }
}
