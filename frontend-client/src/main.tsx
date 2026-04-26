import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'

// Suppress harmless Chrome extension errors
const maybeChrome = (globalThis as { chrome?: { runtime?: { onMessage?: { addListener: (callback: () => void) => void } } } }).chrome

if (maybeChrome?.runtime?.onMessage?.addListener) {
  maybeChrome.runtime.onMessage.addListener(() => {
    // This suppresses "Unchecked runtime.lastError" warnings
  })
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />
    </GoogleOAuthProvider>
  </StrictMode>,
)
