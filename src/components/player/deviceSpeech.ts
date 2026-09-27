/**
 * Device-voice read-aloud — the fallback for chapters the BE has not
 * generated audio for yet.
 *
 * This is deliberately a *second-class* mode, not a substitute for the
 * generated renditions: the voice is whatever the OS ships, there is no
 * timeline to scrub (the Web Speech API exposes no position), and playback
 * stops when the screen locks. The reader labels it as such.
 *
 * We only offer it when the device actually has a Hindi voice — an English
 * engine reading Devanagari produces nonsense, which is worse than no button.
 */

import type { Paragraph } from "@/lib/types";

/** Mirrors the BE's `_is_spoken`: tables are never read, empties are skipped. */
export function spokenParas(paragraphs: Paragraph[]): SpokenPara[] {
  return paragraphs
    .filter((p) => p.block_type !== "table" && p.text_hi.trim().length > 0)
    .map((p) => ({ sequence: p.sequence, text: p.text_hi.trim() }));
}

export interface SpokenPara {
  sequence: number;
  text: string;
}

/** Long utterances get truncated or dropped by several engines; keep pieces
 *  short and split on sentence boundaries so the pauses land naturally. */
const MAX_CHUNK = 180;

export function chunkText(text: string): string[] {
  const sentences = text.split(/(?<=[।?!.])\s+/);
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (!current) {
      current = sentence;
    } else if (current.length + sentence.length + 1 <= MAX_CHUNK) {
      current += ` ${sentence}`;
    } else {
      chunks.push(current);
      current = sentence;
    }
  }
  if (current) chunks.push(current);
  // A single sentence can still exceed the limit — split it on the last space
  // that fits, falling back to a hard cut when there is no space at all.
  return chunks.flatMap(splitLong);
}

function splitLong(text: string): string[] {
  if (text.length <= MAX_CHUNK) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > MAX_CHUNK) {
    const window = rest.slice(0, MAX_CHUNK + 1);
    const space = window.lastIndexOf(" ");
    const cut = space > 0 ? space : MAX_CHUNK;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts.filter(Boolean);
}

export function speechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** The best Hindi voice on this device, or null if it has none. */
export function hindiVoice(): SpeechSynthesisVoice | null {
  if (!speechAvailable()) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "hi-IN" && v.localService) ??
    voices.find((v) => v.lang === "hi-IN") ??
    voices.find((v) => v.lang.startsWith("hi")) ??
    null
  );
}

/**
 * Subscribe to voice-list availability. Chrome populates `getVoices()`
 * asynchronously, so a synchronous check on first render says "no Hindi
 * voice" on a device that has one.
 */
export function onVoicesChanged(cb: () => void): () => void {
  if (!speechAvailable()) return () => {};
  const synth = window.speechSynthesis;
  synth.addEventListener("voiceschanged", cb);
  return () => synth.removeEventListener("voiceschanged", cb);
}

interface SpeakerCallbacks {
  /** a paragraph started — drives the read-along highlight */
  onPara: (sequence: number, index: number) => void;
  onEnd: () => void;
  onError: () => void;
}

/**
 * Speaks a chapter paragraph by paragraph. One utterance per chunk, queued
 * one at a time so a stop is immediate and the current paragraph is always
 * known (the API's own queue reports nothing useful).
 */
export class DeviceSpeaker {
  private paras: SpokenPara[] = [];
  private index = 0;
  private chunks: string[] = [];
  /** where each chunk starts in its paragraph's text */
  private chunkStarts: number[] = [];
  private chunkIndex = 0;
  /**
   * **How fast this voice reads**, in characters a second at rate 1 — what an
   * estimated ten-second skip is measured in, since speech has no timeline.
   * Starts at a guess for a Hindi voice and is corrected from every chunk the
   * device actually finishes, so after a sentence or two it is this phone's
   * voice rather than an average one.
   */
  private cps = 14;
  private chunkStartedAt: number | null = null;
  private pausedAt: number | null = null;
  private pausedMs = 0;
  private stopped = true;
  private keepAlive: ReturnType<typeof setInterval> | null = null;
  rate = 1;

  constructor(private cb: SpeakerCallbacks) {}

  get paraIndex(): number {
    return this.index;
  }

  get paraCount(): number {
    return this.paras.length;
  }

  get currentSequence(): number | null {
    return this.paras[this.index]?.sequence ?? null;
  }

  start(paras: SpokenPara[], fromSequence?: number, rate = 1) {
    this.stop();
    this.paras = paras;
    this.rate = rate;
    const from = fromSequence !== undefined
      ? paras.findIndex((p) => p.sequence === fromSequence)
      : 0;
    this.index = from === -1 ? 0 : from;
    this.stopped = false;
    this.speakCurrentPara();
    this.startKeepAlive();
  }

  /** Re-speak the current paragraph — used when the rate changes, since the
   *  API cannot retune an utterance already queued. */
  restartCurrentPara(rate: number) {
    if (this.stopped || !this.paras.length) return;
    this.rate = rate;
    window.speechSynthesis.cancel();
    this.speakCurrentPara();
  }

  /**
   * **Skip about `seconds` of speech**, back or forward — the same ±10s the
   * recorded player has, estimated (the designer's call, 26 Sep 2026). There
   * is no position to move by seconds, so the skip is measured in text: where
   * the voice is now (the chunk it is speaking, plus how far into it by the
   * clock, less time paused), plus or minus `seconds` at the measured reading
   * speed. It crosses paragraph boundaries either way and resumes at the start
   * of a word. Past the end of the chapter it stops at the last word rather
   * than finishing the chapter, as the recorded player clamps.
   *
   * Returns the paragraph landed on, or null if there was nowhere to go.
   */
  skipSeconds(seconds: number): number | null {
    if (this.stopped || !this.paras.length) return null;
    let index = this.index;
    let offset = this.position() + seconds * this.cps * this.rate;

    while (offset < 0 && index > 0) {
      index -= 1;
      offset += this.paras[index].text.length;
    }
    while (index < this.paras.length - 1 && offset >= this.paras[index].text.length) {
      offset -= this.paras[index].text.length;
      index += 1;
    }
    const text = this.paras[index].text;
    offset = Math.max(0, Math.min(offset, text.length));
    offset = seconds < 0 ? wordStartAtOrBefore(text, offset) : wordStartAtOrAfter(text, offset);
    // Forward off the end of the last paragraph: back to its last word.
    if (offset >= text.length) offset = wordStartAtOrBefore(text, text.length - 1);

    this.index = index;
    const synth = window.speechSynthesis;
    synth.cancel();
    // cancel() while paused leaves the engine paused, and the next speak()
    // would queue silently behind it.
    if (synth.paused) synth.resume();
    this.pausedAt = null;
    this.speakCurrentPara(offset);
    return this.paras[this.index]?.sequence ?? null;
  }

  /** Characters into the current paragraph the voice has reached, estimated. */
  private position(): number {
    const start = this.chunkStarts[this.chunkIndex] ?? 0;
    const chunk = this.chunks[this.chunkIndex] ?? "";
    if (this.chunkStartedAt === null) return start;
    const now = this.pausedAt ?? performance.now();
    const seconds = Math.max(0, now - this.chunkStartedAt - this.pausedMs) / 1000;
    return start + Math.min(chunk.length, seconds * this.cps * this.rate);
  }

  pause() {
    if (!speechAvailable()) return;
    if (this.pausedAt === null) this.pausedAt = performance.now();
    window.speechSynthesis.pause();
  }

  resume() {
    if (!speechAvailable()) return;
    if (this.pausedAt !== null) {
      this.pausedMs += performance.now() - this.pausedAt;
      this.pausedAt = null;
    }
    window.speechSynthesis.resume();
  }

  stop() {
    this.stopped = true;
    this.stopKeepAlive();
    if (speechAvailable()) window.speechSynthesis.cancel();
  }

  /** Speak the current paragraph from `from` characters in (a word start). */
  private speakCurrentPara(from = 0) {
    const para = this.paras[this.index];
    if (!para) {
      this.stop();
      this.cb.onEnd();
      return;
    }
    const rest = para.text.slice(from);
    this.chunks = chunkText(rest);
    // Where each chunk sits in the paragraph, found rather than summed:
    // chunking drops the whitespace it splits on.
    let cursor = 0;
    this.chunkStarts = this.chunks.map((c) => {
      const at = rest.indexOf(c, cursor);
      const pos = at === -1 ? cursor : at;
      cursor = pos + c.length;
      return from + pos;
    });
    this.chunkIndex = 0;
    this.cb.onPara(para.sequence, this.index);
    this.speakChunk();
  }

  private speakChunk() {
    if (this.stopped) return;
    const chunk = this.chunks[this.chunkIndex];
    if (chunk === undefined) {
      this.index += 1;
      this.speakCurrentPara();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(chunk);
    const voice = hindiVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? "hi-IN";
    utterance.rate = this.rate;
    utterance.onstart = () => {
      this.chunkStartedAt = performance.now();
      this.pausedMs = 0;
    };
    utterance.onend = () => {
      if (this.stopped) return;
      this.learnSpeed(chunk);
      this.chunkIndex += 1;
      this.speakChunk();
    };
    utterance.onerror = (event) => {
      // A cancel() raises "interrupted"/"canceled" — that is us, not a fault.
      if (this.stopped || event.error === "interrupted" || event.error === "canceled") return;
      this.stop();
      this.cb.onError();
    };
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Fold a finished chunk's pace into the reading speed. Short chunks are
   * skipped (start-up latency dominates them) and so are implausible ones — a
   * chunk cut short by a cancel reports a speed nobody speaks at.
   */
  private learnSpeed(chunk: string) {
    if (this.chunkStartedAt === null || chunk.length < 40) return;
    const seconds = (performance.now() - this.chunkStartedAt - this.pausedMs) / 1000;
    const cps = chunk.length / seconds / this.rate;
    if (seconds > 1 && cps > 4 && cps < 40) this.cps = this.cps * 0.5 + cps * 0.5;
  }

  /** Chrome silently stops long speech after ~15s unless nudged. */
  private startKeepAlive() {
    this.stopKeepAlive();
    this.keepAlive = setInterval(() => {
      if (this.stopped || !speechAvailable()) return;
      const synth = window.speechSynthesis;
      if (synth.speaking && !synth.paused) {
        synth.pause();
        synth.resume();
      }
    }, 10_000);
  }

  private stopKeepAlive() {
    if (this.keepAlive !== null) {
      clearInterval(this.keepAlive);
      this.keepAlive = null;
    }
  }
}

/** The start of the word containing `at`, or of the word before a space. */
function wordStartAtOrBefore(text: string, at: number): number {
  let i = Math.min(at, text.length - 1);
  while (i > 0 && /\s/.test(text[i])) i -= 1;
  while (i > 0 && !/\s/.test(text[i - 1])) i -= 1;
  return Math.max(0, i);
}

/** The start of the next word at or after `at`; `text.length` if none. */
function wordStartAtOrAfter(text: string, at: number): number {
  let i = at;
  if (i > 0 && i < text.length && !/\s/.test(text[i - 1])) {
    while (i < text.length && !/\s/.test(text[i])) i += 1;
  }
  while (i < text.length && /\s/.test(text[i])) i += 1;
  return i;
}
