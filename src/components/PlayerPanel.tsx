import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PanelState, Playlist } from '../types';
import { parseYouTubeUrl } from '../utils/youtube';
import { ZOOM_MAX, ZOOM_MIN } from '../utils/storage';
import { BRAND_COLOR, BRAND_NAME } from '../brand';

const BAR_H = 48;

/** Calidad solicitada al arrancar. 'tiny' es la mas baja disponible. */
const INITIAL_QUALITY = 'tiny';

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
  const [needsResume, setNeedsResume] = useState(false);
  const [videoUnavailable, setVideoUnavailable] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [safeTop, setSafeTop] = useState(0);
  const [viewportH, setViewportH] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 800
  );
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerSlotRef = useRef<HTMLDivElement | null>(null);
  const playerHostRef = useRef<HTMLDivElement | null>(null);

  const parsed = useMemo(() => parseYouTubeUrl(activeUrl), [activeUrl]);
  const hasPlaylists = playlists.length > 0;
  const hasUrl = activeUrl.trim().length > 0;

  /* ------------------------------------------------------------------ */
  /* Comandos a la IFrame Player API                                     */
  /* ------------------------------------------------------------------ */

  const ytCommand = useCallback((cmd: string, args?: unknown) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: cmd, args: args ?? [] }),
      '*'
    );
  }, []);

  /**
   * Solicita la calidad mas baja. Es una SUGERENCIA: YouTube usa streaming
   * adaptativo y puede ignorarla segun el ancho de banda. Se reenvia en cada
   * cambio de pista porque la calidad se renegocia por video.
   */
  const requestLowQuality = useCallback(() => {
    ytCommand('setPlaybackQuality', [INITIAL_QUALITY]);
  }, [ytCommand]);

  /* ------------------------------------------------------------------ */
  /* Handshake: sin el mensaje `listening` el iframe no emite eventos     */
  /* ------------------------------------------------------------------ */

  const startListening = useCallback(() => {
    let tries = 0;
    const send = () => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'listening', id: 'phonoplayer', channel: 'widget' }),
        '*'
      );
      tries += 1;
      if (tries >= 8) clearInterval(timer);
    };
    const timer = setInterval(send, 400);
    send();
    return () => clearInterval(timer);
  }, []);

  /* ------------------------------------------------------------------ */
  /* Eventos entrantes del iframe                                        */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;

        if (data?.event === 'onReady' || data?.event === 'initialDelivery') {
          requestLowQuality();
        }
        if (data?.event === 'onError' && [100, 101, 150].includes(data.info)) {
          setVideoUnavailable(true);
        }
        if (data?.event === 'onStateChange' && data?.info === 1) {
          setVideoUnavailable(false);
          // Nueva pista en reproduccion: reafirmar la calidad minima.
          requestLowQuality();
        }
      } catch {
        /* ignorar */
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [requestLowQuality]);

  /* ------------------------------------------------------------------ */
  /* Reanudacion tras salir de la app (iOS suspende el iframe)            */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (state === 'hidden') return;
    const onVis = () => {
      if (document.visibilityState === 'hidden') setNeedsResume(true);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [state]);

  /* ------------------------------------------------------------------ */
  /* Safe area (notch) y viewport                                        */
  /* ------------------------------------------------------------------ */

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
    const onResize = () => setViewportH(window.innerHeight);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /* Transiciones                                                        */
  /* ------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------ */
  /* Picture-in-Picture (§8 — conservar exactamente)                     */
  /* ------------------------------------------------------------------ */

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
      /* el usuario cancelo o el navegador lo bloqueo */
    }
  }

  function openInYouTubeApp() {
    const url = activeUrl;
    const appUrl = url.replace(
      /^https?:\/\/(www\.)?(m\.)?youtube\.com/,
      'youtube://www.youtube.com'
    );
    window.location.href = appUrl !== url ? appUrl : url;
    setTimeout(() => {
      window.open(url, '_blank', 'noreferrer');
    }, 700);
  }

  /* ------------------------------------------------------------------ */
  /* Layout                                                              */
  /* ------------------------------------------------------------------ */

  const extraH = state === 'expanded' ? 88 : 0;
  const clampedZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
  const iframeH = state === 'expanded' ? Math.round((viewportH * clampedZoom) / 100) : 0;
  const spacerH = safeTop + BAR_H + iframeH + extraH;

  const showControls =
    parsed.listId !== null && !needsResume && !videoUnavailable && parsed.embedUrl !== null;

  function applyDraftUrl() {
    const value = urlDraft.trim();
    if (!value) return;
    onSelectUrl(value);
    setUrlDraft('');
    setShowUrlInput(false);
    setVideoUnavailable(false);
    setIframeKey((k) => k + 1);
  }

  /* ---------------------------- hidden ------------------------------ */

  if (state === 'hidden') {
    return (
      <div className="px-4 pt-6">
        <button
          type="button"
          onClick={open}
          className="card flex w-full items-center justify-between gap-4 p-5 text-left transition active:scale-[0.99]"
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

  /* ------------------------ bar / expanded -------------------------- */

  return (
    <>
      <div style={{ height: spacerH }} aria-hidden="true" />

      <div
        className="fixed inset-x-0 top-0 z-50 bg-slate-950/95 text-white shadow-lg backdrop-blur"
        style={{ paddingTop: safeTop }}
      >
        {/* Barra de control */}
        <div className="flex items-center gap-2 px-3" style={{ height: BAR_H }}>
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: BRAND_COLOR }}
            aria-hidden="true"
          />

          {needsResume ? (
            <button
              type="button"
              onClick={resume}
              className="pill min-w-0 flex-1 justify-center bg-amber-400 text-slate-950"
            >
              <span className="truncate">⚠ Video pausado — Reanudar</span>
            </button>
          ) : videoUnavailable ? (
            <>
              <span className="min-w-0 flex-1 truncate text-xs font-bold text-amber-300">
                ⚠ Video no disponible
              </span>
              <button
                type="button"
                onClick={() => {
                  ytCommand('nextVideo');
                  setVideoUnavailable(false);
                }}
                className="pill shrink-0 bg-white/10 text-white"
              >
                ⏭ Saltar
              </button>
            </>
          ) : (
            <>
              <span className="min-w-0 flex-1 truncate text-sm font-black tracking-tight">
                {BRAND_NAME}
              </span>
              {showControls && (
                <div className="flex shrink-0 items-center gap-1">
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
            </>
          )}

          <button
            type="button"
            onClick={toggle}
            aria-label={state === 'expanded' ? 'Contraer reproductor' : 'Expandir reproductor'}
            className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-white"
          >
            {state === 'expanded' ? '▲' : '▼'}
          </button>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar reproductor"
            className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-white"
          >
            ✕
          </button>
        </div>

        {/* Fila de presets + fila de zoom (solo expandido) */}
        {state === 'expanded' && (
          <div className="space-y-2 px-3 pb-2">
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
              {playlists.map((pl) => {
                const isActive = pl.url === activeUrl;
                return (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => {
                      onSelectUrl(pl.url);
                      setVideoUnavailable(false);
                      setIframeKey((k) => k + 1);
                    }}
                    className={`pill shrink-0 ${isActive ? 'text-slate-950' : 'bg-white/10 text-white/70'}`}
                    style={isActive ? { backgroundColor: BRAND_COLOR } : undefined}
                  >
                    {pl.label}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setShowUrlInput((v) => !v)}
                className="pill shrink-0 bg-white/10 text-white/70"
              >
                Cambiar URL
              </button>

              {hasUrl && (
                <a
                  href={activeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="pill shrink-0 bg-white/10 text-white/70"
                >
                  YT ↗
                </a>
              )}
            </div>

            {showUrlInput && (
              <div className="flex items-center gap-2">
                <input
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyDraftUrl();
                  }}
                  inputMode="url"
                  placeholder="Pega una URL de YouTube"
                  className="min-w-0 flex-1 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white placeholder:text-white/40"
                />
                <button
                  type="button"
                  onClick={applyDraftUrl}
                  className="pill shrink-0 text-slate-950"
                  style={{ backgroundColor: BRAND_COLOR }}
                >
                  Cargar
                </button>
              </div>
            )}

            <div className="flex items-center gap-3">
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-white/50">
                Zoom
              </span>
              <input
                type="range"
                min={ZOOM_MIN}
                max={ZOOM_MAX}
                step={1}
                value={clampedZoom}
                onChange={(e) => onZoomChange(Number(e.target.value))}
                aria-label="Tamaño del reproductor"
                className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/20"
                style={{ accentColor: BRAND_COLOR }}
              />
              <span className="w-8 shrink-0 text-right text-[10px] font-bold tabular-nums text-white/50">
                {clampedZoom}
              </span>

              {state === 'expanded' && !needsResume && hasUrl && (
                <button
                  type="button"
                  onClick={docPiPSupported ? enterDocumentPiP : openInYouTubeApp}
                  aria-label={
                    docPiPSupported
                      ? 'Abrir en ventana flotante'
                      : 'Abrir en la app de YouTube'
                  }
                  className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-white"
                >
                  {docPiPSupported ? '⧉' : '↗'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Reproductor. El iframe NUNCA se desmonta al pasar a `bar`:
            solo se le da altura 0. Desmontarlo cortaria el audio. */}
        <div ref={playerSlotRef}>
          <div ref={playerHostRef} style={{ height: iframeH }} className="w-full overflow-hidden bg-black">
            {parsed.embedUrl && (
              <iframe
                key={iframeKey}
                ref={iframeRef}
                onLoad={startListening}
                className="h-full w-full"
                src={parsed.embedUrl}
                title="Playlist"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </div>

        {/* Avisos (solo expandido) */}
        {state === 'expanded' && (
          <>
            {videoUnavailable && (
              <div className="mx-3 my-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-200">
                <p className="font-bold">Este video no se puede reproducir aquí.</p>
                <p className="mt-1 text-amber-200/80">
                  Fue eliminado o su autor no permite la reproducción incrustada.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      ytCommand('nextVideo');
                      setVideoUnavailable(false);
                    }}
                    className="pill bg-amber-400 text-slate-950"
                  >
                    Saltar al siguiente
                  </button>
                  <button type="button" onClick={onGoToConfig} className="pill bg-white/10 text-white">
                    Cambiar playlist
                  </button>
                </div>
              </div>
            )}

            {hasUrl && parsed.embedUrl === null && (
              <div className="mx-3 my-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-200">
                URL no compatible. Prueba con una playlist de YouTube.
              </div>
            )}

            {!hasUrl && (
              <div className="mx-3 my-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                <p className="font-bold text-white">Sin URL configurada.</p>
                <p className="mt-1">
                  {hasPlaylists
                    ? 'Elige una de tus listas arriba.'
                    : 'Agrega tu primera lista en la configuración de abajo.'}
                </p>
                <button
                  type="button"
                  onClick={onGoToConfig}
                  className="pill mt-2 text-slate-950"
                  style={{ backgroundColor: BRAND_COLOR }}
                >
                  Ir a listas
                </button>
              </div>
            )}

            {!docPiPSupported && hasUrl && (
              <p className="px-3 pb-2 text-[10px] leading-snug text-white/40">
                iOS no permite PiP en videos incrustados de YouTube. Usa ↗ para abrir la playlist en
                la app de YouTube, donde sí funciona el PiP nativo.
              </p>
            )}
          </>
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
      className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-white active:bg-white/20"
    >
      {children}
    </button>
  );
}
