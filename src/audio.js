// Procedural Web Audio API sound synthesizer and BGM player for LEGO 3D Builder

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.noiseBuffer = null;
    this.chugTimer = null;
    this.chugBeat = 0;
    this.chugTempo = 280; // ms between chugs
    this.isChugging = false;

    // Background Music Configuration (90% Tempo)
    this.musicPlaylist = [
      '/music/alex-morgan-kids-kids-happy-music-545506.mp3',
      '/music/bombinsound-happy-kids-background-music-499554.mp3',
      '/music/atlasaudio-kids-song-606264.mp3',
      '/music/sub_clair-kids-601397.mp3',
      '/music/verclub_music-kids-kids-music-577331.mp3'
    ];
    this.currentTrackIndex = 0;
    this.bgmAudio = null;
    this.isMusicPlaying = false;
    this.isMusicEnabled = false; // Disabled by default - only game sound effects active
    this.bgmTempo = 0.9;
    this.bgmVolume = 0.28;

    // Click SFX placed in /music/ folder (file name: click / click.wav)
    this.clickUrl = '/music/click';
    this.candidateUrls = [
      '/music/click',
      '/music/click.wav',
      '/music/click.mp3',
      '/music/freesound_community-lego-piece-pressed-105360.mp3'
    ];
    this.legoPressedBuffer = null;
    this.legoAudioFallback = null;
    this.isLoadingLegoSound = false;

    // Preload audio sample
    if (typeof window !== 'undefined') {
      this.loadLegoSound();
    }
  }

  init() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.createNoiseBuffer();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.legoPressedBuffer && !this.isLoadingLegoSound) {
      this.loadLegoSound();
    }
  }

  /**
   * Preload and decode the click sound from /music/click (or candidates)
   */
  loadLegoSound() {
    if (this.legoPressedBuffer || this.isLoadingLegoSound) return;
    this.isLoadingLegoSound = true;

    // Fallback audio element
    try {
      this.legoAudioFallback = new Audio('/music/click.wav');
      this.legoAudioFallback.volume = 1.0;
      this.legoAudioFallback.preload = 'auto';
    } catch (e) {}

    const tryLoadCandidates = async () => {
      for (const url of this.candidateUrls) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const arrayBuffer = await res.arrayBuffer();
          if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
          }
          if (this.ctx) {
            const decoded = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
            if (decoded) {
              this.legoPressedBuffer = decoded;
              this.isLoadingLegoSound = false;
              try {
                this.legoAudioFallback = new Audio(url);
                this.legoAudioFallback.volume = 1.0;
                this.legoAudioFallback.preload = 'auto';
              } catch (e) {}
              return;
            }
          }
        } catch (err) {
          // continue to next candidate
        }
      }
      this.isLoadingLegoSound = false;
    };

    if (typeof fetch === 'function') {
      tryLoadCandidates();
    }
  }

  /**
   * Authentic Recorded LEGO Piece Pressed / Click Sound
   * Triggered when two pieces are correctly placed.
   */
  playLegoPressed(volume = 1.0, pitchRate = 1.0) {
    if (this.isMuted) return;
    this.init();

    if (!this.legoPressedBuffer && !this.isLoadingLegoSound) {
      this.loadLegoSound();
    }

    if (this.ctx && this.legoPressedBuffer) {
      try {
        const t = this.ctx.currentTime;
        const source = this.ctx.createBufferSource();
        source.buffer = this.legoPressedBuffer;
        // Subtle micro-pitch variation (0.98 - 1.02) to prevent machine-gun effect
        const rate = pitchRate * (0.98 + Math.random() * 0.04);
        source.playbackRate.setValueAtTime(rate, t);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(Math.min(1.0, Math.max(0.1, volume)), t);

        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(t);
        return;
      } catch (e) {}
    }

    if (this.legoAudioFallback) {
      try {
        const clone = this.legoAudioFallback.cloneNode();
        clone.currentTime = 0;
        clone.volume = Math.min(1.0, volume);
        clone.playbackRate = pitchRate;
        clone.play().catch(() => {});
      } catch (e) {}
    }
  }

  playClick(volume = 1.0, pitchRate = 1.0) {
    this.playLegoPressed(volume, pitchRate);
  }

  /**
   * Authentic Recorded LEGO Piece Fallen Sound
   * Triggered when a LEGO piece falls, drops in mid-air, topples, or collides with the baseplate.
   */
  playLegoFalled(intensity = 1.0) {
    if (this.isMuted) return;
    this.init();

    const clampedIntensity = Math.min(1.5, Math.max(0.2, intensity));

    if (!this.legoPressedBuffer && !this.isLoadingLegoSound) {
      this.loadLegoSound();
    }

    if (this.ctx && this.legoPressedBuffer) {
      try {
        const t = this.ctx.currentTime;
        const source = this.ctx.createBufferSource();
        source.buffer = this.legoPressedBuffer;
        // Lower pitch and heavier impact feel for falling brick (0.74 - 0.92)
        const fallPitch = 0.74 + Math.random() * 0.18;
        source.playbackRate.setValueAtTime(fallPitch, t);

        const gain = this.ctx.createGain();
        const impactGain = Math.min(1.0, 0.45 + clampedIntensity * 0.45);
        gain.gain.setValueAtTime(impactGain, t);

        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(t);
      } catch (e) {}
    } else if (this.legoAudioFallback) {
      try {
        const clone = this.legoAudioFallback.cloneNode();
        clone.volume = Math.min(1.0, 0.45 + clampedIntensity * 0.45);
        clone.playbackRate = 0.82;
        clone.play().catch(() => {});
      } catch (e) {}
    }
  }

  initBGM() {
    if (this.bgmAudio) return;
    this.bgmAudio = new Audio(this.musicPlaylist[this.currentTrackIndex]);
    this.bgmAudio.volume = this.bgmVolume;
    this.bgmAudio.playbackRate = this.bgmTempo;
    this.bgmAudio.preservesPitch = true;

    // Enforce 90% tempo whenever playback triggers or metadata loads
    this.bgmAudio.addEventListener('play', () => {
      this.bgmAudio.playbackRate = this.bgmTempo;
    });
    this.bgmAudio.addEventListener('loadedmetadata', () => {
      this.bgmAudio.playbackRate = this.bgmTempo;
    });

    // Advance to next playlist track when current track completes
    this.bgmAudio.addEventListener('ended', () => {
      this.playNextTrack();
    });
  }

  playNextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.musicPlaylist.length;
    if (this.bgmAudio) {
      this.bgmAudio.src = this.musicPlaylist[this.currentTrackIndex];
      this.bgmAudio.playbackRate = this.bgmTempo;
      if (this.isMusicPlaying && !this.isMuted) {
        this.bgmAudio.play().catch(() => {});
      }
    }
  }

  startBGM() {
    if (!this.isMusicEnabled || this.isMuted) return;
    this.initBGM();
    if (this.bgmAudio) {
      this.bgmAudio.playbackRate = this.bgmTempo;
      this.bgmAudio.play()
        .then(() => {
          this.isMusicPlaying = true;
          this.updateMusicUI(true);
        })
        .catch(() => {
          // Autoplay policy prevented; waits for user gesture
          this.isMusicPlaying = false;
          this.updateMusicUI(false);
        });
    }
  }

  pauseBGM() {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
    }
    this.isMusicPlaying = false;
    this.updateMusicUI(false);
  }

  toggleMusic() {
    this.isMusicEnabled = !this.isMusicEnabled;
    if (this.isMusicEnabled) {
      this.startBGM();
    } else {
      this.pauseBGM();
    }
    return this.isMusicEnabled;
  }

  setMusicTempo(rate = 0.9) {
    this.bgmTempo = rate;
    if (this.bgmAudio) {
      this.bgmAudio.playbackRate = rate;
    }
  }

  updateMusicUI(isPlaying) {
    const btn = document.getElementById('btn-music-toggle');
    const label = document.getElementById('music-toggle-label');
    const icon = document.getElementById('music-toggle-icon');
    if (label) label.textContent = isPlaying ? 'Music: ON' : 'Music: OFF';
    if (icon) icon.textContent = isPlaying ? '🎵' : '🔇';
    if (btn) {
      if (isPlaying) btn.classList.add('music-active');
      else btn.classList.remove('music-active');
    }
  }

  createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      if (this.isChugging) this.stopChug();
      if (this.bgmAudio) this.bgmAudio.muted = true;
    } else {
      if (this.bgmAudio) {
        this.bgmAudio.muted = false;
        if (this.isMusicEnabled && this.isMusicPlaying) {
          this.bgmAudio.play().catch(() => {});
        }
      }
    }
    return this.isMuted;
  }

  // =========================================================
  // ONLY CLICK SFX PLACED IN MUSIC FOLDER IS ACTIVE
  // All other synthesized sounds and sound effects are silenced
  // =========================================================

  /**
   * Only active SFX: Plays click SFX from /music/ folder when two pieces are correctly placed
   */
  playDingClack() {
    this.playLegoPressed(1.0, 1.0);
  }

  /**
   * Sharp, tactile plastic snap sound effect (*clack!*) on valid stud connection
   */
  playPlasticThwackSnap() {
    this.playClack();
  }

  playSnap() {
    this.playClack();
  }

  playClack() {
    if (this.isMuted) return;
    this.init();
    this.playLegoPressed(1.0, 1.02 + Math.random() * 0.08);

    if (this.ctx) {
      try {
        const t = this.ctx.currentTime;
        // Resonant dual-tone plastic click transient
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1600 + Math.random() * 200, t);
        osc.frequency.exponentialRampToValueAtTime(280, t + 0.035);

        gain.gain.setValueAtTime(0.7, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.045);

        // Click transient noise tick
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.015);
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(1200, t);
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.5, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(t);
      } catch (e) {}
    }
  }

  playPop(pitch = 1.0, volume = 0.35) {
    if (this.isMuted) return;
    this.init();
    if (this.ctx) {
      try {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime((440 + Math.random() * 60) * pitch, t);
        osc.frequency.exponentialRampToValueAtTime((880 + Math.random() * 80) * pitch, t + 0.05);

        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.065);
      } catch (e) {}
    }
  }

  playHoverTick() {
    if (this.isMuted) return;
    this.init();
    if (this.ctx) {
      try {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.015);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.02);
      } catch (e) {}
    }
  }

  playMutedThud() {}
  playReject() {}
  playCollisionKnock() {}
  playPlasticRattle() {}
  playCrash() {}
  playFanfare() {}
  playWhistle() {}
  playDoubleToot() {}
  triggerChugBeat() {}
  startChug() {}
  setChugTempo() {}
  stopChug() {}
  playLegoFalled() {}
  playHorn() {}
  playTone() {}
}

const rawSounds = new SoundEngine();

// Resilient Proxy: ensures any missing or legacy sound call safely no-ops rather than throwing a TypeError
export const sounds = new Proxy(rawSounds, {
  get(target, prop, receiver) {
    if (prop in target) {
      const val = Reflect.get(target, prop, receiver);
      if (typeof val === 'function') {
        return val.bind(target);
      }
      return val;
    }
    // Return a safe no-op function for any unknown audio methods
    return (...args) => {};
  }
});

