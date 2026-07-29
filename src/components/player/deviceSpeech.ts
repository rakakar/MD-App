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
  private chunkIndex = 0;
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
   * Step whole paragraphs — this mode's answer to a ±10s skip. There is no
   * position to move by seconds, and a paragraph is the unit the reader can
   * actually see move: the read-along highlight jumps with it.
   *
   * Returns the paragraph landed on, or null if there was nowhere to go.
   */
  jumpParas(delta: number): number | null {
    if (this.stopped || !this.paras.length) return null;
    const next = Math.min(Math.max(this.index + delta, 0), this.paras.length - 1);
    if (next === this.index && delta !== 0) return null;
    this.index = next;
    const synth = window.speechSynthesis;
    synth.cancel();
    // cancel() while paused leaves the engine paused, and the next speak()
    // would queue silently behind it.
    if (synth.paused) synth.resume();
    this.speakCurrentPara();
    return this.paras[this.index]?.sequence ?? null;
  }

  pause() {
    if (!speechAvailable()) return;
    window.speechSynthesis.pause();
  }

  resume() {
    if (!speechAvailable()) return;
    window.speechSynthesis.resume();
  }

  stop() {
    this.stopped = true;
    this.stopKeepAlive();
    if (speechAvailable()) window.speechSynthesis.cancel();
  }

  private speakCurrentPara() {
    const para = this.paras[this.index];
    if (!para) {
      this.stop();
      this.cb.onEnd();
      return;
    }
    this.chunks = chunkText(para.text);
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
    utterance.onend = () => {
      if (this.stopped) return;
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
