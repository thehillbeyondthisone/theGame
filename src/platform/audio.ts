/** Small synthesized cues for the physical sink and rim miss. */
export class AudioFeedback {
  private context: AudioContext | null = null;

  /** Call during a click or XR entry so browsers can unlock audio. */
  enable(): void {
    if (typeof AudioContext === 'undefined') return;
    try { this.context ??= new AudioContext(); } catch { return; }
    if (this.context.state === 'suspended') this.context.resume().catch(() => {});
  }

  rim(speed: number): void {
    const volume = Math.min(0.055, 0.025 + speed * 0.012);
    this.tone(880, 640, 0.13, volume, 'triangle');
    this.tone(1310, 1040, 0.09, volume * 0.34, 'sine');
  }

  sink(streak: number): void {
    this.tone(68, 43, 0.2, 0.09, 'sine');
    this.tone(220, 220, 0.42, 0.032, 'sine');
    this.tone(330, 330, 0.42, 0.022, 'sine');
    this.tone(440 + Math.min(streak, 8) * 12, 440 + Math.min(streak, 8) * 12, 0.36, 0.012, 'sine');
  }

  private tone(from: number, to: number, seconds: number, volume: number, type: OscillatorType): void {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running') return;
    const at = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, at);
    oscillator.frequency.exponentialRampToValueAtTime(to, at + seconds);
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.linearRampToValueAtTime(volume, at + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
    oscillator.connect(envelope);
    envelope.connect(ctx.destination);
    oscillator.start(at);
    oscillator.stop(at + seconds + 0.01);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }
}
