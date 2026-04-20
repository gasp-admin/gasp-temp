import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

const B = '#1A3FA0'
const G = '#1B6B35'
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

export default function PortalPropietario() {
  const [datos, setDatos] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [propId, setPropId] = useState(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    if (!id) { setError('ID de propietario no especificado'); setLoading(false); return }
    setPropId(id)
    cargarDatos(id)
  }, [])

  async function cargarDatos(id) {
    setLoading(true)
    try {
      const [r1, r2, r3, r4, r5] = await Promise.all([
        supabase.from('prop_owners_temp').select('*').eq('id', id).single(),
        supabase.from('prop_temp').select('*').eq('propietario_id', id).eq('activo', true),
        supabase.from('reservas_temp').select('*').order('fecha_entrada', { ascending: false }),
        supabase.from('gastos_temp').select('*'),
        supabase.from('perfil_admin').select('*').limit(1),
      ])

      if (r1.error || !r1.data) { setError('Propietario no encontrado'); setLoading(false); return }

      const props = r2.data || []
      const propIds = props.map(p => p.id)
      const reservas = (r3.data || []).filter(r => propIds.includes(r.propiedad_id) && r.estado !== 'Cancelada')
      const gastos = (r4.data || []).filter(g => propIds.includes(g.propiedad_id))
      const perfil = r5.data?.[0] || {}

      setDatos({ propietario: r1.data, propiedades: props, reservas, gastos, perfil })
    } catch(e) {
      setError('Error al cargar datos: ' + e.message)
    }
    setLoading(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0A0F1E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A7ABF', fontFamily: 'Arial', fontSize: 14 }}>
      Cargando portal...
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#0A0F1E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>No se pudo cargar el portal</div>
        <div style={{ color: '#888', fontSize: 13 }}>{error}</div>
      </div>
    </div>
  )

  const { propietario, propiedades, reservas, gastos, perfil } = datos
  const hoy = new Date().toISOString().split('T')[0]

  // Estadísticas
  const reservasActivas = reservas.filter(r => r.fecha_salida >= hoy)
  const reservasPasadas = reservas.filter(r => r.fecha_salida < hoy)
  const totalBrutoARS = reservas.filter(r => r.moneda === 'ARS').reduce((s,r) => s + Number(r.monto_total||0), 0)
  const totalBrutoUSD = reservas.filter(r => r.moneda === 'USD').reduce((s,r) => s + Number(r.monto_total||0), 0)
  const totalComARS = reservas.filter(r => r.moneda === 'ARS').reduce((s,r) => s + Number(r.comision||0), 0)
  const totalComUSD = reservas.filter(r => r.moneda === 'USD').reduce((s,r) => s + Number(r.comision||0), 0)

  const colorEstado = { 'Confirmada': '#1B6B35', 'Señada': '#C07D10', 'Pendiente': '#1A3FA0', 'Cancelada': '#B83030' }

  return (
    <>
      <Head>
        <title>Portal Propietario — GASP Temporario</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#F0F4F8', fontFamily: 'Segoe UI, Arial, sans-serif' }}>

        {/* Header */}
        <div style={{ background: '#080D1A', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="/logo.jpeg" alt="GASP" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8 }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 'bold', color: '#fff' }}>GASP Alquileres Temporarios</div>
            <div style={{ fontSize: 11, color: '#4A7ABF' }}>Portal del Propietario</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#4A7ABF', textAlign: 'right' }}>
            <div style={{ color: '#fff', fontWeight: 'bold' }}>{propietario.apellido_nombre}</div>
            <div>{propietario.ciudad_residencia || '—'}</div>
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>

          {/* Admin info */}
          {perfil.nombre_completo && (
            <div style={{ background: '#E8EEFB', border: '0.5px solid #A8C0F0', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: B, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>Administrado por: <strong>{perfil.nombre_completo}</strong></span>
              {perfil.titulo && <span>{perfil.titulo}</span>}
              {perfil.matricula && <span>{perfil.matricula}</span>}
              {perfil.email_contacto && <span>✉ {perfil.email_contacto}</span>}
              {perfil.telefono && <span>📱 {perfil.telefono}</span>}
            </div>
          )}

          {/* Estadísticas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              ['Propiedades', propiedades.length, B],
              ['Reservas activas', reservasActivas.length, G],
              ['Total cobrado ARS', fmt(totalBrutoARS), '#1A1A1A'],
              ['Total cobrado USD', fmtUSD(totalBrutoUSD), B],
            ].map(([label, val, color], i) => (
              <div key={i} style={{ background: '#fff', border: '0.5px solid #E8ECF0', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: i < 2 ? 26 : 18, fontWeight: 'bold', color }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Neto propietario */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div style={{ background: '#E8F5EE', border: '0.5px solid #9DDCB4', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 11, color: G, marginBottom: 4 }}>NETO A RECIBIR ARS</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: G }}>{fmt(totalBrutoARS - totalComARS)}</div>
              <div style={{ fontSize: 11, color: '#888' }}>Comisión administración: {fmt(totalComARS)}</div>
            </div>
            <div style={{ background: '#E8EEFB', border: '0.5px solid #A8C0F0', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 11, color: B, marginBottom: 4 }}>NETO A RECIBIR USD</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: B }}>{fmtUSD(totalBrutoUSD - totalComUSD)}</div>
              <div style={{ fontSize: 11, color: '#888' }}>Comisión administración: {fmtUSD(totalComUSD)}</div>
            </div>
          </div>

          {/* Propiedades */}
          <div style={{ background: '#fff', borderRadius: 10, border: '0.5px solid #E8ECF0', padding: 18, marginBottom: 16 }}>
            <div style={{ fontWeight: 'bold', fontSize: 14, color: B, marginBottom: 14 }}>Mis propiedades</div>
            {propiedades.map(p => (
              <div key={p.id} style={{ padding: '10px 0', borderBottom: '0.5px solid #F0F2F5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: 14 }}>{p.nombre}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{p.tipo} · {p.localidad} · {p.capacidad} personas</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 12 }}>
                  <div style={{ color: '#555' }}>Tarifa día: {fmt(p.tarifa_diaria_ars)} / {fmtUSD(p.tarifa_diaria_usd)}</div>
                  <div style={{ color: '#888' }}>Comisión: {p.comision_pct}%</div>
                </div>
              </div>
            ))}
          </div>

          {/* Reservas activas */}
          {reservasActivas.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 10, border: '0.5px solid #E8ECF0', padding: 18, marginBottom: 16 }}>
              <div style={{ fontWeight: 'bold', fontSize: 14, color: G, marginBottom: 14 }}>Reservas activas y próximas</div>
              {reservasActivas.map(r => {
                const saldo = Number(r.monto_total||0) - Number(r.seña||0)
                return (
                  <div key={r.id} style={{ padding: '12px 0', borderBottom: '0.5px solid #F0F2F5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: 14 }}>{r.huesped_nombre}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{r.propiedad_id} · {formatFecha(r.fecha_entrada)} → {formatFecha(r.fecha_salida)} · {r.dias} días</div>
                        <div style={{ fontSize: 12, color: '#888' }}>📱 {r.huesped_telefono || '—'} · 🏙 {r.huesped_ciudad || '—'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 'bold', background: colorEstado[r.estado] + '22', color: colorEstado[r.estado] }}>
                          {r.estado}
                        </span>
                        <div style={{ fontSize: 13, fontWeight: 'bold', marginTop: 4 }}>{fmtM(r.monto_total, r.moneda)}</div>
                        <div style={{ fontSize: 11, color: saldo > 0 ? D : G }}>{saldo > 0 ? 'Saldo pendiente: ' + fmtM(saldo, r.moneda) : '✓ Saldo cobrado'}</div>
                        <div style={{ fontSize: 11, color: G, fontWeight: 'bold' }}>Neto: {fmtM(r.neto_propietario, r.moneda)}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Historial */}
          {reservasPasadas.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 10, border: '0.5px solid #E8ECF0', padding: 18, marginBottom: 16 }}>
              <div style={{ fontWeight: 'bold', fontSize: 14, color: '#888', marginBottom: 14 }}>Historial de reservas</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid #E8ECF0' }}>
                      {['Huésped', 'Propiedad', 'Ingreso', 'Egreso', 'Días', 'Total', 'Neto'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#888', fontWeight: 600, fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reservasPasadas.map((r, i) => (
                      <tr key={r.id} style={{ borderBottom: '0.5px solid #F0F2F5', background: i%2===0?'#fff':'#FAFAFA' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 'bold' }}>{r.huesped_nombre}</td>
                        <td style={{ padding: '8px 10px', fontSize: 12, color: '#888' }}>{r.propiedad_id}</td>
                        <td style={{ padding: '8px 10px' }}>{formatFecha(r.fecha_entrada)}</td>
                        <td style={{ padding: '8px 10px' }}>{formatFecha(r.fecha_salida)}</td>
                        <td style={{ padding: '8px 10px' }}>{r.dias}d</td>
                        <td style={{ padding: '8px 10px' }}>{fmtM(r.monto_total, r.moneda)}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 'bold', color: G }}>{fmtM(r.neto_propietario, r.moneda)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ textAlign: 'center', fontSize: 12, color: '#aaa', marginTop: 24 }}>
            GASP Alquileres Temporarios · Portal privado del propietario · {new Date().getFullYear()}
            {perfil.email_contacto && <div>Contacto: {perfil.email_contacto}</div>}
          </div>
        </div>
      </div>
    </>
  )
}
