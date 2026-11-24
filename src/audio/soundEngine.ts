import { ReelBeat, TOTAL_REEL_DURATION } from "../data/reelBlueprint";

export interface MixSettings {
  voiceGain: number;
  sfxGain: number;
  droneGain: number;
  birdEnabled: boolean;
  birdGain: number;
}

export type AudioCueType = "heartbeat" | "bird" | "horn";

interface ScheduledHandles {
  stop: () => void;
}

function createNoiseBuffer(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0,
    b5 = 0,
    b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
    b6 = white * 0.115926;
  }
  return buffer;
}

function createBrassWaveShaper(ctx: BaseAudioContext, amount = 18): WaveShaperNode {
  const shaper = ctx.createWaveShaper();
  const n = 2048;
  const curve = new Float32Array(n);
  const deg = Math.PI / 180;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }
  shaper.curve = curve;
  shaper.oversample = "2x";
  return shaper;
}

function createImpulseBuffer(ctx: BaseAudioContext, duration = 2.6, decay = 2.8): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * duration);
  const impulse = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const channelData = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const env = Math.pow(1 - i / length, decay);
      channelData[i] = (Math.random() * 2 - 1) * env;
    }
  }
  return impulse;
}

/**
 * Schedules the entire cinematic soundscape & voiceover onto any AudioContext
 * (live AudioContext or OfflineAudioContext for WAV export).
 */
export function scheduleReelAudio(
  ctx: BaseAudioContext,
  destination: AudioNode,
  beats: ReelBeat[],
  voiceBuffers: Record<string, AudioBuffer>,
  mix: MixSettings,
  offsetSec = 0,
  playbackStartCtxTime = ctx.currentTime
): ScheduledHandles {
  const stopCallbacks: Array<() => void> = [];
  const registerNode = (node: AudioScheduledSourceNode) => {
    stopCallbacks.push(() => {
      try {
        node.stop();
      } catch {
        // ignore if already ended
      }
    });
  };

  const masterLimiter = ctx.createDynamicsCompressor();
  masterLimiter.threshold.setValueAtTime(-3, playbackStartCtxTime);
  masterLimiter.knee.setValueAtTime(12, playbackStartCtxTime);
  masterLimiter.ratio.setValueAtTime(6, playbackStartCtxTime);
  masterLimiter.attack.setValueAtTime(0.003, playbackStartCtxTime);
  masterLimiter.release.setValueAtTime(0.25, playbackStartCtxTime);
  masterLimiter.connect(destination);

  const sfxBus = ctx.createGain();
  sfxBus.gain.setValueAtTime(mix.sfxGain, playbackStartCtxTime);
  sfxBus.connect(masterLimiter);

  const droneBus = ctx.createGain();
  droneBus.gain.setValueAtTime(mix.droneGain, playbackStartCtxTime);
  droneBus.connect(masterLimiter);

  const voiceBus = ctx.createGain();
  voiceBus.gain.setValueAtTime(mix.voiceGain, playbackStartCtxTime);
  voiceBus.connect(masterLimiter);

  const reverb = ctx.createConvolver();
  reverb.buffer = createImpulseBuffer(ctx, 2.8, 2.6);
  const reverbWet = ctx.createGain();
  reverbWet.gain.setValueAtTime(0.32, playbackStartCtxTime);
  reverb.connect(reverbWet);
  reverbWet.connect(masterLimiter);

  const birdBus = ctx.createGain();
  birdBus.gain.setValueAtTime(mix.birdEnabled ? mix.birdGain : 0, playbackStartCtxTime);
  birdBus.connect(masterLimiter);
  const birdReverbSend = ctx.createGain();
  birdReverbSend.gain.setValueAtTime(0.42, playbackStartCtxTime);
  birdBus.connect(birdReverbSend);
  birdReverbSend.connect(reverb);

  const toCtxTime = (reelTimeSec: number) => playbackStartCtxTime + (reelTimeSec - offsetSec);

  // 1. Cold Wind (0.0s - 14.5s)
  if (offsetSec < 14.5) {
    const startAt = Math.max(0, offsetSec);
    const windDur = 14.5 - startAt;
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = createNoiseBuffer(ctx, Math.min(15, windDur + 1));
    windSrc.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.frequency.setValueAtTime(340, toCtxTime(startAt));
    windFilter.frequency.linearRampToValueAtTime(520, toCtxTime(6));
    windFilter.frequency.linearRampToValueAtTime(260, toCtxTime(14.5));
    windFilter.Q.setValueAtTime(1.8, toCtxTime(startAt));

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.0001, toCtxTime(startAt));
    windGain.gain.linearRampToValueAtTime(0.26, toCtxTime(Math.min(14, startAt + 1.2)));
    windGain.gain.linearRampToValueAtTime(0.0001, toCtxTime(14.5));

    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(droneBus);
    windSrc.start(toCtxTime(startAt));
    windSrc.stop(toCtxTime(14.6));
    registerNode(windSrc);
  }

  // 2. Slow Cinematic Heartbeat (0.5s - 14.5s, stops abruptly at Beat 3)
  const heartInterval = 1.06;
  for (let t = 0.55; t < 14.4; t += heartInterval) {
    if (t + 0.45 < offsetSec) continue;
    const lubTime = toCtxTime(t);
    const dubTime = toCtxTime(t + 0.24);

    // Lub
    if (t >= offsetSec) {
      const osc1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(64, lubTime);
      osc1.frequency.exponentialRampToValueAtTime(31, lubTime + 0.18);
      g1.gain.setValueAtTime(0.001, lubTime);
      g1.gain.linearRampToValueAtTime(0.55, lubTime + 0.015);
      g1.gain.exponentialRampToValueAtTime(0.001, lubTime + 0.22);
      osc1.connect(g1);
      g1.connect(sfxBus);
      osc1.start(lubTime);
      osc1.stop(lubTime + 0.25);
      registerNode(osc1);
    }

    // Dub
    if (t + 0.24 >= offsetSec) {
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(52, dubTime);
      osc2.frequency.exponentialRampToValueAtTime(26, dubTime + 0.16);
      g2.gain.setValueAtTime(0.001, dubTime);
      g2.gain.linearRampToValueAtTime(0.38, dubTime + 0.014);
      g2.gain.exponentialRampToValueAtTime(0.001, dubTime + 0.2);
      osc2.connect(g2);
      g2.connect(sfxBus);
      osc2.start(dubTime);
      osc2.stop(dubTime + 0.22);
      registerNode(osc2);
    }
  }

  // 3. Unsettling Sub-Bass Eternity Drone (7.8s - 17.5s, drops low at 15s, dead silence by 22s)
  if (offsetSec < 17.5) {
    const startDrone = Math.max(7.8, offsetSec);
    const tStart = toCtxTime(startDrone);
    const dOscA = ctx.createOscillator();
    const dOscB = ctx.createOscillator();
    dOscA.type = "sawtooth";
    dOscB.type = "triangle";
    dOscA.frequency.setValueAtTime(41.2, tStart); // E1
    dOscB.frequency.setValueAtTime(61.74, tStart); // B1

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(95, tStart);
    if (startDrone < 14.8) {
      lp.frequency.linearRampToValueAtTime(220, toCtxTime(14.8));
    }
    lp.frequency.linearRampToValueAtTime(65, toCtxTime(17.5));

    const dg = ctx.createGain();
    dg.gain.setValueAtTime(0.0001, tStart);
    if (startDrone < 14.8) {
      dg.gain.linearRampToValueAtTime(0.28, toCtxTime(Math.min(14.8, startDrone + 2.2)));
    } else {
      dg.gain.setValueAtTime(0.14, tStart);
    }
    dg.gain.exponentialRampToValueAtTime(0.0001, toCtxTime(17.5));

    dOscA.connect(lp);
    dOscB.connect(lp);
    lp.connect(dg);
    dg.connect(droneBus);
    dOscA.start(tStart);
    dOscB.start(tStart);
    dOscA.stop(toCtxTime(17.6));
    dOscB.stop(toCtxTime(17.6));
    registerNode(dOscA);
    registerNode(dOscB);
  }

  // 4. BEAT 5: Dead Silence (31.0 - 35.0) with ONE LONE DISTANT BIRD CHIRP!
  // Primary 2-syllable songbird call at 32.15s, faint distant echo at 33.45s
  const scheduleBirdCall = (reelTime: number, level: number) => {
    if (reelTime + 0.8 < offsetSec) return;
    const t0 = toCtxTime(reelTime);
    const notes = [
      { dt: 0, dur: 0.14, fStart: 2450, fPeak: 3650, fEnd: 2900 },
      { dt: 0.19, dur: 0.11, fStart: 2700, fPeak: 3900, fEnd: 3250 },
      { dt: 0.34, dur: 0.22, fStart: 3100, fPeak: 4250, fEnd: 2600 },
    ];
    for (const n of notes) {
      if (reelTime + n.dt < offsetSec) continue;
      const nt = t0 + n.dt;
      const osc = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      const env = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(n.fStart, nt);
      osc.frequency.exponentialRampToValueAtTime(n.fPeak, nt + n.dur * 0.45);
      osc.frequency.exponentialRampToValueAtTime(n.fEnd, nt + n.dur);

      // Natural avian warble
      mod.type = "sine";
      mod.frequency.setValueAtTime(34, nt);
      modGain.gain.setValueAtTime(85, nt);
      mod.connect(modGain);
      modGain.connect(osc.frequency);

      env.gain.setValueAtTime(0.0001, nt);
      env.gain.linearRampToValueAtTime(level, nt + 0.02);
      env.gain.exponentialRampToValueAtTime(0.0001, nt + n.dur);

      osc.connect(env);
      env.connect(birdBus);

      osc.start(nt);
      mod.start(nt);
      osc.stop(nt + n.dur + 0.03);
      mod.stop(nt + n.dur + 0.03);
      registerNode(osc);
      registerNode(mod);
    }
  };

  if (mix.birdEnabled && mix.birdGain > 0) {
    scheduleBirdCall(32.15, 0.36);
    scheduleBirdCall(33.55, 0.18);
  }

  // 5. BEAT 6: Massive Eastern Sky Shofar + Cinematic War Horn Crescendo (35.0s - 44.5s)
  // Plus reverent ringing tail through 51.8s
  if (offsetSec < 51.8) {
    const hornStart = Math.max(35.0, offsetSec);
    const tHorn = toCtxTime(hornStart);

    // Layer A: Shofar Brass Harmonics (rising from G3 196Hz -> D4 293.66Hz)
    const shofar1 = ctx.createOscillator();
    const shofar2 = ctx.createOscillator();
    const shofarSub = ctx.createOscillator();
    const warHornLow = ctx.createOscillator();
    const warHornFifth = ctx.createOscillator();

    shofar1.type = "sawtooth";
    shofar2.type = "sawtooth";
    shofarSub.type = "triangle";
    warHornLow.type = "sawtooth";
    warHornFifth.type = "sawtooth";

    const setHornPitch = (osc: OscillatorNode, fLow: number, fHigh: number) => {
      if (hornStart <= 37.8) {
        osc.frequency.setValueAtTime(fLow, tHorn);
        osc.frequency.exponentialRampToValueAtTime(fHigh, toCtxTime(38.4));
      } else {
        osc.frequency.setValueAtTime(fHigh, tHorn);
      }
    };

    setHornPitch(shofar1, 196.0, 293.66);
    setHornPitch(shofar2, 197.4, 295.4);
    setHornPitch(shofarSub, 98.0, 146.83);
    warHornLow.frequency.setValueAtTime(49.0, tHorn); // G1 seismic sub
    warHornFifth.frequency.setValueAtTime(73.42, tHorn); // D2 power fifth

    // Subtle organic lip vibrato on the shofar
    const lipLfo = ctx.createOscillator();
    const lipGain = ctx.createGain();
    lipLfo.frequency.setValueAtTime(5.4, tHorn);
    lipGain.gain.setValueAtTime(3.2, tHorn);
    lipLfo.connect(lipGain);
    lipGain.connect(shofar1.frequency);

    const shaper = createBrassWaveShaper(ctx, 14);
    const hornFilter = ctx.createBiquadFilter();
    hornFilter.type = "lowpass";
    if (hornStart < 43.8) {
      hornFilter.frequency.setValueAtTime(hornStart < 36 ? 380 : 950, tHorn);
      hornFilter.frequency.exponentialRampToValueAtTime(2900, toCtxTime(43.6));
      hornFilter.frequency.exponentialRampToValueAtTime(420, toCtxTime(46.5));
    } else {
      hornFilter.frequency.setValueAtTime(460, tHorn);
      hornFilter.frequency.exponentialRampToValueAtTime(220, toCtxTime(51.8));
    }
    hornFilter.Q.setValueAtTime(2.2, tHorn);

    const hornGain = ctx.createGain();
    hornGain.gain.setValueAtTime(0.0001, tHorn);
    if (hornStart < 43.8) {
      hornGain.gain.linearRampToValueAtTime(0.18, toCtxTime(Math.min(36.4, hornStart + 0.9)));
      hornGain.gain.exponentialRampToValueAtTime(0.85, toCtxTime(43.6));
      hornGain.gain.exponentialRampToValueAtTime(0.09, toCtxTime(45.6));
      hornGain.gain.exponentialRampToValueAtTime(0.0001, toCtxTime(51.8));
    } else {
      hornGain.gain.linearRampToValueAtTime(0.08, tHorn + 0.15);
      hornGain.gain.exponentialRampToValueAtTime(0.0001, toCtxTime(51.8));
    }

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.0001, tHorn);
    if (hornStart < 43.8) {
      subGain.gain.linearRampToValueAtTime(0.2, toCtxTime(Math.min(37, hornStart + 1.0)));
      subGain.gain.exponentialRampToValueAtTime(0.7, toCtxTime(43.5));
      subGain.gain.exponentialRampToValueAtTime(0.0001, toCtxTime(46.0));
    }

    shofar1.connect(shaper);
    shofar2.connect(shaper);
    shofarSub.connect(shaper);
    shaper.connect(hornFilter);

    warHornLow.connect(subGain);
    warHornFifth.connect(subGain);
    subGain.connect(hornFilter);

    hornFilter.connect(hornGain);
    hornGain.connect(sfxBus);
    hornGain.connect(reverb);

    [shofar1, shofar2, shofarSub, warHornLow, warHornFifth, lipLfo].forEach((osc) => {
      osc.start(tHorn);
      osc.stop(toCtxTime(51.9));
      registerNode(osc);
    });
  }

  // 6. Voiceover Tracks (Gemini TTS or User Recorded Buffers)
  for (const beat of beats) {
    const buffer = voiceBuffers[beat.id];
    if (!buffer) continue;
    const voiceStart = beat.startSec + 0.25;
    const voiceEnd = voiceStart + buffer.duration;
    if (voiceEnd <= offsetSec) continue;

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const beatMaxDuration = Math.max(0.5, beat.endSec - voiceStart - 0.08);
    // Slightly speed up only if clip significantly exceeds beat length, never over-distort
    const ratio = buffer.duration / beatMaxDuration;
    if (ratio > 1.04 && ratio < 1.35) {
      src.playbackRate.setValueAtTime(ratio, playbackStartCtxTime);
    }

    src.connect(voiceBus);
    src.connect(reverb);

    if (offsetSec > voiceStart) {
      const skipInBuffer = offsetSec - voiceStart;
      src.start(playbackStartCtxTime, skipInBuffer);
    } else {
      src.start(toCtxTime(voiceStart));
    }
    registerNode(src);
  }

  return {
    stop: () => {
      stopCallbacks.forEach((fn) => fn());
    },
  };
}

export class ReelAudioController {
  private ctx: AudioContext | null = null;
  private activeHandles: ScheduledHandles | null = null;
  private exportDest: MediaStreamAudioDestinationNode | null = null;

  public ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public async decodeAudioBase64(base64: string): Promise<AudioBuffer> {
    const ctx = this.ensureContext();
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return ctx.decodeAudioData(bytes.buffer.slice(0));
  }

  public async decodeBlob(blob: Blob): Promise<AudioBuffer> {
    const ctx = this.ensureContext();
    const arr = await blob.arrayBuffer();
    return ctx.decodeAudioData(arr);
  }

  public startPlayback(
    beats: ReelBeat[],
    voiceBuffers: Record<string, AudioBuffer>,
    mix: MixSettings,
    offsetSec: number,
    routeToExportStream = false
  ): MediaStream | null {
    this.stop();
    const ctx = this.ensureContext();
    let dest: AudioNode = ctx.destination;

    if (routeToExportStream) {
      this.exportDest = ctx.createMediaStreamDestination();
      // Route both to export stream and optionally monitor quietly or stay silent during export
      const monitorGain = ctx.createGain();
      monitorGain.gain.setValueAtTime(0.35, ctx.currentTime);
      monitorGain.connect(ctx.destination);

      const splitterGain = ctx.createGain();
      splitterGain.gain.setValueAtTime(1.0, ctx.currentTime);
      splitterGain.connect(this.exportDest);
      splitterGain.connect(monitorGain);
      dest = splitterGain;
    }

    this.activeHandles = scheduleReelAudio(ctx, dest, beats, voiceBuffers, mix, offsetSec, ctx.currentTime);
    return routeToExportStream && this.exportDest ? this.exportDest.stream : null;
  }

  public stop(): void {
    if (this.activeHandles) {
      this.activeHandles.stop();
      this.activeHandles = null;
    }
  }

  public auditionCue(cue: AudioCueType, mix?: MixSettings): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.85, now);
    master.connect(ctx.destination);

    if (cue === "heartbeat") {
      [0, 0.24].forEach((dt, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(idx === 0 ? 64 : 52, now + dt);
        osc.frequency.exponentialRampToValueAtTime(28, now + dt + 0.18);
        g.gain.setValueAtTime(0.001, now + dt);
        g.gain.linearRampToValueAtTime(idx === 0 ? 0.65 : 0.42, now + dt + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, now + dt + 0.22);
        osc.connect(g);
        g.connect(master);
        osc.start(now + dt);
        osc.stop(now + dt + 0.24);
      });
    } else if (cue === "bird") {
      if (mix && !mix.birdEnabled) return;
      const birdScale = mix ? Math.max(0.05, Math.min(2.0, mix.birdGain)) : 1.0;
      const notes = [
        { dt: 0, dur: 0.14, fStart: 2450, fPeak: 3650, fEnd: 2900 },
        { dt: 0.19, dur: 0.11, fStart: 2700, fPeak: 3900, fEnd: 3250 },
        { dt: 0.34, dur: 0.22, fStart: 3100, fPeak: 4250, fEnd: 2600 },
      ];
      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const mod = ctx.createOscillator();
        const modGain = ctx.createGain();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(n.fStart, now + n.dt);
        osc.frequency.exponentialRampToValueAtTime(n.fPeak, now + n.dt + n.dur * 0.45);
        osc.frequency.exponentialRampToValueAtTime(n.fEnd, now + n.dt + n.dur);
        mod.type = "sine";
        mod.frequency.setValueAtTime(34, now + n.dt);
        modGain.gain.setValueAtTime(85, now + n.dt);
        mod.connect(modGain);
        modGain.connect(osc.frequency);
        g.gain.setValueAtTime(0.001, now + n.dt);
        g.gain.linearRampToValueAtTime(Math.min(0.9, 0.36 * birdScale), now + n.dt + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, now + n.dt + n.dur);
        osc.connect(g);
        g.connect(master);
        osc.start(now + n.dt);
        mod.start(now + n.dt);
        osc.stop(now + n.dt + n.dur + 0.02);
        mod.stop(now + n.dt + n.dur + 0.02);
      });
    } else if (cue === "horn") {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const lp = ctx.createBiquadFilter();
      const g = ctx.createGain();

      osc1.type = "sawtooth";
      osc2.type = "sawtooth";
      sub.type = "sawtooth";
      osc1.frequency.setValueAtTime(196, now);
      osc1.frequency.exponentialRampToValueAtTime(293.66, now + 1.4);
      osc2.frequency.setValueAtTime(197.5, now);
      osc2.frequency.exponentialRampToValueAtTime(295.4, now + 1.4);
      sub.frequency.setValueAtTime(49, now);

      lp.type = "lowpass";
      lp.frequency.setValueAtTime(420, now);
      lp.frequency.exponentialRampToValueAtTime(2400, now + 2.4);

      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.25, now + 0.4);
      g.gain.exponentialRampToValueAtTime(0.75, now + 2.3);
      g.gain.exponentialRampToValueAtTime(0.001, now + 3.2);

      const shaper = createBrassWaveShaper(ctx, 14);
      osc1.connect(shaper);
      osc2.connect(shaper);
      sub.connect(lp);
      shaper.connect(lp);
      lp.connect(g);
      g.connect(master);

      [osc1, osc2, sub].forEach((o) => {
        o.start(now);
        o.stop(now + 3.3);
      });
    }
  }
}

function encodeWavFromAudioBuffer(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length * numChannels * 2;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + length, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, length, true);

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) channels.push(buffer.getChannelData(ch));

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

export async function renderAudioMasterWav(
  beats: ReelBeat[],
  voiceBuffers: Record<string, AudioBuffer>,
  mix: MixSettings
): Promise<Blob> {
  const sampleRate = 44100;
  const offline = new OfflineAudioContext(2, sampleRate * TOTAL_REEL_DURATION, sampleRate);
  scheduleReelAudio(offline, offline.destination, beats, voiceBuffers, mix, 0, 0);
  const rendered = await offline.startRendering();
  return encodeWavFromAudioBuffer(rendered);
}
