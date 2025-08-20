import type { MarkerData, JobResponse } from './types'

const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000'

export async function createJob(payload: { videoSrc?: string | null; markers: MarkerData[] }): Promise<JobResponse> {
  const res = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Create job failed: ${res.status}`)
  return res.json()
}

export async function getJob(id: string): Promise<JobResponse> {
  const res = await fetch(`${API_BASE}/jobs/${id}`)
  if (!res.ok) throw new Error(`Get job failed: ${res.status}`)
  return res.json()
}
