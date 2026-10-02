import * as THREE from 'three';
export * from './brickWorldManager.js';
export * from './sceneManager.js';
export { TitleScreen, setupTitleScreen } from './sceneManager.js';
export { SNAP_DISTANCE } from './brickWorldManager.js';

/**
 * 1. LEOCAD DEFAULT ISOMETRIC CAMERA CONFIGURATION:
 * Replicates the exact perspective from the LeoCAD screenshot:
 * - FOV: 42, near: 0.1, far: 1000
 * - Default position: (22, 16, 28)
 * - LookAt target: (0, 1.2, 0)
 * - OrbitControls: enableDamping=true, dampingFactor=0.05, maxPolarAngle=PI/2.05, min=8, max=60
 */
export const LEOCAD_CAMERA_CONFIG = {
  fov: 42,
  near: 0.1,
  far: 1000,
  position: { x: 10.0, y: 9.0, z: 18.0 },
  target: { x: 0, y: 2.4, z: 0 },
  enableDamping: true,
  dampingFactor: 0.08,
  minPolarAngle: Math.PI / 16,   // ~11°
  maxPolarAngle: Math.PI / 2.05, // ~87°
  minAzimuthAngle: -Infinity,
  maxAzimuthAngle: Infinity,
  minDistance: 3.5,
  maxDistance: 38.0
};

export const TURNTABLE_INSPECT_CONFIG = {
  enableZoom: true,
  minDistance: 3.5,
  maxDistance: 38.0,
  enablePan: false,
  minPolarAngle: Math.PI / 16,
  maxPolarAngle: Math.PI / 2.05
};

/**
 * Dynamic Build Progress & Bag Tracker (Minimalist Top HUD)
 * Updates the friendly candy progress pill and bag counter on every snap
 */
export function updateBuildProgress(currentPlaced, totalInStage = 8, bagTitle = null) {
  const total = totalInStage > 0 ? totalInStage : 8;
  const count = typeof currentPlaced === 'number' ? currentPlaced : 0;
  const pct = Math.min(100, Math.round((count / total) * 100));

  const fillEl = document.getElementById('toy-progress-fill') || document.getElementById('toy-bar-fill') || document.querySelector('.toy-bar-fill');
  if (fillEl) fillEl.style.width = `${pct}%`;

  const countEl = document.getElementById('brick-counter') || document.getElementById('toy-count') || document.querySelector('.toy-count');
  if (countEl) countEl.textContent = `${count} / ${total}`;

  const bagLabel = document.getElementById('bag-label');
  if (bagLabel) {
    if (bagTitle) {
      const match = bagTitle.match(/Bag \d+/i);
      bagLabel.textContent = match ? match[0] : bagTitle;
    } else {
      bagLabel.textContent = 'Bag 1';
    }
  }
}

/**
 * Compact 4-Button Camera Dock Controls (Calibrated Isometric Diorama)
 * Wires the 4 buttons to the camera's spherical coordinates around lookTarget (0, 2.4, 0).
 */
export function setupCameraDockControls(camera, controls, THREEInstance = THREE) {
  if (!camera) return;
  const lookTarget = new THREEInstance.Vector3(0, 2.4, 0);

  if (controls) {
    controls.enabled = false;
    controls.target.copy(lookTarget);
    controls.minPolarAngle = Math.PI / 16;  // ~11°
    controls.maxPolarAngle = Math.PI / 2.05; // ~87°
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
    controls.minDistance = 3.5;
    controls.maxDistance = 38.0;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.update();
  }

  function getSpherical() {
    const offset = camera.position.clone().sub(lookTarget);
    const spherical = new THREEInstance.Spherical().setFromVector3(offset);
    return spherical;
  }

  function applySpherical(spherical) {
    // Clamp zoom range to diorama boundaries (3.5 to 38.0)
    spherical.radius = Math.max(3.5, Math.min(38.0, spherical.radius));
    // Clamp polar angle (PI/16 to PI/2.05)
    spherical.phi = Math.max(Math.PI / 16, Math.min(Math.PI / 2.05, spherical.phi));

    camera.position.setFromSpherical(spherical).add(lookTarget);
    camera.lookAt(lookTarget);
    if (controls) {
      controls.target.copy(lookTarget);
      controls.update();
    }
  }

  // SWING LEFT
  document.getElementById('cam-swing-left')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const spherical = getSpherical();
    spherical.theta -= 0.08;
    applySpherical(spherical);
  });

  // SWING RIGHT
  document.getElementById('cam-swing-right')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const spherical = getSpherical();
    spherical.theta += 0.08;
    applySpherical(spherical);
  });

  // ZOOM IN
  document.getElementById('cam-zoom-in')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const spherical = getSpherical();
    spherical.radius -= 1.0;
    applySpherical(spherical);
  });

  // ZOOM OUT
  document.getElementById('cam-zoom-out')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const spherical = getSpherical();
    spherical.radius += 1.0;
    applySpherical(spherical);
  });
}

// LeoCAD Grid Snap Metrics (Standard LEGO dimensions: stud pitch = 0.8, plate height = 0.32)
export const STUD_PITCH = 0.8;
export const PLATE_HEIGHT = 0.32;
export const BASEPLATE_STUDS = 48; // Expanded 48x48 stud building area
export const BASEPLATE_SIZE = BASEPLATE_STUDS * STUD_PITCH; // 38.4 world units

/**
 * Discrete 90-degree step rotation helper (no arbitrary freeform angles or full 360° spin)
 */
export function getNextRotation90(currentRotationY, direction = 1) {
  const TWO_PI = Math.PI * 2;
  const step = Math.PI / 2;
  const snapped = Math.round(currentRotationY / step) * step;
  if (direction > 0) {
    return (snapped + step) % TWO_PI;
  } else {
    return (snapped - step + TWO_PI) % TWO_PI;
  }
}

/**
 * Quantize 3D continuous raycast coordinate onto LeoCAD standard stud grid
 * Clamped to play rug bounds (-4.5 to 4.5 on X, -3.5 to 3.5 on Z)
 */
export function quantizeGridPosition(point, pieceHeight = 0.32) {
  const clampedX = THREE.MathUtils.clamp(point.x, -4.5, 4.5);
  const clampedZ = THREE.MathUtils.clamp(point.z, -3.5, 3.5);
  const snapX = Math.round(clampedX / STUD_PITCH) * STUD_PITCH;
  const snapZ = Math.round(clampedZ / STUD_PITCH) * STUD_PITCH;
  const snapY = Math.round((point.y + pieceHeight / 2) / PLATE_HEIGHT) * PLATE_HEIGHT;
  return { snapX, snapY, snapZ };
}

/**
 * Part Catalog Categories for Freeform Building (Zero pre-set slots)
 */
export const LEOCAD_CATEGORIES = [
  { id: 'bricks', name: 'Bricks', icon: '🧱' },
  { id: 'wheels', name: 'Wheels', icon: '⚙️' },
  { id: 'special', name: 'Special', icon: '⭐' },
  { id: 'favorites', name: 'Favorites', icon: '❤️' }
];

export const ASSEMBLY_STAGES = [
  {
    id: 1,
    bagNumber: 1,
    name: 'Wheels & Chassis',
    label: 'Bag 1: Wheels & Chassis',
    shortName: 'Wheels',
    icon: '⚙️',
    totalParts: 8,
    color: '#0ea5e9',
    bgLight: '#e0f2fe',
    badgeColor: '#0284c7',
    stepIndices: [0, 1, 2, 3, 4, 5, 6, 7]
  },
  {
    id: 2,
    bagNumber: 2,
    name: 'Engine Deck & Bed',
    label: 'Bag 2: Engine Deck & Bed',
    shortName: 'Engine Bed',
    icon: '🚂',
    totalParts: 10,
    color: '#f59e0b',
    bgLight: '#fef3c7',
    badgeColor: '#d97706',
    stepIndices: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
  },
  {
    id: 3,
    bagNumber: 3,
    name: 'Cab Walls & Windows',
    label: 'Bag 3: Cab Walls & Windows',
    shortName: 'Cab & Windows',
    icon: '🪟',
    totalParts: 12,
    color: '#ef4444',
    bgLight: '#fee2e2',
    badgeColor: '#b91c1c',
    stepIndices: [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]
  },
  {
    id: 4,
    bagNumber: 4,
    name: 'Roof & Smokestack',
    label: 'Bag 4: Roof & Smokestack',
    shortName: 'Roof & Smoke',
    icon: '🔔',
    totalParts: 12,
    color: '#8b5cf6',
    bgLight: '#f3e8ff',
    badgeColor: '#6d28d9',
    stepIndices: [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41]
  }
];

export const TOTAL_STAGED_PARTS = 42;

export { onPointerMove, isPointerOverTray, startDraggingPiece } from './sceneManager.js';

/**
 * Attaches the active drag loop directly to the global window on pointerdown:
 * 1. STOP AUTO-SPAWNING AT (0, Y, 0):
 *    - Clicking a card in the tray does NOT spawn a piece into the scene or advance the counter.
 *    - Spawns into the scene as a floating follower ONLY when the user clicks/touches AND actively drags out of the tray area.
 * 2. TRACK CURSOR TO BASEPLATE RAYCAST:
 *    - Tracks cursor movement and quantizes onto the 0.8 stud grid.
 * 3. LOCK ONLY ON RELEASE (POINTERUP):
 *    - Locks the brick only if released over the baseplate / valid bricks.
 *    - Cancels and removes the floating preview if released over the tray or outside the board.
 */
export function setupCardDragListener(cardElement, pieceData, orbitControls, initiateBrickDrag, updateDraggedBrickPosition, handleBrickRelease, options = {}) {
  if (!cardElement) return;

  cardElement.addEventListener('pointerdown', (e) => {
    // Only handle primary button (left mouse click or touch)
    if (e.button !== undefined && e.button !== 0) return;

    // Do NOT allow dragging while full model preview is open (Interaction Lock)
    if (window.isShowingPreview || (options.isShowingPreview && options.isShowingPreview())) {
      return;
    }

    // Do NOT allow dragging already-placed pieces (prevents infinite duplicate spawning)
    if (cardElement.classList.contains('placed') || cardElement.style.display === 'none') {
      cardElement.dispatchEvent(new CustomEvent('card-click', { detail: pieceData, bubbles: true }));
      return;
    }

    // Requirement 3: When Inspect View is active, tapping a piece automatically locks the camera again so piece positioning remains stable
    if (options.isInspectActive && options.isInspectActive()) {
      if (options.onInspectExit) {
        options.onInspectExit();
      }
      cardElement.dispatchEvent(new CustomEvent('card-click', { detail: pieceData, bubbles: true }));
      return;
    }

    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;

    let isDragActive = false;
    let spawnedBrick = null;
    const wasControlsEnabled = orbitControls ? orbitControls.enabled : true;
    if (orbitControls) orbitControls.enabled = false;

    // Detect tray bounds to know when pointer is actively dragged out of tray area
    const trayEl = document.getElementById('parts-tray') || cardElement.closest('#parts-tray, .toy-parts-tray');

    const onMove = (moveEvent) => {
      if (options.isInspectActive && options.isInspectActive()) return;

      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const dist = Math.hypot(dx, dy);

      if (!isDragActive) {
        let draggedOutOfTray = false;
        if (trayEl) {
          const rect = trayEl.getBoundingClientRect();
          if (moveEvent.clientX < rect.left || moveEvent.clientX > rect.right || moveEvent.clientY < rect.top || moveEvent.clientY > rect.bottom) {
            draggedOutOfTray = true;
          }
        } else if (moveEvent.clientY < window.innerHeight - 170) {
          draggedOutOfTray = true;
        }

        // Require intentional drag gesture: moving out of the bottom tray or >16px displacement
        if ((dist > 8 && draggedOutOfTray) || dist > 16) {
          isDragActive = true;
          if (orbitControls) orbitControls.enabled = false;

          // 1. A piece only enters the scene as a floating follower when actively dragged out of the tray area
          spawnedBrick = initiateBrickDrag(pieceData, moveEvent.clientX, moveEvent.clientY);
          if (spawnedBrick) {
            spawnedBrick.visible = false; // Hide until pointer hits a valid raycast point
          }
          if (updateDraggedBrickPosition && spawnedBrick) {
            updateDraggedBrickPosition(moveEvent.clientX, moveEvent.clientY, moveEvent, spawnedBrick);
          }
        }
      } else {
        // Active drag: track cursor across baseplate
        if (updateDraggedBrickPosition && spawnedBrick) {
          updateDraggedBrickPosition(moveEvent.clientX, moveEvent.clientY, moveEvent, spawnedBrick);
        }
      }
    };

    const onUp = (upEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);

      if (orbitControls) orbitControls.enabled = true;

      if (isDragActive && spawnedBrick) {
        isDragActive = false;
        const brickToRelease = spawnedBrick;
        spawnedBrick = null;
        // Lock only on valid release or cancel if outside/over tray
        handleBrickRelease(upEvent.clientX, upEvent.clientY, upEvent, brickToRelease);
      } else {
        // Simple click/tap on card:
        cardElement.dispatchEvent(new CustomEvent('card-click', { detail: pieceData, bubbles: true }));
      }
    };

    const onCancel = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);

      if (orbitControls) orbitControls.enabled = true;
      if (isDragActive && spawnedBrick && handleBrickRelease) {
        isDragActive = false;
        const brickToRelease = spawnedBrick;
        spawnedBrick = null;
        handleBrickRelease(-9999, -9999, null, brickToRelease);
      }
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp, { passive: false });
    window.addEventListener('pointercancel', onCancel, { passive: false });
  });
}

/**
 * 6. STEP-BASED TOY SHELF HELPER (Requirement 6):
 * Shows only pieces required for the active assembly step (3 to 4 oversized cards).
 */
export function getActiveStepPieces(state, maxCards = null) {
  if (!state || !state.trainData || !state.trainData.steps) return [];

  const currentStageObj = ASSEMBLY_STAGES[state.currentStage - 1] || ASSEMBLY_STAGES[0];
  const bagIndices = currentStageObj.stepIndices;

  // Determine current active unbuilt step index in this bag
  let activeIdx = typeof state.selectedStepIndex === 'number' ? state.selectedStepIndex : bagIndices[0];
  if (state.builtSteps && state.builtSteps.has(activeIdx)) {
    const nextInStage = bagIndices.find((idx) => !state.builtSteps.has(idx));
    if (nextInStage !== undefined) {
      activeIdx = nextInStage;
      state.selectedStepIndex = nextInStage;
    }
  }

  // If a max limit is specified (e.g. 4 for minimal view), prioritize unbuilt pieces
  let targetIndices = bagIndices;
  if (typeof maxCards === 'number' && maxCards > 0 && maxCards < bagIndices.length) {
    const unbuilt = bagIndices.filter((idx) => !state.builtSteps.has(idx));
    const candidate = unbuilt.length > 0 ? unbuilt : bagIndices;
    targetIndices = candidate.slice(0, maxCards);
  }

  return targetIndices.map((stepIdx) => {
    const step = state.trainData.steps[stepIdx];
    const qty = step.quantity || step.pieceCount || 1;
    const isBuilt = state.builtSteps ? state.builtSteps.has(stepIdx) : false;
    return {
      type: 'train_step',
      stepIndex: stepIdx,
      stepData: step,
      quantity: qty,
      isBuilt,
      isActive: stepIdx === activeIdx
    };
  });
}

/**
 * Decrements the circular red quantity badge on snap and triggers scale-down pop animation when exhausted.
 */
export function decrementCardBadge(stepIdx, onExhausted) {
  const card = document.getElementById(`toy-card-${stepIdx}`);
  if (!card) return;

  const badge = card.querySelector('.card-qty-badge');
  if (badge) {
    let currentQty = parseInt(badge.getAttribute('data-qty') || '1', 10);
    currentQty = Math.max(0, currentQty - 1);
    badge.setAttribute('data-qty', currentQty);
    badge.textContent = `x${currentQty}`;

    if (currentQty <= 0) {
      card.classList.add('exhausted');
      setTimeout(() => {
        card.style.display = 'none';
        if (onExhausted) onExhausted(stepIdx);
      }, 350);
    } else {
      badge.style.transform = 'scale(1.4)';
      setTimeout(() => {
        badge.style.transform = 'scale(1)';
      }, 200);
    }
  } else {
    card.classList.add('exhausted');
    setTimeout(() => {
      card.style.display = 'none';
      if (onExhausted) onExhausted(stepIdx);
    }, 350);
  }
}

