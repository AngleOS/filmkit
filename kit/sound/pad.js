// The pad: a film's harmonic bed, a tonal chord pad with no beat grid whose chords step on the picture's act changes,
// from the chords, blooms and pockets of a score (src/build/sound.js). Deterministic and dependency-free: the same
// score gives a byte-identical 44.1 kHz stereo 16-bit WAV, peak-normalised to −1 dBFS.
//
// Each chord is a few soft, detuned, low-passed voices (additive saws rolled off above the cutoff) with slow attacks,
// crossfading into the next; a sine sub on the chord's "sub" root (plus its 2nd harmonic, so phones hear it) blooms
// where the score says. Glass plucks on the chord's upper tones skip the pockets, where the picture holds still.

const SR = 44100;
const TAU = Math.PI * 2;
const RELEASE = 0.9;

/**
 * @typedef {{ t: number, end: number, notes: number[], sub?: number | null, level?: number, cutoff?: number,
 *   attack?: number }} Chord  notes and sub are MIDI numbers, level is dB, cutoff Hz and attack seconds
 * @typedef {{ duration: number, chords?: Chord[], blooms?: { t: number, db: number }[],
 *   pockets?: { t: number, end: number }[] }} PadScore
 */

/** @param {number} m */
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
/** @param {number} d */
const db = (d) => 10 ** (d / 20);
/** Constant-power stereo gains for a pan in −1…1. @param {number} pan */
const panGains = (pan) => [Math.cos(((pan + 1) * Math.PI) / 4), Math.sin(((pan + 1) * Math.PI) / 4)];

/**
 * The pad for a score as a WAV file, or null when the score has no chords.
 * @param {PadScore} score
 * @returns {Buffer | null}
 */
export function pad(score) {
  const chords = (score.chords ?? []).map((c) => ({ t0: c.t, t1: c.end, notes: c.notes, sub: c.sub ?? null, level: c.level ?? -8, cutoff: c.cutoff ?? 3000, attack: c.attack ?? 0.6 }));
  if (!chords.length) return null;
  const blooms = score.blooms ?? [];
  const pockets = score.pockets ?? [];
  const random = xorshift(1234567);
  const n = Math.ceil(score.duration * SR);
  const L = new Float32Array(n);
  const R = new Float32Array(n);

  /** @param {number} t @param {typeof chords[number]} chord */
  const envelope = (t, { t0, t1, attack }) => {
    if (t < t0 || t > t1 + RELEASE) return 0;
    const a = Math.min(1, (t - t0) / attack);
    const r = t > t1 ? Math.max(0, 1 - (t - t1) / RELEASE) : 1;
    return a * a * (3 - 2 * a) * r * r;
  };

  for (const chord of chords) {
    const { t0, t1, notes, sub, level, cutoff } = chord;
    const i0 = Math.floor(t0 * SR);
    const i1 = Math.min(n, Math.ceil((t1 + RELEASE) * SR));
    const gain = db(level) / Math.sqrt(notes.length);
    // three detuned voices per note, panned apart
    const voices = notes.flatMap((m, k) => [-1, 0, 1].map((d) => ({
      f: hz(m) * (1 + d * 0.0028), pan: (k / Math.max(1, notes.length - 1) - 0.5) * 0.7 + d * 0.15, phase: random() * TAU,
    })));
    for (const v of voices) {
      // a band-limited saw with a soft roll-off: harmonic h weighted 1/h and by a gentle low-pass at the cutoff
      const harmonics = [];
      for (let h = 1; h * v.f < 8000 && h <= 10; h++) harmonics.push([h, 1 / (h * h ** 0.35) / Math.sqrt(1 + ((h * v.f) / cutoff) ** 4)]);
      const [pl, pr] = panGains(v.pan);
      for (let i = i0; i < i1; i++) {
        const t = i / SR;
        const e = envelope(t, chord);
        if (e === 0) continue;
        const breath = 1 + 0.12 * Math.sin(TAU * 0.11 * t + v.phase); // slow movement, so it never sits dead
        let s = 0;
        for (const [h, w] of harmonics) s += Math.sin(TAU * v.f * h * t + v.phase * h) * w;
        s *= e * gain * breath * 0.33;
        L[i] += s * pl;
        R[i] += s * pr;
      }
    }
    if (sub == null) continue;
    const f = hz(sub);
    for (let i = i0; i < i1; i++) {
      const t = i / SR;
      const e = envelope(t, chord);
      if (e === 0) continue;
      let bloom = 0;
      for (const b of blooms) if (t >= b.t && t < b.t + 2.5) bloom = Math.max(bloom, b.db * Math.exp(-(t - b.t) / 0.9));
      const s = (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * 2 * f * t)) * e * db(level - 14 + bloom) * 0.5;
      L[i] += s;
      R[i] += s;
    }
  }

  // glass: soft, quiet plucks on the current chord's upper tones, about 1.1–1.7 s apart
  for (let t = 1.4, k = 0; t < score.duration - 1.2; k++, t += 1.1 + 0.6 * random()) {
    const chord = chords.find((c) => t >= c.t0 && t < c.t1);
    if (!chord || pockets.some((p) => t >= p.t && t < p.end)) continue;
    const tones = chord.notes.slice(-3);
    const f = hz(tones[k % tones.length] + 12);
    const i0 = Math.floor(t * SR);
    const [pl, pr] = panGains(((k * 37) % 9) / 9 - 0.45);
    for (let i = 0; i < Math.floor(1.6 * SR) && i0 + i < n; i++) {
      const tt = i / SR;
      const env = Math.min(1, tt / 0.004) * Math.exp(-tt / 0.45);
      const s = (Math.sin(TAU * f * tt) + 0.25 * Math.sin(TAU * f * 3.01 * tt) * Math.exp(-tt / 0.12)) * env * db(-20);
      L[i0 + i] += s * pl;
      R[i0 + i] += s * pr;
    }
  }

  // a gentle fade in at the very start, and to silence at the end
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = Math.min(1, t / 1.2) * Math.min(1, Math.max(0, (score.duration - t) / 2.4));
    L[i] *= f;
    R[i] *= f;
  }

  // a one-pole high-pass at about 110 Hz (the sub blooms are thin by then, and survive as their 2nd harmonic)
  const a = Math.exp((-TAU * 110) / SR);
  for (const channel of [L, R]) {
    let x1 = 0;
    let y1 = 0;
    for (let i = 0; i < n; i++) {
      const x = channel[i];
      y1 = a * (y1 + x - x1);
      x1 = x;
      channel[i] = y1;
    }
  }

  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  return wav(L, R, db(-1) / (peak || 1));
}

/**
 * Deterministic noise in 0…1, so a re-render is byte-identical.
 * @param {number} seed
 */
function xorshift(seed) {
  return () => {
    seed ^= seed << 13;
    seed >>>= 0;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    seed >>>= 0;
    return seed / 4294967296;
  };
}

/**
 * A 16-bit stereo PCM WAV of two channels, scaled by `gain`.
 * @param {Float32Array} L
 * @param {Float32Array} R
 * @param {number} gain
 */
function wav(L, R, gain) {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 4, 40);
  /** @param {number} s */
  const pcm = (s) => Math.max(-32768, Math.min(32767, Math.round(s * gain * 32767)));
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(pcm(L[i]), 44 + i * 4);
    buf.writeInt16LE(pcm(R[i]), 46 + i * 4);
  }
  return buf;
}
