import { useState, useEffect } from 'react'
import Head from 'next/head'

const G = '#1B6B35'
const B = '#1A3FA0'
const W = '#C07D10'
const D = '#B83030'

const fmt = n => n ? '$' + Number(n).toLocaleString('es-AR') : '$0'
const fmtUSD = n => n ? 'USD ' + Number(n).toLocaleString('es-AR') : 'USD 0'
const fmtM = (n, mon) => mon === 'USD' ? fmtUSD(n) : fmt(n)

function formatFecha(f) {
  if (!f) return '—'
  const [y, m, d] = f.split('-')
  return `${d}/${m}/${y}`
}

export default function PortalPropietarioTemp() {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')

    if (!id) {
      setError('Acceso no autorizado')
      setCargando(false)
      return
    }

    fetch('/api/portal-propietario-temp?id=' + id)
      .then(r => r.json())
      .then(d => {
        if (d.ok) setDatos(d)
        else setError(d.error || 'Acceso no autorizado')
      })
      .catch(() => setError('Error al cargar los datos'))
      .finally(() => setCargando(false))
  }, [])

  if (cargando) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial,sans-serif', color: '#888' }}>
      Cargando...
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial,sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 18, color: D, fontWeight: 'bold', marginBottom: 8 }}>Acceso no autorizado</div>
        <div style={{ fontSize: 13, color: '#888' }}>El link es inválido o expiró. Contacte al administrador.</div>
      </div>
    </div>
  )

  const {
    propietario, propiedades, reservasActivas, historial,
    totalBrutoARS, totalBrutoUSD, totalComisionARS, totalComisionUSD,
    totalNetoARS, totalNetoUSD, pagosRealizados, totalPagadoARS, totalPagadoUSD
  } = datos

  const saldoPendienteARS = totalNetoARS - totalPagadoARS
  const saldoPendienteUSD = totalNetoUSD - totalPagadoUSD
  const liquidacionCompleta = saldoPendienteARS <= 0 && saldoPendienteUSD <= 0 && pagosRealizados.length > 0

  const card = (children, style = {}) => (
    <div style={{ background: '#fff', borderRadius: 10, padding: 18, border: '0.5px solid #E8ECF0', marginBottom: 16, ...style }}>
      {children}
    </div>
  )

  const estadoColor = { 'Confirmada': G, 'Señada': W, 'Pendiente': B, 'Cancelada': D }
  const estadoBg = { 'Confirmada': '#E8F5EE', 'Señada': '#FEF3E2', 'Pendiente': '#E8EEFB', 'Cancelada': '#FCEAEA' }

  return (
    <>
      <Head>
        <title>Portal Propietario — GASP Temporario</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{ fontFamily: 'Arial, sans-serif', minHeight: '100vh', background: '#F5F7FA' }}>

        {/* Header */}
        <div style={{ background: B, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', letterSpacing: 1 }}>GASP</div>
            <div style={{ fontSize: 11, color: '#9DBBF5' }}>Alquileres Temporarios — Portal del Propietario</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: '#9DBBF5' }}>Administrado por:</div>
            <div style={{ fontSize: 13, color: '#fff', fontWeight: 'bold' }}>Javier García Pérez</div>
            <div style={{ fontSize: 11, color: '#9DBBF5' }}>Administrador de Consorcios · Mat. RPAC N° 83</div>
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>

          {/* Datos del propietario */}
          {card(<>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 8 }}>{propietario.apellido_nombre}</div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, color: '#666' }}>
              {propietario.email && <span>✉ {propietario.email}</span>}
              {propietario.telefono && <span>📱 {propietario.telefono}</span>}
              {propietario.cbu && <span style={{ fontFamily: 'monospace', fontSize: 12 }}>CBU: {propietario.cbu}</span>}
              {propietario.banco && <span>🏦 {propietario.banco}</span>}
              {propietario.ciudad_residencia && <span>📍 {propietario.ciudad_residencia}</span>}
            </div>
          </>)}

          {/* Resumen financiero */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
            {totalBrutoARS > 0 && card(<>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>TOTAL COBRADO ARS</div>
              <div style={{ fontSize: 22, fontWeight: 'bold', color: '#1A1A1A' }}>{fmt(totalBrutoARS)}</div>
              <div style={{ fontSize: 12, color: W, marginTop: 4 }}>Comisión: {fmt(totalComisionARS)}</div>
              <div style={{ fontSize: 14, fontWeight: 'bold', color: G, marginTop: 4 }}>Neto: {fmt(totalNetoARS)}</div>
            </>, { marginBottom: 0 })}
            {totalBrutoUSD > 0 && card(<>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>TOTAL COBRADO USD</div>
              <div style={{ fontSize: 22, fontWeight: 'bold', color: B }}>{fmtUSD(totalBrutoUSD)}</div>
              <div style={{ fontSize: 12, color: W, marginTop: 4 }}>Comisión: {fmtUSD(totalComisionUSD)}</div>
              <div style={{ fontSize: 14, fontWeight: 'bold', color: G, marginTop: 4 }}>Neto: {fmtUSD(totalNetoUSD)}</div>
            </>, { marginBottom: 0 })}
          </div>

          {/* Pagos realizados */}
          {pagosRealizados.length > 0 && card(<>
            <div style={{ fontWeight: 'bold', fontSize: 14, color: G, marginBottom: 12 }}>💸 Pagos realizados</div>
            {pagosRealizados.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < pagosRealizados.length - 1 ? '0.5px solid #eee' : 'none', fontSize: 13 }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{p.fecha}</div>
                  <div style={{ color: '#888', fontSize: 12 }}>{p.concepto || 'Transferencia'}</div>
                </div>
                <div style={{ fontWeight: 'bold', color: G }}>{fmtM(p.importe, p.moneda)}</div>
              </div>
            ))}
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #9DDCB4', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold', color: G }}>TOTAL TRANSFERIDO</span>
              <span style={{ fontWeight: 'bold', color: G }}>
                {[totalPagadoARS > 0 ? fmt(totalPagadoARS) : '', totalPagadoUSD > 0 ? fmtUSD(totalPagadoUSD) : ''].filter(Boolean).join(' + ')}
              </span>
            </div>
          </>)}

          {/* Saldo / Liquidación completa */}
          {pagosRealizados.length > 0 && (
            liquidacionCompleta
              ? <div style={{ background: '#E8F5EE', border: '0.5px solid #9DDCB4', borderRadius: 10, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>✅</span>
                  <div>
                    <div style={{ fontWeight: 'bold', color: G, fontSize: 14 }}>Liquidación completa</div>
                    <div style={{ fontSize: 12, color: '#555' }}>No hay saldo pendiente de transferencia.</div>
                  </div>
                </div>
              : <div style={{ background: '#FEF3E2', border: '0.5px solid #E8A951', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
                  <div style={{ fontWeight: 'bold', color: W, fontSize: 14, marginBottom: 6 }}>⏳ Saldo pendiente de transferencia</div>
                  <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
                    {saldoPendienteARS > 0 && <span style={{ fontWeight: 'bold', color: D }}>{fmt(saldoPendienteARS)} ARS</span>}
                    {saldoPendienteUSD > 0 && <span style={{ fontWeight: 'bold', color: D }}>{fmtUSD(saldoPendienteUSD)} USD</span>}
                  </div>
                </div>
          )}

          {/* Propiedades */}
          {card(<>
            <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 12, color: '#1A1A1A' }}>🏠 Mis propiedades</div>
            {propiedades.map((p, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: i < propiedades.length - 1 ? '0.5px solid #eee' : 'none' }}>
                <div style={{ fontWeight: 'bold', fontSize: 14 }}>{p.nombre}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  {p.tipo} · {p.localidad} · {p.capacidad} personas
                  {p.tarifa_semanal_ars > 0 && ` · Tarifa semana: ${fmt(p.tarifa_semanal_ars)}`}
                  {p.tarifa_semanal_usd > 0 && ` / ${fmtUSD(p.tarifa_semanal_usd)}`}
                </div>
              </div>
            ))}
          </>)}

          {/* Reservas activas */}
          {reservasActivas.length > 0 && card(<>
            <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 12, color: G }}>📅 Reservas activas y próximas</div>
            {reservasActivas.map((r, i) => (
              <div key={i} style={{ padding: '12px 0', borderBottom: i < reservasActivas.length - 1 ? '0.5px solid #eee' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: 14 }}>{r.huesped_nombre}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      {r.propiedad_id} · {formatFecha(r.fecha_entrada)} → {formatFecha(r.fecha_salida)} · {r.dias} días
                    </div>
                    {r.huesped_telefono && <div style={{ fontSize: 12, color: '#888' }}>📱 {r.huesped_telefono} · 🏙 {r.huesped_ciudad}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ background: estadoBg[r.estado] || '#F2F4F6', color: estadoColor[r.estado] || '#555', fontSize: 11, padding: '3px 10px', borderRadius: 10, fontWeight: 'bold' }}>{r.estado}</span>
                    <div style={{ fontSize: 14, fontWeight: 'bold', marginTop: 6 }}>{fmtM(r.monto_total, r.moneda)}</div>
                    {Number(r.monto_total) - Number(r.seña) > 0 && (
                      <div style={{ fontSize: 11, color: D }}>Saldo: {fmtM(Number(r.monto_total) - Number(r.seña), r.moneda)}</div>
                    )}
                    <div style={{ fontSize: 12, color: G }}>Neto: {fmtM(r.neto_propietario, r.moneda)}</div>
                  </div>
                </div>
              </div>
            ))}
          </>)}

          {/* Historial */}
          {historial.length > 0 && card(<>
            <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 12 }}>📋 Historial de reservas</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F2F4F6' }}>
                    {['Huésped', 'Propiedad', 'Ingreso', 'Egreso', 'Días', 'Total', 'Neto'].map((h, i) => (
                      <th key={i} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 'bold', color: '#888', textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '0.5px solid #ddd' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historial.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '0.5px solid #eee', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{r.huesped_nombre}</td>
                      <td style={{ padding: '8px 12px', color: '#666' }}>{r.propiedad_id}</td>
                      <td style={{ padding: '8px 12px' }}>{formatFecha(r.fecha_entrada)}</td>
                      <td style={{ padding: '8px 12px' }}>{formatFecha(r.fecha_salida)}</td>
                      <td style={{ padding: '8px 12px' }}>{r.dias}d</td>
                      <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{fmtM(r.monto_total, r.moneda)}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 'bold', color: G }}>{fmtM(r.neto_propietario, r.moneda)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>)}

          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: '#aaa' }}>
            GASP Alquileres Temporarios · Portal privado del propietario · {new Date().getFullYear()}<br />
            Contacto: admconspinamar@gmail.com
          </div>
        </div>
      </div>
    </>
  )
}
