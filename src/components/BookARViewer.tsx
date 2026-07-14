"use client";

// The brain of the child-facing viewer. Decides which screen to show
// (in-app-browser warning / desktop QR / start screen / live AR), owns the
// page audio element (autoplay policy: unlocked inside the start tap), and
// renders the playful overlay UI above TrackedBookViewer.

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import TrackedBookViewer, { type TrackedViewerHandle } from "@/components/TrackedBookViewer";
import { useI18n } from "@/lib/i18n";
import { trackView } from "@/lib/api";
import { confettiBurst } from "@/lib/confetti";
import { isInAppBrowser } from "@/lib/ua";
import type { Book, BookPage } from "@/lib/types";

type Screen = "start" | "inapp" | "desktop" | "ar";

export default function BookARViewer({ book }: { book: Book }) {
  const { t } = useI18n();
  const pages: BookPage[] = (book.pages ?? []).slice().sort((a, b) => a.targetIndex - b.targetIndex);

  const [screen, setScreen] = useState<Screen>("start");
  const [ready, setReady] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const [exploring, setExploring] = useState(false);
  const [muted, setMuted] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const [justFound, setJustFound] = useState(false);

  const viewerHandle = useRef<TrackedViewerHandle | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioActiveRef = useRef(false);
  const discoveredRef = useRef(new Set<number>());
  const mutedRef = useRef(false);

  useEffect(() => {
    // One-time platform gate: must run after mount (needs navigator).
    const ua = navigator.userAgent;
    const gate: Screen | null = !/mobile|iphone|ipad|android|tablet/i.test(ua)
      ? "desktop"
      : isInAppBrowser(ua)
        ? "inapp"
        : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional post-hydration gate
    if (gate) setScreen(gate);
  }, []);

  const start = () => {
    // Unlock the page audio INSIDE the user tap (autoplay policy). The
    // audioActiveRef guard protects against a target being found so fast
    // that pausing here would kill real playback.
    const audio = new Audio();
    audioRef.current = audio;
    audio
      .play()
      .then(() => {
        if (!audioActiveRef.current) audio.pause();
      })
      .catch(() => {
        /* empty src — expected */
      });
    void trackView(book.id);
    setScreen("ar");
  };

  const playPageAudio = useCallback((page: BookPage) => {
    const audio = audioRef.current;
    if (!audio || !page.audioUrl) return;
    audioActiveRef.current = true;
    audio.src = page.audioUrl;
    audio.loop = page.config.audioLoop ?? false;
    audio.muted = mutedRef.current;
    audio.play().catch(() => {
      /* not fatal */
    });
  }, []);

  const stopPageAudio = useCallback(() => {
    audioActiveRef.current = false;
    audioRef.current?.pause();
  }, []);

  const onTargetFound = useCallback(
    (index: number) => {
      setActiveIndex(index);
      const page = pages[index];
      if (page) playPageAudio(page);
      if (!discoveredRef.current.has(index)) {
        discoveredRef.current.add(index);
        if (book.config.celebrate !== false) confettiBurst();
      }
      setJustFound(true);
      setTimeout(() => setJustFound(false), 2200);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.config.celebrate, playPageAudio]
  );

  const onTargetLost = useCallback(() => {
    setActiveIndex(null);
    stopPageAudio();
  }, [stopPageAudio]);

  const toggleMute = () => {
    setMuted((m) => {
      mutedRef.current = !m;
      if (audioRef.current) audioRef.current.muted = !m;
      return !m;
    });
  };

  const enterExplore = () => {
    if (activeIndex === null) return;
    viewerHandle.current?.setMode("explore", activeIndex);
    setExploring(true);
  };

  const exitExplore = () => {
    viewerHandle.current?.setMode("track", null);
    setExploring(false);
    setActiveIndex(null);
    stopPageAudio();
  };

  useEffect(() => () => audioRef.current?.pause(), []);

  const accent = book.config.accentColor ?? "#ff7a59";
  const activePage = activeIndex !== null ? pages[activeIndex] : null;

  // ---------- Blocking screens ----------
  if (screen === "inapp") {
    return (
      <FullScreenCard emoji="🌐">
        <p className="text-lg font-bold">{t("inAppBrowser")}</p>
        <button
          onClick={() => navigator.clipboard.writeText(window.location.href)}
          className="mt-4 px-6 py-3 rounded-full bg-coral text-white font-bold"
        >
          {t("openInBrowser")}
        </button>
      </FullScreenCard>
    );
  }

  if (screen === "desktop") {
    return (
      <FullScreenCard emoji="📱">
        <p className="text-lg font-bold mb-4">{t("desktopHint")}</p>
        <DesktopQR />
      </FullScreenCard>
    );
  }

  if (fatal) {
    return (
      <FullScreenCard emoji="😢">
        <p className="text-lg font-bold">{fatal}</p>
      </FullScreenCard>
    );
  }

  // ---------- Start screen ----------
  if (screen === "start") {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 p-6 text-center bg-gradient-to-b from-sky/25 via-background to-sunshine/30">
        <div className="animate-float-soft">
          {book.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.coverUrl}
              alt=""
              className="w-44 h-56 object-cover rounded-blob border-4 border-white shadow-xl rotate-2"
            />
          ) : (
            <div className="text-8xl">📖</div>
          )}
        </div>
        <h1 className="text-3xl font-bold">{book.title}</h1>
        {book.description && <p className="opacity-70 max-w-sm">{book.description}</p>}
        <button
          onClick={start}
          style={{ backgroundColor: accent }}
          className="animate-pulse-ring px-10 py-5 rounded-full text-white text-2xl font-bold shadow-xl active:scale-95 transition-transform"
        >
          ✨ {t("startAdventure")}
        </button>
      </div>
    );
  }

  // ---------- Live AR ----------
  return (
    <div className="fixed inset-0 bg-black">
      <TrackedBookViewer
        mindUrl={book.mindUrl!}
        pages={pages}
        handleRef={viewerHandle}
        onReady={() => setReady(true)}
        onTargetFound={onTargetFound}
        onTargetLost={onTargetLost}
        onModelLoading={(_, loading) => setLoadingModel(loading)}
        onError={(kind, message) =>
          setFatal(kind === "camera" ? t("cameraDenied") : `${t("error")}: ${message}`)
        }
      />

      {/* Soft rounded frame */}
      <div className="pointer-events-none absolute inset-3 rounded-[2rem] border-4 border-white/40 z-10" />

      {/* Top bar */}
      <div className="absolute top-5 inset-x-5 z-20 flex items-center gap-2">
        <span className="px-3 py-1.5 rounded-full bg-black/45 text-white text-sm font-bold backdrop-blur">
          📖 {book.title}
        </span>
        <button
          onClick={toggleMute}
          aria-label={muted ? t("unmute") : t("mute")}
          className="ms-auto w-11 h-11 rounded-full bg-black/45 text-white text-lg backdrop-blur active:scale-90 transition-transform"
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* Status center */}
      {!ready && (
        <Center>
          <p className="px-5 py-3 rounded-full bg-black/55 text-white font-bold animate-pulse backdrop-blur">
            {t("loading")}
          </p>
        </Center>
      )}
      {ready && activeIndex === null && !exploring && (
        <Center>
          <div className="text-center">
            <div className="text-5xl mb-2 animate-float-soft">🔍</div>
            <p className="px-5 py-3 rounded-full bg-black/55 text-white font-bold backdrop-blur">
              {t("pointCamera")}
            </p>
          </div>
        </Center>
      )}
      {loadingModel && activeIndex !== null && (
        <Center>
          <p className="px-5 py-3 rounded-full bg-black/55 text-white font-bold animate-pulse backdrop-blur">
            {t("loadingCharacter")}
          </p>
        </Center>
      )}
      {justFound && activePage && !exploring && (
        <div className="absolute top-20 inset-x-0 z-20 flex justify-center animate-pop-in">
          <span className="px-5 py-2.5 rounded-full bg-sunshine text-foreground font-bold shadow-lg">
            {t("foundIt")} {activePage.title}
          </span>
        </div>
      )}

      {/* Bottom actions */}
      <div className="absolute bottom-8 inset-x-0 z-20 flex flex-col items-center gap-2">
        {exploring ? (
          <>
            <p className="text-white/80 text-sm">{t("exploreHint")}</p>
            <button
              onClick={exitExplore}
              className="px-8 py-4 rounded-full bg-white text-foreground text-lg font-bold shadow-xl active:scale-95 transition-transform"
            >
              📖 {t("backToBook")}
            </button>
          </>
        ) : (
          activePage && (
            <button
              onClick={enterExplore}
              style={{ backgroundColor: accent }}
              className="px-8 py-4 rounded-full text-white text-lg font-bold shadow-xl active:scale-95 transition-transform animate-pop-in"
            >
              🔎 {t("explore")}
            </button>
          )
        )}
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      {children}
    </div>
  );
}

function FullScreenCard({ emoji, children }: { emoji: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-sky/25 via-background to-sunshine/30">
      <div className="text-7xl mb-4">{emoji}</div>
      {children}
    </div>
  );
}

function DesktopQR() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, window.location.href, { width: 200, margin: 2 }).catch(
        console.error
      );
    }
  }, []);
  return <canvas ref={canvasRef} className="rounded-2xl border border-line shadow-lg" />;
}
