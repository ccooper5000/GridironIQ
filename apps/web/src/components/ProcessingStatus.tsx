import React from 'react';
import { Clock, CheckCircle, AlertTriangle, Loader } from 'lucide-react';

interface ProcessingStatusProps {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  playName: string;
  estimatedTime?: number;
}

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  status,
  playName,
  estimatedTime = 180,
}) => {
  const minutes = Math.floor(estimatedTime / 60);
  const seconds = estimatedTime % 60;

  const descId = 'proc-desc';

  const StatusIcon = () => {
    switch (status) {
      case 'processing': return <Loader className="w-10 h-10 text-green-600 animate-spin" aria-hidden />;
      case 'completed':  return <CheckCircle className="w-10 h-10 text-green-600" aria-hidden />;
      case 'failed':     return <AlertTriangle className="w-10 h-10 text-red-600" aria-hidden />;
      default:           return <Clock className="w-10 h-10 text-slate-500" aria-hidden />;
    }
  };

  const borderColor =
    status === 'processing' ? 'border-green-200' :
    status === 'completed'  ? 'border-green-400' :
    status === 'failed'     ? 'border-red-300'   :
                              'border-slate-200';

  const headline =
    status === 'processing' ? `Processing "${playName}"` :
    status === 'completed'  ? `Analysis Ready: ${playName}` :
    status === 'failed'     ? `Processing Failed: ${playName}` :
                              `Queued: ${playName}`;

  const subtext =
    status === 'processing'
      ? 'Analyzing motion, extracting features, and generating metrics...'
      : status === 'completed'
      ? 'We’ve finished generating metrics for this play.'
      : status === 'failed'
      ? 'We couldn’t process this video. Please verify format/length and try again.'
      : 'Waiting to start. This will begin automatically.';

  return (
    <section
      className={`bg-white rounded-lg shadow-lg border-2 ${borderColor} p-8`}
      aria-live="polite"
      role="status"
      aria-describedby={descId}
    >
      <div className="flex flex-col items-center text-center mb-6">
        <StatusIcon />
        <h2 className="mt-4 text-2xl font-bold text-slate-800">{headline}</h2>
        <p className="text-slate-600 mt-2" id={descId}>{subtext}</p>
      </div>

      {status === 'processing' && (
        <div className="space-y-6">
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden" aria-hidden>
            <div className="h-2 bg-green-600 w-1/3 animate-[progressSlide_1.2s_ease-in-out_infinite]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" aria-hidden>
            {[
              { title: 'Preprocessing', desc: 'Frame sampling & stabilization' },
              { title: 'Detection', desc: 'Player/object detection' },
              { title: 'Tracking', desc: 'Multi-object trajectories' },
              { title: 'Alignment', desc: 'Field calibration & mapping' },
              { title: 'Metrics', desc: 'Speed, accel, separation' },
              { title: 'Report', desc: 'Coaching insights & summary' },
            ].map((step, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-slate-700">{step.title}</div>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </div>
                <div className="text-xs text-slate-500 mt-1">{step.desc}</div>
                <div className="mt-3 space-y-2">
                  <div className="h-3 w-3/4 bg-slate-200 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          <div className="text-xs text-slate-500 text-center">
            Est. time remaining: {minutes}m {seconds}s (varies with clip length)
          </div>
        </div>
      )}

      {status === 'completed' && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-sm text-slate-700 bg-green-50 border border-green-200 rounded px-3 py-2">
            <CheckCircle className="w-4 h-4 text-green-600" aria-hidden />
            Analysis finished. Scroll down to view player metrics.
          </div>
        </div>
      )}

      {status === 'failed' && (
        <div className="text-center space-y-4">
          <div className="text-sm text-red-600">
            Try uploading a shorter clip (e.g., &lt; 2 minutes) in MP4/WebM/MOV.
          </div>
          <div className="flex items-center justify-center gap-3">
            <a
              href="#upload"
              className="bg-slate-800 text-white py-2 px-4 rounded-md font-medium hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              Go Back to Upload
            </a>
          </div>
        </div>
      )}

      {status === 'pending' && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded px-3 py-2">
            <Clock className="w-4 h-4 text-slate-500" aria-hidden />
            Your job is queued. It will start shortly...
          </div>
        </div>
      )}

      <style>{`
        @keyframes progressSlide {
          0%   { transform: translateX(-120%); }
          50%  { transform: translateX(20%); }
          100% { transform: translateX(120%); }
        }
      `}</style>
    </section>
  );
};