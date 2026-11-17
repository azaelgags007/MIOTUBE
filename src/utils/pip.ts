/** Safari on iPad may identify as macOS. Keep this feature detection testable. */
export function isAppleMobile(device: {userAgent: string; platform?: string; maxTouchPoints?: number}): boolean {
  return /iPhone|iPad|iPod/i.test(device.userAgent) || (device.platform === 'MacIntel' && (device.maxTouchPoints ?? 0) > 1);
}

/** Explicit iframe permissions and iPhone presentation matching Rutinas CDC.
 * This permits native playback; it does not programmatically enter system PiP.
 */
export function configureYouTubeFrame(frame: HTMLIFrameElement, embedUrl: string, origin: string, nativeIPhone: boolean): void {
  frame.title = 'Reproductor de YouTube';
  frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
  frame.setAttribute('allow',frame.allow);
  frame.allowFullscreen = true;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.tabIndex = 0;
  frame.style.cssText = 'width:100%;height:100%;min-height:200px;display:block;border:0';
  const url = new URL(embedUrl);
  url.searchParams.set('enablejsapi','1');
  url.searchParams.set('origin',origin);
  url.searchParams.set('controls','1');
  url.searchParams.set('fs','1');
  url.searchParams.set('autoplay','0');
  url.searchParams.set('playsinline', nativeIPhone ? '0' : '1');
  frame.src = url.href;
}

type YouTubeLauncher = {
  location: {href: string};
  setTimeout: (callback: () => void, milliseconds: number) => unknown;
  open: (url: string, target: string, features: string) => unknown;
};
/** Same native-app handoff + web fallback used by CDC. */
export function openYouTubeLikeCdc(url: string, launcher: YouTubeLauncher = window): void {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'www.youtube.com') return;
  const appUrl = url.replace('https://www.youtube.com/', 'youtube://www.youtube.com/');
  launcher.location.href = appUrl;
  launcher.setTimeout(() => {launcher.open(url,'_blank','noreferrer');},700);
}
