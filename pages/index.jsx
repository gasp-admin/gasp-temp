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
                <col key={i} style={{ width: Math.max(28, Math.floor((window.innerWidth - 230) / diasMes)) + 'px' }} />
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
  { id: 'dashboard',     label: 'Panel principal',  seccion: 'Principal' },
  { id: 'calendario',    label: 'Calendario',        seccion: 'Principal' },
  { id: 'reservas',      label: 'Reservas',          seccion: 'Gestión' },
  { id: 'solicitudes',   label: 'Solicitudes',       seccion: 'Gestión' },
  { id: 'propiedades',   label: 'Propiedades',       seccion: 'Gestión' },
  { id: 'propietarios',  label: 'Propietarios',      seccion: 'Gestión' },
  { id: 'limpieza',      label: '🧹 Limpieza',       seccion: 'Gestión' },
  { id: 'temporadas',    label: '📆 Temporadas',      seccion: 'Configuracion' },
  { id: 'liquidaciones', label: 'Liquidaciones',     seccion: 'Reportes' },
]

export default function App() {
  const [session, setSession] = useState('loading')
  const [pagina, setPagina] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [reservas, setReservas] = useState([])
  const [propiedades, setPropiedades] = useState([])
  const [propietarios, setPropietarios] = useState([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  const adminId = session?.user?.id || null

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session || null)
      if (data?.session) cargar(true)
    }).catch(() => setSession(null))
  }, [])

  async function cargar(inicial = false) {
    if (inicial) setLoading(true)
    const [r1, r2, r3] = await Promise.all([
      supabase.from('reservas_temp').select('*').order('fecha_entrada', { ascending: false }),
      supabase.from('prop_temp').select('*').eq('activo', true),
      supabase.from('prop_owners_temp').select('*').eq('activo', true),
    ])
    setReservas(r1.data || [])
    setPropiedades(r2.data || [])
    setPropietarios(r3.data || [])
    if (inicial) setLoading(false)
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    setSession(null)
    setReservas([]); setPropiedades([]); setPropietarios([])
  }

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) return setLoginError('Complete email y contraseña')
    setLoginLoading(true); setLoginError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setLoginError('Email o contraseña incorrectos'); setLoginLoading(false) }
    else { setSession(data.session); await cargar(true) }
  }

  if (session === 'loading') return (
    <div style={{ minHeight: '100vh', background: '#111D13', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5A8A65', fontFamily: 'Arial', fontSize: 14 }}>
      Cargando GASP Temporario...
    </div>
  )

  if (!session) return (
    <div style={{ minHeight: '100vh', background: '#111D13', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 'bold', color: '#fff', letterSpacing: 2 }}>GASP</div>
          <div style={{ fontSize: 13, color: '#5A8A65', marginTop: 4 }}>Alquileres Temporarios</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 28 }}>
          <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 20 }}>Iniciar sesión</div>
          {loginError && <div style={{ background: '#FCEAEA', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: D }}>{loginError}</div>}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Email</div>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Contraseña</div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <button type="submit" disabled={loginLoading} style={{ width: '100%', padding: 12, borderRadius: 8, background: loginLoading ? '#aaa' : G, color: '#fff', border: 'none', cursor: loginLoading ? 'wait' : 'pointer', fontSize: 15, fontWeight: 'bold' }}>
              {loginLoading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )

  const secciones = [...new Set(NAV.map(n => n.seccion))]

  return (
    <>
      <Head>
        <title>GASP Temporario</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Segoe UI, Arial, sans-serif' }}>

        {/* SIDEBAR */}
        <div style={{ width: 220, background: '#111D13', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '20px 16px 16px' }}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', letterSpacing: 1 }}>GASP</div>
            <div style={{ fontSize: 10, color: '#5A8A65', marginTop: 2 }}>Alquileres Temporarios</div>
          </div>
          <nav style={{ flex: 1, padding: '8px 0' }}>
            {secciones.map(sec => (
              <div key={sec}>
                <div style={{ fontSize: 9, fontWeight: 'bold', letterSpacing: 2, color: '#4A6A50', padding: '10px 16px 4px', textTransform: 'uppercase' }}>{sec}</div>
                {NAV.filter(n => n.seccion === sec).map(n => (
                  <button key={n.id} onClick={() => setPagina(n.id)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 16px', border: 'none', background: pagina === n.id ? '#1B6B35' : 'transparent', color: pagina === n.id ? '#fff' : '#8FBF97', cursor: 'pointer', fontSize: 13, borderRadius: 0 }}>
                    {n.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div style={{ padding: 16, borderTop: '0.5px solid #1E3020' }}>
            <div style={{ fontSize: 11, color: '#5A8A65', marginBottom: 8 }}>{session?.user?.email}</div>
            <button onClick={cerrarSesion} style={{ fontSize: 12, color: '#5A8A65', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Cerrar sesión</button>
          </div>
        </div>

        {/* CONTENIDO */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#fff', padding: '14px 24px', borderBottom: '0.5px solid #E8ECF0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 'bold', fontSize: 16 }}>{NAV.find(n => n.id === pagina)?.label}</div>
            <button onClick={() => cargar()} style={{ padding: '5px 14px', borderRadius: 6, border: '0.5px solid #ddd', background: '#F7F8FA', cursor: 'pointer', fontSize: 12 }}>↺ Actualizar</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#888', fontSize: 14 }}>Cargando...</div>
            ) : (
              <>
                {pagina === 'dashboard'    && <Dashboard reservas={reservas} propiedades={propiedades} />}
                {pagina === 'calendario'   && <Calendario reservas={reservas} propiedades={propiedades} />}
                {pagina === 'reservas'     && <Reservas data={reservas} propiedades={propiedades} onRefresh={cargar} />}
                {pagina === 'solicitudes'  && <Solicitudes adminId={adminId} propiedades={propiedades} onRefresh={cargar} />}
                {pagina === 'propiedades'  && <Propiedades data={propiedades} onRefresh={cargar} />}
                {pagina === 'propietarios' && <Propietarios data={propietarios} onRefresh={cargar} />}
                {pagina === 'limpieza'     && <Limpieza adminId={adminId} reservas={reservas} propiedades={propiedades} onRefresh={cargar} />}
                {pagina === 'temporadas'   && <Temporadas adminId={adminId} propiedades={propiedades} />}
                {pagina === 'liquidaciones' && <Liquidaciones reservas={reservas} propiedades={propiedades} propietarios={propietarios} />}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
