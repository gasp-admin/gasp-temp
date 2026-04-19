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
  const [propFiltro, setPropFiltro] = useState('')

  const diasMes = new Date(anio, mes + 1, 0).getDate()
  const primerDia = new Date(anio, mes, 1).getDay()
  const nombresMes = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  const propsFiltradas = propFiltro ? propiedades.filter(p => p.id === propFiltro) : propiedades

  function estadoDia(propId, dia) {
    const fecha = `${anio}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
    const res = reservas.filter(r => r.propiedad_id === propId && r.estado !== 'Cancelada' && r.fecha_entrada <= fecha && r.fecha_salida > fecha)
    if (res.length === 0) return null
    return res[0]
  }

  const colorEstado = { 'Confirmada': '#1B6B35', 'Señada': '#C07D10', 'Pendiente': '#1A3FA0' }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => { if (mes === 0) { setMes(11); setAnio(a => a-1) } else setMes(m => m-1) }}
          style={{ padding: '6px 12px', borderRadius: 6, border: '0.5px solid #ddd', background: '#fff', cursor: 'pointer' }}>◀</button>
        <span style={{ fontWeight: 'bold', fontSize: 15, minWidth: 140, textAlign: 'center' }}>{nombresMes[mes]} {anio}</span>
        <button onClick={() => { if (mes === 11) { setMes(0); setAnio(a => a+1) } else setMes(m => m+1) }}
          style={{ padding: '6px 12px', borderRadius: 6, border: '0.5px solid #ddd', background: '#fff', cursor: 'pointer' }}>▶</button>
        <select value={propFiltro} onChange={e => setPropFiltro(e.target.value)}
          style={{ padding: '6px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13, marginLeft: 8 }}>
          <option value="">Todas las propiedades</option>
          {propiedades.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
          {Object.entries(colorEstado).map(([est, col]) => (
            <span key={est} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: col, display: 'inline-block' }}></span>{est}
            </span>
          ))}
        </div>
      </div>

      {propsFiltradas.map(prop => (
        <Card key={prop.id} style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 10, color: G }}>{prop.nombre}
            <span style={{ marginLeft: 8, fontSize: 11, color: '#888', fontWeight: 'normal' }}>{prop.localidad} · {prop.capacidad} pers.</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, color: '#888', fontWeight: 'bold', padding: '4px 0' }}>{d}</div>
            ))}
            {Array.from({ length: primerDia }, (_, i) => <div key={'e'+i}></div>)}
            {Array.from({ length: diasMes }, (_, i) => {
              const dia = i + 1
              const res = estadoDia(prop.id, dia)
              const esHoy = new Date().toISOString().split('T')[0] === `${anio}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
              return (
                <div key={dia} onClick={() => res && onSelect && onSelect(res)}
                  style={{
                    textAlign: 'center', padding: '6px 2px', borderRadius: 4, cursor: res ? 'pointer' : 'default',
                    background: res ? colorEstado[res.estado] || '#888' : '#F7F8FA',
                    color: res ? '#fff' : '#333',
                    fontSize: 12, fontWeight: esHoy ? 'bold' : 'normal',
                    border: esHoy ? '2px solid #1A3FA0' : '1px solid transparent',
                    title: res ? res.huesped_nombre : ''
                  }}>
                  {dia}
                  {res && <div style={{ fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {res.huesped_nombre?.split(' ')[0] || '●'}
                  </div>}
                </div>
              )
            })}
          </div>
        </Card>
      ))}
    </div>
  )
}

// ─── MÓDULO PROPIEDADES ──────────────────────────────────
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
  const vacio = { propiedad_id: '', huesped_nombre: '', huesped_dni: '', huesped_telefono: '', huesped_email: '', huesped_ciudad: '', fecha_entrada: '', fecha_salida: '', modalidad: 'Diaria', moneda: 'ARS', monto_total: '', seña: 0, fecha_cobro_seña: '', fecha_cobro_saldo: '', saldo_cobrado: false, estado: 'Pendiente', observaciones: '' }
  const [form, setForm] = useState(false)
  const [f, setF] = useState(vacio)
  const [editando, setEditando] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('')

  function calcMonto() {
    const prop = propiedades.find(p => p.id === f.propiedad_id)
    if (!prop || !f.fecha_entrada || !f.fecha_salida) return 0
    const dias = diasEntre(f.fecha_entrada, f.fecha_salida)
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
    setF({ propiedad_id: r.propiedad_id||'', huesped_nombre: r.huesped_nombre||'', huesped_dni: r.huesped_dni||'', huesped_telefono: r.huesped_telefono||'', huesped_email: r.huesped_email||'', huesped_ciudad: r.huesped_ciudad||'', fecha_entrada: r.fecha_entrada||'', fecha_salida: r.fecha_salida||'', modalidad: r.modalidad||'Diaria', moneda: r.moneda||'ARS', monto_total: r.monto_total||'', seña: r.seña||0, fecha_cobro_seña: r.fecha_cobro_seña||'', fecha_cobro_saldo: r.fecha_cobro_saldo||'', saldo_cobrado: r.saldo_cobrado||false, estado: r.estado||'Pendiente', observaciones: r.observaciones||'' })
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
              <Input label="Fecha cobro señal" value={f.fecha_cobro_seña} onChange={v => setF({...f, fecha_cobro_seña: v})} type="date" />
              <Input label="Fecha cobro saldo" value={f.fecha_cobro_saldo} onChange={v => setF({...f, fecha_cobro_saldo: v})} type="date" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                <input type="checkbox" checked={f.saldo_cobrado} onChange={e => setF({...f, saldo_cobrado: e.target.checked})} id="saldo_cobrado" />
                <label htmlFor="saldo_cobrado" style={{ fontSize: 13, cursor: 'pointer' }}>Saldo cobrado</label>
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
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => editar(r)} style={{ padding: '3px 8px', borderRadius: 5, background: W, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✏</button>
                {r.estado !== 'Cancelada' && <button onClick={() => cancelar(r)} style={{ padding: '3px 8px', borderRadius: 5, background: D, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✗</button>}
              </div>
            ]
          })}
        />
      </Card>
    </>
  )
}

// ─── MÓDULO LIQUIDACIONES ────────────────────────────────
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

// ─── CHECKLIST ───────────────────────────────────────────
const ITEMS_DEFAULT = [
  'Llaves entregadas', 'Estado general del inmueble', 'Electrodomésticos funcionando',
  'Aire acondicionado', 'TV / Smart TV', 'WiFi funcionando', 'Agua caliente',
  'Gas / calefacción', 'Ropa de cama completa', 'Toallas', 'Utensilios de cocina',
  'Vajilla completa', 'Heladera vacía y limpia', 'Baños limpios', 'Depósito de seguridad'
]

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
function Notificaciones({ reservas, propiedades }) {
  const [selRes, setSelRes] = useState('')
  const [tipo, setTipo] = useState('confirmacion')

  const res = reservas.find(r => r.id === selRes)
  const prop = res ? propiedades.find(p => p.id === res.propiedad_id) : null
  const saldo = res ? Number(res.monto_total||0) - Number(res.seña||0) : 0

  const mensajes = {
    confirmacion: res ? `Estimado/a ${res.huesped_nombre}, le confirmamos su reserva en ${prop?.nombre || res?.propiedad_id} (${prop?.localidad || 'Pinamar'}).

📅 Ingreso: ${formatFecha(res.fecha_entrada)}
📅 Egreso: ${formatFecha(res.fecha_salida)}
🏠 Propiedad: ${prop?.nombre || res.propiedad_id}
💰 Total: ${fmtM(res.monto_total, res.moneda)}
✅ Seña abonada: ${fmtM(res.seña, res.moneda)}
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
    const url = `https://wa.me/549${tel}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  function abrirEmail() {
    if (!res?.huesped_email) return alert('La reserva no tiene email del huésped')
    const asuntos = { confirmacion: 'Confirmación de reserva', recordatorio: 'Recordatorio de ingreso', cobro_saldo: 'Saldo pendiente de reserva' }
    const url = `mailto:${res.huesped_email}?subject=${encodeURIComponent(asuntos[tipo])}&body=${encodeURIComponent(msg)}`
    window.open(url)
  }

  const colorEstado = { 'Confirmada': 'ok', 'Señada': 'warn', 'Pendiente': 'blue', 'Cancelada': 'danger' }

  return (
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
            <span><strong>{res.huesped_nombre}</strong></span>
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
  { id: 'dashboard',      label: 'Panel principal',   seccion: 'Principal' },
  { id: 'calendario',     label: 'Calendario',         seccion: 'Principal' },
  { id: 'reservas',       label: 'Reservas',           seccion: 'Gestión' },
  { id: 'propiedades',    label: 'Propiedades',        seccion: 'Gestión' },
  { id: 'propietarios',   label: 'Propietarios',       seccion: 'Gestión' },
  { id: 'checklist',      label: 'Checklist',          seccion: 'Gestión' },
  { id: 'notificaciones', label: 'Notificaciones',     seccion: 'Gestión' },
  { id: 'liquidaciones',  label: 'Liquidaciones',      seccion: 'Reportes' },
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
                {pagina === 'dashboard'      && <Dashboard reservas={reservas} propiedades={propiedades} />}
                {pagina === 'calendario'     && <Calendario reservas={reservas} propiedades={propiedades} />}
                {pagina === 'reservas'       && <Reservas data={reservas} propiedades={propiedades} onRefresh={cargar} />}
                {pagina === 'propiedades'    && <Propiedades data={propiedades} onRefresh={cargar} />}
                {pagina === 'propietarios'   && <Propietarios data={propietarios} onRefresh={cargar} />}
                {pagina === 'checklist'      && <Checklist reservas={reservas} onRefresh={cargar} />}
                {pagina === 'notificaciones' && <Notificaciones reservas={reservas} propiedades={propiedades} />}
                {pagina === 'liquidaciones'  && <Liquidaciones reservas={reservas} propiedades={propiedades} propietarios={propietarios} />}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
