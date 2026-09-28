import * as THREE from 'three';
import './homeScreen.css';

/**
 * HomeScreen.js (Overhaul with UIverse.io Aesthetics)
 * 
 * Features:
 * - High-definition playroom background with interactive 2.5D mouse parallax
 * - Magical floating fairy dust particles canvas
 * - Uiverse-style chunky 3D push buttons with isometric bevels and gloss
 * - Custom SVG vector icons for Play, My Builds, Challenges, Settings, and Audio
 * - Tactile sound effects and micro-interactions
 * - Smooth transition into the 3D builder
 */

export class HomeScreen {
  constructor(options = {}) {
    this.scene = options.scene;
    this.camera = options.camera;
    this.renderer = options.renderer;
    this.onPlay = options.onPlay || (() => {});
    this.sounds = options.sounds || {};
    this.controls = options.controls || null;

    this.container = null;
    this.particleCanvas = null;
    this.particleCtx = null;
    this.particles = [];
    this.animFrameId = null;
    this.isVisible = true;

    // Home camera framing for background 3D compatibility
    this.homeCameraPos = new THREE.Vector3(0, 2.65, 7.6);
    this.homeCameraTarget = new THREE.Vector3(0.2, 1.55, 0);

    // Profile state
    this.playerStars = 15;
    this.isMuted = false;

    // Parallax tracking
    this.targetMouseX = 0;
    this.targetMouseY = 0;
    this.currentMouseX = 0;
    this.currentMouseY = 0;
    this.onMouseMoveBound = this.onMouseMove.bind(this);
  }

  mount() {
    this.createUI();
    this.initParticles();
    this.connectEvents();
    this.setHomeCamera();
    this.isVisible = true;
  }

  setHomeCamera() {
    if (this.camera) {
      this.camera.position.copy(this.homeCameraPos);
      this.camera.lookAt(this.homeCameraTarget);
      this.camera.updateProjectionMatrix();
    }
    if (this.controls) {
      this.controls.target.copy(this.homeCameraTarget);
      this.controls.enabled = false;
      this.controls.update();
    }
  }

  createUI() {
    const existing = document.getElementById('clackety-home-screen');
    if (existing) existing.remove();

    this.container = document.createElement('div');
    this.container.id = 'clackety-home-screen';
    this.container.className = 'clackety-home-screen';

    this.container.innerHTML = `
      <!-- 1. FULLSCREEN PARALLAX PLAYROOM BACKGROUND -->
      <div class="home-background-layer" id="home-bg-layer"></div>
      <div class="home-background-overlay"></div>
      <canvas class="home-particles-canvas" id="home-particles-canvas"></canvas>

      <!-- 2. TOP BAR -->
      <header class="home-top-bar" aria-label="Game Navigation and Profile">
        <!-- Top-Left: Uiverse Circle Home + Music Buttons -->
        <div class="home-left-controls">
          <button id="home-top-btn" class="uiverse-circle-btn interactive" title="Home Screen" aria-label="Home">
            <svg class="uiverse-icon-svg" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
          </button>
          
          <button id="btn-toggle-sound" class="uiverse-circle-btn btn-music-toggle interactive" title="Toggle Music & Sound" aria-label="Toggle Sound">
            <div class="sound-bars-wrap">
              <span class="sound-bar"></span>
              <span class="sound-bar"></span>
              <span class="sound-bar"></span>
              <span class="sound-bar"></span>
            </div>
          </button>
        </div>

        <!-- Top-Right: Uiverse Glass Profile Capsule -->
        <div class="home-right-controls">
          <div class="uiverse-profile-card interactive" id="home-profile-card" title="Click to collect daily star!">
            <div class="profile-avatar-wrap">
              👦
            </div>
            <div class="profile-stats-wrap">
              <span class="profile-name">Leo</span>
              <div class="profile-star-badge">
                <span class="star-spin-icon">⭐</span>
                <span id="home-star-count">${this.playerStars}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- 3. RIGHT SIDE: UIVERSE 3D INTERACTIVE MENU -->
      <main class="home-menu-layout">
        <!-- 1. PRIMARY: Huge 3D Green PLAY Button -->
        <button id="btn-home-play" class="uiverse-btn-play interactive" aria-label="Start Building">
          <span class="sparkle-icon">✨</span>
          <div class="play-icon-disc">
            <svg class="play-triangle-svg" viewBox="0 0 24 24">
              <polygon points="6,3 20,12 6,21"/>
            </svg>
          </div>
          <span>Play</span>
          <span class="sparkle-icon">✨</span>
        </button>

        <!-- 2. Orange 3D: MY BUILDS Button -->
        <button id="btn-home-mybuilds" class="uiverse-btn-secondary btn-style-mybuilds interactive" aria-label="View My Builds">
          <div class="btn-sec-icon-wrap">
            <svg class="btn-sec-icon-svg" viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
            </svg>
          </div>
          <span class="btn-label-text">My Builds</span>
        </button>

        <!-- 3. Blue 3D: CHALLENGES Button -->
        <button id="btn-home-challenges" class="uiverse-btn-secondary btn-style-challenges interactive" aria-label="Building Challenges">
          <div class="btn-sec-icon-wrap">
            <svg class="btn-sec-icon-svg" viewBox="0 0 24 24">
              <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H7v2h10v-2h-4v-3.1c1.9-.4 3.39-1.9 3.61-3.96C19.08 11.63 21 9.55 21 7V5c0-1.1-.9-2-2-2zm-14 3V5h2v3c0 1.1-.9 2-2 2zm14 0c-1.1 0-2-.9-2-2V5h2v3z"/>
            </svg>
          </div>
          <span class="btn-label-text">Challenges</span>
        </button>

        <!-- 4. Purple 3D: SETTINGS Button -->
        <button id="btn-home-settings" class="uiverse-btn-secondary btn-style-settings interactive" aria-label="Game Settings">
          <div class="btn-sec-icon-wrap">
            <svg class="btn-sec-icon-svg" viewBox="0 0 24 24">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </div>
          <span class="btn-label-text">Settings</span>
        </button>
      </main>

      <!-- 4. BOTTOM FLOATING PROMPT BANNER -->
      <footer class="home-bottom-bar">
        <div class="uiverse-prompt-capsule">
          <span>✨</span>
          <span>Dream • Build • Create — Tap Play to start building!</span>
          <span>✨</span>
        </div>
      </footer>

      <!-- 5. UIVERSE MODALS -->
      <!-- A. My Builds Modal -->
      <div id="modal-my-builds" class="uiverse-modal-backdrop" role="dialog" aria-modal="true">
        <div class="uiverse-modal-window">
          <div class="uiverse-modal-header modal-header-mybuilds">
            <h3 class="uiverse-modal-title">🧱 My Saved Builds</h3>
            <button class="uiverse-modal-close-btn" data-close="modal-my-builds" aria-label="Close">✕</button>
          </div>
          <div class="uiverse-modal-content">
            <div class="uiverse-card-item">
              <div class="card-item-info">
                <h4>🚂 Steam Train Workshop</h4>
                <p>42 Step Guide • Completed • Ready to Drive!</p>
              </div>
              <button class="uiverse-modal-action-btn btn-load-build" data-build="train">Load Workshop</button>
            </div>
            <div class="uiverse-card-item">
              <div class="card-item-info">
                <h4>🏰 Rainbow Castle</h4>
                <p>94 Bricks • In Progress</p>
              </div>
              <button class="uiverse-modal-action-btn btn-load-build" data-build="castle">Continue</button>
            </div>
            <div class="uiverse-card-item">
              <div class="card-item-info">
                <h4>🚀 Cosmic Explorer Rocket</h4>
                <p>58 Bricks • Saved Blueprint</p>
              </div>
              <button class="uiverse-modal-action-btn btn-load-build" data-build="rocket">Load</button>
            </div>
          </div>
        </div>
      </div>

      <!-- B. Challenges Modal -->
      <div id="modal-challenges" class="uiverse-modal-backdrop" role="dialog" aria-modal="true">
        <div class="uiverse-modal-window">
          <div class="uiverse-modal-header">
            <h3 class="uiverse-modal-title">🏆 Building Challenges</h3>
            <button class="uiverse-modal-close-btn" data-close="modal-challenges" aria-label="Close">✕</button>
          </div>
          <div class="uiverse-modal-content">
            <div class="uiverse-card-item">
              <div class="card-item-info">
                <h4>🚒 Build a Fire Engine</h4>
                <p>24 Bricks • Easy • Reward: ⭐ 5</p>
              </div>
              <button class="uiverse-modal-action-btn btn-start-chal" data-chal="firetruck">Build!</button>
            </div>
            <div class="uiverse-card-item">
              <div class="card-item-info">
                <h4>🏡 Build a Cozy Treehouse</h4>
                <p>36 Bricks • Fun • Reward: ⭐ 8</p>
              </div>
              <button class="uiverse-modal-action-btn btn-start-chal" data-chal="treehouse">Build!</button>
            </div>
            <div class="uiverse-card-item">
              <div class="card-item-info">
                <h4>🚁 Build a Rescue Helicopter</h4>
                <p>32 Bricks • Medium • Reward: ⭐ 10</p>
              </div>
              <button class="uiverse-modal-action-btn btn-start-chal" data-chal="helicopter">Build!</button>
            </div>
          </div>
        </div>
      </div>

      <!-- C. Settings Modal -->
      <div id="modal-settings" class="uiverse-modal-backdrop" role="dialog" aria-modal="true">
        <div class="uiverse-modal-window">
          <div class="uiverse-modal-header modal-header-settings">
            <h3 class="uiverse-modal-title">⚙️ Game Settings</h3>
            <button class="uiverse-modal-close-btn" data-close="modal-settings" aria-label="Close">✕</button>
          </div>
          <div class="uiverse-modal-content">
            <div class="setting-item-row">
              <span class="setting-item-label">🔊 Sound Effects Volume</span>
              <input type="range" class="uiverse-range-slider" min="0" max="100" value="85" id="setting-sfx-vol">
            </div>
            <div class="setting-item-row">
              <span class="setting-item-label">🎵 Playroom Music</span>
              <input type="range" class="uiverse-range-slider" min="0" max="100" value="70" id="setting-mus-vol">
            </div>
            <div class="setting-item-row">
              <span class="setting-item-label">🌟 Graphics & Details</span>
              <select id="setting-quality-select" style="padding: 8px 16px; border-radius: 999px; font-weight: 800; font-family: inherit; border: 2px solid #cbd5e1;">
                <option value="high" selected>Ultra Crisp 🌟</option>
                <option value="medium">Balanced ⚡</option>
                <option value="low">Performance 🔋</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
  }

  initParticles() {
    this.particleCanvas = this.container.querySelector('#home-particles-canvas');
    if (!this.particleCanvas) return;

    this.particleCtx = this.particleCanvas.getContext('2d');
    const resizeCanvas = () => {
      if (this.particleCanvas) {
        this.particleCanvas.width = window.innerWidth;
        this.particleCanvas.height = window.innerHeight;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Generate 35 fairy sparkle particles
    this.particles = [];
    const count = 35;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: 1.5 + Math.random() * 3.5,
        speedY: 0.3 + Math.random() * 0.7,
        speedX: (Math.random() - 0.5) * 0.4,
        alpha: 0.2 + Math.random() * 0.8,
        alphaSpeed: 0.01 + Math.random() * 0.02,
        color: ['#fef08a', '#fde047', '#fed7aa', '#ffffff', '#67e8f9'][Math.floor(Math.random() * 5)]
      });
    }

    const renderLoop = () => {
      if (!this.isVisible || !this.particleCtx || !this.particleCanvas) {
        this.animFrameId = requestAnimationFrame(renderLoop);
        return;
      }

      this.particleCtx.clearRect(0, 0, this.particleCanvas.width, this.particleCanvas.height);

      // Smooth mouse parallax interpolation
      this.currentMouseX += (this.targetMouseX - this.currentMouseX) * 0.08;
      this.currentMouseY += (this.targetMouseY - this.currentMouseY) * 0.08;
      if (this.container) {
        this.container.style.setProperty('--mouse-x', this.currentMouseX.toFixed(3));
        this.container.style.setProperty('--mouse-y', this.currentMouseY.toFixed(3));
      }

      // Draw fairy dust
      this.particles.forEach((p) => {
        p.y -= p.speedY;
        p.x += p.speedX;
        p.alpha += p.alphaSpeed;
        if (p.alpha > 0.95 || p.alpha < 0.2) p.alphaSpeed = -p.alphaSpeed;

        if (p.y < -10) {
          p.y = this.particleCanvas.height + 10;
          p.x = Math.random() * this.particleCanvas.width;
        }

        this.particleCtx.save();
        this.particleCtx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
        this.particleCtx.fillStyle = p.color;
        this.particleCtx.shadowBlur = 10;
        this.particleCtx.shadowColor = p.color;
        this.particleCtx.beginPath();
        this.particleCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.particleCtx.fill();
        this.particleCtx.restore();
      });

      this.animFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();
  }

  onMouseMove(e) {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = (e.clientY / window.innerHeight) * 2 - 1;
    this.targetMouseX = x;
    this.targetMouseY = y;
  }

  connectEvents() {
    if (!this.container) return;

    window.addEventListener('mousemove', this.onMouseMoveBound);

    // PLAY Button Click
    const playBtn = this.container.querySelector('#btn-home-play');
    if (playBtn) {
      playBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.playPopSound();
        this.triggerPlayTransition();
      });
    }

    // Sound toggle button
    const soundBtn = this.container.querySelector('#btn-toggle-sound');
    if (soundBtn) {
      soundBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.isMuted = !this.isMuted;
        soundBtn.classList.toggle('muted', this.isMuted);
        this.playPopSound();
      });
    }

    // Home Button Click (top-left)
    const homeBtn = this.container.querySelector('#home-top-btn');
    if (homeBtn) {
      homeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.playPopSound();
        homeBtn.animate([
          { transform: 'scale(1) rotate(0deg)' },
          { transform: 'scale(1.22) rotate(-14deg)' },
          { transform: 'scale(0.92) rotate(10deg)' },
          { transform: 'scale(1) rotate(0deg)' }
        ], { duration: 380, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
      });
    }

    // Profile Card Click (Adds stars with celebration sound)
    const profile = this.container.querySelector('#home-profile-card');
    if (profile) {
      profile.addEventListener('click', () => {
        this.playStarSound();
        this.playerStars += 1;
        const countEl = this.container.querySelector('#home-star-count');
        if (countEl) {
          countEl.textContent = this.playerStars;
          countEl.animate([
            { transform: 'scale(1)' },
            { transform: 'scale(1.6)' },
            { transform: 'scale(1)' }
          ], { duration: 320 });
        }
      });
    }

    // Modal Triggers
    const setupModal = (btnId, modalId) => {
      const btn = this.container.querySelector(`#${btnId}`);
      const modal = this.container.querySelector(`#${modalId}`);
      if (btn && modal) {
        btn.addEventListener('click', () => {
          this.playPopSound();
          modal.classList.add('active');
        });
      }
    };

    setupModal('btn-home-mybuilds', 'modal-my-builds');
    setupModal('btn-home-challenges', 'modal-challenges');
    setupModal('btn-home-settings', 'modal-settings');

    // Close buttons
    this.container.querySelectorAll('.uiverse-modal-close-btn').forEach((closeBtn) => {
      closeBtn.addEventListener('click', () => {
        this.playPopSound();
        const modalId = closeBtn.getAttribute('data-close');
        const modal = this.container.querySelector(`#${modalId}`);
        if (modal) modal.classList.remove('active');
      });
    });

    // Close on backdrop click
    this.container.querySelectorAll('.uiverse-modal-backdrop').forEach((modal) => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.playPopSound();
          modal.classList.remove('active');
        }
      });
    });

    // Start actions in modals
    this.container.querySelectorAll('.btn-load-build, .btn-start-chal').forEach((actionBtn) => {
      actionBtn.addEventListener('click', () => {
        this.playPopSound();
        const modal = actionBtn.closest('.uiverse-modal-backdrop');
        if (modal) modal.classList.remove('active');
        this.triggerPlayTransition();
      });
    });
  }

  triggerPlayTransition() {
    this.hide();
    if (typeof this.onPlay === 'function') {
      this.onPlay();
    }
  }

  playPopSound() {
    try {
      if (!this.isMuted && this.sounds) {
        if (typeof this.sounds.playPop === 'function') this.sounds.playPop();
        else if (typeof this.sounds.playSnap === 'function') this.sounds.playSnap();
      }
    } catch (_) {}
  }

  playStarSound() {
    try {
      if (!this.isMuted && this.sounds) {
        if (typeof this.sounds.playCelebrationHorn === 'function') this.sounds.playCelebrationHorn();
        else this.playPopSound();
      }
    } catch (_) {}
  }

  show() {
    this.isVisible = true;
    if (this.container) {
      this.container.classList.remove('home-hidden');
    }
    this.setHomeCamera();
  }

  hide() {
    this.isVisible = false;
    if (this.container) {
      this.container.classList.add('home-hidden');
    }
  }

  update(_delta) {
    // No-op for background image mode
  }

  destroy() {
    window.removeEventListener('mousemove', this.onMouseMoveBound);
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
    }
    this.isVisible = false;
  }
}
