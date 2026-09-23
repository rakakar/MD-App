// Voice, Stage 1 — ask by voice, hear the answer (contract §9.4).
//
// Three calls, all signed-in. Nothing here costs the reader a question: the
// question itself goes through askChat() with answerStyle "spoken", and the
// daily 30 counts it there like any other.
//
//   getVoiceInfo()   what voice mode can do today (which listener, what is left)
//   speakAnswer(id)  a cloud clip for one of the reader's answers — or, when
//                    the day's voice is used up, the text for the device voice
//   transcribe(blob) speech → text, for devices with no speech recogniser
//                    (the Android app's WebView has none)

import { apiBase } from "./api";
import { authedFetch } from "./me";
import type { AnswerSpeech, VoiceInfo } from "./types";

const url = (path: string) => new URL(path, apiBase()).toString();

export const getVoiceInfo = (): Promise<VoiceInfo> => authedFetch<VoiceInfo>(url("voice/"));

export const speakAnswer = (id: number): Promise<AnswerSpeech> =>
  authedFetch<AnswerSpeech>(url(`chat/${id}/speech/`), { method: "POST" });

/**
 * A recording from MediaRecorder → the text heard. Errors carry `status` and
 * `data.code` (bad_audio, too_long, stt_limit, budget, provider_error) and a
 * reader-facing `data.detail` to show as sent.
 */
export async function transcribe(audio: Blob, lang: "hi" | "en"): Promise<string> {
  const form = new FormData();
  const ext = audio.type.includes("mp4") ? "m4a" : audio.type.includes("ogg") ? "ogg" : "webm";
  form.append("audio", audio, `question.${ext}`);
  form.append("lang", lang);
  const res = await authedFetch<{ text: string }>(url("voice/transcribe/"), {
    method: "POST",
    body: form,
  });
  return res.text;
}
