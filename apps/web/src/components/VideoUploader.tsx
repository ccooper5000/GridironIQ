import React, { useState, useRef, useEffect } from 'react';
import { Upload, Film, AlertCircle, Loader } from 'lucide-react';
import { VideoUpload } from '../types';
import { useToast } from './Toast';

interface VideoUploaderProps {
  onUpload: (upload: VideoUpload) => void;
  isProcessing?: boolean;
}

const MAX_SIZE_MB = 500; // tweak as needed

export const VideoUploader: React.FC<VideoUploaderProps> = ({ onUpload, isProcessing = false }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [metadata, setMetadata] = useState({
    gameName: '',
    playName: '',
    downDistance: '',
    situation: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { push: toast } = useToast();

  // IDs for a11y relationships
  const ids = {
    gameName: 'gameName',
    playName: 'playName',
    downDistance: 'downDistance',
    situation: 'situation',
    dropzone: 'dropzone',
    dropDesc: 'drop-desc',
    dropHelp: 'drop-help',
    progressLive: 'progress-live',
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [previewUrl]);

  const clearProgressInterval = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const validateFile = (file: File) => {
    const isVideo = file.type.startsWith('video/');
    const isKnownExt = /\.(mp4|webm|mov)$/i.test(file.name);
    if (!isVideo && !isKnownExt) {
      toast('Unsupported file. Please upload MP4, WebM, or MOV.');
      return false;
    }
    const sizeMb = file.size / 1024 / 1024;
    if (sizeMb > MAX_SIZE_MB) {
      toast(`File is ${sizeMb.toFixed(1)}MB. Max allowed is ${MAX_SIZE_MB}MB.`);
      return false;
    }
    return true;
  };

  const handleFiles = (files: FileList) => {
    const file = files?.[0];
    if (!file) return;
    if (!validateFile(file)) return;

    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    toast(`Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
  };

  const openFileDialog = () => fileInputRef.current?.click();

  const handleDropzoneKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openFileDialog();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !metadata.gameName || !metadata.playName) {
      toast('Please select a video and fill required fields.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    toast('Uploading started…');

    // Simulated upload progress
    progressIntervalRef.current = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearProgressInterval();
          return 90;
        }
        const next = prev + Math.random() * 15;
        return next > 90 ? 90 : next;
      });
    }, 200);

    // Simulate server finishing
    setTimeout(() => {
      clearProgressInterval();
      setUploadProgress(100);

      onUpload({ file: selectedFile, metadata });

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        toast('Upload complete. Proceed to place markers.');
      }, 400);
    }, 2000);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <Film className="w-16 h-16 text-slate-700 mx-auto mb-4" aria-hidden />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Upload Game Film</h2>
        <p className="text-slate-600" id={ids.dropDesc}>
          Upload your game footage to begin performance analysis
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" aria-busy={isUploading || isProcessing}>
        {/* File Upload Area */}
        <div
          id={ids.dropzone}
          role="button"
          tabIndex={0}
          aria-describedby={`${ids.dropDesc} ${ids.dropHelp}`}
          aria-label="Choose a video file to upload"
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
            dragActive
              ? 'border-green-500 bg-green-50'
              : selectedFile
              ? 'border-green-400 bg-green-50'
              : 'border-slate-300 hover:border-slate-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onKeyDown={handleDropzoneKey}
          onClick={openFileDialog}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-hidden
            tabIndex={-1}
          />

          {selectedFile ? (
            <div className="space-y-2">
              <Film className="w-12 h-12 text-green-600 mx-auto" aria-hidden />
              <p className="text-green-700 font-medium">{selectedFile.name}</p>
              <p className="text-sm text-slate-600">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-12 h-12 text-slate-400 mx-auto" aria-hidden />
              <p className="text-slate-600">
                <span className="font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-sm text-slate-500" id={ids.dropHelp}>
                Accepted: MP4, MOV, WebM • Max {MAX_SIZE_MB}MB • Tip: Trim clips to a single play
              </p>
            </div>
          )}
        </div>

        {/* Inline Video Preview */}
        {previewUrl && (
          <div className="mt-2">
            <video
              className="w-full rounded-md"
              controls
              playsInline
              src={previewUrl}
              aria-label="Preview of selected video"
            />
          </div>
        )}

        {/* Metadata Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor={ids.gameName} className="block text-sm font-medium text-slate-700 mb-2">
              Game Name <span aria-hidden>*</span>
            </label>
            <input
              id={ids.gameName}
              type="text"
              required
              value={metadata.gameName}
              onChange={(e) => setMetadata({ ...metadata, gameName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="e.g., vs Eagles — Week 5"
              aria-describedby={`${ids.gameName}-help`}
            />
            <p id={`${ids.gameName}-help`} className="text-xs text-slate-500 mt-1">
              Include opponent & week if helpful.
            </p>
          </div>

          <div>
            <label htmlFor={ids.playName} className="block text-sm font-medium text-slate-700 mb-2">
              Play Name <span aria-hidden>*</span>
            </label>
            <input
              id={ids.playName}
              type="text"
              required
              value={metadata.playName}
              onChange={(e) => setMetadata({ ...metadata, playName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="e.g., Red Zone Slant"
              aria-describedby={`${ids.playName}-help`}
            />
            <p id={`${ids.playName}-help`} className="text-xs text-slate-500 mt-1">
              A short label helps you find this play later.
            </p>
          </div>

          <div>
            <label htmlFor={ids.downDistance} className="block text-sm font-medium text-slate-700 mb-2">
              Down &amp; Distance
            </label>
            <input
              id={ids.downDistance}
              type="text"
              value={metadata.downDistance}
              onChange={(e) => setMetadata({ ...metadata, downDistance: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="e.g., 1st & 10"
            />
          </div>

          <div>
            <label htmlFor={ids.situation} className="block text-sm font-medium text-slate-700 mb-2">
              Play Situation
            </label>
            <select
              id={ids.situation}
              value={metadata.situation}
              onChange={(e) => setMetadata({ ...metadata, situation: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Select situation</option>
              <option value="redzone">Red Zone</option>
              <option value="third-down">3rd Down</option>
              <option value="goal-line">Goal Line</option>
              <option value="two-minute">Two Minute Drill</option>
              <option value="regular">Regular Play</option>
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!selectedFile || !metadata.gameName || !metadata.playName || isProcessing || isUploading}
          aria-disabled={!selectedFile || !metadata.gameName || !metadata.playName || isProcessing || isUploading}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-md font-medium hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 relative overflow-hidden"
        >
          {isUploading && (
            <div
              className="absolute left-0 top-0 bottom-0 bg-green-700 transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
              aria-hidden
            />
          )}
          <span className="relative z-10 flex items-center justify-center gap-2">
            {isUploading && <Loader className="w-4 h-4 animate-spin" aria-hidden />}
            {isUploading ? `Uploading... ${Math.round(uploadProgress)}%` :
             isProcessing ? 'Processing...' :
             'Upload & Begin Analysis'}
          </span>
        </button>

        {/* Upload Progress (visible + live text for SR) */}
        {isUploading && (
          <div className="mt-4" aria-live="polite" id={ids.progressLive}>
            <div className="flex justify-between text-sm text-slate-600 mb-2">
              <span>Uploading {selectedFile?.name}</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(uploadProgress)}>
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Large files may take a moment to process…
            </p>
          </div>
        )}

        <div className="flex items-center justify-center text-sm text-slate-500">
          <AlertCircle className="w-4 h-4 mr-2" aria-hidden />
          {selectedFile && selectedFile.size > 100 * 1024 * 1024
            ? 'Large files may take extra time to upload and process.'
            : 'Analysis typically takes 2–5 minutes depending on video length.'}
        </div>
      </form>
    </div>
  );
};