"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CloseIcon, PauseIcon, PlayIcon } from "@/components/shell/icons";
import { isReaderRoute } from "@/lib/routes";
import { activeRendition, usePlayer } from "./PlayerProvider";

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];
const SLEEP_OPTIONS = [10, 20, 30, 45, 60];

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const mm = h > 0 ? String(m % 60).padStart(2, "0") : String(m);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Persistent bottom-bar player (PRD §6) — lives in the app shell, survives
 * route and workspace changes. Sits above the mobile bottom nav.
 */
export function PlayerBar() {
  const player = usePlayer();
  if (!player.source) return null;
  return <PlayerBarInner />;
}

function PlayerBarInner() {
  const player = usePlayer();
  const [menuOpen, setMenuOpen] = useState<"rate" | "sleep" | "voice" | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  // no bottom nav to clear inside the reader, and the reader stacks its own
  // controls on top of this bar via --player-h
  const reader = isReaderRoute(usePathname());

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const publish = () =>
      document.documentElement.style.setProperty("--player-h", `${el.offsetHeight}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.setProperty("--player-h", "0px");
    };
  }, []);

  const { source } = player;
  if (!source) return null;

  const rendition = activeRendition(source);
  const device = source.kind === "device";
  const title =
    source.kind === "track" ? source.title : source.chapterTitle;
  const subtitle =
    source.kind === "tts"
      ? `${source.bookTitle}${rendition ? ` · ${rendition.voice_label}` : ""}`
      : source.kind === "device"
        ? `${source.bookTitle} · डिवाइस की आवाज़`
        : (source.subtitle ?? "");
  const paraProgress = device
    ? `${Math.min(player.deviceParaIndex + 1, source.paras.length)} / ${source.paras.length}`
    : null;

  return (
    <div
      ref={barRef}
      role="region"
      aria-label="Audio player"
      className={`fixed inset-x-0 z-40 border-t backdrop-blur ${
        reader
          ? "bottom-[env(safe-area-inset-bottom)] border-(--reader-rule) bg-(--reader-bg)/95 text-(--reader-ink)"
          : "bottom-[calc(3.4rem+env(safe-area-inset-bottom))] border-rule bg-white/95 lg:bottom-0 lg:left-60"
      }`}
    >
      {/* Progress. The device voice exposes no timeline, so it gets a
          paragraph-based bar with no scrubbing rather than a dead seek bar. */}
      {device ? (
        <div
          className="h-1 w-full"
          role="progressbar"
          aria-label="Reading progress"
          aria-valuemin={0}
          aria-valuemax={source.paras.length}
          aria-valuenow={player.deviceParaIndex + 1}
          style={{
            background: `linear-gradient(to right, var(--ws-color) ${
              source.paras.length
                ? ((player.deviceParaIndex + 1) / source.paras.length) * 100
                : 0
            }%, var(--color-rule) 0)`,
          }}
        />
      ) : (
        <input
          type="range"
          aria-label="Seek"
          min={0}
          max={player.durationMs || 1}
          value={Math.min(player.positionMs, player.durationMs || 0)}
          onChange={(e) => player.seekMs(Number(e.target.value))}
          className="block h-1 w-full cursor-pointer appearance-none bg-transparent align-top accent-(--ws-color)"
          style={{
            background: `linear-gradient(to right, var(--ws-color) ${
              player.durationMs ? (player.positionMs / player.durationMs) * 100 : 0
            }%, var(--color-rule) 0)`,
          }}
        />
      )}
      <div className="flex items-center gap-3 px-3 py-2">
        <button
          type="button"
          onClick={player.toggle}
          aria-label={player.playing ? "Pause" : "Play"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
          style={{ background: "var(--ws-color)" }}
        >
          {player.playing ? <PauseIcon className="h-4.5 w-4.5" /> : <PlayIcon className="h-4.5 w-4.5" />}
        </button>

        <div className="min-w-0 flex-1">
          <p className="hi truncate text-sm font-medium leading-tight">{title}</p>
          <p className="truncate text-xs text-ink-soft">
            {subtitle}
            {rendition?.is_stale && (
              <span className="ml-1 text-[10px] text-ink-soft/80" title="Text was edited after this audio was generated">
                · पुराना audio
              </span>
            )}
          </p>
        </div>

        <span className="hidden text-xs tabular-nums text-ink-soft sm:block">
          {device ? `पैरा ${paraProgress}` : `${fmt(player.positionMs)} / ${fmt(player.durationMs)}`}
        </span>

        {/* voice picker (TTS only, multiple renditions) */}
        {source.kind === "tts" && source.renditions.length > 1 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(menuOpen === "voice" ? null : "voice")}
              className="rounded-full border border-rule px-2 py-1 text-xs font-medium"
              aria-haspopup="menu"
              aria-expanded={menuOpen === "voice"}
            >
              Voice
            </button>
            {menuOpen === "voice" && (
              <div role="menu" className="absolute bottom-full right-0 mb-2 w-44 rounded-xl border border-rule bg-white py-1 shadow-lg">
                {source.renditions.map((r) => (
                  <button
                    key={r.voice_key}
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      player.switchVoice(r.voice_key);
                      setMenuOpen(null);
                    }}
                    className={`hi block w-full px-3 py-1.5 text-left text-sm hover:bg-black/5 ${
                      r.voice_key === source.voiceKey ? "font-bold" : ""
                    }`}
                  >
                    {r.voice_label}
                    {r.is_stale && <span className="ml-1 text-[10px] text-ink-soft">·</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* speed */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(menuOpen === "rate" ? null : "rate")}
            className="rounded-full border border-rule px-2 py-1 text-xs font-semibold tabular-nums"
            aria-haspopup="menu"
            aria-expanded={menuOpen === "rate"}
            aria-label={`Playback speed ${player.rate}x`}
          >
            {player.rate}×
          </button>
          {menuOpen === "rate" && (
            <div role="menu" className="absolute bottom-full right-0 mb-2 w-20 rounded-xl border border-rule bg-white py-1 shadow-lg">
              {RATES.map((r) => (
                <button
                  key={r}
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    player.setRate(r);
                    setMenuOpen(null);
                  }}
                  className={`block w-full px-3 py-1.5 text-left text-sm tabular-nums hover:bg-black/5 ${
                    r === player.rate ? "font-bold" : ""
                  }`}
                >
                  {r}×
                </button>
              ))}
            </div>
          )}
        </div>

        {/* sleep timer */}
        <div className="relative hidden sm:block">
          <button
            type="button"
            onClick={() => setMenuOpen(menuOpen === "sleep" ? null : "sleep")}
            className={`rounded-full border border-rule px-2 py-1 text-xs font-medium ${
              player.sleepRemainingMs !== null ? "text-(--ws-ink)" : ""
            }`}
            aria-haspopup="menu"
            aria-expanded={menuOpen === "sleep"}
          >
            {player.sleepRemainingMs !== null
              ? fmt(player.sleepRemainingMs)
              : "Sleep"}
          </button>
          {menuOpen === "sleep" && (
            <div role="menu" className="absolute bottom-full right-0 mb-2 w-28 rounded-xl border border-rule bg-white py-1 shadow-lg">
              {SLEEP_OPTIONS.map((m) => (
                <button
                  key={m}
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    player.setSleepTimer(m);
                    setMenuOpen(null);
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm hover:bg-black/5"
                >
                  {m} min
                </button>
              ))}
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  player.setSleepTimer(null);
                  setMenuOpen(null);
                }}
                className="block w-full px-3 py-1.5 text-left text-sm text-ink-soft hover:bg-black/5"
              >
                Off
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={player.close}
          aria-label="Close player"
          className="rounded-full p-1.5 text-ink-soft hover:bg-black/5"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
