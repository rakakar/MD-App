/**
 * Reading answers aloud — one player for the whole Assistant.
 *
 * **Why one element, unlocked on the tap.** iOS Safari and the app WebViews
 * refuse to start audio that no tap started. A spoken answer arrives seconds
 * after the reader pressed send, so by then the tap is long gone. The fix is
 * the usual one: on the send tap itself, `unlockAnswerAudio()` plays a few
 * milliseconds of silence through the element and primes the speech engine;
 * the answer later plays through that same, now-trusted element.
 *
 * Two sources, one state: a cloud clip (`audio_url`) or the device's own
 * voice (`DeviceSpeaker`, the chapter player's fallback, reused). Only one
 * answer speaks at a time; starting another stops the first.
 */

import { useSyncExternalStore } from "react";
import { DeviceSpeaker, hindiVoice, speechAvailable } from "@/components/player/deviceSpeech";
import type { AnswerSpeech } from "@/lib/types";

export type AnswerVoiceStatus = "idle" | "loading" | "playing" | "paused";

export interface AnswerVoiceState {
  /** the turn whose answer this is about; null when nothing is going on */
  turnId: string | null;
  status: AnswerVoiceStatus;
  source: "cloud" | "device" | null;
  /** what the reader is hearing, e.g. "शुभ" or "डिवाइस की आवाज़" */
  label: string;
}

const IDLE: AnswerVoiceState = { turnId: null, status: "idle", source: null, label: "" };
export const DEVICE_VOICE_LABEL = "डिवाइस की आवाज़";

let state: AnswerVoiceState = IDLE;
const listeners = new Set<() => void>();
let audio: HTMLAudioElement | null = null;
let speaker: DeviceSpeaker | null = null;
let onFinished: (() => void) | null = null;

function set(next: Partial<AnswerVoiceState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

/** 50 ms of silence as a WAV data URI — enough to unlock the element. */
function silence(): string {
  const samples = 800; // 50 ms at 16 kHz, 16-bit mono
  const buf = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples * 2, true);
  str(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, 16000, true);
  v.setUint32(28, 32000, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples * 2, true);
  let bin = "";
  new Uint8Array(buf).forEach((b) => (bin += String.fromCharCode(b)));
  return `data:audio/wav;base64,${btoa(bin)}`;
}

function element(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = "auto";
    // Only a clip's end counts — the unlocking silence ends too.
    audio.addEventListener("ended", () => {
      if (state.source === "cloud") finish();
    });
    audio.addEventListener("error", () => {
      if (state.source === "cloud" && state.status !== "idle") finish();
    });
  }
  return audio;
}

/** Call inside the tap that sends a spoken question. */
export function unlockAnswerAudio(): void {
  if (typeof window === "undefined") return;
  const el = element();
  el.src = silence();
  void el.play().catch(() => {});
  // iOS also wants the speech engine's first utterance to come from a tap.
  if (speechAvailable()) window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
}

function finish() {
  const done = onFinished;
  onFinished = null;
  set(IDLE);
  done?.();
}

/** Mark a turn as waiting for its voice (the clip is being made). */
export function markLoading(turnId: string): void {
  stopAnswer();
  set({ turnId, status: "loading", source: null, label: "" });
}

/** Whether this device can read `text` aloud itself. */
export function deviceCanSpeak(text: string): boolean {
  if (!speechAvailable()) return false;
  return /[ऀ-ॿ]/.test(text) ? hindiVoice() !== null : true;
}

/**
 * Play one answer. `onEnd` runs when it finishes by itself — not when the
 * reader stops it — which is what hands-free listening waits for.
 * Returns false when there is nothing this device can play.
 */
export function playAnswer(turnId: string, speech: AnswerSpeech, onEnd?: () => void): boolean {
  stopAnswer();
  if (speech.mode === "cloud") {
    const el = element();
    el.src = speech.audio_url;
    onFinished = onEnd ?? null;
    set({ turnId, status: "playing", source: "cloud", label: speech.voice_label });
    void el.play().catch(() => {
      // Autoplay refused after all: leave it one tap away rather than failing.
      onFinished = null;
      set({ status: "paused" });
    });
    return true;
  }
  if (!speech.text || !deviceCanSpeak(speech.text)) {
    set(IDLE);
    return false;
  }
  speaker = new DeviceSpeaker({ onPara: () => {}, onEnd: finish, onError: finish });
  onFinished = onEnd ?? null;
  set({ turnId, status: "playing", source: "device", label: DEVICE_VOICE_LABEL });
  speaker.start([{ sequence: 0, text: speech.text }]);
  return true;
}

export function pauseAnswer(): void {
  if (state.status !== "playing") return;
  if (state.source === "cloud") audio?.pause();
  else speaker?.pause();
  set({ status: "paused" });
}

export function resumeAnswer(): void {
  if (state.status !== "paused") return;
  if (state.source === "cloud") void audio?.play().catch(() => {});
  else speaker?.resume();
  set({ status: "playing" });
}

/** Stop whatever is speaking. Does not run the `onEnd` of what was stopped. */
export function stopAnswer(): void {
  onFinished = null;
  if (audio) {
    audio.pause();
    audio.removeAttribute("src");
  }
  speaker?.stop();
  speaker = null;
  if (state.status !== "idle") set(IDLE);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** The player's state, as seen by one turn: idle unless it is about this turn. */
export function useAnswerVoice(turnId: string): AnswerVoiceState {
  const s = useSyncExternalStore(subscribe, () => state, () => IDLE);
  return s.turnId === turnId ? s : IDLE;
}
