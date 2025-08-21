export type BuildInfo = {
  version: string;
  commit: string;
  timeIso: string;   // ISO
  timeLocal: string; // pretty local time
  mode: string;      // 'development' | 'production'
};

export function getBuildInfo(): BuildInfo {
  const iso = __BUILD_TIME__;
  const d = new Date(iso);
  return {
    version: __APP_VERSION__,
    commit: __GIT_COMMIT__,
    timeIso: iso,
    timeLocal: isNaN(d.getTime()) ? iso : d.toLocaleString(),
    mode: import.meta.env.MODE,
  };
}