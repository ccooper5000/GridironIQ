import React, { useState } from 'react'
import { createJob, getJob } from './api'
import type { MarkerData, JobResponse } from './types'
import { supabase } from './lib/supabaseClient'

export default function App() {
  const [markers, setMarkers] = useState<MarkerData[]>([
    // demo payload
    { x: 0.5, y: 0.5, timestamp: 12.3, position: 'QB' }
  ])
  const [job, setJob] = useState<JobResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreateJob() {
    setLoading(true)
    setError(null)
    try {
      const j = await createJob({ videoSrc: null, markers })
      setJob(j)
    } catch (e: any) {
      setError(e?.message || 'Failed to create job')
    } finally {
      setLoading(false)
    }
  }

  async function handlePoll() {
    if (!job) return
    setLoading(true)
    setError(null)
    try {
      const j = await getJob(job.id)
      setJob(j)
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch job')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <h1>GridIronIQ</h1>
      <p>Minimal skeleton wired to a FastAPI backend. Replace this with your full UI.</p>

      <section style={{ marginTop: 24 }}>
        <h2>Demo: submit & poll a job</h2>
        <button onClick={handleCreateJob} disabled={loading} style={{ padding: '8px 12px' }}>Create Job</button>
        <button onClick={handlePoll} disabled={!job || loading} style={{ padding: '8px 12px', marginLeft: 8 }}>Poll Job</button>
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        {job && (
          <pre style={{ background: '#111', color: '#eee', padding: 12, borderRadius: 8, overflowX: 'auto' }}>
            {JSON.stringify(job, null, 2)}
          </pre>
        )}
      </section>

      <footer style={{ marginTop: 64, fontSize: 12, color: '#667' }}>
        © {new Date().getFullYear()} GridIronIQ — All rights reserved.
      </footer>
    </div>
  )
}
