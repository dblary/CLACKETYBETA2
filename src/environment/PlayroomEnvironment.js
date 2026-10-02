import * as THREE from 'three';
import { createEnvironmentMaterials } from './environmentMaterials.js';
import { EnvironmentLights } from './environmentLights.js';
import {
  createRoomStructure,
  createPanoramicOutdoorWorld,
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
 * Beautiful, polished, kid-friendly open-air "toy workshop" 3D diorama
 * surrounding the central LDraw brick-building area.
 * 
 * Features an expansive sunny 360-degree sky, rolling hills, 3D clouds,
 * hot air balloons, timber pergola, and charming toy workshop props.
 */
export class PlayroomEnvironment {
  constructor(scene, renderer, quality = 'high') {
    this.scene = scene;
    this.renderer = renderer;
    this.quality = quality;

    // Root container
    this.environmentGroup = new THREE.Group();
    this.environmentGroup.name = 'playroom_environment_root';
    this.environmentGroup.userData.isEnvironment = true;

    // Component containers
    this.roomGroup = null;
    this.outdoorWorldGroup = null;
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
    this.recommendedCameraPos = new THREE.Vector3(10.0, 9.0, 18.0);
    this.recommendedCameraTarget = new THREE.Vector3(0, 2.4, 0);

    // Build the environment
    this.build();
  }

  build() {
    // 1. Lighting Setup
    this.createLighting();

    // 2. Open Sky, Rolling Hills, Mountains, 3D Clouds & Hot Air Balloons (360° View)
    this.createOutdoorWorld();

    // 3. Open-Air Workshop Patio Deck & Railings
    this.createRoom();

    // 4. Central Build Area Soft Rug & Contact Surface
    this.createFloor();

    // 5. Timber Pergola, Chalkboard "LET'S BUILD!", Blueprint & Bunting Garland
    this.createDecorations();

    // 6. Workbench & Tools (Back-left)
    this.createFurniture();

    // 7. Shelves & Toy Storage (Left & Right perimeter)
    this.createShelves();

    // 8. Bed / Cozy Reading Corner
    this.createBedCorner();

    // Add root group to scene
    this.scene.add(this.environmentGroup);

    // Apply quality settings
    this.applyQualitySettings();

    // Traverse all children to ensure userData.isEnvironment is consistently set
    this.environmentGroup.traverse((child) => {
      child.userData.isEnvironment = true;
      if (child.isMesh) {
        if (child.material) {
          if (!child.material.side || child.material.side === THREE.FrontSide) {
            // Keep default side
          }
        }
      }
    });

    // Dedicated flat plane flush with the floor for raycasting
    this.setupBuildContactSurface();
  }

  createLighting() {
    this.lights = new EnvironmentLights(this.scene, this.quality);
  }

  createOutdoorWorld() {
    this.outdoorWorldGroup = createPanoramicOutdoorWorld(this.materials);
    this.environmentGroup.add(this.outdoorWorldGroup);
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
    const contactGeo = new THREE.PlaneGeometry(18.0, 18.0);
    const contactMat = new THREE.MeshBasicMaterial({
      visible: false,
      depthWrite: false
    });
    this.buildZoneContactMesh = new THREE.Mesh(contactGeo, contactMat);
    this.buildZoneContactMesh.rotation.x = -Math.PI / 2;
    this.buildZoneContactMesh.position.set(0, 0, 0);
    this.buildZoneContactMesh.name = 'build_zone_contact_floor';
    this.buildZoneContactMesh.userData.isBaseplate = true;
    this.buildZoneContactMesh.userData.isEnvironment = false;
    this.scene.add(this.buildZoneContactMesh);
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
      if (this.renderer && this.renderer.shadowMap) {
        this.renderer.shadowMap.enabled = false;
      }
      if (this.decorationsGroup) this.decorationsGroup.visible = false;
      if (this.bedGroup) this.bedGroup.visible = false;
    } else {
      if (this.renderer && this.renderer.shadowMap) {
        this.renderer.shadowMap.enabled = true;
      }
      if (this.decorationsGroup) this.decorationsGroup.visible = true;
      if (this.bedGroup) this.bedGroup.visible = true;
    }
  }

  dispose() {
    if (this.environmentGroup.parent) {
      this.environmentGroup.parent.remove(this.environmentGroup);
    }
    if (this.buildZoneContactMesh && this.buildZoneContactMesh.parent) {
      this.buildZoneContactMesh.parent.remove(this.buildZoneContactMesh);
    }
    if (this.lights) {
      this.lights.dispose();
      this.lights = null;
    }
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
