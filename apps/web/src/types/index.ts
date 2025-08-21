export interface TrackPoint {
  t: number;        // seconds
  x: number;        // 0..1 normalized X on frame
  y: number;        // 0..1 normalized Y on frame
  speed?: number;   // mph (optional)
}

export interface MarkerData {
  x: number;          // 0..1
  y: number;          // 0..1
  timestamp: number;  // seconds
  position: string;   // e.g., 'QB', 'WR', 'CB', etc.
}

export interface PlayerStats {
  topSpeed: number;         // mph
  avgSpeed: number;         // mph
  distanceCovered: number;  // yards
  timeToTopSpeed?: number;  // seconds
  accelProfile: string;     // description label
  reactionTime?: number;    // seconds
  // role-specific optionals
  separation?: number;      // yards (WR/TE)
  tackles?: number;         // DB/LB
  blockWinRate?: number;    // %
  receptions?: number;      // WR/TE/RB
}

export interface Player {
  id: string;
  position: string;
  name: string;
  teamSide: 'offense' | 'defense';
  stats: PlayerStats;
  trackData: TrackPoint[];
  marker: MarkerData;
}

export interface PlayAnalysis {
  videoId: string;
  playName: string;
  downDistance?: string;
  situation?: string;
  players: Player[];
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  processedVideoUrl?: string;
}

export interface VideoUpload {
  file: File;
  metadata: {
    gameName: string;
    playName: string;
    downDistance?: string;
    situation: string;
  };
}
