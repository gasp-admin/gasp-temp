import '../styles/globals.css'
import Head from 'next/head'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Login from '../components/Login'

export default function App({ Component, pageProps }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar sesion activa
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Escuchar cambios de sesion
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    // Registrar service worker PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
    }

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#111D13', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5A8A65', fontFamily: 'Arial', fontSize: 14 }}>
      Cargando...
    </div>
  )

  // Si la página es el portal de propietarios, no requiere login
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/propietario')) {
    return (
      <>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#1B6B35" />
        </Head>
        <Component {...pageProps} />
      </>
    )
  }

  if (!user) return <Login onLogin={setUser} />

  return (
    <>
      <Head>
        <meta name="application-name" content="GASP" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="GASP" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#1B6B35" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo.jpeg" />
      </Head>
      <Component {...pageProps} user={user} />
    </>
  )
}
