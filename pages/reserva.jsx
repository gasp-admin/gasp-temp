import { useState, useEffect } from 'react'
import Head from 'next/head'

const EF = 'https://payzqbkydmvovjxlznuq.supabase.co/functions/v1/reserva-publica-temp'
const G = '#1B6B35', B = '#1A3FA0', W = '#C07D10', D = '#B91C1C'

function fmt(n, mon = 'ARS') {
  if (!n) return '—'
  return mon === 'USD'
    ? 'USD ' + Number(n).toLocaleString('es-AR')
    : '$' + Number(n).toLocaleString('es-AR')
}

function diasEntre(desde, hasta) {
  if (!desde || !hasta) return 0
  return Math.ceil((new Date(hasta) - new Date(desde)) / 86400000)
}

export default function ReservaPublica() {
  const [adminId, setAdminId] = useState(null)
  const [propId, setPropId] = useState(null)
  const [propiedad, setPropiedad] = useState(null)
  const [reservasOcupadas, setReservasOcupadas] = useState([])
  const [mes, setMes] = useState(() => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}` })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [paso, setPaso] = useState(1) // 1=calendario, 2=formulario, 3=confirmacion
  const [fechaEntrada, setFechaEntrada] = useState('')
  const [fechaSalida, setFechaSalida] = useState('')
  const [seleccionando, setSeleccionando] = useState(null) // 'entrada' | 'salida'
  const [enviando, setEnviando] = useState(false)
  const [solicitudOk, setSolicitudOk] = useState(null)
  const [moneda, setMoneda] = useState('ARS')
  const [form, setForm] = useState({
    huesped_nombre: '', huesped_telefono: '', huesped_email: '',
    huesped_dni: '', huesped_ciudad: '', personas: '', mensaje: ''
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const p = new URLSearchParams(window.location.search)
    const aid = p.get('admin_id')
    const pid = p.get('propiedad_id')
    if (!aid || !pid) { setError('Link inválido. Solicitá el link correcto al administrador.'); setLoading(false); return }
    setAdminId(aid); setPropId(pid)
    cargarPropiedad(aid, pid)
  }, [])

  async function cargarPropiedad(aid, pid) {
    setLoading(true)
    try {
      const r = await fetch(`${EF}?action=get_propiedad&admin_id=${aid}&propiedad_id=${pid}`)
      const d = await r.json()
      if (!d.ok) throw new Error(d.error)
      setPropiedad(d.propiedad)
      setReservasOcupadas(d.reservas || [])
      setMoneda(d.propiedad.tarifa_diaria_usd ? 'USD' : 'ARS')
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  function esDiaOcupado(fecha) {
    return reservasOcupadas.some(r =>
      r.fecha_entrada <= fecha && r.fecha_salida > fecha
    )
  }

  function esDiaPasado(anio, mesN, dia) {
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    return new Date(anio, mesN, dia) < hoy
  }

  function estaEnRango(fecha) {
    if (!fechaEntrada || !fechaSalida) return false
    return fecha > fechaEntrada && fecha < fechaSalida
  }

  function handleDiaClick(fechaStr) {
    if (esDiaOcupado(fechaStr)) return
    if (!seleccionando || seleccionando === 'entrada') {
      setFechaEntrada(fechaStr); setFechaSalida(''); setSeleccionando('salida')
    } else {
      if (fechaStr <= fechaEntrada) { setFechaEntrada(fechaStr); setSeleccionando('salida') }
      else {
        // Check no occupied dates in range
        let d = new Date(fechaEntrada); d.setDate(d.getDate()+1)
        const fin = new Date(fechaStr)
        let ok = true
        while (d < fin) {
          const s = d.toISOString().split('T')[0]
          if (esDiaOcupado(s)) { ok = false; break }
          d.setDate(d.getDate()+1)
        }
        if (!ok) { alert('Hay fechas no disponibles en ese rango. Seleccioná otro período.'); return }
        setFechaSalida(fechaStr); setSeleccionando(null)
      }
    }
  }

  async function enviarSolicitud() {
    if (!form.huesped_nombre.trim() || !form.huesped_telefono.trim()) return alert('Nombre y teléfono son obligatorios')
    setEnviando(true)
    try {
      const r = await fetch(`${EF}?action=solicitar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_id: adminId, propiedad_id: propId,
          ...form, personas: form.personas ? parseInt(form.personas) : null,
          fecha_entrada: fechaEntrada, fecha_salida: fechaSalida, moneda
        })
      })
      const d = await r.json()
      if (!d.ok) throw new Error(d.error)
      setSolicitudOk(d); setPaso(3)
    } catch (e) { alert('Error: ' + e.message) }
    setEnviando(false)
  }

  // Calendar rendering
  function renderCalendario() {
    const [anioN, mesN] = mes.split('-').map(Number)
    const diasMes = new Date(anioN, mesN, 0).getDate()
    const primerDia = new Date(anioN, mesN-1, 1).getDay()
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

    const dias = []
    for (let i = 0; i < primerDia; i++) dias.push(null)
    for (let d = 1; d <= diasMes; d++) {
      const fechaStr = `${anioN}-${String(mesN).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      const ocupado = esDiaOcupado(fechaStr)
      const pasado = esDiaPasado(anioN, mesN-1, d)
      const esEntrada = fechaEntrada === fechaStr
      const esSalida = fechaSalida === fechaStr
      const enRango = estaEnRango(fechaStr)
      dias.push({ d, fechaStr, ocupado, pasado, esEntrada, esSalida, enRango })
    }

    return (
      <div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16, marginBottom:16 }}>
          <button onClick={() => { const d=new Date(anioN,mesN-2,1); setMes(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`) }}
            style={{ background:'#f3f4f6',border:'none',borderRadius:6,padding:'6px 14px',cursor:'pointer',fontSize:16 }}>◀</button>
          <span style={{ fontWeight:'bold', fontSize:16 }}>{meses[mesN-1]} {anioN}</span>
          <button onClick={() => { const d=new Date(anioN,mesN,1); setMes(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`) }}
            style={{ background:'#f3f4f6',border:'none',borderRadius:6,padding:'6px 14px',cursor:'pointer',fontSize:16 }}>▶</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:8 }}>
          {['Do','Lu','Ma','Mi','Ju','Vi','Sá'].map(d => (
            <div key={d} style={{ textAlign:'center',fontSize:11,color:'#888',fontWeight:'bold',padding:'4px 0' }}>{d}</div>
          ))}
          {dias.map((dia, i) => {
            if (!dia) return <div key={i}></div>
            const { d, fechaStr, ocupado, pasado, esEntrada, esSalida, enRango } = dia
            let bg = '#f9fafb', color = '#333', cursor = 'pointer', opacity = 1
            if (pasado || ocupado) { bg = '#f3f4f6'; color = '#ccc'; cursor = 'default'; opacity = 0.6 }
            if (enRango) { bg = '#dbeafe'; color = B }
            if (esEntrada) { bg = G; color = '#fff' }
            if (esSalida) { bg = G; color = '#fff' }
            return (
              <div key={fechaStr} onClick={() => !pasado && !ocupado && handleDiaClick(fechaStr)}
                style={{ textAlign:'center', padding:'8px 4px', borderRadius:6, background:bg, color,
                  cursor, opacity, fontSize:13, fontWeight: esEntrada||esSalida ? 'bold':'normal',
                  border: ocupado ? '1px solid #fecaca' : '1px solid transparent',
                  position:'relative' }}>
                {d}
                {ocupado && !pasado && <div style={{ fontSize:8, color:'#f87171' }}>●</div>}
              </div>
            )
          })}
        </div>

        <div style={{ display:'flex', gap:12, fontSize:11, justifyContent:'center', marginTop:8 }}>
          <span><span style={{ display:'inline-block',width:10,height:10,background:G,borderRadius:2,marginRight:4 }}></span>Seleccionado</span>
          <span><span style={{ display:'inline-block',width:10,height:10,background:'#dbeafe',borderRadius:2,marginRight:4 }}></span>Rango</span>
          <span><span style={{ display:'inline-block',width:10,height:10,background:'#f3f4f6',border:'1px solid #fecaca',borderRadius:2,marginRight:4 }}></span>No disponible</span>
        </div>
      </div>
    )
  }

  const dias = diasEntre(fechaEntrada, fechaSalida)
  const tarifa = moneda === 'USD' ? propiedad?.tarifa_diaria_usd : propiedad?.tarifa_diaria_ars
  const montoEst = tarifa && dias ? tarifa * dias : null

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', fontFamily:'sans-serif' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:12 }}>🏖</div>
        <div style={{ color:'#888' }}>Cargando propiedad...</div>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', fontFamily:'sans-serif' }}>
      <div style={{ textAlign:'center', padding:24, background:'#fef2f2', borderRadius:12, maxWidth:360 }}>
        <div style={{ fontSize:32, marginBottom:12 }}>❌</div>
        <div style={{ color:D, fontWeight:'bold', marginBottom:8 }}>No disponible</div>
        <div style={{ color:'#888', fontSize:13 }}>{error}</div>
      </div>
    </div>
  )

  return (
    <>
      <Head>
        <title>{propiedad?.nombre || 'Reserva'} · GASP</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={`Reserva ${propiedad?.nombre} en ${propiedad?.localidad}`} />
      </Head>
      <div style={{ fontFamily:'system-ui,sans-serif', background:'#f3f4f6', minHeight:'100vh', padding:'0 0 40px' }}>

        {/* Header */}
        <div style={{ background: G, color:'#fff', padding:'20px 24px 16px' }}>
          <div style={{ maxWidth:560, margin:'0 auto' }}>
            <div style={{ fontSize:11, opacity:0.8, marginBottom:4, textTransform:'uppercase', letterSpacing:1 }}>Solicitud de reserva</div>
            <div style={{ fontSize:22, fontWeight:'bold' }}>{propiedad?.nombre}</div>
            <div style={{ fontSize:13, opacity:0.9, marginTop:2 }}>
              {propiedad?.localidad} · {propiedad?.tipo} · {propiedad?.capacidad} personas máx.
            </div>
          </div>
        </div>

        <div style={{ maxWidth:560, margin:'0 auto', padding:'0 16px' }}>

          {/* Paso 3: Confirmación */}
          {paso === 3 && solicitudOk && (
            <div style={{ background:'#fff', borderRadius:12, padding:24, marginTop:20, textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
              <div style={{ fontSize:18, fontWeight:'bold', color:G, marginBottom:8 }}>¡Solicitud enviada!</div>
              <div style={{ fontSize:13, color:'#555', marginBottom:16 }}>
                Tu solicitud <strong>{solicitudOk.solicitud_id}</strong> fue recibida correctamente.
              </div>
              <div style={{ background:'#f0fdf4', borderRadius:8, padding:16, marginBottom:16, textAlign:'left' }}>
                <div style={{ fontSize:12, color:'#888', marginBottom:8 }}>RESUMEN DE TU SOLICITUD</div>
                {[
                  ['Propiedad', solicitudOk.propiedad],
                  ['Ingreso', fechaEntrada],
                  ['Egreso', fechaSalida],
                  ['Noches', solicitudOk.dias + ' noches'],
                  ['Monto estimado', fmt(solicitudOk.monto_estimado, moneda)],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'4px 0', borderBottom:'0.5px solid #e5e7eb' }}>
                    <span style={{ color:'#888' }}>{k}</span>
                    <span style={{ fontWeight:'bold' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:12, color:'#888' }}>
                El administrador revisará tu solicitud y te contactará por teléfono o email para confirmar y coordinar el pago.
              </div>
            </div>
          )}

          {/* Paso 1: Calendario */}
          {paso === 1 && (
            <>
              {propiedad?.descripcion && (
                <div style={{ background:'#fff', borderRadius:12, padding:16, marginTop:16, fontSize:13, color:'#555', lineHeight:1.6 }}>
                  {propiedad.descripcion}
                </div>
              )}

              {/* Tarifas */}
              <div style={{ background:'#fff', borderRadius:12, padding:16, marginTop:12 }}>
                <div style={{ fontSize:12, color:'#888', marginBottom:10, fontWeight:'bold', textTransform:'uppercase', letterSpacing:0.5 }}>Tarifas</div>
                <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                  {propiedad?.tarifa_diaria_ars && (
                    <div style={{ flex:1, minWidth:100, background:'#f9fafb', borderRadius:8, padding:'10px 14px', textAlign:'center' }}>
                      <div style={{ fontSize:11, color:'#888' }}>Por noche (ARS)</div>
                      <div style={{ fontSize:17, fontWeight:'bold', color:G }}>{fmt(propiedad.tarifa_diaria_ars,'ARS')}</div>
                    </div>
                  )}
                  {propiedad?.tarifa_diaria_usd && (
                    <div style={{ flex:1, minWidth:100, background:'#f9fafb', borderRadius:8, padding:'10px 14px', textAlign:'center' }}>
                      <div style={{ fontSize:11, color:'#888' }}>Por noche (USD)</div>
                      <div style={{ fontSize:17, fontWeight:'bold', color:B }}>{fmt(propiedad.tarifa_diaria_usd,'USD')}</div>
                    </div>
                  )}
                  {propiedad?.tarifa_semanal_ars && (
                    <div style={{ flex:1, minWidth:100, background:'#f9fafb', borderRadius:8, padding:'10px 14px', textAlign:'center' }}>
                      <div style={{ fontSize:11, color:'#888' }}>Por semana (ARS)</div>
                      <div style={{ fontSize:17, fontWeight:'bold', color:G }}>{fmt(propiedad.tarifa_semanal_ars,'ARS')}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Calendario */}
              <div style={{ background:'#fff', borderRadius:12, padding:16, marginTop:12 }}>
                <div style={{ fontSize:12, color:'#888', marginBottom:12, fontWeight:'bold', textTransform:'uppercase', letterSpacing:0.5 }}>
                  {seleccionando === 'salida' ? '📅 Seleccioná la fecha de salida' : '📅 Seleccioná la fecha de ingreso'}
                </div>
                {renderCalendario()}
              </div>

              {/* Resumen selección */}
              {fechaEntrada && (
                <div style={{ background:'#fff', borderRadius:12, padding:16, marginTop:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:11, color:'#888' }}>INGRESO</div>
                      <div style={{ fontWeight:'bold', fontSize:15 }}>{fechaEntrada || '—'}</div>
                    </div>
                    <div style={{ fontSize:20, color:'#ccc' }}>→</div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:11, color:'#888' }}>SALIDA</div>
                      <div style={{ fontWeight:'bold', fontSize:15 }}>{fechaSalida || '—'}</div>
                    </div>
                  </div>

                  {fechaSalida && (
                    <>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderTop:'0.5px solid #eee' }}>
                        <span style={{ fontSize:13, color:'#555' }}>{dias} noches × {fmt(tarifa, moneda)}</span>
                        <div style={{ display:'flex', gap:6 }}>
                          {propiedad?.tarifa_diaria_ars && (
                            <button onClick={() => setMoneda('ARS')}
                              style={{ padding:'4px 10px', borderRadius:5, border:'none', cursor:'pointer', fontSize:11,
                                background: moneda==='ARS' ? G : '#f3f4f6', color: moneda==='ARS' ? '#fff' : '#555' }}>ARS</button>
                          )}
                          {propiedad?.tarifa_diaria_usd && (
                            <button onClick={() => setMoneda('USD')}
                              style={{ padding:'4px 10px', borderRadius:5, border:'none', cursor:'pointer', fontSize:11,
                                background: moneda==='USD' ? B : '#f3f4f6', color: moneda==='USD' ? '#fff' : '#555' }}>USD</button>
                          )}
                        </div>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', fontWeight:'bold', fontSize:16, padding:'8px 0', borderTop:'0.5px solid #eee' }}>
                        <span>Total estimado</span>
                        <span style={{ color: moneda==='USD' ? B : G }}>{fmt(montoEst, moneda)}</span>
                      </div>
                      <button onClick={() => setPaso(2)}
                        style={{ width:'100%', padding:'14px', borderRadius:8, border:'none', cursor:'pointer',
                          background:G, color:'#fff', fontWeight:'bold', fontSize:15, marginTop:8 }}>
                        Continuar con la reserva →
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* Paso 2: Formulario */}
          {paso === 2 && (
            <div style={{ background:'#fff', borderRadius:12, padding:20, marginTop:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
                <button onClick={() => setPaso(1)} style={{ background:'#f3f4f6',border:'none',borderRadius:6,padding:'6px 12px',cursor:'pointer',fontSize:13 }}>← Volver</button>
                <span style={{ fontWeight:'bold', fontSize:15 }}>Tus datos</span>
              </div>

              {/* Resumen fechas */}
              <div style={{ background:'#f0fdf4', borderRadius:8, padding:12, marginBottom:16, fontSize:13 }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span>📅 {fechaEntrada} → {fechaSalida}</span>
                  <span style={{ fontWeight:'bold', color:G }}>{dias} noches · {fmt(montoEst, moneda)}</span>
                </div>
              </div>

              {[
                { key:'huesped_nombre', label:'Nombre completo *', type:'text', placeholder:'Tu nombre y apellido' },
                { key:'huesped_telefono', label:'Teléfono / WhatsApp *', type:'tel', placeholder:'Ej: 2254-123456' },
                { key:'huesped_email', label:'Email', type:'email', placeholder:'tu@email.com' },
                { key:'huesped_dni', label:'DNI / Pasaporte', type:'text', placeholder:'Número de documento' },
                { key:'huesped_ciudad', label:'Ciudad de origen', type:'text', placeholder:'¿De dónde venís?' },
                { key:'personas', label:'Cantidad de personas', type:'number', placeholder:`Máx. ${propiedad?.capacidad || '—'}` },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key} style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:12, color:'#555', marginBottom:4, fontWeight:'bold' }}>{label}</label>
                  <input type={type} value={form[key]} onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
                    placeholder={placeholder}
                    style={{ width:'100%', padding:'10px 12px', border:'1px solid #ddd', borderRadius:7, fontSize:14, boxSizing:'border-box' }} />
                </div>
              ))}

              <div style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:12, color:'#555', marginBottom:4, fontWeight:'bold' }}>Mensaje / Consulta</label>
                <textarea value={form.mensaje} onChange={e => setForm(f => ({...f, mensaje: e.target.value}))}
                  placeholder="¿Tenés alguna consulta o pedido especial?"
                  rows={3}
                  style={{ width:'100%', padding:'10px 12px', border:'1px solid #ddd', borderRadius:7, fontSize:14, boxSizing:'border-box', resize:'vertical', fontFamily:'inherit' }} />
              </div>

              <div style={{ fontSize:11, color:'#888', marginBottom:16, lineHeight:1.5 }}>
                * Al enviar esta solicitud no se realiza ningún pago. El administrador te contactará para confirmar disponibilidad y coordinar la seña.
              </div>

              <button onClick={enviarSolicitud} disabled={enviando || !form.huesped_nombre.trim() || !form.huesped_telefono.trim()}
                style={{ width:'100%', padding:'14px', borderRadius:8, border:'none', cursor:'pointer',
                  background: enviando ? '#888' : G, color:'#fff', fontWeight:'bold', fontSize:15,
                  opacity: (!form.huesped_nombre.trim() || !form.huesped_telefono.trim()) ? 0.6 : 1 }}>
                {enviando ? '⏳ Enviando...' : '✅ Enviar solicitud de reserva'}
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
