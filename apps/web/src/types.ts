export type MarkerData = {
  x: number; // 0..1 normalized
  y: number; // 0..1 normalized
  timestamp: number; // seconds
  position: string; // e.g., 'QB', 'WR', etc.
};

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface JobResponse {
  id: string;
  status: JobStatus;
  metrics?: Record<string, unknown>;
  coachingInsight?: string;
}
