import { useEffect, useRef, useState } from 'react';
import type { PanelState, Playlist } from '../types';
import { parseYouTubeUrl } from '../utils/youtube';
import { ZOOM_MAX, ZOOM_MIN } from '../utils/storage';
import { BRAND_COLOR, BRAND_NAME } from '../brand';

interface Props {
  playlists: Playlist[];
  activeUrl: string;
  onSelectUrl: (url: string) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onGoToConfig: () => void;
}

export default function PlayerPanel({
  playlists,
  activeUrl,
  onSelectUrl,
  zoom,
  onZoomChange,
  onGoToConfig
}: Props) {
  const [state, setState] = useState<PanelState>('hidden');
  const [draft, setDraft] = useState(activeUrl);
  const [needsResume, setNeedsResume] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const [safeTop, setSafeTop] = useState(44);
  const [videoUnavailable, setVideoUnavailable] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerHostRef = useRef<HTMLDivElement>(null);
  const playerSlotRef = useRef<HTMLDivElement>(null);

  const parsed = parseYouTubeUrl(activeUrl);
  const embedUrl = parsed.embedUrl;

  useEffect(() => {
    setDraft(activeUrl);
  }, [activeUrl]);

  useEffect(() => {
    const el = document.createElement('div');
    el.style.cssText =
      'position:fixed;top:env(safe-area-inset-top,0px);height:0;pointer-events:none;visibility:hidden';
    document.body.appendChild(el);
    const top = el.getBoundingClientRect().top;
    setSafeTop(top > 0 ? top : 44);
    document.body.removeChild(el);
  }, []);

  useEffect(() => {
    if (state === 'hidden') return;
    const onVis = () => {
      if (document.visibilityState === 'hidden') setNeedsResume(true);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [state]);

  // Mismo manejo de mensajes de YouTube que APP1.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data?.event === 'onError') {
          if ([100, 101, 150].includes(data.info)) setVideoUnavailable(true);
        }
        if (data?.event === 'onStateChange' && data?.info === 1) {
          setVideoUnavailable(false);
        }
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  function ytCommand(cmd: string, args?: unknown) {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: cmd, args: args ?? [] }),
      '*'
    );
  }

  const docPiPSupported =
    typeof window !== 'undefined' && 'documentPictureInPicture' in window;

  async function enterDocumentPiP() {
    const host = playerHostRef.current;
    if (!host) return;
    try {
      const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
        width: 400,
        height: 260
      });
      pipWindow.document.body.style.cssText = 'margin:0;background:#020617;overflow:hidden';
      pipWindow.document.body.append(host);
      pipWindow.addEventListener('pagehide', () => {
        playerSlotRef.current?.append(host);
      });
    } catch {
      /* el usuario canceló o el navegador lo bloqueó */
    }
  }

  function openInYouTubeApp() {
    const url = activeUrl;
    if (!url) return;
    const appUrl = url.replace(
      /^https?:\/\/(www\.)?(m\.)?youtube\.com/,
      'youtube://www.youtube.com'
    );
    window.location.href = appUrl !== url ? appUrl : url;
    setTimeout(() => {
      window.open(url, '_blank', 'noreferrer');
    }, 700);
  }

  const open = () => {
    setState('expanded');
    setNeedsResume(false);
    setVideoUnavailable(false);
  };

  const toggle = () => {
    setState((s) => (s === 'expanded' ? 'bar' : 'expanded'));
    setNeedsResume(false);
  };

  const close = () => {
    setState('hidden');
    setNeedsResume(false);
  };

  const resume = () => {
    setIframeKey((k) => k + 1);
    setNeedsResume(false);
    setVideoUnavailable(false);
    setState('expanded');
  };

  const save = () => {
    const next = draft.trim();
    if (!next) return;
    onSelectUrl(next);
    setIframeKey((k) => k + 1);
    setShowEditor(false);
    setVideoUnavailable(false);
  };

  const applyPreset = (url: string) => {
    setDraft(url);
    onSelectUrl(url);
    setIframeKey((k) => k + 1);
    setVideoUnavailable(false);
  };

  const skipVideo = () => {
    ytCommand('nextVideo');
    setVideoUnavailable(false);
  };

  const clampedZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
  const BAR_H = 48;
  const iframeH =
    state === 'expanded' ? Math.round(window.innerHeight * clampedZoom / 100) : 0;
  const extraH = state === 'expanded' ? 88 : 0;
  const spacerH = safeTop + BAR_H + iframeH + extraH;

  if (state === 'hidden') {
    return (
      <div className="px-4 pt-6">
        <button
          type="button"
          className="card flex w-full items-center justify-between gap-4 p-5 text-left transition active:scale-[0.99]"
          onClick={open}
        >
          <span>
            <span className="block text-base font-black tracking-tight">{BRAND_NAME}</span>
            <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">
              Reproduce tus listas de YouTube en un panel fijo.
            </span>
          </span>
          <span className="pill shrink-0 text-slate-950" style={{ backgroundColor: BRAND_COLOR }}>
            Abrir
          </span>
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={{ height: spacerH }} aria-hidden="true" />
      <div
        className="fixed inset-x-0 top-0 z-50 bg-slate-950 shadow-xl"
        style={{ paddingTop: safeTop }}
      >
        <div className="flex items-center gap-1.5 px-2" style={{ height: BAR_H }}>
          <span className="text-base">🎵</span>
          <p className="min-w-0 flex-1 truncate text-xs font-black text-white">
            {needsResume
              ? '⚠ Video pausado — Reanudar'
              : videoUnavailable
                ? '⚠ Video no disponible'
                : state === 'expanded'
                  ? 'Playlist activa'
                  : 'Música activa'}
          </p>

          {needsResume && (
            <button
              type="button"
              onClick={resume}
              className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-black text-slate-950 active:opacity-70"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              ▶ Reanudar
            </button>
          )}

          {videoUnavailable && !needsResume && (
            <button
              type="button"
              onClick={skipVideo}
              className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-black text-slate-950 active:opacity-70"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              ⏭ Saltar
            </button>
          )}

          {!needsResume && !videoUnavailable && parsed.listId && (
            <div className="flex gap-1">
              <ControlButton label="Video anterior" onClick={() => ytCommand('previousVideo')}>
                ⏮
              </ControlButton>
              <ControlButton label="Reproducir" onClick={() => ytCommand('playVideo')}>
                ▶
              </ControlButton>
              <ControlButton label="Pausar" onClick={() => ytCommand('pauseVideo')}>
                ⏸
              </ControlButton>
              <ControlButton label="Video siguiente" onClick={() => ytCommand('nextVideo')}>
                ⏭
              </ControlButton>
            </div>
          )}

          {state === 'expanded' && !needsResume && activeUrl &&
            (docPiPSupported ? (
              <button
                type="button"
                onClick={enterDocumentPiP}
                title="Ventana flotante"
                className="shrink-0 rounded-xl bg-white/10 px-2.5 py-1.5 text-xs font-black text-white active:opacity-70"
              >
                ⧉
              </button>
            ) : (
              <button
                type="button"
                onClick={openInYouTubeApp}
                title="Abrir en la app de YouTube"
                className="shrink-0 rounded-xl bg-white/10 px-2.5 py-1.5 text-xs font-black text-white active:opacity-70"
              >
                ↗
              </button>
            ))}

          <button
            type="button"
            onClick={toggle}
            className="shrink-0 rounded-xl bg-white/10 px-2.5 py-1.5 text-xs font-black text-white active:opacity-70"
            aria-label={state === 'expanded' ? 'Contraer reproductor' : 'Expandir reproductor'}
          >
            {state === 'expanded' ? '▲' : '▼'}
          </button>
          <button
            type="button"
            onClick={close}
            className="shrink-0 rounded-xl bg-white/10 px-2.5 py-1.5 text-xs font-black text-white/50 active:opacity-70"
            aria-label="Cerrar reproductor"
          >
            ✕
          </button>
        </div>

        {state === 'expanded' && (
          <div className="border-t border-white/10">
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-2 py-1.5">
              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => applyPreset(pl.url)}
                  className={`shrink-0 rounded-xl px-2.5 py-1 text-xs font-black active:opacity-70 ${
                    activeUrl === pl.url ? 'text-slate-950' : 'bg-white/10 text-white/70'
                  }`}
                  style={activeUrl === pl.url ? { backgroundColor: BRAND_COLOR } : undefined}
                >
                  {pl.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setShowEditor((v) => !v)}
                className="shrink-0 rounded-xl bg-white/10 px-2.5 py-1 text-xs font-black text-white/70 active:opacity-70"
              >
                {showEditor ? 'Ocultar' : 'Cambiar URL'}
              </button>

              {activeUrl && (
                <a
                  href={activeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-xl bg-white/10 px-2.5 py-1 text-xs font-black text-white/70"
                >
                  YT ↗
                </a>
              )}
            </div>

            {!docPiPSupported && activeUrl && (
              <p className="px-2 pb-1 text-[10px] font-semibold leading-tight text-white/35">
                iOS no permite PiP en videos incrustados de YouTube. Usa ↗ para abrir la playlist
                en la app de YouTube, donde sí funciona el PiP nativo.
              </p>
            )}

            <div className="flex items-center gap-2 px-2 pb-1">
              <span className="shrink-0 text-xs font-black text-white/40">Zoom</span>
              <input
                type="range"
                min={ZOOM_MIN}
                max={ZOOM_MAX}
                step="1"
                value={clampedZoom}
                onChange={(e) => onZoomChange(Number(e.target.value))}
                className="h-1 flex-1"
                style={{ accentColor: BRAND_COLOR }}
              />
              <span className="w-7 shrink-0 text-right text-xs font-black text-white/60">
                {clampedZoom}%
              </span>
            </div>

            {showEditor && (
              <div className="flex gap-1.5 px-2 pb-1.5">
                <input
                  className="flex-1 rounded-xl border border-white/10 bg-white/10 px-2 py-1.5 text-xs text-white outline-none placeholder:text-white/30"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') save();
                  }}
                  placeholder="URL de playlist o video YouTube"
                  inputMode="url"
                />
                <button
                  type="button"
                  onClick={save}
                  className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-black text-slate-950"
                  style={{ backgroundColor: BRAND_COLOR }}
                >
                  OK
                </button>
              </div>
            )}

            {videoUnavailable && (
              <div className="mx-2 mb-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                <p className="text-xs font-black text-amber-400">
                  ⚠ Este video no permite reproducción externa
                </p>
                <div className="mt-1.5 flex gap-2">
                  <button
                    type="button"
                    onClick={skipVideo}
                    className="flex-1 rounded-xl py-1.5 text-xs font-black text-slate-950 active:opacity-70"
                    style={{ backgroundColor: BRAND_COLOR }}
                  >
                    ⏭ Saltar al siguiente
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditor(true);
                      setDraft(activeUrl);
                    }}
                    className="flex-1 rounded-xl bg-white/10 py-1.5 text-xs font-black text-white/70 active:opacity-70"
                  >
                    Cambiar playlist
                  </button>
                </div>
              </div>
            )}

            {embedUrl ? (
              <div ref={playerSlotRef} style={{ height: iframeH }} className="overflow-hidden">
                <div ref={playerHostRef} className="h-full w-full">
                  <iframe
                    key={iframeKey}
                    ref={iframeRef}
                    className="h-full w-full"
                    src={embedUrl}
                    title="Playlist"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : (
              <div className="px-2 pb-2">
                <p className="rounded-xl bg-amber-900/40 px-3 py-2 text-xs font-bold text-amber-300">
                  {activeUrl
                    ? 'URL no compatible. Prueba con una playlist de YouTube.'
                    : 'Sin URL configurada. Agrega una lista desde la configuración.'}
                </p>
                {!activeUrl && (
                  <button
                    type="button"
                    onClick={onGoToConfig}
                    className="mt-2 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-black text-white/70"
                  >
                    Ir a listas
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function ControlButton({
  children,
  onClick,
  label
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded-xl bg-white/10 px-2 py-1.5 text-xs font-black text-white active:opacity-70"
    >
      {children}
    </button>
  );
}
