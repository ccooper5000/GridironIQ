import { useState, useCallback } from 'react';
import { VideoUpload, MarkerData, PlayAnalysis, Player } from '../types';

const randomPick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

// Mock generator for demo
const generateMockAnalysis = (upload: VideoUpload, markers: MarkerData[], blobUrl: string): PlayAnalysis => {
  const players: Player[] = markers.map((marker, index) => {
    const accelProfiles = ['explosive burst', 'steady build-up', 'late acceleration', 'controlled acceleration'];
    const baseStats = {
      topSpeed: +(15 + Math.random() * 10).toFixed(1),
      avgSpeed: +(8 + Math.random() * 6).toFixed(1),
      distanceCovered: +(10 + Math.random() * 30).toFixed(1),
      timeToTopSpeed: +(1 + Math.random() * 2).toFixed(2),
      accelProfile: randomPick(accelProfiles),
      reactionTime: +(0.2 + Math.random() * 0.4).toFixed(2),
    };

    const pos = marker.position;
    const isOffense = ['QB', 'RB', 'WR', 'TE', 'OL'].includes(pos);
    const positionExtras: Partial<Player['stats']> = {};

    if (pos === 'WR' || pos === 'TE') {
      positionExtras.separation = +(0.5 + Math.random() * 3.5).toFixed(1);
      positionExtras.receptions = Math.floor(Math.random() * 3);
    }
    if (pos === 'OL') {
      positionExtras.blockWinRate = +(65 + Math.random() * 25).toFixed(0);
    }
    if (['LB', 'CB', 'S'].includes(pos)) {
      positionExtras.tackles = Math.floor(Math.random() * 5);
    }

    return {
      id: `${pos}-${index}`,
      position: pos,
      name: `Player ${index + 1}`,
      teamSide: isOffense ? 'offense' : 'defense',
      stats: { ...baseStats, ...positionExtras },
      trackData: [], // placeholder for future tracking
      marker,
    };
  });

  return {
    videoId: `video-${Date.now()}`,
    playName: upload.metadata.playName,
    downDistance: upload.metadata.downDistance,
    situation: upload.metadata.situation,
    players,
    processingStatus: 'completed',
    videoUrl: blobUrl,
  };
};

export const usePlayAnalysis = () => {
  const [currentAnalysis, setCurrentAnalysis] = useState<PlayAnalysis | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const submitForAnalysis = useCallback(async (upload: VideoUpload, markers: MarkerData[], blobUrl?: string) => {
    setIsProcessing(true);

    const url = blobUrl ?? URL.createObjectURL(upload.file);

    const initialAnalysis: PlayAnalysis = {
      videoId: `video-${Date.now()}`,
      playName: upload.metadata.playName,
      downDistance: upload.metadata.downDistance,
      situation: upload.metadata.situation,
      players: [],
      processingStatus: 'processing',
      videoUrl: url,
    };

    setCurrentAnalysis(initialAnalysis);

    // Simulate a server processing delay
    setTimeout(() => {
      const completed = generateMockAnalysis(upload, markers, url);
      setCurrentAnalysis(completed);
      setIsProcessing(false);
    }, 3000);
  }, []);

  const clearAnalysis = useCallback(() => {
    setCurrentAnalysis(null);
    setIsProcessing(false);
  }, []);

  return {
    currentAnalysis,
    isProcessing,
    submitForAnalysis,
    clearAnalysis,
  };
};
