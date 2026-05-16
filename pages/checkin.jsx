import { useState, useEffect } from 'react'
import Head from 'next/head'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const G = '#1B6B35', B = '#1A3FA0', D = '#B83030', W = '#C07D10'

const fmtFecha = s => {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

const fmt    = n => n ? '$' + Number(n).toLocaleString('es-AR') : '$0'
const fmtUSD = n => n ? 'USD ' + Number(n).toLocaleString('es-AR') : 'USD 0'
const fmtM   = (n, m) => m === 'USD' ? fmtUSD(n) : fmt(n)

const LOGO_SVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTIwIiB3aWR0aD0iNDAiIGhlaWdodD0iNDgiPjxwYXRoIGQ9Ik01MCA1IEw5MCAyMCBMOTAgNjUgUTkwIDk1IDUwIDExNSBRMTAgOTUgMTAgNjUgTDEwIDIwIFoiIGZpbGw9IiMxQjZCMzUiLz48cGF0aCBkPSJNNTAgMTUgTDgyIDI4IEw4MiA2MyBRODIgODggNTAgMTA2IFExOCA4OCAxOCA2MyBMMTggMjggWiIgZmlsbD0iIzJFOEI0QSIvPjx0ZXh0IHg9IjUwIiB5PSI3MiIgZm9udC1mYW1pbHk9IkFyaWFsLHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iNDgiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+RzwvdGV4dD48L3N2Zz4='

export const config = { unstable_runtimeJS: true }

export default function CheckIn() {
  const [reserva, setReserva] = useState(null)
  const [instrucciones, setInstrucciones] = useState(null)
  const [perfil, setPerfil] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('info') // info | checkin | acceso | pago
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [form, setForm] = useState({
    huesped_nombre: '', huesped_dni: '', huesped_telefono: '',
    huesped_email: '', huesped_ciudad: '', vehiculo_patente: '',
    vehiculo_modelo: '', hora_llegada: '', cantidad_personas: '',
    observaciones_checkin: '', acepta_reglamento: false,
  })
  const [firma, setFirma] = useState(null)
  const [firmaCanvas, setFirmaCanvas] = useState(null)
  const [dibujando, setDibujando] = useState(false)
  const [pagoMsg, setPagoMsg] = useState(null)

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id')
    if (!id) { setError('Código de reserva no válido'); setLoading(false); return }
    cargar(id)
  }, [])

  async function cargar(id) {
    try {
      const { data: r } = await supabase
        .from('reservas_temp')
        .select('*')
        .eq('id', id)
        .single()
      if (!r) { setError('Reserva no encontrada'); setLoading(false); return }
      setReserva(r)

      // Pre-cargar datos del huésped en el form
      setForm(prev => ({
        ...prev,
        huesped_nombre: r.huesped_nombre || '',
        huesped_dni: r.huesped_dni || '',
        huesped_telefono: r.huesped_telefono || '',
        huesped_email: r.huesped_email || '',
        huesped_ciudad: r.huesped_ciudad || '',
      }))

      // Cargar instrucciones de la propiedad
      const { data: inst } = await supabase
        .from('instrucciones_propiedad')
        .select('*')
        .eq('admin_id', r.admin_id)
        .eq('propiedad_id', r.propiedad_id)
        .maybeSingle()
      setInstrucciones(inst)

      // Cargar perfil del admin
      const { data: p } = await supabase
        .from('perfil_admin')
        .select('nombre_completo, matricula, telefono, email_contacto, logo_url, logo_base64')
        .eq('admin_id', r.admin_id)
        .maybeSingle()
      setPerfil(p || {})

      // Verificar si ya completó el check-in
      if (r.checkin_completado) setEnviado(true)

    } catch (e) { setError('Error al cargar la reserva') }
    setLoading(false)
  }

  function initCanvas(canvas) {
    if (!canvas) return
    setFirmaCanvas(canvas)
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#1A1A1A'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
  }

  function iniciarFirma(e) {
    if (!firmaCanvas) return
    setDibujando(true)
    const ctx = firmaCanvas.getContext('2d')
    const rect = firmaCanvas.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.beginPath(); ctx.moveTo(x, y)
  }

  function dibujarFirma(e) {
    if (!dibujando || !firmaCanvas) return
    e.preventDefault()
    const ctx = firmaCanvas.getContext('2d')
    const rect = firmaCanvas.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.lineTo(x, y); ctx.stroke()
  }

  function terminarFirma() {
    setDibujando(false)
    if (firmaCanvas) setFirma(firmaCanvas.toDataURL())
  }

  function limpiarFirma() {
    if (!firmaCanvas) return
    const ctx = firmaCanvas.getContext('2d')
    ctx.clearRect(0, 0, firmaCanvas.width, firmaCanvas.height)
    setFirma(null)
  }

  async function enviarCheckin() {
    if (!form.acepta_reglamento) {
      alert('Debés aceptar el reglamento para completar el check-in'); return
    }
    if (!form.huesped_nombre || !form.huesped_dni) {
      alert('Nombre y DNI son obligatorios'); return
    }
    setEnviando(true)
    try {
      const updates = {
        ...form,
        checkin_completado: true,
        fecha_checkin: new Date().toISOString(),
        firma_digital: firma || null,
      }
      const { error } = await supabase
        .from('reservas_temp')
        .update(updates)
        .eq('id', reserva.id)
      if (error) throw error
      setEnviado(true)
    } catch (e) { alert('Error al enviar: ' + e.message) }
    setEnviando(false)
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'Arial', color:'#888' }}>
      Cargando tu reserva...
    </div>
  )

  if (error) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'Arial' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
        <div style={{ fontSize:18, color:D, fontWeight:'bold', marginBottom:8 }}>{error}</div>
        <div style={{ fontSize:13, color:'#888' }}>Contactá al administrador si creés que es un error.</div>
      </div>
    </div>
  )

  const adminLogo = perfil.logo_url || perfil.logo_base64 || LOGO_SVG
  const adminNombre = perfil.nombre_completo || 'Administración'
  const senia = reserva?.senia || 0
  const moneda = reserva?.moneda || 'ARS'
  const linkMP = reserva?.link_pago_mp

  const TABS = [
    { id: 'info',    label: '📋 Reserva'  },
    { id: 'acceso',  label: '🔑 Acceso'   },
    { id: 'pago',    label: '💳 Pago seña' },
    { id: 'checkin', label: '✅ Check-in'  },
  ]

  return (
    <>
      <Head>
        <title>Portal Huésped — GASP</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{ fontFamily:'Arial,sans-serif', minHeight:'100vh', background:'#F5F7FA' }}>

        {/* Header */}
        <div style={{ background:B, padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <img src={adminLogo} alt="Logo" style={{ height:40, borderRadius:4 }}
                 onError={e => { e.target.src = LOGO_SVG }} />
            <div>
              <div style={{ fontSize:15, fontWeight:'bold', color:'#fff' }}>Portal del Huésped</div>
              <div style={{ fontSize:11, color:'#9DBBF5' }}>{adminNombre}</div>
            </div>
          </div>
          {perfil.telefono && (
            <a href={`tel:${perfil.telefono}`}
              style={{ color:'#9DBBF5', fontSize:12, textDecoration:'none' }}>
              📱 {perfil.telefono}
            </a>
          )}
        </div>

        {/* Bienvenida */}
        <div style={{ background: G, padding:'16px 20px', color:'#fff' }}>
          <div style={{ fontSize:20, fontWeight:'bold' }}>¡Hola, {reserva.huesped_nombre?.split(',').reverse().join(' ').trim() || 'bienvenido'}!</div>
          <div style={{ fontSize:13, marginTop:4, opacity:0.85 }}>
            {fmtFecha(reserva.fecha_entrada)} → {fmtFecha(reserva.fecha_salida)} · {reserva.dias} noches
          </div>
        </div>

        {/* Tabs */}
        <div style={{ background:'#fff', borderBottom:'1px solid #eee', display:'flex', overflowX:'auto' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding:'12px 18px', border:'none', background:'none', cursor:'pointer', fontSize:13, fontWeight: tab===t.id ? 'bold' : 'normal', color: tab===t.id ? B : '#888', borderBottom: tab===t.id ? `3px solid ${B}` : '3px solid transparent', whiteSpace:'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ maxWidth:680, margin:'0 auto', padding:'20px 16px' }}>

          {/* TAB: INFO DE LA RESERVA */}
          {tab === 'info' && (
            <>
              <div style={{ background:'#fff', borderRadius:12, border:'0.5px solid #ddd', padding:20, marginBottom:14 }}>
                <div style={{ fontWeight:'bold', fontSize:15, marginBottom:14 }}>📋 Datos de tu reserva</div>
                {[
                  ['Huésped', reserva.huesped_nombre],
                  ['Ingreso', fmtFecha(reserva.fecha_entrada)],
                  ['Egreso', fmtFecha(reserva.fecha_salida)],
                  ['Duración', reserva.dias + ' noches'],
                  ['Modalidad', reserva.modalidad || '—'],
                  ['Total', fmtM(reserva.monto_total, moneda)],
                  ['Seña', fmtM(senia, moneda)],
                  ['Estado', reserva.estado],
                ].map(([k, v], i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'0.5px solid #f0f0f0', fontSize:14 }}>
                    <span style={{ color:'#888' }}>{k}</span>
                    <span style={{ fontWeight: ['Total','Estado'].includes(k) ? 'bold' : 'normal',
                      color: k==='Total' ? G : k==='Estado' ? B : '#1A1A1A' }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Estado pago seña */}
              {reserva.senia_cobrada ? (
                <div style={{ background:'#E8F5EE', border:'0.5px solid #9DDCB4', borderRadius:10, padding:'14px 18px', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:24 }}>✅</span>
                  <div>
                    <div style={{ fontWeight:'bold', color:G }}>Seña confirmada</div>
                    <div style={{ fontSize:12, color:'#555' }}>Tu pago de seña fue recibido correctamente.</div>
                  </div>
                </div>
              ) : senia > 0 && !reserva.senia_cobrada && (
                <div style={{ background:'#FEF3E2', border:'0.5px solid #E8A951', borderRadius:10, padding:'14px 18px', marginBottom:14 }}>
                  <div style={{ fontWeight:'bold', color:W, marginBottom:4 }}>⏳ Seña pendiente</div>
                  <div style={{ fontSize:13, color:'#555' }}>
                    Tenés pendiente el pago de la seña: <strong>{fmtM(senia, moneda)}</strong>
                  </div>
                  <button onClick={() => setTab('pago')}
                    style={{ marginTop:10, padding:'8px 16px', borderRadius:8, background:W, color:'#fff', border:'none', fontWeight:'bold', cursor:'pointer', fontSize:13 }}>
                    Pagar seña →
                  </button>
                </div>
              )}

              {/* Check-in completado */}
              {enviado && (
                <div style={{ background:'#E8F5EE', border:'0.5px solid #9DDCB4', borderRadius:10, padding:'14px 18px', display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:24 }}>✅</span>
                  <div>
                    <div style={{ fontWeight:'bold', color:G }}>Check-in completado</div>
                    <div style={{ fontSize:12, color:'#555' }}>Tus datos fueron enviados exitosamente.</div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB: ACCESO */}
          {tab === 'acceso' && (
            <>
              {instrucciones ? (
                <>
                  {instrucciones.codigo_acceso && (
                    <div style={{ background:'#1A1A1A', borderRadius:12, padding:20, marginBottom:14, textAlign:'center' }}>
                      <div style={{ fontSize:12, color:'#888', marginBottom:8 }}>CÓDIGO DE ACCESO</div>
                      <div style={{ fontSize:40, fontWeight:'bold', color:'#90d4a0', letterSpacing:8, fontFamily:'monospace' }}>
                        {instrucciones.codigo_acceso}
                      </div>
                    </div>
                  )}

                  {instrucciones.instrucciones && (
                    <div style={{ background:'#fff', borderRadius:12, border:'0.5px solid #ddd', padding:20, marginBottom:14 }}>
                      <div style={{ fontWeight:'bold', fontSize:14, marginBottom:10 }}>📍 Instrucciones de acceso</div>
                      <div style={{ fontSize:14, color:'#555', lineHeight:1.6, whiteSpace:'pre-line' }}>
                        {instrucciones.instrucciones}
                      </div>
                    </div>
                  )}

                  {(instrucciones.wifi_nombre || instrucciones.wifi_clave) && (
                    <div style={{ background:'#EBF3FF', borderRadius:12, border:'0.5px solid #9DBBF5', padding:20, marginBottom:14 }}>
                      <div style={{ fontWeight:'bold', fontSize:14, color:B, marginBottom:10 }}>📶 WiFi</div>
                      <div style={{ display:'flex', gap:20, flexWrap:'wrap', fontSize:14 }}>
                        {instrucciones.wifi_nombre && (
                          <div><span style={{ color:'#888' }}>Red: </span><strong>{instrucciones.wifi_nombre}</strong></div>
                        )}
                        {instrucciones.wifi_clave && (
                          <div><span style={{ color:'#888' }}>Clave: </span>
                            <strong style={{ fontFamily:'monospace', background:'#fff', padding:'2px 8px', borderRadius:4 }}>
                              {instrucciones.wifi_clave}
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {instrucciones.direccion_maps && (
                    <div style={{ background:'#fff', borderRadius:12, border:'0.5px solid #ddd', padding:20, marginBottom:14 }}>
                      <div style={{ fontWeight:'bold', fontSize:14, marginBottom:10 }}>🗺️ Cómo llegar</div>
                      <p style={{ fontSize:14, color:'#555', marginBottom:12 }}>{instrucciones.direccion_maps}</p>
                      {instrucciones.lat && instrucciones.lng && (
                        <a href={`https://maps.google.com/?q=${instrucciones.lat},${instrucciones.lng}`}
                          target="_blank" rel="noreferrer"
                          style={{ display:'inline-block', padding:'10px 18px', borderRadius:8, background:B, color:'#fff', textDecoration:'none', fontSize:13, fontWeight:'bold' }}>
                          📍 Abrir en Google Maps
                        </a>
                      )}
                    </div>
                  )}

                  {instrucciones.contacto_urgencias && (
                    <div style={{ background:'#FCEAEA', borderRadius:12, border:'0.5px solid #F09595', padding:16, marginBottom:14 }}>
                      <div style={{ fontWeight:'bold', fontSize:13, color:D, marginBottom:6 }}>🚨 Urgencias</div>
                      <a href={`tel:${instrucciones.contacto_urgencias.replace(/\D/g,'')}`}
                        style={{ fontSize:16, fontWeight:'bold', color:D, textDecoration:'none' }}>
                        {instrucciones.contacto_urgencias}
                      </a>
                    </div>
                  )}

                  {instrucciones.reglamento && (
                    <div style={{ background:'#fff', borderRadius:12, border:'0.5px solid #ddd', padding:20, marginBottom:14 }}>
                      <div style={{ fontWeight:'bold', fontSize:14, marginBottom:10 }}>📜 Reglamento de uso</div>
                      <div style={{ fontSize:13, color:'#555', lineHeight:1.7, whiteSpace:'pre-line' }}>
                        {instrucciones.reglamento}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign:'center', padding:60, color:'#bbb' }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🔑</div>
                  <div style={{ fontSize:15 }}>Las instrucciones de acceso estarán disponibles próximamente.</div>
                  <div style={{ fontSize:13, marginTop:8 }}>Contactá al administrador si necesitás información.</div>
                  {perfil.telefono && (
                    <a href={`tel:${perfil.telefono}`}
                      style={{ display:'inline-block', marginTop:16, padding:'10px 20px', borderRadius:8, background:B, color:'#fff', textDecoration:'none', fontWeight:'bold' }}>
                      📱 Llamar ahora
                    </a>
                  )}
                </div>
              )}
            </>
          )}

          {/* TAB: PAGO SEÑA */}
          {tab === 'pago' && (
            <>
              {reserva.senia_cobrada ? (
                <div style={{ textAlign:'center', padding:40 }}>
                  <div style={{ fontSize:60, marginBottom:16 }}>✅</div>
                  <div style={{ fontSize:20, fontWeight:'bold', color:G, marginBottom:8 }}>¡Seña confirmada!</div>
                  <div style={{ fontSize:14, color:'#555' }}>El pago fue recibido correctamente. Nos vemos el {fmtFecha(reserva.fecha_entrada)}.</div>
                </div>
              ) : (
                <>
                  <div style={{ background:'#fff', borderRadius:12, border:'0.5px solid #ddd', padding:20, marginBottom:14 }}>
                    <div style={{ fontWeight:'bold', fontSize:15, marginBottom:14 }}>💳 Pago de seña</div>
                    <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'0.5px solid #f0f0f0', fontSize:14 }}>
                      <span style={{ color:'#888' }}>Monto total</span>
                      <span style={{ fontWeight:'bold' }}>{fmtM(reserva.monto_total, moneda)}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', fontSize:14 }}>
                      <span style={{ color:'#888' }}>Seña a pagar</span>
                      <span style={{ fontWeight:'bold', color:G, fontSize:18 }}>{fmtM(senia, moneda)}</span>
                    </div>
                  </div>

                  {linkMP ? (
                    <div style={{ background:'#E8F5EE', borderRadius:12, border:'0.5px solid #9DDCB4', padding:20, textAlign:'center' }}>
                      <div style={{ fontSize:40, marginBottom:12 }}>💙</div>
                      <div style={{ fontWeight:'bold', fontSize:16, marginBottom:8 }}>Pagá con MercadoPago</div>
                      <div style={{ fontSize:13, color:'#555', marginBottom:16 }}>
                        Podés pagar con tarjeta de crédito, débito, efectivo o saldo MP.
                      </div>
                      <a href={linkMP} target="_blank" rel="noreferrer"
                        style={{ display:'inline-block', padding:'14px 28px', borderRadius:10, background:'#009EE3', color:'#fff', textDecoration:'none', fontWeight:'bold', fontSize:16 }}>
                        💳 Pagar seña — {fmtM(senia, moneda)}
                      </a>
                      <div style={{ fontSize:11, color:'#aaa', marginTop:10 }}>
                        Serás redirigido a la plataforma segura de MercadoPago
                      </div>
                    </div>
                  ) : (
                    <div style={{ background:'#FEF3E2', borderRadius:12, border:'0.5px solid #E8A951', padding:20, textAlign:'center' }}>
                      <div style={{ fontSize:14, color:W, fontWeight:'bold', marginBottom:8 }}>⏳ Configurando pago online</div>
                      <div style={{ fontSize:13, color:'#555', marginBottom:16 }}>
                        El link de pago online está siendo configurado. Mientras tanto podés coordinar el pago directamente:
                      </div>
                      {perfil.telefono && (
                        <a href={`https://wa.me/${perfil.telefono.replace(/\D/g,'')}?text=Hola, quiero coordinar el pago de la seña de mi reserva ${reserva.id}`}
                          target="_blank" rel="noreferrer"
                          style={{ display:'inline-block', padding:'12px 24px', borderRadius:10, background:'#25D366', color:'#fff', textDecoration:'none', fontWeight:'bold', fontSize:15 }}>
                          💬 Contactar por WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* TAB: CHECK-IN */}
          {tab === 'checkin' && (
            <>
              {enviado ? (
                <div style={{ textAlign:'center', padding:40 }}>
                  <div style={{ fontSize:60, marginBottom:16 }}>✅</div>
                  <div style={{ fontSize:20, fontWeight:'bold', color:G, marginBottom:8 }}>¡Check-in completado!</div>
                  <div style={{ fontSize:14, color:'#555' }}>
                    Tus datos fueron enviados. Te esperamos el {fmtFecha(reserva.fecha_entrada)}.
                  </div>
                  {instrucciones?.codigo_acceso && (
                    <div style={{ marginTop:20, background:'#1A1A1A', borderRadius:10, padding:16, display:'inline-block' }}>
                      <div style={{ fontSize:11, color:'#888', marginBottom:6 }}>TU CÓDIGO DE ACCESO</div>
                      <div style={{ fontSize:32, fontWeight:'bold', color:'#90d4a0', letterSpacing:6, fontFamily:'monospace' }}>
                        {instrucciones.codigo_acceso}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div style={{ background:'#fff', borderRadius:12, border:'0.5px solid #ddd', padding:20, marginBottom:14 }}>
                    <div style={{ fontWeight:'bold', fontSize:15, marginBottom:16 }}>✅ Completá tu check-in</div>

                    {[
                      { label:'Nombre completo *', key:'huesped_nombre', type:'text', placeholder:'Ej: García, Juan Pablo' },
                      { label:'DNI / Pasaporte *', key:'huesped_dni', type:'text', placeholder:'Ej: 30.123.456' },
                      { label:'Teléfono', key:'huesped_telefono', type:'tel', placeholder:'Ej: 11-5678-9012' },
                      { label:'Email', key:'huesped_email', type:'email', placeholder:'tu@email.com' },
                      { label:'Ciudad de residencia', key:'huesped_ciudad', type:'text', placeholder:'Ej: Buenos Aires' },
                      { label:'Cantidad de personas', key:'cantidad_personas', type:'number', placeholder:'Ej: 4' },
                      { label:'Hora estimada de llegada', key:'hora_llegada', type:'time' },
                      { label:'Vehículo (patente)', key:'vehiculo_patente', type:'text', placeholder:'Ej: AB 123 CD' },
                      { label:'Vehículo (modelo)', key:'vehiculo_modelo', type:'text', placeholder:'Ej: Chevrolet Cruze gris' },
                    ].map(field => (
                      <div key={field.key} style={{ marginBottom:12 }}>
                        <div style={{ fontSize:12, color:'#888', marginBottom:4 }}>{field.label}</div>
                        <input
                          type={field.type}
                          value={form[field.key]}
                          onChange={e => setForm(f => ({...f, [field.key]: e.target.value}))}
                          placeholder={field.placeholder}
                          style={{ width:'100%', padding:'10px 12px', border:'1px solid #ddd', borderRadius:8, fontSize:14, boxSizing:'border-box' }}
                        />
                      </div>
                    ))}

                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:12, color:'#888', marginBottom:4 }}>Observaciones</div>
                      <textarea
                        value={form.observaciones_checkin}
                        onChange={e => setForm(f => ({...f, observaciones_checkin: e.target.value}))}
                        placeholder="¿Alguna necesidad especial o comentario?"
                        rows={3}
                        style={{ width:'100%', padding:'10px 12px', border:'1px solid #ddd', borderRadius:8, fontSize:14, resize:'vertical', boxSizing:'border-box' }}
                      />
                    </div>

                    {/* Firma digital */}
                    <div style={{ marginBottom:16 }}>
                      <div style={{ fontSize:12, color:'#888', marginBottom:8 }}>Firma digital</div>
                      <div style={{ border:'1px solid #ddd', borderRadius:8, overflow:'hidden', background:'#FAFAFA' }}>
                        <canvas
                          ref={initCanvas}
                          width={340} height={100}
                          onMouseDown={iniciarFirma}
                          onMouseMove={dibujarFirma}
                          onMouseUp={terminarFirma}
                          onMouseLeave={terminarFirma}
                          onTouchStart={iniciarFirma}
                          onTouchMove={dibujarFirma}
                          onTouchEnd={terminarFirma}
                          style={{ display:'block', width:'100%', cursor:'crosshair', touchAction:'none' }}
                        />
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                        <div style={{ fontSize:11, color:'#aaa' }}>Firmá con el dedo o el mouse</div>
                        <button onClick={limpiarFirma}
                          style={{ fontSize:11, color:D, background:'none', border:'none', cursor:'pointer' }}>
                          Limpiar firma
                        </button>
                      </div>
                    </div>

                    {/* Reglamento */}
                    {instrucciones?.reglamento && (
                      <div style={{ background:'#F8F9FA', borderRadius:8, padding:14, marginBottom:14 }}>
                        <div style={{ fontWeight:'bold', fontSize:13, marginBottom:8 }}>📜 Reglamento de uso</div>
                        <div style={{ fontSize:12, color:'#555', lineHeight:1.6, maxHeight:120, overflowY:'auto', whiteSpace:'pre-line' }}>
                          {instrucciones.reglamento}
                        </div>
                      </div>
                    )}

                    {/* Aceptar */}
                    <label style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:20, cursor:'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.acepta_reglamento}
                        onChange={e => setForm(f => ({...f, acepta_reglamento: e.target.checked}))}
                        style={{ marginTop:2, width:18, height:18 }}
                      />
                      <span style={{ fontSize:13, color:'#555' }}>
                        Acepto el reglamento de uso de la propiedad y los términos de la reserva. *
                      </span>
                    </label>

                    <button
                      onClick={enviarCheckin}
                      disabled={enviando || !form.acepta_reglamento}
                      style={{ width:'100%', padding:'14px', borderRadius:10, background: form.acepta_reglamento ? G : '#ccc', color:'#fff', border:'none', fontWeight:'bold', fontSize:16, cursor: form.acepta_reglamento ? 'pointer' : 'not-allowed' }}>
                      {enviando ? '⏳ Enviando...' : '✅ Completar check-in'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </>
  )
}
