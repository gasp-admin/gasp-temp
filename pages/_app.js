import { useEffect } from 'react'
import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(reg => console.log('[GASP] SW registrado:', reg.scope))
        .catch(err => console.error('[GASP] SW error:', err))
    }
  }, [])

  return <Component {...pageProps} />
}
