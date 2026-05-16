import { useState, useEffect } from 'react'
import Head from 'next/head'

const G = '#1B6B35'
const W = '#C07D10'
const D = '#B83030'
const B = '#1A3FA0'

const fmt    = n => n ? '$' + Number(n).toLocaleString('es-AR') : '$0'
const fmtUSD = n => n ? 'USD ' + Number(n).toLocaleString('es-AR') : 'USD 0'
const fmtM   = (n, m) => m === 'USD' ? fmtUSD(n) : fmt(n)

const fmtFecha = s => {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

const LOGO_SVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTIwIiB3aWR0aD0iNDAiIGhlaWdodD0iNDgiPjxwYXRoIGQ9Ik01MCA1IEw5MCAyMCBMOTAgNjUgUTkwIDk1IDUwIDExNSBRMTAgOTUgMTAgNjUgTDEwIDIwIFoiIGZpbGw9IiMxQjZCMzUiLz48cGF0aCBkPSJNNTAgMTUgTDgyIDI4IEw4MiA2MyBRODIgODggNTAgMTA2IFExOCA4OCAxOCA2MyBMMTggMjggWiIgZmlsbD0iIzJFOEI0QSIvPjx0ZXh0IHg9IjUwIiB5PSI3MiIgZm9udC1mYW1pbHk9IkFyaWFsLHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iNDgiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+RzwvdGV4dD48L3N2Zz4='

const ESTADOS_COLOR = { Confirmada: G, Señada: W, Pendiente: B, Cancelada: D, Finalizada: '#888' }
const ESTADOS_BG    = { Confirmada: '#E8F5EE', Señada: '#FEF3E2', Pendiente: '#EBF3FF', Cancelada: '#FCEAEA', Finalizada: '#F2F4F6' }

export const config = { unstable_runtimeJS: true }

export default function PortalPropietarioTemp() {
  const [data, setData]       = useState(null)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id')
    if (!id) { setError('Acceso no autorizado'); setLoading(false); return }

    fetch(`/api/portal-propietario-temp?id=${id}`)
      .then(r => r.json())
      .then(d => { if (d.ok) setData(d); else setError(d.error || 'Acceso no autorizado') })
      .catch(() => setError('Error al cargar los datos'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'Arial,sans-serif', color:'#888' }}>
      Cargando...
    </div>
  )

  if (error) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'Arial,sans-serif' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
        <div style={{ fontSize:18, color:D, fontWeight:'bold', marginBottom:8 }}>Acceso no autorizado</div>
        <div style={{ fontSize:13, color:'#888' }}>El link es inválido o expiró. Contacte al administrador.</div>
      </div>
    </div>
  )

  const {
    propietario: prop,
    perfil = {},
    propiedades = [],
    reservasActivas = [],
    historial = [],
    totalBrutoARS = 0, totalBrutoUSD = 0,
    totalComisionARS = 0, totalComisionUSD = 0,
    totalGastosARS = 0, totalGastosUSD = 0,
    totalNetoARS = 0, totalNetoUSD = 0,
    pagosRealizados = [],
    totalPagadoARS = 0, totalPagadoUSD = 0,
  } = data

  const adminNombre    = perfil.nombre_completo || 'Administrador'
  const adminMatricula = perfil.matricula        || ''
  const adminCiudad    = perfil.ciudad           || 'Pinamar'
  const adminEmail     = perfil.email_contacto   || ''
  const adminLogo      = perfil.logo_url || perfil.logo_base64 || LOGO_SVG

  const saldoPendienteARS = totalNetoARS - totalPagadoARS
  const saldoPendienteUSD = totalNetoUSD - totalPagadoUSD
  const liquidacionCompleta = pagosRealizados.length > 0 && saldoPendienteARS <= 0.01 && saldoPendienteUSD <= 0.01

  const hayARS = totalBrutoARS > 0
  const hayUSD = totalBrutoUSD > 0

  return (
    <>
      <Head>
        <title>Portal Propietario — GASP Temporario</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{ fontFamily:'Arial,sans-serif', minHeight:'100vh', background:'#F5F7FA' }}>

        {/* Header */}
        <div style={{ background:B, padding:'14px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <img src={adminLogo} alt="Logo" style={{ height:44, width:'auto', borderRadius:4 }}
                 onError={e => { e.target.onerror=null; e.target.src=LOGO_SVG }} />
            <div>
              <div style={{ fontSize:16, fontWeight:'bold', color:'#fff' }}>GASP</div>
              <div style={{ fontSize:11, color:'#9DBBF5' }}>Alquileres Temporarios — Portal del Propietario</div>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:11, color:'#9DBBF5' }}>Administrador</div>
            <div style={{ fontSize:14, color:'#fff', fontWeight:'bold' }}>{adminNombre}</div>
            {adminMatricula && <div style={{ fontSize:11, color:'#9DBBF5' }}>{adminMatricula} · {adminCiudad}</div>}
          </div>
        </div>

        <div style={{ maxWidth:960, margin:'0 auto', padding:'24px 16px' }}>

          {/* Datos propietario */}
          <div style={{ background:'#fff', borderRadius:10, padding:20, marginBottom:16, border:'0.5px solid #ddd' }}>
            <div style={{ fontSize:20, fontWeight:'bold', color:'#1A1A1A', marginBottom:8 }}>{prop.apellido_nombre}</div>
            <div style={{ display:'flex', gap:20, flexWrap:'wrap', fontSize:13, color:'#666' }}>
              {prop.email            && <span>✉ {prop.email}</span>}
              {prop.telefono         && <span>📱 {prop.telefono}</span>}
              {prop.cbu              && <span style={{ fontFamily:'monospace' }}>CBU: {prop.cbu}</span>}
              {prop.banco            && <span>🏦 {prop.banco}</span>}
              {prop.ciudad_residencia && <span>📍 {prop.ciudad_residencia}</span>}
            </div>
          </div>

          {/* Tarjetas resumen */}
          {hayARS && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:12 }}>
              {[
                { label:'Total cobrado ARS',    value:fmt(totalBrutoARS),      color:'#1A1A1A' },
                { label:'Gastos propietario',   value:'- '+fmt(totalGastosARS), color:D         },
                { label:'Comisión administrac.', value:'- '+fmt(totalComisionARS), color:W      },
                { label:'Neto ARS',              value:fmt(totalNetoARS),        color:G         },
              ].map((c,i) => (
                <div key={i} style={{ background:'#fff', border:'0.5px solid #ddd', borderRadius:10, padding:14 }}>
                  <div style={{ fontSize:11, color:'#888', marginBottom:6 }}>{c.label}</div>
                  <div style={{ fontSize:16, fontWeight:'bold', color:c.color }}>{c.value}</div>
                </div>
              ))}
            </div>
          )}
          {hayUSD && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:12 }}>
              {[
                { label:'Total cobrado USD',    value:fmtUSD(totalBrutoUSD),      color:'#1A1A1A' },
                { label:'Gastos propietario',   value:'- '+fmtUSD(totalGastosUSD), color:D        },
                { label:'Comisión administrac.', value:'- '+fmtUSD(totalComisionUSD), color:W     },
                { label:'Neto USD',              value:fmtUSD(totalNetoUSD),         color:B      },
              ].map((c,i) => (
                <div key={i} style={{ background:'#fff', border:'0.5px solid #ddd', borderRadius:10, padding:14 }}>
                  <div style={{ fontSize:11, color:'#888', marginBottom:6 }}>{c.label}</div>
                  <div style={{ fontSize:16, fontWeight:'bold', color:c.color }}>{c.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Pagos realizados */}
          {pagosRealizados.length > 0 && (
            <div style={{ background:'#fff', borderRadius:10, border:'0.5px solid #9DDCB4', padding:18, marginBottom:16 }}>
              <div style={{ fontWeight:'bold', fontSize:14, color:G, marginBottom:12 }}>💸 Pagos ya transferidos</div>
              {pagosRealizados.map((p, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom: i < pagosRealizados.length-1 ? '0.5px solid #eee' : 'none', fontSize:13 }}>
                  <div>
                    <div style={{ fontWeight:'bold' }}>{p.periodo || p.fecha || '—'}</div>
                    <div style={{ color:'#888', fontSize:12 }}>{p.propiedad || p.concepto || 'Transferencia'}</div>
                  </div>
                  <div style={{ fontWeight:'bold', color:G }}>{fmtM(p.neto || p.importe, p.moneda)}</div>
                </div>
              ))}
              <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid #9DDCB4', display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontWeight:'bold', color:G }}>TOTAL LIQUIDADO</span>
                <span style={{ fontWeight:'bold', color:G }}>
                  {[totalPagadoARS > 0.01 ? fmt(totalPagadoARS) : '', totalPagadoUSD > 0.01 ? fmtUSD(totalPagadoUSD) : ''].filter(Boolean).join(' + ')}
                </span>
              </div>
            </div>
          )}

          {/* Estado saldo */}
          {pagosRealizados.length > 0 && (
            liquidacionCompleta ? (
              <div style={{ background:'#E8F5EE', border:'0.5px solid #9DDCB4', borderRadius:10, padding:'14px 18px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:22 }}>✅</span>
                <div>
                  <div style={{ fontWeight:'bold', color:G, fontSize:14 }}>Liquidación completa</div>
                  <div style={{ fontSize:12, color:'#555' }}>No hay saldo pendiente de transferencia.</div>
                </div>
              </div>
            ) : (
              <div style={{ background:'#FEF3E2', border:'0.5px solid #E8A951', borderRadius:10, padding:'14px 18px', marginBottom:16 }}>
                <div style={{ fontWeight:'bold', color:W, fontSize:14, marginBottom:6 }}>⏳ Saldo pendiente de transferencia</div>
                <div style={{ display:'flex', gap:20, fontSize:13 }}>
                  {saldoPendienteARS > 0.01 && <span style={{ fontWeight:'bold', color:D }}>{fmt(saldoPendienteARS)} ARS</span>}
                  {saldoPendienteUSD > 0.01 && <span style={{ fontWeight:'bold', color:D }}>{fmtUSD(saldoPendienteUSD)} USD</span>}
                </div>
              </div>
            )
          )}

          {/* Propiedades */}
          <div style={{ background:'#fff', borderRadius:10, border:'0.5px solid #ddd', padding:18, marginBottom:16 }}>
            <div style={{ fontWeight:'bold', fontSize:14, marginBottom:12 }}>🏠 Mis propiedades</div>
            {propiedades.map((p, i) => (
              <div key={i} style={{ padding:'10px 0', borderBottom: i < propiedades.length-1 ? '0.5px solid #eee' : 'none' }}>
                <div style={{ fontWeight:'bold', fontSize:14 }}>{p.nombre}</div>
                <div style={{ fontSize:12, color:'#888', marginTop:2 }}>
                  {p.tipo} · {p.localidad} · {p.capacidad} personas
                  {p.tarifa_semanal_ars > 0 && ` · Semana: ${fmt(p.tarifa_semanal_ars)}`}
                  {p.tarifa_semanal_usd > 0 && ` / ${fmtUSD(p.tarifa_semanal_usd)}`}
                </div>
              </div>
            ))}
          </div>

          {/* Reservas activas */}
          {reservasActivas.length > 0 && (
            <div style={{ background:'#fff', borderRadius:10, border:'0.5px solid #ddd', padding:18, marginBottom:16 }}>
              <div style={{ fontWeight:'bold', fontSize:14, marginBottom:12, color:G }}>📅 Reservas activas y próximas</div>
              {reservasActivas.map((r, i) => (
                <div key={i} style={{ padding:'12px 0', borderBottom: i < reservasActivas.length-1 ? '0.5px solid #eee' : 'none' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
                    <div>
                      <div style={{ fontWeight:'bold', fontSize:14 }}>{r.huesped_nombre}</div>
                      <div style={{ fontSize:12, color:'#888', marginTop:2 }}>
                        {propiedades.find(p => p.id === r.propiedad_id)?.nombre || r.propiedad_id} · {fmtFecha(r.fecha_entrada)} → {fmtFecha(r.fecha_salida)} · {r.dias} días
                      </div>
                      {r.huesped_telefono && <div style={{ fontSize:12, color:'#888' }}>📱 {r.huesped_telefono} · 🏙 {r.huesped_ciudad}</div>}
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <span style={{ background: ESTADOS_BG[r.estado]||'#F2F4F6', color: ESTADOS_COLOR[r.estado]||'#555', fontSize:11, padding:'3px 10px', borderRadius:10, fontWeight:'bold' }}>
                        {r.estado}
                      </span>
                      <div style={{ fontSize:14, fontWeight:'bold', marginTop:6 }}>{fmtM(r.monto_total, r.moneda)}</div>
                      <div style={{ fontSize:12, color:G }}>Neto: {fmtM(r.neto_propietario, r.moneda)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Historial */}
          {historial.length > 0 && (
            <div style={{ background:'#fff', borderRadius:10, border:'0.5px solid #ddd', overflow:'hidden', marginBottom:24 }}>
              <div style={{ padding:'14px 20px', borderBottom:'0.5px solid #eee', fontWeight:'bold', fontSize:14 }}>📋 Historial de reservas</div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:'#F2F4F6' }}>
                      {['Huésped','Propiedad','Ingreso','Egreso','Días','Moneda','Total','Comisión','Neto'].map((h,i) => (
                        <th key={i} style={{ padding:'8px 12px', textAlign:'left', fontSize:11, fontWeight:'bold', color:'#888', textTransform:'uppercase', letterSpacing:0.4, borderBottom:'0.5px solid #ddd', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((r, i) => (
                      <tr key={i} style={{ borderBottom:'0.5px solid #eee', background: r.liquidacion_enviada ? '#FAFFF9' : '#fff' }}>
                        <td style={{ padding:'8px 12px', fontWeight:'bold' }}>{r.huesped_nombre}</td>
                        <td style={{ padding:'8px 12px', fontSize:12 }}>{propiedades.find(p => p.id === r.propiedad_id)?.nombre || r.propiedad_id}</td>
                        <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>{fmtFecha(r.fecha_entrada)}</td>
                        <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>{fmtFecha(r.fecha_salida)}</td>
                        <td style={{ padding:'8px 12px' }}>{r.dias}d</td>
                        <td style={{ padding:'8px 12px' }}>
                          <span style={{ background: r.moneda==='USD' ? '#EBF3FF' : '#F0FBF4', color: r.moneda==='USD' ? B : G, borderRadius:4, padding:'2px 8px', fontSize:11, fontWeight:'bold' }}>{r.moneda}</span>
                        </td>
                        <td style={{ padding:'8px 12px', fontWeight:'bold' }}>{fmtM(r.monto_total, r.moneda)}</td>
                        <td style={{ padding:'8px 12px', color:W }}>- {fmtM(r.comision, r.moneda)}</td>
                        <td style={{ padding:'8px 12px', fontWeight:'bold', color: r.liquidacion_enviada ? '#888' : G }}>
                          {fmtM(r.neto_propietario, r.moneda)}
                          {r.liquidacion_enviada && <span style={{ fontSize:10, color:'#aaa', marginLeft:6 }}>✓ Liq.</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ textAlign:'center', fontSize:11, color:'#aaa' }}>
            GASP — Gestión de Alquileres Temporarios
            {adminEmail && ` · ${adminEmail}`}
            {` · ${adminCiudad}, Buenos Aires`}
          </div>
        </div>
      </div>
    </>
  )
}
