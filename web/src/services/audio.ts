// Web Audio API Synthesizer for Time+
// Generates crystal-clear magical audio cues without loading external audio files

class AudioManager {
  private ctx: AudioContext | null = null;
  private enabled = true;

  constructor() {
    const saved = localStorage.getItem('timeplus_sound_enabled');
    if (saved !== null) {
      this.enabled = saved === 'true';
    }
  }

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    localStorage.setItem('timeplus_sound_enabled', String(val));
  }

  // 1. Subtle click / tap
  public playTap() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Audio errors are non-fatal
    }
  }

  // 2. Task Submission (rising hopeful chime)
  public playSubmit() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [440, 554, 659].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.12, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.22);
      });
    } catch {
      // Silent catch
    }
  }

  // 3. Approval Sparkle (magical gold reward chime)
  public playApproval() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      // Arpeggio: C5, E5, G5, B5, C6
      const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.15, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.38);
      });
    } catch {
      // Silent catch
    }
  }

  // 4. Level-up / Major milestone fanfare
  public playFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const chords = [
        { freqs: [440, 554.37, 659.25], start: 0, dur: 0.2 },
        { freqs: [440, 554.37, 659.25], start: 0.22, dur: 0.2 },
        { freqs: [523.25, 659.25, 783.99], start: 0.44, dur: 0.2 },
        { freqs: [587.33, 739.99, 880], start: 0.68, dur: 0.5 },
      ];
      chords.forEach(({ freqs, start, dur }) => {
        freqs.forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + start);
          gain.gain.setValueAtTime(0.12, now + start);
          gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + start);
          osc.stop(now + start + dur + 0.05);
        });
      });
    } catch {
      // Silent catch
    }
  }

  // 5. Screen-time finished alarm (distinct repeated alert)
  public playTimeUp() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const pattern = [
        { freq: 880, start: 0.00, dur: 0.28 },
        { freq: 660, start: 0.34, dur: 0.28 },
        { freq: 880, start: 0.68, dur: 0.28 },
        { freq: 660, start: 1.02, dur: 0.28 },
        { freq: 1046.5, start: 1.40, dur: 0.60 },
      ];

      pattern.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + start);
        gain.gain.setValueAtTime(0.16, now + start);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + dur + 0.03);
      });
    } catch {
      // Audio errors are non-fatal
    }
  }

  // 6. Rejection / Warning (soft low neutral tone)
  public playReject() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(180, now + 0.25);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    } catch {
      // Silent catch
    }
  }
}

export const audio = new AudioManager();
