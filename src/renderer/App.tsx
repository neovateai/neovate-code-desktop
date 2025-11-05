import React from 'react'

declare global {
  interface Window {
    electron?: {
      platform: string
      versions: {
        node: string
        chrome: string
        electron: string
      }
    }
  }
}

function App() {
  const electron = window.electron

  return (
    <div style={{
      padding: '3rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
        Hello World
      </h1>
      <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '2rem' }}>
        Welcome to neovate-code-desktop
      </p>

      {electron && (
        <div style={{
          backgroundColor: '#f5f5f5',
          padding: '1.5rem',
          borderRadius: '8px',
          fontFamily: 'monospace'
        }}>
          <h2 style={{ marginTop: 0, fontSize: '1.2rem' }}>System Info:</h2>
          <p><strong>Platform:</strong> {electron.platform}</p>
          <p><strong>Node:</strong> {electron.versions.node}</p>
          <p><strong>Chrome:</strong> {electron.versions.chrome}</p>
          <p><strong>Electron:</strong> {electron.versions.electron}</p>
        </div>
      )}
    </div>
  )
}

export default App
