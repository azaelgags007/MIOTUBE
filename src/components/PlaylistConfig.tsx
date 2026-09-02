import { useState } from 'react';
import type { Playlist } from '../types';
import { parseYouTubeUrl } from '../utils/youtube';
import { newId } from '../utils/storage';
import { BRAND_COLOR } from '../brand';

interface Props {
  playlists: Playlist[];
  activeUrl: string;
  onChange: (playlists: Playlist[]) => void;
  onSelectUrl: (url: string) => void;
}

const MAX_LABEL = 12;

export default function PlaylistConfig({ playlists, activeUrl, onChange, onSelectUrl }: Props) {
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  function add() {
    const l = label.trim();
    const u = url.trim();
    if (!l) {
      setError('Ponle un nombre corto a la lista.');
      return;
    }
    if (parseYouTubeUrl(u).embedUrl === null) {
      setError('Esa URL no es una playlist ni un video de YouTube.');
      return;
    }
    const next = [...playlists, { id: newId(), label: l.slice(0, MAX_LABEL), url: u }];
    onChange(next);
    if (!activeUrl) onSelectUrl(u);
    setLabel('');
    setUrl('');
    setError(null);
  }

  function startEdit(pl: Playlist) {
    setEditingId(pl.id);
    setEditLabel(pl.label);
    setEditUrl(pl.url);
    setEditError(null);
  }

  function saveEdit(id: string) {
    const l = editLabel.trim();
    const u = editUrl.trim();
    if (!l) {
      setEditError('El nombre no puede quedar vacío.');
      return;
    }
    if (parseYouTubeUrl(u).embedUrl === null) {
      setEditError('Esa URL no es una playlist ni un video de YouTube.');
      return;
    }
    const previous = playlists.find((p) => p.id === id);
    onChange(
      playlists.map((p) => (p.id === id ? { ...p, label: l.slice(0, MAX_LABEL), url: u } : p))
    );
    if (previous && previous.url === activeUrl && previous.url !== u) onSelectUrl(u);
    setEditingId(null);
    setEditError(null);
  }

  function remove(id: string) {
    const target = playlists.find((p) => p.id === id);
    const next = playlists.filter((p) => p.id !== id);
    onChange(next);
    if (target && target.url === activeUrl) {
      // Al eliminar la lista activa el reproductor pasa a "sin URL configurada".
      onSelectUrl(next.length > 0 ? next[0].url : '');
    }
    if (editingId === id) setEditingId(null);
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= playlists.length) return;
    const next = [...playlists];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  }

  return (
    <section id="listas" className="px-4 pb-16 pt-6">
      <h2 className="label">Mis listas</h2>

      <div className="card mt-3 p-4">
        <div className="space-y-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={MAX_LABEL}
            placeholder={`Nombre corto (máx ${MAX_LABEL})`}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-950"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add();
            }}
            inputMode="url"
            placeholder="https://youtube.com/playlist?list=…"
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-950"
          />
          {error && <p className="text-xs font-bold text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="button"
            onClick={add}
            className="w-full rounded-2xl px-3 py-2 text-sm font-bold text-slate-950"
            style={{ backgroundColor: BRAND_COLOR }}
          >
            Agregar lista
          </button>
        </div>
      </div>

      {playlists.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Todavía no hay listas. Agrega la primera arriba y aparecerá como botón en el reproductor.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {playlists.map((pl, i) => {
            const isActive = pl.url === activeUrl;
            const isEditing = editingId === pl.id;
            return (
              <li key={pl.id} className="card p-3">
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      maxLength={MAX_LABEL}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-950"
                    />
                    <input
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      inputMode="url"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-950"
                    />
                    {editError && (
                      <p className="text-xs font-bold text-red-600 dark:text-red-400">{editError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(pl.id)}
                        className="pill text-slate-950"
                        style={{ backgroundColor: BRAND_COLOR }}
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="pill bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onSelectUrl(pl.url)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold">{pl.label}</span>
                        {isActive && (
                          <span
                            className="pill text-[10px] text-slate-950"
                            style={{ backgroundColor: BRAND_COLOR }}
                          >
                            Sonando
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                        {pl.url}
                      </span>
                    </button>

                    <div className="flex shrink-0 items-center gap-1">
                      <IconButton label="Subir" onClick={() => move(i, -1)} disabled={i === 0}>
                        ↑
                      </IconButton>
                      <IconButton
                        label="Bajar"
                        onClick={() => move(i, 1)}
                        disabled={i === playlists.length - 1}
                      >
                        ↓
                      </IconButton>
                      <IconButton label="Editar" onClick={() => startEdit(pl)}>
                        ✎
                      </IconButton>
                      <IconButton label="Eliminar" onClick={() => remove(pl.id)}>
                        ✕
                      </IconButton>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function IconButton({
  children,
  onClick,
  label,
  disabled
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 disabled:opacity-30 dark:bg-white/10 dark:text-slate-300"
    >
      {children}
    </button>
  );
}
