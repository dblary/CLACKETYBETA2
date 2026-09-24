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
    this.isMusicEnabled = true;
    this.bgmTempo = 0.9; // 90% Tempo as requested
    this.bgmVolume = 0.28;

    // Authentic Recorded LEGO Piece SFX from /music/ folder
    this.legoPressedAudioUrl = '/music/freesound_community-lego-piece-pressed-105360.mp3';
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
   * Preload and decode the authentic LEGO piece sound from /music/
   */
  loadLegoSound() {
    if (this.legoPressedBuffer || this.isLoadingLegoSound) return;
    this.isLoadingLegoSound = true;

    try {
      this.legoAudioFallback = new Audio(this.legoPressedAudioUrl);
      this.legoAudioFallback.volume = 0.95;
      this.legoAudioFallback.preload = 'auto';
    } catch (e) {}

    if (typeof fetch === 'function') {
      fetch(this.legoPressedAudioUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.arrayBuffer();
        })
        .then((arrayBuffer) => {
          if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
          }
          if (this.ctx) {
            return this.ctx.decodeAudioData(arrayBuffer);
          }
        })
        .then((decoded) => {
          if (decoded) {
            this.legoPressedBuffer = decoded;
          }
          this.isLoadingLegoSound = false;
        })
        .catch(() => {
          this.isLoadingLegoSound = false;
        });
    }
  }

  /**
   * Authentic Recorded LEGO Piece Pressed Sound
   * Triggered when a LEGO piece is pressed, snapped, clicked, or placed.
   */
  playLegoPressed(volume = 0.95, pitchRate = 1.0) {
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
        // Subtle micro-pitch variation (0.97 - 1.03) to prevent machine-gun effect
        const rate = pitchRate * (0.97 + Math.random() * 0.06);
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
        clone.volume = Math.min(1.0, volume);
        clone.playbackRate = pitchRate;
        clone.play().catch(() => {});
      } catch (e) {}
    }
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

  /**
   * LEGO ABS Plastic Snap Sound - Uses MP3 SFX exclusively
   */
  playSnap() {
    if (this.isMuted) return;
    this.playPlasticThwackSnap();
  }

  /**
   * Lighter tick sound when hovering over valid studs / entering magnetic snap zone
   */
  playHoverTick() {
    if (this.isMuted) return;
    this.init();
    if (this.ctx) {
      try {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1400, t);
        osc.frequency.exponentialRampToValueAtTime(750, t + 0.035);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.04);
        return;
      } catch (e) {}
    }
    this.playPop();
  }

  /**
   * High-frequency plastic friction scrape when moving across studs
   */
  playStudScrape() {
    if (this.isMuted) return;
    this.init();
    if (this.ctx) {
      try {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(2200, t);
        osc.frequency.exponentialRampToValueAtTime(1100, t + 0.045);
        gain.gain.setValueAtTime(0.09, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);
        return;
      } catch (e) {}
    }
  }

  /**
   * Deep thwack-snap sound when releasing piece into place
   */
  playPlasticThwackSnap() {
    if (this.isMuted) return;
    // Play recorded sample for authentic LEGO ABS click
    this.playLegoPressed(1.0, 0.98);

    // Complement with deep physical acoustic snap body
    this.init();
    if (this.ctx) {
      try {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.09);
        gain.gain.setValueAtTime(0.42, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.1);
      } catch (e) {}
    }
  }


  /**
   * Toy Pop / Demolish Sound
   */
  playPop() {
    if (this.isMuted) return;
    this.playLegoPressed(0.85, 1.08);
  }

  /**
   * LEGO Clutch Clack Sound - Uses MP3 SFX exclusively
   */
  playClack() {
    if (this.isMuted) return;
    this.playLegoPressed(1.0, 1.02);
  }

  /**
   * Dull plastic tap/rejection sound for invalid placement
   */
  playReject() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.12);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  /**
   * Blunt plastic collision knock sound for rigid-body collision rejection
   */
  playCollisionKnock() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Muffled bandpass impulse click (hard ABS knock)
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(850, t);
      filter.Q.setValueAtTime(2.8, t);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.5, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + 0.06);
    }

    // 2. Low blunt plastic body resonance
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.09);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * Plastic tumble and rattle sound - Uses MP3 SFX exclusively
   */
  playPlasticRattle(intensity = 1.0) {
    if (this.isMuted) return;
    this.playLegoFalled(intensity);
  }

  /**
   * Dramatic Demolish / Crash Explosion Sound
   */
  playCrash() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Initial explosive impact burst
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3500, t);
      filter.frequency.exponentialRampToValueAtTime(400, t + 0.35);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + 0.5);
    }

    // 2. Heavy bass thud
    const bassOsc = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    bassOsc.type = 'sine';
    bassOsc.frequency.setValueAtTime(180, t);
    bassOsc.frequency.exponentialRampToValueAtTime(35, t + 0.3);

    bassGain.gain.setValueAtTime(0.65, t);
    bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    bassOsc.connect(bassGain);
    bassGain.connect(this.ctx.destination);

    bassOsc.start(t);
    bassOsc.stop(t + 0.36);

    // 3. Cascading plastic debris scattering
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this.playPlasticRattle(0.8 - i * 0.1);
      }, 50 + i * 45);
    }
  }

  /**
   * Authentic Two-Tone Steam Train Whistle Chord
   * Two main tones: 587 Hz (D5) and 880 Hz (A5)
   * With subtle harmonics, vibrato LFO, and realistic steam envelope
   */
  playWhistle(duration = 0.8) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, t);
    masterGain.gain.linearRampToValueAtTime(0.45, t + 0.06);
    masterGain.gain.setValueAtTime(0.45, t + duration - 0.12);
    masterGain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    masterGain.connect(this.ctx.destination);

    // Vibrato LFO
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(5.5, t); // 5.5 Hz vibrato
    lfoGain.gain.setValueAtTime(7.0, t);
    lfo.connect(lfoGain);
    lfo.start(t);
    lfo.stop(t + duration);

    // Steam whistle frequencies (D5: 587 Hz, A5: 880 Hz) + slight detuning for rich acoustic beating
    const frequencies = [587.33, 589.5, 880.0, 882.5, 1174.6];
    const amplitudes = [0.35, 0.2, 0.35, 0.2, 0.1];

    frequencies.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = idx === 4 ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      // Connect vibrato to whistle frequency
      lfoGain.connect(osc.frequency);

      // Mild low-pass filter for smooth steam acoustic tone
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, t);

      oscGain.gain.setValueAtTime(amplitudes[idx], t);

      osc.connect(filter);
      filter.connect(oscGain);
      oscGain.connect(masterGain);

      osc.start(t);
      osc.stop(t + duration);
    });

    // Add gentle background steam hiss
    if (this.noiseBuffer) {
      const steamNoise = this.ctx.createBufferSource();
      steamNoise.buffer = this.noiseBuffer;
      const steamFilter = this.ctx.createBiquadFilter();
      steamFilter.type = 'bandpass';
      steamFilter.frequency.setValueAtTime(1400, t);
      steamFilter.Q.setValueAtTime(1.8, t);

      const steamGain = this.ctx.createGain();
      steamGain.gain.setValueAtTime(0.12, t);
      steamGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      steamNoise.connect(steamFilter);
      steamFilter.connect(steamGain);
      steamGain.connect(masterGain);

      steamNoise.start(t);
      steamNoise.stop(t + duration);
    }
  }

  /**
   * Double "TOOT TOOT!" sequence
   */
  playDoubleToot() {
    this.playWhistle(0.35);
    setTimeout(() => {
      this.playWhistle(0.65);
    }, 420);
  }

  /**
   * Single chug beat ("chuff")
   */
  triggerChugBeat(accent = false) {
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;

    // Steam chuff noise
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      const centerFreq = accent ? 750 : 580;
      filter.frequency.setValueAtTime(centerFreq, t);
      filter.frequency.exponentialRampToValueAtTime(260, t + 0.12);
      filter.Q.setValueAtTime(2.2, t);

      const gain = this.ctx.createGain();
      const peakVol = accent ? 0.32 : 0.2;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(peakVol, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + 0.15);
    }

    // Low iron click-clack rail resonance
    const clack = this.ctx.createOscillator();
    const clackGain = this.ctx.createGain();
    clack.type = 'triangle';
    clack.frequency.setValueAtTime(accent ? 130 : 95, t);
    clack.frequency.exponentialRampToValueAtTime(45, t + 0.05);

    clackGain.gain.setValueAtTime(accent ? 0.22 : 0.12, t);
    clackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    clack.connect(clackGain);
    clackGain.connect(this.ctx.destination);

    clack.start(t);
    clack.stop(t + 0.06);
  }

  /**
   * Start rhythmic chug loop
   */
  startChug(tempoMs = 280) {
    if (this.isChugging) return;
    this.init();
    this.isChugging = true;
    this.chugTempo = tempoMs;
    this.chugBeat = 0;

    const scheduleNext = () => {
      if (!this.isChugging) return;
      const isAccent = this.chugBeat % 4 === 0;
      this.triggerChugBeat(isAccent);
      this.chugBeat++;
      this.chugTimer = setTimeout(scheduleNext, this.chugTempo);
    };

    scheduleNext();
  }

  setChugTempo(tempoMs) {
    this.chugTempo = Math.max(120, Math.min(500, tempoMs));
  }

  stopChug() {
    this.isChugging = false;
    if (this.chugTimer) {
      clearTimeout(this.chugTimer);
      this.chugTimer = null;
    }
  }
}

export const sounds = new SoundEngine();
