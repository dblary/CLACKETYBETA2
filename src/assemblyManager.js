import * as THREE from 'three';

/**
 * Manages the sequential piece-by-piece assembly for 3D scenes.
 * Features:
 * - Live 3D miniature preview turntable in the UI
 * - In-scene holographic ghost/blueprint indicator showing target position
 * - Animated drop-in assembly transitions with golden spark effects
 * - Step sequencer with progress tracking, auto-assembly, and filmstrip navigation
 */
export class AssemblyManager {
  constructor(mainApp) {
    this.app = mainApp;
    this.mainScene = mainApp.scene;
    this.mainCamera = mainApp.camera;

    this.currentModelType = 'forest'; // 'forest' | 'phone'
    this.currentIndex = 0;
    this.pieces = [];
    this.isAutoPlaying = false;
    this.autoPlayTimer = null;

    // Ghost object currently displayed in the main scene
    this.currentGhost = null;

    // Animation queue for pieces currently animating into place
    this.animatingPieces = [];

    // Spark particles for piece placement burst
    this.initSparkParticles();

    // Initialize the UI 3D Preview Turntable
    this.initPreviewTurntable();
  }

  /**
   * Initializes dedicated mini 3D turntable for UI showcase
   */
  initPreviewTurntable() {
    this.previewContainer = document.getElementById('piece-preview-canvas');
    if (!this.previewContainer) return;

    this.previewScene = new THREE.Scene();

    // Studio camera
    this.previewCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
    this.previewCamera.position.set(0, 1.2, 3.8);
    this.previewCamera.lookAt(0, 0, 0);

    // Studio Renderer with transparency
    this.previewRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.previewRenderer.setSize(180, 180);
    this.previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.previewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.previewRenderer.toneMappingExposure = 1.2;
    this.previewContainer.appendChild(this.previewRenderer.domElement);

    // Studio 3-Point Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 1.1);
    this.previewScene.add(ambient);

    this.previewKeyLight = new THREE.DirectionalLight(0xffecd2, 2.2);
    this.previewKeyLight.position.set(2, 3, 3);
    this.previewScene.add(this.previewKeyLight);

    const rimLight = new THREE.DirectionalLight(0xf59e0b, 1.6);
    rimLight.position.set(-2, -1, -3);
    this.previewScene.add(rimLight);

    // Rotating pivot in the preview scene
    this.previewPivot = new THREE.Group();
    this.previewScene.add(this.previewPivot);

    // User drag-to-rotate interaction on mini canvas
    this.isDraggingPreview = false;
    this.prevPointerX = 0;
    this.previewRotSpeed = 0.012;

    const dom = this.previewRenderer.domElement;
    dom.addEventListener('pointerdown', (e) => {
      this.isDraggingPreview = true;
      this.prevPointerX = e.clientX;
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isDraggingPreview) return;
      const deltaX = e.clientX - this.prevPointerX;
      this.prevPointerX = e.clientX;
      this.previewPivot.rotation.y += deltaX * 0.015;
    });

    window.addEventListener('pointerup', () => {
      this.isDraggingPreview = false;
    });
  }

  /**
   * Particle burst system for piece placement
   */
  initSparkParticles() {
    const particleCount = 60;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      // Golden orange sparks
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
      colors[i * 3 + 2] = 0.2 + Math.random() * 0.3;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.sparkPoints = new THREE.Points(geometry, material);
    this.mainScene.add(this.sparkPoints);

    this.sparkVelocities = [];
    for (let i = 0; i < particleCount; i++) {
      this.sparkVelocities.push(new THREE.Vector3());
    }
    this.sparkActive = false;
    this.sparkLife = 0;
  }

  /**
   * Triggers a burst of golden spark particles at the given world position
   */
  triggerSparks(position) {
    this.sparkPoints.position.copy(position);
    this.sparkPoints.material.opacity = 1.0;
    this.sparkLife = 1.0;
    this.sparkActive = true;

    const posAttr = this.sparkPoints.geometry.attributes.position;
    for (let i = 0; i < this.sparkVelocities.length; i++) {
      posAttr.setXYZ(i, 0, 0, 0);
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.2;
      const vY = (Math.random() - 0.2) * 2.0;
      this.sparkVelocities[i].set(
        Math.cos(angle) * speed,
        vY,
        Math.sin(angle) * speed
      );
    }
    posAttr.needsUpdate = true;
  }

  /**
   * Registers piece definitions for the Enchanted Forest scene
   */
  setupForestPieces(forest, character) {
    this.currentModelType = 'forest';
    this.forest = forest;
    this.character = character;

    const toArr = (obj) => (Array.isArray(obj) ? obj : [obj]);

    this.pieces = [
      {
        id: 'forest-terrain',
        title: 'Terrain & Meandering Path',
        stepBadge: 'STEP 1 OF 15',
        category: 'Environment Base',
        primitives: ['PlaneGeometry (Deformed curve)', '4x SphereGeometry (Moss mounds)'],
        description: 'Earthen sienna path winding into the glowing sunset horizon, flanked by rolling lush moss knolls.',
        targets: toArr(forest.groundGroup),
        focusCamPos: new THREE.Vector3(0, 2.5, 7.8),
        focusLookAt: new THREE.Vector3(0, 0.4, 0.0),
        previewScale: 0.16,
        previewCenterOffset: new THREE.Vector3(0, 0.2, 0)
      },
      {
        id: 'forest-left-tree-trunk',
        title: 'Ancient Left Trunk & Roots',
        stepBadge: 'STEP 2 OF 15',
        category: 'Ancient Canopy',
        primitives: ['CylinderGeometry (Curved 10m trunk)', '5x CylinderGeometry (Surface roots)', '2x Branches'],
        description: 'Massive inward-arching gnarled trunk with serpentine surface roots anchoring deep into the mossy knoll.',
        targets: toArr(forest.leftTreeTrunk),
        focusCamPos: new THREE.Vector3(-3.2, 3.2, 6.2),
        focusLookAt: new THREE.Vector3(-4.0, 3.5, -1.0),
        previewScale: 0.25,
        previewCenterOffset: new THREE.Vector3(0, -1.2, 0)
      },
      {
        id: 'forest-left-tree-foliage',
        title: 'Left Canopy Foliage Clouds',
        stepBadge: 'STEP 3 OF 15',
        category: 'Ancient Canopy',
        primitives: ['5x IcosahedronGeometry (Subdivision 2)', 'Dual-tone deep & sunlit foliage'],
        description: 'Volumetric stylized foliage clouds forming the majestic archway over the left edge of the forest trail.',
        targets: toArr(forest.leftTreeFoliage),
        focusCamPos: new THREE.Vector3(-2.8, 6.5, 6.0),
        focusLookAt: new THREE.Vector3(-3.2, 8.0, 0.0),
        previewScale: 0.35,
        previewCenterOffset: new THREE.Vector3(0, -2.5, 0)
      },
      {
        id: 'forest-right-tree-trunk',
        title: 'Ancient Right Guardian Trunk',
        stepBadge: 'STEP 4 OF 15',
        category: 'Ancient Canopy',
        primitives: ['CylinderGeometry (Curved trunk)', '5x Snaking surface roots', '2x Branches'],
        description: 'Symmetrical ancient guardian trunk curving gracefully inward toward the sunset center.',
        targets: toArr(forest.rightTreeTrunk),
        focusCamPos: new THREE.Vector3(3.2, 3.2, 6.2),
        focusLookAt: new THREE.Vector3(4.0, 3.5, -1.0),
        previewScale: 0.25,
        previewCenterOffset: new THREE.Vector3(0, -1.2, 0)
      },
      {
        id: 'forest-right-tree-foliage',
        title: 'Right Canopy Foliage Clouds',
        stepBadge: 'STEP 5 OF 15',
        category: 'Ancient Canopy',
        primitives: ['5x IcosahedronGeometry', 'Sunlit golden olive materials'],
        description: 'Lush icosahedron leaf clusters that complete the natural vaulted archway of the forest trail.',
        targets: toArr(forest.rightTreeFoliage),
        focusCamPos: new THREE.Vector3(2.8, 6.5, 6.0),
        focusLookAt: new THREE.Vector3(3.2, 8.0, 0.0),
        previewScale: 0.35,
        previewCenterOffset: new THREE.Vector3(0, -2.5, 0)
      },
      {
        id: 'forest-bg-trees',
        title: 'Distant Forest Grove',
        stepBadge: 'STEP 6 OF 15',
        category: 'Atmospheric Depth',
        primitives: ['6x Slender Cylinder trunks', '6x Icosahedron canopies'],
        description: 'Slender tree silhouettes receding toward the horizon that create cinematic depth and perspective.',
        targets: toArr(forest.bgTreesGroup),
        focusCamPos: new THREE.Vector3(0, 2.2, 7.0),
        focusLookAt: new THREE.Vector3(0, 2.5, -10.0),
        previewScale: 0.2,
        previewCenterOffset: new THREE.Vector3(0, -1.2, 0)
      },
      {
        id: 'character-legs',
        title: 'Little Girl: Walking Legs & Sandals',
        stepBadge: 'STEP 7 OF 15',
        category: 'Character Anatomy',
        primitives: ['2x CylinderGeometry (Leg limbs)', '2x BoxGeometry (Leather sandals)'],
        description: 'Posed mid-stride limbs with classic brown leather strap sandals stepping forward along the trail.',
        targets: toArr(character.legsGroup),
        focusCamPos: new THREE.Vector3(0, 1.1, 3.0),
        focusLookAt: new THREE.Vector3(0, 0.35, 0.4),
        previewScale: 2.2,
        previewCenterOffset: new THREE.Vector3(0, -0.4, 0)
      },
      {
        id: 'character-torso',
        title: 'Little Girl: Sunny Yellow Dress',
        stepBadge: 'STEP 8 OF 15',
        category: 'Character Wardrobe',
        primitives: ['ConeGeometry (Flared skirt)', 'CylinderGeometry (Bodice torso)'],
        description: 'Storybook yellow flared skirt with fitted bodice reflecting the warm sunset illumination.',
        targets: toArr(character.torsoGroup),
        focusCamPos: new THREE.Vector3(0, 1.45, 2.6),
        focusLookAt: new THREE.Vector3(0, 0.9, 0.4),
        previewScale: 2.0,
        previewCenterOffset: new THREE.Vector3(0, -0.9, 0)
      },
      {
        id: 'character-arms',
        title: 'Little Girl: Joyful Outstretched Arms',
        stepBadge: 'STEP 9 OF 15',
        category: 'Character Anatomy',
        primitives: ['2x ConeGeometry (Sleeves)', '2x CylinderGeometry (Arms)', '2x SphereGeometry (Hands)'],
        description: 'Joyfully outstretched arms and sleeves capturing carefree childhood stroll along the enchanted path.',
        targets: toArr(character.armsGroup),
        focusCamPos: new THREE.Vector3(0, 1.6, 2.5),
        focusLookAt: new THREE.Vector3(0, 1.15, 0.4),
        previewScale: 2.1,
        previewCenterOffset: new THREE.Vector3(0, -1.1, 0)
      },
      {
        id: 'character-head',
        title: 'Little Girl: Head & Sweet Expression',
        stepBadge: 'STEP 10 OF 15',
        category: 'Character Expression',
        primitives: ['SphereGeometry (Stylized head)', 'CircleGeometry (Storybook eyes)', 'CircleGeometry (Blush)', 'TorusGeometry (Smile)'],
        description: 'Cute stylized face with big expressive eyes, bright catchlights, blushing rosy cheeks, and gentle smile.',
        targets: toArr(character.headGroup),
        focusCamPos: new THREE.Vector3(0, 1.85, 2.0),
        focusLookAt: new THREE.Vector3(0, 1.65, 0.4),
        previewScale: 2.2,
        previewCenterOffset: new THREE.Vector3(0, -1.65, 0)
      },
      {
        id: 'character-hair',
        title: 'Little Girl: Braids & Yellow Ribbons',
        stepBadge: 'STEP 11 OF 15',
        category: 'Character Hair',
        primitives: ['SphereGeometry (Hair cap)', '2x TorusGeometry (Ribbon bows)', '8x Beaded braid spheres'],
        description: 'Dark sculpted hair cap with twin cascading beaded braids adorned with cheerful yellow bow ties.',
        targets: toArr(character.hairGroup),
        focusCamPos: new THREE.Vector3(0, 1.85, 2.0),
        focusLookAt: new THREE.Vector3(0, 1.65, 0.4),
        previewScale: 2.0,
        previewCenterOffset: new THREE.Vector3(0, -1.65, 0)
      },
      {
        id: 'character-accessories',
        title: 'Cerulean Scarf & Traveler Satchel',
        stepBadge: 'STEP 12 OF 15',
        category: 'Character Accessories',
        primitives: ['TorusGeometry (Scarf neck wrap)', 'CylinderGeometry (Breeze tail)', 'BoxGeometry & TorusGeometry (Satchel & strap)'],
        description: 'Cerulean blue scarf fluttering in the breeze and miniature cross-body brown leather satchel.',
        targets: [character.scarfGroup, character.satchelGroup],
        focusCamPos: new THREE.Vector3(0, 1.65, 2.3),
        focusLookAt: new THREE.Vector3(0, 1.35, 0.4),
        previewScale: 2.0,
        previewCenterOffset: new THREE.Vector3(0, -1.35, 0)
      },
      {
        id: 'forest-mushrooms',
        title: 'Forest Floor Fairy Toadstools',
        stepBadge: 'STEP 13 OF 15',
        category: 'Flora & Fauna',
        primitives: ['8x Dome Sphere caps', '8x Curved Cylinder stems', 'Polka dot discs'],
        description: 'Vibrant red and amber spotted fairy toadstools nestled among tree roots and moss mounds.',
        targets: toArr(forest.mushroomsGroup),
        focusCamPos: new THREE.Vector3(-1.8, 1.1, 4.4),
        focusLookAt: new THREE.Vector3(-2.8, 0.25, 2.5),
        previewScale: 0.9,
        previewCenterOffset: new THREE.Vector3(2.5, -0.2, -2.5)
      },
      {
        id: 'forest-wildflowers',
        title: 'Luminous Storybook Wildflowers',
        stepBadge: 'STEP 14 OF 15',
        category: 'Flora & Fauna',
        primitives: ['25x Petal Spheres', '5x Emissive golden cores', '5x Stems'],
        description: 'Delicate peach and pink 5-petal wildflower blossoms with self-illuminating golden pistils.',
        targets: toArr(forest.flowersGroup),
        focusCamPos: new THREE.Vector3(2.0, 1.2, 4.5),
        focusLookAt: new THREE.Vector3(3.2, 0.35, 3.8),
        previewScale: 0.85,
        previewCenterOffset: new THREE.Vector3(-3.2, -0.3, -3.8)
      },
      {
        id: 'forest-fireflies',
        title: 'Swarm of 42 Golden Fireflies',
        stepBadge: 'STEP 15 OF 15',
        category: 'Atmospheric Magic',
        primitives: ['42x Luminous ember spheres', 'Dynamic 3D harmonic sine oscillations'],
        description: 'Magical floating fireflies that pulsate and hover across the scene, bringing the enchanted dusk to life.',
        targets: toArr(forest.firefliesGroup),
        focusCamPos: new THREE.Vector3(0, 1.85, 8.4),
        focusLookAt: new THREE.Vector3(0, 1.55, 0),
        previewScale: 0.4,
        previewCenterOffset: new THREE.Vector3(0, -1.0, 0)
      }
    ];

    this.initAssemblyState();
  }

  /**
   * Registers piece definitions for the Foldable Phone scene
   */
  setupPhonePieces(phone) {
    this.currentModelType = 'phone';
    this.phone = phone;

    const toArr = (obj) => (Array.isArray(obj) ? obj : [obj]);

    this.pieces = [
      {
        id: 'phone-hinge',
        title: 'Central Hinge Spine Mechanism',
        stepBadge: 'STEP 1 OF 8',
        category: 'Mechanical Core',
        primitives: ['CylinderGeometry (Spine rail)', '32-segment precision pivot cylinder'],
        description: 'Central spine mechanism engineered from aerospace titanium allowing seamless folding.',
        targets: toArr(phone.hingeGroup),
        focusCamPos: new THREE.Vector3(0, 1.8, 9.5),
        focusLookAt: new THREE.Vector3(0, 0, 0),
        previewScale: 0.35,
        previewCenterOffset: new THREE.Vector3(0, 0, 0)
      },
      {
        id: 'phone-left-panel',
        title: 'Left Chassis & Aluminum Frame',
        stepBadge: 'STEP 2 OF 8',
        category: 'Chassis & Housing',
        primitives: ['ExtrudeGeometry (Rounded panel)', 'Power & Volume buttons'],
        description: 'Sculpted left chassis with rounded outer contour, button cutouts, and matte glass back.',
        targets: toArr(phone.leftChassisMesh),
        focusCamPos: new THREE.Vector3(-2.2, 1.2, 9.0),
        focusLookAt: new THREE.Vector3(-1.8, 0, 0),
        previewScale: 0.32,
        previewCenterOffset: new THREE.Vector3(1.8, 0, 0)
      },
      {
        id: 'phone-right-panel',
        title: 'Right Chassis & Housing',
        stepBadge: 'STEP 3 OF 8',
        category: 'Chassis & Housing',
        primitives: ['ExtrudeGeometry (Precision beveled panel)', 'Outer frame rail'],
        description: 'Complementary right panel chassis forming the secondary half of the foldable body.',
        targets: toArr(phone.rightChassisMesh),
        focusCamPos: new THREE.Vector3(2.2, 1.2, 9.0),
        focusLookAt: new THREE.Vector3(1.8, 0, 0),
        previewScale: 0.32,
        previewCenterOffset: new THREE.Vector3(-1.8, 0, 0)
      },
      {
        id: 'phone-camera-island',
        title: 'Camera Visor Island Glass',
        stepBadge: 'STEP 4 OF 8',
        category: 'Optics System',
        primitives: ['ExtrudeGeometry (Pill stadium visor)', 'High-gloss reflective clearcoat glass'],
        description: 'Distinctive horizontal camera visor crafted from ultra-glossy jet black optical glass.',
        targets: toArr(phone.cameraIsland),
        focusCamPos: new THREE.Vector3(-1.8, 3.2, 5.2),
        focusLookAt: new THREE.Vector3(-1.8, 2.2, 0),
        previewScale: 0.7,
        previewCenterOffset: new THREE.Vector3(1.8, -2.2, 0)
      },
      {
        id: 'phone-camera-lenses',
        title: 'Triple Camera Array & Optics',
        stepBadge: 'STEP 5 OF 8',
        category: 'Optics System',
        primitives: ['3x Machined metallic lens rings', 'Coated multi-element optical glass lenses'],
        description: 'Main 50MP, periscope telephoto, and ultra-wide camera lenses with anti-reflective sapphire coating.',
        targets: toArr(phone.cameraLenses),
        focusCamPos: new THREE.Vector3(-1.8, 2.8, 4.2),
        focusLookAt: new THREE.Vector3(-1.8, 2.2, 0.1),
        previewScale: 1.1,
        previewCenterOffset: new THREE.Vector3(1.8, -2.2, -0.2)
      },
      {
        id: 'phone-flash-leica',
        title: 'LED Flash & Leica Co-Branding',
        stepBadge: 'STEP 6 OF 8',
        category: 'Optics System',
        primitives: ['Dual-tone LED emitter', 'Leica co-engineering badge plane'],
        description: 'High-CRI LED flash unit and official Leica badge certifying premium optical co-engineering.',
        targets: [phone.flashMesh, phone.leicaMesh].filter(Boolean),
        focusCamPos: new THREE.Vector3(-1.0, 2.6, 4.5),
        focusLookAt: new THREE.Vector3(-1.3, 2.2, 0.1),
        previewScale: 1.4,
        previewCenterOffset: new THREE.Vector3(1.2, -2.2, 0)
      },
      {
        id: 'phone-displays',
        title: 'Dual Flexible OLED Displays',
        stepBadge: 'STEP 7 OF 8',
        category: 'Display Technology',
        primitives: ['Dual LTPO AMOLED panels', 'High-res procedural silk ribbon wallpaper'],
        description: 'Ultra-thin bezel foldable display with rich procedural glowing crimson ribbon artwork.',
        targets: toArr(phone.displayGroup),
        focusCamPos: new THREE.Vector3(0, 0, 9.8),
        focusLookAt: new THREE.Vector3(0, 0, 0),
        previewScale: 0.28,
        previewCenterOffset: new THREE.Vector3(0, 0, 0)
      },
      {
        id: 'phone-branding',
        title: 'Xiaomi Logo & Final Chamfers',
        stepBadge: 'STEP 8 OF 8',
        category: 'Branding & Finish',
        primitives: ['Metallic screen-printed typography', 'Precision diamond-cut chamfers'],
        description: 'Official Xiaomi brand emblem screen-printed onto the lower rear panel.',
        targets: [phone.logoMesh].filter(Boolean),
        focusCamPos: new THREE.Vector3(-1.8, -1.4, 5.8),
        focusLookAt: new THREE.Vector3(-1.8, -1.8, 0),
        previewScale: 1.5,
        previewCenterOffset: new THREE.Vector3(1.8, 1.8, 0)
      }
    ];

    this.initAssemblyState();
  }

  /**
   * Initializes the assembly state (starts with everything hidden, ready to build piece by piece)
   */
  initAssemblyState() {
    this.currentIndex = 0;
    this.isAutoPlaying = false;
    clearTimeout(this.autoPlayTimer);

    // Hide all registered targets
    this.pieces.forEach(p => {
      p.targets.forEach(t => {
        if (t) t.visible = false;
      });
    });

    // Populate the UI Filmstrip tray
    this.renderFilmstrip();

    // Show the first piece to build
    this.updateCurrentPieceShowcase();
  }

  /**
   * Updates UI showcase, preview turntable, and in-scene ghost for current piece
   */
  updateCurrentPieceShowcase() {
    const total = this.pieces.length;
    const isCompleted = this.currentIndex >= total;

    // Update Step Badge & Progress
    const badgeEl = document.getElementById('piece-step-badge');
    const nameEl = document.getElementById('piece-name');
    const descEl = document.getElementById('piece-desc');
    const tagsEl = document.getElementById('piece-geo-tags');
    const progressFill = document.getElementById('piece-progress-bar');
    const progressText = document.getElementById('piece-progress-text');
    const assembleBtn = document.getElementById('btn-assemble-piece');

    const pct = Math.round((this.currentIndex / total) * 100);
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (progressText) progressText.textContent = `${this.currentIndex} of ${total} Built (${pct}%)`;

    if (isCompleted) {
      if (badgeEl) badgeEl.textContent = 'SCENE COMPLETED! 🎉';
      if (nameEl) nameEl.textContent = 'All Pieces Assembled';
      if (descEl) descEl.textContent = 'Congratulations! The entire 3D creation has been successfully built piece by piece.';
      if (tagsEl) tagsEl.innerHTML = '<span class="geo-tag complete">100% Assembled</span>';
      if (assembleBtn) {
        assembleBtn.disabled = true;
        assembleBtn.innerHTML = '✨ Scene Complete';
        assembleBtn.classList.add('completed');
      }

      this.removeGhost();
      this.clearPreview();
      this.highlightFilmstrip();

      // Show completion celebration
      this.showCompletionModal();
      return;
    }

    if (assembleBtn) {
      assembleBtn.disabled = false;
      assembleBtn.innerHTML = `<span>🔨 Assemble Piece</span> <kbd>Space</kbd>`;
      assembleBtn.classList.remove('completed');
    }

    const piece = this.pieces[this.currentIndex];

    if (badgeEl) badgeEl.textContent = piece.stepBadge;
    if (nameEl) nameEl.textContent = piece.title;
    if (descEl) descEl.textContent = piece.description;

    if (tagsEl) {
      tagsEl.innerHTML = '';
      piece.primitives.forEach(prim => {
        const span = document.createElement('span');
        span.className = 'geo-tag';
        span.textContent = prim;
        tagsEl.appendChild(span);
      });
    }

    // Update Live 3D Preview Turntable
    this.updatePreviewTurntable(piece);

    // Update In-Scene Ghost Blueprint
    this.updateInSceneGhost(piece);

    // Update Filmstrip status
    this.highlightFilmstrip();

    // Smoothly pan camera towards the piece focus area
    if (piece.focusCamPos && piece.focusLookAt && !this.isAutoPlaying) {
      this.app.targetCameraPos = piece.focusCamPos.clone();
      this.app.targetCameraLookAt = piece.focusLookAt.clone();
    }
  }

  /**
   * Updates the isolated mini 3D turntable with the active piece
   */
  updatePreviewTurntable(piece) {
    if (!this.previewPivot) return;
    this.clearPreview();

    // Clone all target meshes for the preview
    piece.targets.forEach(target => {
      if (!target) return;
      const clone = target.clone(true);
      // Make sure cloned pieces are visible inside the preview scene
      clone.visible = true;
      clone.traverse(child => {
        if (child.isMesh) {
          child.visible = true;
          // Ensure materials render well under preview lighting
          if (child.material) {
            child.material = child.material.clone();
            if (child.material.transparent) child.material.opacity = Math.max(child.material.opacity, 0.85);
          }
        }
      });
      this.previewPivot.add(clone);
    });

    // Apply scale and offset so the piece is beautifully centered in preview box
    const s = piece.previewScale || 1.0;
    this.previewPivot.scale.set(s, s, s);

    if (piece.previewCenterOffset) {
      this.previewPivot.position.copy(piece.previewCenterOffset);
    } else {
      this.previewPivot.position.set(0, 0, 0);
    }

    this.previewPivot.rotation.set(0, 0, 0);
  }

  clearPreview() {
    if (!this.previewPivot) return;
    while (this.previewPivot.children.length > 0) {
      const obj = this.previewPivot.children[0];
      this.previewPivot.remove(obj);
    }
  }

  /**
   * Spawns a glowing holographic blueprint ghost in the main 3D scene
   */
  updateInSceneGhost(piece) {
    this.removeGhost();

    this.currentGhost = new THREE.Group();
    this.currentGhost.name = 'assemblyGhost';

    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.38
    });

    piece.targets.forEach(target => {
      if (!target) return;
      const ghostClone = target.clone(true);
      ghostClone.visible = true;

      ghostClone.traverse(child => {
        if (child.isMesh) {
          child.material = ghostMat;
          child.castShadow = false;
          child.receiveShadow = false;
        }
      });

      this.currentGhost.add(ghostClone);
    });

    this.mainScene.add(this.currentGhost);
  }

  removeGhost() {
    if (this.currentGhost) {
      this.mainScene.remove(this.currentGhost);
      this.currentGhost = null;
    }
  }

  /**
   * Assembles the current piece with an arrival animation and spark burst
   */
  assembleCurrentPiece() {
    if (this.currentIndex >= this.pieces.length) return;

    const piece = this.pieces[this.currentIndex];

    // Compute approximate world center of the piece for spark burst
    const box = new THREE.Box3();
    piece.targets.forEach(t => {
      if (t) box.expandByObject(t);
    });
    const center = new THREE.Vector3();
    if (!box.isEmpty()) {
      box.getCenter(center);
    } else {
      center.set(0, 1.2, 0);
    }

    // Reveal piece targets with drop-in arrival animation
    piece.targets.forEach(t => {
      if (!t) return;
      t.visible = true;
      const originalY = t.position.y;
      t.position.y = originalY + 1.2;
      t.scale.multiplyScalar(0.7);

      this.animatingPieces.push({
        obj: t,
        targetY: originalY,
        targetScale: t.scale.clone().multiplyScalar(1 / 0.7),
        progress: 0,
        speed: 0.08
      });
    });

    // Trigger golden spark burst
    this.triggerSparks(center);

    // Remove ghost
    this.removeGhost();

    // Advance to next piece
    this.currentIndex++;
    this.updateCurrentPieceShowcase();

    // If auto playing, schedule next piece
    if (this.isAutoPlaying && this.currentIndex < this.pieces.length) {
      clearTimeout(this.autoPlayTimer);
      this.autoPlayTimer = setTimeout(() => {
        this.assembleCurrentPiece();
      }, 1100);
    } else if (this.currentIndex >= this.pieces.length) {
      this.stopAutoPlay();
    }
  }

  /**
   * Toggles auto-play assembly sequence
   */
  toggleAutoPlay() {
    this.isAutoPlaying = !this.isAutoPlaying;
    const btn = document.getElementById('btn-auto-build');
    if (btn) {
      btn.classList.toggle('active', this.isAutoPlaying);
      btn.innerHTML = this.isAutoPlaying ? '⏸ Pause Build' : '⚡ Auto-Build';
    }

    if (this.isAutoPlaying) {
      if (this.currentIndex >= this.pieces.length) {
        this.reset();
        this.isAutoPlaying = true;
        if (btn) {
          btn.classList.add('active');
          btn.innerHTML = '⏸ Pause Build';
        }
      }
      this.assembleCurrentPiece();
    } else {
      clearTimeout(this.autoPlayTimer);
    }
  }

  stopAutoPlay() {
    this.isAutoPlaying = false;
    clearTimeout(this.autoPlayTimer);
    const btn = document.getElementById('btn-auto-build');
    if (btn) {
      btn.classList.remove('active');
      btn.innerHTML = '⚡ Auto-Build';
    }
  }

  /**
   * Instantly assembles all remaining pieces
   */
  assembleAll() {
    this.stopAutoPlay();
    this.pieces.forEach(p => {
      p.targets.forEach(t => {
        if (t) {
          t.visible = true;
        }
      });
    });
    this.currentIndex = this.pieces.length;
    this.updateCurrentPieceShowcase();
    this.triggerSparks(new THREE.Vector3(0, 1.5, 0));
  }

  /**
   * Steps backward (undos previous piece)
   */
  stepPrev() {
    this.stopAutoPlay();
    if (this.currentIndex > 0) {
      this.currentIndex--;
      const piece = this.pieces[this.currentIndex];
      piece.targets.forEach(t => {
        if (t) t.visible = false;
      });
      this.updateCurrentPieceShowcase();
    }
  }

  /**
   * Skips or jumps forward without completing previous if desired, or places current
   */
  stepNext() {
    this.assembleCurrentPiece();
  }

  /**
   * Resets build to Step 1 (everything hidden)
   */
  reset() {
    this.stopAutoPlay();
    this.initAssemblyState();
    if (this.pieces[0] && this.pieces[0].focusCamPos) {
      this.app.targetCameraPos = this.pieces[0].focusCamPos.clone();
      this.app.targetCameraLookAt = this.pieces[0].focusLookAt.clone();
    }
  }

  /**
   * Renders the bottom filmstrip with piece cards
   */
  renderFilmstrip() {
    const tray = document.getElementById('pieces-filmstrip-list');
    if (!tray) return;

    tray.innerHTML = '';
    this.pieces.forEach((piece, idx) => {
      const item = document.createElement('div');
      item.className = 'filmstrip-item';
      item.dataset.index = idx;

      item.innerHTML = `
        <div class="filmstrip-num">${idx + 1}</div>
        <div class="filmstrip-meta">
          <span class="filmstrip-title">${piece.title}</span>
          <span class="filmstrip-category">${piece.category}</span>
        </div>
        <div class="filmstrip-status-icon">⚪</div>
      `;

      item.addEventListener('click', () => {
        // Jump build up to this piece or focus on it
        this.jumpToPiece(idx);
      });

      tray.appendChild(item);
    });

    this.highlightFilmstrip();
  }

  /**
   * Jumps the assembly state to a specific piece index
   */
  jumpToPiece(targetIndex) {
    this.stopAutoPlay();
    // Build all pieces up to targetIndex
    this.pieces.forEach((p, idx) => {
      const shouldBeBuilt = idx < targetIndex;
      p.targets.forEach(t => {
        if (t) t.visible = shouldBeBuilt;
      });
    });

    this.currentIndex = targetIndex;
    this.updateCurrentPieceShowcase();
  }

  /**
   * Updates filmstrip item classes (built vs active vs upcoming)
   */
  highlightFilmstrip() {
    const items = document.querySelectorAll('.filmstrip-item');
    items.forEach((item, idx) => {
      item.classList.remove('built', 'active', 'upcoming');
      const icon = item.querySelector('.filmstrip-status-icon');

      if (idx < this.currentIndex) {
        item.classList.add('built');
        if (icon) icon.textContent = '✔';
      } else if (idx === this.currentIndex) {
        item.classList.add('active');
        if (icon) icon.textContent = '🔨';
        // Auto scroll item into view
        item.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      } else {
        item.classList.add('upcoming');
        if (icon) icon.textContent = '⚪';
      }
    });
  }

  /**
   * Shows celebration modal when build completes
   */
  showCompletionModal() {
    const modal = document.getElementById('celebration-modal');
    if (modal) {
      modal.classList.add('active');
    }
  }

  hideCompletionModal() {
    const modal = document.getElementById('celebration-modal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  /**
   * Per-frame animation updates
   */
  update(time) {
    // 1. Rotate preview turntable piece gently
    if (this.previewPivot && !this.isDraggingPreview) {
      this.previewPivot.rotation.y += this.previewRotSpeed;
    }
    if (this.previewRenderer && this.previewScene && this.previewCamera) {
      this.previewRenderer.render(this.previewScene, this.previewCamera);
    }

    // 2. Pulse ghost blueprint in main scene
    if (this.currentGhost) {
      const pulse = 0.28 + Math.sin(time * 4) * 0.12;
      this.currentGhost.traverse(child => {
        if (child.isMesh && child.material) {
          child.material.opacity = pulse;
        }
      });
    }

    // 3. Animate pieces landing into place
    for (let i = this.animatingPieces.length - 1; i >= 0; i--) {
      const anim = this.animatingPieces[i];
      anim.progress += anim.speed;

      // Smooth ease-out quad
      const t = Math.min(anim.progress, 1.0);
      anim.obj.position.y = THREE.MathUtils.lerp(anim.obj.position.y, anim.targetY, 0.25);
      anim.obj.scale.lerp(anim.targetScale, 0.25);

      if (t >= 1.0 || Math.abs(anim.obj.position.y - anim.targetY) < 0.005) {
        anim.obj.position.y = anim.targetY;
        anim.obj.scale.copy(anim.targetScale);
        this.animatingPieces.splice(i, 1);
      }
    }

    // 4. Update golden spark particles
    if (this.sparkActive) {
      this.sparkLife -= 0.025;
      if (this.sparkLife <= 0) {
        this.sparkActive = false;
        this.sparkPoints.material.opacity = 0;
      } else {
        this.sparkPoints.material.opacity = this.sparkLife;
        const posAttr = this.sparkPoints.geometry.attributes.position;
        for (let i = 0; i < this.sparkVelocities.length; i++) {
          const vel = this.sparkVelocities[i];
          posAttr.setXYZ(
            i,
            posAttr.getX(i) + vel.x * 0.016,
            posAttr.getY(i) + vel.y * 0.016,
            posAttr.getZ(i) + vel.z * 0.016
          );
          // Gravity
          vel.y -= 0.06;
        }
        posAttr.needsUpdate = true;
      }
    }
  }
}
