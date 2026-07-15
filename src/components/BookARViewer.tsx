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
  const { t, lang } = useI18n();
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
  const chimeRef = useRef<HTMLAudioElement | null>(null);
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
    // Unlock the discovery chime the same way (Safari needs the gesture chain).
    const chime = new Audio("/sounds/discover.wav");
    chimeRef.current = chime;
    chime
      .play()
      .then(() => {
        chime.pause();
        chime.currentTime = 0;
      })
      .catch(() => {
        /* non-fatal */
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
        if (book.config.celebrate !== false) {
          confettiBurst();
          if (!mutedRef.current && chimeRef.current) {
            chimeRef.current.currentTime = 0;
            chimeRef.current.play().catch(() => {});
          }
        }
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
      <div className="hayya-ar-start fixed inset-0 overflow-hidden text-white">
        <div className="absolute top-5 inset-x-5 z-10 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 font-extrabold tracking-[-.04em] text-xl">
            <HayyaMarkLight /> هَيّا
          </span>
          <span className="px-3 py-1.5 rounded-full border border-white/15 bg-black/15 backdrop-blur-md text-[10px] font-bold">
            ✦ {lang === "ar" ? "حكاية تفاعلية" : "Interactive story"}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 p-6 sm:p-10 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-lg text-center flex flex-col items-center">
            <div className="animate-float-soft mb-5">
              {book.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={book.coverUrl}
                  alt=""
                  className="w-28 h-36 sm:w-36 sm:h-44 object-cover rounded-[1.1rem] border-2 border-white/55 shadow-2xl rotate-2"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-sunshine/15 border border-sunshine/30 grid place-items-center text-6xl backdrop-blur">📖</div>
              )}
            </div>
            <span className="text-[10px] text-sunshine tracking-[.18em] font-bold">{t("tagline")}</span>
            <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold tracking-[-.055em] leading-tight">{book.title}</h1>
            {book.description && <p className="mt-3 text-sm text-white/65 max-w-sm leading-7 line-clamp-2">{book.description}</p>}
            <button
              onClick={start}
              style={{ backgroundColor: accent }}
              className="animate-pulse-ring mt-6 w-full max-w-sm px-8 py-4 rounded-2xl text-white text-lg font-extrabold shadow-2xl active:scale-[.98] transition-transform"
            >
              <span className="inline-flex items-center gap-2"><ScanIcon /> {t("startAdventure")}</span>
            </button>
            <p className="mt-3 text-[9px] text-white/42">
              {lang === "ar" ? "الكاميرا للعرض المباشر فقط — لا نحفظ أي صور" : "Live camera only — no images are saved"}
            </p>
          </div>
        </div>
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

      {/* Hayya tracking frame */}
      <div className="hayya-scan-frame z-10">
        <i /><i /><i /><i />
      </div>

      {/* Top bar */}
      <div className="absolute top-5 inset-x-5 z-20 flex items-center gap-2">
        <span className="px-3 py-2 rounded-full bg-navy/65 border border-white/15 text-white text-sm font-bold backdrop-blur-xl inline-flex items-center gap-2">
          <HayyaMarkLight /> <span className="max-w-40 truncate">{book.title}</span>
        </span>
        <button
          onClick={toggleMute}
          aria-label={muted ? t("unmute") : t("mute")}
          className="ms-auto w-11 h-11 rounded-full bg-navy/65 border border-white/15 text-white text-lg backdrop-blur-xl active:scale-90 transition-transform"
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
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-sunshine/15 border border-sunshine/35 grid place-items-center text-sunshine animate-float-soft backdrop-blur-xl">
              <ScanIcon />
            </div>
            <p className="px-5 py-3 rounded-full bg-navy/70 border border-white/15 text-white font-bold backdrop-blur-xl">
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
          <span className="px-5 py-2.5 rounded-full bg-mint text-ink font-bold shadow-lg inline-flex items-center gap-2">
            ✓ {t("foundIt")} {activePage.title}
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
    <div className="fixed inset-0 flex flex-col items-center justify-center p-8 text-center bg-navy text-white overflow-hidden">
      <div className="absolute inset-0 opacity-15 bg-[url('/hayya-hero.jpg')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/80 to-navy/35" />
      <div className="relative text-7xl mb-4">{emoji}</div>
      <div className="relative max-w-md">{children}</div>
    </div>
  );
}

function HayyaMarkLight() {
  return (
    <span className="inline-flex items-end justify-center gap-0.5 w-5 h-5" aria-hidden>
      <i className="block w-1 h-3 bg-current rounded-full -rotate-[24deg] origin-bottom" />
      <i className="block w-1 h-5 bg-current rounded-full" />
      <i className="block w-1 h-3 bg-current rounded-full rotate-[24deg] origin-bottom" />
    </span>
  );
}

function ScanIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
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
