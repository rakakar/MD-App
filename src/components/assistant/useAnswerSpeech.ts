"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DeviceSpeaker,
  deviceScripts,
  onVoicesChanged,
  speechAvailable,
  type SpokenPara,
} from "@/components/player/deviceSpeech";
import { usePlayer } from "@/components/player/PlayerProvider";
import type { Block } from "@/lib/assistant/answer";
import { mainScript, type BookScript } from "@/lib/bookLanguage";

/**
 * The stop of whichever answer is speaking. The device has one voice queue,
 * so a second Listen silences the first — and must tell it so, or its button
 * would go on saying Stop over nothing.
 */
let active: { owner: object; stop: () => void } | null = null;

function blockText(b: Block): string {
  // Tables are not read, as in the reader: a grid spoken cell by cell is noise.
  if (b.kind === "rule" || b.kind === "table") return "";
  return b.runs
    .map((r) => (r.kind === "text" ? r.text : ""))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * An answer as the reader's device voice reads a chapter (UX audit IN10, 16
 * Nov 2026): block by block, each in a voice of its own language — a Hindi
 * answer in the Hindi voice, an English table heading in the English one — and
 * a block the device has no voice for left out. A block's index is its
 * `sequence`, so the one being spoken can be marked.
 */
function plan(blocks: Block[], voices: ReadonlySet<BookScript>): { paras: SpokenPara[]; readable: boolean } {
  let fallback: BookScript = "hi";
  const all: SpokenPara[] = [];
  blocks.forEach((b, i) => {
    const text = blockText(b);
    if (!text) return;
    const script = mainScript(text) ?? fallback;
    fallback = script;
    all.push({ sequence: i, text, script });
  });
  const main = mainScript(all.map((p) => p.text).join(" "));
  const paras = all.filter((p) => voices.has(p.script));
  return { paras, readable: main !== null && voices.has(main) && paras.length > 0 };
}

/** Listen to an answer with the device voice; `speaking` is the block being read. */
export function useAnswerSpeech(blocks: Block[]) {
  const player = usePlayer();
  const [voices, setVoices] = useState<ReadonlySet<BookScript>>(() => new Set());
  useEffect(() => {
    // Chrome fills the voice list late; a first look often finds none.
    const read = () => setVoices(new Set(deviceScripts()));
    read();
    return onVoicesChanged(read);
  }, []);
  const { paras, readable } = useMemo(() => plan(blocks, voices), [blocks, voices]);

  const [playing, setPlaying] = useState(false);
  const [speaking, setSpeaking] = useState<number | null>(null);
  const speaker = useRef<DeviceSpeaker | null>(null);
  /** this answer, as `active` knows it */
  const self = useRef({});

  const stop = useCallback(() => {
    speaker.current?.stop();
    speaker.current = null;
    setPlaying(false);
    setSpeaking(null);
    if (active?.owner === self.current) active = null;
  }, []);

  const start = useCallback(() => {
    if (!readable) return;
    // One voice at a time. A chapter read by the device voice shares the
    // queue and would be left paused behind ours, so it is closed; a
    // recording is only paused, and resumes from where it was.
    if (player.source?.kind === "device") player.close();
    else if (player.playing) player.toggle();
    if (active && active.owner !== self.current) active.stop();
    const synth = window.speechSynthesis;
    synth.cancel();
    if (synth.paused) synth.resume();
    const s = new DeviceSpeaker({
      onPara: (sequence) => setSpeaking(sequence),
      onEnd: stop,
      onError: stop,
    });
    speaker.current = s;
    active = { owner: self.current, stop };
    setPlaying(true);
    s.start(paras);
  }, [readable, paras, player, stop]);

  // Chapter audio started meanwhile: it has the voice now. Only on the turn
  // from silent to playing — pausing it above is not instant, and a check on
  // `playing` alone would stop the answer the moment it began.
  const wasPlaying = useRef(player.playing);
  useEffect(() => {
    if (player.playing && !wasPlaying.current && speaker.current) stop();
    wasPlaying.current = player.playing;
  }, [player.playing, stop]);

  useEffect(() => stop, [stop]);

  return {
    available: speechAvailable() && readable,
    playing,
    speaking,
    toggle: playing ? stop : start,
  };
}
