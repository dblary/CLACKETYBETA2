import * as THREE from 'three';

/**
 * 3D Voxel / Stud Occupancy Grid
 * Tracks occupied discrete grid coordinates (gridUnitX=1.0, gridUnitZ=1.0, plateHeightY=0.4).
 * Prevents bricks from overlapping or occupying the same space.
 */
export const GRID_CONFIG = {
  unitX: 1.0,
  unitZ: 1.0,
  plateHeightY: 0.4
};

export class OccupancyGrid {
  constructor() {
    // Map of cellKey ("gx,gy,gz") -> { ownerId, type, metadata }
    this.grid = new Map();
  }

  toCellKey(gx, gy, gz) {
    return `${gx},${gy},${gz}`;
  }

  /**
   * Discretizes a 1D range [min, max] into integer cell indices.
   * If isZeroBased is false (studs on X and Z), studs are centered at integers k in [k - 0.5, k + 0.5].
   * If isZeroBased is true (plates on Y), plates start at 0, plate k spans [k * unit, (k + 1) * unit].
   */
  getIndicesForAxis(min, max, unit = 1.0, isZeroBased = false, eps = 0.04) {
    const offset = isZeroBased ? 0 : unit / 2;
    const kMin = Math.floor((min + offset + eps) / unit);
    const kMax = Math.floor((max + offset - eps) / unit);
    const indices = [];
    for (let k = kMin; k <= kMax; k++) {
      indices.push(k);
    }
    return indices;
  }

  /**
   * Calculates all discrete 3D cell keys covered by a THREE.Box3.
   */
  getCellsForBox(box) {
    const cells = [];
    const xs = this.getIndicesForAxis(box.min.x, box.max.x, GRID_CONFIG.unitX, false);
    const ys = this.getIndicesForAxis(box.min.y, box.max.y, GRID_CONFIG.plateHeightY, true);
    const zs = this.getIndicesForAxis(box.min.z, box.max.z, GRID_CONFIG.unitZ, false);

    for (const gx of xs) {
      for (const gy of ys) {
        for (const gz of zs) {
          cells.push(this.toCellKey(gx, gy, gz));
        }
      }
    }
    return cells;
  }

  /**
   * Calculates cell keys covered by a train step at a given world position.
   */
  getCellsForStep(stepData, currentPos = null) {
    const cellsSet = new Set();
    const offset = currentPos ? currentPos.clone().sub(stepData.mountPos) : new THREE.Vector3(0, 0, 0);

    stepData.meshes.forEach((mesh) => {
      mesh.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(mesh);
      if (offset.lengthSq() > 0.0001) {
        box.translate(offset);
      }
      const meshCells = this.getCellsForBox(box);
      meshCells.forEach((c) => cellsSet.add(c));
    });

    return Array.from(cellsSet);
  }

  /**
   * Calculates cell keys covered by a free builder brick.
   */
  getCellsForFreeBrick(brickDef, centerPos, rotationY = 0) {
    const isRotated = Math.abs(Math.sin(rotationY)) > 0.7;
    const len = brickDef.length || brickDef.depth || 2.0;
    const wid = brickDef.width || 2.0;
    const sizeX = isRotated ? len : wid;
    const sizeZ = isRotated ? wid : len;
    const heightY = brickDef.height;

    const halfX = (sizeX * GRID_CONFIG.unitX) / 2;
    const halfZ = (sizeZ * GRID_CONFIG.unitZ) / 2;
    const halfY = heightY / 2;

    const box = new THREE.Box3(
      new THREE.Vector3(centerPos.x - halfX, centerPos.y - halfY, centerPos.z - halfZ),
      new THREE.Vector3(centerPos.x + halfX, centerPos.y + halfY, centerPos.z + halfZ)
    );

    return this.getCellsForBox(box);
  }

  /**
   * Checks if a candidate brick has physical support underneath.
   * A brick is supported if it rests directly on the baseplate (plate Y=0, snapY <= 0.65)
   * or if at least one cell directly beneath its bottom plate is currently occupied.
   */
  hasSupportUnderneath(brickDef, centerPos, rotationY = 0) {
    if (centerPos.y <= 0.65) {
      return true; // Resting on ground baseplate
    }

    const candidateCells = this.getCellsForFreeBrick(brickDef, centerPos, rotationY);
    if (candidateCells.length === 0) return true;

    // Find the minimum gy among candidate cells
    let minGy = Infinity;
    const bottomStuds = [];

    for (const key of candidateCells) {
      const parts = key.split(',').map(Number);
      const gx = parts[0];
      const gy = parts[1];
      const gz = parts[2];
      if (gy < minGy) {
        minGy = gy;
      }
    }

    for (const key of candidateCells) {
      const parts = key.split(',').map(Number);
      if (parts[1] === minGy) {
        bottomStuds.push({ gx: parts[0], gz: parts[2] });
      }
    }

    const gyBelow = minGy - 1;
    if (gyBelow < 0) return true;

    // Check if any stud of the bottom face has an occupied cell directly below
    for (const s of bottomStuds) {
      const belowKey = this.toCellKey(s.gx, gyBelow, s.gz);
      if (this.grid.has(belowKey)) {
        return true; // Found supporting stud/brick!
      }
    }

    return false; // Floating completely in mid-air
  }

  /**
   * Check if any candidate cells collide with occupied cells.
   * Returns { isColliding: boolean, collidingCells: string[], occupant: object|null }
   */
  checkCollision(candidateCells, ignoreOwnerId = null) {
    const collidingCells = [];
    let firstOccupant = null;

    for (const key of candidateCells) {
      const occupant = this.grid.get(key);
      if (occupant && occupant.ownerId !== ignoreOwnerId) {
        collidingCells.push(key);
        if (!firstOccupant) firstOccupant = occupant;
      }
    }

    return {
      isColliding: collidingCells.length > 0,
      collidingCells,
      occupant: firstOccupant
    };
  }

  /**
   * Register a collection of cell keys for a given owner.
   */
  register(ownerId, cells, metadata = {}) {
    for (const key of cells) {
      this.grid.set(key, {
        ownerId,
        registeredAt: Date.now(),
        ...metadata
      });
    }
  }

  /**
   * Unregister all cells belonging to a given owner.
   */
  unregister(ownerId) {
    for (const [key, occupant] of this.grid.entries()) {
      if (occupant.ownerId === ownerId) {
        this.grid.delete(key);
      }
    }
  }

  /**
   * Clear all occupied cells.
   */
  clear() {
    this.grid.clear();
  }

  /**
   * Returns current count of occupied voxel cells.
   */
  size() {
    return this.grid.size;
  }
}

export const occupancyGrid = new OccupancyGrid();
