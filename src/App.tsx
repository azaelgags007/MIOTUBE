import { useEffect, useState } from 'react';
import PlayerPanel from './components/PlayerPanel';
import PlaylistConfig from './components/PlaylistConfig';
import type { Playlist } from './types';
import {
  loadActiveUrl,
  loadPlaylists,
  loadZoom,
  saveActiveUrl,
  savePlaylists,
  saveZoom
} from './utils/storage';

export default function App() {
  const [playlists, setPlaylists] = useState<Playlist[]>(() => loadPlaylists());
  const [activeUrl, setActiveUrl] = useState<string>(() => loadActiveUrl());
  const [zoom, setZoom] = useState<number>(() => loadZoom());

  useEffect(() => savePlaylists(playlists), [playlists]);
  useEffect(() => saveActiveUrl(activeUrl), [activeUrl]);
  useEffect(() => saveZoom(zoom), [zoom]);

  function goToConfig() {
    document.getElementById('listas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PlayerPanel
        playlists={playlists}
        activeUrl={activeUrl}
        onSelectUrl={setActiveUrl}
        zoom={zoom}
        onZoomChange={setZoom}
        onGoToConfig={goToConfig}
      />
      <PlaylistConfig
        playlists={playlists}
        activeUrl={activeUrl}
        onChange={setPlaylists}
        onSelectUrl={setActiveUrl}
      />
    </div>
  );
}
