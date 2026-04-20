import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

// ─── COLORES ────────────────────────────────────────────
const G = '#1B6B35'   // verde
const B = '#1A3FA0'   // azul
const W = '#C07D10'   // naranja
const D = '#B83030'   // rojo
const SUPERADMIN = 'javiergp@live.com.ar'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL



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


// ─── CLIENTES GASP TEMPORARIO ────────────────────────────
function ClientesGasp({ session }) {
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

  async function crearCliente() {
    if (!nombre || !emailC || !password) return setMsg({ ok: false, text: 'Complete todos los campos' })
    setLoading(true); setMsg(null)
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch(SUPABASE_URL + '/functions/v1/crear-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ nombre, email: emailC, password, solicitante: session?.user?.email })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear cliente')
      setMsg({ ok: true, text: 'Cliente creado: ' + emailC })
      setNombre(''); setEmailC(''); setPassword('')
    } catch (e) {
      setMsg({ ok: false, text: e.message })
    }
    setLoading(false)
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

      {tab === 'clientes' && (
        <Card>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 14 }}>Clientes — GASP Temporario</div>
          <Tabla
            cols={['Email', 'Nombre', 'Alta', 'Expira', 'Activo']}
            filas={clientes.map(c => [
              <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.email}</span>,
              c.nombre || '—',
              c.created_at?.split('T')[0] || '—',
              c.fecha_expiracion || '—',
              <Pill text={c.activo ? 'Activo' : 'Inactivo'} color={c.activo ? 'ok' : 'danger'} />
            ])}
          />
        </Card>
      )}
    </>
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
function Reservas({ data, propiedades, perfil = {}, onRefresh }) {
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
      const nuevoId = nextId(data, 'RV')
      await supabase.from('reservas_temp').insert([{ ...datos, id: nuevoId, admin_id: adminId }])
      // Registrar comisión en caja automáticamente
      if (comision > 0) {
        const cajaId = 'CJ-' + nuevoId
        await supabase.from('caja_temp').insert([{
          id: cajaId,
          fecha: f.fecha_entrada || new Date().toISOString().split('T')[0],
          tipo: 'Ingreso',
          categoria: 'Comisión de gestión',
          concepto: 'Comisión reserva ' + nuevoId + ' — ' + f.huesped_nombre,
          importe: comision,
          moneda: f.moneda || 'ARS',
          referencia_reserva_id: nuevoId,
          admin_id: adminId,
        }])
      }
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
              <Input label="Seña cobrada" value={f.seña} onChange={v => setF({...f, seña: v})} type="number" />
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
          cols={['ID', 'Propiedad', 'Huésped', 'Entrada', 'Salida', 'Días', 'Moneda', 'Monto', 'Seña', 'Saldo', 'Estado', 'Acciones']}
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
                <button onClick={() => generarReciboReserva(r, propiedades.find(p => p.id === r.propiedad_id), perfil)} style={{ padding: '3px 8px', borderRadius: 5, background: B, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>📄</button>
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
function Liquidaciones({ reservas, propiedades, propietarios, perfil = {} }) {
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
          {propSelec && (
            <button onClick={() => {
              const url = 'https://gasptemp.vercel.app/propietario?id=' + propSelec
              navigator.clipboard.writeText(url).then(() => alert('✓ Link copiado al portapapeles:\n' + url))
            }} style={{ padding: '6px 14px', borderRadius: 6, background: B, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>
              🔗 Copiar link portal propietario
            </button>
          )}
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
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => generarLiquidacionPropietario(
                propsDelOwner[0], prop, reservasFiltradas, fechaDesde, fechaHasta, perfil
              )} style={{ padding: '9px 20px', borderRadius: 8, background: B, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}>
                📄 Generar PDF liquidación
              </button>
            </div>
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

// ─── PDF RECIBO RESERVA ──────────────────────────────────

function cargarLogoBase64(callback) {
  const img = new window.Image()
  img.crossOrigin = 'anonymous'
  img.onload = function() {
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    callback(canvas.toDataURL('image/jpeg'))
  }
  img.onerror = function() { callback(null) }
  img.src = '/logo.jpeg'
}

function generarReciboReserva(res, prop, perfil = {}) {
  const fmtN = (n, mon) => mon === 'USD' ? 'USD ' + Number(n||0).toLocaleString('es-AR') : '$' + Number(n||0).toLocaleString('es-AR')
  const script = document.createElement('script')
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
  script.onload = () => {
    const { jsPDF } = window.jspdf
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const W = 210, margin = 14
    cargarLogoBase64(logoB64 => {
      if (logoB64) { try { doc.addImage(logoB64, 'JPEG', margin, 10, 20, 20) } catch(e){} }
      render()
    })

    function render() {
      // Header azul
      doc.setFillColor(26, 63, 160)
      doc.rect(0, 0, W, 45, 'F')
      doc.setTextColor(255,255,255)
      doc.setFont('helvetica','bold'); doc.setFontSize(16)
      doc.text('GASP', margin+24, 20)
      doc.setFont('helvetica','normal'); doc.setFontSize(9)
      doc.text('Gestion de Alquileres Sistema Profesional', margin+24, 26)
      doc.text((perfil.nombre_completo||'Administrador') + '  |  ' + (perfil.titulo||'') + '  |  ' + (perfil.matricula||''), margin+24, 31)
      doc.text((perfil.ciudad||'') + (perfil.provincia?', '+perfil.provincia:'') + '  |  ' + (perfil.email_contacto||''), margin+24, 36)

      // Título
      doc.setTextColor(26,63,160); doc.setFont('helvetica','bold'); doc.setFontSize(15)
      doc.text('COMPROBANTE DE RESERVA', margin, 56)
      doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100)
      doc.text('N° ' + (res.id||''), W-margin, 56, { align: 'right' })
      doc.setDrawColor(26,63,160); doc.setLineWidth(0.5)
      doc.line(margin, 59, W-margin, 59)

      let y = 68
      // Datos reserva
      const datos = [
        ['Huésped:', res.huesped_nombre||'—'],
        ['DNI:', res.huesped_dni||'—'],
        ['Teléfono:', res.huesped_telefono||'—'],
        ['Email:', res.huesped_email||'—'],
        ['Ciudad:', res.huesped_ciudad||'—'],
        ['Propiedad:', (prop?.nombre||res.propiedad_id) + (prop?.localidad ? ' — ' + prop.localidad : '')],
        ['Tipo:', prop?.tipo||'—'],
        ['Capacidad:', prop?.capacidad ? prop.capacidad + ' personas' : '—'],
        ['Ingreso:', formatFecha(res.fecha_entrada)],
        ['Egreso:', formatFecha(res.fecha_salida)],
        ['Noches/días:', (res.dias||0) + ' días'],
        ['Modalidad:', res.modalidad||'—'],
      ]
      doc.setFontSize(10)
      datos.forEach(([label, val]) => {
        doc.setFont('helvetica','bold'); doc.setTextColor(60,60,60)
        doc.text(label, margin, y)
        doc.setFont('helvetica','normal'); doc.setTextColor(0,0,0)
        doc.text(val, margin+42, y)
        y += 7
      })

      y += 4
      // Tabla cobro
      doc.setFillColor(26,63,160)
      doc.rect(margin, y-4, W-margin*2, 8, 'F')
      doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(10)
      doc.text('CONCEPTO', margin+2, y)
      doc.text('IMPORTE', W-margin-2, y, { align: 'right' })
      y += 8

      const cobros = [
        ['Monto total de la reserva', fmtN(res.monto_total, res.moneda)],
        ['Seña cobrada', fmtN(res.seña, res.moneda)],
        ['Saldo pendiente', fmtN(Number(res.monto_total||0)-Number(res.seña||0), res.moneda)],
      ]
      cobros.forEach(([label, val], i) => {
        if (i % 2 === 0) { doc.setFillColor(247,248,250); doc.rect(margin, y-4, W-margin*2, 7, 'F') }
        doc.setTextColor(0); doc.setFont('helvetica', i===2?'bold':'normal'); doc.setFontSize(10)
        doc.text(label, margin+2, y)
        doc.setTextColor(i===2?184:0, i===2?48:0, i===2?48:0)
        doc.text(val, W-margin-2, y, { align: 'right' })
        y += 7
      })

      y += 6
      doc.setDrawColor(200,200,200); doc.setLineWidth(0.3)
      doc.line(margin, y, W/2-10, y)
      y += 8
      doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(100,100,100)
      doc.text('Firma y sello', margin, y)
      y += 5
      doc.setFont('helvetica','bold'); doc.setTextColor(0)
      doc.text(perfil.nombre_completo||'Administrador', margin, y)
      y += 5
      doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100)
      doc.text((perfil.titulo||'') + (perfil.matricula?' · '+perfil.matricula:''), margin, y)

      doc.setFillColor(26,63,160)
      doc.rect(0, 287, W, 10, 'F')
      doc.setTextColor(200,210,255); doc.setFontSize(7)
      doc.text('GASP Alquileres Temporarios  |  ' + (perfil.email_contacto||''), W/2, 293, { align: 'center' })

      doc.save('Recibo_' + res.id + '_' + (res.huesped_nombre||'').replace(/ /g,'_') + '.pdf')
    }
  }
  if (!document.querySelector('script[src*="jspdf"]')) document.head.appendChild(script)
  else script.onload()
}

// ─── PDF LIQUIDACION PROPIETARIO ─────────────────────────
function generarLiquidacionPropietario(prop, owner, reservasFiltradas, fechaDesde, fechaHasta, perfil = {}) {
  const fmtN = (n, mon) => mon === 'USD' ? 'USD ' + Number(n||0).toLocaleString('es-AR') : '$' + Number(n||0).toLocaleString('es-AR')
  const script = document.createElement('script')
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
  script.onload = () => {
    const { jsPDF } = window.jspdf
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const W = 210, margin = 14
    cargarLogoBase64(logoB64 => {
      if (logoB64) { try { doc.addImage(logoB64, 'JPEG', margin, 10, 20, 20) } catch(e){} }
      render()
    })

    function render() {
      doc.setFillColor(26,63,160)
      doc.rect(0, 0, W, 45, 'F')
      doc.setTextColor(255,255,255)
      doc.setFont('helvetica','bold'); doc.setFontSize(16)
      doc.text('GASP', margin+24, 20)
      doc.setFont('helvetica','normal'); doc.setFontSize(9)
      doc.text('Gestion de Alquileres Sistema Profesional', margin+24, 26)
      doc.text((perfil.nombre_completo||'Administrador') + '  |  ' + (perfil.titulo||'') + '  |  ' + (perfil.matricula||''), margin+24, 31)
      doc.text((perfil.ciudad||'') + (perfil.provincia?', '+perfil.provincia:'') + '  |  ' + (perfil.email_contacto||''), margin+24, 36)

      doc.setTextColor(26,63,160); doc.setFont('helvetica','bold'); doc.setFontSize(14)
      doc.text('LIQUIDACIÓN AL PROPIETARIO', margin, 56)
      doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100)
      doc.text('Período: ' + (fechaDesde||'—') + ' al ' + (fechaHasta||'—'), margin, 62)
      doc.setDrawColor(26,63,160); doc.setLineWidth(0.5); doc.line(margin, 65, W-margin, 65)

      let y = 73
      // Propietario
      doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(26,63,160)
      doc.text('PROPIETARIO', margin, y); y += 6
      const dprop = [
        ['Nombre:', owner?.apellido_nombre||'—'],
        ['Email:', owner?.email||'—'],
        ['CBU:', owner?.cbu||'—'],
        ['Banco:', owner?.banco||'—'],
        ['Ciudad:', owner?.ciudad_residencia||'—'],
      ]
      dprop.forEach(([l, v]) => {
        doc.setFont('helvetica','bold'); doc.setTextColor(60,60,60); doc.setFontSize(9)
        doc.text(l, margin, y)
        doc.setFont('helvetica','normal'); doc.setTextColor(0); doc.text(v, margin+28, y)
        y += 5.5
      })

      y += 4
      // Tabla reservas
      doc.setFillColor(26,63,160)
      doc.rect(margin, y-4, W-margin*2, 7, 'F')
      doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8)
      doc.text('Reserva', margin+1, y)
      doc.text('Huésped', margin+18, y)
      doc.text('Entrada', margin+55, y)
      doc.text('Salida', margin+75, y)
      doc.text('Días', margin+93, y)
      doc.text('Mon.', margin+103, y)
      doc.text('Total', margin+115, y)
      doc.text('Comisión', margin+133, y)
      doc.text('Neto', W-margin-1, y, { align: 'right' })
      y += 7

      let totBrutoARS=0, totComARS=0, totNetoARS=0
      let totBrutoUSD=0, totComUSD=0, totNetoUSD=0

      reservasFiltradas.forEach((r, i) => {
        if (y > 265) { doc.addPage(); y = 20 }
        if (i%2===0) { doc.setFillColor(247,248,250); doc.rect(margin, y-3.5, W-margin*2, 6, 'F') }
        doc.setFont('helvetica','normal'); doc.setTextColor(0); doc.setFontSize(8)
        doc.text(r.id||'', margin+1, y)
        doc.text((r.huesped_nombre||'').substring(0,20), margin+18, y)
        doc.text(formatFecha(r.fecha_entrada), margin+55, y)
        doc.text(formatFecha(r.fecha_salida), margin+75, y)
        doc.text(String(r.dias||0), margin+93, y)
        doc.text(r.moneda||'ARS', margin+103, y)
        doc.text(fmtN(r.monto_total, r.moneda), margin+115, y)
        doc.setTextColor(184,48,48)
        doc.text('- '+fmtN(r.comision, r.moneda), margin+133, y)
        doc.setTextColor(26,107,53); doc.setFont('helvetica','bold')
        doc.text(fmtN(r.neto_propietario, r.moneda), W-margin-1, y, { align: 'right' })
        y += 6
        if (r.moneda==='USD') { totBrutoUSD+=Number(r.monto_total||0); totComUSD+=Number(r.comision||0); totNetoUSD+=Number(r.neto_propietario||0) }
        else { totBrutoARS+=Number(r.monto_total||0); totComARS+=Number(r.comision||0); totNetoARS+=Number(r.neto_propietario||0) }
      })

      y += 4
      // Totales
      const totales = [
        ['TOTAL ARS', fmtN(totBrutoARS,'ARS'), fmtN(totComARS,'ARS'), fmtN(totNetoARS,'ARS')],
        ['TOTAL USD', fmtN(totBrutoUSD,'USD'), fmtN(totComUSD,'USD'), fmtN(totNetoUSD,'USD')],
      ]
      totales.forEach(([label, bruto, com, neto]) => {
        doc.setFillColor(26,63,160); doc.rect(margin, y-4, W-margin*2, 8, 'F')
        doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(9)
        doc.text(label, margin+2, y)
        doc.text(bruto, margin+115, y)
        doc.text('- '+com, margin+133, y)
        doc.text(neto, W-margin-1, y, { align: 'right' })
        y += 10
      })

      y += 6
      doc.setDrawColor(200,200,200); doc.line(margin, y, W/2-10, y); y += 8
      doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(100,100,100)
      doc.text('Firma y sello', margin, y); y += 5
      doc.setFont('helvetica','bold'); doc.setTextColor(0)
      doc.text(perfil.nombre_completo||'Administrador', margin, y); y += 5
      doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100)
      doc.text((perfil.titulo||'') + (perfil.matricula?' · '+perfil.matricula:''), margin, y)

      doc.setFillColor(26,63,160); doc.rect(0, 287, W, 10, 'F')
      doc.setTextColor(200,210,255); doc.setFontSize(7)
      doc.text('GASP Alquileres Temporarios  |  ' + (perfil.email_contacto||''), W/2, 293, { align: 'center' })

      doc.save('Liquidacion_' + (owner?.apellido_nombre||'').replace(/ /g,'_') + '_' + (fechaDesde||'') + '.pdf')
    }
  }
  if (!document.querySelector('script[src*="jspdf"]')) document.head.appendChild(script)
  else script.onload()
}


// ─── MÓDULO CAJA ─────────────────────────────────────────
function Caja({ data, onRefresh, perfil = {} }) {
  const [form, setForm] = useState(false)
  const [filtroMes, setFiltroMes] = useState('')
  const vacio = { tipo: 'Ingreso', categoria: 'Honorarios', concepto: '', importe: '', moneda: 'ARS', fecha: new Date().toISOString().split('T')[0], observaciones: '' }
  const [f, setF] = useState(vacio)
  const [loading, setLoading] = useState(false)

  const CATS_ING = ['Honorarios', 'Comisión de gestión', 'Honorario extra', 'Recupero de gastos', 'Otro ingreso']
  const CATS_EGR = ['Librería y papelería', 'Telefonía', 'Internet', 'Movilidad', 'Honorarios profesionales', 'Impuestos y tasas', 'Publicidad', 'Otro egreso']

  async function guardar() {
    if (!f.concepto || !f.importe) return alert('Complete concepto e importe')
    setLoading(true)
    const adminId = (await supabase.auth.getUser()).data.user?.id
    const nuevoId = nextId(data, 'CJ')
    const { error } = await supabase.from('caja_temp').insert([{ ...f, id: nuevoId, importe: Number(f.importe)||0, admin_id: adminId }])
    if (error) return alert('Error: ' + error.message)
    setForm(false); setF(vacio); setLoading(false); onRefresh()
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar este movimiento?')) return
    await supabase.from('caja_temp').delete().eq('id', id)
    onRefresh()
  }

  const movsFiltrados = filtroMes ? data.filter(m => m.fecha && m.fecha.startsWith(filtroMes)) : data
  const saldoARS = data.filter(m => m.moneda === 'ARS').reduce((s, m) => s + (m.tipo === 'Ingreso' ? Number(m.importe) : -Number(m.importe)), 0)
  const saldoUSD = data.filter(m => m.moneda === 'USD').reduce((s, m) => s + (m.tipo === 'Ingreso' ? Number(m.importe) : -Number(m.importe)), 0)
  const ingMes = movsFiltrados.filter(m => m.tipo === 'Ingreso' && m.moneda === 'ARS').reduce((s, m) => s + Number(m.importe), 0)
  const egrMes = movsFiltrados.filter(m => m.tipo === 'Egreso' && m.moneda === 'ARS').reduce((s, m) => s + Number(m.importe), 0)
  const comMes = movsFiltrados.filter(m => m.categoria === 'Comisión de gestión' && m.moneda === 'ARS').reduce((s, m) => s + Number(m.importe), 0)
  const meses = [...new Set(data.map(m => m.fecha?.substring(0,7)).filter(Boolean))].sort().reverse()
  const card = (bg, border) => ({ background: bg, border: '0.5px solid ' + border, borderRadius: 10, padding: 16 })

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={card('#fff','#E8ECF0')}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>SALDO CAJA ARS</div>
          <div style={{ fontSize: 22, fontWeight: 'bold', color: saldoARS >= 0 ? G : D }}>{fmt(Math.abs(saldoARS))}</div>
          <div style={{ fontSize: 11, color: saldoARS >= 0 ? G : D }}>{saldoARS >= 0 ? '▲ positivo' : '▼ negativo'}</div>
        </div>
        <div style={card('#fff','#E8ECF0')}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>SALDO CAJA USD</div>
          <div style={{ fontSize: 22, fontWeight: 'bold', color: saldoUSD >= 0 ? B : D }}>USD {Math.abs(saldoUSD).toLocaleString('es-AR')}</div>
          <div style={{ fontSize: 11, color: saldoUSD >= 0 ? B : D }}>{saldoUSD >= 0 ? '▲ positivo' : '▼ negativo'}</div>
        </div>
        <div style={card('#E8EEFB','#A8C0F0')}>
          <div style={{ fontSize: 11, color: B, marginBottom: 4 }}>INGRESOS {filtroMes || 'ACUMULADO'}</div>
          <div style={{ fontSize: 22, fontWeight: 'bold', color: B }}>{fmt(ingMes)}</div>
          <div style={{ fontSize: 11, color: '#888' }}>Comisiones: {fmt(comMes)}</div>
        </div>
        <div style={card('#FCEAEA','#F09595')}>
          <div style={{ fontSize: 11, color: D, marginBottom: 4 }}>EGRESOS {filtroMes || 'ACUMULADO'}</div>
          <div style={{ fontSize: 22, fontWeight: 'bold', color: D }}>{fmt(egrMes)}</div>
          <div style={{ fontSize: 11, color: D }}>Resultado: {fmt(ingMes - egrMes)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} style={{ padding: '6px 12px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13 }}>
            <option value="">Todos los movimientos</option>
            {meses.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {filtroMes && <button onClick={() => setFiltroMes('')} style={{ padding: '6px 10px', borderRadius: 7, border: '0.5px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 13 }}>✕</button>}
        </div>
        <Btn onClick={() => setForm(true)} color={B}>+ Movimiento manual</Btn>
      </div>

      {form && (
        <Card style={{ marginBottom: 16, border: '1px solid ' + B }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 12 }}>Nuevo movimiento manual</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Tipo</div>
              <select value={f.tipo} onChange={e => setF({...f, tipo: e.target.value, categoria: e.target.value === 'Ingreso' ? 'Honorarios' : 'Librería y papelería'})} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13, background: f.tipo === 'Ingreso' ? '#E8EEFB' : '#FCEAEA' }}>
                <option>Ingreso</option><option>Egreso</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Categoría</div>
              <select value={f.categoria} onChange={e => setF({...f, categoria: e.target.value})} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                {(f.tipo === 'Ingreso' ? CATS_ING : CATS_EGR).map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Moneda</div>
              <select value={f.moneda} onChange={e => setF({...f, moneda: e.target.value})} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                <option value="ARS">Pesos (ARS)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>
            <Input label="Concepto" value={f.concepto} onChange={v => setF({...f, concepto: v})} />
            <Input label="Importe" value={f.importe} onChange={v => setF({...f, importe: v})} type="number" />
            <Input label="Fecha" value={f.fecha} onChange={v => setF({...f, fecha: v})} type="date" />
            <div style={{ gridColumn: 'span 3' }}>
              <Input label="Observaciones (opcional)" value={f.observaciones} onChange={v => setF({...f, observaciones: v})} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={guardar} disabled={loading} color={B}>{loading ? 'Guardando...' : 'Guardar'}</Btn>
            <BtnSec onClick={() => { setForm(false); setF(vacio) }}>Cancelar</BtnSec>
          </div>
        </Card>
      )}

      <Card>
        {movsFiltrados.length === 0 ? (
          <div style={{ color: '#bbb', fontSize: 13, padding: 12 }}>No hay movimientos{filtroMes ? ' para el período seleccionado' : ''}</div>
        ) : (
          <Tabla
            cols={['Fecha', 'Tipo', 'Categoría', 'Concepto', 'Moneda', 'Importe', 'Origen', '']}
            filas={movsFiltrados.map(m => {
              const importeFmt = m.moneda === 'USD' ? 'USD ' + Number(m.importe).toLocaleString('es-AR') : fmt(m.importe)
              const puedeEliminar = !m.referencia_reserva_id
              return [
                m.fecha,
                <Pill text={m.tipo} color={m.tipo === 'Ingreso' ? 'ok' : 'danger'} />,
                <span style={{ fontSize: 12 }}>{m.categoria}</span>,
                <span style={{ fontSize: 12 }}>{m.concepto}</span>,
                <Pill text={m.moneda} color={m.moneda === 'USD' ? 'blue' : 'gray'} />,
                <span style={{ fontWeight: 'bold', color: m.tipo === 'Ingreso' ? B : D }}>{m.tipo === 'Egreso' ? '- ' : '+ '}{importeFmt}</span>,
                <span style={{ fontSize: 10, color: '#888', fontFamily: m.referencia_reserva_id ? 'monospace' : 'inherit' }}>{m.referencia_reserva_id ? 'Auto · ' + m.referencia_reserva_id : 'Manual'}</span>,
                puedeEliminar
                  ? <button onClick={() => eliminar(m.id)} style={{ padding: '3px 8px', borderRadius: 5, background: D, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✗</button>
                  : <span style={{ fontSize: 10, color: '#ccc' }}>—</span>
              ]
            })}
          />
        )}
      </Card>
    </>
  )
}

// ─── PERFIL ADMIN ─────────────────────────────────────────
function PerfilAdmin({ perfil, onRefresh, session }) {
  const [nombre_completo, setNombreCompleto] = useState(perfil.nombre_completo || '')
  const [titulo, setTitulo] = useState(perfil.titulo || '')
  const [matricula, setMatricula] = useState(perfil.matricula || '')
  const [ciudad, setCiudad] = useState(perfil.ciudad || '')
  const [provincia, setProvincia] = useState(perfil.provincia || '')
  const [email_contacto, setEmailContacto] = useState(perfil.email_contacto || '')
  const [telefono, setTelefono] = useState(perfil.telefono || '')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    setNombreCompleto(perfil.nombre_completo || '')
    setTitulo(perfil.titulo || '')
    setMatricula(perfil.matricula || '')
    setCiudad(perfil.ciudad || '')
    setProvincia(perfil.provincia || '')
    setEmailContacto(perfil.email_contacto || '')
    setTelefono(perfil.telefono || '')
  }, [perfil])

  async function guardar() {
    setLoading(true); setMsg(null)
    const admin_id = session?.user?.id
    const datos = { admin_id, nombre_completo, titulo, matricula, ciudad, provincia, email_contacto, telefono, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('perfil_admin').upsert(datos, { onConflict: 'admin_id' })
    if (error) setMsg({ ok: false, text: 'Error: ' + error.message })
    else { setMsg({ ok: true, text: 'Perfil guardado correctamente.' }); onRefresh() }
    setLoading(false)
  }

  return (
    <Card style={{ maxWidth: 600 }}>
      <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 6, color: B }}>Mi perfil profesional</div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>Estos datos aparecerán en todos los PDFs generados: recibos y liquidaciones.</div>
      {msg && <div style={{ background: msg.ok ? '#E8EEFB' : '#FCEAEA', border: '0.5px solid ' + (msg.ok ? '#A8C0F0' : '#F09595'), borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: msg.ok ? B : D }}>{msg.ok ? '✓ ' : '✗ '}{msg.text}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <Input label="Nombre y apellido completo" value={nombre_completo} onChange={setNombreCompleto} />
        <Input label="Título / Cargo (ej: Administrador de Consorcios)" value={titulo} onChange={setTitulo} />
        <Input label="Matrícula (ej: RPAC Mat. N° 83)" value={matricula} onChange={setMatricula} />
        <Input label="Email de contacto" value={email_contacto} onChange={setEmailContacto} />
        <Input label="Ciudad" value={ciudad} onChange={setCiudad} />
        <Input label="Provincia" value={provincia} onChange={setProvincia} />
        <Input label="Teléfono" value={telefono} onChange={setTelefono} />
      </div>
      <div style={{ background: '#F7F8FA', borderRadius: 8, padding: 14, marginBottom: 20, fontSize: 12, color: '#555' }}>
        <div style={{ fontWeight: 'bold', marginBottom: 6, color: B }}>Vista previa en PDFs:</div>
        <div>{nombre_completo || 'Nombre completo'} | {titulo || 'Título'} | {matricula || 'Matrícula'}</div>
        <div>{ciudad || 'Ciudad'}, {provincia || 'Provincia'} | {email_contacto || 'email@contacto.com'}</div>
      </div>
      <Btn onClick={guardar} disabled={loading} color={B}>{loading ? 'Guardando...' : 'Guardar perfil'}</Btn>
    </Card>
  )
}


// ─── MÓDULO GASTOS ────────────────────────────────────────
function Gastos({ data, reservas, onRefresh }) {
  const vacio = { reserva_id: '', concepto: '', responsable: 'Huesped', importe: '', moneda: 'ARS', fecha: new Date().toISOString().split('T')[0], observaciones: '' }
  const [form, setForm] = useState(false)
  const [f, setF] = useState(vacio)
  const [filtroRes, setFiltroRes] = useState('')

  async function guardar() {
    if (!f.reserva_id || !f.concepto || !f.importe) return alert('Complete reserva, concepto e importe')
    const adminId = (await supabase.auth.getUser()).data.user?.id
    const res = reservas.find(r => r.id === f.reserva_id)
    const { error } = await supabase.from('gastos_temp').insert([{
      ...f, id: nextId(data, 'GT'),
      propiedad_id: res?.propiedad_id || '',
      importe: Number(f.importe) || 0,
      admin_id: adminId
    }])
    if (error) return alert('Error: ' + error.message)
    setForm(false); setF(vacio); onRefresh()
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar este gasto?')) return
    await supabase.from('gastos_temp').delete().eq('id', id)
    onRefresh()
  }

  const dataFiltrada = filtroRes ? data.filter(g => g.reserva_id === filtroRes) : data
  const totalHuesped = dataFiltrada.filter(g => g.responsable === 'Huesped' && g.moneda === 'ARS').reduce((s,g) => s + Number(g.importe||0), 0)
  const totalProp = dataFiltrada.filter(g => g.responsable === 'Propietario' && g.moneda === 'ARS').reduce((s,g) => s + Number(g.importe||0), 0)

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select value={filtroRes} onChange={e => setFiltroRes(e.target.value)} style={{ padding: '6px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
            <option value="">Todas las reservas</option>
            {reservas.filter(r => r.estado !== 'Cancelada').map(r => (
              <option key={r.id} value={r.id}>{r.id} — {r.huesped_nombre} ({formatFecha(r.fecha_entrada)})</option>
            ))}
          </select>
          {filtroRes && (
            <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
              <span style={{ color: D }}>Huésped: {fmt(totalHuesped)}</span>
              <span style={{ color: W }}>Propietario: {fmt(totalProp)}</span>
            </div>
          )}
        </div>
        <Btn onClick={() => setForm(true)} color={B}>+ Nuevo gasto</Btn>
      </div>

      {form && (
        <Card style={{ marginBottom: 16, border: '1px solid ' + B }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 14 }}>Nuevo gasto</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div style={{ gridColumn: 'span 3' }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Reserva</div>
              <select value={f.reserva_id} onChange={e => setF({...f, reserva_id: e.target.value})} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                <option value="">Seleccionar reserva...</option>
                {reservas.filter(r => r.estado !== 'Cancelada').map(r => (
                  <option key={r.id} value={r.id}>{r.id} — {r.huesped_nombre} — {r.propiedad_id} ({formatFecha(r.fecha_entrada)})</option>
                ))}
              </select>
            </div>
            <Input label="Concepto" value={f.concepto} onChange={v => setF({...f, concepto: v})} />
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Responsable</div>
              <select value={f.responsable} onChange={e => setF({...f, responsable: e.target.value})} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13, background: f.responsable === 'Huesped' ? '#FCEAEA' : '#FFF5E6' }}>
                <option value="Huesped">Huésped</option>
                <option value="Propietario">Propietario</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Moneda</div>
              <select value={f.moneda} onChange={e => setF({...f, moneda: e.target.value})} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                <option value="ARS">Pesos (ARS)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>
            <Input label="Importe" value={f.importe} onChange={v => setF({...f, importe: v})} type="number" />
            <Input label="Fecha" value={f.fecha} onChange={v => setF({...f, fecha: v})} type="date" />
            <div style={{ gridColumn: 'span 3' }}>
              <Input label="Observaciones" value={f.observaciones} onChange={v => setF({...f, observaciones: v})} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={guardar} color={B}>Guardar gasto</Btn>
            <BtnSec onClick={() => { setForm(false); setF(vacio) }}>Cancelar</BtnSec>
          </div>
        </Card>
      )}

      <Card>
        <Tabla
          cols={['ID', 'Reserva', 'Huésped', 'Fecha', 'Concepto', 'Responsable', 'Moneda', 'Importe', '']}
          filas={dataFiltrada.map(g => {
            const res = reservas.find(r => r.id === g.reserva_id)
            return [
              <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{g.id}</span>,
              g.reserva_id,
              <span style={{ fontSize: 12 }}>{res?.huesped_nombre || '—'}</span>,
              g.fecha,
              g.concepto,
              <Pill text={g.responsable} color={g.responsable === 'Huesped' ? 'danger' : 'warn'} />,
              <Pill text={g.moneda} color={g.moneda === 'USD' ? 'blue' : 'gray'} />,
              <span style={{ fontWeight: 'bold', color: g.responsable === 'Huesped' ? D : W }}>{fmtM(g.importe, g.moneda)}</span>,
              <button onClick={() => eliminar(g.id)} style={{ padding: '3px 8px', borderRadius: 5, background: D, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✗</button>
            ]
          })}
        />
      </Card>
    </>
  )
}

// ─── MÓDULO CONTRATOS ─────────────────────────────────────
function Contratos({ reservas, propiedades, propietarios, perfil = {} }) {
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
      const saldo = Number(res.monto_total||0) - Number(res.seña||0)
      const hoy = new Date().toLocaleDateString('es-AR')

      cargarLogoBase64(logoB64 => {
        if (logoB64) {
          try { doc.addImage(logoB64, 'JPEG', margin, 10, 20, 20) } catch(e){}
        }

      // Header
      doc.setFillColor(26,63,160); doc.rect(0,0,W,45,'F')
      doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(16)
      doc.text('GASP', margin+24, 20)
      doc.setFont('helvetica','normal'); doc.setFontSize(9)
      doc.text('Gestion de Alquileres Sistema Profesional', margin+24, 26)
      doc.text((perfil.nombre_completo||'Administrador')+'  |  '+(perfil.titulo||'')+'  |  '+(perfil.matricula||''), margin+24, 31)
      doc.text((perfil.ciudad||'')+(perfil.provincia?', '+perfil.provincia:'')+'  |  '+(perfil.email_contacto||''), margin+24, 36)

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
      txt(`El precio total de la locación es de ${fmtM(res.monto_total, res.moneda)} (${res.moneda}). En concepto de seña se abona la suma de ${fmtM(res.seña, res.moneda)}, y el saldo de ${fmtM(saldo, res.moneda)} deberá abonarse al momento del ingreso. La seña tiene carácter confirmatorio de la reserva.`)
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
              ['Seña / Saldo', fmtM(res.seña, res.moneda) + ' / ' + fmtM(Number(res.monto_total||0)-Number(res.seña||0), res.moneda)],
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

// ─── APP PRINCIPAL ───────────────────────────────────────
const NAV = [
  { id: 'dashboard',      label: 'Panel principal',   seccion: 'Principal' },
  { id: 'calendario',     label: 'Calendario',         seccion: 'Principal' },
  { id: 'reservas',       label: 'Reservas',           seccion: 'Gestión' },
  { id: 'propiedades',    label: 'Propiedades',        seccion: 'Gestión' },
  { id: 'propietarios',   label: 'Propietarios',       seccion: 'Gestión' },
  { id: 'gastos',         label: 'Gastos',             seccion: 'Gestión' },
  { id: 'contratos',      label: 'Contratos',          seccion: 'Gestión' },
  { id: 'checklist',      label: 'Checklist',          seccion: 'Gestión' },
  { id: 'notificaciones', label: 'Notificaciones',     seccion: 'Gestión' },
  { id: 'liquidaciones',  label: 'Liquidaciones',      seccion: 'Reportes' },
  { id: 'caja',           label: 'Caja',               seccion: 'Reportes' },
  { id: 'mi_perfil',      label: 'Mi perfil',          seccion: 'Admin' },
  { id: 'clientes',       label: 'Clientes GASP',      seccion: 'Admin' },
]

export default function App() {
  const [session, setSession] = useState('loading')
  const [pagina, setPagina] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [reservas, setReservas] = useState([])
  const [propiedades, setPropiedades] = useState([])
  const [propietarios, setPropietarios] = useState([])
  const [perfil, setPerfil] = useState({})
  const [cajaMov, setCajaMov] = useState([])
  const [gastos, setGastos] = useState([])
  const [esSuperAdmin, setEsSuperAdmin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session || null)
      if (data?.session) {
        setEsSuperAdmin(data.session.user.email === SUPERADMIN)
        cargar(true)
      }
    }).catch(() => setSession(null))
  }, [])

  async function cargar(inicial = false) {
    if (inicial) setLoading(true)
    const [r1, r2, r3, r4, r5, r6] = await Promise.all([
      supabase.from('reservas_temp').select('*').order('fecha_entrada', { ascending: false }),
      supabase.from('prop_temp').select('*').eq('activo', true),
      supabase.from('prop_owners_temp').select('*').eq('activo', true),
      supabase.from('perfil_admin').select('*').single(),
      supabase.from('caja_temp').select('*').order('fecha', { ascending: false }),
      supabase.from('gastos_temp').select('*').order('fecha_carga', { ascending: false }),
    ])
    setReservas(r1.data || [])
    setPropiedades(r2.data || [])
    setPropietarios(r3.data || [])
    setPerfil(r4.data || {})
    setCajaMov(r5?.data || [])
    setGastos(r6?.data || [])
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
    else {
      setSession(data.session)
      setEsSuperAdmin(data.session.user.email === SUPERADMIN)
      await cargar(true)
    }
  }

  if (session === 'loading') return (
    <div style={{ minHeight: '100vh', background: '#0A0F1E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A7ABF', fontFamily: 'Arial', fontSize: 14 }}>
      Cargando GASP Temporario...
    </div>
  )

  if (!session) return (
    <div style={{ minHeight: '100vh', background: '#0A0F1E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo.jpeg" alt="GASP" style={{ width: 70, height: 70, objectFit: 'contain', borderRadius: 12, marginBottom: 12 }} />
          <div style={{ fontSize: 28, fontWeight: 'bold', color: '#fff', letterSpacing: 2 }}>GASP</div>
          <div style={{ fontSize: 13, color: '#4A7ABF', marginTop: 4 }}>Alquileres Temporarios</div>
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
            <button type="submit" disabled={loginLoading} style={{ width: '100%', padding: 12, borderRadius: 8, background: loginLoading ? '#aaa' : B, color: '#fff', border: 'none', cursor: loginLoading ? 'wait' : 'pointer', fontSize: 15, fontWeight: 'bold' }}>
              {loginLoading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )

  const navVisible = NAV.filter(n => n.id !== 'clientes' || esSuperAdmin)
  const secciones = [...new Set(navVisible.map(n => n.seccion))]

  return (
    <>
      <Head>
        <title>GASP Temporario</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Segoe UI, Arial, sans-serif' }}>

        {/* SIDEBAR — fondo negro, módulos azul */}
        <div style={{ width: 220, background: '#080D1A', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '18px 16px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '0.5px solid #1A2540' }}>
            <img src="/logo.jpeg" alt="GASP" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8 }} />
            <img src="/logo.jpeg" alt="" data-gasp-logo="1" style={{ display: 'none' }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 'bold', color: '#fff', letterSpacing: 1 }}>GASP</div>
              <div style={{ fontSize: 9, color: '#4A7ABF', marginTop: 1 }}>Alquileres Temporarios</div>
            </div>
          </div>
          <nav style={{ flex: 1, padding: '8px 0' }}>
            {secciones.map(sec => (
              <div key={sec}>
                <div style={{ fontSize: 9, fontWeight: 'bold', letterSpacing: 2, color: '#2A3A5A', padding: '10px 16px 4px', textTransform: 'uppercase' }}>{sec}</div>
                {navVisible.filter(n => n.seccion === sec).map(n => (
                  <button key={n.id} onClick={() => setPagina(n.id)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 16px', border: 'none', background: pagina === n.id ? '#1A3FA0' : 'transparent', color: pagina === n.id ? '#fff' : '#4A7ABF', cursor: 'pointer', fontSize: 13, borderRadius: 0, borderLeft: pagina === n.id ? '3px solid #6A9FE0' : '3px solid transparent' }}>
                    {n.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div style={{ padding: 16, borderTop: '0.5px solid #1A2540' }}>
            <div style={{ fontSize: 11, color: '#2A3A5A', marginBottom: 6 }}>{session?.user?.email}</div>
            <button onClick={cerrarSesion} style={{ fontSize: 12, color: '#4A7ABF', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Cerrar sesión</button>
          </div>
        </div>

        {/* CONTENIDO */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#fff', padding: '14px 24px', borderBottom: '0.5px solid #E8ECF0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '3px solid #1A3FA0' }}>
            <div style={{ fontWeight: 'bold', fontSize: 16, color: '#1A3FA0' }}>{NAV.find(n => n.id === pagina)?.label}</div>
            <button onClick={() => cargar()} style={{ padding: '5px 14px', borderRadius: 6, border: '0.5px solid #ddd', background: '#F7F8FA', cursor: 'pointer', fontSize: 12 }}>↺ Actualizar</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#888', fontSize: 14 }}>Cargando...</div>
            ) : (
              <>
                {pagina === 'dashboard'      && <Dashboard reservas={reservas} propiedades={propiedades} />}
                {pagina === 'calendario'     && <Calendario reservas={reservas} propiedades={propiedades} />}
                {pagina === 'reservas'       && <Reservas data={reservas} propiedades={propiedades} gastos={gastos} perfil={perfil} onRefresh={cargar} />}
                {pagina === 'propiedades'    && <Propiedades data={propiedades} onRefresh={cargar} />}
                {pagina === 'propietarios'   && <Propietarios data={propietarios} onRefresh={cargar} />}
                {pagina === 'gastos'         && <Gastos data={gastos} reservas={reservas} onRefresh={cargar} />}
                {pagina === 'contratos'      && <Contratos reservas={reservas} propiedades={propiedades} propietarios={propietarios} perfil={perfil} />}
                {pagina === 'checklist'      && <Checklist reservas={reservas} onRefresh={cargar} />}
                {pagina === 'notificaciones' && <Notificaciones reservas={reservas} propiedades={propiedades} />}
                {pagina === 'caja'           && <Caja data={cajaMov} perfil={perfil} onRefresh={cargar} />}
                {pagina === 'mi_perfil'      && <PerfilAdmin perfil={perfil} onRefresh={cargar} session={session} />}
                {pagina === 'liquidaciones'  && <Liquidaciones reservas={reservas} propiedades={propiedades} propietarios={propietarios} gastos={gastos} perfil={perfil} />}
                {pagina === 'clientes'       && esSuperAdmin && <ClientesGasp session={session} />}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
