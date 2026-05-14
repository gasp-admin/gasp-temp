import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

// ─── COLORES ────────────────────────────────────────────
const G = '#1B6B35'   // verde
const B = '#1A3FA0'   // azul
const W = '#C07D10'   // naranja
const D = '#B83030'   // rojo
const SUPERADMIN = 'javiergp@live.com.ar'

// ─── HELPERS ────────────────────────────────────────────
const fmt = n => n ? '$' + Number(n).toLocaleString('es-AR') : '$0'
const fmtUSD = n => n ? 'USD ' + Number(n).toLocaleString('es-AR') : 'USD 0'
const fmtM = (n, mon) => mon === 'USD' ? fmtUSD(n) : fmt(n)

function nextId(items, prefix) {
  const nums = (items || []).map(x => x.id || '').filter(id => id.startsWith(prefix))
    .map(id => parseInt(id.slice(prefix.length), 10)).filter(n => !isNaN(n))
  return prefix + String((nums.length > 0 ? Math.max(...nums) : 0) + 1).padStart(3, '0')
}

function diasEntre(desde, hasta) {
  if (!desde || !hasta) return 0
  const d1 = new Date(desde), d2 = new Date(hasta)
  return Math.max(0, Math.ceil((d2 - d1) / 86400000))
}

function formatFecha(f) {
  if (!f) return '—'
  const [y, m, d] = f.split('-')
  return `${d}/${m}/${y}`
}

// ─── COMPONENTES UI ─────────────────────────────────────
function Pill({ text, color }) {
  const map = {
    ok:     { bg: '#E8F5EE', c: '#1B6B35' },
    warn:   { bg: '#FEF3E2', c: '#8A5C10' },
    danger: { bg: '#FCEAEA', c: '#8A2020' },
    blue:   { bg: '#E8EEFB', c: '#1A3FA0' },
    gray:   { bg: '#F2F4F6', c: '#555' },
    orange: { bg: '#FFF3E0', c: '#C07D10' },
  }
  const s = map[color] || map.gray
  return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 'bold', background: s.bg, color: s.c }}>{text}</span>
}

function Card({ children, style }) {
  return <div style={{ background: '#fff', borderRadius: 10, padding: 18, border: '0.5px solid #E8ECF0', marginBottom: 12, ...style }}>{children}</div>
}

function Input({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      {label && <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{label}</div>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }} />
    </div>
  )
}

function Btn({ children, onClick, color = G, disabled, style }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: '8px 18px', borderRadius: 8, background: disabled ? '#aaa' : color, color: '#fff', border: 'none', cursor: disabled ? 'wait' : 'pointer', fontSize: 13, fontWeight: 'bold', ...style }}>
      {children}
    </button>
  )
}

function BtnSec({ children, onClick }) {
  return (
    <button onClick={onClick}
      style={{ padding: '8px 18px', borderRadius: 8, background: '#F0F0F0', color: '#555', border: 'none', cursor: 'pointer', fontSize: 13 }}>
      {children}
    </button>
  )
}

function Tabla({ cols, filas }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1.5px solid #E8ECF0' }}>
            {cols.map((c, i) => <th key={i} style={{ padding: '8px 12px', textAlign: 'left', color: '#888', fontWeight: 600, fontSize: 11 }}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i} style={{ borderBottom: '0.5px solid #F0F2F5', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
              {f.map((c, j) => <td key={j} style={{ padding: '9px 12px' }}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {filas.length === 0 && <div style={{ color: '#bbb', fontSize: 13, padding: '16px 12px' }}>Sin registros</div>}
    </div>
  )
}

// ─── CALENDARIO ─────────────────────────────────────────
function Calendario({ reservas, propiedades, onSelect }) {
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth())
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [vista, setVista] = useState('gantt') // 'gantt' | 'mes'
  const nombresMes = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const diasMes = new Date(anio, mes + 1, 0).getDate()
  const colorEstado = { 'Confirmada': '#1B6B35', 'Señada': '#C07D10', 'Pendiente': '#1A3FA0', 'Cancelada': '#999' }
  const bgEstado = { 'Confirmada': '#E8F5EE', 'Señada': '#FEF3E2', 'Pendiente': '#E8EEFB', 'Cancelada': '#F2F4F6' }

  function reservasDelDia(propId, dia) {
    const fecha = `${anio}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
    return reservas.filter(r =>
      r.propiedad_id === propId &&
      r.estado !== 'Cancelada' &&
      r.fecha_entrada <= fecha &&
      r.fecha_salida > fecha
    )
  }

  function reservasBloqueandoDia(propId, dia) {
    // Returns the first reservation blocking this day
    const rs = reservasDelDia(propId, dia)
    return rs.length > 0 ? rs[0] : null
  }

  function esHoy(dia) {
    return new Date().toISOString().split('T')[0] === `${anio}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
  }

  // Gantt: for each property, compute contiguous segments
  function segmentosProp(propId) {
    const segs = []
    let i = 1
    while (i <= diasMes) {
      const r = reservasBloqueandoDia(propId, i)
      if (r) {
        // Find how many days this reservation spans in current month
        let j = i
        while (j <= diasMes && reservasBloqueandoDia(propId, j)?.id === r.id) j++
        segs.push({ inicio: i, fin: j - 1, reserva: r, cols: j - i })
        i = j
      } else {
        // Find next reserved day
        let j = i
        while (j <= diasMes && !reservasBloqueandoDia(propId, j)) j++
        segs.push({ inicio: i, fin: j - 1, reserva: null, cols: j - i })
        i = j
      }
    }
    return segs
  }

  // Total noches reservadas por propiedad en el mes
  function ocupacion(propId) {
    let total = 0
    for (let d = 1; d <= diasMes; d++) {
      if (reservasBloqueandoDia(propId, d)) total++
    }
    return total
  }

  const btnVista = (v, label) => (
    <button onClick={() => setVista(v)}
      style={{ padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 'bold',
        background: vista === v ? G : '#F0F0F0', color: vista === v ? '#fff' : '#888' }}>
      {label}
    </button>
  )

  return (
    <div>
      {/* Header controles */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => { if (mes === 0) { setMes(11); setAnio(a => a-1) } else setMes(m => m-1) }}
          style={{ padding: '6px 12px', borderRadius: 6, border: '0.5px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 14 }}>◀</button>
        <span style={{ fontWeight: 'bold', fontSize: 15, minWidth: 150, textAlign: 'center' }}>{nombresMes[mes]} {anio}</span>
        <button onClick={() => { if (mes === 11) { setMes(0); setAnio(a => a+1) } else setMes(m => m+1) }}
          style={{ padding: '6px 12px', borderRadius: 6, border: '0.5px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 14 }}>▶</button>
        <button onClick={() => { setMes(hoy.getMonth()); setAnio(hoy.getFullYear()) }}
          style={{ padding: '5px 10px', borderRadius: 6, border: '0.5px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 11, color: '#888' }}>
          Hoy
        </button>
        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          {btnVista('gantt', '📊 Gantt')}
          {btnVista('mes', '📅 Grilla')}
        </div>
        <div style={{ display: 'flex', gap: 10, fontSize: 11, marginLeft: 8, flexWrap: 'wrap' }}>
          {Object.entries(colorEstado).filter(([k]) => k !== 'Cancelada').map(([est, col]) => (
            <span key={est} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: col, display: 'inline-block' }}></span>{est}
            </span>
          ))}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#E8F5EE', border: '1px solid #aaa', display: 'inline-block' }}></span>Libre
          </span>
        </div>
      </div>

      {/* ── VISTA GANTT ── */}
      {vista === 'gantt' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 700, tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 160 }} />
              {Array.from({ length: diasMes }, (_, i) => (
                <col key={i} style={{ width: Math.max(28, typeof window !== 'undefined' ? Math.floor((window.innerWidth - 230) / diasMes) : 40) + 'px' }} />
              ))}
              <col style={{ width: 50 }} />
            </colgroup>
            <thead>
              <tr style={{ background: '#F2F4F6' }}>
                <th style={{ padding: '7px 10px', textAlign: 'left', fontSize: 11, fontWeight: 'bold', color: '#555', borderBottom: '1px solid #ddd', position: 'sticky', left: 0, background: '#F2F4F6', zIndex: 2 }}>
                  Propiedad
                </th>
                {Array.from({ length: diasMes }, (_, i) => {
                  const d = i + 1
                  const dow = new Date(anio, mes, d).getDay()
                  const finde = dow === 0 || dow === 6
                  return (
                    <th key={d} style={{
                      padding: '4px 2px', textAlign: 'center', fontSize: 10, fontWeight: esHoy(d) ? 'bold' : 'normal',
                      color: esHoy(d) ? '#1A3FA0' : finde ? '#C07D10' : '#555',
                      borderBottom: '1px solid #ddd',
                      borderLeft: esHoy(d) ? '2px solid #1A3FA0' : '1px solid #eee',
                      background: esHoy(d) ? '#EEF2FF' : finde ? '#FFFBF0' : '#F2F4F6',
                    }}>
                      {d}
                    </th>
                  )
                })}
                <th style={{ padding: '7px 4px', textAlign: 'center', fontSize: 10, color: '#555', borderBottom: '1px solid #ddd' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {propiedades.map((prop, pi) => {
                const segs = segmentosProp(prop.id)
                const ocu = ocupacion(prop.id)
                const pct = Math.round(ocu / diasMes * 100)
                return (
                  <tr key={prop.id} style={{ borderBottom: '1px solid #eee', background: pi % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{
                      padding: '6px 10px', fontSize: 12, fontWeight: 'bold', whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160,
                      position: 'sticky', left: 0, background: pi % 2 === 0 ? '#fff' : '#FAFAFA', zIndex: 1,
                      borderRight: '1px solid #eee'
                    }}>
                      {prop.nombre}
                      <div style={{ fontSize: 10, color: '#888', fontWeight: 'normal' }}>{prop.localidad}</div>
                    </td>
                    {segs.map((seg, si) => {
                      const r = seg.reserva
                      return (
                        <td key={si} colSpan={seg.cols}
                          onClick={() => r && onSelect && onSelect(r)}
                          style={{
                            padding: r ? '3px 4px' : '3px 2px',
                            cursor: r ? 'pointer' : 'default',
                            background: r ? (colorEstado[r.estado] || '#999') : 'transparent',
                            borderLeft: '1px solid ' + (r ? 'rgba(0,0,0,0.1)' : '#eee'),
                            borderRadius: r ? 4 : 0,
                            verticalAlign: 'middle',
                            overflow: 'hidden',
                          }}
                          title={r ? `${r.huesped_nombre} · ${r.fecha_entrada} → ${r.fecha_salida} · ${r.estado}` : ''}
                        >
                          {r && (
                            <div style={{ color: '#fff', fontSize: 9, fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {seg.cols > 2 ? (r.huesped_nombre?.split(' ')[0] || '●') : '●'}
                            </div>
                          )}
                        </td>
                      )
                    })}
                    <td style={{ textAlign: 'center', fontSize: 10, fontWeight: 'bold', color: pct > 70 ? G : pct > 40 ? W : '#888', padding: '4px 2px' }}>
                      {pct}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {propiedades.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: '#bbb', fontSize: 13 }}>No hay propiedades cargadas</div>
          )}
        </div>
      )}

      {/* ── VISTA GRILLA POR PROPIEDAD ── */}
      {vista === 'mes' && (
        <>
          {propiedades.map(prop => {
            const primerDia = new Date(anio, mes, 1).getDay()
            return (
              <Card key={prop.id} style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 10, color: G }}>
                  {prop.nombre}
                  <span style={{ marginLeft: 8, fontSize: 11, color: '#888', fontWeight: 'normal' }}>
                    {prop.localidad} · {prop.capacidad} pers. · {ocupacion(prop.id)} noches reservadas ({Math.round(ocupacion(prop.id)/diasMes*100)}%)
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
                  {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: 10, color: '#888', fontWeight: 'bold', padding: '4px 0' }}>{d}</div>
                  ))}
                  {Array.from({ length: primerDia }, (_, i) => <div key={'e'+i}></div>)}
                  {Array.from({ length: diasMes }, (_, i) => {
                    const dia = i + 1
                    const res = reservasBloqueandoDia(prop.id, dia)
                    return (
                      <div key={dia} onClick={() => res && onSelect && onSelect(res)}
                        style={{
                          textAlign: 'center', padding: '6px 2px', borderRadius: 4,
                          cursor: res ? 'pointer' : 'default',
                          background: res ? (colorEstado[res.estado] || '#888') : '#F7F8FA',
                          color: res ? '#fff' : '#333',
                          fontSize: 11, fontWeight: esHoy(dia) ? 'bold' : 'normal',
                          border: esHoy(dia) ? '2px solid #1A3FA0' : '1px solid transparent',
                        }}
                        title={res ? res.huesped_nombre : ''}>
                        {dia}
                        {res && <div style={{ fontSize: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {res.huesped_nombre?.split(' ')[0] || '●'}
                        </div>}
                      </div>
                    )
                  })}
                </div>
              </Card>
            )
          })}
        </>
      )}
    </div>
  )
}

function Solicitudes({ adminId, propiedades, onRefresh }) {
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading] = useState(true)
  const [respondiendo, setRespondiendo] = useState(null)
  const [respuesta, setRespuesta] = useState('')

  useEffect(() => { if (adminId) cargar() }, [adminId])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('reservas_publicas_temp')
      .select('*')
      .order('fecha_solicitud', { ascending: false })
    setSolicitudes(data || [])
    setLoading(false)
  }

  async function responder(sol, nuevoEstado) {
    const { error } = await supabase
      .from('reservas_publicas_temp')
      .update({ estado: nuevoEstado, respuesta_admin: respuesta || null, fecha_respuesta: new Date().toISOString() })
      .eq('id', sol.id)
    if (error) return alert('Error: ' + error.message)
    setRespondiendo(null); setRespuesta(''); cargar()

    // If confirmed, offer to create as formal reservation
    if (nuevoEstado === 'Confirmada') {
      const ok = confirm(`¿Crear reserva formal para ${sol.huesped_nombre}?`)
      if (ok) {
        const nextNum = Math.max(0, ...((await supabase.from('reservas_temp').select('id').eq('admin_id', adminId)).data || [])
          .map(r => parseInt(r.id.replace(/\D/g,'')) || 0)) + 1
        const newId = 'RV' + String(nextNum).padStart(3, '0')
        await supabase.from('reservas_temp').insert([{
          id: newId,
          admin_id: adminId,
          propiedad_id: sol.propiedad_id,
          huesped_nombre: sol.huesped_nombre,
          huesped_dni: sol.huesped_dni || '',
          huesped_telefono: sol.huesped_telefono,
          huesped_email: sol.huesped_email || '',
          huesped_ciudad: sol.huesped_ciudad || '',
          fecha_entrada: sol.fecha_entrada,
          fecha_salida: sol.fecha_salida,
          dias: sol.dias,
          moneda: sol.moneda || 'ARS',
          monto_total: sol.monto_estimado || 0,
          estado: 'Confirmada',
          observaciones: 'Creada desde solicitud web ' + sol.id,
        }])
        alert('Reserva ' + newId + ' creada correctamente.')
        if (onRefresh) onRefresh()
      }
    }
  }

  const colorEstado = { 'Pendiente': '#C07D10', 'Confirmada': '#1B6B35', 'Rechazada': '#B91C1C' }
  const bgEstado    = { 'Pendiente': '#FEF3E2', 'Confirmada': '#E8F5EE',  'Rechazada': '#FEF2F2' }
  const pendientes = solicitudes.filter(s => s.estado === 'Pendiente').length

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <span style={{ fontWeight:'bold', fontSize:15 }}>📩 Solicitudes de reserva web</span>
          {pendientes > 0 && <span style={{ marginLeft:8, background:'#C07D10', color:'#fff', fontSize:11, padding:'2px 8px', borderRadius:10 }}>{pendientes} pendiente{pendientes>1?'s':''}</span>}
        </div>
        <button onClick={cargar} style={{ padding:'5px 12px', borderRadius:6, border:'1px solid #ddd', background:'#fff', cursor:'pointer', fontSize:12 }}>↺ Actualizar</button>
      </div>

      {loading && <div style={{ color:'#888', fontSize:13 }}>Cargando...</div>}
      {!loading && solicitudes.length === 0 && (
        <Card>
          <div style={{ color:'#bbb', textAlign:'center', padding:20, fontSize:13 }}>
            No hay solicitudes de reserva aún.<br />
            <span style={{ fontSize:12 }}>Las solicitudes llegan cuando los huéspedes usan el link público de reserva de cada propiedad.</span>
          </div>
        </Card>
      )}

      {solicitudes.map(sol => {
        const prop = propiedades.find(p => p.id === sol.propiedad_id)
        const dias = sol.dias || Math.ceil((new Date(sol.fecha_salida) - new Date(sol.fecha_entrada)) / 86400000)
        return (
          <Card key={sol.id} style={{ marginBottom:12, borderLeft:`4px solid ${colorEstado[sol.estado] || '#ddd'}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span style={{ fontWeight:'bold', fontSize:14 }}>{sol.huesped_nombre}</span>
                  <span style={{ fontSize:10, background: bgEstado[sol.estado], color: colorEstado[sol.estado], padding:'2px 8px', borderRadius:8, fontWeight:'bold' }}>{sol.estado}</span>
                  <span style={{ fontSize:11, color:'#888' }}>#{sol.id}</span>
                </div>
                <div style={{ fontSize:12, color:'#555', lineHeight:1.7 }}>
                  <div>🏠 {prop?.nombre || sol.propiedad_id}</div>
                  <div>📅 {sol.fecha_entrada} → {sol.fecha_salida} ({dias} noches)</div>
                  <div>📱 {sol.huesped_telefono}{sol.huesped_email ? ` · ${sol.huesped_email}` : ''}</div>
                  {sol.personas && <div>👥 {sol.personas} personas</div>}
                  {sol.monto_estimado && <div>💰 {sol.moneda === 'USD' ? 'USD' : '$'} {Number(sol.monto_estimado).toLocaleString('es-AR')} estimado</div>}
                  {sol.mensaje && <div style={{ marginTop:4, fontStyle:'italic', color:'#888' }}>"{sol.mensaje}"</div>}
                </div>
                <div style={{ fontSize:11, color:'#bbb', marginTop:4 }}>
                  Solicitud: {new Date(sol.fecha_solicitud).toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                </div>
              </div>

              {sol.estado === 'Pendiente' && (
                <div style={{ display:'flex', flexDirection:'column', gap:6, minWidth:120 }}>
                  {respondiendo === sol.id ? (
                    <>
                      <textarea value={respuesta} onChange={e => setRespuesta(e.target.value)}
                        placeholder="Mensaje al huésped (opcional)"
                        rows={2}
                        style={{ padding:'6px 8px', border:'1px solid #ddd', borderRadius:6, fontSize:12, fontFamily:'inherit', resize:'none', width:180 }} />
                      <button onClick={() => responder(sol, 'Confirmada')}
                        style={{ padding:'6px 10px', borderRadius:6, border:'none', cursor:'pointer', background:'#1B6B35', color:'#fff', fontSize:12, fontWeight:'bold' }}>
                        ✅ Confirmar
                      </button>
                      <button onClick={() => responder(sol, 'Rechazada')}
                        style={{ padding:'6px 10px', borderRadius:6, border:'none', cursor:'pointer', background:'#B91C1C', color:'#fff', fontSize:12 }}>
                        ✗ Rechazar
                      </button>
                      <button onClick={() => { setRespondiendo(null); setRespuesta('') }}
                        style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #ddd', cursor:'pointer', background:'#fff', fontSize:11 }}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setRespondiendo(sol.id)}
                      style={{ padding:'8px 14px', borderRadius:6, border:'none', cursor:'pointer', background:'#C07D10', color:'#fff', fontSize:12, fontWeight:'bold' }}>
                      📬 Responder
                    </button>
                  )}
                </div>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}


function Propiedades({ data, onRefresh }) {
  const vacio = { nombre: '', localidad: 'Pinamar', tipo: 'Departamento', capacidad: '', descripcion: '', tarifa_diaria_ars: '', tarifa_diaria_usd: '', tarifa_semanal_ars: '', tarifa_semanal_usd: '', comision_pct: 10, propietario_id: '' }
  const [form, setForm] = useState(false)
  const [f, setF] = useState(vacio)
  const [editando, setEditando] = useState(null)

  function editar(p) {
    setF({ nombre: p.nombre||'', localidad: p.localidad||'Pinamar', tipo: p.tipo||'Departamento', capacidad: p.capacidad||'', descripcion: p.descripcion||'', tarifa_diaria_ars: p.tarifa_diaria_ars||'', tarifa_diaria_usd: p.tarifa_diaria_usd||'', tarifa_semanal_ars: p.tarifa_semanal_ars||'', tarifa_semanal_usd: p.tarifa_semanal_usd||'', comision_pct: p.comision_pct||10, propietario_id: p.propietario_id||'' })
    setEditando(p.id); setForm(true)
  }

  async function guardar() {
    if (!f.nombre) return alert('Complete el nombre de la propiedad')
    const adminId = (await supabase.auth.getUser()).data.user?.id
    const datos = { ...f, capacidad: Number(f.capacidad)||0, tarifa_diaria_ars: Number(f.tarifa_diaria_ars)||0, tarifa_diaria_usd: Number(f.tarifa_diaria_usd)||0, tarifa_semanal_ars: Number(f.tarifa_semanal_ars)||0, tarifa_semanal_usd: Number(f.tarifa_semanal_usd)||0, comision_pct: Number(f.comision_pct)||10 }
    if (editando) {
      const { error } = await supabase.from('prop_temp').update(datos).eq('id', editando)
      if (error) return alert('Error: ' + error.message)
    } else {
      const { error } = await supabase.from('prop_temp').insert([{ ...datos, id: nextId(data, 'PT'), activo: true, admin_id: adminId }])
      if (error) return alert('Error: ' + error.message)
    }
    setForm(false); setF(vacio); setEditando(null); onRefresh()
  }

  async function darBaja(p) {
    if (!window.confirm('¿Dar de baja ' + p.nombre + '?')) return
    await supabase.from('prop_temp').update({ activo: false }).eq('id', p.id)
    onRefresh()
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#888' }}>{data.length} propiedades</div>
        <Btn onClick={() => { setF(vacio); setEditando(null); setForm(true) }}>+ Nueva propiedad</Btn>
      </div>
      {form && (
        <Card style={{ marginBottom: 16, border: '1px solid ' + G }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 14 }}>{editando ? 'Editar propiedad' : 'Nueva propiedad'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {!editando && <div style={{ gridColumn: 'span 2', fontSize: 11, color: '#888' }}>ID auto: {nextId(data, 'PT')}</div>}
            <Input label="Nombre / alias (ej: Depto Apolo 3A)" value={f.nombre} onChange={v => setF({...f, nombre: v})} />
            <Input label="Localidad" value={f.localidad} onChange={v => setF({...f, localidad: v})} />
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Tipo</div>
              <select value={f.tipo} onChange={e => setF({...f, tipo: e.target.value})} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                <option>Departamento</option><option>Casa</option><option>PH</option><option>Cabaña</option><option>Otro</option>
              </select>
            </div>
            <Input label="Capacidad (personas)" value={f.capacidad} onChange={v => setF({...f, capacidad: v})} type="number" />
            <Input label="Tarifa diaria $" value={f.tarifa_diaria_ars} onChange={v => setF({...f, tarifa_diaria_ars: v})} type="number" />
            <Input label="Tarifa diaria USD" value={f.tarifa_diaria_usd} onChange={v => setF({...f, tarifa_diaria_usd: v})} type="number" />
            <Input label="Tarifa semanal $" value={f.tarifa_semanal_ars} onChange={v => setF({...f, tarifa_semanal_ars: v})} type="number" />
            <Input label="Tarifa semanal USD" value={f.tarifa_semanal_usd} onChange={v => setF({...f, tarifa_semanal_usd: v})} type="number" />
            <Input label="Comisión administración %" value={f.comision_pct} onChange={v => setF({...f, comision_pct: v})} type="number" />
            <Input label="ID Propietario" value={f.propietario_id} onChange={v => setF({...f, propietario_id: v})} />
            <div style={{ gridColumn: 'span 2' }}>
              <Input label="Descripción / observaciones" value={f.descripcion} onChange={v => setF({...f, descripcion: v})} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={guardar}>{editando ? 'Guardar cambios' : 'Guardar'}</Btn>
            <BtnSec onClick={() => { setForm(false); setEditando(null) }}>Cancelar</BtnSec>
          </div>
        </Card>
      )}
      <Card>
        <Tabla
          cols={['ID', 'Nombre', 'Localidad', 'Tipo', 'Cap.', 'Tarifa día $', 'Tarifa día USD', 'Comisión', 'Acciones']}
          filas={data.map(p => [
            <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.id}</span>,
            <span style={{ fontWeight: 'bold' }}>{p.nombre}</span>,
            p.localidad,
            p.tipo,
            p.capacidad + ' p.',
            fmt(p.tarifa_diaria_ars),
            fmtUSD(p.tarifa_diaria_usd),
            p.comision_pct + '%',
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <button onClick={() => editar(p)} style={{ padding: '3px 8px', borderRadius: 5, background: W, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✏ Editar</button>
              <button
                onClick={() => {
                  const base = typeof window !== 'undefined' ? window.location.origin : ''
                  const url = base + '/reserva?admin_id=' + p.admin_id + '&propiedad_id=' + p.id
                  navigator.clipboard.writeText(url).then(() => alert('Link de reserva copiado:\n' + url))
                }}
                style={{ padding: '3px 8px', borderRadius: 5, background: '#0891B2', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}
                title="Copiar link público de reservas">🔗 Reserva</button>
              <button onClick={() => darBaja(p)} style={{ padding: '3px 8px', borderRadius: 5, background: D, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✗ Baja</button>
            </div>
          ])}
        />
      </Card>
    </>
  )
}

// ─── MÓDULO PROPIETARIOS ─────────────────────────────────
function Propietarios({ data, onRefresh }) {
  const vacio = { apellido_nombre: '', dni_cuit: '', telefono: '', email: '', cbu: '', banco: '', ciudad_residencia: '' }
  const [form, setForm] = useState(false)
  const [f, setF] = useState(vacio)
  const [editando, setEditando] = useState(null)

  function editar(p) { setF({ apellido_nombre: p.apellido_nombre||'', dni_cuit: p.dni_cuit||'', telefono: p.telefono||'', email: p.email||'', cbu: p.cbu||'', banco: p.banco||'', ciudad_residencia: p.ciudad_residencia||'' }); setEditando(p.id); setForm(true) }

  async function guardar() {
    if (!f.apellido_nombre) return alert('Complete apellido y nombre')
    const adminId = (await supabase.auth.getUser()).data.user?.id
    if (editando) {
      await supabase.from('prop_owners_temp').update(f).eq('id', editando)
    } else {
      await supabase.from('prop_owners_temp').insert([{ ...f, id: nextId(data, 'PO'), activo: true, admin_id: adminId }])
    }
    setForm(false); setF(vacio); setEditando(null); onRefresh()
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#888' }}>{data.length} propietarios</div>
        <Btn onClick={() => { setF(vacio); setEditando(null); setForm(true) }}>+ Nuevo propietario</Btn>
      </div>
      {form && (
        <Card style={{ marginBottom: 16, border: '1px solid ' + G }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 14 }}>{editando ? 'Editar' : 'Nuevo propietario'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {!editando && <div style={{ gridColumn: 'span 2', fontSize: 11, color: '#888' }}>ID auto: {nextId(data, 'PO')}</div>}
            <Input label="Apellido y nombre" value={f.apellido_nombre} onChange={v => setF({...f, apellido_nombre: v})} />
            <Input label="DNI / CUIT" value={f.dni_cuit} onChange={v => setF({...f, dni_cuit: v})} />
            <Input label="Teléfono" value={f.telefono} onChange={v => setF({...f, telefono: v})} />
            <Input label="Email" value={f.email} onChange={v => setF({...f, email: v})} />
            <Input label="CBU" value={f.cbu} onChange={v => setF({...f, cbu: v})} />
            <Input label="Banco" value={f.banco} onChange={v => setF({...f, banco: v})} />
            <Input label="Ciudad de residencia" value={f.ciudad_residencia} onChange={v => setF({...f, ciudad_residencia: v})} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={guardar}>{editando ? 'Guardar cambios' : 'Guardar'}</Btn>
            <BtnSec onClick={() => { setForm(false); setEditando(null) }}>Cancelar</BtnSec>
          </div>
        </Card>
      )}
      <Card>
        <Tabla
          cols={['ID', 'Nombre', 'DNI/CUIT', 'Teléfono', 'Email', 'Ciudad', 'Banco', 'Acciones']}
          filas={data.map(p => [
            <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.id}</span>,
            <span style={{ fontWeight: 'bold' }}>{p.apellido_nombre}</span>,
            p.dni_cuit||'—', p.telefono||'—', p.email||'—', p.ciudad_residencia||'—', p.banco||'—',
            <button onClick={() => editar(p)} style={{ padding: '3px 8px', borderRadius: 5, background: W, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✏ Editar</button>
          ])}
        />
      </Card>
    </>
  )
}

// ─── MÓDULO RESERVAS ─────────────────────────────────────
function Reservas({ data, propiedades, onRefresh }) {
  const hoy = new Date().toISOString().split('T')[0]
  const vacio = { propiedad_id: '', huesped_nombre: '', huesped_dni: '', huesped_telefono: '', huesped_email: '', huesped_ciudad: '', fecha_entrada: '', fecha_salida: '', modalidad: 'Diaria', moneda: 'ARS', monto_total: '', seña: 0, estado: 'Pendiente', observaciones: '' }
  const [form, setForm] = useState(false)
  const [f, setF] = useState(vacio)
  const [editando, setEditando] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('')

  function calcMonto() {
    const prop = propiedades.find(p => p.id === f.propiedad_id)
    if (!prop || !f.fecha_entrada || !f.fecha_salida) return 0
    const dias = diasEntre(f.fecha_entrada, f.fecha_salida)
    // TODO: temporadas se cargan desde props o contexto futuro — por ahora usa tarifas base
    if (f.modalidad === 'Semanal') {
      const semanas = Math.ceil(dias / 7)
      return f.moneda === 'USD' ? semanas * (prop.tarifa_semanal_usd || 0) : semanas * (prop.tarifa_semanal_ars || 0)
    }
    return f.moneda === 'USD' ? dias * (prop.tarifa_diaria_usd || 0) : dias * (prop.tarifa_diaria_ars || 0)
  }

  function verificarDisponibilidad() {
    if (!f.propiedad_id || !f.fecha_entrada || !f.fecha_salida) return true
    const conflictos = data.filter(r => {
      if (r.propiedad_id !== f.propiedad_id) return false
      if (r.estado === 'Cancelada') return false
      if (editando && r.id === editando) return false
      return r.fecha_entrada < f.fecha_salida && r.fecha_salida > f.fecha_entrada
    })
    return conflictos.length === 0
  }

  function selProp(pid) {
    const prop = propiedades.find(p => p.id === pid)
    setF(prev => ({
      ...prev, propiedad_id: pid,
      monto_total: prev.fecha_entrada && prev.fecha_salida && prop ? String(calcMonto()) : prev.monto_total
    }))
  }

  function editar(r) {
    setF({ propiedad_id: r.propiedad_id||'', huesped_nombre: r.huesped_nombre||'', huesped_dni: r.huesped_dni||'', huesped_telefono: r.huesped_telefono||'', huesped_email: r.huesped_email||'', huesped_ciudad: r.huesped_ciudad||'', fecha_entrada: r.fecha_entrada||'', fecha_salida: r.fecha_salida||'', modalidad: r.modalidad||'Diaria', moneda: r.moneda||'ARS', monto_total: r.monto_total||'', seña: r.seña||0, estado: r.estado||'Pendiente', observaciones: r.observaciones||'' })
    setEditando(r.id); setForm(true)
  }

  async function guardar() {
    if (!f.propiedad_id || !f.huesped_nombre || !f.fecha_entrada || !f.fecha_salida) return alert('Complete propiedad, huésped y fechas')
    if (new Date(f.fecha_salida) <= new Date(f.fecha_entrada)) return alert('La fecha de salida debe ser posterior a la entrada')
    if (!verificarDisponibilidad()) return alert('⚠ La propiedad ya tiene una reserva en ese período')
    const adminId = (await supabase.auth.getUser()).data.user?.id
    const dias = diasEntre(f.fecha_entrada, f.fecha_salida)
    const monto = Number(f.monto_total) || calcMonto()
    const prop = propiedades.find(p => p.id === f.propiedad_id)
    const comision = monto * (prop?.comision_pct || 10) / 100
    const datos = { ...f, monto_total: monto, seña: Number(f.seña)||0, dias, comision, neto_propietario: monto - comision }
    if (editando) {
      await supabase.from('reservas_temp').update(datos).eq('id', editando)
    } else {
      await supabase.from('reservas_temp').insert([{ ...datos, id: nextId(data, 'RV'), admin_id: adminId }])
    }
    setForm(false); setF(vacio); setEditando(null); onRefresh()
  }

  async function cancelar(r) {
    if (!window.confirm('¿Cancelar la reserva de ' + r.huesped_nombre + '?')) return
    await supabase.from('reservas_temp').update({ estado: 'Cancelada' }).eq('id', r.id)
    onRefresh()
  }

  const dataFiltrada = filtroEstado ? data.filter(r => r.estado === filtroEstado) : data
  const disponible = verificarDisponibilidad()
  const montoSugerido = calcMonto()
  const dias = diasEntre(f.fecha_entrada, f.fecha_salida)

  const colorEstado = { 'Confirmada': 'ok', 'Señada': 'warn', 'Pendiente': 'blue', 'Cancelada': 'danger' }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['', 'Pendiente', 'Señada', 'Confirmada', 'Cancelada'].map(e => (
            <button key={e} onClick={() => setFiltroEstado(e)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, background: filtroEstado === e ? G : '#F0F0F0', color: filtroEstado === e ? '#fff' : '#555', fontWeight: filtroEstado === e ? 'bold' : 'normal' }}>
              {e || 'Todas'}
            </button>
          ))}
        </div>
        <Btn onClick={() => { setF(vacio); setEditando(null); setForm(true) }}>+ Nueva reserva</Btn>
      </div>

      {form && (
        <Card style={{ marginBottom: 16, border: '1px solid ' + G }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 14 }}>{editando ? 'Editar reserva' : 'Nueva reserva'}</div>

          {f.propiedad_id && f.fecha_entrada && f.fecha_salida && !disponible && (
            <div style={{ background: '#FCEAEA', border: '0.5px solid #F09595', borderRadius: 6, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: D }}>
              ⚠ La propiedad ya tiene una reserva en ese período. Verifique el calendario.
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 'bold', fontSize: 12, color: B, marginBottom: 8 }}>Propiedad y fechas</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Propiedad</div>
                <select value={f.propiedad_id} onChange={e => selProp(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                  <option value="">Seleccionar...</option>
                  {propiedades.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <Input label="Entrada" value={f.fecha_entrada} onChange={v => setF({...f, fecha_entrada: v})} type="date" />
              <Input label="Salida" value={f.fecha_salida} onChange={v => setF({...f, fecha_salida: v})} type="date" />
              <div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Modalidad</div>
                <select value={f.modalidad} onChange={e => setF({...f, modalidad: e.target.value})} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                  <option>Diaria</option><option>Semanal</option>
                </select>
              </div>
            </div>
            {dias > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: G, background: '#E8F5EE', borderRadius: 6, padding: '6px 12px', display: 'inline-block' }}>
                {dias} días · Monto sugerido: {f.moneda === 'USD' ? fmtUSD(montoSugerido) : fmt(montoSugerido)}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 'bold', fontSize: 12, color: B, marginBottom: 8 }}>Huésped</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <Input label="Apellido y nombre" value={f.huesped_nombre} onChange={v => setF({...f, huesped_nombre: v})} />
              <Input label="DNI" value={f.huesped_dni} onChange={v => setF({...f, huesped_dni: v})} />
              <Input label="Teléfono" value={f.huesped_telefono} onChange={v => setF({...f, huesped_telefono: v})} />
              <Input label="Email" value={f.huesped_email} onChange={v => setF({...f, huesped_email: v})} />
              <Input label="Ciudad de origen" value={f.huesped_ciudad} onChange={v => setF({...f, huesped_ciudad: v})} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 'bold', fontSize: 12, color: B, marginBottom: 8 }}>Cobro</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Moneda</div>
                <select value={f.moneda} onChange={e => setF({...f, moneda: e.target.value})} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13, background: f.moneda === 'USD' ? '#E8EEFB' : '#fff' }}>
                  <option value="ARS">Pesos (ARS)</option>
                  <option value="USD">Dólares (USD)</option>
                </select>
              </div>
              <Input label="Monto total" value={f.monto_total} onChange={v => setF({...f, monto_total: v})} type="number" />
              <Input label="Señal cobrada" value={f.seña} onChange={v => setF({...f, seña: v})} type="number" />
              <div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Estado</div>
                <select value={f.estado} onChange={e => setF({...f, estado: e.target.value})} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                  <option>Pendiente</option><option>Señada</option><option>Confirmada</option><option>Cancelada</option>
                </select>
              </div>
            </div>
          </div>

          <Input label="Observaciones" value={f.observaciones} onChange={v => setF({...f, observaciones: v})} />

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Btn onClick={guardar} disabled={!disponible && !editando}>{editando ? 'Guardar cambios' : 'Guardar reserva'}</Btn>
            <BtnSec onClick={() => { setForm(false); setEditando(null) }}>Cancelar</BtnSec>
          </div>
        </Card>
      )}

      <Card>
        <Tabla
          cols={['ID', 'Propiedad', 'Huésped', 'Entrada', 'Salida', 'Días', 'Moneda', 'Monto', 'Señal', 'Saldo', 'Estado', 'Acciones']}
          filas={dataFiltrada.map(r => {
            const saldo = Number(r.monto_total||0) - Number(r.seña||0)
            return [
              <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.id}</span>,
              r.propiedad_id,
              <span style={{ fontWeight: 'bold' }}>{r.huesped_nombre}</span>,
              formatFecha(r.fecha_entrada),
              formatFecha(r.fecha_salida),
              r.dias + 'd',
              <Pill text={r.moneda} color={r.moneda === 'USD' ? 'blue' : 'gray'} />,
              <span style={{ fontWeight: 'bold' }}>{fmtM(r.monto_total, r.moneda)}</span>,
              fmtM(r.seña, r.moneda),
              <span style={{ color: saldo > 0 ? D : G, fontWeight: 'bold' }}>{fmtM(saldo, r.moneda)}</span>,
              <Pill text={r.estado} color={colorEstado[r.estado] || 'gray'} />,
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <button onClick={() => editar(r)} style={{ padding: '3px 8px', borderRadius: 5, background: W, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✏</button>
                {r.estado !== 'Cancelada' && <button onClick={() => cancelar(r)} style={{ padding: '3px 8px', borderRadius: 5, background: D, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✗</button>}
                {r.estado !== 'Cancelada' && (
                  <button
                    onClick={() => {
                      const url = window.location.origin + '/checkin?id=' + r.id
                      navigator.clipboard.writeText(url).then(() => alert('Link de check-in copiado:\n' + url))
                    }}
                    style={{ padding: '3px 8px', borderRadius: 5, background: r.checkin_confirmado ? G : '#0891B2', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}
                    title={r.checkin_confirmado ? 'Check-in confirmado' : 'Copiar link de check-in'}
                  >
                    {r.checkin_confirmado ? '✓ CI' : '🔗 CI'}
                  </button>
                )}
              </div>
            ]
          })}
        />
      </Card>
    </>
  )
}

// ─── MÓDULO LIQUIDACIONES ────────────────────────────────

function Temporadas({ adminId, propiedades }) {
  const [periodos, setPeriodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const G = '#1B6B35', W = '#C07D10', D = '#B91C1C'

  useEffect(() => { if (adminId) cargar() }, [adminId])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('temporadas').select('*').eq('admin_id', adminId).order('fecha_desde')
    setPeriodos(data || [])
    setLoading(false)
  }

  async function guardar() {
    if (!form.nombre || !form.fecha_desde || !form.fecha_hasta) return alert('Complete nombre y fechas')
    const base = { admin_id: adminId, nombre: form.nombre, fecha_desde: form.fecha_desde, fecha_hasta: form.fecha_hasta, color: form.color || '#B91C1C' }
    if (form.id) {
      await supabase.from('temporadas').update(base).eq('id', form.id)
    } else {
      const id = 'TMP' + Date.now().toString(36).toUpperCase()
      await supabase.from('temporadas').insert([{ ...base, id }])
    }
    setForm(null)
    cargar()
  }

  async function eliminar(id) {
    if (!window.confirm('Eliminar este periodo?')) return
    await supabase.from('temporadas').delete().eq('id', id)
    cargar()
  }

  const colorNombre = (n) => n.includes('Alta') ? D : n.includes('Media') ? W : G
  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontWeight: 'bold', fontSize: 15 }}>Periodos de temporada</span>
        <button onClick={() => setForm({ nombre: 'Alta', fecha_desde: '', fecha_hasta: '', color: D })}
          style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: G, color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
          + Nuevo periodo
        </button>
      </div>

      <div style={{ background: '#FFF9F0', borderRadius: 10, padding: 14, marginBottom: 16, border: '1px solid #FED7AA', fontSize: 12, color: '#92400E' }}>
        <strong>Para que sirve:</strong> Definis los periodos de Alta, Media y Baja temporada.
        Al calcular el monto de una reserva, el sistema aplica automaticamente la tarifa correspondiente.
      </div>

      {form && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, border: '1px solid #1B6B35' }}>
          <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 14, color: G }}>
            {form.id ? 'Editar periodo' : 'Nuevo periodo'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: 10, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Nombre</div>
              <select value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value, color: e.target.value === 'Alta' ? D : e.target.value === 'Media' ? W : G }))}
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                {['Alta','Media','Baja'].map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Desde</div>
              <input type="date" value={form.fecha_desde}
                onChange={e => setForm(f => ({...f, fecha_desde: e.target.value}))}
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Hasta</div>
              <input type="date" value={form.fecha_hasta}
                onChange={e => setForm(f => ({...f, fecha_hasta: e.target.value}))}
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Color</div>
              <input type="color" value={form.color || D}
                onChange={e => setForm(f => ({...f, color: e.target.value}))}
                style={{ width: '100%', height: 37, border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
            </div>
          </div>

          {propiedades.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 'bold', color: '#555', marginBottom: 8 }}>
                Tarifas especiales para temporada {form.nombre} (opcional)
              </div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
                Si se completan, sobreescriben la tarifa base de cada propiedad durante este periodo.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#F3F4F6' }}>
                      {['Propiedad', 'Diaria $', 'Diaria USD', 'Semanal $', 'Semanal USD'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 'bold', color: '#888', fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {propiedades.map(p => {
                      const getV = (k) => (form.tarifas_prop && form.tarifas_prop[p.id] && form.tarifas_prop[p.id][k]) || ''
                      const setV = (k, v) => setForm(f => ({
                        ...f,
                        tarifas_prop: { ...(f.tarifas_prop||{}), [p.id]: { ...(f.tarifas_prop?.[p.id]||{}), [k]: v } }
                      }))
                      return (
                        <tr key={p.id} style={{ borderBottom: '0.5px solid #eee' }}>
                          <td style={{ padding: '6px 10px', fontWeight: 'bold', fontSize: 12 }}>{p.nombre}</td>
                          {[
                            { k: 'd_ars', ph: String(p.tarifa_diaria_ars || '') },
                            { k: 'd_usd', ph: String(p.tarifa_diaria_usd || '') },
                            { k: 's_ars', ph: String(p.tarifa_semanal_ars || '') },
                            { k: 's_usd', ph: String(p.tarifa_semanal_usd || '') },
                          ].map(({ k, ph }) => (
                            <td key={k} style={{ padding: '4px 6px' }}>
                              <input type="number" value={getV(k)} placeholder={ph}
                                onChange={e => setV(k, e.target.value)}
                                style={{ width: '100%', padding: '5px 8px', border: '1px solid #ddd', borderRadius: 5, fontSize: 12, boxSizing: 'border-box' }} />
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={guardar}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', background: G, color: '#fff', fontSize: 13, fontWeight: 'bold' }}>
              Guardar
            </button>
            <button onClick={() => setForm(null)}
              style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd', cursor: 'pointer', background: '#fff', fontSize: 13 }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading && <div style={{ color: '#888', fontSize: 13 }}>Cargando...</div>}
      {!loading && periodos.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, textAlign: 'center', color: '#bbb', fontSize: 13 }}>
          No hay periodos definidos aun. Crea Alta, Media y Baja temporada.
        </div>
      )}

      {periodos.map(per => (
        <div key={per.id} style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
          borderLeft: '5px solid ' + (per.color || colorNombre(per.nombre)) }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: 15, color: per.color || colorNombre(per.nombre), marginBottom: 4 }}>
                {per.nombre} temporada
              </div>
              <div style={{ fontSize: 12, color: '#555' }}>
                {per.fecha_desde} hasta {per.fecha_hasta}
                {per.fecha_desde && per.fecha_hasta &&
                  ' (' + Math.ceil((new Date(per.fecha_hasta) - new Date(per.fecha_desde)) / 86400000) + ' dias)'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setForm({ ...per })}
                style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer', fontSize: 11, background: '#F9FAFB', color: '#555' }}>
                Editar
              </button>
              <button onClick={() => eliminar(per.id)}
                style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, background: '#FEE2E2', color: D }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ))}

      {periodos.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 'bold', color: '#555', marginBottom: 10 }}>Vista del ano</div>
          <div style={{ display: 'flex', height: 22, borderRadius: 4, overflow: 'hidden', border: '1px solid #eee' }}>
            {Array.from({ length: 12 }, (_, m) => {
              const fechaM = new Date().getFullYear() + '-' + String(m + 1).padStart(2, '0') + '-15'
              const per = periodos.find(p => p.fecha_desde <= fechaM && p.fecha_hasta >= fechaM)
              return (
                <div key={m} title={MESES[m] + (per ? ' - ' + per.nombre : ' - Sin periodo')}
                  style={{ flex: 1, background: per ? (per.color || '#ccc') : '#F3F4F6',
                    borderRight: '1px solid rgba(0,0,0,0.1)', cursor: 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: per ? '#fff' : '#aaa', fontWeight: 'bold' }}>
                  {MESES[m]}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
            {periodos.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                <span style={{ width: 12, height: 12, background: p.color || colorNombre(p.nombre), borderRadius: 2, display: 'inline-block' }} />
                {p.nombre}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


function Limpieza({ adminId, reservas, propiedades, onRefresh }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [filtro, setFiltro] = useState('Pendiente')

  const G = '#1B6B35', B = '#1A3FA0', W = '#C07D10', D = '#B91C1C'

  const colorEstado = { Pendiente: W, 'En curso': B, Completada: G, Cancelada: '#999' }

  useEffect(() => { if (adminId) cargarItems() }, [adminId])

  async function cargarItems() {
    setLoading(true)
    const { data } = await supabase.from('limpieza_temp').select('*').eq('admin_id', adminId).order('fecha', { ascending: true })
    setItems(data || [])
    setLoading(false)
  }

  async function guardar(datos) {
    const base = { admin_id: adminId, ...datos }
    if (form?.id) {
      await supabase.from('limpieza_temp').update(base).eq('id', form.id)
    } else {
      const id = 'LIM' + Date.now().toString(36).toUpperCase()
      await supabase.from('limpieza_temp').insert([{ ...base, id }])
    }
    setForm(null)
    cargarItems()
  }

  async function cambiarEstado(id, estado) {
    await supabase.from('limpieza_temp').update({ estado }).eq('id', id)
    cargarItems()
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar este registro?')) return
    await supabase.from('limpieza_temp').delete().eq('id', id)
    cargarItems()
  }

  const pendientes = items.filter(i => i.estado === 'Pendiente').length
  const filtrados = filtro === 'todos' ? items : items.filter(i => i.estado === filtro)

  const CHECKLIST_DEFAULT = [
    'Aspirar y limpiar pisos', 'Limpiar baños', 'Cambiar ropa de cama', 'Limpiar cocina',
    'Lavar vajilla', 'Limpiar electrodomésticos', 'Limpiar vidrios', 'Sacar basura',
    'Revisar inventario', 'Reportar daños', 'Dejar llaves disponibles'
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <span style={{ fontWeight: 'bold', fontSize: 15 }}>🧹 Gestión de limpieza</span>
          {pendientes > 0 && <span style={{ marginLeft: 8, background: '#C07D10', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 10 }}>{pendientes} pendiente{pendientes > 1 ? 's' : ''}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Pendiente','En curso','Completada','todos'].map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11,
                background: filtro === f ? '#1B6B35' : '#F3F4F6', color: filtro === f ? '#fff' : '#555',
                fontWeight: filtro === f ? 'bold' : 'normal' }}>
              {f === 'todos' ? 'Todas' : f}
            </button>
          ))}
          <button onClick={() => setForm({ tipo: 'Salida', estado: 'Pendiente', fecha: new Date().toISOString().split('T')[0], checklist: CHECKLIST_DEFAULT.map(i => ({ item: i, ok: false })) })}
            style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#1B6B35', color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
            + Nueva limpieza
          </button>
        </div>
      </div>

      {/* Formulario */}
      {form && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, border: '1px solid #1B6B35' }}>
          <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 14, color: '#1B6B35' }}>
            {form.id ? 'Editar limpieza' : 'Nueva limpieza'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            {[
              { label: 'Propiedad', type: 'select', key: 'propiedad_id', options: propiedades.map(p => ({ value: p.id, label: p.nombre || p.id })) },
              { label: 'Fecha', type: 'date', key: 'fecha' },
              { label: 'Tipo', type: 'select', key: 'tipo', options: ['Entrada','Salida','Mantenimiento'].map(v => ({ value: v, label: v })) },
              { label: 'Estado', type: 'select', key: 'estado', options: ['Pendiente','En curso','Completada','Cancelada'].map(v => ({ value: v, label: v })) },
              { label: 'Responsable', type: 'text', key: 'responsable', placeholder: 'Nombre del responsable' },
              { label: 'Hora inicio', type: 'time', key: 'hora_inicio' },
              { label: 'Reserva ID (opcional)', type: 'text', key: 'reserva_id', placeholder: 'RV001...' },
              { label: 'Costo', type: 'number', key: 'costo', placeholder: '0' },
            ].map(({ label, type, key, options, placeholder }) => (
              <div key={key}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{label}</div>
                {type === 'select' ? (
                  <select value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                    <option value="">Seleccionar...</option>
                    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input type={type} value={form[key] || ''} placeholder={placeholder}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                )}
              </div>
            ))}
            <div style={{ gridColumn: 'span 3' }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Notas</div>
              <textarea value={form.notas || ''} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                rows={2} placeholder="Observaciones adicionales..."
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
          </div>

          {/* Checklist */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 'bold', color: '#555', marginBottom: 8 }}>Checklist de limpieza</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {(form.checklist || CHECKLIST_DEFAULT.map(i => ({ item: i, ok: false }))).map((item, idx) => (
                <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 5,
                  background: item.ok ? '#E8F5EE' : '#F9FAFB', border: `1px solid ${item.ok ? '#9DDCB4' : '#E5E7EB'}`, cursor: 'pointer', fontSize: 12 }}>
                  <input type="checkbox" checked={item.ok}
                    onChange={() => setForm(f => ({ ...f, checklist: f.checklist.map((c, i) => i === idx ? { ...c, ok: !c.ok } : c) }))} />
                  <span style={{ color: item.ok ? '#1B6B35' : '#374151' }}>{item.item}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => guardar(form)}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#1B6B35', color: '#fff', fontSize: 13, fontWeight: 'bold' }}>
              Guardar
            </button>
            <button onClick={() => setForm(null)}
              style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd', cursor: 'pointer', background: '#fff', fontSize: 13 }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading && <div style={{ color: '#888', fontSize: 13 }}>Cargando...</div>}
      {!loading && filtrados.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, textAlign: 'center', color: '#bbb', fontSize: 13 }}>
          No hay limpiezas {filtro !== 'todos' ? `en estado "${filtro}"` : 'registradas'}.
        </div>
      )}
      {filtrados.map(item => {
        const prop = propiedades.find(p => p.id === item.propiedad_id)
        const res = reservas.find(r => r.id === item.reserva_id)
        const checklist = item.checklist || []
        const completados = checklist.filter(c => c.ok).length
        const pct = checklist.length > 0 ? Math.round(completados / checklist.length * 100) : 0
        return (
          <div key={item.id} style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, border: `2px solid ${colorEstado[item.estado] || '#ddd'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 'bold', fontSize: 14 }}>{prop?.nombre || item.propiedad_id}</span>
                  <span style={{ fontSize: 10, background: colorEstado[item.estado] + '20', color: colorEstado[item.estado], padding: '2px 8px', borderRadius: 8, fontWeight: 'bold', border: `1px solid ${colorEstado[item.estado]}` }}>
                    {item.estado}
                  </span>
                  <span style={{ fontSize: 11, background: '#F3F4F6', padding: '2px 8px', borderRadius: 6, color: '#555' }}>{item.tipo}</span>
                </div>
                <div style={{ fontSize: 12, color: '#555', lineHeight: 1.7 }}>
                  <div>📅 {item.fecha}{item.hora_inicio ? ` · ${item.hora_inicio}` : ''}</div>
                  {item.responsable && <div>👤 {item.responsable}</div>}
                  {res && <div>🏠 Reserva: {res.huesped_nombre}</div>}
                  {item.costo > 0 && <div>💰 Costo: ${Number(item.costo).toLocaleString('es-AR')}</div>}
                  {item.notas && <div style={{ color: '#888', fontStyle: 'italic' }}>"{item.notas}"</div>}
                </div>
                {checklist.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontSize: 11, color: '#888' }}>Checklist: {completados}/{checklist.length}</div>
                      <div style={{ flex: 1, height: 4, background: '#E5E7EB', borderRadius: 2, maxWidth: 120 }}>
                        <div style={{ width: pct + '%', height: '100%', background: pct === 100 ? '#1B6B35' : '#C07D10', borderRadius: 2, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: 11, color: pct === 100 ? '#1B6B35' : '#C07D10', fontWeight: 'bold' }}>{pct}%</span>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {['Pendiente','En curso','Completada'].filter(s => s !== item.estado).map(s => (
                  <button key={s} onClick={() => cambiarEstado(item.id, s)}
                    style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11,
                      background: colorEstado[s] + '15', color: colorEstado[s], fontWeight: 'bold', border: `1px solid ${colorEstado[s]}40` }}>
                    → {s}
                  </button>
                ))}
                <button onClick={() => setForm({ ...item })}
                  style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer', fontSize: 11, background: '#F9FAFB', color: '#555' }}>
                  ✏ Editar
                </button>
                <button onClick={() => eliminar(item.id)}
                  style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, background: '#FEE2E2', color: '#B91C1C' }}>
                  ✗
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}


function Liquidaciones({ reservas, propiedades, propietarios }) {
  const [propSelec, setPropSelec] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const prop = propietarios.find(p => p.id === propSelec)
  const propsDelOwner = propiedades.filter(p => p.propietario_id === propSelec)

  const reservasFiltradas = reservas.filter(r => {
    if (!propsDelOwner.find(p => p.id === r.propiedad_id)) return false
    if (r.estado === 'Cancelada') return false
    if (fechaDesde && r.fecha_salida < fechaDesde) return false
    if (fechaHasta && r.fecha_entrada > fechaHasta) return false
    return true
  })

  const totalBrutoARS = reservasFiltradas.filter(r => r.moneda === 'ARS').reduce((s, r) => s + Number(r.monto_total||0), 0)
  const totalBrutoUSD = reservasFiltradas.filter(r => r.moneda === 'USD').reduce((s, r) => s + Number(r.monto_total||0), 0)
  const totalComARS = reservasFiltradas.filter(r => r.moneda === 'ARS').reduce((s, r) => s + Number(r.comision||0), 0)
  const totalComUSD = reservasFiltradas.filter(r => r.moneda === 'USD').reduce((s, r) => s + Number(r.comision||0), 0)
  const totalNetoARS = totalBrutoARS - totalComARS
  const totalNetoUSD = totalBrutoUSD - totalComUSD

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 14 }}>Liquidación por propietario</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <select value={propSelec} onChange={e => setPropSelec(e.target.value)} style={{ padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
            <option value="">Seleccionar propietario...</option>
            {propietarios.map(p => <option key={p.id} value={p.id}>{p.apellido_nombre}</option>)}
          </select>
          <span style={{ fontSize: 12, color: '#888' }}>Desde:</span>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={{ padding: '6px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }} />
          <span style={{ fontSize: 12, color: '#888' }}>Hasta:</span>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={{ padding: '6px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }} />
          {(fechaDesde || fechaHasta) && <button onClick={() => { setFechaDesde(''); setFechaHasta('') }} style={{ padding: '6px 10px', borderRadius: 6, border: '0.5px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 12 }}>✕</button>}
        </div>

        {propSelec && prop && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16, fontSize: 13 }}>
              <div><span style={{ color: '#888' }}>Propietario: </span><strong>{prop.apellido_nombre}</strong></div>
              <div><span style={{ color: '#888' }}>Email: </span>{prop.email||'—'}</div>
              <div><span style={{ color: '#888' }}>CBU: </span><span style={{ fontFamily: 'monospace' }}>{prop.cbu||'—'}</span></div>
              <div><span style={{ color: '#888' }}>Banco: </span>{prop.banco||'—'}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              {[['Total cobrado ARS', fmt(totalBrutoARS), '#fff'], ['Comisión ARS', fmt(totalComARS), '#FFF5E6'], ['Neto propietario ARS', fmt(totalNetoARS), '#E8F5EE'],
                ['Total cobrado USD', fmtUSD(totalBrutoUSD), '#fff'], ['Comisión USD', fmtUSD(totalComUSD), '#FFF5E6'], ['Neto propietario USD', fmtUSD(totalNetoUSD), '#E8EEFB']
              ].map(([label, val, bg], i) => (
                <div key={i} style={{ background: bg, borderRadius: 8, padding: 12, border: '0.5px solid #E8ECF0' }}>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 'bold', color: i === 2 ? G : i === 5 ? B : '#1A1A1A' }}>{val}</div>
                </div>
              ))}
            </div>

            <Tabla
              cols={['Reserva', 'Propiedad', 'Huésped', 'Entrada', 'Salida', 'Días', 'Moneda', 'Total', 'Comisión', 'Neto']}
              filas={reservasFiltradas.map(r => [
                <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.id}</span>,
                r.propiedad_id,
                r.huesped_nombre,
                formatFecha(r.fecha_entrada),
                formatFecha(r.fecha_salida),
                r.dias + 'd',
                <Pill text={r.moneda} color={r.moneda === 'USD' ? 'blue' : 'gray'} />,
                fmtM(r.monto_total, r.moneda),
                <span style={{ color: W }}>- {fmtM(r.comision, r.moneda)}</span>,
                <span style={{ fontWeight: 'bold', color: G }}>{fmtM(r.neto_propietario, r.moneda)}</span>,
              ])}
            />
          </>
        )}
      </Card>
    </>
  )
}

// ─── MÓDULO DASHBOARD ────────────────────────────────────
function Dashboard({ reservas, propiedades }) {
  const hoy = new Date().toISOString().split('T')[0]
  const ocupadas = propiedades.filter(p => reservas.some(r => r.propiedad_id === p.id && r.estado !== 'Cancelada' && r.fecha_entrada <= hoy && r.fecha_salida > hoy))
  const proximas = reservas.filter(r => r.estado !== 'Cancelada' && r.fecha_entrada > hoy).sort((a,b) => a.fecha_entrada.localeCompare(b.fecha_entrada)).slice(0, 5)
  const pendienteCobro = reservas.filter(r => r.estado === 'Señada' || r.estado === 'Pendiente')
  const ingresosMes = reservas.filter(r => r.estado === 'Confirmada' && r.fecha_entrada?.startsWith(hoy.substring(0,7))).reduce((s,r) => s + Number(r.monto_total||0), 0)

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          ['Propiedades ocupadas hoy', ocupadas.length + ' / ' + propiedades.length, G],
          ['Reservas activas', reservas.filter(r => r.estado !== 'Cancelada').length, B],
          ['Con saldo pendiente', pendienteCobro.length, W],
          ['Ingresos confirmados mes', fmt(ingresosMes), G],
        ].map(([label, val, color], i) => (
          <div key={i} style={{ background: '#fff', border: '0.5px solid #E8ECF0', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 'bold', color }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 12, color: G }}>Próximas entradas</div>
          {proximas.length === 0 ? <div style={{ color: '#bbb', fontSize: 13 }}>Sin reservas próximas</div> : (
            proximas.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #F0F2F5', fontSize: 13 }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{r.huesped_nombre}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{r.propiedad_id} · {r.dias} días</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: G, fontWeight: 'bold' }}>{formatFecha(r.fecha_entrada)}</div>
                  <Pill text={r.estado} color={{ 'Confirmada': 'ok', 'Señada': 'warn', 'Pendiente': 'blue' }[r.estado] || 'gray'} />
                </div>
              </div>
            ))
          )}
        </Card>

        <Card>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 12, color: W }}>Saldo a cobrar</div>
          {pendienteCobro.length === 0 ? <div style={{ color: '#bbb', fontSize: 13 }}>Sin saldos pendientes</div> : (
            pendienteCobro.map(r => {
              const saldo = Number(r.monto_total||0) - Number(r.seña||0)
              return (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #F0F2F5', fontSize: 13 }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{r.huesped_nombre}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{r.propiedad_id} · {formatFecha(r.fecha_entrada)}</div>
                  </div>
                  <div style={{ fontWeight: 'bold', color: D }}>{fmtM(saldo, r.moneda)}</div>
                </div>
              )
            })
          )}
        </Card>
      </div>
    </>
  )
}

// ─── APP PRINCIPAL ───────────────────────────────────────
const NAV = [
  { id: 'dashboard',      label: 'Panel principal',  seccion: 'Principal' },
  { id: 'calendario',     label: '📅 Calendario',     seccion: 'Principal' },
  { id: 'reservas',       label: '🏖 Reservas',       seccion: 'Gestión' },
  { id: 'solicitudes',    label: '📩 Solicitudes',    seccion: 'Gestión' },
  { id: 'propiedades',    label: '🏠 Propiedades',    seccion: 'Gestión' },
  { id: 'propietarios',   label: '👤 Propietarios',   seccion: 'Gestión' },
  { id: 'contratos',      label: '📋 Contratos',      seccion: 'Gestión' },
  { id: 'cobranzas',      label: '💳 Cobranzas',      seccion: 'Gestión' },
  { id: 'gastos',         label: '🧾 Gastos',          seccion: 'Gestión' },
  { id: 'checklist',      label: '✅ Checklist',       seccion: 'Gestión' },
  { id: 'notificaciones', label: '🔔 Notificaciones',  seccion: 'Gestión' },
  { id: 'limpieza',       label: '🧹 Limpieza',        seccion: 'Gestión' },
  { id: 'liquidaciones',  label: '📑 Liquidaciones',  seccion: 'Reportes' },
  { id: 'caja',           label: '💵 Caja',            seccion: 'Reportes' },
  { id: 'temporadas',     label: '📆 Temporadas',      seccion: 'Config.' },
  { id: 'ical',           label: '🔄 iCal Sync',       seccion: 'Config.' },
  { id: 'mi_perfil',      label: '⚙️ Mi perfil',       seccion: 'Admin' },
]

function DashboardTemp({ reservas = [], propiedades = [], propietarios = [] }) {
  const hoy = new Date().toISOString().split('T')[0]
  const resArr = reservas || []
  const propArr = propiedades || []
  const ocupadas = propArr.filter(p => resArr.some(r => r.propiedad_id === p.id && r.estado !== 'Cancelada' && r.fecha_entrada <= hoy && r.fecha_salida > hoy))
  const proximas = resArr.filter(r => r.estado !== 'Cancelada' && r.fecha_entrada > hoy).sort((a,b) => (a.fecha_entrada||'').localeCompare(b.fecha_entrada||'')).slice(0, 5)
  const pendienteCobro = resArr.filter(r => r.estado === 'Señada' || r.estado === 'Pendiente')
  const ingresosMes = resArr.filter(r => r.estado === 'Confirmada' && r.fecha_entrada?.startsWith(hoy.substring(0,7))).reduce((s,r) => s + Number(r.monto_total||0), 0)

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          ['Propiedades ocupadas hoy', ocupadas.length + ' / ' + propiedades.length, G],
          ['Reservas activas', reservas.filter(r => r.estado !== 'Cancelada').length, B],
          ['Con saldo pendiente', pendienteCobro.length, W],
          ['Ingresos confirmados mes', fmt(ingresosMes), G],
        ].map(([label, val, color], i) => (
          <div key={i} style={{ background: '#fff', border: '0.5px solid #E8ECF0', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 'bold', color }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 12, color: G }}>Próximas entradas</div>
          {proximas.length === 0 ? <div style={{ color: '#bbb', fontSize: 13 }}>Sin reservas próximas</div> : (
            proximas.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #F0F2F5', fontSize: 13 }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{r.huesped_nombre}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{r.propiedad_id} · {r.dias} días</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: G, fontWeight: 'bold' }}>{formatFecha(r.fecha_entrada)}</div>
                  <Pill text={r.estado} color={{ 'Confirmada': 'ok', 'Señada': 'warn', 'Pendiente': 'blue' }[r.estado] || 'gray'} />
                </div>
              </div>
            ))
          )}
        </Card>

        <Card>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 12, color: W }}>Saldo a cobrar</div>
          {pendienteCobro.length === 0 ? <div style={{ color: '#bbb', fontSize: 13 }}>Sin saldos pendientes</div> : (
            pendienteCobro.map(r => {
              const saldo = Number(r.monto_total||0) - Number(r.sena||0)
              return (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #F0F2F5', fontSize: 13 }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{r.huesped_nombre}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{r.propiedad_id} · {formatFecha(r.fecha_entrada)}</div>
                  </div>
                  <div style={{ fontWeight: 'bold', color: D }}>{fmtM(saldo, r.moneda)}</div>
                </div>
              )
            })
          )}
        </Card>
      </div>
    </>
  )
}


// ─── PDF RECIBO RESERVA ──────────────────────────────────

function ContratosTemp({ reservas, propiedades, propietarios, perfil = {} }) {
  const [selRes, setSelRes] = useState('')

  const res = reservas.find(r => r.id === selRes)
  const prop = res ? propiedades.find(p => p.id === res.propiedad_id) : null
  const owner = prop ? propietarios.find(o => o.id === prop.propietario_id) : null

  function generarContratoPDF() {
    if (!res) return
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    script.onload = () => {
      const { jsPDF } = window.jspdf
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const W = 210, margin = 14
      const saldo = Number(res.monto_total||0) - Number(res.sena||0)
      const hoy = new Date().toLocaleDateString('es-AR')

      cargarLogoBase64(logoB64 => {

      // Header
      doc.setFillColor(26,63,160); doc.rect(0,0,W,45,'F')
      if (logoB64) { try { doc.addImage(logoB64, 'JPEG', margin, 4, 34, 34) } catch(e){} }
      doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(16)
      doc.text('GASP', margin+38, 16)
      doc.setFont('helvetica','normal'); doc.setFontSize(9)
      doc.text('Gestion de Alquileres Sistema Profesional', margin+38, 23)
      doc.text((perfil.nombre_completo||'Administrador')+'  |  '+(perfil.titulo||'')+'  |  '+(perfil.matricula||''), margin+38, 30)
      doc.text((perfil.ciudad||'')+(perfil.provincia?', '+perfil.provincia:'')+'  |  '+(perfil.email_contacto||''), margin+38, 36)

      doc.setTextColor(26,63,160); doc.setFont('helvetica','bold'); doc.setFontSize(13)
      doc.text('CONTRATO DE LOCACIÓN TEMPORARIA', margin, 56)
      doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100)
      doc.text('Ref: ' + res.id + '  |  Fecha: ' + hoy, W-margin, 56, {align:'right'})
      doc.setDrawColor(26,63,160); doc.setLineWidth(0.5); doc.line(margin,59,W-margin,59)

      let y = 67
      const txt = (text, bold=false, size=9.5) => {
        if (y > 272) { doc.addPage(); y = 20 }
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        doc.setFontSize(size); doc.setTextColor(0)
        const lines = doc.splitTextToSize(text, W - margin*2)
        lines.forEach(l => {
          if (y > 272) { doc.addPage(); y = 20 }
          doc.text(l, margin, y); y += 5.5
        })
      }
      const sep = () => {
        if (y > 272) { doc.addPage(); y = 20 }
        doc.setDrawColor(220,220,220); doc.setLineWidth(0.2)
        doc.line(margin, y-1, W-margin, y-1); y += 2
      }

      txt('PARTES CONTRATANTES', true, 10); y += 1
      txt(`LOCADOR: ${owner?.apellido_nombre || 'N/D'}, DNI/CUIT: ${owner?.dni_cuit || 'N/D'}, con domicilio en ${owner?.ciudad_residencia || 'N/D'}.`)
      txt(`LOCATARIO: ${res.huesped_nombre}, DNI: ${res.huesped_dni || 'N/D'}, con domicilio en ${res.huesped_ciudad || 'N/D'}, tel: ${res.huesped_telefono || 'N/D'}, email: ${res.huesped_email || 'N/D'}.`)
      txt(`ADMINISTRADOR: ${perfil.nombre_completo || 'N/D'}, ${perfil.titulo || ''}, ${perfil.matricula || ''}.`)
      y += 3; sep()

      txt('PRIMERA — OBJETO', true, 10); y += 1
      txt(`El LOCADOR cede en locación temporaria al LOCATARIO el inmueble denominado "${prop?.nombre || res.propiedad_id}", de tipo ${prop?.tipo || 'N/D'}, ubicado en ${prop?.localidad || 'Pinamar'}, provincia de Buenos Aires, con capacidad máxima de ${prop?.capacidad || 'N/D'} personas. El presente contrato se rige por los arts. 1199 y cc. del Código Civil y Comercial de la Nación Argentina.`)
      y += 3; sep()

      txt('SEGUNDA — PLAZO', true, 10); y += 1
      txt(`La locación temporaria tendrá vigencia desde el día ${formatFecha(res.fecha_entrada)} (ingreso) hasta el día ${formatFecha(res.fecha_salida)} (egreso), por un total de ${res.dias} días, modalidad ${res.modalidad}. El horario de ingreso es a las 14:00 hs y el de egreso a las 10:00 hs del día indicado.`)
      y += 3; sep()

      txt('TERCERA — PRECIO Y FORMA DE PAGO', true, 10); y += 1
      txt(`El precio total de la locación es de ${fmtM(res.monto_total, res.moneda)} (${res.moneda}). En concepto de seña se abona la suma de ${fmtM(res.sena, res.moneda)}, y el saldo de ${fmtM(saldo, res.moneda)} deberá abonarse al momento del ingreso. La seña tiene carácter confirmatorio de la reserva.`)
      y += 3; sep()

      txt('CUARTA — USO Y CAPACIDAD', true, 10); y += 1
      txt(`El inmueble será destinado exclusivamente al uso habitacional temporario vacacional. Queda expresamente prohibido: a) ceder o subarrendar el inmueble; b) realizar actividades comerciales, sociales o eventos; c) exceder la capacidad máxima de ${prop?.capacidad || 'N/D'} personas; d) introducir animales sin autorización expresa del LOCADOR.`)
      y += 3; sep()

      txt('QUINTA — ESTADO DEL INMUEBLE', true, 10); y += 1
      txt('El LOCATARIO recibe el inmueble en perfectas condiciones de habitabilidad y se compromete a restituirlo al LOCADOR en el mismo estado al finalizar el plazo convenido. Cualquier deterioro o daño producido durante la estadía será de exclusiva responsabilidad del LOCATARIO.')
      y += 3; sep()

      txt('SEXTA — DEPÓSITO DE GARANTÍA', true, 10); y += 1
      txt('A fin de garantizar el cumplimiento de las obligaciones asumidas y el pago de eventuales daños y perjuicios, el LOCATARIO podrá ser requerido a abonar un depósito de garantía. Dicho depósito será restituido dentro de las 72 hs del egreso, previa verificación del estado del inmueble.')
      y += 3; sep()

      txt('SÉPTIMA — RESCISIÓN ANTICIPADA', true, 10); y += 1
      txt('En caso de rescisión anticipada por parte del LOCATARIO, la seña abonada quedará en poder del LOCADOR en concepto de indemnización. Si la rescisión fuera imputable al LOCADOR, deberá devolver la seña más una suma equivalente como penalidad.')
      y += 3; sep()

      txt('OCTAVA — JURISDICCIÓN', true, 10); y += 1
      txt('Para todos los efectos legales derivados del presente contrato, las partes se someten a la jurisdicción de los Tribunales Ordinarios del Departamento Judicial de Dolores, Provincia de Buenos Aires, renunciando a cualquier otro fuero o jurisdicción que pudiera corresponderles.')
      y += 3; sep()

      txt('NOVENA — CONFORMIDAD', true, 10); y += 1
      txt(`En prueba de conformidad, las partes firman el presente contrato en la ciudad de ${perfil.ciudad || 'Pinamar'}, Provincia de Buenos Aires, a los ${hoy}.`)

      y += 14
      if (y > 250) { doc.addPage(); y = 30 }
      doc.setDrawColor(100,100,100); doc.setLineWidth(0.3)
      doc.line(margin, y, margin+65, y)
      doc.line(W-margin-65, y, W-margin, y)
      y += 5
      doc.setFontSize(8); doc.setTextColor(80,80,80); doc.setFont('helvetica','normal')
      doc.text('Firma Locatario', margin, y)
      doc.text(res.huesped_nombre || '', margin, y+4)
      doc.text('DNI: ' + (res.huesped_dni || ''), margin, y+8)
      doc.text('Firma Locador / Administrador', W-margin-65, y)
      doc.text(perfil.nombre_completo || owner?.apellido_nombre || '', W-margin-65, y+4)
      doc.text((perfil.matricula || ''), W-margin-65, y+8)

      doc.setFillColor(26,63,160); doc.rect(0,287,W,10,'F')
      doc.setTextColor(200,210,255); doc.setFontSize(7)
      doc.text('GASP Alquileres Temporarios  |  '+(perfil.email_contacto||''), W/2, 293, {align:'center'})

      doc.save('Contrato_'+res.id+'_'+(res.huesped_nombre||'').replace(/ /g,'_')+'.pdf')
      })
    }
    if (!document.querySelector('script[src*="jspdf"]')) document.head.appendChild(script)
    else script.onload()
  }

  return (
    <Card>
      <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 14 }}>Contratos de locación temporaria</div>
      <div style={{ background: '#E8EEFB', border: '0.5px solid #A8C0F0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: B }}>
        El contrato se genera automáticamente con los datos de la reserva, propietario e inmueble. Incluye 9 cláusulas conforme al art. 1199 CCCN.
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={selRes} onChange={e => setSelRes(e.target.value)} style={{ padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
          <option value="">Seleccionar reserva...</option>
          {reservas.filter(r => r.estado !== 'Cancelada').map(r => (
            <option key={r.id} value={r.id}>{r.id} — {r.huesped_nombre} — {r.propiedad_id} ({formatFecha(r.fecha_entrada)})</option>
          ))}
        </select>
        {selRes && res && (
          <Btn onClick={generarContratoPDF} color={B}>📄 Generar contrato PDF</Btn>
        )}
      </div>

      {selRes && res && (
        <div style={{ background: '#F7F8FA', borderRadius: 8, padding: 14, fontSize: 13 }}>
          <div style={{ fontWeight: 'bold', color: B, marginBottom: 10 }}>Datos del contrato</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['Huésped (Locatario)', res.huesped_nombre + (res.huesped_dni ? ' · DNI: '+res.huesped_dni : '')],
              ['Propiedad', (prop?.nombre||res.propiedad_id) + ' — ' + (prop?.localidad||'')],
              ['Propietario (Locador)', owner?.apellido_nombre || '⚠ Sin propietario asignado'],
              ['Período', formatFecha(res.fecha_entrada) + ' → ' + formatFecha(res.fecha_salida) + ' (' + res.dias + ' días)'],
              ['Monto total', fmtM(res.monto_total, res.moneda)],
              ['Seña / Saldo', fmtM(res.sena, res.moneda) + ' / ' + fmtM(Number(res.monto_total||0)-Number(res.sena||0), res.moneda)],
              ['Administrador', perfil.nombre_completo || '⚠ Completar Mi Perfil'],
              ['Matrícula', perfil.matricula || '⚠ Completar Mi Perfil'],
            ].map(([label, val]) => (
              <div key={label} style={{ fontSize: 13 }}>
                <span style={{ color: '#888' }}>{label}: </span>
                <span style={{ fontWeight: val.startsWith('⚠') ? 'normal' : 'bold', color: val.startsWith('⚠') ? D : '#1A1A1A' }}>{val}</span>
              </div>
            ))}
          </div>
          {!owner && (
            <div style={{ marginTop: 12, background: '#FFF3E0', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: W }}>
              ⚠ La propiedad no tiene propietario asignado. Asigne un propietario en el módulo Propiedades para incluirlo en el contrato.
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// ─── MÓDULO GASTOS ───────────────────────────────────────

function GastosTemp({ data, reservas, propiedades, propietarios, onRefresh }) {
  const [form, setForm] = useState(false)
  const vacio = { tipo_destinatario: 'Huesped', reserva_id: '', propietario_id: '', propiedad_id: '', concepto: '', importe: '', moneda: 'ARS', fecha: new Date().toISOString().split('T')[0], observaciones: '' }
  const [f, setF] = useState(vacio)

  function selReserva(rid) {
    const res = reservas.find(r => r.id === rid)
    setF(prev => ({ ...prev, reserva_id: rid, propiedad_id: res?.propiedad_id || prev.propiedad_id, moneda: res?.moneda || prev.moneda }))
  }

  function selPropietario(pid) {
    const primaProp = propiedades.find(p => p.propietario_id === pid)
    setF(prev => ({ ...prev, propietario_id: pid, propiedad_id: primaProp?.id || prev.propiedad_id }))
  }

  async function guardar() {
    if (!f.concepto || !f.importe) return alert('Complete concepto e importe')
    if (f.tipo_destinatario === 'Huesped' && !f.reserva_id) return alert('Seleccione la reserva')
    if (f.tipo_destinatario === 'Propietario' && !f.propietario_id) return alert('Seleccione el propietario')
    const adminId = (await supabase.auth.getUser()).data.user?.id
    const { error } = await supabase.from('gastos').insert([{
      id: 'GT-' + Date.now(),
      reserva_id: f.tipo_destinatario === 'Huesped' ? f.reserva_id : null,
      propietario_id: f.tipo_destinatario === 'Propietario' ? f.propietario_id : null,
      propiedad_id: f.propiedad_id || null,
      concepto: f.concepto,
      responsable: f.tipo_destinatario,
      importe: Number(f.importe),
      moneda: f.moneda,
      fecha: f.fecha,
      observaciones: f.observaciones,
      cobrado: false,
      admin_id: adminId
    }])
    if (error) return alert('Error: ' + error.message)
    setForm(false); setF(vacio); onRefresh()
  }

  const propsDePropietario = f.propietario_id ? propiedades.filter(p => p.propietario_id === f.propietario_id) : propiedades

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Btn onClick={() => setForm(true)}>+ Cargar gasto</Btn>
      </div>
      {form && (
        <Card style={{ marginBottom: 16, border: '1px solid ' + G }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 14 }}>Nuevo gasto</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[['Huesped', '👤 Cargo al huésped'], ['Propietario', '🏠 Cargo al propietario']].map(([t, label]) => (
              <button key={t} onClick={() => setF({ ...vacio, tipo_destinatario: t })}
                style={{ padding: '8px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 'bold', background: f.tipo_destinatario === t ? (t === 'Huesped' ? W : B) : '#F0F0F0', color: f.tipo_destinatario === t ? '#fff' : '#888' }}>
                {label}
              </button>
            ))}
          </div>
          {f.tipo_destinatario === 'Huesped' && (
            <div style={{ background: '#FEF3E2', border: '0.5px solid #E8A951', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#8A5C10' }}>
              💡 Se imputará a la reserva seleccionada. Aparecerá en Cobranzas para registrar el cobro.
            </div>
          )}
          {f.tipo_destinatario === 'Propietario' && (
            <div style={{ background: '#E8EEFB', border: '0.5px solid #A8C0F0', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: B }}>
              💡 Se descontará automáticamente del neto al propietario en Liquidaciones.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {f.tipo_destinatario === 'Huesped' ? (
              <div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Reserva</div>
                <select value={f.reserva_id} onChange={e => selReserva(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                  <option value="">Seleccionar reserva...</option>
                  {reservas.filter(r => r.estado !== 'Cancelada').map(r => (
                    <option key={r.id} value={r.id}>{r.id} — {r.huesped_nombre} ({formatFecha(r.fecha_entrada)})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Propietario</div>
                <select value={f.propietario_id} onChange={e => selPropietario(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                  <option value="">Seleccionar propietario...</option>
                  {propietarios.map(p => <option key={p.id} value={p.id}>{p.apellido_nombre}</option>)}
                </select>
              </div>
            )}
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Propiedad</div>
              <select value={f.propiedad_id} onChange={e => setF({ ...f, propiedad_id: e.target.value })} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                <option value="">Seleccionar...</option>
                {propsDePropietario.map(p => <option key={p.id} value={p.id}>{p.nombre || p.id}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Concepto</div>
              <select value={f.concepto} onChange={e => setF({ ...f, concepto: e.target.value })} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                <option value="">Seleccionar...</option>
                {(f.tipo_destinatario === 'Huesped'
                  ? ['Daños en el inmueble', 'Limpieza extra', 'Consumo extra servicios', 'Estadía adicional', 'Otro cargo huésped']
                  : ['Reparación y mantenimiento', 'Expensas', 'Impuesto municipal', 'Servicio de luz', 'Servicio de gas', 'Servicio de agua', 'Seguro del inmueble', 'ARBA / Inmobiliario', 'Honorarios profesionales', 'Otro gasto propietario']
                ).map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <Input label="Importe" value={f.importe} onChange={v => setF({ ...f, importe: v })} type="number" />
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Moneda</div>
              <select value={f.moneda} onChange={e => setF({ ...f, moneda: e.target.value })} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                <option value="ARS">Pesos (ARS)</option><option value="USD">Dólares (USD)</option>
              </select>
            </div>
            <Input label="Fecha" value={f.fecha} onChange={v => setF({ ...f, fecha: v })} type="date" />
            <div style={{ gridColumn: 'span 2' }}>
              <Input label="Observaciones (opcional)" value={f.observaciones} onChange={v => setF({ ...f, observaciones: v })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={guardar} color={f.tipo_destinatario === 'Huesped' ? W : B}>
              {f.tipo_destinatario === 'Huesped' ? '+ Cargar gasto al huésped' : '+ Cargar gasto al propietario'}
            </Btn>
            <BtnSec onClick={() => { setForm(false); setF(vacio) }}>Cancelar</BtnSec>
          </div>
        </Card>
      )}
      <Card>
        <Tabla
          cols={['Tipo', 'Referencia', 'Propiedad', 'Concepto', 'Importe', 'Estado', 'Fecha', '']}
          filas={(data || []).map(g => [
            <Pill text={g.responsable} color={g.responsable === 'Huesped' ? 'warn' : 'blue'} />,
            g.responsable === 'Huesped'
              ? <span style={{ fontSize: 11 }}>{g.reserva_id || '—'}</span>
              : <span style={{ fontSize: 11, color: B, fontWeight: 'bold' }}>{g.propietario_id || '—'}</span>,
            g.propiedad_id || '—',
            g.concepto,
            <span style={{ fontWeight: 'bold' }}>{fmtM(g.importe, g.moneda)}</span>,
            g.responsable === 'Propietario'
              ? <Pill text="En liquidación" color="blue" />
              : g.cobrado
                ? <span style={{ color: G, fontSize: 11, fontWeight: 'bold' }}>✓ Cobrado</span>
                : <span style={{ color: D, fontSize: 11 }}>Pendiente cobro</span>,
            g.fecha || '—',
            <button onClick={async () => {
              if (!window.confirm('¿Anular este gasto?')) return
              const { error } = await supabase.from('gastos').delete().eq('id', g.id)
              if (error) return alert('Error: ' + error.message)
              onRefresh()
            }} style={{ padding: '3px 8px', borderRadius: 5, background: D, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✗ Anular</button>
          ])}
        />
      </Card>
    </>
  )
}

// ─── MÓDULO CAJA ─────────────────────────────────────────

function Cobranzas({ reservas, gastos, onRefresh }) {
  const [selRes, setSelRes] = useState('')
  const [tipoMovimiento, setTipoMovimiento] = useState('saldo')
  const [importe, setImporte] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [observaciones, setObservaciones] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  const res = reservas.find(r => r.id === selRes)
  const saldoPendiente = res ? Number(res.monto_total||0) - Number(res.sena||0) : 0
  const gastosRes = gastos.filter(g => g.reserva_id === selRes)
  const gastosHuesped = gastosRes.filter(g => g.responsable === 'Huesped' && !g.cobrado)
  const totalGastosHuesped = gastosHuesped.reduce((s,g) => s + Number(g.importe||0), 0)
  const colorEstado = { 'Confirmada': 'ok', 'Señada': 'warn', 'Pendiente': 'blue', 'Cancelada': 'danger' }

  // Contadores reales
  const saldosPendientes = reservas.filter(r => Number(r.monto_total||0) - Number(r.sena||0) > 0 && r.estado !== 'Cancelada').length
  const gastosPendientes = gastos.filter(g => g.responsable === 'Huesped' && !g.cobrado).length

  async function registrarCobro() {
    if (!selRes) return alert('Seleccione una reserva')
    if (tipoMovimiento === 'saldo' && !importe) return alert('Ingrese el importe a cobrar')
    if (tipoMovimiento === 'gasto_propietario' && !importe) return alert('Ingrese el importe del gasto')
    setLoading(true); setMsg(null)
    try {
      const adminId = (await supabase.auth.getUser()).data.user?.id
      const imp = Number(importe)

      if (tipoMovimiento === 'saldo') {
        // 1. Actualizar reserva
        const nuevaSeña = Number(res.sena||0) + imp
        const cobrado = nuevaSeña >= Number(res.monto_total||0)
        const { error } = await supabase.from('reservas_temp').update({
          sena: nuevaSeña,
          saldo_cobrado: cobrado,
          estado: cobrado ? 'Confirmada' : 'Señada',
          fecha_cobro_saldo: fecha
        }).eq('id', selRes)
        if (error) throw new Error(error.message)

        // 2. Registrar en caja_temp
        await supabase.from('caja').insert([{
          id: 'CJ-SALDO-' + Date.now(),
          fecha,
          tipo: 'Ingreso',
          categoria: 'Saldo cobrado',
          concepto: 'Saldo reserva ' + selRes + ' — ' + (res.huesped_nombre||''),
          importe: imp,
          moneda: res.moneda || 'ARS',
          observaciones,
          admin_id: adminId
        }])

        setMsg({ ok: true, text: 'Saldo de ' + fmtM(imp, res.moneda) + ' registrado. Estado: ' + (cobrado ? 'Confirmada ✓' : 'Señada') })

      } else if (tipoMovimiento === 'gasto_huesped') {
        if (gastosHuesped.length === 0) throw new Error('No hay gastos pendientes para esta reserva')
        const totalACobrar = totalGastosHuesped

        // 1. Marcar gastos del huésped como cobrados
        await supabase.from('gastos').update({ cobrado: true, fecha_cobro: fecha }).in('id', gastosHuesped.map(g => g.id))

        // 2. Registrar en caja_temp
        await supabase.from('caja').insert([{
          id: 'CJ-GASTO-' + Date.now(),
          fecha,
          tipo: 'Ingreso',
          categoria: 'Gastos cobrados al huésped',
          concepto: 'Gastos reserva ' + selRes + ' — ' + (res.huesped_nombre||''),
          importe: totalACobrar,
          moneda: res.moneda || 'ARS',
          observaciones,
          admin_id: adminId
        }])

        setMsg({ ok: true, text: 'Cobro de ' + fmtM(totalACobrar, res.moneda) + ' registrado en caja. Gastos marcados como cobrados.' })

      } else {
        // Gasto propietario — registrar en gastos_temp
        if (!importe) throw new Error('Ingrese el importe del gasto')
        await supabase.from('gastos').insert([{
          id: 'GT-P-' + Date.now(),
          reserva_id: selRes,
          propiedad_id: res.propiedad_id,
          propietario_id: null,
          fecha,
          concepto: observaciones || 'Gasto propietario',
          responsable: 'Propietario',
          importe: Number(importe),
          moneda: res.moneda || 'ARS',
          cobrado: false,
          admin_id: adminId
        }])
        setMsg({ ok: true, text: 'Gasto de propietario ' + fmtM(importe, res.moneda) + ' registrado. Aparecerá en Liquidaciones.' })
      }

      setImporte(''); setObservaciones('')
      onRefresh()
    } catch(e) {
      setMsg({ ok: false, text: 'Error: ' + e.message })
    }
    setLoading(false)
  }

  // Reservas con movimientos pendientes reales
  const reservasConMovimientos = reservas.filter(r => {
    const saldo = Number(r.monto_total||0) - Number(r.sena||0)
    const tieneGastosPendientes = gastos.some(g => g.reserva_id === r.id && !g.cobrado)
    return r.estado !== 'Cancelada' && (saldo > 0 || tieneGastosPendientes)
  })

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#FCEAEA', border: '0.5px solid #F09595', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 11, color: D, marginBottom: 4 }}>SALDOS PENDIENTES</div>
          <div style={{ fontSize: 26, fontWeight: 'bold', color: D }}>{saldosPendientes}</div>
          <div style={{ fontSize: 12, color: '#888' }}>reservas con saldo a cobrar</div>
        </div>
        <div style={{ background: '#FEF3E2', border: '0.5px solid #E8A951', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 11, color: W, marginBottom: 4 }}>GASTOS PENDIENTES</div>
          <div style={{ fontSize: 26, fontWeight: 'bold', color: W }}>{gastosPendientes}</div>
          <div style={{ fontSize: 12, color: '#888' }}>gastos a cobrar al huésped</div>
        </div>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 14, color: B }}>Registrar cobro / gasto</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={selRes} onChange={e => { setSelRes(e.target.value); setMsg(null) }} style={{ padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
            <option value="">Seleccionar reserva...</option>
            {reservas.filter(r => r.estado !== 'Cancelada').map(r => {
              const saldo = Number(r.monto_total||0) - Number(r.sena||0)
              return <option key={r.id} value={r.id}>{r.id} — {r.huesped_nombre} · Saldo: {fmtM(saldo, r.moneda)}</option>
            })}
          </select>
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              ['saldo', '💳 Cobrar saldo'],
              ['gasto_huesped', '📋 Gasto huésped'],
              ['gasto_propietario', '🏠 Gasto propietario'],
            ].map(([t, label]) => (
              <button key={t} onClick={() => setTipoMovimiento(t)} style={{ padding: '7px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 'bold', background: tipoMovimiento === t ? B : '#F0F0F0', color: tipoMovimiento === t ? '#fff' : '#555' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {selRes && res && (
          <>
            {/* Resumen de la reserva */}
            <div style={{ background: '#F7F8FA', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <strong>{res.huesped_nombre}</strong>
              <span style={{ color: '#888' }}>{res.propiedad_id} · {formatFecha(res.fecha_entrada)} → {formatFecha(res.fecha_salida)}</span>
              <Pill text={res.estado} color={colorEstado[res.estado]||'gray'} />
              {saldoPendiente > 0
                ? <span style={{ color: D, fontWeight: 'bold' }}>Saldo pendiente: {fmtM(saldoPendiente, res.moneda)}</span>
                : <span style={{ color: G, fontSize: 11 }}>✓ Saldo cobrado</span>}
              {totalGastosHuesped > 0 && <span style={{ color: W, fontWeight: 'bold' }}>Gastos pendientes: {fmtM(totalGastosHuesped, res.moneda)}</span>}
            </div>

            {msg && <div style={{ background: msg.ok ? '#E8F5EE' : '#FCEAEA', border: '0.5px solid '+(msg.ok?'#9DDCB4':'#F09595'), borderRadius: 6, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: msg.ok?G:D }}>{msg.ok?'✓ ':'✗ '}{msg.text}</div>}

            {/* MODO: Cobrar saldo */}
            {tipoMovimiento === 'saldo' && (
              saldoPendiente <= 0
                ? <div style={{ background: '#E8F5EE', border: '0.5px solid #9DDCB4', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: G }}>✓ Esta reserva no tiene saldo pendiente.</div>
                : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Importe a cobrar</div>
                      <input type="number" value={importe} onChange={e => setImporte(e.target.value)}
                        placeholder={String(saldoPendiente)}
                        style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }} />
                      <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>Saldo total: {fmtM(saldoPendiente, res.moneda)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Fecha de cobro</div>
                      <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Observaciones</div>
                      <input type="text" value={observaciones} onChange={e => setObservaciones(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }} />
                    </div>
                    <div style={{ gridColumn: 'span 3' }}>
                      <Btn onClick={registrarCobro} disabled={loading} color={G}>
                        {loading ? 'Registrando...' : '✓ Registrar cobro de saldo — ' + fmtM(importe || saldoPendiente, res.moneda)}
                      </Btn>
                    </div>
                  </div>
            )}

            {/* MODO: Cobrar gastos del huésped (gastos ya cargados) */}
            {tipoMovimiento === 'gasto_huesped' && (
              gastosHuesped.length === 0
                ? <div style={{ background: '#F7F8FA', border: '0.5px solid #ddd', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#888' }}>
                    No hay gastos pendientes de cobro para esta reserva. Cargue gastos desde el módulo <strong>Gastos</strong>.
                  </div>
                : <>
                    <div style={{ background: '#FEF3E2', border: '0.5px solid #E8A951', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
                      <div style={{ fontWeight: 'bold', fontSize: 12, color: W, marginBottom: 8 }}>Gastos pendientes de cobro al huésped:</div>
                      {gastosHuesped.map((g, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: i < gastosHuesped.length-1 ? '0.5px solid #F0C070' : 'none' }}>
                          <span>{g.concepto}</span>
                          <span style={{ fontWeight: 'bold' }}>{fmtM(g.importe, g.moneda)}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 'bold', borderTop: '1px solid #E8A951', paddingTop: 8, marginTop: 8 }}>
                        <span>TOTAL A COBRAR</span>
                        <span style={{ color: W }}>{fmtM(totalGastosHuesped, res.moneda)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Fecha de cobro</div>
                        <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                          style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Observaciones</div>
                        <input type="text" value={observaciones} onChange={e => setObservaciones(e.target.value)}
                          style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }} />
                      </div>
                    </div>
                    <Btn onClick={registrarCobro} disabled={loading} color={W}>
                      {loading ? 'Registrando...' : '✓ Registrar pago de gastos — ' + fmtM(totalGastosHuesped, res.moneda)}
                    </Btn>
                  </>
            )}

            {/* MODO: Gasto propietario — cargar nuevo gasto */}
            {tipoMovimiento === 'gasto_propietario' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Concepto del gasto</div>
                  <input type="text" value={observaciones} onChange={e => setObservaciones(e.target.value)}
                    placeholder="Ej: Reparación calefactor"
                    style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Importe</div>
                  <input type="number" value={importe} onChange={e => setImporte(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Fecha</div>
                  <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }} />
                </div>
                <div style={{ gridColumn: 'span 3' }}>
                  <Btn onClick={registrarCobro} disabled={loading} color={B}>
                    {loading ? 'Registrando...' : '+ Cargar gasto de propietario'}
                  </Btn>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <Card>
        <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 14 }}>Reservas con movimientos pendientes</div>
        <Tabla
          cols={['Reserva', 'Huésped', 'Propiedad', 'Entrada', 'Total', 'Seña', 'Saldo pendiente', 'Gastos pendientes', 'Estado']}
          filas={reservasConMovimientos.map(r => {
            const saldo = Number(r.monto_total||0) - Number(r.sena||0)
            const gastosRPend = gastos.filter(g => g.reserva_id === r.id && g.responsable === 'Huesped' && !g.cobrado)
            const totGastosPend = gastosRPend.reduce((s,g) => s + Number(g.importe||0), 0)
            return [
              <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.id}</span>,
              <span style={{ fontWeight: 'bold' }}>{r.huesped_nombre}</span>,
              r.propiedad_id,
              formatFecha(r.fecha_entrada),
              fmtM(r.monto_total, r.moneda),
              fmtM(r.sena, r.moneda),
              saldo > 0 ? <span style={{ fontWeight: 'bold', color: D }}>{fmtM(saldo, r.moneda)}</span> : <span style={{ color: G, fontSize: 11 }}>✓ Cobrado</span>,
              totGastosPend > 0 ? <span style={{ color: W, fontWeight: 'bold' }}>{fmtM(totGastosPend, r.moneda)}</span> : <span style={{ color: G, fontSize: 11 }}>✓ Sin pendientes</span>,
              <Pill text={r.estado} color={colorEstado[r.estado]||'gray'} />
            ]
          })}
        />
      </Card>
    </>
  )
}

// ─── MÓDULO DASHBOARD ────────────────────────────────────

function CajaTemp({ data, perfil = {}, onRefresh }) {
  const [form, setForm] = useState(false)
  const [filtroMes, setFiltroMes] = useState('')
  const vacio = { tipo: 'Ingreso', categoria: 'Comisión de gestión', concepto: '', importe: '', moneda: 'ARS', fecha: new Date().toISOString().split('T')[0], observaciones: '' }
  const [f, setF] = useState(vacio)

  const CATS_ING = ['Comisión de gestión', 'Seña cobrada', 'Saldo cobrado', 'Honorarios', 'Otro ingreso']
  const CATS_EGR = ['Gastos propietario', 'Devolución', 'Publicidad', 'Movilidad', 'Otro egreso']

  const movsFiltrados = (data || []).filter(m => !filtroMes || (m.fecha && m.fecha.startsWith(filtroMes)))
  const saldoARS = (data || []).filter(m => m.moneda === 'ARS').reduce((s,m) => s + (m.tipo==='Ingreso'?1:-1)*Number(m.importe||0), 0)
  const saldoUSD = (data || []).filter(m => m.moneda === 'USD').reduce((s,m) => s + (m.tipo==='Ingreso'?1:-1)*Number(m.importe||0), 0)
  const ingMes = movsFiltrados.filter(m => m.tipo==='Ingreso' && m.moneda==='ARS').reduce((s,m) => s+Number(m.importe||0), 0)
  const egrMes = movsFiltrados.filter(m => m.tipo==='Egreso' && m.moneda==='ARS').reduce((s,m) => s+Number(m.importe||0), 0)
  const meses = [...new Set((data||[]).map(m => m.fecha?.substring(0,7)).filter(Boolean))].sort().reverse()

  async function guardar() {
    if (!f.concepto || !f.importe) return alert('Complete concepto e importe')
    const adminId = (await supabase.auth.getUser()).data.user?.id
    const { error } = await supabase.from('caja').insert([{
      ...f, id: 'CJ-' + Date.now(), importe: Number(f.importe), admin_id: adminId
    }])
    if (error) return alert('Error: ' + error.message)
    setForm(false); setF(vacio); onRefresh()
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar este movimiento?')) return
    await supabase.from('caja').delete().eq('id', id)
    onRefresh()
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          ['SALDO ARS', fmt(saldoARS), saldoARS>=0?G:D],
          ['SALDO USD', fmtUSD(saldoUSD), saldoUSD>=0?B:D],
          ['INGRESOS ' + (filtroMes||'TOTAL'), fmt(ingMes), G],
          ['EGRESOS ' + (filtroMes||'TOTAL'), fmt(egrMes), D],
        ].map(([label, val, color], i) => (
          <Card key={i}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color }}>{val}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} style={{ padding: '6px 12px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13 }}>
            <option value="">Todos los movimientos</option>
            {meses.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {filtroMes && <BtnSec onClick={() => setFiltroMes('')}>✕ Limpiar</BtnSec>}
        </div>
        <Btn onClick={() => setForm(true)}>+ Movimiento manual</Btn>
      </div>

      {form && (
        <Card style={{ marginBottom: 16, border: '1px solid ' + G }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 12 }}>Nuevo movimiento</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Tipo</div>
              <select value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value, categoria: e.target.value==='Ingreso'?CATS_ING[0]:CATS_EGR[0] })} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13, background: f.tipo==='Ingreso'?'#E8F5EE':'#FCEAEA' }}>
                <option>Ingreso</option><option>Egreso</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Categoría</div>
              <select value={f.categoria} onChange={e => setF({ ...f, categoria: e.target.value })} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                {(f.tipo==='Ingreso'?CATS_ING:CATS_EGR).map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Moneda</div>
              <select value={f.moneda} onChange={e => setF({ ...f, moneda: e.target.value })} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                <option value="ARS">Pesos (ARS)</option><option value="USD">Dólares (USD)</option>
              </select>
            </div>
            <Input label="Concepto" value={f.concepto} onChange={v => setF({ ...f, concepto: v })} />
            <Input label="Importe" value={f.importe} onChange={v => setF({ ...f, importe: v })} type="number" />
            <Input label="Fecha" value={f.fecha} onChange={v => setF({ ...f, fecha: v })} type="date" />
            <div style={{ gridColumn: 'span 3' }}>
              <Input label="Observaciones (opcional)" value={f.observaciones} onChange={v => setF({ ...f, observaciones: v })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={guardar}>Guardar</Btn>
            <BtnSec onClick={() => { setForm(false); setF(vacio) }}>Cancelar</BtnSec>
          </div>
        </Card>
      )}

      <Card>
        {movsFiltrados.length === 0
          ? <div style={{ color: '#bbb', fontSize: 13, padding: 12 }}>No hay movimientos{filtroMes ? ' para el mes seleccionado' : ''}</div>
          : <Tabla
              cols={['Fecha', 'Tipo', 'Categoría', 'Concepto', 'Moneda', 'Importe', '']}
              filas={movsFiltrados.map(m => [
                m.fecha,
                <Pill text={m.tipo} color={m.tipo==='Ingreso'?'ok':'danger'} />,
                <span style={{ fontSize: 12 }}>{m.categoria}</span>,
                <span style={{ fontSize: 12 }}>{m.concepto}</span>,
                <Pill text={m.moneda||'ARS'} color={m.moneda==='USD'?'blue':'gray'} />,
                <span style={{ fontWeight: 'bold', color: m.tipo==='Ingreso'?G:D }}>{m.tipo==='Egreso'?'- ':''}{fmtM(m.importe, m.moneda)}</span>,
                <button onClick={() => eliminar(m.id)} style={{ padding: '3px 8px', borderRadius: 5, background: D, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✗</button>
              ])}
            />
        }
      </Card>
    </>
  )
}

// ─── MÓDULO PERFIL ADMIN ─────────────────────────────────

function Checklist({ reservas, onRefresh }) {
  const [selRes, setSelRes] = useState('')
  const [tipo, setTipo] = useState('ingreso')
  const [items, setItems] = useState({})
  const [obs, setObs] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  const res = reservas.find(r => r.id === selRes)

  useEffect(() => {
    if (!res) return
    const existente = tipo === 'ingreso' ? res.checklist_ingreso : res.checklist_egreso
    if (existente && Array.isArray(existente) && existente.length > 0) {
      const map = {}
      existente.forEach(it => { map[it.item] = it.ok })
      setItems(map)
    } else {
      const map = {}
      ITEMS_DEFAULT.forEach(it => { map[it] = false })
      setItems(map)
    }
  }, [selRes, tipo])

  async function guardar() {
    if (!selRes) return
    setLoading(true); setMsg(null)
    const lista = ITEMS_DEFAULT.map(it => ({ item: it, ok: items[it] || false }))
    const campo = tipo === 'ingreso' ? 'checklist_ingreso' : 'checklist_egreso'
    const campoOk = tipo === 'ingreso' ? 'checklist_ingreso_ok' : 'checklist_egreso_ok'
    const todosOk = lista.every(it => it.ok)
    const { error } = await supabase.from('reservas_temp').update({ [campo]: lista, [campoOk]: todosOk }).eq('id', selRes)
    if (error) setMsg({ ok: false, text: 'Error: ' + error.message })
    else { setMsg({ ok: true, text: 'Checklist guardado correctamente.' }); onRefresh() }
    setLoading(false)
  }

  const completados = ITEMS_DEFAULT.filter(it => items[it]).length
  const colorEstado = { 'Confirmada': 'ok', 'Señada': 'warn', 'Pendiente': 'blue', 'Cancelada': 'danger' }

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 14 }}>Checklist de ingreso / egreso</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <select value={selRes} onChange={e => setSelRes(e.target.value)} style={{ padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
            <option value="">Seleccionar reserva...</option>
            {reservas.filter(r => r.estado !== 'Cancelada').map(r => (
              <option key={r.id} value={r.id}>{r.id} — {r.huesped_nombre} ({r.propiedad_id}) {formatFecha(r.fecha_entrada)}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 4 }}>
            {['ingreso', 'egreso'].map(t => (
              <button key={t} onClick={() => setTipo(t)} style={{ padding: '7px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 'bold', background: tipo === t ? G : '#F0F0F0', color: tipo === t ? '#fff' : '#555', textTransform: 'capitalize' }}>
                {t === 'ingreso' ? '🔑 Ingreso' : '🚪 Egreso'}
              </button>
            ))}
          </div>
        </div>

        {selRes && res && (
          <>
            <div style={{ background: '#F7F8FA', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, display: 'flex', gap: 16 }}>
              <span><strong>{res.huesped_nombre}</strong></span>
              <span style={{ color: '#888' }}>{res.propiedad_id}</span>
              <span style={{ color: '#888' }}>{formatFecha(res.fecha_entrada)} → {formatFecha(res.fecha_salida)}</span>
              <Pill text={res.estado} color={colorEstado[res.estado] || 'gray'} />
            </div>

            {msg && <div style={{ background: msg.ok ? '#E8F5EE' : '#FCEAEA', border: '0.5px solid ' + (msg.ok ? '#9DDCB4' : '#F09595'), borderRadius: 6, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: msg.ok ? G : D }}>{msg.ok ? '✓ ' : '✗ '}{msg.text}</div>}

            <div style={{ marginBottom: 8, fontSize: 12, color: completados === ITEMS_DEFAULT.length ? G : '#888' }}>
              {completados}/{ITEMS_DEFAULT.length} items completados
              {completados === ITEMS_DEFAULT.length && ' ✓ Todo OK'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              {ITEMS_DEFAULT.map(item => (
                <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, background: items[item] ? '#E8F5EE' : '#F7F8FA', border: '0.5px solid ' + (items[item] ? '#9DDCB4' : '#E8ECF0'), cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={!!items[item]} onChange={e => setItems({...items, [item]: e.target.checked})} />
                  <span style={{ color: items[item] ? G : '#333' }}>{item}</span>
                </label>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <Input label="Observaciones adicionales" value={obs} onChange={setObs} />
            </div>

            <Btn onClick={guardar} disabled={loading}>{loading ? 'Guardando...' : 'Guardar checklist'}</Btn>
          </>
        )}
      </Card>
    </>
  )
}

// ─── NOTIFICACIONES ──────────────────────────────────────

function NotificacionesTemp({ reservas, propiedades, propietarios }) {
  const [tab, setTab] = useState('huesped')
  const [selRes, setSelRes] = useState('')
  const [tipo, setTipo] = useState('confirmacion')

  const res = reservas.find(r => r.id === selRes)
  const prop = res ? propiedades.find(p => p.id === res.propiedad_id) : null
  const saldo = res ? Number(res.monto_total||0) - Number(res.sena||0) : 0

  const mensajes = {
    confirmacion: res ? `Estimado/a ${res.huesped_nombre}, le confirmamos su reserva en ${prop?.nombre || res?.propiedad_id} (${prop?.localidad || 'Pinamar'}).

📅 Ingreso: ${formatFecha(res.fecha_entrada)}
📅 Egreso: ${formatFecha(res.fecha_salida)}
🏠 Propiedad: ${prop?.nombre || res.propiedad_id}
💰 Total: ${fmtM(res.monto_total, res.moneda)}
✅ Seña abonada: ${fmtM(res.sena, res.moneda)}
💳 Saldo a abonar: ${fmtM(saldo, res.moneda)}

Ante cualquier consulta no dude en contactarnos.
Saludos cordiales.` : '',

    recordatorio: res ? `Estimado/a ${res.huesped_nombre}, le recordamos que su reserva en ${prop?.nombre || res?.propiedad_id} se inicia en 48 horas.

📅 Ingreso: ${formatFecha(res.fecha_entrada)}
🏠 Propiedad: ${prop?.nombre || res.propiedad_id}, ${prop?.localidad || 'Pinamar'}
${saldo > 0 ? `💳 Recuerde abonar el saldo pendiente de ${fmtM(saldo, res.moneda)} al momento del ingreso.` : '✅ No tiene saldo pendiente.'}

¡Lo esperamos! Ante cualquier consulta contáctenos.` : '',

    cobro_saldo: res ? `Estimado/a ${res.huesped_nombre}, le recordamos que tiene un saldo pendiente de ${fmtM(saldo, res.moneda)} correspondiente a su reserva en ${prop?.nombre || res?.propiedad_id} del ${formatFecha(res.fecha_entrada)} al ${formatFecha(res.fecha_salida)}.

Por favor coordine el pago del saldo antes de la fecha de ingreso.
Gracias.` : '',
  }

  const msg = mensajes[tipo] || ''

  function abrirWhatsApp() {
    if (!res?.huesped_telefono) return alert('La reserva no tiene teléfono del huésped')
    const tel = res.huesped_telefono.replace(/\D/g, '')
    window.open(`https://wa.me/549${tel}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  function abrirEmail() {
    if (!res?.huesped_email) return alert('La reserva no tiene email del huésped')
    const asuntos = { confirmacion: 'Confirmación de reserva', recordatorio: 'Recordatorio de ingreso', cobro_saldo: 'Saldo pendiente de reserva' }
    window.open(`mailto:${res.huesped_email}?subject=${encodeURIComponent(asuntos[tipo])}&body=${encodeURIComponent(msg)}`)
  }

  const colorEstado = { 'Confirmada': 'ok', 'Señada': 'warn', 'Pendiente': 'blue', 'Cancelada': 'danger' }

  // Tab propietarios — liquidaciones
  const liqProp = (propietarios || []).map(owner => {
    const propsOwner = propiedades.filter(p => p.propietario_id === owner.id)
    const resOwner = reservas.filter(r =>
      propsOwner.some(p => p.id === r.propiedad_id) && r.estado === 'Confirmada'
    )
    if (resOwner.length === 0) return null
    const netoARS = resOwner.filter(r => r.moneda === 'ARS').reduce((s,r) => s + Number(r.neto_propietario||0), 0)
    const netoUSD = resOwner.filter(r => r.moneda === 'USD').reduce((s,r) => s + Number(r.neto_propietario||0), 0)
    const brutoARS = resOwner.filter(r => r.moneda === 'ARS').reduce((s,r) => s + Number(r.monto_total||0), 0)
    const brutoUSD = resOwner.filter(r => r.moneda === 'USD').reduce((s,r) => s + Number(r.monto_total||0), 0)
    const comARS = brutoARS - netoARS
    const comUSD = brutoUSD - netoUSD
    return { owner, resOwner, netoARS, netoUSD, brutoARS, brutoUSD, comARS, comUSD }
  }).filter(Boolean)

  const tabBtn = (t, label) => (
    <button onClick={() => setTab(t)} style={{ padding: '8px 20px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 'bold', background: tab === t ? B : '#F0F0F0', color: tab === t ? '#fff' : '#888' }}>
      {label}
    </button>
  )

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {tabBtn('huesped', '👤 Notificar huéspedes')}
        {tabBtn('propietario', '🏠 Liquidar propietarios')}
      </div>

      {tab === 'huesped' && (
        <Card>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 14 }}>Notificaciones al huésped</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <select value={selRes} onChange={e => setSelRes(e.target.value)} style={{ padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
              <option value="">Seleccionar reserva...</option>
              {reservas.filter(r => r.estado !== 'Cancelada').map(r => (
                <option key={r.id} value={r.id}>{r.id} — {r.huesped_nombre} ({formatFecha(r.fecha_entrada)})</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 4 }}>
              {[['confirmacion', '✓ Confirmación'], ['recordatorio', '⏰ Recordatorio'], ['cobro_saldo', '💳 Cobro saldo']].map(([t, label]) => (
                <button key={t} onClick={() => setTipo(t)} style={{ padding: '7px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: tipo === t ? 'bold' : 'normal', background: tipo === t ? B : '#F0F0F0', color: tipo === t ? '#fff' : '#555' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {selRes && res && (
            <>
              <div style={{ background: '#F7F8FA', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <strong>{res.huesped_nombre}</strong>
                <span style={{ color: '#888' }}>📱 {res.huesped_telefono || 'Sin teléfono'}</span>
                <span style={{ color: '#888' }}>✉ {res.huesped_email || 'Sin email'}</span>
                <Pill text={res.estado} color={colorEstado[res.estado] || 'gray'} />
              </div>
              <textarea value={msg} readOnly rows={12}
                style={{ width: '100%', padding: '10px 14px', border: '0.5px solid #ddd', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', lineHeight: 1.6, background: '#FAFAFA', resize: 'vertical', marginBottom: 14 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn onClick={abrirWhatsApp} color='#25D366'>📱 Enviar por WhatsApp</Btn>
                <Btn onClick={abrirEmail} color={B}>✉ Abrir en Email</Btn>
              </div>
            </>
          )}
        </Card>
      )}

      {tab === 'propietario' && (
        <Card>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 14, color: B }}>Liquidaciones — Notificar propietarios</div>
          {liqProp.length === 0 ? (
            <div style={{ color: '#bbb', padding: 20, textAlign: 'center', fontSize: 13 }}>No hay propietarios con reservas confirmadas</div>
          ) : liqProp.map((liq, i) => {
            const msgWA = `Estimado/a ${liq.owner.apellido_nombre}, le informamos su liquidación de alquileres temporarios GASP:\n${liq.netoARS > 0 ? '🏦 Neto ARS: $' + Number(liq.netoARS).toLocaleString('es-AR') + '\n' : ''}${liq.netoUSD > 0 ? '💵 Neto USD: USD ' + Number(liq.netoUSD).toLocaleString('es-AR') + '\n' : ''}📋 Reservas: ${liq.resOwner.length}\nAnte cualquier consulta contáctenos. Saludos.`
            const asunto = 'Liquidación alquileres temporarios'
            const cuerpoEmail = `Estimado/a ${liq.owner.apellido_nombre},\n\nAdjunto su liquidación de alquileres temporarios:\n\n${liq.netoARS > 0 ? 'Neto pesos: $' + Number(liq.netoARS).toLocaleString('es-AR') + '\n' : ''}${liq.netoUSD > 0 ? 'Neto USD: USD ' + Number(liq.netoUSD).toLocaleString('es-AR') + '\n' : ''}Reservas confirmadas: ${liq.resOwner.length}\n\nSaludos,\nGASP Alquileres Temporarios`
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '0.5px solid #F0F2F5', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: 14 }}>{liq.owner.apellido_nombre}</div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{liq.resOwner.length} reserva(s) · {liq.owner.email || 'Sin email'} · {liq.owner.telefono || 'Sin teléfono'}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 13, flexWrap: 'wrap' }}>
                    {liq.netoARS > 0 && <span style={{ color: G, fontWeight: 'bold' }}>Neto ARS: {fmt(liq.netoARS)}</span>}
                    {liq.netoUSD > 0 && <span style={{ color: B, fontWeight: 'bold' }}>Neto USD: {fmtUSD(liq.netoUSD)}</span>}
                    {liq.comARS > 0 && <span style={{ color: '#888', fontSize: 11 }}>Com. ARS: {fmt(liq.comARS)}</span>}
                    {liq.comUSD > 0 && <span style={{ color: '#888', fontSize: 11 }}>Com. USD: {fmtUSD(liq.comUSD)}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {liq.owner.telefono && (
                    <Btn onClick={() => window.open('https://wa.me/549' + liq.owner.telefono.replace(/\D/g,'') + '?text=' + encodeURIComponent(msgWA), '_blank')} color='#25D366'>
                      📱 WhatsApp
                    </Btn>
                  )}
                  {liq.owner.email && (
                    <Btn onClick={() => window.open('mailto:' + liq.owner.email + '?subject=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(cuerpoEmail))} color={B}>
                      ✉ Email
                    </Btn>
                  )}
                  {!liq.owner.telefono && !liq.owner.email && (
                    <span style={{ fontSize: 12, color: '#bbb' }}>Sin contacto registrado</span>
                  )}
                </div>
              </div>
            )
          })}
        </Card>
      )}
    </>
  )
}


// ─── MÓDULO COBRANZAS ────────────────────────────────────

function ClientesGaspTemp({ session }) {
  const [tab, setTab] = useState('clientes')
  const [clientes, setClientes] = useState([])
  const [nombre, setNombre] = useState('')
  const [emailC, setEmailC] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => { cargarClientes() }, [])

  async function cargarClientes() {
    const { data } = await supabase.from('usuarios_demo').select('*').order('fecha_expiracion', { ascending: false })
    setClientes(data || [])
  }

  async function callFn(fnName, body) {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    const res = await fetch(SUPABASE_URL + '/functions/v1/' + fnName, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(body)
    })
    return res.json()
  }

  async function crearCliente() {
    if (!nombre || !emailC || !password) return setMsg({ ok: false, text: 'Complete todos los campos' })
    setLoading(true); setMsg(null)
    try {
      const data = await callFn('crear-admin', { nombre, email: emailC, password })
      if (data.ok) {
        setMsg({ ok: true, text: 'Cliente creado: ' + emailC })
        setNombre(''); setEmailC(''); setPassword('')
      } else {
        setMsg({ ok: false, text: data.error || 'Error al crear cliente' })
      }
    } catch (e) {
      setMsg({ ok: false, text: e.message })
    }
    setLoading(false)
  }

  async function crearDemo() {
    if (!nombre || !emailC || !password) return setMsg({ ok: false, text: 'Complete todos los campos' })
    setLoading(true); setMsg(null)
    try {
      const data = await callFn('crear-demo-temp', { nombre, email: emailC, password })
      if (data.ok) {
        setMsg({ ok: true, text: data.mensaje || 'Demo creada: ' + emailC })
        setNombre(''); setEmailC(''); setPassword('')
        cargarClientes()
      } else {
        setMsg({ ok: false, text: data.error || 'Error al crear demo' })
      }
    } catch (e) {
      setMsg({ ok: false, text: e.message })
    }
    setLoading(false)
  }

  async function desactivarDemo(adminId) {
    if (!window.confirm('¿Desactivar esta demo?')) return
    await supabase.from('usuarios_demo').update({ activo: false }).eq('admin_id', adminId)
    cargarClientes()
  }

  const tabBtn = (t, label) => (
    <button onClick={() => setTab(t)} style={{ padding: '8px 20px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 'bold', background: tab === t ? B : '#F0F0F0', color: tab === t ? '#fff' : '#888' }}>
      {label}
    </button>
  )

  return (
    <>
      <div style={{ background: '#E8EEFB', border: '0.5px solid #A8C0F0', borderRadius: 8, padding: '10px 16px', marginBottom: 18, fontSize: 13, color: B }}>
        🔐 Panel exclusivo del superadministrador GASP Temporario
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {tabBtn('nuevo', '➕ Alta de cliente')}
        {tabBtn('demo', '🎯 Crear demo')}
        {tabBtn('clientes', '👥 Clientes activos')}
      </div>

      {tab === 'nuevo' && (
        <Card style={{ maxWidth: 500, border: '1px solid ' + B }}>
          <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 16, color: B }}>Nuevo cliente GASP Temporario</div>
          {msg && (
            <div style={{ background: msg.ok ? '#E8F5EE' : '#FCEAEA', border: '0.5px solid ' + (msg.ok ? '#9DDCB4' : '#F09595'), borderRadius: 6, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: msg.ok ? G : D }}>
              {msg.ok ? '✓ ' : '✗ '}{msg.text}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            <Input label="Nombre completo" value={nombre} onChange={setNombre} />
            <Input label="Email (usuario de acceso)" value={emailC} onChange={setEmailC} type="email" />
            <Input label="Contraseña inicial" value={password} onChange={setPassword} type="password" />
          </div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 14, background: '#F7F8FA', borderRadius: 6, padding: '8px 12px' }}>
            El cliente podrá ingresar a <strong>gasptemp.vercel.app</strong> con estas credenciales. Sus datos estarán aislados de otros clientes mediante RLS.
          </div>
          <Btn onClick={crearCliente} disabled={loading} color={B}>
            {loading ? 'Creando...' : '✓ Crear cliente'}
          </Btn>
        </Card>
      )}

      {tab === 'demo' && (
        <Card style={{ maxWidth: 500, border: '1px solid ' + G }}>
          <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 6, color: G }}>🎯 Demo GASP Temporario — 7 días</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 16, background: '#F0FBF4', borderRadius: 6, padding: '8px 12px' }}>
            Se crea el usuario con datos de muestra: 3 propietarios, 3 propiedades y 4 reservas (pasadas, activas y futuras). Expira a los 7 días.
          </div>
          {msg && (
            <div style={{ background: msg.ok ? '#E8F5EE' : '#FCEAEA', border: '0.5px solid ' + (msg.ok ? '#9DDCB4' : '#F09595'), borderRadius: 6, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: msg.ok ? G : D }}>
              {msg.ok ? '✓ ' : '✗ '}{msg.text}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            <Input label="Nombre del prospecto" value={nombre} onChange={setNombre} />
            <Input label="Email" value={emailC} onChange={setEmailC} type="email" />
            <Input label="Contraseña" value={password} onChange={setPassword} type="password" />
          </div>
          <Btn onClick={crearDemo} disabled={loading} color={G}>
            {loading ? 'Creando demo...' : '🎯 Crear demo 7 días'}
          </Btn>
        </Card>
      )}

      {tab === 'clientes' && (
        <Card>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 14 }}>Clientes y demos activas — GASP Temporario</div>
          {clientes.length === 0 ? (
            <div style={{ color: '#bbb', fontSize: 13 }}>Sin clientes registrados</div>
          ) : (
            <Tabla
              cols={['Email', 'Nombre', 'Alta', 'Expira', 'Estado', 'Acciones']}
              filas={clientes.map(cl => {
                const expira = cl.fecha_expiracion ? new Date(cl.fecha_expiracion) : null
                const dias = expira ? Math.ceil((expira - new Date()) / 86400000) : null
                const expirado = dias !== null && dias <= 0
                const esDemo = expira !== null
                return [
                  <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{cl.email}</span>,
                  cl.nombre || '—',
                  cl.fecha_alta?.split('T')[0] || '—',
                  esDemo ? (
                    <span style={{ color: expirado ? D : dias <= 2 ? W : G, fontWeight: 'bold', fontSize: 11 }}>
                      {expirado ? 'Expirada' : dias + ' días'}
                    </span>
                  ) : <span style={{ color: '#888', fontSize: 11 }}>Permanente</span>,
                  <Pill text={!cl.activo ? 'Inactivo' : expirado ? 'Expirado' : 'Activo'} color={!cl.activo || expirado ? 'danger' : 'ok'} />,
                  esDemo && cl.activo && !expirado ? (
                    <button onClick={() => desactivarDemo(cl.admin_id)} style={{ padding: '3px 8px', borderRadius: 5, background: D, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✗ Desactivar</button>
                  ) : '—'
                ]
              })}
            />
          )}
        </Card>
      )}
    </>
  )
}

// ── CLIENTES GASP FULL ────────────────────────────────────────────────────────

function PerfilAdminTemp({ perfil, onRefresh, session }) {
  const [nombre_completo, setNombre] = useState(perfil.nombre_completo || '')
  const [titulo, setTitulo] = useState(perfil.titulo || '')
  const [matricula, setMatricula] = useState(perfil.matricula || '')
  const [ciudad, setCiudad] = useState(perfil.ciudad || '')
  const [provincia, setProvincia] = useState(perfil.provincia || '')
  const [email_contacto, setEmail] = useState(perfil.email_contacto || '')
  const [telefono, setTelefono] = useState(perfil.telefono || '')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    setNombre(perfil.nombre_completo || '')
    setTitulo(perfil.titulo || '')
    setMatricula(perfil.matricula || '')
    setCiudad(perfil.ciudad || '')
    setProvincia(perfil.provincia || '')
    setEmail(perfil.email_contacto || '')
    setTelefono(perfil.telefono || '')
  }, [perfil])

  async function guardar() {
    setLoading(true); setMsg(null)
    const admin_id = session?.user?.id
    const datos = { admin_id, nombre_completo, titulo, matricula, ciudad, provincia, email_contacto, telefono, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('full_perfil_admin').upsert(datos, { onConflict: 'admin_id' })
    if (error) setMsg({ ok: false, text: 'Error: ' + error.message })
    else { setMsg({ ok: true, text: 'Perfil guardado.' }); onRefresh() }
    setLoading(false)
  }

  return (
    <Card style={{ maxWidth: 600 }}>
      <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 6, color: B }}>Mi perfil profesional</div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>Estos datos aparecen en todos los PDFs generados por el sistema.</div>
      {msg && <div style={{ background: msg.ok?'#E8F5EE':'#FCEAEA', border: '0.5px solid '+(msg.ok?'#9DDCB4':'#F09595'), borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: msg.ok?G:D }}>{msg.ok?'✓ ':'✗ '}{msg.text}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <Input label="Nombre y apellido completo" value={nombre_completo} onChange={setNombre} />
        <Input label="Título / Cargo" value={titulo} onChange={setTitulo} />
        <Input label="Matrícula (ej: RPAC Mat. N° 83)" value={matricula} onChange={setMatricula} />
        <Input label="Email de contacto" value={email_contacto} onChange={setEmail} />
        <Input label="Ciudad" value={ciudad} onChange={setCiudad} />
        <Input label="Provincia" value={provincia} onChange={setProvincia} />
        <Input label="Teléfono" value={telefono} onChange={setTelefono} />
      </div>
      <div style={{ background: '#F7F8FA', borderRadius: 8, padding: 14, marginBottom: 20, fontSize: 12, color: '#555' }}>
        <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Vista previa en PDFs:</div>
        <div>{nombre_completo||'Nombre'} | {titulo||'Título'} | {matricula||'Matrícula'}</div>
        <div>{ciudad||'Ciudad'}, {provincia||'Provincia'} | {email_contacto||'email@contacto.com'}</div>
      </div>
      <Btn onClick={guardar} disabled={loading}>{loading ? 'Guardando...' : 'Guardar perfil'}</Btn>
    </Card>
  )
}

// ─── APP PRINCIPAL ───────────────────────────────────────
const NAV_TEMP = [
  { id: 'dashboard',      label: 'Panel principal',   seccion: 'Principal' },
  { id: 'calendario',     label: 'Calendario',         seccion: 'Principal' },
  { id: 'reservas',       label: 'Reservas',           seccion: 'Gestión' },
  { id: 'propiedades',    label: 'Propiedades',        seccion: 'Gestión' },
  { id: 'propietarios',   label: 'Propietarios',       seccion: 'Gestión' },
  { id: 'gastos',         label: 'Gastos',             seccion: 'Gestión' },
  { id: 'contratos',      label: 'Contratos',          seccion: 'Gestión' },
  { id: 'cobranzas',      label: 'Cobranzas',          seccion: 'Gestión' },
  { id: 'checklist',      label: 'Checklist',          seccion: 'Gestión' },
  { id: 'notificaciones', label: 'Notificaciones',     seccion: 'Gestión' },
  { id: 'liquidaciones',  label: 'Liquidaciones',      seccion: 'Reportes' },
  { id: 'caja',           label: 'Caja',               seccion: 'Reportes' },
  { id: 'mi_perfil',      label: 'Mi perfil',          seccion: 'Admin' },
  { id: 'clientes',       label: 'Clientes GASP',      seccion: 'Admin' },
]

// ─── APP GASP FULL ──────────────────────────────────────
// Componente que gestiona el acceso SSO a GASP Inmo

function ICalSync({ session, supabase, propiedades = [] }) {
  const [feeds, setFeeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [sincronizando, setSincronizando] = useState({})
  const [form, setForm] = useState(null)
  const [msg, setMsg] = useState(null)

  const PLATAFORMAS = [
    { value: 'airbnb',  label: 'Airbnb',   color: '#FF5A5F', icon: '🏠' },
    { value: 'booking', label: 'Booking',  color: '#003580', icon: '🔵' },
    { value: 'otro',    label: 'Otro',     color: '#6B7280', icon: '📅' },
  ]

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('ical_feeds')
      .select('*')
      .eq('admin_id', session.user.id)
      .order('created_at', { ascending: false })
    setFeeds(data || [])
    setLoading(false)
  }

  async function guardar() {
    if (!form.url_ical || !form.propiedad_id)
      return setMsg({ tipo: 'warn', texto: 'Completá propiedad y URL del iCal' })
    setMsg(null)
    const id = form.id || ('ICAL-' + Date.now())
    const payload = {
      id, admin_id: session.user.id,
      propiedad_id: form.propiedad_id,
      nombre: form.nombre || '',
      url_ical: form.url_ical.trim(),
      plataforma: form.plataforma || 'airbnb',
      activo: true,
    }
    const { error } = await supabase.from('ical_feeds').upsert(payload, { onConflict: 'id' })
    if (error) return setMsg({ tipo: 'error', texto: 'Error: ' + error.message })
    setMsg({ tipo: 'ok', texto: '✓ Feed guardado.' })
    setForm(null)
    cargar()
  }

  async function toggleActivo(feed) {
    await supabase.from('ical_feeds').update({ activo: !feed.activo }).eq('id', feed.id)
    cargar()
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este feed?')) return
    await supabase.from('ical_feeds').delete().eq('id', id)
    cargar()
  }

  async function sincronizar(feed) {
    setSincronizando(s => ({ ...s, [feed.id]: true }))
    setMsg(null)
    try {
      // Llama a la Edge Function que lee el iCal y crea reservas bloqueadas
      const { data: { session: s } } = await supabase.auth.getSession()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sincronizar-ical`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${s.access_token}`
          },
          body: JSON.stringify({ feed_id: feed.id })
        }
      )
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Error en sincronización')
      setMsg({ tipo: 'ok', texto: `✓ ${data.mensaje || 'Sincronización completada'}` })
      // Update ultima_sync
      await supabase.from('ical_feeds').update({ ultima_sync: new Date().toISOString() }).eq('id', feed.id)
      cargar()
    } catch (err) {
      setMsg({ tipo: 'error', texto: 'Error: ' + err.message })
    }
    setSincronizando(s => ({ ...s, [feed.id]: false }))
  }

  useEffect(() => { if (session) cargar() }, [session])

  const formVacio = { plataforma: 'airbnb', url_ical: '', propiedad_id: '', nombre: '' }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
            🔄 Sincronización iCal
          </h2>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
            Importá calendarios de Airbnb y Booking para bloquear fechas automáticamente
          </p>
        </div>
        <button onClick={() => setForm({ ...formVacio })}
          style={{ padding: '9px 20px', borderRadius: 8, background: '#1A3FA0', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          + Agregar feed
        </button>
      </div>

      {/* Instrucciones */}
      <div style={{ background: '#EFF6FF', borderRadius: 10, padding: 16, marginBottom: 20, fontSize: 13 }}>
        <div style={{ fontWeight: 700, color: '#1E40AF', marginBottom: 8 }}>📋 ¿Cómo obtener la URL del iCal?</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, color: '#374151' }}>
          <div>
            <strong>🏠 Airbnb:</strong><br />
            Anuncios → Tu anuncio → Disponibilidad<br />
            → Conectar otros calendarios → Exportar calendario<br />
            → Copiar enlace
          </div>
          <div>
            <strong>🔵 Booking.com:</strong><br />
            Extranet → Tarifas y disponibilidad<br />
            → Sincronización de disponibilidad → iCal<br />
            → Copiar URL de exportación
          </div>
        </div>
      </div>

      {/* Mensaje */}
      {msg && (
        <div style={{
          background: msg.tipo === 'ok' ? '#DCFCE7' : msg.tipo === 'warn' ? '#FEF9C3' : '#FEE2E2',
          color: msg.tipo === 'ok' ? '#166534' : msg.tipo === 'warn' ? '#854D0E' : '#991B1B',
          borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16
        }}>
          {msg.texto}
        </div>
      )}

      {/* Formulario nuevo feed */}
      {form && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, border: '1px solid #1A3FA0' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1A3FA0', marginBottom: 16 }}>
            {form.id ? 'Editar feed' : 'Nuevo feed iCal'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            {/* Plataforma */}
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#6B7280', marginBottom: 4, fontWeight: 500 }}>
                Plataforma *
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {PLATAFORMAS.map(p => (
                  <button key={p.value} onClick={() => setForm(f => ({ ...f, plataforma: p.value }))}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, border: `2px solid ${form.plataforma === p.value ? p.color : '#E5E7EB'}`,
                      background: form.plataforma === p.value ? p.color + '15' : '#fff',
                      cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      color: form.plataforma === p.value ? p.color : '#6B7280'
                    }}>
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Propiedad */}
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#6B7280', marginBottom: 4, fontWeight: 500 }}>
                Propiedad *
              </label>
              <select value={form.propiedad_id} onChange={e => setForm(f => ({ ...f, propiedad_id: e.target.value }))}
                style={{ width: '100%', padding: '8px 11px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13, fontFamily: 'inherit' }}>
                <option value="">Seleccionar...</option>
                {propiedades.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre || p.id}</option>
                ))}
              </select>
            </div>
            {/* Nombre */}
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#6B7280', marginBottom: 4, fontWeight: 500 }}>
                Nombre del feed (opcional)
              </label>
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Airbnb - Casa Norte"
                style={{ width: '100%', padding: '8px 11px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            {/* URL */}
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#6B7280', marginBottom: 4, fontWeight: 500 }}>
                URL del iCal *
              </label>
              <input value={form.url_ical} onChange={e => setForm(f => ({ ...f, url_ical: e.target.value }))}
                placeholder="https://www.airbnb.com.ar/calendar/ical/..."
                style={{ width: '100%', padding: '8px 11px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={guardar}
              style={{ padding: '9px 22px', borderRadius: 8, background: '#1A3FA0', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              Guardar feed
            </button>
            <button onClick={() => { setForm(null); setMsg(null) }}
              style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #D1D5DB', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de feeds */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#6B7280', padding: 40 }}>Cargando...</div>
      ) : feeds.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: '#6B7280', border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔄</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Sin feeds configurados</div>
          <div style={{ fontSize: 13 }}>Agregá un feed de Airbnb o Booking para sincronizar tu calendario.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {feeds.map(feed => {
            const plat = PLATAFORMAS.find(p => p.value === feed.plataforma) || PLATAFORMAS[2]
            const prop = propiedades.find(p => p.id === feed.propiedad_id)
            const syncing = sincronizando[feed.id]
            return (
              <div key={feed.id} style={{
                background: '#fff', borderRadius: 12, padding: '16px 20px',
                border: `1px solid ${feed.activo ? '#E5E7EB' : '#F3F4F6'}`,
                opacity: feed.activo ? 1 : 0.6,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, background: plat.color + '15',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0
                  }}>
                    {plat.icon}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>
                        {feed.nombre || plat.label}
                      </span>
                      <span style={{ fontSize: 11, background: plat.color + '15', color: plat.color, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                        {plat.label}
                      </span>
                      {!feed.activo && (
                        <span style={{ fontSize: 11, background: '#F3F4F6', color: '#6B7280', padding: '2px 8px', borderRadius: 10 }}>
                          Pausado
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 2 }}>
                      🏠 {prop?.nombre || feed.propiedad_id}
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 360 }}>
                      {feed.url_ical}
                    </div>
                    {feed.ultima_sync && (
                      <div style={{ fontSize: 11, color: '#10B981', marginTop: 3 }}>
                        ✓ Última sync: {new Date(feed.ultima_sync).toLocaleString('es-AR')}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => sincronizar(feed)} disabled={syncing || !feed.activo}
                    style={{
                      padding: '6px 14px', borderRadius: 7, border: 'none', cursor: syncing || !feed.activo ? 'not-allowed' : 'pointer',
                      background: syncing ? '#E5E7EB' : '#1A3FA0', color: syncing ? '#9CA3AF' : '#fff',
                      fontSize: 12, fontWeight: 600
                    }}>
                    {syncing ? '⏳ Sync...' : '🔄 Sync ahora'}
                  </button>
                  <button onClick={() => setForm({ ...feed })}
                    style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #D1D5DB', background: '#fff', cursor: 'pointer', fontSize: 12 }}>
                    ✏
                  </button>
                  <button onClick={() => toggleActivo(feed)}
                    style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #D1D5DB', background: '#fff', cursor: 'pointer', fontSize: 12 }}>
                    {feed.activo ? '⏸' : '▶'}
                  </button>
                  <button onClick={() => eliminar(feed.id)}
                    style={{ padding: '6px 10px', borderRadius: 7, border: 'none', background: '#FEE2E2', color: '#991B1B', cursor: 'pointer', fontSize: 12 }}>
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Info exportación */}
      <div style={{ background: '#F9FAFB', borderRadius: 10, padding: 16, marginTop: 20, fontSize: 12, color: '#6B7280', border: '1px solid #E5E7EB' }}>
        <div style={{ fontWeight: 600, color: '#374151', marginBottom: 6 }}>📤 También podés exportar tu calendario GASP</div>
        <div>Copiá esta URL y pegála en Airbnb/Booking como "Importar calendario externo":</div>
        <div style={{ marginTop: 6, fontFamily: 'monospace', background: '#fff', padding: '6px 10px', borderRadius: 6, border: '1px solid #E5E7EB', fontSize: 11 }}>
          {typeof window !== 'undefined' ? window.location.origin : 'https://temp.administracionpinamar.com'}/api/ical-export?admin_id={session?.user?.id?.slice(0, 8)}...
        </div>
      </div>
    </div>
  )
}


function LiquidacionesTemp(props) { return <Liquidaciones {...props} /> }

function PropiedadesTemp({ data, onRefresh }) {
  const vacio = { nombre: '', localidad: 'Pinamar', tipo: 'Departamento', capacidad: '', descripcion: '', tarifa_diaria_ars: '', tarifa_diaria_usd: '', tarifa_semanal_ars: '', tarifa_semanal_usd: '', comision_pct: 10, propietario_id: '' }
  const [form, setForm] = useState(false)
  const [f, setF] = useState(vacio)
  const [editando, setEditando] = useState(null)

  function editar(p) {
    setF({ nombre: p.nombre||'', localidad: p.localidad||'Pinamar', tipo: p.tipo||'Departamento', capacidad: p.capacidad||'', descripcion: p.descripcion||'', tarifa_diaria_ars: p.tarifa_diaria_ars||'', tarifa_diaria_usd: p.tarifa_diaria_usd||'', tarifa_semanal_ars: p.tarifa_semanal_ars||'', tarifa_semanal_usd: p.tarifa_semanal_usd||'', comision_pct: p.comision_pct||10, propietario_id: p.propietario_id||'' })
    setEditando(p.id); setForm(true)
  }

  async function guardar() {
    if (!f.nombre) return alert('Complete el nombre de la propiedad')
    const adminId = (await supabase.auth.getUser()).data.user?.id
    const datos = { ...f, capacidad: Number(f.capacidad)||0, tarifa_diaria_ars: Number(f.tarifa_diaria_ars)||0, tarifa_diaria_usd: Number(f.tarifa_diaria_usd)||0, tarifa_semanal_ars: Number(f.tarifa_semanal_ars)||0, tarifa_semanal_usd: Number(f.tarifa_semanal_usd)||0, comision_pct: Number(f.comision_pct)||10 }
    if (editando) {
      const { error } = await supabase.from('propiedades').update(datos).eq('id', editando)
      if (error) return alert('Error: ' + error.message)
    } else {
      let nuevoId = nextId(data, 'PT')
      let { error } = await supabase.from('propiedades').insert([{ ...datos, id: nuevoId, activo: true, admin_id: adminId }])
      if (error && error.code === '23505') {
        nuevoId = 'PT-' + Date.now().toString(36).toUpperCase()
        const r2 = await supabase.from('propiedades').insert([{ ...datos, id: nuevoId, activo: true, admin_id: adminId }])
        error = r2.error
      }
      if (error) return alert('Error: ' + error.message)
    }
    setForm(false); setF(vacio); setEditando(null); onRefresh()
  }

  async function darBaja(p) {
    if (!window.confirm('¿Dar de baja ' + p.nombre + '?')) return
    await supabase.from('propiedades').update({ activo: false }).eq('id', p.id)
    onRefresh()
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#888' }}>{data.length} propiedades</div>
        <Btn onClick={() => { setF(vacio); setEditando(null); setForm(true) }}>+ Nueva propiedad</Btn>
      </div>
      {form && (
        <Card style={{ marginBottom: 16, border: '1px solid ' + G }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 14 }}>{editando ? 'Editar propiedad' : 'Nueva propiedad'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {!editando && <div style={{ gridColumn: 'span 2', fontSize: 11, color: '#888' }}>ID auto: {nextId(data, 'PT')}</div>}
            <Input label="Nombre / alias (ej: Depto Apolo 3A)" value={f.nombre} onChange={v => setF({...f, nombre: v})} />
            <Input label="Localidad" value={f.localidad} onChange={v => setF({...f, localidad: v})} />
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Tipo</div>
              <select value={f.tipo} onChange={e => setF({...f, tipo: e.target.value})} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                <option>Departamento</option><option>Casa</option><option>PH</option><option>Cabaña</option><option>Otro</option>
              </select>
            </div>
            <Input label="Capacidad (personas)" value={f.capacidad} onChange={v => setF({...f, capacidad: v})} type="number" />
            <Input label="Tarifa diaria $" value={f.tarifa_diaria_ars} onChange={v => setF({...f, tarifa_diaria_ars: v})} type="number" />
            <Input label="Tarifa diaria USD" value={f.tarifa_diaria_usd} onChange={v => setF({...f, tarifa_diaria_usd: v})} type="number" />
            <Input label="Tarifa semanal $" value={f.tarifa_semanal_ars} onChange={v => setF({...f, tarifa_semanal_ars: v})} type="number" />
            <Input label="Tarifa semanal USD" value={f.tarifa_semanal_usd} onChange={v => setF({...f, tarifa_semanal_usd: v})} type="number" />
            <Input label="Comisión administración %" value={f.comision_pct} onChange={v => setF({...f, comision_pct: v})} type="number" />
            <Input label="ID Propietario" value={f.propietario_id} onChange={v => setF({...f, propietario_id: v})} />
            <div style={{ gridColumn: 'span 2' }}>
              <Input label="Descripción / observaciones" value={f.descripcion} onChange={v => setF({...f, descripcion: v})} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={guardar}>{editando ? 'Guardar cambios' : 'Guardar'}</Btn>
            <BtnSec onClick={() => { setForm(false); setEditando(null) }}>Cancelar</BtnSec>
          </div>
        </Card>
      )}
      <Card>
        <Tabla
          cols={['ID', 'Nombre', 'Localidad', 'Tipo', 'Cap.', 'Tarifa día $', 'Tarifa día USD', 'Comisión', 'Acciones']}
          filas={data.map(p => [
            <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.id}</span>,
            <span style={{ fontWeight: 'bold' }}>{p.nombre}</span>,
            p.localidad,
            p.tipo,
            p.capacidad + ' p.',
            fmt(p.tarifa_diaria_ars),
            fmtUSD(p.tarifa_diaria_usd),
            p.comision_pct + '%',
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => editar(p)} style={{ padding: '3px 8px', borderRadius: 5, background: W, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✏ Editar</button>
              <button onClick={() => darBaja(p)} style={{ padding: '3px 8px', borderRadius: 5, background: D, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✗ Baja</button>
            </div>
          ])}
        />
      </Card>
    </>
  )
}

// ─── MÓDULO PROPIETARIOS ─────────────────────────────────
function PropietariosTemp({ data, onRefresh }) {
  const vacio = { apellido_nombre: '', dni_cuit: '', telefono: '', email: '', cbu: '', banco: '', ciudad_residencia: '' }
  const [form, setForm] = useState(false)
  const [f, setF] = useState(vacio)
  const [editando, setEditando] = useState(null)

  function editar(p) { setF({ apellido_nombre: p.apellido_nombre||'', dni_cuit: p.dni_cuit||'', telefono: p.telefono||'', email: p.email||'', cbu: p.cbu||'', banco: p.banco||'', ciudad_residencia: p.ciudad_residencia||'' }); setEditando(p.id); setForm(true) }

  async function guardar() {
    if (!f.apellido_nombre) return alert('Complete apellido y nombre')
    const adminId = (await supabase.auth.getUser()).data.user?.id
    if (editando) {
      const { error } = await supabase.from('propietarios').update(f).eq('id', editando)
      if (error) return alert('Error: ' + error.message)
    } else {
      let nuevoId = nextId(data, 'PO')
      let { error } = await supabase.from('propietarios').insert([{ ...f, id: nuevoId, activo: true, admin_id: adminId }])
      if (error && error.code === '23505') {
        nuevoId = 'PO-' + Date.now().toString(36).toUpperCase()
        const r2 = await supabase.from('propietarios').insert([{ ...f, id: nuevoId, activo: true, admin_id: adminId }])
        error = r2.error
      }
      if (error) return alert('Error: ' + error.message)
    }
    setForm(false); setF(vacio); setEditando(null); onRefresh()
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#888' }}>{data.length} propietarios</div>
        <Btn onClick={() => { setF(vacio); setEditando(null); setForm(true) }}>+ Nuevo propietario</Btn>
      </div>
      {form && (
        <Card style={{ marginBottom: 16, border: '1px solid ' + G }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 14 }}>{editando ? 'Editar' : 'Nuevo propietario'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {!editando && <div style={{ gridColumn: 'span 2', fontSize: 11, color: '#888' }}>ID auto: {nextId(data, 'PO')}</div>}
            <Input label="Apellido y nombre" value={f.apellido_nombre} onChange={v => setF({...f, apellido_nombre: v})} />
            <Input label="DNI / CUIT" value={f.dni_cuit} onChange={v => setF({...f, dni_cuit: v})} />
            <Input label="Teléfono" value={f.telefono} onChange={v => setF({...f, telefono: v})} />
            <Input label="Email" value={f.email} onChange={v => setF({...f, email: v})} />
            <Input label="CBU" value={f.cbu} onChange={v => setF({...f, cbu: v})} />
            <Input label="Banco" value={f.banco} onChange={v => setF({...f, banco: v})} />
            <Input label="Ciudad de residencia" value={f.ciudad_residencia} onChange={v => setF({...f, ciudad_residencia: v})} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={guardar}>{editando ? 'Guardar cambios' : 'Guardar'}</Btn>
            <BtnSec onClick={() => { setForm(false); setEditando(null) }}>Cancelar</BtnSec>
          </div>
        </Card>
      )}
      <Card>
        <Tabla
          cols={['ID', 'Nombre', 'DNI/CUIT', 'Teléfono', 'Email', 'Ciudad', 'Banco', 'Acciones']}
          filas={data.map(p => [
            <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.id}</span>,
            <span style={{ fontWeight: 'bold' }}>{p.apellido_nombre}</span>,
            p.dni_cuit||'—', p.telefono||'—', p.email||'—', p.ciudad_residencia||'—', p.banco||'—',
            <button onClick={() => editar(p)} style={{ padding: '3px 8px', borderRadius: 5, background: W, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✏ Editar</button>
          ])}
        />
      </Card>
    </>
  )
}



const ITEMS_DEFAULT = [
  'Aspirar y limpiar pisos',
  'Limpiar baños',
  'Cambiar ropa de cama',
  'Limpiar cocina',
  'Lavar vajilla',
  'Limpiar electrodomésticos',
  'Limpiar vidrios',
  'Sacar basura',
  'Revisar inventario',
  'Reportar daños',
  'Dejar llaves disponibles',
]

function Clientes({ session }) {
  const [tab, setTab] = useState('dashboard')
  const [demoForm, setDemoForm] = useState({ nombre: '', email: '', password: '' })
  const [demoCreando, setDemoCreando] = useState(false)
  const [demosLista, setDemosLista] = useState([])
  const [demosLoading, setDemosLoading] = useState(false)
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(null)      // 'nuevo_cliente' | 'registrar_pago' | 'mensajes'
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const EF_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gestionar-clientes-gasp`

  async function cargarDemos() {
    setDemosLoading(true)
    try {
      const { data } = await supabase.from('usuarios_demo').select('*').order('fecha_expiracion', { ascending: false })
      setDemosLista(data || [])
    } catch(e) { console.error(e) }
    setDemosLoading(false)
  }

  async function crearDemo() {
    if (!demoForm.nombre || !demoForm.email || !demoForm.password)
      return setMsg({ tipo:'error', texto:'Completá nombre, email y contraseña' })
    setDemoCreando(true); setMsg(null)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/crear-demo-completa`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify(demoForm)
        }
      )
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Error al crear demo')
      setMsg({ tipo:'ok', texto: `✅ Demo creada: ${demoForm.email} — ${data.mensaje}` })
      setDemoForm({ nombre: '', email: '', password: '' })
      cargarDemos()
    } catch(e) { setMsg({ tipo:'error', texto: e.message }) }
    setDemoCreando(false)
  }

  async function desactivarDemo(adminId, email) {
    if (!confirm(`¿Desactivar la demo de ${email}?`)) return
    await supabase.from('usuarios_demo').update({ activo: false }).eq('admin_id', adminId)
    cargarDemos()
    setMsg({ tipo:'ok', texto: `Demo ${email} desactivada` })
  }

  async function llamarEF(accion, body = {}) {
    const res = await fetch(EF_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ accion, ...body })
    })
    const data = await res.json()
    if (!data.ok) throw new Error(data.error || 'Error desconocido')
    return data
  }

  async function cargar() {
    setCargando(true)
    try {
      const data = await llamarEF('dashboard')
      setDatos(data)
    } catch(e) { setMsg({ tipo:'error', texto: e.message }) }
    setCargando(false)
  }

  useEffect(() => { cargar(); cargarDemos() }, [])

  async function crearCliente() {
    if (!form.nombre || !form.email || !form.plan) return setMsg({ tipo:'error', texto:'Nombre, email y plan son requeridos' })
    setSaving(true)
    try {
      const r = await llamarEF('crear', form)
      setMsg({ tipo:'ok', texto: r.mensaje })
      setModal(null); setForm({})
      cargar()
    } catch(e) { setMsg({ tipo:'error', texto: e.message }) }
    setSaving(false)
  }

  async function registrarPago() {
    if (!clienteSeleccionado) return
    setSaving(true)
    try {
      const r = await llamarEF('registrar_pago', { cliente_id: clienteSeleccionado.id, ...form })
      setMsg({ tipo:'ok', texto: r.mensaje })
      setModal(null); setForm({})
      cargar()
    } catch(e) { setMsg({ tipo:'error', texto: e.message }) }
    setSaving(false)
  }

  async function accion(act, cliente, extra = {}) {
    setSaving(true)
    try {
      const r = await llamarEF(act, { cliente_id: cliente.id, ...extra })
      setMsg({ tipo:'ok', texto: r.mensaje || 'OK' })
      cargar()
    } catch(e) { setMsg({ tipo:'error', texto: e.message }) }
    setSaving(false)
  }

  async function marcarEnviado(id) {
    await llamarEF('marcar_enviado', { comunicacion_id: id })
    cargar()
  }

  const PLANES = [
    { value:'mensual_anual',  label:'Mensual - GASP Anual (USD 25/mes)' },
    { value:'mensual_temp',   label:'Mensual - GASP Temporario (USD 25/mes)' },
    { value:'mensual_inmo',   label:'Mensual - GASP Inmo (USD 25/mes)' },
    { value:'mensual_full',   label:'Mensual - GASP Full / 3 sistemas (USD 35/mes)' },
    { value:'anual_anual',    label:'Anual - GASP Anual (USD 240/año)' },
    { value:'anual_temp',     label:'Anual - GASP Temporario (USD 240/año)' },
    { value:'anual_inmo',     label:'Anual - GASP Inmo (USD 240/año)' },
    { value:'anual_full',     label:'Anual - GASP Full / 3 sistemas (USD 350/año)' },
  ]

  const ESTADO_COLOR = { activo:'#166534', por_vencer:'#92400E', vencido:'#991B1B', suspendido:'#374151', trial:'#1A3FA0', cancelado:'#6B7280' }
  const ESTADO_BG    = { activo:'#D1FAE5', por_vencer:'#FEF3C7', vencido:'#FEE2E2', suspendido:'#F3F4F6', trial:'#DBEAFE', cancelado:'#F3F4F6' }
  const ESTADO_LABEL = { activo:'✅ Activo', por_vencer:'⚠️ Por vencer', vencido:'🔴 Vencido', suspendido:'⛔ Suspendido', trial:'🔵 Trial', cancelado:'⬜ Cancelado' }

  if (cargando) return <div style={{ padding:40, textAlign:'center', color:'#6B7280' }}>Cargando Clientes GASP...</div>

  const stats = datos?.stats || {}
  const clientes = datos?.clientes || []
  const pagosRecientes = datos?.pagos_recientes || []

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:700, margin:0 }}>🏢 Clientes GASP</h2>
          <p style={{ fontSize:13, color:'#6B7280', margin:'4px 0 0' }}>Cobranza y suscripciones</p>
        </div>
        <button onClick={() => { setModal('nuevo_cliente'); setForm({}) }}
          style={{ padding:'9px 18px', borderRadius:8, background:'#1A3FA0', color:'#fff', border:'none', cursor:'pointer', fontSize:13, fontWeight:600 }}>
          + Nuevo cliente
        </button>
      </div>

      {msg && (
        <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:16, fontSize:13,
          background: msg.tipo==='ok' ? '#D1FAE5' : '#FEE2E2',
          color: msg.tipo==='ok' ? '#166534' : '#991B1B' }}
          onClick={() => setMsg(null)}>
          {msg.texto}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'2px solid #E5E7EB' }}>
        {[['dashboard','📊 Dashboard'],['demos','🚀 Demos'],['clientes','👥 Clientes'],['pagos','💰 Pagos'],['avisos','🔔 Avisos']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:'8px 16px', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background:'none',
              borderBottom: tab===t ? '2px solid #1A3FA0' : '2px solid transparent',
              color: tab===t ? '#1A3FA0' : '#6B7280', marginBottom:-2 }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ──────────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <div>
          {/* KPIs */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
            {[
              { label:'Clientes activos', value: stats.activos || 0, color:'#166534', bg:'#D1FAE5', icon:'✅' },
              { label:'Por vencer / Vencidos', value: `${stats.por_vencer||0} / ${stats.vencidos||0}`, color:'#92400E', bg:'#FEF3C7', icon:'⚠️' },
              { label:'Suspendidos', value: stats.suspendidos || 0, color:'#991B1B', bg:'#FEE2E2', icon:'⛔' },
              { label:'Ingreso est. mensual', value: `USD ${Math.round(stats.ingreso_mensual_usd||0)}`, color:'#1A3FA0', bg:'#DBEAFE', icon:'💵' },
            ].map((k,i) => (
              <div key={i} style={{ background:k.bg, borderRadius:10, padding:16 }}>
                <div style={{ fontSize:20 }}>{k.icon}</div>
                <div style={{ fontSize:22, fontWeight:800, color:k.color, marginTop:4 }}>{k.value}</div>
                <div style={{ fontSize:12, color:'#6B7280', marginTop:4 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Alertas urgentes */}
          {(stats.vencidos > 0 || stats.suspendidos > 0 || stats.mensajes_pendientes > 0) && (
            <div style={{ background:'#FEF3C7', border:'1px solid #F59E0B', borderRadius:10, padding:14, marginBottom:20, fontSize:13 }}>
              <div style={{ fontWeight:700, color:'#92400E', marginBottom:8 }}>⚠️ Atención requerida</div>
              {stats.vencidos > 0 && <div style={{ color:'#92400E' }}>🔴 {stats.vencidos} cliente{stats.vencidos>1?'s':''} con suscripción vencida — confirmar pago o suspender</div>}
              {stats.suspendidos > 0 && <div style={{ color:'#991B1B' }}>⛔ {stats.suspendidos} cliente{stats.suspendidos>1?'s':''} suspendido{stats.suspendidos>1?'s':''}</div>}
              {stats.mensajes_pendientes > 0 && <div style={{ color:'#1A3FA0' }}>🔔 {stats.mensajes_pendientes} mensaje{stats.mensajes_pendientes>1?'s':''} pendiente{stats.mensajes_pendientes>1?'s':''} de enviar → <button onClick={() => setTab('avisos')} style={{ background:'none', border:'none', cursor:'pointer', color:'#1A3FA0', fontWeight:700, textDecoration:'underline', fontSize:13 }}>Ver avisos</button></div>}
            </div>
          )}

          {/* Últimos pagos */}
          <div style={{ background:'#fff', borderRadius:10, border:'1px solid #E5E7EB', padding:16 }}>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:12 }}>💰 Últimos pagos recibidos</div>
            {pagosRecientes.length === 0 ? (
              <div style={{ color:'#9CA3AF', fontSize:13 }}>Sin pagos registrados aún</div>
            ) : (
              <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#F9FAFB' }}>
                    {['ID','Cliente','Fecha','Importe','Medio','Período hasta'].map(h => (
                      <th key={h} style={{ padding:'6px 10px', textAlign:'left', color:'#6B7280', fontWeight:600, fontSize:12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagosRecientes.slice(0,10).map(p => {
                    const cl = clientes.find(c => c.id === p.cliente_id)
                    return (
                      <tr key={p.id} style={{ borderBottom:'1px solid #F3F4F6' }}>
                        <td style={{ padding:'7px 10px', color:'#9CA3AF' }}>{p.id}</td>
                        <td style={{ padding:'7px 10px', fontWeight:600 }}>{cl?.nombre || p.cliente_id}</td>
                        <td style={{ padding:'7px 10px' }}>{p.fecha_pago}</td>
                        <td style={{ padding:'7px 10px', fontWeight:700, color:'#166534' }}>{p.moneda} {p.importe}</td>
                        <td style={{ padding:'7px 10px', color:'#6B7280' }}>{p.medio_pago}</td>
                        <td style={{ padding:'7px 10px' }}>{p.periodo_hasta}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── CLIENTES ──────────────────────────────────────────── */}
      {/* ── DEMOS ──────────────────────────────────────────── */}
      {tab === 'demos' && (
        <div>
          {/* Formulario nueva demo */}
          <div style={{ background:'#F5F3FF', border:'1px solid #DDD6FE', borderRadius:10, padding:20, marginBottom:20 }}>
            <div style={{ fontWeight:700, fontSize:14, color:'#7C3AED', marginBottom:14 }}>🚀 Nueva Demo — 14 días completa (Anual + Temporario + Inmo)</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
              <div>
                <div style={{ fontSize:12, color:'#6B7280', marginBottom:4 }}>Nombre</div>
                <input value={demoForm.nombre} onChange={e => setDemoForm(v=>({...v,nombre:e.target.value}))}
                  placeholder="Nombre del usuario"
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid #D1D5DB', borderRadius:8, fontSize:13, boxSizing:'border-box' }} />
              </div>
              <div>
                <div style={{ fontSize:12, color:'#6B7280', marginBottom:4 }}>Email *</div>
                <input value={demoForm.email} onChange={e => setDemoForm(v=>({...v,email:e.target.value}))}
                  placeholder="email@ejemplo.com" type="email"
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid #D1D5DB', borderRadius:8, fontSize:13, boxSizing:'border-box' }} />
              </div>
              <div>
                <div style={{ fontSize:12, color:'#6B7280', marginBottom:4 }}>Contraseña *</div>
                <input value={demoForm.password} onChange={e => setDemoForm(v=>({...v,password:e.target.value}))}
                  placeholder="Mínimo 6 caracteres" type="password"
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid #D1D5DB', borderRadius:8, fontSize:13, boxSizing:'border-box' }} />
              </div>
            </div>
            <button onClick={crearDemo} disabled={demoCreando}
              style={{ padding:'10px 24px', borderRadius:8, background: demoCreando ? '#9CA3AF' : '#7C3AED', color:'#fff', border:'none', cursor: demoCreando ? 'not-allowed' : 'pointer', fontSize:13, fontWeight:700 }}>
              {demoCreando ? '⏳ Creando...' : '✅ Crear Demo Completa'}
            </button>
            <div style={{ fontSize:11, color:'#9CA3AF', marginTop:8 }}>
              Se carga automáticamente: Anual (4 prop. + 4 inq. + 3 contratos) · Temp (4 prop. + 7 reservas) · Inmo (3 tasaciones + 3 leads)
            </div>
          </div>

          {/* Lista de demos activas */}
          <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, padding:16 }}>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:12 }}>👥 Demos activas ({demosLista.filter(d=>d.activo).length})</div>
            {demosLoading ? (
              <div style={{ color:'#9CA3AF', fontSize:13 }}>Cargando...</div>
            ) : demosLista.length === 0 ? (
              <div style={{ color:'#9CA3AF', fontSize:13, textAlign:'center', padding:20 }}>Sin demos creadas aún</div>
            ) : (
              <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#F9FAFB' }}>
                    {['Nombre','Email','Expira','Estado','Acciones'].map(h => (
                      <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:'#6B7280', fontWeight:600, fontSize:12, borderBottom:'1px solid #E5E7EB' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {demosLista.map(d => {
                    const vencida = new Date(d.fecha_expiracion) < new Date()
                    const diasRestantes = Math.ceil((new Date(d.fecha_expiracion) - new Date()) / 86400000)
                    return (
                      <tr key={d.admin_id} style={{ borderBottom:'1px solid #F3F4F6' }}>
                        <td style={{ padding:'9px 12px', fontWeight:600 }}>{d.nombre}</td>
                        <td style={{ padding:'9px 12px', color:'#6B7280' }}>{d.email}</td>
                        <td style={{ padding:'9px 12px', fontSize:12 }}>
                          {new Date(d.fecha_expiracion).toLocaleDateString('es-AR')}
                          <span style={{ marginLeft:6, fontSize:11,
                            color: vencida ? '#991B1B' : diasRestantes <= 3 ? '#92400E' : '#166534',
                            fontWeight:600 }}>
                            {vencida ? '⛔ Vencida' : `(${diasRestantes}d)`}
                          </span>
                        </td>
                        <td style={{ padding:'9px 12px' }}>
                          <span style={{ padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600,
                            background: d.activo && !vencida ? '#D1FAE5' : '#FEE2E2',
                            color: d.activo && !vencida ? '#166534' : '#991B1B' }}>
                            {d.activo && !vencida ? '✅ Activa' : '❌ Inactiva'}
                          </span>
                        </td>
                        <td style={{ padding:'9px 12px' }}>
                          <div style={{ display:'flex', gap:6 }}>
                            {d.activo && (
                              <button onClick={() => desactivarDemo(d.admin_id, d.email)}
                                style={{ padding:'4px 10px', borderRadius:6, background:'#FEE2E2', color:'#991B1B', border:'none', cursor:'pointer', fontSize:12 }}>
                                🗑️ Desactivar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'clientes' && (
        <div>
          {clientes.length === 0 ? (
            <div style={{ textAlign:'center', padding:60, color:'#9CA3AF' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>👥</div>
              <div style={{ fontSize:16, fontWeight:600 }}>Sin clientes aún</div>
              <div style={{ fontSize:13, marginTop:6 }}>Creá el primer cliente con el botón "+ Nuevo cliente"</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {clientes.filter(c => c.estado !== 'cancelado').map(cl => (
                <div key={cl.id} style={{ background:'#fff', borderRadius:10, border:'1px solid #E5E7EB', padding:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                        <span style={{ fontWeight:700, fontSize:15 }}>{cl.nombre}</span>
                        <span style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:600,
                          background: ESTADO_BG[cl.estado] || '#F3F4F6',
                          color: ESTADO_COLOR[cl.estado] || '#374151' }}>
                          {ESTADO_LABEL[cl.estado] || cl.estado}
                        </span>
                      </div>
                      <div style={{ display:'flex', gap:20, fontSize:12, color:'#6B7280', flexWrap:'wrap' }}>
                        <span>📧 {cl.email}</span>
                        {cl.telefono && <span>📱 {cl.telefono}</span>}
                        <span>💳 USD {cl.precio_usd}/{cl.periodicidad === 'anual' ? 'año' : 'mes'}</span>
                        <span>📅 Vto: <strong style={{ color: cl.fecha_proximo_vto < new Date().toISOString().split('T')[0] ? '#991B1B' : '#374151' }}>{cl.fecha_proximo_vto}</strong></span>
                        <span>🖥️ {(cl.sistemas||[]).join(', ')}</span>
                      </div>
                      {cl.notas && <div style={{ fontSize:12, color:'#9CA3AF', marginTop:4 }}>📝 {cl.notas}</div>}
                    </div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      <button onClick={() => { setClienteSeleccionado(cl); setForm({ importe: cl.precio_usd, moneda: cl.moneda_cobro }); setModal('registrar_pago') }}
                        style={{ padding:'6px 12px', borderRadius:7, background:'#166534', color:'#fff', border:'none', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                        💰 Pago
                      </button>
                      {cl.estado === 'suspendido' ? (
                        <button onClick={() => accion('reactivar', cl, { dias: cl.periodicidad==='anual' ? 365 : 30 })}
                          style={{ padding:'6px 12px', borderRadius:7, background:'#1A3FA0', color:'#fff', border:'none', cursor:'pointer', fontSize:12 }}>
                          ✅ Reactivar
                        </button>
                      ) : (
                        <button onClick={() => { if(confirm(`¿Suspender a ${cl.nombre}?`)) accion('suspender', cl, { motivo:'Suspensión manual' }) }}
                          style={{ padding:'6px 12px', borderRadius:7, background:'#F3F4F6', color:'#374151', border:'1px solid #D1D5DB', cursor:'pointer', fontSize:12 }}>
                          ⛔ Suspender
                        </button>
                      )}
                      <button onClick={() => { if(confirm(`¿Dar de baja a ${cl.nombre}?`)) accion('dar_baja', cl, { motivo:'Baja solicitada' }) }}
                        style={{ padding:'6px 12px', borderRadius:7, background:'#FEE2E2', color:'#991B1B', border:'1px solid #FECACA', cursor:'pointer', fontSize:12 }}>
                        🗑️ Baja
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PAGOS ──────────────────────────────────────────────── */}
      {tab === 'pagos' && (
        <div style={{ background:'#fff', borderRadius:10, border:'1px solid #E5E7EB', overflow:'hidden' }}>
          {pagosRecientes.length === 0 ? (
            <div style={{ padding:40, textAlign:'center', color:'#9CA3AF' }}>Sin pagos registrados</div>
          ) : (
            <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#F9FAFB' }}>
                  {['ID','Cliente','Fecha pago','Importe','Moneda','Medio de pago','Período','Comprobante'].map(h => (
                    <th key={h} style={{ padding:'10px 12px', textAlign:'left', color:'#6B7280', fontWeight:600, fontSize:12, borderBottom:'1px solid #E5E7EB' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagosRecientes.map(p => {
                  const cl = clientes.find(c => c.id === p.cliente_id)
                  return (
                    <tr key={p.id} style={{ borderBottom:'1px solid #F3F4F6' }}>
                      <td style={{ padding:'9px 12px', color:'#9CA3AF', fontSize:12 }}>{p.id}</td>
                      <td style={{ padding:'9px 12px', fontWeight:600 }}>{cl?.nombre || p.cliente_id}</td>
                      <td style={{ padding:'9px 12px' }}>{p.fecha_pago}</td>
                      <td style={{ padding:'9px 12px', fontWeight:700, color:'#166534' }}>{p.importe}</td>
                      <td style={{ padding:'9px 12px' }}>{p.moneda}</td>
                      <td style={{ padding:'9px 12px' }}>{p.medio_pago}</td>
                      <td style={{ padding:'9px 12px', fontSize:12, color:'#6B7280' }}>{p.periodo_desde} → {p.periodo_hasta}</td>
                      <td style={{ padding:'9px 12px', fontSize:12, color:'#6B7280' }}>{p.comprobante || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── AVISOS ─────────────────────────────────────────────── */}
      {tab === 'avisos' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ fontSize:14, color:'#6B7280' }}>
              Mensajes generados automáticamente por el sistema. Copiá el texto y envialo por WhatsApp o email.
            </div>
            <button onClick={() => llamarEF('verificar_vencimientos').then(() => cargar())}
              style={{ padding:'8px 16px', borderRadius:8, background:'#1A3FA0', color:'#fff', border:'none', cursor:'pointer', fontSize:13 }}>
              🔄 Verificar vencimientos ahora
            </button>
          </div>
          {(datos?.clientes || []).length === 0 ? (
            <div style={{ textAlign:'center', padding:40, color:'#9CA3AF' }}>Sin mensajes pendientes</div>
          ) : (
            <AvisosPendientes session={session} EF_URL={EF_URL} onRefresh={cargar} />
          )}
        </div>
      )}

      {/* ── MODAL: NUEVO CLIENTE ────────────────────────────────── */}
      {modal === 'nuevo_cliente' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, width:480, maxWidth:'95vw', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 8px 40px #0006' }}>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:20 }}>➕ Nuevo Cliente GASP</div>
            {[
              { key:'nombre',    label:'Nombre completo *',   type:'text' },
              { key:'email',     label:'Email *',              type:'email' },
              { key:'telefono',  label:'Teléfono WhatsApp',   type:'text' },
              { key:'localidad', label:'Localidad',            type:'text' },
              { key:'cbu_alias', label:'CBU/Alias del cliente', type:'text' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:12 }}>
                <div style={{ fontSize:12, color:'#6B7280', marginBottom:4 }}>{f.label}</div>
                <input value={form[f.key]||''} onChange={e => setForm(v=>({...v,[f.key]:e.target.value}))} type={f.type}
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid #D1D5DB', borderRadius:8, fontSize:14, boxSizing:'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:12, color:'#6B7280', marginBottom:4 }}>Plan *</div>
              <select value={form.plan||''} onChange={e => setForm(v=>({...v,plan:e.target.value}))}
                style={{ width:'100%', padding:'9px 12px', border:'1px solid #D1D5DB', borderRadius:8, fontSize:14 }}>
                <option value="">— Seleccionar plan —</option>
                {PLANES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:12, color:'#6B7280', marginBottom:4 }}>Moneda de cobro</div>
              <select value={form.moneda_cobro||'USD'} onChange={e => setForm(v=>({...v,moneda_cobro:e.target.value}))}
                style={{ width:'100%', padding:'9px 12px', border:'1px solid #D1D5DB', borderRadius:8, fontSize:14 }}>
                <option value="USD">USD (dólares)</option>
                <option value="ARS">ARS (pesos)</option>
              </select>
            </div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, color:'#6B7280', marginBottom:4 }}>Notas</div>
              <textarea value={form.notas||''} onChange={e => setForm(v=>({...v,notas:e.target.value}))} rows={2}
                style={{ width:'100%', padding:'9px 12px', border:'1px solid #D1D5DB', borderRadius:8, fontSize:14, resize:'vertical', boxSizing:'border-box' }} />
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => { setModal(null); setForm({}) }}
                style={{ padding:'9px 20px', borderRadius:8, border:'1px solid #D1D5DB', background:'#fff', cursor:'pointer', fontSize:14 }}>Cancelar</button>
              <button onClick={crearCliente} disabled={saving}
                style={{ padding:'9px 20px', borderRadius:8, background:'#1A3FA0', color:'#fff', border:'none', cursor:'pointer', fontSize:14, fontWeight:600 }}>
                {saving ? 'Creando...' : '✅ Crear cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: REGISTRAR PAGO ───────────────────────────────── */}
      {modal === 'registrar_pago' && clienteSeleccionado && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, width:440, maxWidth:'95vw', boxShadow:'0 8px 40px #0006' }}>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>💰 Registrar pago</div>
            <div style={{ fontSize:13, color:'#6B7280', marginBottom:20 }}>{clienteSeleccionado.nombre} — {clienteSeleccionado.plan}</div>
            {[
              { key:'importe',     label:'Importe *',     type:'number' },
              { key:'comprobante', label:'Nro. comprobante / Transferencia', type:'text' },
              { key:'notas',       label:'Notas', type:'text' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:12 }}>
                <div style={{ fontSize:12, color:'#6B7280', marginBottom:4 }}>{f.label}</div>
                <input value={form[f.key]||''} onChange={e => setForm(v=>({...v,[f.key]:e.target.value}))} type={f.type}
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid #D1D5DB', borderRadius:8, fontSize:14, boxSizing:'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:12, color:'#6B7280', marginBottom:4 }}>Moneda</div>
              <select value={form.moneda||clienteSeleccionado.moneda_cobro||'USD'} onChange={e => setForm(v=>({...v,moneda:e.target.value}))}
                style={{ width:'100%', padding:'9px 12px', border:'1px solid #D1D5DB', borderRadius:8, fontSize:14 }}>
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, color:'#6B7280', marginBottom:4 }}>Medio de pago</div>
              <select value={form.medio_pago||'transferencia'} onChange={e => setForm(v=>({...v,medio_pago:e.target.value}))}
                style={{ width:'100%', padding:'9px 12px', border:'1px solid #D1D5DB', borderRadius:8, fontSize:14 }}>
                <option value="transferencia">Transferencia bancaria</option>
                <option value="mercadopago">Mercado Pago</option>
                <option value="efectivo">Efectivo</option>
                <option value="crypto">Crypto (USDT)</option>
              </select>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => { setModal(null); setForm({}) }}
                style={{ padding:'9px 20px', borderRadius:8, border:'1px solid #D1D5DB', background:'#fff', cursor:'pointer', fontSize:14 }}>Cancelar</button>
              <button onClick={registrarPago} disabled={saving}
                style={{ padding:'9px 20px', borderRadius:8, background:'#166534', color:'#fff', border:'none', cursor:'pointer', fontSize:14, fontWeight:600 }}>
                {saving ? 'Guardando...' : '✅ Registrar pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AvisosPendientes({ session, EF_URL, onRefresh }) {
  const [mensajes, setMensajes] = useState([])
  const [cargando, setCargando] = useState(true)

  async function cargar() {
    setCargando(true)
    try {
      const res = await fetch(EF_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ accion: 'mensajes_pendientes' })
      })
      const data = await res.json()
      setMensajes(data.mensajes || [])
    } catch {}
    setCargando(false)
  }

  async function marcar(id) {
    await fetch(EF_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ accion: 'marcar_enviado', comunicacion_id: id })
    })
    cargar(); onRefresh()
  }

  useEffect(() => { cargar() }, [])

  if (cargando) return <div style={{ padding:20, color:'#6B7280' }}>Cargando avisos...</div>
  if (mensajes.length === 0) return (
    <div style={{ textAlign:'center', padding:40, color:'#9CA3AF' }}>
      <div style={{ fontSize:32, marginBottom:8 }}>✅</div>
      <div>Sin mensajes pendientes de envío</div>
    </div>
  )

  const TIPO_COLOR = { aviso_vto_7dias:'#92400E', aviso_mora:'#991B1B', aviso_suspension:'#374151', pago_recibido:'#166534', reactivacion:'#1A3FA0', bienvenida:'#1A3FA0' }
  const TIPO_BG    = { aviso_vto_7dias:'#FEF3C7', aviso_mora:'#FEE2E2', aviso_suspension:'#F3F4F6', pago_recibido:'#D1FAE5', reactivacion:'#DBEAFE', bienvenida:'#DBEAFE' }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {mensajes.map(m => (
        <div key={m.id} style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, padding:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <span style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:600,
                  background: TIPO_BG[m.tipo] || '#F3F4F6',
                  color: TIPO_COLOR[m.tipo] || '#374151' }}>
                  {m.tipo.replace(/_/g,' ').toUpperCase()}
                </span>
                <span style={{ fontSize:12, fontWeight:700 }}>{m.gasp_clientes?.nombre}</span>
                {m.gasp_clientes?.telefono && (
                  <a href={`https://wa.me/54${m.gasp_clientes.telefono.replace(/\D/g,'')}?text=${encodeURIComponent(m.mensaje)}`}
                    target="_blank" rel="noopener"
                    style={{ fontSize:12, color:'#25D366', fontWeight:600, textDecoration:'none' }}>
                    📱 Abrir WhatsApp
                  </a>
                )}
              </div>
              <div style={{ fontSize:12, color:'#6B7280' }}>
                {m.gasp_clientes?.telefono} · {m.gasp_clientes?.email}
              </div>
            </div>
            <button onClick={() => marcar(m.id)}
              style={{ padding:'6px 14px', borderRadius:7, background:'#166534', color:'#fff', border:'none', cursor:'pointer', fontSize:12, fontWeight:600, flexShrink:0 }}>
              ✅ Enviado
            </button>
          </div>
          <div style={{ background:'#F9FAFB', borderRadius:8, padding:'10px 12px', fontSize:13, fontFamily:'monospace', lineHeight:1.5, cursor:'pointer', border:'1px solid #E5E7EB' }}
            onClick={() => navigator.clipboard?.writeText(m.mensaje)}
            title="Clic para copiar">
            {m.mensaje}
            <div style={{ fontSize:11, color:'#9CA3AF', marginTop:6 }}>📋 Clic para copiar</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState('loading')
  const [isMobile, setIsMobile] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [pagina, setPagina] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [reservas, setReservas] = useState([])
  const [propiedades, setPropiedades] = useState([])
  const [propietarios, setPropietarios] = useState([])
  const [gastos, setGastos] = useState([])
  const [perfil, setPerfil] = useState({})
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  const adminId = session?.user?.id || null
  const esSuperAdmin = session?.user?.email === SUPERADMIN_EMAIL

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 769)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session || null)
      if (data?.session) cargar()
      else setLoading(false)
    }).catch(() => { setSession(null); setLoading(false) })
  }, [])

  async function cargar() {
    setLoading(true)
    try {
      const uid = (await supabase.auth.getUser()).data.user?.id
      if (!uid) { setLoading(false); return }
      const [r1, r2, r3, r4, r5] = await Promise.all([
        supabase.from('reservas_temp').select('*').eq('admin_id', uid).order('fecha_entrada', { ascending: false }),
        supabase.from('prop_temp').select('*').eq('admin_id', uid).eq('activo', true),
        supabase.from('prop_owners_temp').select('*').eq('admin_id', uid).eq('activo', true),
        supabase.from('gastos').select('*').eq('admin_id', uid).order('fecha_comprobante', { ascending: false }),
        supabase.from('full_perfil_admin').select('*').eq('admin_id', uid).maybeSingle(),
      ])
      setReservas(r1.data || [])
      setPropiedades(r2.data || [])
      setPropietarios(r3.data || [])
      setGastos(r4.data || [])
      setPerfil(r5.data || {})
    } catch (e) { console.error('cargar:', e) }
    setLoading(false)
  }

  async function login(e) {
    e.preventDefault()
    setLoginLoading(true); setLoginError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setLoginError('Email o contraseña incorrectos'); setLoginLoading(false) }
    else {
      const { data } = await supabase.auth.getSession()
      setSession(data?.session || null)
      if (data?.session) cargar()
    }
  }

  const BG_SIDEBAR = '#111D13'
  const ACCENT = '#1B6B35'

  const NAV_BASE = [
    { id: 'dashboard',      label: '📊 Panel principal',   seccion: 'Principal' },
    { id: 'calendario',     label: '📅 Calendario',          seccion: 'Principal' },
    { id: 'reservas',       label: '🏖 Reservas',            seccion: 'Gestión' },
    { id: 'solicitudes',    label: '📩 Solicitudes',         seccion: 'Gestión' },
    { id: 'propiedades',    label: '🏠 Propiedades',         seccion: 'Gestión' },
    { id: 'propietarios',   label: '👤 Propietarios',        seccion: 'Gestión' },
    { id: 'contratos',      label: '📋 Contratos',           seccion: 'Gestión' },
    { id: 'cobranzas',      label: '💳 Cobranzas',           seccion: 'Gestión' },
    { id: 'gastos',         label: '🧾 Gastos',              seccion: 'Gestión' },
    { id: 'checklist',      label: '✅ Checklist',            seccion: 'Gestión' },
    { id: 'notificaciones', label: '🔔 Notificaciones',      seccion: 'Gestión' },
    { id: 'limpieza',       label: '🧹 Limpieza',            seccion: 'Gestión' },
    { id: 'liquidaciones',  label: '📑 Liquidaciones',       seccion: 'Reportes' },
    { id: 'caja',           label: '💵 Caja',                seccion: 'Reportes' },
    { id: 'temporadas',     label: '📆 Temporadas',          seccion: 'Config.' },
    { id: 'ical',           label: '🔄 iCal Sync',           seccion: 'Config.' },
    { id: 'mi_perfil',      label: '⚙️ Mi perfil',           seccion: 'Admin' },
  ]
  const NAV_DINAMICO = [
    ...NAV_BASE,
    ...(esSuperAdmin ? [{ id: 'clientes', label: '🏢 Clientes GASP', seccion: 'Admin' }] : [])
  ]
  const secciones = [...new Set(NAV_DINAMICO.map(n => n.seccion || n.sec).filter(Boolean))]

  if (session === 'loading') return (
    <div style={{ minHeight:'100vh', background:BG_SIDEBAR, display:'flex', alignItems:'center', justifyContent:'center', color:'#5A8A65', fontFamily:'Arial', fontSize:14 }}>
      Cargando GASP Temporario...
    </div>
  )

  if (!session) return (
    <div style={{ minHeight:'100vh', background:BG_SIDEBAR, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Arial' }}>
      <Head><title>GASP Temporario</title></Head>
      <div style={{ background:'#fff', borderRadius:14, padding:36, width:340, boxShadow:'0 8px 40px #0006' }}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:28, fontWeight:800, color:ACCENT }}>GASP</div>
          <div style={{ fontSize:13, color:'#6B7280' }}>🏖 Alquileres Temporarios</div>
        </div>
        {loginError && <div style={{ background:'#fee2e2', color:'#991b1b', borderRadius:7, padding:'9px 12px', fontSize:13, marginBottom:14 }}>{loginError}</div>}
        <form onSubmit={login}>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email"
            style={{ width:'100%', padding:'10px 12px', border:'1px solid #d1d5db', borderRadius:8, marginBottom:10, fontSize:14, boxSizing:'border-box' }} />
          <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Contraseña" type="password"
            style={{ width:'100%', padding:'10px 12px', border:'1px solid #d1d5db', borderRadius:8, marginBottom:16, fontSize:14, boxSizing:'border-box' }} />
          <button type="submit" disabled={loginLoading}
            style={{ width:'100%', padding:'11px 0', borderRadius:8, background:ACCENT, color:'#fff', border:'none', cursor:loginLoading?'not-allowed':'pointer', fontSize:14, fontWeight:600 }}>
            {loginLoading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', fontFamily:'Segoe UI, Arial, sans-serif', background:'#f8fafc', position:'relative' }}>
      <Head><title>GASP Temporario</title></Head>

      {menuAbierto && isMobile && (
        <div onClick={() => setMenuAbierto(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:199 }} />
      )}

      <aside style={{ width:220, background:BG_SIDEBAR, display:'flex', flexDirection:'column',
        position:'fixed', top:0, left:0, height:'100vh', zIndex:200, overflowY:'auto',
        transform: isMobile && !menuAbierto ? 'translateX(-100%)' : 'translateX(0)',
        transition:'transform 0.25s ease' }}>
        <div style={{ padding:'18px 14px 12px', borderBottom:'1px solid #1E3020' }}>
          <div style={{ fontSize:22, fontWeight:800, color:'#fff' }}>GASP</div>
          <div style={{ fontSize:10, color:'#4a7a55', marginTop:1 }}>🏖 Temporario</div>
        </div>
        <nav style={{ flex:1, padding:'10px 8px' }}>
          {secciones.map(sec => (
            <div key={sec}>
              <div style={{ fontSize:9, color:'#3a5a42', fontWeight:'bold', letterSpacing:'0.15em', textTransform:'uppercase', padding:'10px 10px 4px' }}>{sec}</div>
              {NAV_DINAMICO.filter(n => (n.seccion||n.sec) === sec).map(n => (
                <div key={n.id} onClick={() => { setPagina(n.id); setMenuAbierto(false) }}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', cursor:'pointer', borderRadius:7, margin:'1px 0',
                    background: pagina===n.id ? ACCENT+'40' : 'transparent',
                    color: pagina===n.id ? '#90d4a0' : '#8FBF97',
                    fontWeight: pagina===n.id ? 'bold' : 'normal', fontSize:13 }}>
                  <span style={{ fontSize:15, width:20, textAlign:'center' }}>{n.icon||'•'}</span>
                  <span>{n.label}</span>
                </div>
              ))}
            </div>
          ))}
        </nav>
        <div style={{ padding:'12px 14px', borderTop:'1px solid #1E3020' }}>
          <div style={{ fontSize:11, color:'#4a7a55', marginBottom:8 }}>{session?.user?.email}</div>
          <button onClick={() => { supabase.auth.signOut(); setSession(null) }}
            style={{ fontSize:12, color:'#5A8A65', background:'none', border:'none', cursor:'pointer', padding:0 }}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div style={{ marginLeft: isMobile ? 0 : 220, minHeight:'100vh', paddingBottom: isMobile ? 70 : 0 }}>
        <div style={{ height:52, background:'#fff', borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', padding:'0 20px', gap:14, position:'sticky', top:0, zIndex:100 }}>
          {isMobile && (
            <button onClick={() => setMenuAbierto(v=>!v)}
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:'#374151' }}>☰</button>
          )}
          <div style={{ flex:1, fontWeight:700, color:'#111', fontSize:15 }}>
            {NAV_DINAMICO.find(n=>n.id===pagina)?.label || 'Dashboard'}
          </div>
        </div>
        <div style={{ padding: isMobile ? 14 : 24, maxWidth:1100, margin:'0 auto' }}>
          {loading && <div style={{ textAlign:'center', color:'#6B7280', padding:40 }}>Cargando...</div>}
          {!loading && (
            <>
              {pagina === 'dashboard'      && <DashboardTemp reservas={reservas} propiedades={propiedades} propietarios={propietarios} />}
              {pagina === 'calendario'     && <Calendario reservas={reservas} propiedades={propiedades} />}
              {pagina === 'reservas'       && <Reservas data={reservas} propiedades={propiedades} onRefresh={cargar} />}
              {pagina === 'solicitudes'    && <Solicitudes adminId={adminId} propiedades={propiedades} onRefresh={cargar} />}
              {pagina === 'propiedades'    && <PropiedadesTemp data={propiedades} onRefresh={cargar} />}
              {pagina === 'propietarios'   && <PropietariosTemp data={propietarios} onRefresh={cargar} />}
              {pagina === 'contratos'      && <ContratosTemp reservas={reservas} propiedades={propiedades} propietarios={propietarios} onRefresh={cargar} />}
              {pagina === 'cobranzas'      && <Cobranzas reservas={reservas} gastos={gastos} propiedades={propiedades} propietarios={propietarios} onRefresh={cargar} />}
              {pagina === 'gastos'         && <GastosTemp data={gastos} reservas={reservas} propiedades={propiedades} propietarios={propietarios} onRefresh={cargar} />}
              {pagina === 'checklist'      && <Checklist reservas={reservas} propiedades={propiedades} onRefresh={cargar} />}
              {pagina === 'notificaciones' && <NotificacionesTemp adminId={adminId} propiedades={propiedades} propietarios={propietarios} reservas={reservas} />}
              {pagina === 'limpieza'       && <Limpieza adminId={adminId} reservas={reservas} propiedades={propiedades} onRefresh={cargar} />}
              {pagina === 'liquidaciones'  && <LiquidacionesTemp reservas={reservas} propiedades={propiedades} propietarios={propietarios} />}
              {pagina === 'caja'           && <CajaTemp adminId={adminId} onRefresh={cargar} />}
              {pagina === 'temporadas'     && <Temporadas adminId={adminId} propiedades={propiedades} />}
              {pagina === 'ical'           && <ICalSync session={session} supabase={supabase} propiedades={propiedades} />}
              {pagina === 'mi_perfil'      && <PerfilAdminTemp perfil={perfil} session={session} onRefresh={cargar} onLogout={() => { supabase.auth.signOut(); setSession(null) }} />}
              {pagina === 'clientes'       && esSuperAdmin && <Clientes session={session} />}
            </>
          )}
        </div>
      </div>

      {isMobile && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, height:56, background:'#111D13', borderTop:'1px solid #1E3020', display:'flex', zIndex:100 }}>
          {[
            {id:'dashboard',icon:'📊'},{id:'calendario',icon:'📅'},{id:'reservas',icon:'🏖'},
            {id:'cobranzas',icon:'💳'},{id:'liquidaciones',icon:'📑'}
          ].map(n => (
            <button key={n.id} onClick={() => setPagina(n.id)}
              style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:1,
                background:'none', border:'none', cursor:'pointer', padding:'6px 0',
                color: pagina===n.id ? '#90d4a0' : '#4a7a55',
                borderTop: pagina===n.id ? '2px solid #1B6B35' : '2px solid transparent' }}>
              <span style={{ fontSize:18 }}>{n.icon}</span>
              <span style={{ fontSize:8, fontWeight: pagina===n.id ? 'bold' : 'normal' }}>{n.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
