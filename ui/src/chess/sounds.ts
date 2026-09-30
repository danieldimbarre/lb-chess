import { settings } from '../stores/settings';

/**
 * Board sounds synthesised with WebAudio: short filtered-noise "wood" clicks
 * for moves and soft sine chimes for game events. No sample files required.
 */
export type SoundName = 'move' | 'capture' | 'check' | 'castle' | 'promote' | 'premove' | 'illegal' | 'start' | 'end' | 'lowtime' | 'notify';

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      noise = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function click(ac: AudioContext, at: number, freq: number, gain: number, decay = 0.06) {
  const src = ac.createBufferSource();
  src.buffer = noise;
  const band = ac.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = freq;
  band.Q.value = 1.4;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  src.connect(band).connect(g).connect(ac.destination);
  src.start(at);
  src.stop(at + decay + 0.02);

  // Low body thump gives the click its "wooden board" weight.
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq / 9, at);
  osc.frequency.exponentialRampToValueAtTime(freq / 16, at + 0.05);
  const og = ac.createGain();
  og.gain.setValueAtTime(gain * 0.55, at);
  og.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
  osc.connect(og).connect(ac.destination);
  osc.start(at);
  osc.stop(at + 0.09);
}

function tone(ac: AudioContext, at: number, freq: number, dur: number, gain: number, type: OscillatorType = 'sine') {
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

export function playSound(name: SoundName) {
  if (!settings.sounds) return;
  const ac = audio();
  if (!ac || !noise) return;
  const t = ac.currentTime + 0.005;

  switch (name) {
    case 'move':
      click(ac, t, 1700, 0.55);
      break;
    case 'premove':
      click(ac, t, 2300, 0.3, 0.04);
      break;
    case 'capture':
      click(ac, t, 1200, 0.8, 0.09);
      click(ac, t + 0.028, 2100, 0.45, 0.05);
      break;
    case 'castle':
      click(ac, t, 1600, 0.5);
      click(ac, t + 0.1, 1800, 0.5);
      break;
    case 'check':
      click(ac, t, 1700, 0.55);
      tone(ac, t + 0.02, 1046, 0.18, 0.12, 'triangle');
      break;
    case 'promote':
      click(ac, t, 1700, 0.5);
      tone(ac, t + 0.03, 784, 0.12, 0.1);
      tone(ac, t + 0.11, 1175, 0.2, 0.1);
      break;
    case 'illegal':
      tone(ac, t, 180, 0.12, 0.12, 'square');
      break;
    case 'start':
      tone(ac, t, 659, 0.22, 0.12);
      tone(ac, t + 0.12, 988, 0.35, 0.12);
      break;
    case 'end':
      tone(ac, t, 988, 0.22, 0.12);
      tone(ac, t + 0.13, 740, 0.22, 0.12);
      tone(ac, t + 0.26, 494, 0.45, 0.12);
      break;
    case 'lowtime':
      tone(ac, t, 1320, 0.06, 0.1, 'square');
      break;
    case 'notify':
      tone(ac, t, 880, 0.14, 0.12);
      tone(ac, t + 0.1, 1318, 0.25, 0.12);
      break;
  }
}

/** Picks the right sound for a played move (SAN + flags). */
export function moveSound(san: string, captured: boolean): SoundName {
  if (san.includes('+') || san.includes('#')) return 'check';
  if (san.includes('=')) return 'promote';
  if (san.startsWith('O-O')) return 'castle';
  return captured ? 'capture' : 'move';
}
