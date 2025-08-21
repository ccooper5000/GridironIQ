import React, { useState } from 'react';
import { VideoUploader } from './components/VideoUploader';
import { VideoMarker } from './components/VideoMarker';
import { ProcessingStatus } from './components/ProcessingStatus';
import { PlayerAnalysis } from './components/PlayerAnalysis';
import { AboutModal } from './components/AboutModal';
import { usePlayAnalysis } from './hooks/usePlayAnalysis';
import { VideoUpload, MarkerData } from './types';
import { BarChart3, ArrowLeft, Home, Settings, AlertCircle, Info } from 'lucide-react';
import { getBuildInfo } from './utils/buildInfo';

type AppState = 'upload' | 'marker' | 'analysis';

function App() {
  const [currentState, setCurrentState] = useState<AppState>('upload');
  const [uploadedVideo, setUploadedVideo] = useState<VideoUpload | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const { currentAnalysis, isProcessing, submitForAnalysis, clearAnalysis } = usePlayAnalysis();

  const [showAbout, setShowAbout] = useState(false);
  const build = getBuildInfo();

  const handleVideoUpload = (upload: VideoUpload) => {
    setUploadedVideo(upload);
    const url = URL.createObjectURL(upload.file);
    setVideoUrl(url);
    setCurrentState('marker');
  };

  const handleMarkersSubmit = async (markers: MarkerData[]) => {
    if (uploadedVideo) {
      await submitForAnalysis(uploadedVideo, markers, videoUrl ?? undefined);
      setCurrentState('analysis');
    }
  };

  const handleBackToUpload = () => {
    setCurrentState('upload');
    setUploadedVideo(null);
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
    clearAnalysis();
  };

  const handleBackToMarker = () => {
    if (uploadedVideo) setCurrentState('marker');
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-slate-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-green-500" />
              <h1 className="text-xl font-bold">GridironIQ</h1>
              <span className="text-xs bg-green-600 px-2 py-1 rounded-full">BETA</span>
            </div>
            <nav className="flex items-center gap-2 sm:gap-4">
              {currentState !== 'upload' && (
                <button
                  onClick={handleBackToUpload}
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-700 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Home</span>
                </button>
              )}

              {/* About button for QA */}
              <button
                onClick={() => setShowAbout(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-700 transition-colors"
                title="About this build"
                aria-label="About this build"
              >
                <Info className="w-5 h-5" />
                <span className="hidden sm:inline">About</span>
              </button>

              <button className="p-2 rounded-md hover:bg-slate-700 transition-colors" title="Settings">
                <Settings className="w-5 h-5" />
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="text-sm text-slate-600">
            {currentState === 'upload' && <span>Upload</span>}
            {currentState === 'marker' && <span>Upload / Marker</span>}
            {currentState === 'analysis' && <span>Upload / Marker / Analysis</span>}
          </nav>
        </div>

        {/* Views */}
        {currentState === 'upload' && (
          <VideoUploader onUpload={handleVideoUpload} isProcessing={isProcessing} />
        )}

        {currentState === 'marker' && (
          videoUrl ? (
            <VideoMarker
              videoSrc={videoUrl}
              onMarkersSubmit={handleMarkersSubmit}
              isSubmitting={isProcessing}
            />
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
              <p className="text-slate-700">No video loaded. Go back and upload a video.</p>
              <button
                onClick={handleBackToUpload}
                className="mt-4 bg-slate-800 text-white px-4 py-2 rounded-md hover:bg-slate-900"
              >
                Back to Upload
              </button>
            </div>
          )
        )}

        {currentState === 'analysis' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToMarker}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Markers
              </button>
            </div>

            {currentAnalysis && currentAnalysis.processingStatus === 'processing' ? (
              <ProcessingStatus status={currentAnalysis.processingStatus} playName={currentAnalysis.playName} />
            ) : currentAnalysis && currentAnalysis.processingStatus === 'completed' ? (
              <PlayerAnalysis
                players={currentAnalysis.players}
                playName={currentAnalysis.playName}
                downDistance={currentAnalysis.downDistance}
              />
            ) : null}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="font-semibold mb-2">About</h4>
              <p className="text-sm text-slate-300">
                GridironIQ helps coaches break down film faster with AI-assisted insights.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Support</h4>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• FAQ</li>
                <li>• Contact</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Legal</h4>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• Terms</li>
                <li>• Privacy</li>
              </ul>
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-8">
            © {new Date().getFullYear()} GridironIQ — All rights reserved.
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            v{build.version} ({build.commit}) • built {build.timeLocal} • {build.mode}
          </div>
        </div>
      </footer>

      <AboutModal open={showAbout} onClose={() => setShowAbout(false)} />
    </div>
  );
}

export default App;