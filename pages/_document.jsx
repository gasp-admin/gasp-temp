import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="es">
      <Head>
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1B6B35" />
        <meta name="application-name" content="GASP Temp" />

        {/* iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="GASP Temp" />

        {/* Apple icons — usar los que existen en el repo */}
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />

        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="shortcut icon" href="/icons/favicon-32x32.png" />

        {/* Android / Chrome */}
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Descripción */}
        <meta name="description" content="Gestión de Alquileres Temporarios" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
