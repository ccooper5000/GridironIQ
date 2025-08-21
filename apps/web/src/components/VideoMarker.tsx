import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Target, RotateCcw, RotateCw,
  Download, Upload as UploadIcon, AlertTriangle, RefreshCcw
} from 'lucide-react';
import { MarkerData } from '../types';

interface VideoMarkerProps {
  videoSrc: string;
  onMarkersSubmit: (markers: MarkerData[]) => void;
  isSubmitting?: boolean;
}

/** Positions grouped */
const POSITION_GROUPS = [
  {
    key: 'offense',
    title: 'Offense',
    positions: [
      { value: 'QB',  label: 'Quarterback',        group: 'offense' },
      { value: 'RB',  label: 'Running Back',       group: 'offense' },
      { value: 'FB',  label: 'Fullback',           group: 'offense' },
      { value: 'WR',  label: 'Wide Receiver',      group: 'offense' },
      { value: 'TE',  label: 'Tight End',          group: 'offense' },
      { value: 'OG',  label: 'Guard (OL)',         group: 'offense' },
      { value: 'OT',  label: 'Tackle (OL)',        group: 'offense' },
      { value: 'C',   label: 'Center (OL)',        group: 'offense' },
    ],
  },
  {
    key: 'defense',
    title: 'Defense',
    positions: [
      { value: 'NT',  label: 'Nose Tackle',        group: 'defense' },
      { value: 'DT',  label: 'Defensive Tackle',   group: 'defense' },
      { value: 'DE',  label: 'Defensive End',      group: 'defense' },
      { value: 'OLB', label: 'Outside Linebacker', group: 'defense' },
      { value: 'ILB', label: 'Inside Linebacker',  group: 'defense' },
      { value: 'FS',  label: 'Free Safety',        group: 'defense' },
      { value: 'SS',  label: 'Strong Safety',      group: 'defense' },
      { value: 'CB',  label: 'Cornerback',         group: 'defense' },
    ],
  },
  {
    key: 'special',
    title: 'Special Teams',
    positions: [
      { value: 'GUN', label: 'Gunner',             group: 'special' },
      { value: 'H',   label: 'Holder',             group: 'special' },
      { value: 'KR',  label: 'Kick Returner',      group: 'special' },
      { value: 'LS',  label: 'Long Snapper',       group: 'special' },
      { value: 'K',   label: 'Place Kicker',       group: 'special' },
      { value: 'P',   label: 'Punter',             group: 'special' },
      { value: 'PR',  label: 'Punt Returner',      group: 'special' },
    ],
  },
] as const;

type GroupKey = typeof POSITION_GROUPS[number]['key'];
type PositionItem = (typeof POSITION_GROUPS)[number]['positions'][number];

const ALL_POSITIONS: PositionItem[] = POSITION_GROUPS.flatMap(g => g.positions);
const BY_VALUE = new Map(ALL_POSITIONS.map(p => [p.value, p]));

const GROUP_COLOR_CLASSES: Record<GroupKey, { dot: string; btnBg: string; btnBorder: string }> = {
  offense: { dot: 'bg-green-500',  btnBg: 'bg-green-600',  btnBorder: 'border-green-600'  },
  defense: { dot: 'bg-indigo-500', btnBg: 'bg-indigo-600', btnBorder: 'border-indigo-600' },
  special: { dot: 'bg-amber-500',  btnBg: 'bg-amber-600',  btnBorder: 'border-amber-600'  },
};

/** ---- Draft persistence ---- */
const DRAFT_KEY = 'giq_marker_draft_v1';
const LAST_SUBMITTED_KEY = 'giq_marker_last_submitted_v1';

type DraftPayload = {
  markers: MarkerData[];
  activeGroup: GroupKey;
  selectedPosition: string;
  currentTime: number;
  videoSrc?: string;
  savedAt: number;
};

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }
function formatTime(time: number) {
  if (!isFinite(time)) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
function relativeAge(ms: number) {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

/** Memoized overlay so markers don’t re-render on every time tick */
const MarkersOverlay = React.memo(function MarkersOverlay({
  markers,
  show,
  videoLoaded
}: {
  markers: MarkerData[];
  show: boolean;
  videoLoaded: boolean;
}) {
  if (!show || !videoLoaded) return null;
  return (
    <>
      {markers.map((m, idx) => {
        const meta = BY_VALUE.get(m.position);
        const grp = (meta?.group ?? 'offense') as GroupKey;
        const dotClass = GROUP_COLOR_CLASSES[grp].dot;
        return (
          <div
            key={`${m.position}-${idx}-${m.timestamp}`}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
            title={`${meta?.label ?? m.position} @ ${formatTime(m.timestamp)}`}
            aria-label={`${meta?.label ?? m.position} at ${formatTime(m.timestamp)}`}
          >
            <div className={`rounded-full w-5 h-5 md:w-4 md:h-4 ${dotClass} border-2 border-white shadow`} />
            <div className="text-xs text-white bg-black/70 px-1 rounded mt-1">{m.position}</div>
          </div>
        );
      })}
    </>
  );
});

export const VideoMarker: React.FC<VideoMarkerProps> = ({ videoSrc, onMarkersSubmit, isSubmitting = false }) => {
  const [activeGroup, setActiveGroup] = useState<GroupKey>('offense');
  const [selectedPosition, setSelectedPosition] = useState<string>('QB');

  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [undoStack, setUndoStack] = useState<MarkerData[][]>([]);
  const [redoStack, setRedoStack] = useState<MarkerData[][]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Timeline state
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);

  /** Draft availability + submit flag (must be before effects that use them) */
  const [availableDraft, setAvailableDraft] = useState<DraftPayload | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const pendingSeekRef = useRef<number | null>(null);

  // Debounce timer for currentTime draft writes
  const timeSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Guard: avoid clobbering a good draft with an empty write on first mount
  const skipFirstWriteRef = useRef<boolean>(true);

  const pct = duration ? (currentTime / duration) : 0;

  /** ---- Undo/Redo helpers ---- */
  const commit = useCallback((producer: (prev: MarkerData[]) => MarkerData[]) => {
    setMarkers(prev => {
      const next = producer(prev);
      setUndoStack(u => [...u, prev]);
      setRedoStack([]);
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    setUndoStack((u) => {
      if (u.length === 0) return u;
      setMarkers((current) => {
        const prevState = u[u.length - 1];
        setRedoStack((r) => [...r, current]);
        return prevState;
      });
      return u.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack((r) => {
      if (r.length === 0) return r;
      setMarkers((current) => {
        const nextState = r[r.length - 1];
        setUndoStack((u) => [...u, current]);
        return nextState;
      });
      return r.slice(0, -1);
    });
  }, []);

  /** ---- Video controls ---- */
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const nudge = (delta: number) => {
    if (!videoRef.current) return;
    const next = Math.max(0, Math.min((videoRef.current.currentTime || 0) + delta, duration || 0));
    videoRef.current.currentTime = next;
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    if (!isScrubbing) setCurrentTime(videoRef.current.currentTime || 0);
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    setDuration(v.duration || 0);
    setVideoLoaded(true);
    setVideoError(null);
    setCurrentTime(prev => {
      if (pendingSeekRef.current != null) {
        const t = Math.max(0, Math.min(pendingSeekRef.current, v.duration || 0));
        v.currentTime = t;
        pendingSeekRef.current = null;
        return t;
      }
      return prev;
    });
  };

  const handleVideoError = () => {
    setVideoError('We could not load this video. Please verify the file format/codec or try re-uploading.');
  };

  /** ---- Add/Remove markers ---- */
  const placeMarkerAt = (clientX: number, clientY: number) => {
    if (!containerRef.current || !videoRef.current || !videoLoaded) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    const timestamp = videoRef.current.currentTime || 0;

    // Ensure the video does NOT start on click
    if (!videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    const newMarker: MarkerData = { x: clamp01(x), y: clamp01(y), timestamp, position: selectedPosition };
    commit(prev => [...prev, newMarker]);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    placeMarkerAt(e.clientX, e.clientY);
  };

  const removeMarker = (idx: number) => commit(prev => prev.filter((_, i) => i !== idx));

  /** ---- Scrubbing ---- */
  const applyScrubFromClientX = useCallback((clientX: number) => {
    if (!timelineRef.current || !videoRef.current || !duration) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const ratio = clamp01((clientX - rect.left) / rect.width);
    const t = ratio * duration;
    setCurrentTime(t);
    videoRef.current.currentTime = t;
  }, [duration]);

  const onTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsScrubbing(true);
    applyScrubFromClientX(e.clientX);

    const onMove = (ev: MouseEvent) => applyScrubFromClientX(ev.clientX);
    const onUp = () => {
      setIsScrubbing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onTimelineTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsScrubbing(true);
    const touch = e.touches[0];
    applyScrubFromClientX(touch.clientX);

    const onMove = (ev: TouchEvent) => {
      if (ev.touches.length > 0) applyScrubFromClientX(ev.touches[0].clientX);
    };
    const onEnd = () => {
      setIsScrubbing(false);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
  };

  /** ---- Keyboard shortcuts ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (!videoRef.current) return;

      const isMod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (key === ' ' || key === 'spacebar') {
        e.preventDefault();
        if (videoRef.current.paused) videoRef.current.play();
        else videoRef.current.pause();
        setIsPlaying(!videoRef.current.paused);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        nudge(e.shiftKey ? -5 : -2);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nudge(e.shiftKey ? +5 : +2);
      } else if (isMod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (isMod && key === 'y') {
        e.preventDefault();
        redo();
      } else if (key === 'm') {
        setShowMarkers((s) => !s);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  /** ---- Draft: load availability on mount / video change ---- */
  useEffect(() => {
    try {
      // Try working draft first
      let raw = localStorage.getItem(DRAFT_KEY);
      // If none, fall back to the last submitted snapshot
      if (!raw) raw = localStorage.getItem(LAST_SUBMITTED_KEY);

      if (!raw) {
        setAvailableDraft(null);
      } else {
        const draft = JSON.parse(raw) as DraftPayload;
        setAvailableDraft(draft);
      }
    } catch {
      setAvailableDraft(null);
    } finally {
      // allow autosave after the very first load pass
      skipFirstWriteRef.current = false;
    }
  }, [videoSrc]);

  /** ---- Draft: immediate save on important state ---- */
  const writeDraft = useCallback((ct: number) => {
    const payload: DraftPayload = {
      markers,
      activeGroup,
      selectedPosition,
      currentTime: ct,
      videoSrc,
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch {}
  }, [markers, activeGroup, selectedPosition, videoSrc]);

  useEffect(() => {
    if (skipFirstWriteRef.current) return; // avoid clobbering a real draft on first mount
    writeDraft(currentTime);
  }, [markers, activeGroup, selectedPosition, videoSrc, writeDraft, currentTime]);

  /** ---- Draft: debounce currentTime saves only ---- */
  useEffect(() => {
    if (skipFirstWriteRef.current) return;
    if (timeSaveTimerRef.current) clearTimeout(timeSaveTimerRef.current);
    timeSaveTimerRef.current = setTimeout(() => {
      writeDraft(currentTime);
      timeSaveTimerRef.current = null;
    }, 750);
    return () => {
      if (timeSaveTimerRef.current) {
        clearTimeout(timeSaveTimerRef.current);
        timeSaveTimerRef.current = null;
      }
    };
  }, [currentTime, writeDraft]);

  /** ---- Leave-page guard when unsent markers exist ---- */
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasSubmitted && markers.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [markers.length, hasSubmitted]);

  /** ---- Restore & Discard draft ---- */
  const restoreDraft = () => {
    if (!availableDraft) return;
    const d = availableDraft;

    const safeMarkers = (d.markers || []).map(m => ({
      x: clamp01(Number(m.x)),
      y: clamp01(Number(m.y)),
      timestamp: Math.max(0, Number(m.timestamp) || 0),
      position: BY_VALUE.has(m.position) ? m.position : 'QB',
    })) as MarkerData[];

    setActiveGroup(d.activeGroup || 'offense');
    setSelectedPosition(BY_VALUE.has(d.selectedPosition) ? d.selectedPosition : 'QB');
    commit(() => safeMarkers);

    if (videoRef.current && videoLoaded) {
      const t = Math.max(0, Math.min(d.currentTime || 0, duration || 0));
      videoRef.current.currentTime = t;
      setCurrentTime(t);
    } else {
      pendingSeekRef.current = d.currentTime || 0;
    }

    // after restoring, re-save as the new working draft
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, savedAt: Date.now() })); } catch {}
    setAvailableDraft(null);
  };

  const discardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(LAST_SUBMITTED_KEY);
    } catch {}
    setAvailableDraft(null);
  };

  /** ---- Export / Import JSON ---- */
  const exportMarkers = () => {
    const data: DraftPayload = {
      markers,
      activeGroup,
      selectedPosition,
      currentTime,
      videoSrc,
      savedAt: Date.now(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `markers-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const importMarkersFromFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result || '{}')) as Partial<DraftPayload>;
        if (!json || !Array.isArray(json.markers)) throw new Error('Invalid file format.');

        const safeMarkers = json.markers.map((m: any) => ({
          x: clamp01(Number(m.x)),
          y: clamp01(Number(m.y)),
          timestamp: Math.max(0, Number(m.timestamp) || 0),
          position: BY_VALUE.has(m.position) ? m.position : 'QB',
        })) as MarkerData[];

        if (safeMarkers.length === 0) throw new Error('No markers in file.');

        setActiveGroup((json.activeGroup as GroupKey) || 'offense');
        setSelectedPosition(BY_VALUE.has(json.selectedPosition || '') ? String(json.selectedPosition) : 'QB');
        commit(() => safeMarkers);

        const t = Math.max(0, Number(json.currentTime) || 0);
        if (videoRef.current && videoLoaded) {
          const tt = Math.min(t, duration || 0);
          videoRef.current.currentTime = tt;
          setCurrentTime(tt);
        } else {
          pendingSeekRef.current = t;
        }

        // Save imported as working draft
        try {
          const payload: DraftPayload = {
            markers: safeMarkers,
            activeGroup: (json.activeGroup as GroupKey) || 'offense',
            selectedPosition: BY_VALUE.has(json.selectedPosition || '') ? String(json.selectedPosition) : 'QB',
            currentTime: t,
            videoSrc,
            savedAt: Date.now(),
          };
          localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
        } catch {}

        alert(`Imported ${safeMarkers.length} marker${safeMarkers.length > 1 ? 's' : ''}.`);
      } catch (err: any) {
        alert(err?.message || 'Failed to import markers.');
      }
    };
    reader.onerror = () => alert('Could not read the file.');
    reader.readAsText(file);
  };

  /** ---- Reset on video change ---- */
  useEffect(() => {
    setMarkers([]);
    setUndoStack([]);
    setRedoStack([]);
    setIsPlaying(false);
    setShowMarkers(true);
    setVideoLoaded(false);
    setVideoError(null);
    setDuration(0);
    setCurrentTime(0);
    setActiveGroup('offense');
    setSelectedPosition('QB');
    setHasSubmitted(false);
    pendingSeekRef.current = null;
    if (timeSaveTimerRef.current) {
      clearTimeout(timeSaveTimerRef.current);
      timeSaveTimerRef.current = null;
    }
    // ensure first autosave after a fresh mount waits until loader runs
    skipFirstWriteRef.current = true;
  }, [videoSrc]);

  /** ---- UI helpers ---- */
  const positionsForActive = useMemo(
    () => POSITION_GROUPS.find(pg => pg.key === activeGroup)!.positions,
    [activeGroup]
  );
  const selectedMeta = BY_VALUE.get(selectedPosition);
  const colorCls = GROUP_COLOR_CLASSES[activeGroup];

  // Mobile sticky submit visibility
  const stickyActive = true;

  /** ---- Submit ---- */
  const submit = () => {
    setHasSubmitted(true);

    // snapshot the current session as "last submitted"
    try {
      const payload: DraftPayload = {
        markers,
        activeGroup,
        selectedPosition,
        currentTime,
        videoSrc,
        savedAt: Date.now(),
      };
      localStorage.setItem(LAST_SUBMITTED_KEY, JSON.stringify(payload));
      // NOTE: we intentionally do NOT remove DRAFT_KEY so user can restore immediately
    } catch {}

    onMarkersSubmit(markers);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${stickyActive ? 'pb-24 md:pb-0' : ''}`}>
      <div className="bg-slate-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-lg font-semibold">Place Player Markers</h3>

          {/* Undo / Redo + Export/Import */}
          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={!undoStack.length}
              className="h-10 min-w-[40px] px-3 rounded bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              title="Undo (Ctrl/Cmd+Z)"
              aria-label="Undo"
            >
              <RotateCcw className="w-5 h-5" aria-hidden />
            </button>
            <button
              onClick={redo}
              disabled={!redoStack.length}
              className="h-10 min-w-[40px] px-3 rounded bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              title="Redo (Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z)"
              aria-label="Redo"
            >
              <RotateCw className="w-5 h-5" aria-hidden />
            </button>

            <button
              onClick={exportMarkers}
              className="h-10 min-w-[40px] px-3 rounded bg-slate-700 text-white hover:bg-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              title="Export markers (JSON)"
              aria-label="Export markers"
            >
              <Download className="w-5 h-5" aria-hidden />
            </button>

            <button
              onClick={() => importInputRef.current?.click()}
              className="h-10 min-w-[40px] px-3 rounded bg-slate-700 text-white hover:bg-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              title="Import markers (JSON)"
              aria-label="Import markers"
            >
              <UploadIcon className="w-5 h-5" aria-hidden />
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importMarkersFromFile(f);
                e.currentTarget.value = '';
              }}
            />
          </div>
        </div>

        {/* Draft banner */}
        {availableDraft && (
          <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 text-amber-900 p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" aria-hidden />
              <div className="text-sm">
                Draft available ({relativeAge(availableDraft.savedAt)}). Restore your last markers?
              </div>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={restoreDraft}
                  className="px-3 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                >
                  Restore
                </button>
                <button
                  onClick={discardDraft}
                  className="px-3 py-1 rounded border border-amber-400 text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                >
                  Discard
                </button>
              </div>
            </div>
            {availableDraft.videoSrc && (
              <p className="text-xs mt-1 text-amber-900/80">
                FYI: Saved against a previous video reference; timestamps may not align with a different clip.
              </p>
            )}
          </div>
        )}

        {/* Group tabs */}
        <div className="flex flex-wrap gap-2 mb-3" role="tablist" aria-label="Unit selection">
          {POSITION_GROUPS.map(g => (
            <button
              key={g.key}
              role="tab"
              aria-selected={activeGroup === g.key}
              aria-controls={`panel-${g.key}`}
              id={`tab-${g.key}`}
              onClick={() => {
                setActiveGroup(g.key as GroupKey);
                if (!g.positions.some(p => p.value === selectedPosition)) {
                  setSelectedPosition(g.positions[0].value);
                }
              }}
              className={`h-10 px-3 rounded-md text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                activeGroup === g.key
                  ? 'bg-slate-100 text-slate-900 border-slate-300'
                  : 'bg-slate-700 text-slate-100 border-slate-600 hover:bg-slate-600'
              }`}
            >
              {g.title}
            </button>
          ))}
        </div>

        {/* Position selector */}
        <div id={`panel-${activeGroup}`} role="tabpanel" aria-labelledby={`tab-${activeGroup}`} className="flex flex-wrap gap-2 mb-4">
          {positionsForActive.map((pos) => {
            const active = selectedPosition === pos.value;
            return (
              <button
                key={pos.value}
                onClick={() => setSelectedPosition(pos.value)}
                className={`h-10 px-3 rounded-md text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                  active
                    ? `${colorCls.btnBg} ${colorCls.btnBorder} text-white`
                    : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'
                }`}
                title={pos.label}
                aria-pressed={active}
                aria-label={`Position: ${pos.label}`}
              >
                {pos.value}
              </button>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 text-slate-200">
          <button
            onClick={() => nudge(-2)}
            className="h-10 min-w-[40px] px-3 rounded bg-slate-600 hover:bg-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            aria-label="Jump back 2 seconds"
            title="Jump back 2s (Shift = 5s)"
          >
            <SkipBack className="w-5 h-5" aria-hidden />
          </button>
          <button
            onClick={handlePlayPause}
            className="h-10 min-w-[40px] px-3 rounded bg-slate-600 hover:bg-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            aria-label={isPlaying ? 'Pause video' : 'Play video'}
            title="Space to play/pause"
          >
            {isPlaying ? <Pause className="w-5 h-5" aria-hidden /> : <Play className="w-5 h-5" aria-hidden />}
          </button>
          <button
            onClick={() => nudge(+2)}
            className="h-10 min-w-[40px] px-3 rounded bg-slate-600 hover:bg-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            aria-label="Jump forward 2 seconds"
            title="Jump forward 2s (Shift = 5s)"
          >
            <SkipForward className="w-5 h-5" aria-hidden />
          </button>

          <button
            onClick={() => setShowMarkers((s) => !s)}
            className="ml-auto h-10 min-w-[40px] px-3 rounded bg-slate-600 hover:bg-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            title="Toggle markers (M)"
            aria-pressed={showMarkers}
            aria-label="Toggle markers overlay"
          >
            <Target className="w-5 h-5" aria-hidden />
          </button>
        </div>
      </div>

      {/* Video area with click-catcher overlay */}
      <div
        ref={containerRef}
        className="relative bg-black"
        aria-label={`Video frame — click to add ${(selectedMeta ? selectedMeta.label : 'player')} at current time`}
      >
        {!videoError ? (
          <>
            {/* The video does NOT receive pointer events, so clicks won't toggle play */}
            <video
              ref={videoRef}
              className="w-full pointer-events-none"
              src={videoSrc}
              onLoadedMetadata={handleLoadedMetadata}
              onLoadedData={() => setVideoLoaded(true)}
              onError={handleVideoError}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
              playsInline
              aria-label="Marker placement video"
            />
            {/* Transparent overlay that handles marker placement */}
            <div
              onClick={handleOverlayClick}
              className="absolute inset-0 z-10"
              style={{ cursor: 'crosshair' }}
              role="button"
              aria-label="Click to place a marker"
              tabIndex={-1}
            />
          </>
        ) : (
          <div className="w-full h-64 flex flex-col items-center justify-center text-center text-slate-100 bg-slate-900">
            <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" aria-hidden />
            <p className="max-w-md px-4">{videoError}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => { setVideoError(null); videoRef.current?.load(); }}
                className="px-3 py-2 rounded bg-slate-700 text-white hover:bg-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 inline-flex items-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" /> Retry
              </button>
              <a
                href="#upload"
                className="px-3 py-2 rounded border border-slate-600 text-slate-100 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                Go Back to Upload
              </a>
            </div>
          </div>
        )}

        {/* <<< Memoized overlay to avoid re-renders on time ticks >>> */}
        <MarkersOverlay markers={markers} show={showMarkers} videoLoaded={videoLoaded} />
      </div>

      {/* Timeline Scrubber */}
      <div className="px-4 py-3 bg-white border-t border-slate-200">
        <p id="timeline-help" className="sr-only">
          Use the timeline slider to scrub the video. Click or drag to seek. Arrow keys: left/right to nudge, hold Shift for larger steps.
        </p>
        <div
          ref={timelineRef}
          className="relative h-5 md:h-4 bg-slate-200 rounded-md cursor-pointer select-none touch-none"
          onMouseDown={onTimelineMouseDown}
          onTouchStart={onTimelineTouchStart}
          role="slider"
          aria-label="Timeline scrubber"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={duration || 0}
          aria-valuenow={currentTime}
          aria-describedby="timeline-help"
        >
          <div
            className="absolute left-0 top-0 bottom-0 bg-green-600 rounded-md"
            style={{ width: `${pct * 100}%` }}
            aria-hidden
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 md:w-5 md:h-5 bg-green-600 rounded-full border-2 border-white shadow"
            style={{ left: `${pct * 100}%` }}
            aria-hidden
          />
          {markers.length > 0 && duration > 0 && markers.map((m, i) => {
            const mPct = (m.timestamp / duration) * 100;
            return (
              <div
                key={`tick-${i}-${m.timestamp}`}
                className="absolute top-0 bottom-0 w-[3px] md:w-[2px] bg-black/40"
                style={{ left: `${mPct}%` }}
                title={`${BY_VALUE.get(m.position)?.label ?? m.position} @ ${formatTime(m.timestamp)}`}
                aria-hidden
              />
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-slate-600 mt-1" aria-live="off">
          <span aria-label="Current time">{formatTime(currentTime)}</span>
          <span aria-label="Video duration">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Marker List + Submit (desktop/tablet) */}
      <div className="p-4 hidden md:block">
        {markers.length > 0 && (
          <div className="mb-4" role="region" aria-label="Placed markers">
            <div className="text-slate-700 font-medium mb-2">Markers</div>
            <ul className="flex flex-wrap gap-2">
              {markers.map((marker, index) => {
                const meta = BY_VALUE.get(marker.position);
                return (
                  <li key={index} className="bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-300">
                    <span className="font-semibold">{marker.position}</span>{' '}
                    <span className="text-xs opacity-75">
                      ({meta?.label ?? 'Unknown'}) @{formatTime(marker.timestamp)}
                    </span>
                    <button
                      onClick={() => removeMarker(index)}
                      className="ml-2 h-8 min-w-[32px] px-2 rounded text-red-600 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      aria-label={`Remove marker ${index + 1}`}
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <button
          onClick={submit}
          disabled={markers.length === 0 || isSubmitting || !videoLoaded}
          aria-disabled={markers.length === 0 || isSubmitting || !videoLoaded}
          className="w-full h-12 bg-slate-800 text-white rounded-md font-medium hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        >
          {isSubmitting ? 'Submitting for Analysis…' : `Submit ${markers.length} Marker${markers.length > 1 ? 's' : ''} for Analysis`}
        </button>

        <p className="text-xs text-slate-500 mt-2 text-center">
          Shortcuts: <strong>Space</strong> play/pause · <strong>←/→</strong> ±2s (<strong>Shift</strong> = ±5s) ·
          <strong> Ctrl/Cmd+Z</strong> undo · <strong>Ctrl/Cmd+Y</strong> or <strong>Ctrl/Cmd+Shift+Z</strong> redo · <strong>M</strong> toggle markers
        </p>
      </div>

      {/* Sticky Submit (mobile) */}
      <div
        className="fixed md:hidden bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 p-3 z-50"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
        role="region"
        aria-label="Submit markers"
      >
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="text-sm text-slate-600">
            {markers.length > 0 ? `${markers.length} marker${markers.length > 1 ? 's' : ''}` : 'No markers yet'}
          </div>
          <button
            onClick={submit}
            disabled={markers.length === 0 || isSubmitting || !videoLoaded}
            aria-disabled={markers.length === 0 || isSubmitting || !videoLoaded}
            className="ml-auto h-12 px-5 rounded-md bg-slate-800 text-white font-medium hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 inline-flex items-center gap-2"
          >
            {isSubmitting ? 'Submitting…' : 'Submit for Analysis'}
          </button>
        </div>
      </div>
    </div>
  );
};