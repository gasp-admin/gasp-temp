import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import Head from 'next/head'
import dynamic from 'next/dynamic'




if (typeof window === 'undefined') {}


const SUPERADMIN_EMAIL = 'javiergp@live.com.ar'

// ─── COLORES ────────────────────────────────────────────
const G = '#1B6B35'
const GM = '#2E8B4A'
const B = '#1A3FA0'
const W = '#C07D10'
const D = '#B83030'

// Forzar renderizado solo en el cliente

const fmt = (n) => n ? '$' + Number(n).toLocaleString('es-AR') : '$0'

const fmtUSD = (n) => 'USD ' + Number(n || 0).toLocaleString('es-AR')

const fmtM = (n, mon) => mon === 'USD' ? fmtUSD(n) : fmt(n)

function GestionUsuarios({ session, supabase: supabaseP }) {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'operador' })
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState(null)
  const [editando, setEditando] = useState(null)

  const EF = 'https://payzqbkydmvovjxlznuq.supabase.co/functions/v1/gestionar-usuarios-empresa'

  const ROLES = [
    { value: 'gerente',      label: 'Gerente',         desc: 'Acceso total', color: '#1B6B35' },
    { value: 'supervisor',   label: 'Supervisor',       desc: 'Todo menos configuración', color: '#1A3FA0' },
    { value: 'operador',     label: 'Operador',         desc: 'Reservas, checklist, caja', color: '#C07D10' },
    { value: 'contador',     label: 'Contador',         desc: 'Liquidaciones y reportes', color: '#7C3AED' },
    { value: 'solo_lectura', label: 'Solo lectura',     desc: 'Ver sin modificar', color: '#888' },
  ]

  async function llamar(accion, body = {}) {
    try {
      // Usar la session prop directamente, fallback a getSession()
      let token = session?.access_token
      if (!token) {
        const { data } = await (supabaseP || supabase).auth.getSession()
        token = data?.session?.access_token
      }
      if (!token) return { ok: false, error: 'Sin sesión activa' }
      const resp = await fetch(EF, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ accion, ...body })
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        return { ok: false, error: err.error || `Error ${resp.status}` }
      }
      return resp.json()
    } catch(e) {
      return { ok: false, error: e.message }
    }
  }

  async function cargar() {
    setLoading(true)
    try {
      const d = await llamar('listar')
      if (d.ok) setUsuarios(d.usuarios || [])
      else if (d.error) setMsg({ ok: false, text: d.error })
    } catch(e) { setMsg({ ok: false, text: 'Error: ' + e.message }) }
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  async function crearUsuario() {
    if (!form.nombre || !form.email || !form.password) {
      setMsg({ ok: false, text: 'Completá nombre, email y contraseña' }); return
    }
    setGuardando(true)
    const d = await llamar('crear', form)
    if (d.ok) {
      setMsg({ ok: true, text: d.mensaje })
      setForm({ nombre: '', email: '', password: '', rol: 'operador' })
      cargar()
    } else setMsg({ ok: false, text: d.error })
    setGuardando(false)
  }

  async function cambiarEstado(u, activo) {
    const d = await llamar('actualizar', { usuario_id: u.usuario_id, activo })
    if (d.ok) { cargar(); setMsg({ ok: true, text: activo ? '✓ Usuario activado' : '✓ Usuario desactivado' }) }
    else setMsg({ ok: false, text: d.error })
  }

  async function cambiarRol(u, rol) {
    const d = await llamar('actualizar', { usuario_id: u.usuario_id, rol })
    if (d.ok) { cargar(); setMsg({ ok: true, text: '✓ Rol actualizado' }) }
    else setMsg({ ok: false, text: d.error })
  }

  async function eliminarUsuario(u) {
    if (!confirm(`¿Eliminar el usuario ${u.nombre}? Esta acción no se puede deshacer.`)) return
    const d = await llamar('eliminar', { usuario_id: u.usuario_id })
    if (d.ok) { cargar(); setMsg({ ok: true, text: '✓ Usuario eliminado' }) }
    else setMsg({ ok: false, text: d.error })
  }

  const getRol = v => ROLES.find(r => r.value === v) || ROLES[2]

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '0.5px solid #E8ECF0', marginBottom: 16 }}>
      <div style={{ fontWeight: 'bold', fontSize: 15, marginBottom: 14 }}>👥 Gestión de equipo</div>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
        Agregá operadores, supervisores o contadores con acceso limitado al sistema.
        Cada usuario tiene su propio email y contraseña.
      </div>

      {msg && (
        <div style={{ background: msg.ok ? '#E8F5EE' : '#FCEAEA', border: '0.5px solid ' + (msg.ok ? '#9DDCB4' : '#F09595'), borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: msg.ok ? G : D }}>
          {msg.text}
        </div>
      )}

      {/* Formulario nuevo usuario */}
      <div style={{ background: '#F8F9FA', borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 12 }}>+ Nuevo usuario</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Nombre completo</div>
            <input value={form.nombre} onChange={e => setForm(f => ({...f, nombre: e.target.value}))}
              placeholder="Ej: María González" style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 7, fontSize: 13 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Email</div>
            <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
              placeholder="maria@empresa.com" style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 7, fontSize: 13 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Contraseña inicial</div>
            <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))}
              placeholder="Mínimo 8 caracteres" style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 7, fontSize: 13 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Rol</div>
            <select value={form.rol} onChange={e => setForm(f => ({...f, rol: e.target.value}))}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 7, fontSize: 13 }}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}
            </select>
          </div>
        </div>
        <button onClick={crearUsuario} disabled={guardando}
          style={{ padding: '9px 20px', borderRadius: 8, background: G, color: '#fff', border: 'none', fontWeight: 'bold', fontSize: 13, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1 }}>
          {guardando ? '⏳ Creando...' : '+ Crear usuario'}
        </button>
      </div>

      {/* Lista de usuarios */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 30, color: '#888' }}>Cargando usuarios...</div>
      ) : usuarios.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 30, color: '#bbb', fontSize: 14 }}>
          Aún no hay usuarios del equipo. Creá el primero arriba.
        </div>
      ) : (
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 10 }}>Usuarios activos ({usuarios.filter(u => u.activo).length})</div>
          {usuarios.map(u => {
            const rol = getRol(u.rol)
            return (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '0.5px solid #eee', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: 14, color: u.activo ? '#1A1A1A' : '#aaa' }}>{u.nombre}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{u.email}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ background: rol.color + '20', color: rol.color, borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 'bold' }}>{rol.label}</span>
                  <select value={u.rol} onChange={e => cambiarRol(u, e.target.value)}
                    style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  <button onClick={() => cambiarEstado(u, !u.activo)}
                    style={{ padding: '4px 10px', borderRadius: 6, background: u.activo ? '#FEF3E2' : '#E8F5EE', color: u.activo ? W : G, border: '1px solid ' + (u.activo ? '#E8A951' : '#9DDCB4'), cursor: 'pointer', fontSize: 12 }}>
                    {u.activo ? 'Suspender' : 'Activar'}
                  </button>
                  <button onClick={() => eliminarUsuario(u)}
                    style={{ padding: '4px 10px', borderRadius: 6, background: '#FCEAEA', color: D, border: '1px solid #F09595', cursor: 'pointer', fontSize: 12 }}>
                    Eliminar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Info de roles */}
      <div style={{ marginTop: 20, background: '#F0FBF4', borderRadius: 10, padding: 14 }}>
        <div style={{ fontWeight: 'bold', fontSize: 12, color: G, marginBottom: 8 }}>📋 Permisos por rol</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {[
            { rol: 'Gerente', perms: ['Todo'] },
            { rol: 'Supervisor', perms: ['Reservas','Propiedades','Caja','Liquidaciones'] },
            { rol: 'Operador', perms: ['Reservas','Checklist','Caja','Notificaciones'] },
            { rol: 'Contador', perms: ['Liquidaciones','Reportes','Caja'] },
            { rol: 'Solo lectura', perms: ['Ver todo'] },
          ].map((r, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 8, padding: 10 }}>
              <div style={{ fontWeight: 'bold', fontSize: 11, marginBottom: 6 }}>{r.rol}</div>
              {r.perms.map(p => <div key={p} style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>✓ {p}</div>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
function nextId(items, prefix) {
  const nums = (items || [])
    .map(x => x.id || '')
    .filter(id => id.startsWith(prefix))
    .map(id => parseInt(id.slice(prefix.length), 10))
    .filter(n => !isNaN(n))
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return prefix + String(max + 1).padStart(3, '0')
}

function Pill({ text, color }) {
  const map = {
    ok:     { bg: '#E8F5EE', c: '#1B6B35' },
    warn:   { bg: '#FEF3E2', c: '#8A5C10' },
    danger: { bg: '#FCEAEA', c: '#8A2020' },
    blue:   { bg: '#E8EEFB', c: '#1A3FA0' },
    gray:   { bg: '#F2F4F6', c: '#555' },
  }
  const s = map[color] || map.gray
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 'bold', background: s.bg, color: s.c }}>
      {text}
    </span>
  )
}

function Card({ children, style }) {
  return (
    <div style={{ background: '#fff', border: '0.5px solid #ddd', borderRadius: 10, padding: 16, ...style }}>
      {children}
    </div>
  )
}

function Tabla({ cols, filas }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#F2F4F6' }}>
            {cols.map((c, i) => (
              <th key={i} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 'bold', color: '#888', textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '0.5px solid #ddd' }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 ? (
            <tr><td colSpan={cols.length} style={{ padding: 20, textAlign: 'center', color: '#bbb', fontSize: 13 }}>Sin registros</td></tr>
          ) : filas.map((fila, i) => (
            <tr key={i} style={{ borderBottom: '0.5px solid #eee' }}>
              {fila.map((cel, j) => (
                <td key={j} style={{ padding: '9px 12px', verticalAlign: 'middle' }}>{cel}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Input({ label, value, onChange, type }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{label}</div>
      <input
        type={type || 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}
      />
    </div>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{label}</div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}
      >
        {options.map((o, i) => <option key={i} value={o.val !== undefined ? o.val : o}>{o.label || o}</option>)}
      </select>
    </div>
  )
}

function BtnPrimario({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{ padding: '7px 16px', borderRadius: 7, background: G, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}
    >
      {children}
    </button>
  )
}

function BtnSecundario({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{ padding: '7px 16px', borderRadius: 7, background: '#fff', border: '0.5px solid #ddd', cursor: 'pointer', fontSize: 13 }}
    >
      {children}
    </button>
  )
}

// ──────────────────────────────────────────────────────────
// MÓDULOS
// ──────────────────────────────────────────────────────────


// Función de módulo — disponible para todos los componentes
function calcularProxActualizacion(fechaInicio, periodicidad) {
    if (!fechaInicio || !periodicidad) return null
    const meses = { 'Mensual': 1, 'Trimestral': 3, 'Cuatrimestral': 4, 'Semestral': 6, 'Anual': 12 }
    const m = meses[periodicidad] || 12
    const inicio = new Date(fechaInicio)
    const hoyMs = new Date()
    let prox = new Date(inicio)
    while (prox <= hoyMs) {
      prox.setMonth(prox.getMonth() + m)
    }
    const ant = new Date(prox)
    ant.setMonth(ant.getMonth() - m)
    return ant.toISOString().split('T')[0]
  }

  async function calcularActualizaciones() {
    setCargandoIndices(true)
    let indicesData = null
    try {
      const resp = await fetch('/api/indices')
      const data = await resp.json()
      if (data.ok) {
        // Nueva Edge Function devuelve iclArray/ipcArray con variación % mensual
        const iclArr = data.iclArray || []
        const ipcArr = data.ipcArray || []

        // Fallback: si vienen vacíos, parsear del raw
        const buildArray = (rawArr) => {
          if (!Array.isArray(rawArr) || rawArr.length === 0) return []
          const arr = rawArr.map(x => ({
            fecha: x.fecha || x.d || '',
            valor: parseFloat(x.indice_ipc || x.valor || x.v || 0)
          })).filter(x => x.fecha && !isNaN(x.valor) && x.valor > 0)
          // Si los valores parecen ser nivel acumulado (>20) calcular variación
          const firstVal = arr[0]?.valor || 0
          if (firstVal > 20 && arr.length > 1) {
            // Son niveles — calcular variación mensual
            return arr.slice(1).map((item, i) => ({
              fecha: item.fecha,
              valor: parseFloat(((item.valor - arr[i].valor) / arr[i].valor * 100).toFixed(4))
            }))
          }
          return arr
        }

        const iclFinal = iclArr.length > 0 ? iclArr : buildArray(data.raw?.icl)
        const ipcFinal = ipcArr.length > 0 ? ipcArr : buildArray(data.raw?.ipc)

        const iclUlt = iclFinal[iclFinal.length - 1] || {}
        const ipcUlt = ipcFinal[ipcFinal.length - 1] || {}

        indicesData = {
          icl_valor: iclUlt.valor || 0,
          icl_fecha: iclUlt.fecha || '',
          ipc_valor: ipcUlt.valor || 0,
          ipc_fecha: ipcUlt.fecha || '',
          iclArray: iclFinal,
          ipcArray: ipcFinal,
        }
        setIndices(indicesData)
        console.log('Índices cargados — ICL meses:', iclFinal.length, '| IPC meses:', ipcFinal.length)
        if (iclFinal.length > 0) console.log('ICL último:', iclUlt)
        if (ipcFinal.length > 0) console.log('IPC último:', ipcUlt)
      } else {
        alert('Error al consultar índices: ' + data.error)
      }
    } catch (err) {
      alert('Error: ' + err.message)
    }
    setCargandoIndices(false)
    return indicesData
  }

function Dashboard({ props, conts, pags, gasts, inquilinos = [] }) {
  const hoy = new Date()
  const hoyStr = hoy.toISOString().split('T')[0]
  const hace30 = new Date(Date.now() - 30*86400000).toISOString().split('T')[0]
  const hace90 = new Date(Date.now() - 90*86400000).toISOString().split('T')[0]
  const en30  = new Date(Date.now() + 30*86400000).toISOString().split('T')[0]
  const en60  = new Date(Date.now() + 60*86400000).toISOString().split('T')[0]
  const en90  = new Date(Date.now() + 90*86400000).toISOString().split('T')[0]

  // ── KPIs ──────────────────────────────────────────────────
  const totalCobrado  = pags.reduce((s, p) => s + Number(p.total_cobrado||0), 0)
  const totalComision = pags.reduce((s, p) => s + Number(p.monto_comision||0), 0)
  const pagsUltimos30 = pags.filter(p => p.fecha_pago >= hace30)
  const cobrado30     = pagsUltimos30.reduce((s, p) => s + Number(p.total_cobrado||0), 0)
  const comision30    = pagsUltimos30.reduce((s, p) => s + Number(p.monto_comision||0), 0)

  // ── Alertas de contratos ───────────────────────────────────
  const contsVigentes = conts.filter(c => c.estado === 'Vigente')
  const vencen30  = contsVigentes.filter(c => c.fecha_vencimiento >= hoyStr && c.fecha_vencimiento <= en30)
  const vencen90  = contsVigentes.filter(c => c.fecha_vencimiento > en30 && c.fecha_vencimiento <= en90)
  const morosos   = conts.filter(c => {
    if (c.estado !== 'Vigente') return false
    const pagosContrato = pags.filter(p => p.contrato_id === c.id)
    if (pagosContrato.length === 0) return false
    const ultimo = pagosContrato.sort((a,b) => (b.fecha_pago||'').localeCompare(a.fecha_pago||''))[0]
    if (!ultimo?.fecha_pago) return false
    const diasSinPagar = Math.floor((Date.now() - new Date(ultimo.fecha_pago)) / 86400000)
    return diasSinPagar > 40
  })

  // ── Gráfico pagos últimos 6 meses ─────────────────────────
  const meses6 = Array.from({length: 6}, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (5 - i), 1)
    const key = d.toISOString().slice(0, 7)
    const label = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][d.getMonth()]
    const cobrado = pags.filter(p => p.fecha_pago?.startsWith(key))
      .reduce((s, p) => s + Number(p.total_cobrado||0), 0)
    return { key, label, cobrado }
  })
  const maxCobrado = Math.max(...meses6.map(m => m.cobrado), 1)

  // ── Vencimientos próximos ──────────────────────────────────
  const getPropDir = id => props.find(p => p.id === id)?.direccion || id
  const getInqNombre = id => inquilinos.find(i => i.id === id)?.apellido_nombre || '—'

  return (
    <>
      {/* Alertas */}
      {(morosos.length > 0 || vencen30.length > 0) && (
        <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
          {morosos.length > 0 && (
            <div style={{flex:1,minWidth:160,background:'#FCEAEA',border:'1px solid #F09595',borderRadius:10,padding:'12px 16px'}}>
              <div style={{fontSize:28,fontWeight:'bold',color:D}}>{morosos.length}</div>
              <div style={{fontSize:13,color:D,fontWeight:'bold'}}>Inquilino{morosos.length>1?'s':''} moroso{morosos.length>1?'s':''} ⚠️</div>
              <div style={{fontSize:11,color:'#aaa',marginTop:2}}>Más de 40 días sin pagar</div>
            </div>
          )}
          {vencen30.length > 0 && (
            <div style={{flex:1,minWidth:160,background:'#FEF3E2',border:'1px solid #E8A951',borderRadius:10,padding:'12px 16px'}}>
              <div style={{fontSize:28,fontWeight:'bold',color:W}}>{vencen30.length}</div>
              <div style={{fontSize:13,color:W,fontWeight:'bold'}}>Contrato{vencen30.length>1?'s':''} venc. en 30d 📋</div>
              <div style={{fontSize:11,color:'#aaa',marginTop:2}}>Renovación urgente</div>
            </div>
          )}
          {vencen90.length > 0 && (
            <div style={{flex:1,minWidth:160,background:'#EBF3FF',border:'1px solid #9DBBF5',borderRadius:10,padding:'12px 16px'}}>
              <div style={{fontSize:28,fontWeight:'bold',color:B}}>{vencen90.length}</div>
              <div style={{fontSize:13,color:B,fontWeight:'bold'}}>Contrato{vencen90.length>1?'s':''} venc. en 90d 📅</div>
              <div style={{fontSize:11,color:'#aaa',marginTop:2}}>Planificación renovación</div>
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:14}}>
        {[
          {label:'Propiedades activas', value:props.length, sub:'en cartera', color:'#1A1A1A', icon:'🏠'},
          {label:'Contratos vigentes', value:contsVigentes.length, sub:`de ${conts.length} totales`, color:G, icon:'📋'},
          {label:'Cobrado (30d)', value:fmt(cobrado30), sub:'alquileres', color:'#1A1A1A', icon:'💰'},
          {label:'Mi comisión (30d)', value:fmt(comision30), sub:'últimos 30 días', color:G, icon:'✓'},
        ].map((k,i) => (
          <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div style={{fontSize:11,color:'#888',marginBottom:6}}>{k.label}</div>
              <span style={{fontSize:18}}>{k.icon}</span>
            </div>
            <div style={{fontSize:22,fontWeight:'bold',color:k.color}}>{k.value}</div>
            <div style={{fontSize:11,color:'#aaa',marginTop:4}}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>

        {/* Gráfico cobros últimos 6 meses */}
        <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
          <div style={{fontWeight:'bold',fontSize:14,marginBottom:12}}>📈 Cobros últimos 6 meses</div>
          <div style={{display:'flex',gap:6,alignItems:'flex-end',height:80}}>
            {meses6.map((m,i) => (
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                {m.cobrado > 0 && <div style={{fontSize:9,color:G}}>${Math.round(m.cobrado/1000)}k</div>}
                <div style={{
                  width:'100%',
                  height: Math.max(4, Math.round(m.cobrado/maxCobrado*70))+'px',
                  background: i===5 ? B : G,
                  borderRadius:'3px 3px 0 0',
                  minHeight:4,
                }} title={`${m.label}: ${fmt(m.cobrado)}`} />
                <div style={{fontSize:9,color:i===5?B:'#888',fontWeight:i===5?'bold':'normal'}}>{m.label}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:12,paddingTop:10,borderTop:'0.5px solid #eee',display:'flex',justifyContent:'space-between',fontSize:12}}>
            <span style={{color:'#888'}}>Total acumulado</span>
            <span style={{fontWeight:'bold',color:G}}>{fmt(totalCobrado)}</span>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginTop:4}}>
            <span style={{color:'#888'}}>Mis comisiones</span>
            <span style={{fontWeight:'bold',color:B}}>{fmt(totalComision)}</span>
          </div>
        </div>

        {/* Próximos vencimientos */}
        <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
          <div style={{fontWeight:'bold',fontSize:14,marginBottom:12}}>📋 Próximos vencimientos</div>
          {[...vencen30, ...vencen90].length === 0 ? (
            <div style={{textAlign:'center',padding:20,color:'#bbb',fontSize:13}}>Sin vencimientos próximos</div>
          ) : [...vencen30, ...vencen90].slice(0,6).map((c,i) => {
            const diasRest = Math.ceil((new Date(c.fecha_vencimiento) - Date.now()) / 86400000)
            return (
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:i<5?'0.5px solid #f0f0f0':'none'}}>
                <div>
                  <div style={{fontSize:13,fontWeight:'bold'}}>{getPropDir(c.propiedad_id)}</div>
                  <div style={{fontSize:11,color:'#888'}}>{getInqNombre(c.inquilino_id)}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <span style={{background:(diasRest<=30?W:B)+'20',color:diasRest<=30?W:B,borderRadius:4,padding:'2px 8px',fontSize:11,fontWeight:'bold'}}>
                    {diasRest}d
                  </span>
                </div>
              </div>
            )
          })}
        </div>

      </div>

      {/* Propiedades y pagos recientes */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
          <div style={{fontWeight:'bold',fontSize:13,marginBottom:12}}>🏠 Propiedades ({props.length})</div>
          {props.slice(0,5).map((p,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:i<Math.min(props.length,5)-1?'0.5px solid #f0f0f0':'none'}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:G,flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:'bold'}}>{p.direccion}</div>
                <div style={{fontSize:11,color:'#888'}}>{p.localidad}</div>
              </div>
            </div>
          ))}
          {props.length > 5 && <div style={{fontSize:12,color:'#aaa',marginTop:8,textAlign:'center'}}>+ {props.length-5} más</div>}
        </div>
        <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
          <div style={{fontWeight:'bold',fontSize:13,marginBottom:12}}>💰 Últimos pagos</div>
          {pags.slice(0,6).map((p,i) => (
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:i<5?'0.5px solid #f0f0f0':'none',fontSize:13}}>
              <span style={{color:'#888'}}>{p.periodo||p.fecha_pago||'—'}</span>
              <span style={{fontWeight:'bold',color:G}}>{fmt(Number(p.total_cobrado||0))}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function Propiedades({ data, onRefresh }) {
  const [form, setForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const vacio = { id: '', direccion: '', localidad: 'Pinamar', tipo: 'Departamento', superficie_m2: '', ambientes: '', estado: 'Disponible', comision_pct: 5, observaciones: '' }
  const [f, setF] = useState(vacio)

  function editar(p) {
    setF({ id: p.id, direccion: p.direccion || '', localidad: p.localidad || 'Pinamar', tipo: p.tipo || 'Departamento', superficie_m2: p.superficie_m2 || '', ambientes: p.ambientes || '', estado: p.estado || 'Disponible', comision_pct: p.comision_pct || 5, observaciones: p.observaciones || '' })
    setEditando(p.id); setForm(true)
  }

  async function guardar() {
    if (!f.direccion) return alert('Complete la Dirección')
    if (editando) {
      const { error } = await supabase.from('propiedades').update({
        direccion: f.direccion, localidad: f.localidad, tipo: f.tipo,
        superficie_m2: Number(f.superficie_m2) || null, ambientes: Number(f.ambientes) || null,
        estado: f.estado, comision_pct: Number(f.comision_pct), observaciones: f.observaciones
      }).eq('id', editando)
      if (error) return alert('Error: ' + error.message)
    } else {
      const adminId = (await supabase.auth.getUser()).data.user?.id
      let nuevoId = nextId(data, 'PROP')
      let { error } = await supabase.from('propiedades').insert([{ ...f, id: nuevoId, superficie_m2: Number(f.superficie_m2) || null, ambientes: Number(f.ambientes) || null, comision_pct: Number(f.comision_pct), activo: true, admin_id: adminId }])
      if (error && error.code === '23505') {
        nuevoId = 'PROP-' + Date.now().toString(36).toUpperCase()
        const r2 = await supabase.from('propiedades').insert([{ ...f, id: nuevoId, superficie_m2: Number(f.superficie_m2) || null, ambientes: Number(f.ambientes) || null, comision_pct: Number(f.comision_pct), activo: true, admin_id: adminId }])
        error = r2.error
      }
      if (error) return alert('Error: ' + error.message)
    }
    setForm(false); setF(vacio); setEditando(null); onRefresh()
  }

  async function darBaja(p) {
    if (!window.confirm('¿Dar de baja la propiedad ' + p.direccion + '?')) return
    const { error } = await supabase.from('propiedades').update({ activo: false }).eq('id', p.id)
    if (error) return alert('Error: ' + error.message)
    onRefresh()
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#888' }}>{data.length} propiedades</div>
        <BtnPrimario onClick={() => { setF(vacio); setEditando(null); setForm(true) }}>+ Nueva propiedad</BtnPrimario>
      </div>

      {form && (
        <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 12 }}>{editando ? 'Editar propiedad — ' + editando : 'Nueva propiedad'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {!editando && <div style={{ gridColumn: 'span 2', fontSize: 11, color: '#888', marginBottom: -4 }}>ID auto: {nextId(data, 'PROP')}</div>}
            <Input label="Dirección completa" value={f.direccion} onChange={v => setF({ ...f, direccion: v })} />
            <Input label="Localidad" value={f.localidad} onChange={v => setF({ ...f, localidad: v })} />
            <Select label="Tipo" value={f.tipo} onChange={v => setF({ ...f, tipo: v })} options={['Departamento', 'Casa', 'Local comercial', 'Cochera', 'Otro']} />
            <Input label="Superficie m²" value={f.superficie_m2} onChange={v => setF({ ...f, superficie_m2: v })} type="number" />
            <Input label="Ambientes" value={f.ambientes} onChange={v => setF({ ...f, ambientes: v })} type="number" />
            <Select label="Estado" value={f.estado} onChange={v => setF({ ...f, estado: v })} options={['Disponible', 'Ocupada', 'En reparación']} />
            <Input label="Comisión %" value={f.comision_pct} onChange={v => setF({ ...f, comision_pct: v })} type="number" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <BtnPrimario onClick={guardar}>{editando ? 'Guardar cambios' : 'Guardar'}</BtnPrimario>
            <BtnSecundario onClick={() => { setForm(false); setF(vacio); setEditando(null) }}>Cancelar</BtnSecundario>
          </div>
        </div>
      )}

      <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
        <Tabla
          cols={['ID', 'Dirección', 'Localidad', 'Tipo', 'Estado', 'Comisión', 'Acciones']}
          filas={data.map(p => [
            <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.id}</span>,
            <span style={{ fontWeight: 'bold' }}>{p.direccion}</span>,
            p.localidad,
            p.tipo,
            <Pill text={p.estado} color={p.estado === 'Ocupada' ? 'ok' : p.estado === 'Disponible' ? 'blue' : 'warn'} />,
            `${p.comision_pct}%`,
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => editar(p)} style={{ padding: '3px 8px', borderRadius: 5, background: W, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✏ Editar</button>
              <button onClick={() => darBaja(p)} style={{ padding: '3px 8px', borderRadius: 5, background: D, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✗ Baja</button>
            </div>,
          ])}
        />
      </div>
    </>
  )
}

async function procesarArchivoContrato(file) {
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = e => resolve(e.target.result.split(',')[1])
    reader.readAsDataURL(file)
  })
  const resp = await fetch('/api/procesar-contrato', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64, mediaType: 'application/pdf' })
  })
  const text = await resp.text()
  let data
  try { data = JSON.parse(text) } catch(e) { throw new Error('Respuesta invalida del servidor: ' + text.substring(0, 100)) }
  if (data && data.ok && data.datos) return data.datos
  throw new Error(data?.error || 'Sin datos en respuesta')
}

function HistorialContrato({ contratoId }) {
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('historial_actualizaciones')
      .select('*')
      .eq('contrato_id', contratoId)
      .order('fecha', { ascending: false })
      .then(({ data }) => { setHistorial(data || []); setLoading(false) })
  }, [contratoId])

  if (loading) return <div style={{ padding: '10px 12px', fontSize: 12, color: '#888' }}>Cargando historial...</div>

  if (historial.length === 0) return (
    <div style={{ padding: '10px 12px', fontSize: 12, color: '#888', fontStyle: 'italic' }}>
      Sin actualizaciones registradas para este contrato.
    </div>
  )

  return (
    <div style={{ padding: '10px 4px' }}>
      <div style={{ fontSize: 12, fontWeight: 'bold', color: '#5A4A8A', marginBottom: 8 }}>
        📋 Historial de actualizaciones — {contratoId}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#EDE8FF' }}>
            {['Fecha', 'Índice', 'Porcentaje', 'Monto anterior', 'Monto nuevo', 'Período'].map(h => (
              <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: '600', color: '#5A4A8A', fontSize: 11 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {historial.map((h, i) => (
            <tr key={h.id} style={{ borderBottom: '0.5px solid #DDD8EE', background: i % 2 === 0 ? '#FAF8FF' : '#fff' }}>
              <td style={{ padding: '6px 10px' }}>{h.fecha}</td>
              <td style={{ padding: '6px 10px' }}><span style={{ background: '#E8EEFB', color: '#1A3FA0', padding: '2px 6px', borderRadius: 4, fontWeight: 'bold', fontSize: 10 }}>{h.indice}</span></td>
              <td style={{ padding: '6px 10px', color: '#1B6B35', fontWeight: 'bold' }}>{Number(h.porcentaje).toFixed(2)}%</td>
              <td style={{ padding: '6px 10px', color: '#888' }}>${Number(h.monto_anterior).toLocaleString('es-AR')}</td>
              <td style={{ padding: '6px 10px', fontWeight: 'bold' }}>${Number(h.monto_nuevo).toLocaleString('es-AR')}</td>
              <td style={{ padding: '6px 10px', color: '#666' }}>{h.periodo || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function generarPagaresPDF(contrato, inquilinos, propietarios, propiedades, perfil = {}) {
  const inq = inquilinos.find(q => q.id === contrato.inquilino_id)
  const prop = propietarios.find(p => p.id === contrato.propietario_id)
  const propiedad = propiedades.find(p => p.id === contrato.propiedad_id)
  if (!inq) return alert('El contrato no tiene inquilino asignado')

  const meses = contrato.tipo_pago === 'Anual anticipado' ? 1 : 12
  const periodicidad = contrato.periodicidad || 'Mensual'
  const periodicidadMeses = { 'Mensual': 1, 'Trimestral': 3, 'Cuatrimestral': 4, 'Semestral': 6, 'Anual': 12 }
  const cantidadPagares = Math.ceil(meses / (periodicidadMeses[periodicidad] || 1))

  const script = document.createElement('script')
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
  script.onload = () => {
    const { jsPDF } = window.jspdf
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const W = 210, margin = 14
    const pagaresXPag = 2 // 2 pagarés por hoja A4
    const altoPagare = 128
    let y = 0, paginaActual = 0

    function dibujarPagare(idx, montoBase) {
      const posY = (idx % pagaresXPag) * altoPagare + 8
      const fechaVenc = new Date(contrato.fecha_inicio || new Date())
      const periodosMap = { 'Mensual': 1, 'Trimestral': 3, 'Cuatrimestral': 4, 'Semestral': 6, 'Anual': 12 }
      const mesesAdd = (periodosMap[periodicidad] || 1) * idx
      fechaVenc.setMonth(fechaVenc.getMonth() + mesesAdd)
      const fechaStr = fechaVenc.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
      const montoStr = contrato.moneda === 'USD'
        ? 'USD ' + Number(montoBase).toLocaleString('es-AR')
        : '$' + Number(montoBase).toLocaleString('es-AR')
      const montoLetras = contrato.moneda === 'USD' ? 'Dólares estadounidenses' : 'Pesos argentinos'

      // Borde del pagaré
      doc.setDrawColor(180, 180, 180)
      doc.setLineWidth(0.5)
      doc.rect(margin, posY, W - margin * 2, altoPagare - 6, 'S')

      // Header verde
      doc.setFillColor(27, 107, 53)
      doc.rect(margin, posY, W - margin * 2, 12, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.text('PAGARÉ Nº ' + String(idx + 1).padStart(3, '0'), margin + 4, posY + 8)
      doc.setFontSize(9)
      doc.text('Contrato: ' + contrato.id + '  |  Cuota ' + (idx + 1) + ' de ' + cantidadPagares, W - margin - 4, posY + 8, { align: 'right' })

      let ly = posY + 18

      // Monto destacado
      doc.setTextColor(27, 107, 53)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.text(montoStr, margin + 4, ly)
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.setFont('helvetica', 'normal')
      doc.text('(' + montoLetras + ')', margin + 4, ly + 6)
      ly += 14

      // Línea separadora
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.3)
      doc.line(margin + 2, ly, W - margin - 2, ly)
      ly += 6

      // Datos principales
      doc.setTextColor(50, 50, 50)
      doc.setFontSize(9)
      const datos = [
        ['Deudor (inquilino):', (inq?.apellido_nombre || '—') + (inq?.dni ? '  —  DNI: ' + inq.dni : '')],
        ['Acreedor (propietario):', prop?.apellido_nombre || '—'],
        ['Inmueble:', propiedad?.direccion || contrato.propiedad_id || '—'],
        ['Concepto:', 'Alquiler período ' + (idx + 1) + ' · Contrato ' + contrato.id],
        ['Vence el:', fechaStr],
      ]
      datos.forEach(([label, valor]) => {
        doc.setFont('helvetica', 'bold')
        doc.text(label, margin + 4, ly)
        doc.setFont('helvetica', 'normal')
        doc.text(String(valor), margin + 50, ly)
        ly += 6
      })
      ly += 4

      // Cláusula legal
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(7.5)
      doc.setTextColor(120, 120, 120)
      const clausula = 'Sin protesto. En caso de mora, se devengarán intereses punitorios equivalentes al ' +
        (contrato.interes_mora || 3) + '% mensual sobre el capital adeudado, conforme Ley 23.091 y CCCN Art. 1221.'
      const clausulaSplit = doc.splitTextToSize(clausula, W - margin * 2 - 8)
      doc.text(clausulaSplit, margin + 4, ly)
      ly += clausulaSplit.length * 4 + 4

      // Firma y lugar
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(50, 50, 50)
      const ciudad = perfil.ciudad || 'Pinamar'
      doc.text('Lugar y fecha de emisión: ' + ciudad + ', ' + new Date().toLocaleDateString('es-AR'), margin + 4, ly)

      // Firma deudor
      const xFirma = margin + 4
      const yFirma = posY + altoPagare - 16
      doc.setDrawColor(150, 150, 150)
      doc.setLineWidth(0.3)
      doc.line(xFirma, yFirma, xFirma + 60, yFirma)
      doc.setFontSize(7.5)
      doc.text('Firma y aclaración del deudor', xFirma, yFirma + 4)
      doc.text(inq?.apellido_nombre || '—', xFirma, yFirma + 8)
      doc.text('DNI: ' + (inq?.dni || '—'), xFirma, yFirma + 12)

      // Firma acreedor / administrador
      const xFirma2 = W - margin - 70
      doc.line(xFirma2, yFirma, xFirma2 + 60, yFirma)
      doc.text('Firma y sello del acreedor / administrador', xFirma2, yFirma + 4)
      doc.text(perfil.nombre_completo || prop?.apellido_nombre || '—', xFirma2, yFirma + 8)
      doc.text((perfil.matricula || ''), xFirma2, yFirma + 12)

      // Línea de corte
      if (idx % pagaresXPag === 0 && idx < cantidadPagares - 1) {
        const yCorte = posY + altoPagare - 2
        doc.setLineDash([2, 2])
        doc.setDrawColor(180, 180, 180)
        doc.setLineWidth(0.3)
        doc.line(margin, yCorte, W - margin, yCorte)
        doc.setLineDash([])
        doc.setFontSize(7)
        doc.setTextColor(180, 180, 180)
        doc.text('✂ Cortar aquí', W / 2, yCorte + 2, { align: 'center' })
      }
    }

    for (let i = 0; i < cantidadPagares; i++) {
      if (i > 0 && i % pagaresXPag === 0) doc.addPage()
      dibujarPagare(i, contrato.monto_actual || contrato.monto_inicial || 0)
    }

    doc.save('Pagares_' + contrato.id + '_' + (inq?.apellido_nombre || '').replace(/ /g, '_') + '.pdf')
  }
  if (!document.querySelector('script[src*="jspdf"]')) document.head.appendChild(script)
  else script.onload()
}

function Contratos({ data, propietarios, inquilinos, propiedades, perfil = {}, onRefresh }) {
  const hoy = new Date()
  const [form, setForm] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [iaMsg, setIaMsg] = useState('')
  const [iaData, setIaData] = useState(null)
  const [id, setId] = useState('')
  const [propiedad_id, setPropiedadId] = useState('')
  const [inquilino_id, setInquilinoId] = useState('')
  const [propietario_id, setPropietarioId] = useState('')
  const [fecha_inicio, setFechaInicio] = useState('')
  const [fecha_vencimiento, setFechaVencimiento] = useState('')
  const [monto_inicial, setMontoInicial] = useState('')
  const [monto_actual, setMontoActual] = useState('')
  const [deposito, setDeposito] = useState('')
  const [comision_pct, setComisionPct] = useState('5')
  const [indice, setIndice] = useState('ICL')
  const [periodicidad, setPeriodicidad] = useState('Cuatrimestral')
  const [moneda, setMoneda] = useState('ARS')
  const [tipo_pago, setTipoPago] = useState('Mensual')
  const [dia_vencimiento, setDiaVencimiento] = useState('10')
  const [interes_mora, setInteresMora] = useState('3')
  const [indices, setIndices] = useState(null)
  const [cargandoIndices, setCargandoIndices] = useState(false)
  const [sugerencias, setSugerencias] = useState({})
  const [editando, setEditando] = useState(null)
  const [verHistorial, setVerHistorial] = useState(null)

  function editarContrato(c) {
    setId(c.id)
    setPropiedadId(c.propiedad_id || '')
    setInquilinoId(c.inquilino_id || '')
    setPropietarioId(c.propietario_id || '')
    setFechaInicio(c.fecha_inicio || '')
    setFechaVencimiento(c.fecha_vencimiento || '')
    setMontoInicial(c.monto_inicial || '')
    setMontoActual(c.monto_actual || '')
    setDeposito(c.deposito || '')
    setComisionPct(c.comision_pct || '5')
    setIndice(c.indice_actualizacion || 'ICL')
    setPeriodicidad(c.periodicidad || 'Cuatrimestral')
    setMoneda(c.moneda || 'ARS')
    setTipoPago(c.tipo_pago || 'Mensual')
    setDiaVencimiento(c.dia_vencimiento || '10')
    setInteresMora(c.interes_mora || '3')
    setEditando(c.id)
    setIaData(null)
    setIaMsg('')
    setForm(true)
  }

  // Estados para alta rapida
  const [nuevoProp, setNuevoProp] = useState(false)
  const [nuevoInq, setNuevoInq] = useState(false)
  const [nuevaProp, setNuevaProp] = useState(false)
  const [fp, setFp] = useState({ id: '', apellido_nombre: '', dni_cuit: '', telefono: '', email: '', cbu: '', banco: '' })
  const [fi, setFi] = useState({ id: '', apellido_nombre: '', dni: '', telefono: '', email: '', garante_nombre: '', garante_dni: '' })
  const [fpr, setFpr] = useState({ id: '', direccion: '', localidad: 'Pinamar', tipo: 'Departamento', comision_pct: 5 })

  // ── FIX: alta rápida con retry en duplicate key (error 23505)
  async function guardarPropietarioRapido() {
    if (!fp.apellido_nombre) return alert('Complete el nombre')
    const adminId = (await supabase.auth.getUser()).data.user?.id
    let nuevoId = nextId(propietarios, 'PR')
    let { error } = await supabase.from('propietarios').insert([{ ...fp, id: nuevoId, activo: true, admin_id: adminId }])
    if (error && error.code === '23505') {
      nuevoId = 'PR-' + Date.now().toString(36).toUpperCase()
      const r2 = await supabase.from('propietarios').insert([{ ...fp, id: nuevoId, activo: true, admin_id: adminId }])
      error = r2.error
    }
    if (error) return alert('Error: ' + error.message)
    setPropietarioId(nuevoId)
    setFp({ id: '', apellido_nombre: '', dni_cuit: '', telefono: '', email: '', cbu: '', banco: '' })
    setNuevoProp(false)
    onRefresh()
  }

  async function guardarInquilinoRapido() {
    if (!fi.apellido_nombre) return alert('Complete el nombre')
    const adminId = (await supabase.auth.getUser()).data.user?.id
    let nuevoId = nextId(inquilinos, 'IQ')
    let { error } = await supabase.from('inquilinos').insert([{ ...fi, id: nuevoId, activo: true, admin_id: adminId }])
    if (error && error.code === '23505') {
      nuevoId = 'IQ-' + Date.now().toString(36).toUpperCase()
      const r2 = await supabase.from('inquilinos').insert([{ ...fi, id: nuevoId, activo: true, admin_id: adminId }])
      error = r2.error
    }
    if (error) return alert('Error: ' + error.message)
    setInquilinoId(nuevoId)
    setFi({ id: '', apellido_nombre: '', dni: '', telefono: '', email: '', garante_nombre: '', garante_dni: '' })
    setNuevoInq(false)
    onRefresh()
  }

  async function guardarPropiedadRapida() {
    if (!fpr.direccion) return alert('Complete la dirección')
    const adminId = (await supabase.auth.getUser()).data.user?.id
    let nuevoId = nextId(propiedades, 'PROP')
    let { error } = await supabase.from('propiedades').insert([{ ...fpr, id: nuevoId, activo: true, comision_pct: Number(fpr.comision_pct) || 5, admin_id: adminId }])
    if (error && error.code === '23505') {
      nuevoId = 'PROP-' + Date.now().toString(36).toUpperCase()
      const r2 = await supabase.from('propiedades').insert([{ ...fpr, id: nuevoId, activo: true, comision_pct: Number(fpr.comision_pct) || 5, admin_id: adminId }])
      error = r2.error
    }
    if (error) return alert('Error: ' + error.message)
    setPropiedadId(nuevoId)
    setFpr({ id: '', direccion: '', localidad: 'Pinamar', tipo: 'Departamento', comision_pct: 5 })
    setNuevaProp(false)
    onRefresh()
  }

  function calcularProxActualizacion(fechaInicio, periodicidad) {
    if (!fechaInicio || !periodicidad) return null
    const meses = { 'Mensual': 1, 'Trimestral': 3, 'Cuatrimestral': 4, 'Semestral': 6, 'Anual': 12 }
    const m = meses[periodicidad] || 12
    const inicio = new Date(fechaInicio)
    const hoyMs = new Date()
    let prox = new Date(inicio)
    while (prox <= hoyMs) {
      prox.setMonth(prox.getMonth() + m)
    }
    const ant = new Date(prox)
    ant.setMonth(ant.getMonth() - m)
    return ant.toISOString().split('T')[0]
  }

  async function calcularActualizaciones() {
    setCargandoIndices(true)
    let indicesData = null
    try {
      const resp = await fetch('/api/indices')
      const data = await resp.json()
      if (data.ok) {
        // Nueva Edge Function devuelve iclArray/ipcArray con variación % mensual
        const iclArr = data.iclArray || []
        const ipcArr = data.ipcArray || []

        // Fallback: si vienen vacíos, parsear del raw
        const buildArray = (rawArr) => {
          if (!Array.isArray(rawArr) || rawArr.length === 0) return []
          const arr = rawArr.map(x => ({
            fecha: x.fecha || x.d || '',
            valor: parseFloat(x.indice_ipc || x.valor || x.v || 0)
          })).filter(x => x.fecha && !isNaN(x.valor) && x.valor > 0)
          // Si los valores parecen ser nivel acumulado (>20) calcular variación
          const firstVal = arr[0]?.valor || 0
          if (firstVal > 20 && arr.length > 1) {
            // Son niveles — calcular variación mensual
            return arr.slice(1).map((item, i) => ({
              fecha: item.fecha,
              valor: parseFloat(((item.valor - arr[i].valor) / arr[i].valor * 100).toFixed(4))
            }))
          }
          return arr
        }

        const iclFinal = iclArr.length > 0 ? iclArr : buildArray(data.raw?.icl)
        const ipcFinal = ipcArr.length > 0 ? ipcArr : buildArray(data.raw?.ipc)

        const iclUlt = iclFinal[iclFinal.length - 1] || {}
        const ipcUlt = ipcFinal[ipcFinal.length - 1] || {}

        indicesData = {
          icl_valor: iclUlt.valor || 0,
          icl_fecha: iclUlt.fecha || '',
          ipc_valor: ipcUlt.valor || 0,
          ipc_fecha: ipcUlt.fecha || '',
          iclArray: iclFinal,
          ipcArray: ipcFinal,
        }
        setIndices(indicesData)
        console.log('Índices cargados — ICL meses:', iclFinal.length, '| IPC meses:', ipcFinal.length)
        if (iclFinal.length > 0) console.log('ICL último:', iclUlt)
        if (ipcFinal.length > 0) console.log('IPC último:', ipcUlt)
      } else {
        alert('Error al consultar índices: ' + data.error)
      }
    } catch (err) {
      alert('Error: ' + err.message)
    }
    setCargandoIndices(false)
    return indicesData
  }


  function calcularSugerencia(contrato, indicesOverride = null) {
    const ind = indicesOverride || indices
    if (!ind) return
    const monto = Number(contrato.monto_actual) || 0
    if (!monto) return alert('El contrato no tiene monto actual')

    const indiceContrato = contrato.indice_actualizacion
    const periodicidad = contrato.periodicidad || 'Anual'
    const mesesMap = { 'Mensual': 1, 'Trimestral': 3, 'Cuatrimestral': 4, 'Semestral': 6, 'Anual': 12 }
    const meses = mesesMap[periodicidad] || 12

    let pct = 0

    function acumularUltimosN(arr, n) {
      if (!arr || arr.length === 0) return null
      // Detectar si los valores son niveles absolutos (>20) o variaciones % (<20)
      const primerValor = parseFloat(arr[0]?.valor)
      const esNivel = !isNaN(primerValor) && primerValor > 20

      if (esNivel) {
        // Son niveles: calcular variación entre el nivel hace N períodos y el último
        const desde = arr.length > n ? arr[arr.length - n - 1] : arr[0]
        const hasta = arr[arr.length - 1]
        const vDesde = parseFloat(desde?.valor)
        const vHasta = parseFloat(hasta?.valor)
        if (isNaN(vDesde) || isNaN(vHasta) || vDesde === 0) return null
        return ((vHasta - vDesde) / vDesde) * 100
      } else {
        // Son variaciones mensuales: acumular compuesto
        const ultimos = arr.slice(-n)
        const factor = ultimos.reduce((acc, item) => {
          const v = parseFloat(item.valor)
          return isNaN(v) ? acc : acc * (1 + v / 100)
        }, 1)
        return ((factor - 1) * 100)
      }
    }

    if (indiceContrato === 'ICL') {
      const arr = ind.iclArray || []
      if (arr.length === 0) return alert('No hay datos históricos de ICL. Presione "↻ Consultar índices ICL/IPC" primero.')
      const acum = acumularUltimosN(arr, meses)
      if (acum === null) return alert('No se pudo calcular el ICL acumulado.')
      pct = acum
    } else if (indiceContrato === 'IPC') {
      const arr = ind.ipcArray || []
      if (arr.length === 0) return alert('No hay datos históricos de IPC. Presione "↻ Consultar índices ICL/IPC" primero.')
      const acum = acumularUltimosN(arr, meses)
      if (acum === null) return alert('No se pudo calcular el IPC acumulado.')
      pct = acum
    } else {
      const manual = window.prompt(
        'Índice "' + indiceContrato + '" — Periodicidad: ' + periodicidad + ' (' + meses + ' meses)\n' +
        'Ingrese el porcentaje de aumento acumulado (ej: 25.5):'
      )
      if (!manual) return
      pct = parseFloat(manual)
      if (isNaN(pct)) return alert('Porcentaje inválido')
    }

    const nuevo = Math.round(monto * (1 + pct / 100))
    setSugerencias(prev => ({ ...prev, [contrato.id]: { nuevo, pct: pct.toFixed(2), meses, periodicidad } }))
  }

  async function aplicarActualizacion(contratoId, nuevoMonto) {
    const contrato = data.find(c => c.id === contratoId)
    if (!window.confirm('¿Confirma actualizar el monto del contrato ' + contratoId + ' a ' + fmt(nuevoMonto) + '?')) return
    const { error } = await supabase.from('contratos').update({ monto_actual: nuevoMonto }).eq('id', contratoId)
    if (error) return alert('Error: ' + error.message)

    // Registrar en historial
    const adminId = (await supabase.auth.getUser()).data.user?.id
    const sug = sugerencias[contratoId]
    const pct = sug?.porcentaje || 0
    const montoAnterior = Number(contrato?.monto_actual) || 0
    const indiceUsado = contrato?.indice_actualizacion || 'ICL'
    const hoy = new Date().toISOString().split('T')[0]
    await supabase.from('historial_actualizaciones').insert([{
      id: 'HA-' + Date.now().toString(36).toUpperCase(),
      contrato_id: contratoId,
      admin_id: adminId,
      fecha: hoy,
      indice: indiceUsado,
      porcentaje: pct,
      monto_anterior: montoAnterior,
      monto_nuevo: nuevoMonto,
      periodo: new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
    }])

    setSugerencias(prev => { const n = { ...prev }; delete n[contratoId]; return n })
    onRefresh()
    alert('Monto actualizado correctamente')
  }

  async function darBajaContrato(c) {
    if (!window.confirm('¿Finalizar el contrato ' + c.id + '? Se marcará como Finalizado.')) return
    const { error } = await supabase.from('contratos').update({ estado: 'Finalizado' }).eq('id', c.id)
    if (error) return alert('Error: ' + error.message)
    if (c.propiedad_id) await supabase.from('propiedades').update({ estado: 'Disponible' }).eq('id', c.propiedad_id)
    onRefresh()
  }

  function resetForm() {
    setId(''); setPropiedadId(''); setInquilinoId(''); setPropietarioId('')
    setFechaInicio(''); setFechaVencimiento(''); setMontoInicial(''); setMontoActual('')
    setDeposito(''); setComisionPct('5'); setIndice('ICL'); setPeriodicidad('Cuatrimestral'); setMoneda('ARS'); setTipoPago('Mensual')
    setDiaVencimiento('10'); setInteresMora('3')
    setIaData(null); setIaMsg(''); setForm(false); setEditando(null)
  }

  async function handleArchivo(e) {
    const file = e.target.files[0]
    if (!file) return
    setProcesando(true)
    setIaMsg('Analizando el contrato con IA...')
    try {
      const datos = await procesarArchivoContrato(file)
      setIaData(datos)
      setFechaInicio(datos.fecha_inicio || '')
      setFechaVencimiento(datos.fecha_vencimiento || '')
      setMontoInicial(datos.monto_inicial || '')
      setMontoActual(datos.monto_inicial || '')
      setDeposito(datos.deposito || '')
      setIndice(datos.indice_actualizacion || 'ICL')
      setPeriodicidad(datos.periodicidad || 'Cuatrimestral')
      setMoneda(datos.moneda === 'USD' ? 'USD' : 'ARS')
      setIaMsg('IA completo los datos. Moneda detectada: ' + (datos.moneda === 'USD' ? 'DOLARES (USD)' : 'PESOS (ARS)') + '. Complete los IDs y guarde.')
      setForm(true)
    } catch (err) {
      setIaMsg('Error: ' + (err.message || 'No se pudo procesar el archivo'))
    }
    setProcesando(false)
  }

  async function guardar() {
    if (!propiedad_id) return alert('Seleccione la Propiedad')
    const datosContrato = {
      propiedad_id: propiedad_id || null,
      inquilino_id: inquilino_id || null,
      propietario_id: propietario_id || null,
      fecha_inicio, fecha_vencimiento,
      monto_inicial: Number(monto_inicial) || 0,
      monto_actual: Number(monto_actual) || 0,
      deposito: Number(deposito) || 0,
      comision_pct: Number(comision_pct) || 5,
      indice_actualizacion: indice,
      periodicidad, moneda, tipo_pago,
      dia_vencimiento: Number(dia_vencimiento) || 10,
      interes_mora: Number(interes_mora) || 3,
    }
    if (editando) {
      const { error } = await supabase.from('contratos').update(datosContrato).eq('id', editando)
      if (error) return alert('Error: ' + error.message)
      if (propiedad_id) await supabase.from('propiedades').update({ estado: 'Ocupada' }).eq('id', propiedad_id)
    } else {
      // ID con retry: primero intenta secuencial, luego timestamp si hay conflicto
      const adminId = (await supabase.auth.getUser()).data.user?.id
      let nuevoId = nextId(data, 'CT')
      let { error } = await supabase.from('contratos').insert([{ ...datosContrato, id: nuevoId, estado: 'Vigente', admin_id: adminId }])
      if (error && error.code === '23505') {
        // Duplicate key — usar ID con timestamp
        nuevoId = 'CT-' + Date.now().toString(36).toUpperCase()
        const r2 = await supabase.from('contratos').insert([{ ...datosContrato, id: nuevoId, estado: 'Vigente', admin_id: adminId }])
        error = r2.error
      }
      if (error) return alert('Error: ' + error.message)
      if (propiedad_id) await supabase.from('propiedades').update({ estado: 'Ocupada' }).eq('id', propiedad_id)
    }
    resetForm()
    onRefresh()
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#888' }}>{data.length} contratos</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ padding: '7px 14px', borderRadius: 7, background: '#1A3FA0', color: '#fff', cursor: procesando ? 'wait' : 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {procesando ? 'Analizando...' : 'Cargar PDF (IA)'}
            <input type="file" accept=".pdf" onChange={handleArchivo} style={{ display: 'none' }} disabled={procesando} />
          </label>
          <BtnPrimario onClick={() => { setForm(true); setIaData(null); setIaMsg('') }}>+ Nuevo contrato</BtnPrimario>
        </div>
      </div>

      {iaMsg && (
        <div style={{ background: iaMsg.includes('Error') ? '#FCEAEA' : '#E8EEFB', border: '0.5px solid ' + (iaMsg.includes('Error') ? '#F09595' : '#B5CAF5'), borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: iaMsg.includes('Error') ? '#8A2020' : '#1A3FA0' }}>
          {iaMsg}
        </div>
      )}

      {iaData && typeof iaData === 'object' && (
        <div style={{ background: '#E8F5EE', border: '1px solid #9DDCB4', borderRadius: 8, padding: 14, marginBottom: 14 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, color: '#1B6B35', marginBottom: 8 }}>Datos detectados por IA</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, fontSize: 12 }}>
            {[['Propietario', iaData.propietario_nombre || ''], ['Inquilino', iaData.inquilino_nombre || ''], ['Garante', iaData.garante_nombre || ''], ['Propiedad', iaData.propiedad_direccion || ''], ['Inicio', iaData.fecha_inicio || ''], ['Vencimiento', iaData.fecha_vencimiento || ''], ['Moneda', iaData.moneda === 'USD' ? 'DOLARES (USD)' : 'PESOS (ARS)'], ['Monto', iaData.monto_inicial || ''], ['Deposito', iaData.deposito || '']].map(([k, v], i) => v ? (
              <div key={i} style={{ display: 'flex', gap: 6 }}>
                <span style={{ color: '#5A8A65', minWidth: 80 }}>{k}:</span>
                <span style={{ fontWeight: 'bold' }}>{v}</span>
              </div>
            ) : null)}
          </div>
        </div>
      )}

      {form && (
        <div style={{ background:'#fff', border:'0.5px solid #E8ECF0', borderRadius:12, padding:16,  marginBottom: 16, border: '1px solid #1B6B35' }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 12 }}>{editando ? 'Editar contrato — ' + editando : (iaData ? 'Complete los IDs y guarde' : 'Nuevo contrato')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {!editando && <div style={{ gridColumn: 'span 2', fontSize: 11, color: '#888', marginBottom: -4 }}>ID auto: {nextId(data, 'CT')}</div>}

            {/* PROPIEDAD */}
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                <span>Propiedad</span>
                <button onClick={() => setNuevaProp(!nuevaProp)} style={{ fontSize: 10, background: 'none', border: 'none', color: G, cursor: 'pointer', fontWeight: 'bold' }}>+ Nueva propiedad</button>
              </div>
              <select value={propiedad_id} onChange={e => setPropiedadId(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                <option value="">Seleccionar...</option>
                {propiedades.map(p => <option key={p.id} value={p.id}>{p.direccion} — {p.localidad}</option>)}
              </select>
            </div>

            {/* INQUILINO */}
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                <span>Inquilino{iaData?.inquilino_nombre ? <span style={{ color: B, marginLeft: 6 }}>IA: {iaData.inquilino_nombre}</span> : null}</span>
                <button onClick={() => setNuevoInq(!nuevoInq)} style={{ fontSize: 10, background: 'none', border: 'none', color: G, cursor: 'pointer', fontWeight: 'bold' }}>+ Nuevo inquilino</button>
              </div>
              <select value={inquilino_id} onChange={e => setInquilinoId(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                <option value="">Seleccionar...</option>
                {inquilinos.map(i => <option key={i.id} value={i.id}>{i.apellido_nombre}</option>)}
              </select>
            </div>

            {/* PROPIETARIO */}
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                <span>Propietario{iaData?.propietario_nombre ? <span style={{ color: B, marginLeft: 6 }}>IA: {iaData.propietario_nombre}</span> : null}</span>
                <button onClick={() => setNuevoProp(!nuevoProp)} style={{ fontSize: 10, background: 'none', border: 'none', color: G, cursor: 'pointer', fontWeight: 'bold' }}>+ Nuevo propietario</button>
              </div>
              <select value={propietario_id} onChange={e => setPropietarioId(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                <option value="">Seleccionar...</option>
                {propietarios.map(p => <option key={p.id} value={p.id}>{p.apellido_nombre}</option>)}
              </select>
            </div>

          </div>

          {/* FORMULARIO RAPIDO PROPIEDAD */}
          {nuevaProp && (
            <div style={{ background: '#F0FBF4', border: '1px solid #9DDCB4', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontWeight: 'bold', fontSize: 12, color: G, marginBottom: 8 }}>Nueva propiedad</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                <Input label="Dirección" value={fpr.direccion} onChange={v => setFpr({ ...fpr, direccion: v })} />
                <Input label="Localidad" value={fpr.localidad} onChange={v => setFpr({ ...fpr, localidad: v })} />
                <Select label="Tipo" value={fpr.tipo} onChange={v => setFpr({ ...fpr, tipo: v })} options={['Departamento', 'Casa', 'Local comercial', 'Cochera', 'Otro']} />
                <Input label="Comision %" value={fpr.comision_pct} onChange={v => setFpr({ ...fpr, comision_pct: v })} type="number" />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <BtnPrimario onClick={guardarPropiedadRapida}>Guardar y seleccionar</BtnPrimario>
                <BtnSecundario onClick={() => setNuevaProp(false)}>Cancelar</BtnSecundario>
              </div>
            </div>
          )}

          {/* FORMULARIO RAPIDO INQUILINO */}
          {nuevoInq && (
            <div style={{ background: '#F0FBF4', border: '1px solid #9DDCB4', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontWeight: 'bold', fontSize: 12, color: G, marginBottom: 8 }}>Nuevo inquilino{iaData?.inquilino_nombre ? <span style={{ color: '#888', fontWeight: 'normal', marginLeft: 8 }}>Detectado: {iaData.inquilino_nombre}</span> : null}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                <Input label="Apellido y nombre" value={fi.apellido_nombre} onChange={v => setFi({ ...fi, apellido_nombre: v })} />
                <Input label="DNI" value={fi.dni} onChange={v => setFi({ ...fi, dni: v })} />
                <Input label="Teléfono" value={fi.telefono} onChange={v => setFi({ ...fi, telefono: v })} />
                <Input label="Email" value={fi.email} onChange={v => setFi({ ...fi, email: v })} />
                <Input label="Garante (nombre)" value={fi.garante_nombre} onChange={v => setFi({ ...fi, garante_nombre: v })} />
                <Input label="Garante (DNI)" value={fi.garante_dni} onChange={v => setFi({ ...fi, garante_dni: v })} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <BtnPrimario onClick={guardarInquilinoRapido}>Guardar y seleccionar</BtnPrimario>
                <BtnSecundario onClick={() => setNuevoInq(false)}>Cancelar</BtnSecundario>
              </div>
            </div>
          )}

          {/* FORMULARIO RAPIDO PROPIETARIO */}
          {nuevoProp && (
            <div style={{ background: '#F0FBF4', border: '1px solid #9DDCB4', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontWeight: 'bold', fontSize: 12, color: G, marginBottom: 8 }}>Nuevo propietario{iaData?.propietario_nombre ? <span style={{ color: '#888', fontWeight: 'normal', marginLeft: 8 }}>Detectado: {iaData.propietario_nombre}</span> : null}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                <Input label="Apellido y nombre" value={fp.apellido_nombre} onChange={v => setFp({ ...fp, apellido_nombre: v })} />
                <Input label="DNI / CUIT" value={fp.dni_cuit} onChange={v => setFp({ ...fp, dni_cuit: v })} />
                <Input label="Teléfono" value={fp.telefono} onChange={v => setFp({ ...fp, telefono: v })} />
                <Input label="Email" value={fp.email} onChange={v => setFp({ ...fp, email: v })} />
                <Input label="CBU" value={fp.cbu} onChange={v => setFp({ ...fp, cbu: v })} />
                <Input label="Banco" value={fp.banco} onChange={v => setFp({ ...fp, banco: v })} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <BtnPrimario onClick={guardarPropietarioRapido}>Guardar y seleccionar</BtnPrimario>
                <BtnSecundario onClick={() => setNuevoProp(false)}>Cancelar</BtnSecundario>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <Input label="Fecha inicio (AAAA-MM-DD)" value={fecha_inicio} onChange={setFechaInicio} />
            <Input label="Fecha vencimiento (AAAA-MM-DD)" value={fecha_vencimiento} onChange={setFechaVencimiento} />
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Moneda del contrato</div>
              <select value={moneda} onChange={e => setMoneda(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13, background: moneda === 'USD' ? '#E8EEFB' : '#fff' }}>
                <option value="ARS">Pesos (ARS)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Tipo de pago</div>
              <select value={tipo_pago} onChange={e => setTipoPago(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13, background: tipo_pago === 'Anual anticipado' ? '#FFF5E6' : '#fff' }}>
                <option value="Mensual">Mensual</option>
                <option value="Anual anticipado">Anual anticipado</option>
              </select>
            </div>
            <Input label={moneda === 'USD' ? 'Monto inicial USD' : 'Monto inicial $'} value={monto_inicial} onChange={setMontoInicial} type="number" />
            <Input label={moneda === 'USD' ? 'Monto actual USD' : 'Monto actual $'} value={monto_actual} onChange={setMontoActual} type="number" />
            <Input label={moneda === 'USD' ? 'Deposito USD' : 'Deposito $'} value={deposito} onChange={setDeposito} type="number" />
            <Input label="Comision %" value={comision_pct} onChange={setComisionPct} type="number" />
            <Input label="Dia vencimiento (ej: 10)" value={dia_vencimiento} onChange={setDiaVencimiento} type="number" />
            <Input label="Interes mora % mensual" value={interes_mora} onChange={setInteresMora} type="number" />
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Indice</div>
              <select value={indice} onChange={e => setIndice(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                <option>ICL</option><option>IPC</option><option>CVS</option><option>Negociado</option><option>Otro</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Periodicidad</div>
              <select value={periodicidad} onChange={e => setPeriodicidad(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                <option>Cuatrimestral</option><option>Semestral</option><option>Trimestral</option><option>Anual</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <BtnPrimario onClick={guardar}>{editando ? 'Guardar cambios' : 'Guardar contrato'}</BtnPrimario>
            <BtnSecundario onClick={resetForm}>Cancelar</BtnSecundario>
          </div>
        </div>
      )}

      <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13 }}>Listado de contratos</div>
          <button onClick={calcularActualizaciones} disabled={cargandoIndices} style={{ padding: '5px 12px', borderRadius: 6, background: cargandoIndices ? '#aaa' : B, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12 }}>
            {cargandoIndices ? 'Consultando índices...' : '↻ Consultar índices ICL/IPC'}
          </button>
        </div>

        {indices && (
          <div style={{ background: '#E8EEFB', border: '0.5px solid #B5CAF5', borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontSize: 12, color: B }}>
            <strong>Índices al día:</strong> ICL = {indices.icl_valor} ({indices.icl_fecha}) | IPC mensual = {indices.ipc_valor}% ({indices.ipc_fecha})
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F2F4F6' }}>
                {['ID', 'Propiedad', 'Inquilino', 'Inicio', 'Vencimiento', 'Monto actual', 'Moneda', 'Próx. actualiz.', 'Índice', 'Estado', 'Acción', 'Acciones'].map((h, i) => (
                  <th key={i} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 'bold', color: '#888', textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '0.5px solid #ddd' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 20, textAlign: 'center', color: '#bbb' }}>Sin contratos cargados</td></tr>
              ) : data.map((c, i) => {
                const dias = c.fecha_vencimiento ? Math.ceil((new Date(c.fecha_vencimiento) - hoy) / 86400000) : null
                const color = !dias ? 'gray' : dias < 0 ? 'danger' : dias <= 90 ? 'warn' : 'ok'
                const proxActualizacion = calcularProxActualizacion(c.fecha_inicio, c.periodicidad)
                const necesitaActualizacion = proxActualizacion && new Date(proxActualizacion) <= hoy
                const sugerido = sugerencias[c.id]
                return (
                  <>
                  <tr key={i} style={{ borderBottom: '0.5px solid #eee', background: necesitaActualizacion ? '#FFFBF0' : 'transparent' }}>
                    <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 11 }}>{c.id}</td>
                    <td style={{ padding: '9px 12px', fontSize: 12 }}>
                      {(propiedades?.find(p => p.id === c.propiedad_id)?.direccion || c.propiedad_id || '—')}
                    </td>
                    <td style={{ padding: '9px 12px', fontSize: 12 }}>
                      {(inquilinos?.find(q => q.id === c.inquilino_id)?.apellido_nombre || c.inquilino_id || '—')}
                    </td>
                    <td style={{ padding: '9px 12px', fontSize: 12 }}>{c.fecha_inicio || '|'}</td>
                    <td style={{ padding: '9px 12px', fontSize: 12 }}>{c.fecha_vencimiento || '—'}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 'bold' }}>
                      <span style={{ color: c.moneda === 'USD' ? B : '#1A1A1A' }}>
                        {c.moneda === 'USD' ? 'USD ' : '$'}{Number(c.monto_actual).toLocaleString('es-AR')}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <Pill text={c.moneda || 'ARS'} color={c.moneda === 'USD' ? 'blue' : 'gray'} />
                        {c.tipo_pago === 'Anual anticipado' && <Pill text="ANUAL" color="orange" />}
                      </div>
                    </td>
                    <td style={{ padding: '9px 12px', fontSize: 12 }}>
                      {proxActualizacion ? (
                        <span style={{ color: necesitaActualizacion ? D : G, fontWeight: necesitaActualizacion ? 'bold' : 'normal' }}>
                          {necesitaActualizacion ? '⚠ ' : ''}{proxActualizacion}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '9px 12px' }}><Pill text={c.indice_actualizacion || '—'} color="blue" /></td>
                    <td style={{ padding: '9px 12px' }}><Pill text={c.estado} color={color} /></td>
                    <td style={{ padding: '9px 12px' }}>
                      {sugerido ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ fontSize: 11, color: G, fontWeight: 'bold' }}>Nuevo: {c.moneda === 'USD' ? 'USD ' : '$'}{Number(sugerido.nuevo).toLocaleString('es-AR')} (+{sugerido.pct}% acum. {sugerido.meses || ''}m)</div>
                          <button onClick={() => aplicarActualizacion(c.id, sugerido.nuevo)} style={{ padding: '3px 8px', borderRadius: 5, background: G, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11 }}>
                            Aplicar
                          </button>
                        </div>
                      ) : necesitaActualizacion ? (
                        <button onClick={async () => {
                          const idx = indices || await calcularActualizaciones()
                          if (idx) calcularSugerencia(c, idx)
                        }} style={{ padding: '4px 10px', borderRadius: 5, background: W, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11 }}>
                          ⚡ Calcular ajuste
                        </button>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => editarContrato(c)} style={{ padding: '3px 8px', borderRadius: 5, background: W, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✏ Editar</button>
                        <button onClick={() => darBajaContrato(c)} style={{ padding: '3px 8px', borderRadius: 5, background: D, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✗ Finalizar</button>
                      <button onClick={() => setVerHistorial(c.id === verHistorial ? null : c.id)} style={{ padding: '3px 8px', borderRadius: 5, background: '#5A4A8A', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>📋 Historial</button>
                      <button onClick={() => generarPagaresPDF(c, inquilinos, propietarios, propiedades, perfil)} style={{ padding: '3px 8px', borderRadius: 5, background: '#166534', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>📋 Pagarés</button>
                      {c.inquilino_id && (() => {
                        const inq = inquilinos.find(i => i.id === c.inquilino_id)
                        if (!inq) return null
                        const token = generarTokenPortal(inq.id)
                        const url = 'https://gasp.administracionpinamar.com/inquilino?id=' + inq.id + '&token=' + token
                        return (
                          <button onClick={() => navigator.clipboard.writeText(url).then(() => alert('✓ Link portal inquilino copiado'))}
                            style={{ padding: '3px 8px', borderRadius: 5, background: '#0891B2', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>
                            🔗 Portal Inq.
                          </button>
                        )
                      })()}
                      </div>
                    </td>
                  </tr>
                  {verHistorial === c.id && (
                    <tr>
                      <td colSpan={99} style={{ padding: '0 8px 12px', background: '#F5F0FF' }}>
                        <HistorialContrato contratoId={c.id} />
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

const LOGO_B64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAFNAZADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD7IooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKPwP5UAFFHPoaO3Q0AFFH4H8qMj1oAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKbLIkUbSSMqIoyzMcAD1J7UAOorxr4kftH/DvwkJ7WwvW8R6nHlRb6cQ0at6PN9xfw3H2r5y8e/tNfEnxIkltpc9r4ZtG4xYAtPj3mfkf8BC0mwPuLXdc0bQbNrzW9VstNt1GTLdTrEv5sRXk/if9pr4U6Qjiy1W71yVQcJp1qzKT6b32r+tfCWq6hqOsXhvNVvrrUbk8ma6maZ/zYkioYEknm8qGOSaT+5GpdvyHNLmA+ote/a/1CSQr4f8E28MY6PqF4WY++2MYH/fVcLrX7TfxZ1DcLbU9L0tG7WmnqSPxkLVw+g/Cz4ka5tOm+BtfkVuRJLaGFD/AMCk2iu30r9mT4s3wUz6dpOnBv8An51JSw+ojDfzpagcbqnxc+KGok/a/H2vkE8rDc+Sv5Rhawp/FniqcsbjxTr0pbrv1Oc/+zV7rZfsieM5MG88V+HoB3EUM0p/XbWpbfseamR/pHj6zB/6Z6Ux/nLTswPmttX1hzltX1In1N5Kf/ZqdHretxHMet6qhzn5b6Uf+zV9O/8ADHrhf+SgKW/7BPH/AKNqld/sf6wP+Pbx3p7/APXXTHX+UhpWYHz/AG3jXxlbNm38X+Ioj6rqc3/xVdHpHxt+LGlspt/Heqyhei3Wy4B+u9Sf1rB+JvhT/hB/Gd54XfWbPV7iyCi4mtY2VEcjPlnd/EBjP1xWNommahresWmkaTayXd/eSrDBCg5dieB7DuT2AJoA+o/2e/jR8XvHvje30GS30S/sowJtRvHs2iNvDnGco2NzHhRjk+wNfVtcD8C/htp/wy8ExaPblLjUJyJ9SuwuDPNjt/sqPlUenPUmu+qgCiiimAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAU2V0ijaSR1REBZmY4CgdST2Fee/F/4w+EPhralNWuvterOm6DTLYhp39C3aNf9pvwzXxd8XvjX41+Is0kF/enTdFc4TS7NyIyPSRusrfXj0Wk2B9N/Fj9prwh4YEun+FQnifVBld8Mm20iP+1IPv8A0TP1FfKfxL+K/jrx/K66/rkwsS2V0+1JhtlHug+/9WJrd+GfwD+IvjdY7qPTBoWlsAReamrR7lPeOLG9v0HvX0r4A/Zo+HXhiFLvX0fxJeRDe8l8QluhHOREDjH+8TS1YHxl4P8ABvivxddJaeGPD9/qhLbS8ER8pP8AekOEUfUivdPB37JPim98qbxT4i0/R4jgvBaIbmYeo3HCA+/zV754n+Mfw68H2ZsdNuYdQlhBWOy0pFKKR2LDCLXkvij9o3xVfho9C02x0aI9JJP9IlH54X9DXo4bKcViNYx07vQ5KuNo0tGz0Twv+zR8KdFhVr7SrjXZlAJl1K5Zlz/uJtTHsQa63+3/AIV+A4/sUF/4Z0PaMeRaiNHA/wB1Bn86+QPEPjDxXr5b+2fEep3qscmN5ysf/fC4X9K59UVCdoC59BivZo8NP/l5P7jinm38kT691j9oT4e2W5bSTU9TcdPs9oQD/wACcqK5HUf2noRuGneDJ29Gub5V/RVb+dfNs9zBD/rZVB9M81n3GsLyIYSfd+P0r0IZFgofFd/My+uYqp8Oh9Ez/tLeJ5P+Pbw5o0Q7b5ZX/wAKzL39pfxjFk/ZfD8RH8IhkY/+h188z3t1OTvlYA9l4FQZq1lmCW0DSLxD+KZ9CaR+0f8AEzW9bs9F0bStDuL29nWCBWtZBlmOOz9ByT7A19E/Fnxr/wAK8+GF94k1FoZ76CBY4EUbVnumG1FA5wN3P+6DXh/7FfgIySXXxB1K3G1d1rpe4dT0llH/AKAD/vVwP7aHxBHij4gJ4V06436X4fLJLtPyy3bffPvsGF+pavls1dFVuSjGyX5np0VJRvJnhd/d3N/fXOoX1w091cytPcTP1d2JZmP1JNfZf7HXwjfw3pK+O/ENqU1nUIsWMEi82tu38Rz0dxj6LgdzXkH7Jfwqbxx4tHiHWbQnw7pEoZg6/Ld3A5WMeqrwzfgO5r7sAwMCvLS1NgoooqgCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKz/Eet6T4d0W51nW7+Cw0+1TfNPM2FUf1J6ADkmgC9K6RRtJI6oiAszMcAAdST6V8sfHz9p2O1e58OfDaeKWZcx3GtEBo0PcQA8Mf9s/L6A9a434mfE7x38d/EzeCvh9YXsOgscNCh2Ncrn/AFly/SOP0TOPXJ4r1r4L/szeGvCgttX8YGHxBrceHWEr/odu3+yh/wBYR6tx6AUgPnn4afBn4i/FS+fW5xLZ2F2/mT6xqm4tOT1ZFPzyn34X3r6t+HPwZ+HHwvsRrFxHBd6hbpmXV9UZcx+pUH5Ix9Ofc0z4nfHLw34TeTS9FRNa1VMoUhcC3gI7O47j+6ufwr5n8ceNfEvjW78/xFqLXMatuitlGyCE/wCynTPucn3r18DktfE+8/dj3f6HDiMfTo6LVnvvj79o3RdPZ7PwhYnWZxx9smJjtgf9n+KT8MD3rwbxj4/8XeL2ca7rdxNbuc/ZIz5cC+wRev45Ncxt79qinuIYF3SyKvsTyfwr63CZVhsLqld92eNVxdavp0JhgYAAx7CkkkVF3FgoHUmsi51gnItk/wCBP/hWZLNNMxaRy59+ld0qiWw6WDlLWWhtXGrwRZEQMrfkBWbcaldzcB/LU9l4/WqhHrRWMqje5208NCOyHE5OSST6mg1GzherAU1riIDmRT+NYSr0o/FJHQovoiUnitXwZ4d1Hxd4q07w3pS5ur+cRhsZEa9Wc+yqCfwx3rBN1F3J/AV63+zp8S/A3w4utT1vXdN1a/1idRBai1hQrFD1b5mYfMxwPoo9a8/GZnRp0m4STkaQpNvU+pPif4h034L/AARZ9KSNXsbZLHSoXOPMmI2qT645c/Q18MfDbwhrnxK8e2+hWMrSXd5I095eOMiKPdmSZvz4HdiB3rs/2kPi6nxU1PTBYWN7p+ladG5S3uHQs8zfekO0kfdwo/H1rS+Afxm8NfCrQLmBPBt9qesX0m+7vhdxxgqPuRoCCQoHPuST6V8VJtu7O0+1/BXhrSfCHhew8O6JbiCxsohHGvdj1Z2PdmOST6mtmvln/hsTT8/8k/vgPX+04/8A4mpU/bC0ckBvAmpj6X8R/pRdAfUNFct8KPGdt8QPAth4rtLGexhvDIBBM6s67HZDkrx1WuppgFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRWT4v8RaR4U8O3mva5di1sbRN0j4yzHoFVRyzMcAKOSSBQBD448VaH4M8M3fiHxDepZ2FquWY8s7Hoij+Jj0AFfM8Og+P/2ldeh1zWmuPDPw9gl3WVsT+8uFH8aDozn/AJ6N8q5woPWvRtH8A6x8UvEtt43+KNo9tpNs3maH4WkOVhU9JbodGlIxlOg6Hpiu6+J3xA0D4d6Gs96BLdOu2zsIcB5cccdlQdz0HbJ4qqdOVSSjBXbJlOMFzSegaRpngX4ReCfJtUtdG0q3H7yRzmSeT1ZvvSOfxPpgV88fF341a14t87StCafSNFPyttbbPcj/AG2H3VP90fie1cH4+8a+IPHGtHUtcutwUn7PbJxFbqf4VHr6seT+lc1cXUNsuZnC+g7mvscuyWFC1SvrL8EeFisfOq+SlsPSPYAFHHpUd1dQWw/euAf7vU/lWRfatKwIhPlL/eJ5NYkt4iknLSN6/wD169WvjaVBe9KxlRwE56yNy71id/lt1Ea+p61mO5Zi7sST1JrOa8mbphRUUkp6ySYHqzYFeHX4hprSCuetSwagtNDRa5iUEbs/Sozd/wB1PzNXPDPhPxN4mnEXh/QNT1Mk4zbWzuo+rY2j8TXouh/s2/F3U3Qy6FZ6XE3V76/RSP8AgKbjXkVc7xM/h0OlUYo8pe6lPcD6Co3kdurk/jX0xof7IGuyhW1vxrp9rx8yWVm8xB/3nKj9K7XR/wBkfwNbgHU/EXiLUG7hJIoF/JUJ/WuCeKr1Piky1BLofF+CfekOF64H14r790r9m34RWOPM8OTXxHGbu/mfP4BgP0rpdO+D/wALtPwbbwF4fBHQvZrIfzbNYO73KPzb82HP+tj/AO+xQJIicCRCf94V+odp4Q8J2gxaeGNEg/652ES/yWr0ek6VH/q9Msk/3bdB/SlYD8sQrEcAn8KCMfe4+tfqoLO0AwLWD/v0v+FI9jZMPms7c/WJf8KLAflWGjY4V1Y+xzT0AzXun7Xni+08R+L30fSILaLTNBnNuZIo1Xz7gj942QOQuAg9wxrwsdRWlSlKnZS66kxkpbH37+x//wAm/eHv9+6/9KJK9cryL9j7n9n7w/8A791/6USV67UlBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQA2R1SNnc4VRkmuUh8ONrvia38S+IUZksTnSNOk5S1bobhx0aYjgZ+4OBySa604I5rh/jB8QtO8AeHTdShLjUrgFLG03YMjf3m7hF6k/h1NXTpyqSUIK7ZMpqC5nsVvjN8TdM+H2j4wl3rNwp+yWe7r/ANNH9EB/M8CvjfxPr+o+INVuda16/a4u5zl5H4AHZVHZR0AFZvjjxZc6prd3q+r3rXupXLbpG7D0UD+FQOAB0rjRc6prGpR2dnBPdXMhxHBBGZJGP+yq5NfU4eWFyqF5u8+tvyPJnCrjJdom3qOsCMlYGwP7xHP4CudnvZXlLAlif4mPNey+Af2ZviP4lKXGtxweGrNsEtenfOR3xEp4P+8RXvXgf9lz4c6EUn1pbzxLcj/n9YJBn2iTAP8AwImvMxed1679z3Ud1HCU6S0R8SaNpeseIL4Wei6bfardMf8AVWkLSt+IUHH41674Q/Zj+J+uPG2o21j4ftmXcXvZw8g9vLjyc/UivuHS9L0Tw7p7Q6ZYafpVnGMssESQxqB3OMD8TXkvxH/aW+HnhV5rLTJpvEuox5XytPx5Kt6NMfl/753GvGlKUneTudKVjl/Df7InhK3CP4h8S6zqcgwSltttYye46MxH4iui1uP9nj4PRkXWmaFFqCcrbrD9tvWI9mLMp9yVFfOHxF/aI+I/jBZbSO/TQNOkyDb6YSjlfRpj85/DbXkxO5mdiS7HLsxyWPqSeSfc1F0hn3B4a/an+GN9IttfQaxoabtqvcWgeIDsSYi2Pyr1bw1488FeJFU6D4p0e/LdEhu03/8AfJOf0r8yOhzkUcbw+BuHRu4/GmpBc/VuivzS8KfE74g+Fti6H4w1e2iTpA8/nRf98Sbh+VepeGv2r/H9hIi63pmi6zCBhiEa2lPvuUlf/HaOYD7bor558NftZ+Bb1FGuaPrWjynqVjW5jH4od3/jteo+E/it8OvFO1dE8YaTPK2AIJJhFLk9tj4bP4U7gdrRSKQwDA5B6EdKWmAV5x+0X47/AOEB+GV9qNrKqard/wCh6cD185wfn+iLlvwFej18P/te+Mx4n+J76Nay77Dw+htVx0a4bBmP4YVf+Amu3L8N9ZrqHTqRUnyxueQXiMvhgMxZne4DszHJJOeSfXv+NYidq6vXYRH4b2Afd2ZrlVHIrtz+moYhJdjlwM+eDfmffv7H/H7P/h//AH7r/wBKHr1yvIv2Pv8Ak37w/wD791/6UPXrteKjtCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiivOPHXxMe01Kbwz4E0Sfxb4oQhZLeD5bWyJ/iuZ/up/u53H0FAHU+PvFmj+CvCt54i1y5WG0tl4Gfmlc/djUd2J4r4O1/U/iF8afHd5d6HpF9qVxI+zbAv7q1jB+WPecKij3IJOTX07YfBHVvF+rxeIfjL4mk1+4TmLRrEtBp9sD/AAgZ3N7njPcmvY9C0bSdC0yLTNF06106yhGI4LaIRoPwHf3rajXnSu4aN9SJ01P4j5f+HX7JhcR33xA11yxwxsNNPT2eYj/0EfjX0Z4J8DeEvBdkLXwxoFjpi4wzxRDzX/3nPzN+JrW1zVtM0PTJtT1i/trCyhG6Se4kCIo+pr5q+KX7WOm2hl0/4e6b/aMwyP7RvkZIB7pHwz/U7R9axbu7svY+l9X1PTtH0+XUNUvraxtIVLSTzyBEUe5PFfPHxL/au8OaYstn4G099duxkC8uA0NqPdR9+T8AoPrXyl448aeKPG2pHUPFGtXWpS7sokjYii9kjHyqPoM+9U9J0LVtUYG1tHKH/lo/yp+ZqHKxnVrU6S5pux0PxD+JvjXx7Kx8S69PcW2SUsov3Vsn0jXg/VsmuQjR5pBFFGzueAiLk/kK73SPANvHtl1O5adh/wAsovlX8T1NdZY6dYWEfl2NrFAvfYuCfqeprnliEtj53F8TYelpSXM/wPONK8E6teEPdFLGI/3/AJn/AO+R0/E12WjeE9G04q5hNzMP45+fyHQVtgbc0bh61hOrKR8vi88xeJuuay8jl7+ztZriZZLaFhvPBQVnS6BpT/8ALrsPqrEVr3LD7VNjkbzUMk8KDLyIPxrNSkupVLE14W5ZMwpvC9kf9VcTp9cNVOXwvJn91eIf95CP5VvS6jbr9zdIfYYqtLqch+5Eq/XmtVUqHpUszxsftfeYcvhvUl+55Mn+6+P51n3mm3kAzdWzAL3ODiuhlu7mThpWx6Diq1yplhcHnKkVrGpK+p6VDN8RzJTs0enfsaarqy/GrTNMTVdQ/s+S1uTJam5cwttiJGUJ28HGOK+7K+Cv2L1z8dtOP92yuv8A0XX3rXWj6dO6Oc+JvieLwb4D1jxLMu77Das8af35D8qL+LEV+cQe4vdRM91K0txcTF5XJyXdmyx/Ek19Y/txeKjZ+HdG8IW7gPqUzXdyO/lRfdH4uR/3zXytoyb9Qiz0GW/SvrMhw9qbqPdnFi52T8jS8SKDok+O20/rXGp6e9drr4zo117R5/WuJXqK5OJFbERfkY5U70n6n37+x/8A8m/+H/8Afuv/AEokr1yvI/2QP+Tf/D/+/df+lEleuV8+j1AooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDI17SZ9ZQ2c19Pa6ewxLHauY5Zh3UyDlF9duCfUVPoOi6ToOmR6ZounW2n2ceSsNvGEXJ6njqT3J5NaFeUfGb47eDfhwktjJN/a+vBfl021cZQ9vNfpGPY5b0FAHqV1cQWtvJcXM0cEMSlpJJGCqgHUkngCvnP4u/tT6DorSab4Ct4tfvR8rXspK2kZ/2ccyn6YX3rwTx945+JPxduy+qSNa6QDmGxiJitE+ueZW92z7AVT0vwFYQ4fUp3un67E+RB/U/pWUq0Ynl4vOMLhdJyu+yOf8Y+MfGHxD1j7Vr+p3mq3BP7u3UEQxeyRj5V/n71PpXgTUrkCS/kWzQ/w/ef8ugrv7KytLCLy7O1igX0RcZqcyqg3OwUe5xXNLEPofMYvietU92greZi6T4V0bTdrLb/AGiYf8tJvmP4DoK2xgYwOnTFU5tVskOPN3n0QZqlPrRwfJgA93P9BWLbe54FSeIxLvUk2bO71zTZLiGLmSVV+prmJ9RvJeGmYL6LxVRpATlsk+pqbBHCX3Omm1ezXhC0h/2Rx+dZ0+sztkRRog9Tyay7US3VyLe0hmuZmOBHChdj+AzXe+GfhB8RNeCtb+Griyhb/ltqDC3A/BvmP4LVKDfQ7qGWzm7Qi2eX3V3cSzyFpm+8cgcCoOSfevY/EP7OHxI04NNZw6Xq6kbitrdbJM+m2QKD+BrzfXfCHi3QSTrPhbWrBV6vLZvs/wC+gCv61tyNdD1Z4KtSWsDGBJPWkpscqNnYQT3wacW9KRz6rcP4qdgHimd80pbA4pC8z0j9jVdnx8tU9LK7/wDQRX3dXwt+x+v/ABkDbH10+6b/AMcFfctzNHb28lxKwWOJC7E9gBk/yruhqj7nCz56MZeR8KftZa//AG78atTiSXfBpUUdhHzxuUbn/wDHmI/CvOvDozesfSM1DruotrGv6lqzklr68muSSc/fcsP0Iq14bA8ydu+AK/RcBSVOlCHZHnYyXuSZo6uN2k3Q7+U1cIp6etd9ejNjcD1ib+VcEg6H6V4HEq/eQfkVlD92SPvz9j7/AJN+8P8A+/df+lEleu15H+x//wAm/eH/APfuv/SiSvXK+bPWCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAPJv2hofive6ZHYeAQlvp0kZ+3XNpIP7QPP3Ig2Aox1YEt2GK+S30rT/Dt55Wo6BqFvfBiWbUYiJGbufm6k+tfobVPVtK03V7VrXVLC1voG6x3EQdfyNZVKfP1PMx+Ali1ZTa8uh8EtrUanK2zfiwFNbXWx8tsPxevqXxZ+z34F1cPJpa3ehznp9lfdFn/cbI/IivI/Ef7OXjqxlzo91pmsQlsA+aYHA9SrZH5GuV4eSPlq3D9an05vQ8suNYu5RgMIx6IKz5Hkkfc7s59zmvevDn7M2vXBV9f8RWNiveO0iaZ/pubaB+Rr0vw9+z78PNMRTeWl5q8o6teXB2n/gKYFCw82bUMhxEuiXqfHMPmTSeVDG80hOAkalmP4Dmu18MfCz4h+ISDZ+Fr23hP/La9xbp/wCPcn8BX2roPhzQNBgEOi6NYaeg7W8CoT+IGTWrW0cMurPVpcP018cr+h8xeH/2ZtVm2vr3iS1tBwWjs4TK303Ngfjg16Non7P3w30+NReabcau46te3DMD/wABXaK9XqO4mht4JJ55Y4oo1LO7sFVQOpJPAFaxpQjsj06OW4aj8MP1KWhaFouhWwttF0mx06EDGy2gWMfoOa0a8W+I/wC0l8PfCyPBpVy3ifUFOPJ05wYlP+1MflH4bjXzd8RP2ifiL4tMkFnfjw7p7ZH2fTSVkYf7Ux+Y/wDAdtXex2pJbH319aTAIx29K/MnQPHfjfQJxNo/i7W7Js7iFvXZWPurEg/iK9S8L/tR/ErS2VNWXSddiHB8+38mQ/8AAo+P/HaVxn174l+HngfxJzrfhXSLx/8Ano1sqyf99rhv1rz/AMQfs1/DvUATpy6lo79vs9xvQf8AAZM/zrlfCn7W/ha8kWLxH4a1TSSes1u63UQ/AbW/Q16p4Z+Mvww8RMkem+NNJEz8CG5l+zyZ9NsmOaHGL3MqlCnU+KKZ4d4i/Za16BWbQfE9hfAAkJdwNAx9sruFeY+Ifg18UdEdvtPhC8u4wf8AW2DrcL9cKdw/EV99QyxzRLLFIkkbDIZDkEfUU/jrWfsYs4Z5Th5bKx8UfsqaVqOm/H+yTUdOu7KX+zLsFLiBoz0X+8BX1P8AGrVDovwl8U6kpw8WlzBD/tMu0fq1dcUQuHKqWHRiOR+NeU/tb3TWvwH11V/5bvbwn6NMuf5V1YWnepGPmjro0VQpcid7Hwgi7FC/3QB+VbXhsDbOfcVjryc1t+HP9TMf9ofyr9IpbnmYx/umacyZgkHqh/lXn0Y4/GvRCcow9q876SMMfxH+dfN8Tx/hv1HlD+JH35+yAMfs/eHv9+5/9KJK9cryP9kDn9n/AMP/AO/df+lEleuV8ue0FFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUVg+NfGXhfwZph1HxPrdnpkH8HnP88nsiD5mP0FAG9WZ4j1/RPDmnNqOvatZaZaLnMt1Msan2Gep9hzXyv8AE39rO8ufMsPh7pH2RdxH9paioZyPVIeg+rk/SvnPxN4j17xPqban4j1i91W7JyJLmUts9lHRR7KBUuQH1b8R/wBrLRrLzLPwJpD6tNjAvrzMMAPqqffcfXaK+afHvxH8ceOZXPiTxFeXVuzEizRvKtk9hGvBH+9k1iaZo2p6m4FnZyyA9XIwo/E11mleAgAH1S7OT/yygH82P9KzlVit2efis1wuFXvy17HBR5LCNFLE8BVGT+AFdDpfg/Wr0LJJGlnGf4pvvY/3etej6dpOm6cu2ytIoT03AZY/UnmrQyDg5xXPPEPofMYviqctKEbebPMLnwvOjukd3GxUkDchGfyzVSXw7qiDKxxSD/Zk/wAa7e6A+0yf75qPcc8mojXn1JpZ9i1u0zgJ9N1CHO+ymHuFz/KqcsTdJYzj0df8a9MHc96hlmgX/WyJ9DzVrEPqjup8RVPtQOT8N+KvE3huQP4e8RarpZH8NrdMq/8AfOdv6V6f4U/aY+KGhqsd7fWOvQqemoW4EhH/AF0j2n8wa427l0xuDZxyn/cArD1C0tXR3t7UREDIw5NaxrXZ6FDO6dRpSi0fYfwT/aNT4g+MLLwpd+EpdOvbpJGFxDdiWEbELHIIDDOMd60/20ZNnwUdO0up2qH/AL6J/pXzp+xsN3x60k/3bS7P/kI19EftqIW+C4IH3dVtSfzYf1r0sDriIeqPYm/dZ8UACtrw0f3c4/2h/KsUVr+GjzOPof51+h0viPGxa/dM2a8/uBi5kHo5/nXoHeuCv123849JD/OvA4mX7uD8wyh+9JH3t+x//wAm/eH/APfuf/SiSvXK8j/Y/wD+TfvD3+/df+lEleuV8ke4FFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFV9RvrPTbKW+1C7gtLWFd0s08gREHqWPAoAsVj+LfFHh7wnpTan4j1e00y0XOHnkwWPoo6sfYAmvnj4vftVadZedpfw7tl1C45U6pcoRbofWNODIfc4X6181azJ43+IGsHWdauLzVLl+Bc3TbUQeiDoo9lFS5JGVWtTpLmm0ke8/FT9q+7uhLp3w7082ceSv8Aal8gLkescXQfVufavnDW9V1zxPrL6jqt9e6vqM3DSzMZJCPQeg9hgV1ek+ArePEmqXLzN18uL5V/E9T+lddp1jZWMfl2dtFAvfavJ+p61zzrpbHz+M4lw9LSkuZ/gedaT4I1a72yXYWyiJ53nL4/3R/Wuv0jwlo+n7WaBrqUfxzYI/BeldBUM9xBDzJMqfU1zyqzZ8xis7xmK0vZdkSooVQijCjoB0FKfSsqfW7WPOwSSn2GB+tU5dauZP8AVKkY7fxGszzFRqSd2dATxkVXlvbWIHzJ0B9AcmuamubmXmWZ29s8VCQCCQMY70rXNY4RPdhfajCtxKY1aT5iR2FUZtUnb7iqn05qpNIDcSAMG+Y9DTCM8jIrVRSPVhQjFLQkeeaQ/PK7fjTQOOaRB9aeBzVGmiG/KKRgChHqKUigfSgE7O56F+xgp/4XxYg9Vsrv/wBAr6V/bAgM3wK1VwpJhubWTjt+9Uf1r5x/Y7Qp+0BbL2+xXR/8cFfV/wC0Npz6p8E/FlpGMv8A2c8qfWPDj/0GvVwkuWpCXmj7qnLnpJ90fnuBzWp4ebFzKn95M/kazAc/MOh5FXtDbbqKj+8pFfo8NGediFemzoRXDauCurXQ/wCmpxXcE1xWugjWbjPdwf0FeLxIr0IvzMMp/iP0Pu/9j/8A5N+8P/791/6USV65Xkf7H/8Ayb/4f/37r/0okr1yvjT3wooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiisjxP4esPEdl9g1R7p7Jv8AW20Vw0STD0cqQxHtnB70AeZfFb4/+F/Cc82jeH4z4o8QqCPslk4MULf9NZBkDH90ZP0r5h8c6l8Rviberc+NdZW2s0OYdPtxiGIZ7JnBP+0xJ+lfaNz8Lvh7PpC6UPCOkwWq52C3txCyk9wyYYH3zXmHi39mnTLnfL4a8R31i5+7Bejz4/puGGH61lUU/snlY9Y5r/Z2rfifPWj+HND0zDLEk0w/5aTsGOfp0FbL3MCgbp41A6fMKveKPgt8RfD7O8uhnUrdf+W+nv5wI9SvDj8q8/kzFM8EqmKVDh0cbWU+4PIrhkpL4j4vGYTFOV67dzpp9VskztZpG/2Rx+dUJ9bmziCFVHqxyaz9M0+/1afyNKsrq/m/uW0TSn/x0GvQPD3wR+JOrlWbQV02Jv8AlpfzrHgf7oy36UowctkKhllSp8MGzg5r+7nBDzuAey8Cqr56k9epNfRnh79mEFVfxD4rfdn5otPtwBj/AHnz/KvSvDPwT+HOhBGTQk1CZefO1BzOx/A/L+lbLDyZ69HIK8t7RPjDS9P1DVp/s2lWF3fzdNltC0pz/wABBxXoGgfAz4laqEf+x4tNjY/fvpxGQPdRlv0r7OsLGzsIRDY2lvaxDokMYRfyFWK1jho9T1KWQUY/HJs+dfDv7MsOxW8R+KJpD/FFYQhB/wB9vk/pXo3hj4K/DrQSrxaCl/OMfvr9zOxPrhvlH4CvQ3ZUUu7BVUZJJwAK8l+In7Qnw58ISS2cepNruoxgg22m4kCt2DyfcX8yfatVThHZHp0cBh6PwwR2PiD4deBdfg8rVvCmk3AxgMLZUcfRlwR+deca1+zH4Au5Hl0271nSmb7scdyJY1/4C4J/Wub8OftceHLify/EHhbU9NQniW2mW5AHuPlP5Zr03wj8cvhb4mdYbHxbZ21wxIEF+DayH8JAAfzptRZtPD0qitKKZ4n4l/ZZ8SW26Tw94m07UB2iu4mgb/vobh/KvPtd+C3xQ0YFp/Ct1dIOr2UizjH/AAE5/SvvG2nhuYVmt5Y5o25V42DKfxFSe9S6MXscNTKMPPZWPzQv7S90+Yw6hZ3NnKOsdxE0TfkwFVixYZFfpbqemadqcXk6lp9peR/3biFZB+orz7xD8CPhdrO528MxWErf8tbCRoD+Snb+lZug+jOGpkbXwSPmb9kNMfH+yb10y6P/AI6or7Y1yxXU9FvtOkAKXVtJAwPoylf615Z8OvgJoPgT4gQ+K9H1vU5RFbywfZboI4IkAGd4APGPSvYOlbwTikezhKUqVFQnuj8vbi3lsrqWyn/1tvI0L/7yEqf5VJpz7L+Fs/xAfnXY/tAaE/hz4zeJdPCbYZbs3cHvHMN4/UsPwriI8q6t0IOa/R8NUVSnGa6o5asdGjriOMVx3iNca1L7hT+ldkp3KG/vAGuS8UDGrk46otcHESvhU/M4csbVZryPub9j/wD5IB4f/wB+6/8ASh69cryP9j//AJN/0D/rpdf+lD165XxJ9CFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABWNr3hXw1rzo+taDpuoOhBV7i2V2GPcjNbNFFhNJ7lbTdPsNNtxb6dZW1nCOkcESxqPwUCrNFFAJWCiuZ8fePfCXgXThe+KNatrBG4jiYlpZT6JGMs35V80fEr9rLUrl5bHwBpCWUPKjUNRTfK3ukQOF/4ET9KVxn1b4g1zR/D+myalrep2mnWcYy01zKEUfiev4V8/fEf9q/w3piy2ngrTJtcuhkLd3AMNqD6gffcfgv1r5H8TeIdf8AE+onUPEes32rXXaS6lL7fZR0UewAqrY2N5qEnl2dvLO3cqMgfU9KlyJnOMFeTsjrPiL8WPHvj4lPEOuymzzkWVqDBbj/AICpy3/Aia4pDgBQMDoAK7PS/ANzJtfUrtYF7xxfM359K63S9A0jTMG2s08wf8tJPnb8zWEq8UeDi+I8LR0h7z8jyJ9ykhgykf3himnDLg4IPY8ivS72FZLiXeqsN5zkZ71Sl0zT5eHs4efRcfyqY4ldjGnxJTl8UDlPD/iDXPD10LnQta1HTJQc7rW6eMZ9wDg/iK9R8N/tLfFXSPLjuNUsdZiXHy39oCxH+/HtP55rj5fDmlv0SSP/AHXqpL4WgP8AqruRf95Qar6xFnbTz3Cz3bR9HeGP2vdPYJH4n8H3UBz802nXAlX/AL4faf1NepeFf2gPhT4hKpF4oi06ZjgRalE1sc/Vht/WvhaXwtcqMpdQuPRgVrLvNPubVSH8sqOu181pGqnszspZhhqrtGZ+o9hfWV/bi4sbu3uoWGRJDKrqR9QcVYr4K/YyDr8ddMSOR44vsl0zRoxVWPlHqo4NfetbHafJv7c/ht4dd0DxZDGPKuYXsLhgOjod8efqpcfhXzd1HWvv39pDwu/iv4P63Y28HnXltGL21Xv5kR3YHuV3D8a/P5GDDK8gjivsMkr8+H5HvE468bSOp02TzLCJiTnbg/hxXOeLR/xM0PrGP51seH5N1s8ZPKtn86zPGCD7VbvnqhH5GunPFzYJv0PMwa5MVY+3/wBj3/k3/QP+ul1/6UPXrteRfsff8m/eH/8Afuv/AEokr12vhj3wooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKwvGvi/wANeDNIbVfE2sWum2o4VpW+aQ+iKOWPsBXyr8Wf2qdY1JptN+H9odKsuVOpXSg3Mg9UT7sf1OT7Ck2B9OfET4h+EPAOni78T6zDZs4/c24+eeY+iRj5j9envXyx8Uv2p/E2stPYeCLVdBsCSq3koEl249QOUj/8ePvXhSwa94l1GS8lN7qV3Kf311PIXZv952P9a6XTPABJD6nd49YoOv4sf6Cs51FHqcGKzPDYVfvJa9jjNRvr/VNQkvb+8ub28mbLzTSNJI5PuefwrY0jwjrGoYkaEWsR/jm4P4L1r0bS9F0vTExZWUcbY/1hG5z+J5q+DXNLEdj5jF8VSd44eNvNnM6T4I0q0Ae7LXsn+3wn5D+tdJBDFBEIoIkiQdFRQBTiwxz0qvPfWkQw9wmR2ByaxcnLc+br4vE4p3qSbLB4prYIrKn1uHpFE7n1PAqhPq94TlCsYP8AdHNTYyjh5sdcHbcS7uPnOc/Wq011bRg5mXPoOaxbqeWaZzJIzHcepqDHvzVqF9z1YYfTVmtLqka8Rxs/14qtLqVw4+UKn0qjjNHFUoJGypRQ6SaeQ/vJXb6mo5k3wuO5FO4Jp6KAQc1S0NYPlaaPQ/2Lxn46WJ9LK6/9AFfeNfCf7Gqhfj5bIO1ld4/75Ffdld0dUfeU5c0ExHAZSrAEEYIPevzw+N3gyTwN8T9Y0VY9li8purA44MEhLKB/uncv4V+iFeDftleBxrngeLxbZxM1/oOTLtHL2rkb/wDvkgN9N1erlOJ9hiEns9CaseaJ8j6E+Lpk7Ov8qg8aDBtD/vD+VRWUwivIn9G/nU/jMZt7V/SRh+lfUZvrgpo8mMWsVFn2z+x9/wAm/eH/APfuv/SiSvXa8i/Y8/5N98P5/v3X/pQ9eu18Ge2FFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUVj+Kb/W7KzA0DRF1S9kOFWW5WCGP/adyCceyqTQBf1O/stMsJr/UbuC0tIELyzTOERFHUkngV81fFn9qixtpZdH+G1mNVuiNv9pzxt5Kn/pnH96T6nA+tW/id8G/iv48X7b4n8XaZqcav5keh2jSWtrF6AMc7z/tMM/SvHte8I+JvAu5bzwRdafCpx56xmWJv+2i5H5kVjUqOOyPMx2OqYde5Tb8+hyGq6b418b6sdY8VapcTXDj/XXkhZlH91EHCj2GK1dK8G6NYgNNG15IP4pTx/3yOKYviedslYoSo79RT4dcu7t/Ltkjkf8AuxIWP5DNcjqTkfJYrMMfiHbZeR0cZSJAiKEUdAowBTJb20iyZJkHtnJqpa+EPHutN/ofhnXrkEcFbR0Q/iwAroNM+BHxRviC2gwWSnvdX0akfguTSVOT2RyQyjEVdXFnOXGuWqZEcckh/IVnza5dOcRKkf4ZNetad+zV41kUG81jQ7Y9wGkkI/ICuj039mFcZ1Hxi2f7ttZAY/FmP8qpUZ9jtp5BiP5PvPnSe5uJcmWV2+rVCZVRfnYKD6nFfWmm/s2eC4CrXup61e46r5qRqf8Avlc/rXb+HPhV8PtAdZdP8K2HnL/y2nTzn+uXzVxw8nud9Lh+s/iaR8WaF4c8Qa4wXRtD1K/J6GC2Zl/76xj9a9E8Pfs//EHU9rXtvY6RE3ObqcO4/wCApn+dfXoltbdAgkgiRRwNyqB+FVZtd0SA/vtY06M/7V0g/ma1jh4rc9GlkFCOs22fK2u/su+LoI2m0rX9J1B+vlSK8BJ74JyPzrzvxB8JPiToWTfeD9QljX/lraBbhMf8AJP6V9yt4r8LjhvEmjA+99F/8VSf8JZ4Vzx4l0X/AMD4v/iqp0YnTPJ8PJaaH50XkFxZTeVe209pIOqzxNGf/HgKi6jOOPWv0UvtT8FavEYL7UPD9/GeqTTwyD8iTXJal8I/g/rUvm/2FpSOxyTZ3Riz+CNiodB9GcVTI5fYkfC+RQW9K+1Zv2c/hbcZMVlqEfvFqDnH55qhc/sw/D+QfuLzXoD7XSt/Nan2MjB5LXWzR4T+x+u39oC24+9p10f/AB1a+568f+GnwF0LwH47h8Vadrup3MkVtLbi3uEj2kPjJyADxivYK6YKysz6LCwlClGM90FRXdvDd2strcxJLBMhjkjcZDKRgg+xBqWiqNz87fjP4Euvh549vdCZHNixM+mynpJbsflGfVT8p+nvXNeJW83RbSb1lGfrtr7p/aN+HMfxB8CyR2kSnXNO3XGnP0LNj5oifRwMfUA18H6jIx0Z7KRGjnt7rbJE4wyHkEEdiCCK+op41YnATjJ+8kefWpONWMl3PuD9jz/k3zw9/v3P/pQ9evV5F+x8Mfs++HgR/Hc/+lEleu18uegFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUVR1nV9K0W0N3q+pWen245MtzMsa/mxFeR+Mv2mfhhoJeGxv7rX7kDhNOh3Jn3kbC/lmi4HtVIQGBUgEHqPWvjrxZ+1z4iuleLwz4X0/TVP3Zr2Y3Eg/4Cu1f1NeU+I/jX8VNeZ/tvjXUoIm/5ZWW22Qe3yAH9aVwPuLxR4O+FcN8NX8R6H4Yt5gCTNdpHEG9SQcAn3Irnbr4x/A7wkjQWniDQ42XjytLtvMJx2/dLj9a+BLu6uLyXz764luZCeZLiQux/FiajjUzErFmQjqEG7H4CpJ5I9j7U1z9rTwJakrpWi67qZHRmRIFP/fTZ/SuL1b9sDVnyNI8D2UHPytd3zSce4RR/OvnXTPCvinVDjTfDWtXh/wCmNhKw/Pbiuo0z4KfFm/wYfAWrxg97gJCP/HmFBR2OqftSfFS7bFrJomnDOf3NhvP0y7H+VcvqHx0+Ll+7tL451GEseltHFEB9AE4rd0/9mj4uXO0zaNp1oD1M2ox5H4LmtqD9lD4kyY8zUvDcP1uZW/lHS1A8vvPiZ8Rbty1z468RyE9f+Jg6g/gpArHufEfiG5BFxr2rTBuokvpWz+bV7/bfsheKmA+0+M9FiPcR2kr4/Miti2/Y9yo+0+P2Dd/L0sY/V6dmB8sNcTsu1p5SPQuT/Oq5ijPJjjJ/3RX2BD+yBoYA8/xvqrnvss4lH65q2v7InhLjd4r14/SOEf8AstOwHxoI4s48qP8A74FKIoj/AMso/wDvgf4V9ox/skeCFHz+IfEDH1zEP/Zak/4ZK8C/9B/xB/33F/8AE0WYHxUIov8AnjH/AN8CnRjyjmP5D/s8V9mS/sjeDScx+J9fQemIT/7LUD/sh+Fz/q/GGuL9YYT/AEosB8iW2o6hbSb7fULyFvWO4dT+hrWsvGnjGybNn4u1+A/7Goyj/wBmr6Zuf2P9MP8Ax7eO79P+umnxt/JhWXe/sf3oU/Y/HsDN2E2mED/x16LMDxS2+L3xStVVYPH+vgL0DXAk/wDQlNdDpX7RfxdsI/LPiWG9APH2ywic/moU12V7+yR42jXNp4p8P3J9JIpov1w1ZN3+yv8AE6FS0U3h+5I6Kl6yk/8AfSCizA0NJ/ay8d25A1HQtAv14yVWSBvfozD9K63Sv2wLQgLq3gW6jPdrTUEcfk6r/OvItS/Z2+MFmcjwrHdD1t7+Fv5sK5fUfhb8S9Oz9t8BeIYwOrLZmRfzTNF2B9eaH+1F8K9QCi8utU0ljjP2qyYqD/vR7hW4bz4D+P3LvP4K1eeVtxMnlLMzepzhs18B3mm6lYyGO806+tXHVZrZ0I/MVSDxyHAaNyPcE0KTA/UXwhoOieGvD9vo/hy0itNLh3NDFE5dV3MWOCSe5J61r1+Xug+KfFPh2ZZNC8R6vpjL0W2u3Rf++c7f0r07wv8AtLfFTRyi3epWWtwqeUv7UBj7b49p/nTuB96UV8w+Ff2u9GmdIvFHhS9sf789jMLhB77Dtb+dey+Dfi58OfFqqNG8Wac8zAf6PO/kSgnttfBz9M0XA7mikBBAIOQeh9aWmAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUVHczwWtvJcXM0cEMalpJJGCqgHUkngCgCSmTSxQxPLNIkcaDLOxAVR6kngV4v4s+PVvcXsuifC7w7feONVXKme0jb7FE3vIB82PbA968y1n4WftCfFW43+OdastG01m3Cye4/doPQQRZDf8AA2J96VwPVfiJ+0b8OfCZe2s75/EV+pKmDTCHRWHZpT8g/DJ9q+d/H/7UnxA1t2i0Q2fhezYFQIQJZz/20cYB/wB1RXr3hX9krwfZLHJ4i13VtWlAG6OAraw59MAFsf8AAq9Z8L/Cr4deGlT+yPB+kRSIMCaWATS/Xe+Tn8aNQPz9j0vx/wCPtR+1R6b4i8SXTn/XGGWf/wAeb5R+YrutB/Zr+LWqqjzaLZaVGx6316isP+ApuNffaKqIEQBVAwABgClosB8jeH/2P9QdlfX/ABtbwr/FFYWZc/8Afbkf+g13uj/spfDa0CNf3Wu6m46+ZdiNW+oRR/OvfKKLAed6F8EPhRoxVrPwPpUkij/WXKGdvzcmu007RNG01QunaTYWagYxBbIn8hWhRTAO2Mn86MUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAyWKOVSsqLIp4IYZH61zuteAPBGtLjVfCOh3nvJYxk/njNdLRQB5FrX7N/wj1IlovDkmmuf4rG7ki/TJH6VwuvfsieG59zaJ4u1ewP8AClzDHcKPxAU/rX0vRSsB8Ua9+yZ49s9z6VrWh6qo6KzPbufwIYfrXnniX4K/FHQVZtQ8FahNEnPmWYW6X6/ISR+Vfo1RS5QPzb8LfE34jeAJha6Z4h1PT1Q4+w3wLxD1Hly9PwxXvPgD9rZWWO28c+G2jPAN5pZ3L7lomOR6/KTX05rGiaPrMBg1fSrHUImGCl1bpKD/AN9A15h4o/Zy+Fet7nh0SXRpW6vptw0Q/wC+Dlf0p2sB3Hgjx94P8aWqz+Gtfsr8kZaFX2zJ/vRnDD8q6avk/wAR/snarYXC3/gjxri5iO6IX0ZhkQ/7MsXI/KtLw94u/aG+Gv7rxx4SuPGGiRH5rq0dZrhF9Q6ct/wNfxouB9PUVxXw3+KPgzx9EU0PVFW/jXM+nXQ8q6h+sZ5I9xkV2tMAooooAKKKKACiiigAooooAKwfEHhLRPEN1HLr1s2pwxENFaXDlrdSO5j+6x92BreooAgsrS1srZbaztobaBBhY4YwiqPYDip6KKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKPeiigDC8ReD/DPiCSObVtEs7i4ibfFc+Xsnib1WRcOp+hrV0+2NnaR232ie4CDAed9zke7d/qeasUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAH/9k='
function cargarLogoBase64(callback) {
  callback(LOGO_B64)
}

function generarReciboPDF(pago, contratos, gastosDetalle, perfil = {}, propietarios = [], inquilinos = [], propiedades = []) {
  const contrato = contratos.find(c => c.id === pago.contrato_id)
  const nombrePropiedad = propiedades.find(p => p.id === (contrato?.propiedad_id || pago.propiedad_id))?.direccion || contrato?.propiedad_id || pago.propiedad_id || '—'
  const nombreInquilino = inquilinos.find(q => q.id === (contrato?.inquilino_id || pago.inquilino_id))?.apellido_nombre || contrato?.inquilino_id || pago.inquilino_id || '—'
  const esUSD = pago.moneda === 'USD'
  const fmtN = n => '$' + Number(n || 0).toLocaleString('es-AR')
  const fmtUSD = n => 'USD ' + Number(n || 0).toLocaleString('es-AR')
  const fmtAlq = esUSD ? fmtUSD : fmtN
  const gastosInq = (gastosDetalle || []).filter(g => g.responsable === 'Inquilino')

  const script = document.createElement('script')
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
  script.onload = () => {
    cargarLogoBase64(logoB64 => {
    const { jsPDF } = window.jspdf
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const W = 210, margin = 20
    let y = 20

    doc.setFillColor(27, 107, 53)
    doc.rect(0, 0, W, 42, 'F')
    if (logoB64) doc.addImage(logoB64, 'JPEG', margin, 4, 34, 34)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.text('GASP', margin + 38, 16)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.text('Gestion de Alquileres Sistema Profesional', margin + 38, 23)
    doc.setFontSize(8)
    doc.text((perfil.nombre_completo || 'Nombre del Administrador') + '  |  ' + (perfil.titulo || 'Título') + '  |  ' + (perfil.matricula || ''), margin + 38, 30)
    doc.text((perfil.ciudad || '') + (perfil.provincia ? ', ' + perfil.provincia : '') + '  |  ' + (perfil.email_contacto || ''), margin + 38, 36)

    y = 57
    doc.setTextColor(27, 107, 53)
    doc.setFontSize(16); doc.setFont('helvetica', 'bold')
    doc.text('RECIBO DE PAGO', margin, y)
    doc.setFontSize(10); doc.setTextColor(136, 136, 136); doc.setFont('helvetica', 'normal')
    doc.text('N. ' + pago.id, W - margin, y, { align: 'right' })
    y += 8
    doc.setDrawColor(27, 107, 53); doc.setLineWidth(0.8)
    doc.line(margin, y, W - margin, y)
    y += 10

    const datos = [
      ['Período:', pago.periodo || '|'],
      ['Fecha de pago:', pago.fecha_pago || '|'],
      ['Propiedad:', nombrePropiedad],
      ['Inquilino:', nombreInquilino],
      ['Medio de pago:', pago.medio_pago || 'Transferencia bancaria'],
    ]
    doc.setFontSize(10)
    datos.forEach(([label, valor]) => {
      doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80)
      doc.text(label, margin, y)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(26, 26, 26)
      doc.text(String(valor), margin + 40, y)
      y += 7
    })
    y += 5

    doc.setFillColor(27, 107, 53)
    doc.rect(margin, y, W - margin * 2, 8, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
    doc.text('CONCEPTO', margin + 3, y + 5.5)
    doc.text('IMPORTE', W - margin - 3, y + 5.5, { align: 'right' })
    y += 8

    doc.setFillColor(242, 244, 246)
    doc.rect(margin, y, W - margin * 2, 7, 'F')
    doc.setTextColor(50, 50, 50); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    doc.text(esUSD ? 'Alquiler (USD)' : 'Alquiler', margin + 3, y + 4.8)
    doc.text(fmtAlq(pago.alquiler), W - margin - 3, y + 4.8, { align: 'right' })
    y += 7

    if (Number(pago.multa_mora) > 0) {
      doc.setFillColor(255, 255, 255)
      doc.rect(margin, y, W - margin * 2, 7, 'F')
      doc.setTextColor(50, 50, 50); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
      doc.text('Multa por mora', margin + 3, y + 4.8)
      doc.text(fmtAlq(pago.multa_mora), W - margin - 3, y + 4.8, { align: 'right' })
      y += 7
    }

    doc.setFillColor(26, 26, 26)
    doc.rect(margin, y, W - margin * 2, 8, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
    doc.text(esUSD ? 'TOTAL ALQUILER (USD)' : 'TOTAL ALQUILER', margin + 3, y + 5.5)
    doc.text(fmtAlq(Number(pago.alquiler || 0) + Number(pago.multa_mora || 0)), W - margin - 3, y + 5.5, { align: 'right' })
    y += 8

    if (gastosInq.length > 0 || Number(pago.gastos_adicionales) > 0) {
      y += 4
      doc.setFillColor(254, 243, 226)
      doc.rect(margin, y, W - margin * 2, 6, 'F')
      doc.setTextColor(138, 92, 16); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
      doc.text('GASTOS ADICIONALES (ARS)', margin + 3, y + 4)
      y += 6

      if (gastosInq.length > 0) {
        gastosInq.forEach((g, i) => {
          doc.setFillColor(i % 2 === 0 ? 255 : 253, i % 2 === 0 ? 253 : 248, i % 2 === 0 ? 248 : 240)
          doc.rect(margin, y, W - margin * 2, 7, 'F')
          doc.setTextColor(50, 50, 50); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
          doc.text(g.concepto || 'Gasto adicional', margin + 3, y + 4.8)
          doc.text(fmtN(g.importe), W - margin - 3, y + 4.8, { align: 'right' })
          y += 7
        })
      } else {
        doc.setFillColor(255, 255, 255)
        doc.rect(margin, y, W - margin * 2, 7, 'F')
        doc.setTextColor(50, 50, 50); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
        doc.text('Gastos adicionales', margin + 3, y + 4.8)
        doc.text(fmtN(pago.gastos_adicionales), W - margin - 3, y + 4.8, { align: 'right' })
        y += 7
      }

      const totalGastosARS = gastosInq.length > 0
        ? gastosInq.reduce((s, g) => s + Number(g.importe || 0), 0)
        : Number(pago.gastos_adicionales || 0)

      doc.setFillColor(138, 92, 16)
      doc.rect(margin, y, W - margin * 2, 8, 'F')
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
      doc.text('TOTAL GASTOS (ARS)', margin + 3, y + 5.5)
      doc.text(fmtN(totalGastosARS), W - margin - 3, y + 5.5, { align: 'right' })
      y += 8
    }

    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3)
    doc.line(margin, y, margin + 60, y)
    doc.setTextColor(80, 80, 80); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    doc.text('Firma y sello', margin, y + 5)
    doc.text(perfil.nombre_completo || 'Nombre del Administrador', margin, y + 10)
    doc.text((perfil.titulo || '') + (perfil.matricula ? ' · ' + perfil.matricula : ''), margin, y + 15)
    doc.setTextColor(136, 136, 136); doc.setFontSize(8)
    doc.text('Emitido: ' + new Date().toLocaleDateString('es-AR'), W - margin, y + 15, { align: 'right' })

    doc.setFillColor(17, 29, 19)
    doc.rect(0, 287, W, 10, 'F')
    doc.setTextColor(143, 191, 151); doc.setFontSize(7)
    doc.text('GASP | Gestion de Alquileres Sistema Profesional  |  ' + (perfil.email_contacto || ''), W / 2, 293, { align: 'center' })

    doc.save('Recibo_' + pago.id + '_' + (pago.periodo || '').replace(/ /g, '_') + '.pdf')
    }) // fin cargarLogoBase64
  }
  if (!document.querySelector('script[src*="jspdf"]')) document.head.appendChild(script)
  else script.onload()
}

function generarLiquidacionPDF(pago, contratos, gastosDetalle, perfil = {}, propietarios = [], inquilinos = [], propiedades = []) {
  const contrato = contratos.find(c => c.id === pago.contrato_id)
  const nombrePropiedad = propiedades.find(p => p.id === (contrato?.propiedad_id || pago.propiedad_id))?.direccion || contrato?.propiedad_id || pago.propiedad_id || '—'
  const nombreInquilino = inquilinos.find(q => q.id === (contrato?.inquilino_id || pago.inquilino_id))?.apellido_nombre || contrato?.inquilino_id || pago.inquilino_id || '—'
  const nombrePropietario = propietarios.find(p => p.id === contrato?.propietario_id)?.apellido_nombre || contrato?.propietario_id || '—'
  const esUSD = pago.moneda === 'USD'
  const fmtN = n => '$' + Number(n || 0).toLocaleString('es-AR')
  const fmtUSD = n => 'USD ' + Number(n || 0).toLocaleString('es-AR')
  const fmtAlq = esUSD ? fmtUSD : fmtN
  const gastosInq = (gastosDetalle || []).filter(g => g.responsable === 'Inquilino')
  const gastosProp = (gastosDetalle || []).filter(g => g.responsable === 'Propietario')

  const script = document.createElement('script')
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
  script.onload = () => {
    cargarLogoBase64(logoB64 => {
    const { jsPDF } = window.jspdf
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const W = 210, margin = 20
    let y = 20

    doc.setFillColor(27, 107, 53)
    doc.rect(0, 0, W, 42, 'F')
    if (logoB64) doc.addImage(logoB64, 'JPEG', margin, 4, 34, 34)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.text('GASP', margin + 38, 16)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.text('Gestion de Alquileres Sistema Profesional', margin + 38, 23)
    doc.setFontSize(8)
    doc.text((perfil.nombre_completo || 'Nombre del Administrador') + '  |  ' + (perfil.titulo || 'Título') + '  |  ' + (perfil.matricula || ''), margin + 38, 30)
    doc.text((perfil.ciudad || '') + (perfil.provincia ? ', ' + perfil.provincia : '') + '  |  ' + (perfil.email_contacto || ''), margin + 38, 36)

    y = 52
    doc.setTextColor(26, 63, 160)
    doc.setFontSize(15); doc.setFont('helvetica', 'bold')
    doc.text('LIQUIDACION AL PROPIETARIO', margin, y)
    doc.setFontSize(10); doc.setTextColor(136, 136, 136); doc.setFont('helvetica', 'normal')
    doc.text('N. ' + pago.id, W - margin, y, { align: 'right' })
    y += 7
    doc.setDrawColor(26, 63, 160); doc.setLineWidth(0.8)
    doc.line(margin, y, W - margin, y)
    y += 10

    const datos = [
      ['Período:', pago.periodo || '|'],
      ['Fecha de pago:', pago.fecha_pago || '|'],
      ['Propiedad:', contrato?.propiedad_id || pago.propiedad_id || '|'],
      ['Propietario:', nombrePropietario],
      ['Inquilino:', nombreInquilino],
      ['Propiedad:', nombrePropiedad],
    ]
    doc.setFontSize(10)
    datos.forEach(([label, valor]) => {
      doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80)
      doc.text(label, margin, y)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(26, 26, 26)
      doc.text(String(valor), margin + 40, y)
      y += 7
    })
    y += 5

    doc.setFillColor(26, 63, 160)
    doc.rect(margin, y, W - margin * 2, 8, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
    doc.text('CONCEPTO', margin + 3, y + 5.5)
    doc.text('IMPORTE', W - margin - 3, y + 5.5, { align: 'right' })
    y += 8

    doc.setFillColor(255, 255, 255)
    doc.rect(margin, y, W - margin * 2, 7, 'F')
    doc.setTextColor(50, 50, 50); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    doc.text(esUSD ? 'Alquiler cobrado (USD)' : 'Alquiler cobrado', margin + 3, y + 4.8)
    doc.text(fmtAlq(pago.alquiler), W - margin - 3, y + 4.8, { align: 'right' })
    y += 7

    if (Number(pago.multa_mora) > 0) {
      doc.setFillColor(242, 244, 246)
      doc.rect(margin, y, W - margin * 2, 7, 'F')
      doc.setTextColor(50, 50, 50); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
      doc.text('Multa por mora', margin + 3, y + 4.8)
      doc.text(fmtAlq(pago.multa_mora), W - margin - 3, y + 4.8, { align: 'right' })
      y += 7
    }

    y += 3

    doc.setFillColor(254, 243, 226)
    doc.rect(margin, y, W - margin * 2, 6, 'F')
    doc.setTextColor(138, 92, 16); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
    doc.text(esUSD ? 'DESCUENTOS (USD)' : 'DESCUENTOS', margin + 3, y + 4)
    y += 6

    doc.setFillColor(255, 253, 248)
    doc.rect(margin, y, W - margin * 2, 7, 'F')
    doc.setTextColor(138, 92, 16); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    doc.text('Comision de gestion (' + (pago.comision_pct || 5) + '%)', margin + 3, y + 4.8)
    doc.text('- ' + fmtAlq(pago.monto_comision), W - margin - 3, y + 4.8, { align: 'right' })
    y += 7

    if (gastosProp.length > 0) {
      gastosProp.forEach((g, i) => {
        doc.setFillColor(i % 2 === 0 ? 232 : 240, i % 2 === 0 ? 238 : 244, i % 2 === 0 ? 251 : 255)
        doc.rect(margin, y, W - margin * 2, 7, 'F')
        doc.setTextColor(26, 63, 160); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
        doc.text(g.concepto || 'Gasto propietario', margin + 3, y + 4.8)
        doc.text('- ' + fmtN(g.importe), W - margin - 3, y + 4.8, { align: 'right' })
        y += 7
      })
    }

    y += 3

    const netoUSD = Number(pago.alquiler || 0) + Number(pago.multa_mora || 0) - Number(pago.monto_comision || 0)
    const totalGastosPropietarioARS = gastosProp.reduce((s, g) => s + Number(g.importe || 0), 0)

    doc.setFillColor(232, 245, 238)
    doc.rect(margin, y, W - margin * 2, 10, 'F')
    doc.setTextColor(27, 107, 53); doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
    doc.text(esUSD ? 'NETO A TRANSFERIR (USD)' : 'NETO A TRANSFERIR AL PROPIETARIO', margin + 3, y + 7)
    doc.text(fmtAlq(netoUSD), W - margin - 3, y + 7, { align: 'right' })
    y += 12

    if (gastosProp.length > 0) {
      doc.setFillColor(232, 238, 251)
      doc.rect(margin, y, W - margin * 2, 6, 'F')
      doc.setTextColor(26, 63, 160); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
      doc.text('GASTOS DEL PROPIETARIO A DESCONTAR (ARS)', margin + 3, y + 4)
      y += 6
      gastosProp.forEach((g, i) => {
        doc.setFillColor(i % 2 === 0 ? 240 : 248, i % 2 === 0 ? 244 : 248, i % 2 === 0 ? 255 : 255)
        doc.rect(margin, y, W - margin * 2, 7, 'F')
        doc.setTextColor(26, 63, 160); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
        doc.text(g.concepto || 'Gasto propietario', margin + 3, y + 4.8)
        doc.text('- ' + fmtN(g.importe), W - margin - 3, y + 4.8, { align: 'right' })
        y += 7
      })
      doc.setFillColor(26, 63, 160)
      doc.rect(margin, y, W - margin * 2, 8, 'F')
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
      doc.text('TOTAL GASTOS PROPIETARIO (ARS)', margin + 3, y + 5.5)
      doc.text('- ' + fmtN(totalGastosPropietarioARS), W - margin - 3, y + 5.5, { align: 'right' })
      y += 8
    }

    y += 8

    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3)
    doc.line(margin, y, margin + 60, y)
    doc.setTextColor(80, 80, 80); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    doc.text('Firma y sello', margin, y + 5)
    doc.text(perfil.nombre_completo || 'Nombre del Administrador', margin, y + 10)
    doc.text((perfil.titulo || '') + (perfil.matricula ? ' · ' + perfil.matricula : ''), margin, y + 15)
    doc.setTextColor(136, 136, 136); doc.setFontSize(8)
    doc.text('Emitido: ' + new Date().toLocaleDateString('es-AR'), W - margin, y + 15, { align: 'right' })

    doc.setFillColor(17, 29, 19)
    doc.rect(0, 287, W, 10, 'F')
    doc.setTextColor(143, 191, 151); doc.setFontSize(7)
    doc.text('GASP | Gestion de Alquileres Sistema Profesional  |  ' + (perfil.email_contacto || ''), W / 2, 293, { align: 'center' })

    doc.save('Liquidacion_' + pago.id + '_' + (pago.periodo || '').replace(/ /g, '_') + '.pdf')
    }) // fin cargarLogoBase64
  }
  if (!document.querySelector('script[src*="jspdf"]')) document.head.appendChild(script)
  else script.onload()
}

function Pagos({ data, contratos, gastos, perfil = {}, propietarios = [], inquilinos = [], propiedades = [], onRefresh }) {
  const [form, setForm] = useState(false)
  const vacio = { id: '', contrato_id: '', propiedad_id: '', inquilino_id: '', periodo: '', fecha_pago: '', alquiler: '', gastos_adicionales: 0, multa_mora: 0, comision_pct: 5, medio_pago: 'Transferencia bancaria', estado: 'Cobrado', moneda: 'ARS' }
  const [f, setF] = useState(vacio)
  const [gastosInquilino, setGastosInquilino] = useState([])
  const [gastosPropietario, setGastosPropietario] = useState([])
  const propiedadRef = useRef('')
  const periodoRef = useRef('')

  function selContrato(cid) {
    const c = contratos.find(x => x.id === cid)
    if (c) {
      const esAnual = c.tipo_pago === 'Anual anticipado'
      propiedadRef.current = c.propiedad_id
      setF(prev => ({
        ...prev,
        contrato_id: cid,
        propiedad_id: c.propiedad_id,
        inquilino_id: c.inquilino_id,
        alquiler: esAnual ? 0 : (c.monto_actual || ''),
        comision_pct: esAnual ? 0 : (c.comision_pct || 5),
        moneda: c.moneda || 'ARS'
      }))
      return c.propiedad_id
    }
    return null
  }

  function buscarGastos(periodo, propiedad_id) {
    if (!periodo || !propiedad_id) { setGastosInquilino([]); setGastosPropietario([]); return }
    const per = periodo.toLowerCase().trim()
    const gi = gastos.filter(g => g.propiedad_id === propiedad_id && g.responsable === 'Inquilino' && g.periodo && g.periodo.toLowerCase().trim() === per)
    const gp = gastos.filter(g => g.propiedad_id === propiedad_id && g.responsable === 'Propietario' && g.periodo && g.periodo.toLowerCase().trim() === per)
    setGastosInquilino(gi)
    setGastosPropietario(gp)
    const totalInq = gi.reduce((s, g) => s + Number(g.importe || 0), 0)
    setF(prev => ({ ...prev, gastos_adicionales: totalInq }))
  }

  function handlePeriodo(v) {
    periodoRef.current = v
    setF(prev => ({ ...prev, periodo: v }))
    if (propiedadRef.current) buscarGastos(v, propiedadRef.current)
  }

  function handleContrato(cid) {
    const c = contratos.find(x => x.id === cid)
    if (c) {
      propiedadRef.current = c.propiedad_id
      selContrato(cid)
      if (periodoRef.current) buscarGastos(periodoRef.current, c.propiedad_id)
    }
  }

  function handleBuscarGastos() {
    const propId = propiedadRef.current || f.propiedad_id
    const per = periodoRef.current || f.periodo
    if (!per) return alert('Ingrese el período primero')
    if (!propId) return alert('Seleccione el contrato primero')
    buscarGastos(per, propId)
  }

  async function guardar() {
    if (!f.contrato_id) return alert('Complete el Contrato')
    const adminId = (await supabase.auth.getUser()).data.user?.id
    const nuevoId = nextId(data, 'PG')
    const alquiler = Number(f.alquiler) || 0
    const comision_pct = Number(f.comision_pct) || 5
    const comisionImporte = alquiler * comision_pct / 100

    const { error } = await supabase.from('pagos').insert([{
      ...f,
      id: nuevoId,
      alquiler,
      gastos_adicionales: Number(f.gastos_adicionales) || 0,
      multa_mora: Number(f.multa_mora) || 0,
      comision_pct,
      admin_id: adminId,
    }])
    if (error) return alert('Error: ' + error.message)

    // Registrar en caja: SOLO comisión de gestión (modelo administración)
    // El alquiler es dinero del propietario — la administración solo registra su comisión
    const contratoCaja = contratos.find(x => x.id === f.contrato_id)
    const nombreInq = inquilinos?.find(q => q.id === (contratoCaja?.inquilino_id))?.apellido_nombre || contratoCaja?.inquilino_id || ''
    const fechaCaja = f.fecha_pago || new Date().toISOString().split('T')[0]
    const monedaCaja = f.moneda || 'ARS'
    const cajaMovs = []

    // Ingreso: solo la comisión de gestión
    if (comisionImporte > 0) {
      cajaMovs.push({
        id: 'CJ-COM-' + nuevoId,
        fecha: fechaCaja,
        tipo: 'Ingreso',
        categoria: 'Comisión de gestión',
        concepto: `Comisión ${f.contrato_id} — ${f.periodo || ''} — ${nombreInq}`,
        importe: comisionImporte,
        moneda: monedaCaja,
        referencia_pago_id: nuevoId,
        referencia_contrato_id: f.contrato_id,
        admin_id: adminId,
      })
    }

    await supabase.from('caja').insert(cajaMovs)

    setForm(false)
    setF(vacio)
    setGastosInquilino([])
    setGastosPropietario([])
    onRefresh()
  }

  const fmtMoneda = (n, m) => m === 'USD' ? 'USD ' + Number(n || 0).toLocaleString('es-AR') : fmt(n)
  const al = Number(f.alquiler) || 0
  const ga = Number(f.gastos_adicionales) || 0
  const mo = Number(f.multa_mora) || 0
  const co = Number(f.comision_pct) || 5
  const comision = al * co / 100
  const totalGastosProp = gastosPropietario.reduce((s, g) => s + Number(g.importe || 0), 0)
  const neto = al - comision

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <BtnPrimario onClick={() => setForm(true)}>+ Registrar pago</BtnPrimario>
      </div>

      {form && (
        <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 12 }}>Registrar pago</div>
          {(() => {
            const c = contratos.find(x => x.id === f.contrato_id)
            return c?.tipo_pago === 'Anual anticipado' ? (
              <div style={{ background: '#FFF5E6', border: '0.5px solid #E8A951', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#8B5A00' }}>
                ⓘ Contrato ANUAL ANTICIPADO. El alquiler y comisión ya fueron cobrados al firmar. Este pago debería ser solo por gastos mensuales (expensas, servicios, etc.).
              </div>
            ) : null
          })()}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: 'span 2', fontSize: 11, color: '#888', marginBottom: -4 }}>ID auto: {nextId(data, 'PG')}</div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Contrato</div>
              <select value={f.contrato_id} onChange={e => handleContrato(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                <option value="">Seleccionar...</option>
                {contratos.map(c => { const inq = inquilinos?.find(q => q.id === c.inquilino_id); const prop = propiedades?.find(p => p.id === c.propiedad_id); return <option key={c.id} value={c.id}>{c.id} — {inq?.apellido_nombre || c.inquilino_id} · {prop?.direccion || c.propiedad_id} ({c.moneda || 'ARS'})</option> })}
              </select>
            </div>
            <Input label="Período (ej: Junio 2025)" value={f.periodo} onChange={handlePeriodo} />
            <Input label="Fecha de pago" value={f.fecha_pago} onChange={v => setF({ ...f, fecha_pago: v })} type="date" />
            <Input label={f.moneda === 'USD' ? 'Alquiler USD' : 'Alquiler $'} value={f.alquiler} onChange={v => setF({ ...f, alquiler: v })} type="number" />
            <Input label="Multa mora $" value={f.multa_mora} onChange={v => setF({ ...f, multa_mora: v })} type="number" />
            <Input label="Comisión %" value={f.comision_pct} onChange={v => setF({ ...f, comision_pct: v })} type="number" />
          </div>
          {f.moneda === 'USD' && (
            <div style={{ background: '#E8EEFB', border: '0.5px solid #B5CAF5', borderRadius: 8, padding: '8px 14px', marginBottom: 10, fontSize: 12, color: B }}>
              <strong>Contrato en dólares (USD)</strong> — El alquiler y la comisión se registran en USD. Los gastos del inquilino y propietario se cargan en pesos (ARS).
            </div>
          )}

          <div style={{ marginBottom: 10 }}>
            <button onClick={handleBuscarGastos} style={{ padding: '7px 16px', borderRadius: 7, background: W, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>
              🔍 Buscar gastos del período
            </button>
            {f.propiedad_id && f.periodo && <span style={{ fontSize: 11, color: '#888', marginLeft: 10 }}>Buscando en {f.propiedad_id} · {f.periodo} ({gastos.length} gastos totales)</span>}
          </div>

          {gastosInquilino.length > 0 && (
            <div style={{ background: '#FEF3E2', border: '0.5px solid #F0C070', borderRadius: 8, padding: 12, marginBottom: 10 }}>
              <div style={{ fontWeight: 'bold', fontSize: 12, color: W, marginBottom: 6 }}>Gastos del inquilino detectados para este período:</div>
              {gastosInquilino.map((g, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span>{g.concepto}</span>
                  <span style={{ fontWeight: 'bold' }}>{fmt(g.importe)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 'bold', borderTop: '1px solid #F0C070', paddingTop: 6, marginTop: 6 }}>
                <span>Total gastos inquilino (incluido)</span>
                <span>{fmt(ga)}</span>
              </div>
            </div>
          )}

          {gastosPropietario.length > 0 && (
            <div style={{ background: '#E8EEFB', border: '0.5px solid #B5CAF5', borderRadius: 8, padding: 12, marginBottom: 10 }}>
              <div style={{ fontWeight: 'bold', fontSize: 12, color: B, marginBottom: 6 }}>Gastos del propietario detectados (se descuentan de la liquidación):</div>
              {gastosPropietario.map((g, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span>{g.concepto}</span>
                  <span style={{ fontWeight: 'bold', color: D }}>− {fmt(g.importe)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 'bold', borderTop: '1px solid #B5CAF5', paddingTop: 6, marginTop: 6 }}>
                <span>Total gastos propietario</span>
                <span style={{ color: D }}>− {fmt(totalGastosProp)}</span>
              </div>
            </div>
          )}
          {al > 0 && (
            <div style={{ background: '#E8F5EE', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 12 }}>
              {f.moneda === 'USD' ? (
                <>
                  <div style={{ fontWeight: 'bold', fontSize: 11, color: B, marginBottom: 6 }}>EN DOLARES (USD)</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Alquiler</span><span>USD {Number(al).toLocaleString('es-AR')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Comision ({co}%)</span><span style={{ color: B }}>- USD {Number(comision).toLocaleString('es-AR')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 13, borderTop: '1px solid #9DDCB4', paddingTop: 6, marginTop: 4 }}>
                    <span>Neto al propietario</span><span style={{ color: G }}>USD {Number(neto).toLocaleString('es-AR')}</span>
                  </div>
                  {(ga > 0 || totalGastosProp > 0) && (
                    <>
                      <div style={{ fontWeight: 'bold', fontSize: 11, color: W, marginTop: 10, marginBottom: 6 }}>EN PESOS (ARS)</div>
                      {ga > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Gastos inquilino</span><span>{fmt(ga)}</span></div>}
                      {totalGastosProp > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Gastos propietario</span><span style={{ color: D }}>- {fmt(totalGastosProp)}</span></div>}
                    </>
                  )}
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Alquiler</span><span>{fmt(al)}</span></div>
                  {ga > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Gastos inquilino</span><span>{fmt(ga)}</span></div>}
                  {mo > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Multa mora</span><span>{fmt(mo)}</span></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Comision ({co}%)</span><span style={{ color: B }}>- {fmt(comision)}</span></div>
                  {totalGastosProp > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Gastos propietario</span><span style={{ color: D }}>- {fmt(totalGastosProp)}</span></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 13, borderTop: '1px solid #9DDCB4', paddingTop: 6, marginTop: 4 }}>
                    <span>Neto al propietario</span><span style={{ color: G }}>{fmt(neto)}</span>
                  </div>
                </>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <BtnPrimario onClick={guardar}>Guardar pago</BtnPrimario>
            <BtnSecundario onClick={() => setForm(false)}>Cancelar</BtnSecundario>
          </div>
        </div>
      )}

      <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
        <Tabla
          cols={['Período', 'Contrato', 'Moneda', 'Fecha', 'Alquiler', 'Gastos ARS', 'Comisión', 'Neto prop.', 'Liq.', 'Documentos', '']}
          filas={data.map(p => {
            const esUSD = p.moneda === 'USD'
            const fmtAlq = esUSD ? 'USD ' + Number(p.alquiler || 0).toLocaleString('es-AR') : fmt(p.alquiler)
            const fmtCom = esUSD ? 'USD ' + Number(p.monto_comision || 0).toLocaleString('es-AR') : fmt(p.monto_comision)
            const fmtNeto = esUSD ? 'USD ' + Number(p.neto_propietario || 0).toLocaleString('es-AR') : fmt(p.neto_propietario)
            return [
              p.periodo,
              p.contrato_id,
              <span style={{ background: esUSD ? '#E8EEFB' : '#E8F5EE', color: esUSD ? B : G, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 'bold' }}>{esUSD ? 'USD' : 'ARS'}</span>,
              p.fecha_pago,
              <span style={{ fontWeight: 'bold', color: esUSD ? B : '#1A1A1A' }}>{fmtAlq}</span>,
              fmt(p.gastos_adicionales),
              <span style={{ color: B }}>{fmtCom}</span>,
              <span style={{ fontWeight: 'bold', color: G }}>{fmtNeto}</span>,
              p.liquidacion_enviada
                ? <span style={{ color: G, fontSize: 11, fontWeight: 'bold' }}>✓ Enviada</span>
                : <button onClick={async () => {
                    if (!window.confirm('¿Marcar liquidación de ' + p.contrato_id + ' como enviada?')) return
                    const { error } = await supabase.from('pagos').update({ liquidacion_enviada: true }).eq('id', p.id)
                    if (error) return alert('Error: ' + error.message)
                    onRefresh()
                  }} style={{ padding: '3px 8px', borderRadius: 5, background: W, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>📤 Marcar</button>,
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => generarReciboPDF(p, contratos, gastos.filter(g => g.propiedad_id === p.propiedad_id && g.periodo && g.periodo.toLowerCase().trim() === (p.periodo || '').toLowerCase().trim()), perfil, propietarios, inquilinos, propiedades)} style={{ padding: '4px 8px', borderRadius: 5, background: G, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>📄 Recibo</button>
                <button onClick={() => generarLiquidacionPDF(p, contratos, gastos.filter(g => g.propiedad_id === p.propiedad_id && g.periodo && g.periodo.toLowerCase().trim() === (p.periodo || '').toLowerCase().trim()), perfil, propietarios, inquilinos, propiedades)} style={{ padding: '4px 8px', borderRadius: 5, background: B, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>📊 Liquid.</button>
              </div>,
              <button onClick={async () => {
                if (!window.confirm('¿Eliminar el pago ' + p.id + '? Esta acción no se puede deshacer.')) return
                const { error } = await supabase.from('pagos').delete().eq('id', p.id)
                if (error) return alert('Error: ' + error.message)
                onRefresh()
              }} style={{ padding: '3px 8px', borderRadius: 5, background: D, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✗ Eliminar</button>,
            ]
          })}
        />
      </div>
    </>
  )
}

function Gastos({ data, propiedades, onRefresh }) {
  const [form, setForm] = useState(false)
  const vacio = { id: '', propiedad_id: '', periodo: '', concepto: '', responsable: 'Inquilino', importe: '', fecha_comprobante: '', nro_comprobante: '', observaciones: '', estado: 'Imputado' }
  const [f, setF] = useState(vacio)

  async function guardar() {
    if (!f.propiedad_id) return alert('Seleccione la Propiedad')
    const nuevoId = nextId(data, 'GT')
    const impacto = f.responsable === 'Inquilino' ? '+ suma al cobro' : '- descuenta liquidación'
    const { error } = await supabase.from('gastos').insert([{ ...f, id: nuevoId, importe: Number(f.importe) || 0, impacto, admin_id: (await supabase.auth.getUser()).data.user?.id }])
    if (error) return alert('Error: ' + error.message)
    setForm(false)
    setF(vacio)
    onRefresh()
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <BtnPrimario onClick={() => setForm(true)}>+ Cargar gasto</BtnPrimario>
      </div>

      {form && (
        <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 12 }}>Cargar gasto adicional</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div style={{ gridColumn: 'span 2', fontSize: 11, color: '#888', marginBottom: -4 }}>ID auto: {nextId(data, 'GT')}</div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Propiedad</div>
              <select value={f.propiedad_id} onChange={e => setF({ ...f, propiedad_id: e.target.value })} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                <option value="">Seleccionar...</option>
                {propiedades.map(p => <option key={p.id} value={p.id}>{p.direccion}</option>)}
              </select>
            </div>
            <Select label="Responsable" value={f.responsable} onChange={v => setF({ ...f, responsable: v })} options={['Inquilino', 'Propietario']} />
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Concepto</div>
              <select value={f.concepto} onChange={e => setF({ ...f, concepto: e.target.value })} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                <option value="">Seleccionar...</option>
                <option>Expensas comunes</option>
                <option>Impuesto municipal</option>
                <option>Servicio de luz</option>
                <option>Servicio de gas</option>
                <option>Servicio de agua</option>
                <option>Multa por mora</option>
                <option>Reparación a cargo del inquilino</option>
                <option>Expensas extraordinarias</option>
                <option>Impuesto ARBA</option>
                <option>Reparación a cargo del propietario</option>
                <option>Seguro del inmueble</option>
              </select>
            </div>
            <Input label="Período (ej: Junio 2025)" value={f.periodo} onChange={v => setF({ ...f, periodo: v })} />
            <Input label="Importe $" value={f.importe} onChange={v => setF({ ...f, importe: v })} type="number" />
            <Input label="Fecha comprobante" value={f.fecha_comprobante} onChange={v => setF({ ...f, fecha_comprobante: v })} type="date" />
            <Input label="N. comprobante" value={f.nro_comprobante} onChange={v => setF({ ...f, nro_comprobante: v })} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <BtnPrimario onClick={guardar}>Guardar gasto</BtnPrimario>
            <BtnSecundario onClick={() => setForm(false)}>Cancelar</BtnSecundario>
          </div>
        </div>
      )}

      <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
        <Tabla
          cols={['Propiedad', 'Período', 'Concepto', 'Responsable', 'Importe', 'Impacto', 'Estado']}
          filas={data.map(g => [
            g.propiedad_id,
            g.periodo,
            g.concepto,
            <Pill text={g.responsable} color={g.responsable === 'Inquilino' ? 'warn' : 'blue'} />,
            fmt(g.importe),
            <span style={{ fontSize: 12, color: g.responsable === 'Inquilino' ? W : B }}>{g.impacto}</span>,
            <Pill text={g.estado} color={g.estado === 'Imputado' ? 'ok' : 'danger'} />,
          ])}
        />
      </div>
    </>
  )
}

function generarTokenPortal(id) {
  const secret = 'gasp2024pinamar'
  const str = id + ':' + secret
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

function generarCajaPDF(movimientos, fechaDesde, fechaHasta, perfil = {}) {
  const fmtN = n => '$' + Number(n || 0).toLocaleString('es-AR')
  const script = document.createElement('script')
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
  script.onload = () => {
    const { jsPDF } = window.jspdf
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const W = 210, margin = 14

    const logoImg = new window.Image()
    logoImg.src = '/logo.jpeg'
    logoImg.onload = () => {
      doc.addImage(logoImg, 'JPEG', margin, 10, 20, 20)
      renderPDF()
    }
    logoImg.onerror = () => renderPDF()

    function renderPDF() {
      doc.setFillColor(27, 107, 53)
      doc.rect(0, 0, W, 45, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.text('GASP', margin + 24, 20)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text('Gestion de Alquileres Sistema Profesional', margin + 24, 26)
      doc.text((perfil.nombre_completo || 'Administrador') + '  |  ' + (perfil.titulo || '') + '  |  ' + (perfil.matricula || ''), margin + 24, 31)
      doc.text((perfil.ciudad || '') + (perfil.provincia ? ', ' + perfil.provincia : '') + '  |  ' + (perfil.email_contacto || ''), margin + 24, 36)

      doc.setTextColor(27, 107, 53)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(15)
      doc.text('REPORTE DE CAJA', margin, 56)
      const periodo = (fechaDesde || '—') + '  al  ' + (fechaHasta || '—')
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('Período: ' + periodo, margin, 63)
      doc.setDrawColor(27, 107, 53)
      doc.setLineWidth(0.5)
      doc.line(margin, 66, W - margin, 66)

      const ingARS = movimientos.filter(m => m.tipo === 'Ingreso' && m.moneda === 'ARS').reduce((s, m) => s + Number(m.importe), 0)
      const egrARS = movimientos.filter(m => m.tipo === 'Egreso' && m.moneda === 'ARS').reduce((s, m) => s + Number(m.importe), 0)
      const comARS = movimientos.filter(m => m.categoria === 'Comisión de gestión' && m.moneda === 'ARS').reduce((s, m) => s + Number(m.importe), 0)
      const saldoARS = ingARS - egrARS

      let y = 72
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      const cols = [['TOTAL INGRESOS ARS', fmtN(ingARS)], ['TOTAL EGRESOS ARS', fmtN(egrARS)], ['RESULTADO ARS', fmtN(saldoARS)], ['Comisiones', fmtN(comARS)]]
      cols.forEach(([label, val], i) => {
        const x = margin + (i % 2) * 90
        if (i % 2 === 0) y += i === 0 ? 0 : 10
        doc.setFillColor(i === 2 ? (saldoARS >= 0 ? 27 : 184) : 245, i === 2 ? (saldoARS >= 0 ? 107 : 48) : 245, i === 2 ? (saldoARS >= 0 ? 53 : 48) : 245)
        doc.rect(x, y - 5, 88, 8, 'F')
        doc.setTextColor(i === 2 ? 255 : 30, i === 2 ? 255 : 30, i === 2 ? 255 : 30)
        doc.text(label, x + 2, y)
        doc.setFont('helvetica', 'bold')
        doc.text(val, x + 86, y, { align: 'right' })
        doc.setFont('helvetica', 'normal')
      })
      y += 16

      doc.setTextColor(27, 107, 53)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('TOTALES POR CATEGORÍA', margin, y)
      y += 4
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.3)
      doc.line(margin, y, W - margin, y)
      y += 5

      const categorias = {}
      movimientos.filter(m => m.moneda === 'ARS').forEach(m => {
        if (!categorias[m.categoria]) categorias[m.categoria] = { ing: 0, egr: 0 }
        if (m.tipo === 'Ingreso') categorias[m.categoria].ing += Number(m.importe)
        else categorias[m.categoria].egr += Number(m.importe)
      })

      doc.setFontSize(9)
      doc.setTextColor(0)
      Object.entries(categorias).forEach(([cat, vals]) => {
        doc.setFont('helvetica', 'normal')
        doc.text(cat, margin, y)
        if (vals.ing > 0) { doc.setTextColor(27, 107, 53); doc.text('+ ' + fmtN(vals.ing), W - margin - 40, y) }
        if (vals.egr > 0) { doc.setTextColor(184, 48, 48); doc.text('- ' + fmtN(vals.egr), W - margin, y, { align: 'right' }) }
        doc.setTextColor(0)
        y += 7
      })
      y += 4

      doc.setTextColor(27, 107, 53)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('DETALLE DE MOVIMIENTOS', margin, y)
      y += 4
      doc.setLineWidth(0.3)
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, y, W - margin, y)
      y += 5

      doc.setFillColor(27, 107, 53)
      doc.rect(margin, y - 4, W - margin * 2, 7, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.text('Fecha', margin + 1, y)
      doc.text('Tipo', margin + 22, y)
      doc.text('Categoría', margin + 38, y)
      doc.text('Concepto', margin + 80, y)
      doc.text('Importe', W - margin - 1, y, { align: 'right' })
      y += 6

      doc.setFont('helvetica', 'normal')
      movimientos.filter(m => m.moneda === 'ARS').forEach((m, i) => {
        if (y > 270) { doc.addPage(); y = 20 }
        if (i % 2 === 0) { doc.setFillColor(247, 248, 250); doc.rect(margin, y - 3.5, W - margin * 2, 6, 'F') }
        doc.setTextColor(0)
        doc.text(m.fecha || '', margin + 1, y)
        doc.setTextColor(m.tipo === 'Ingreso' ? 27 : 184, m.tipo === 'Ingreso' ? 107 : 48, m.tipo === 'Ingreso' ? 53 : 48)
        doc.text(m.tipo, margin + 22, y)
        doc.setTextColor(0)
        doc.text((m.categoria || '').substring(0, 22), margin + 38, y)
        doc.text((m.concepto || '').substring(0, 30), margin + 80, y)
        doc.setTextColor(m.tipo === 'Ingreso' ? 27 : 184, m.tipo === 'Ingreso' ? 107 : 48, m.tipo === 'Ingreso' ? 53 : 48)
        doc.text((m.tipo === 'Egreso' ? '- ' : '+ ') + fmtN(m.importe), W - margin - 1, y, { align: 'right' })
        y += 6
      })

      doc.setFillColor(13, 61, 32)
      doc.rect(0, 287, W, 10, 'F')
      doc.setTextColor(200, 220, 200)
      doc.setFontSize(7)
      doc.text('GASP | Gestion de Alquileres Sistema Profesional  |  ' + (perfil.email_contacto || ''), W / 2, 293, { align: 'center' })

      doc.save('Reporte_Caja_' + (fechaDesde || '') + '_' + (fechaHasta || '') + '.pdf')
    }
  }
  if (!document.querySelector('script[src*="jspdf"]')) document.head.appendChild(script)
  else script.onload()
}

function generarCuentaCorrientePDF(prop, movimientos, totARS, totUSD, perfil = {}, pagosRealizados = []) {
  // totARS = { alquiler, comision, gastos, neto }
  // totUSD = { alquiler, comision, gastos, neto }
  // pagosRealizados = movimientos de caja tipo Egreso categoría 'Pago a propietario'
  const fmtA = n => '$' + Number(n || 0).toLocaleString('es-AR')
  const fmtU = n => 'USD ' + Number(n || 0).toLocaleString('es-AR')
  const fmtM = (n, mon) => mon === 'USD' ? fmtU(n) : fmtA(n)

  const script = document.createElement('script')
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
  script.onload = () => {
    cargarLogoBase64(logoB64 => {
    const { jsPDF } = window.jspdf
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const W = 210, margin = 14
    let y = 20

    doc.setFillColor(26, 63, 160)
    doc.rect(0, 0, W, 42, 'F')
    if (logoB64) doc.addImage(logoB64, 'JPEG', margin, 4, 34, 34)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.text('GASP', margin + 38, 16)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.text('Gestion de Alquileres Sistema Profesional', margin + 38, 23)
    doc.setFontSize(8)
    doc.text((perfil.nombre_completo || 'Nombre del Administrador') + '  |  ' + (perfil.titulo || 'Título') + '  |  ' + (perfil.matricula || ''), margin + 38, 30)
    doc.text((perfil.ciudad || '') + (perfil.provincia ? ', ' + perfil.provincia : '') + '  |  ' + (perfil.email_contacto || ''), margin + 38, 36)

    y = 57
    doc.setTextColor(26, 63, 160)
    doc.setFontSize(15); doc.setFont('helvetica', 'bold')
    doc.text('CUENTA CORRIENTE DEL PROPIETARIO', margin, y)
    y += 8
    doc.setDrawColor(26, 63, 160); doc.setLineWidth(0.8)
    doc.line(margin, y, W - margin, y)
    y += 10

    // Datos propietario
    doc.setFontSize(10); doc.setTextColor(50, 50, 50)
    doc.setFont('helvetica', 'bold'); doc.text('Propietario:', margin, y)
    doc.setFont('helvetica', 'normal'); doc.text(prop?.apellido_nombre || '—', margin + 35, y)
    y += 7
    if (prop?.dni_cuit) { doc.setFont('helvetica', 'bold'); doc.text('DNI/CUIT:', margin, y); doc.setFont('helvetica', 'normal'); doc.text(prop.dni_cuit, margin + 35, y); y += 7 }
    if (prop?.email) { doc.setFont('helvetica', 'bold'); doc.text('Email:', margin, y); doc.setFont('helvetica', 'normal'); doc.text(prop.email, margin + 35, y); y += 7 }
    if (prop?.cbu) { doc.setFont('helvetica', 'bold'); doc.text('CBU:', margin, y); doc.setFont('helvetica', 'normal'); doc.text(prop.cbu, margin + 35, y); y += 7 }
    if (prop?.banco) { doc.setFont('helvetica', 'bold'); doc.text('Banco:', margin, y); doc.setFont('helvetica', 'normal'); doc.text(prop.banco, margin + 35, y); y += 7 }
    doc.setFont('helvetica', 'bold'); doc.text('Emitido:', margin, y)
    doc.setFont('helvetica', 'normal'); doc.text(new Date().toLocaleDateString('es-AR'), margin + 35, y)
    y += 10

    // Header tabla — columnas bien espaciadas
    // Periodo(20) | Fecha(22) | Propiedad(25) | Moneda(12) | Alquiler(20) | Gs.Prop(18) | Comision(20) | Neto(right)
    const c0 = margin + 1
    const c1 = margin + 24
    const c2 = margin + 48
    const c3 = margin + 76
    const c4 = margin + 91
    const c5 = margin + 113
    const c6 = margin + 133

    doc.setFillColor(26, 63, 160)
    doc.rect(margin, y, W - margin * 2, 8, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5)
    doc.text('Período', c0, y + 5.5)
    doc.text('Fecha', c1, y + 5.5)
    doc.text('Propiedad', c2, y + 5.5)
    doc.text('Mon.', c3, y + 5.5)
    doc.text('Alquiler', c4, y + 5.5)
    doc.text('Gs.Prop.', c5, y + 5.5)
    doc.text('Comisión', c6, y + 5.5)
    doc.text('Neto', W - margin - 2, y + 5.5, { align: 'right' })
    y += 8

    // Filas de movimientos
    movimientos.forEach((m, i) => {
      if (y > 260) { doc.addPage(); y = 20 }
      if (i % 2 === 0) { doc.setFillColor(242, 244, 246); doc.rect(margin, y, W - margin * 2, 7, 'F') }
      const esUSD = m.moneda === 'USD'
      doc.setTextColor(50, 50, 50); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
      doc.text((m.periodo || '—').substring(0, 12), c0, y + 4.8)
      doc.text(m.fecha || '—', c1, y + 4.8)
      // Propiedad: máximo 14 chars para evitar desborde
      doc.text((m.propiedad || '—').substring(0, 14), c2, y + 4.8)
      // Moneda pill
      doc.setTextColor(esUSD ? 26 : 27, esUSD ? 63 : 107, esUSD ? 160 : 53)
      doc.setFont('helvetica', 'bold')
      doc.text(m.moneda || 'ARS', c3, y + 4.8)
      doc.setTextColor(50, 50, 50); doc.setFont('helvetica', 'normal')
      doc.text(fmtM(m.alquiler, m.moneda), c4, y + 4.8)
      doc.text(m.gastosProp > 0 ? '- ' + fmtA(m.gastosProp) : '—', c5, y + 4.8)
      doc.text('- ' + fmtM(m.comision, m.moneda), c6, y + 4.8)
      doc.setTextColor(27, 107, 53); doc.setFont('helvetica', 'bold')
      doc.text(fmtM(m.neto, m.moneda), W - margin - 2, y + 4.8, { align: 'right' })
      y += 7
    })

    y += 4

    // Totales ARS
    if (totARS.alquiler > 0) {
      doc.setFillColor(26, 26, 26)
      doc.rect(margin, y, W - margin * 2, 8, 'F')
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
      doc.text('TOTALES ARS', c0, y + 5.5)
      doc.text(fmtA(totARS.alquiler), c4, y + 5.5)
      doc.text('- ' + fmtA(totARS.gastos), c5, y + 5.5)
      doc.text('- ' + fmtA(totARS.comision), c6, y + 5.5)
      doc.text(fmtA(totARS.neto), W - margin - 2, y + 5.5, { align: 'right' })
      y += 8
    }

    // Totales USD
    if (totUSD.alquiler > 0) {
      doc.setFillColor(26, 63, 160)
      doc.rect(margin, y, W - margin * 2, 8, 'F')
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
      doc.text('TOTALES USD', c0, y + 5.5)
      doc.text(fmtU(totUSD.alquiler), c4, y + 5.5)
      doc.text('- ' + fmtU(totUSD.gastos), c5, y + 5.5)
      doc.text('- ' + fmtU(totUSD.comision), c6, y + 5.5)
      doc.text(fmtU(totUSD.neto), W - margin - 2, y + 5.5, { align: 'right' })
      y += 8
    }

    // Neto ARS
    if (totARS.neto > 0) {
      y += 2
      doc.setFillColor(232, 245, 238)
      doc.rect(margin, y, W - margin * 2, 10, 'F')
      doc.setTextColor(27, 107, 53); doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
      doc.text('NETO A TRANSFERIR AL PROPIETARIO (ARS)', margin + 3, y + 7)
      doc.text(fmtA(totARS.neto), W - margin - 2, y + 7, { align: 'right' })
      y += 12
    }

    // Neto USD
    if (totUSD.neto > 0) {
      doc.setFillColor(232, 238, 251)
      doc.rect(margin, y, W - margin * 2, 10, 'F')
      doc.setTextColor(26, 63, 160); doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
      doc.text('NETO A TRANSFERIR AL PROPIETARIO (USD)', margin + 3, y + 7)
      doc.text(fmtU(totUSD.neto), W - margin - 2, y + 7, { align: 'right' })
      y += 12
    }

    // Pagos realizados al propietario (movimientos de caja)
    const pagosARS = pagosRealizados.filter(p => p.moneda !== 'USD')
    const pagosUSD = pagosRealizados.filter(p => p.moneda === 'USD')
    const totalPagadoARS = pagosARS.reduce((s, p) => s + Number(p.importe || 0), 0)
    const totalPagadoUSD = pagosUSD.reduce((s, p) => s + Number(p.importe || 0), 0)

    if (pagosRealizados.length > 0) {
      if (y > 240) { doc.addPage(); y = 20 }
      y += 4
      doc.setFillColor(17, 107, 53)
      doc.rect(margin, y - 4, W - margin * 2, 7, 'F')
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
      doc.text('PAGOS REALIZADOS AL PROPIETARIO', margin + 2, y)
      y += 7

      pagosRealizados.forEach((p, i) => {
        if (y > 265) { doc.addPage(); y = 20 }
        if (i % 2 === 0) { doc.setFillColor(232, 245, 238); doc.rect(margin, y - 3.5, W - margin * 2, 6, 'F') }
        doc.setTextColor(50, 50, 50); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
        doc.text(p.fecha || '—', margin + 2, y)
        doc.text((p.concepto || 'Transferencia').substring(0, 60), margin + 26, y)
        doc.setTextColor(27, 107, 53); doc.setFont('helvetica', 'bold')
        doc.text((p.moneda === 'USD' ? fmtU : fmtA)(p.importe), W - margin - 2, y, { align: 'right' })
        y += 6
      })

      // Total pagado
      doc.setFillColor(27, 107, 53)
      doc.rect(margin, y, W - margin * 2, 8, 'F')
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
      doc.text('TOTAL TRANSFERIDO AL PROPIETARIO', margin + 2, y + 5.5)
      const resumenPago = [
        totalPagadoARS > 0 ? fmtA(totalPagadoARS) : '',
        totalPagadoUSD > 0 ? fmtU(totalPagadoUSD) : ''
      ].filter(Boolean).join('  +  ')
      doc.text(resumenPago, W - margin - 2, y + 5.5, { align: 'right' })
      y += 10

      // Saldo pendiente
      const saldoPendienteARS = totARS.neto - totalPagadoARS
      const saldoPendienteUSD = totUSD.neto - totalPagadoUSD
      if (saldoPendienteARS > 0 || saldoPendienteUSD > 0) {
        doc.setFillColor(254, 243, 226)
        doc.rect(margin, y, W - margin * 2, 8, 'F')
        doc.setTextColor(138, 92, 16); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
        doc.text('SALDO PENDIENTE DE TRANSFERENCIA', margin + 2, y + 5.5)
        const resumenSaldo = [
          saldoPendienteARS > 0 ? fmtA(saldoPendienteARS) : '',
          saldoPendienteUSD > 0 ? fmtU(saldoPendienteUSD) : ''
        ].filter(Boolean).join('  +  ')
        doc.text(resumenSaldo, W - margin - 2, y + 5.5, { align: 'right' })
        y += 10
      } else {
        doc.setFillColor(232, 245, 238)
        doc.rect(margin, y, W - margin * 2, 8, 'F')
        doc.setTextColor(27, 107, 53); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
        doc.text('✓ LIQUIDACIÓN COMPLETA — Sin saldo pendiente', margin + 2, y + 5.5)
        y += 10
      }
      y += 4
    }

    y += 4

    // Firma
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3)
    doc.line(margin, y, margin + 60, y)
    doc.setTextColor(80, 80, 80); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    doc.text('Firma y sello', margin, y + 5)
    doc.text(perfil.nombre_completo || 'Nombre del Administrador', margin, y + 10)
    doc.text((perfil.titulo || '') + (perfil.matricula ? ' · ' + perfil.matricula : ''), margin, y + 15)

    doc.setFillColor(17, 29, 19)
    doc.rect(0, 287, W, 10, 'F')
    doc.setTextColor(143, 191, 151); doc.setFontSize(7)
    doc.text('GASP | Gestion de Alquileres Sistema Profesional  |  ' + (perfil.email_contacto || ''), W / 2, 293, { align: 'center' })

    doc.save('CuentaCorriente_' + (prop?.id || '') + '_' + new Date().toLocaleDateString('es-AR').replace(/\//g, '-') + '.pdf')
    }) // fin cargarLogoBase64
  }
  if (!document.querySelector('script[src*="jspdf"]')) document.head.appendChild(script)
  else script.onload()
}


function Liquidaciones({ contratos, pagos: pagosIniciales, gastos, propietarios, perfil = {}, cajaMov = [] }) {
  const [pagosLocal, setPagosLocal] = useState(pagosIniciales)

  // Sincronizar pagosLocal cuando cambian los pagos del App (por refresh externo)
  useEffect(() => { setPagosLocal(pagosIniciales) }, [pagosIniciales])
  const [propSelec, setPropSelec] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [modalPago, setModalPago] = useState(false)
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0])
  const [obsPago, setObsPago] = useState('')
  const [loadingPago, setLoadingPago] = useState(false)
  const [msgPago, setMsgPago] = useState(null)

  const resumen = contratos.map(c => {
    const ps = pagosLocal.filter(p => p.contrato_id === c.id)
    const gs = gastos.filter(g => g.propiedad_id === c.propiedad_id && g.responsable === 'Propietario')
    const alquiler = ps.reduce((s, p) => s + Number(p.alquiler || 0), 0)
    const comision = ps.reduce((s, p) => s + Number(p.monto_comision || 0), 0)
    const gastosProp = gs.reduce((s, g) => s + Number(g.importe || 0), 0)
    const neto = alquiler - comision - gastosProp
    return { ...c, alquiler, comision, gastosProp, neto }
  }).filter(c => c.alquiler > 0)

  const contratosDelProp = contratos.filter(c => c.propietario_id === propSelec)
  const prop = propietarios.find(p => p.id === propSelec)

  const movimientos = contratosDelProp.flatMap(c => {
    return pagosLocal
      .filter(p => {
        if (p.contrato_id !== c.id) return false
        if (fechaDesde && p.fecha_pago < fechaDesde) return false
        if (fechaHasta && p.fecha_pago > fechaHasta) return false
        return true
      })
      .map(p => {
        const esUSD = p.moneda === 'USD' || c.moneda === 'USD'
        const gastosPeriodo = gastos.filter(g =>
          g.propiedad_id === c.propiedad_id &&
          g.responsable === 'Propietario' &&
          g.periodo && p.periodo && g.periodo.toLowerCase().trim() === p.periodo.toLowerCase().trim()
        )
        const totalGastosProp = gastosPeriodo.reduce((s, g) => s + Number(g.importe || 0), 0)
        const netoReal = Number(p.alquiler || 0) - Number(p.monto_comision || 0) - totalGastosProp
        return {
          periodo: p.periodo,
          fecha: p.fecha_pago,
          propiedad: c.propiedad_id,
          moneda: esUSD ? 'USD' : 'ARS',
          alquiler: Number(p.alquiler || 0),
          comision: Number(p.monto_comision || 0),
          gastosProp: totalGastosProp,
          gastosPropDetalle: gastosPeriodo,
          neto: netoReal,
          pagoId: p.id,
          liquidado: !!p.liquidacion_enviada
        }
      })
  }).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))

  const movsUSD = movimientos.filter(m => m.moneda === 'USD')
  const movsARS = movimientos.filter(m => m.moneda === 'ARS')

  const totalAlquilerUSD = movsUSD.reduce((s, m) => s + m.alquiler, 0)
  const totalComisionUSD = movsUSD.reduce((s, m) => s + m.comision, 0)
  const totalGastosUSD = movsUSD.reduce((s, m) => s + m.gastosProp, 0)
  const totalNetoUSD = movsUSD.reduce((s, m) => s + m.neto, 0)

  const totalAlquilerARS = movsARS.reduce((s, m) => s + m.alquiler, 0)
  const totalComisionARS = movsARS.reduce((s, m) => s + m.comision, 0)
  const totalGastosARS = movsARS.reduce((s, m) => s + m.gastosProp, 0)
  const totalNetoARS = movsARS.reduce((s, m) => s + m.neto, 0)

  const totalAlquiler = totalAlquilerARS
  const totalComision = totalComisionARS
  const totalGastos = totalGastosARS
  const totalNeto = totalNetoARS

  // Movimientos pendientes de liquidar (para el botón de pago)
  const movsPendientes = movimientos.filter(m => !m.liquidado)
  const movsPendARS = movsPendientes.filter(m => m.moneda === 'ARS')
  const movsPendUSD = movsPendientes.filter(m => m.moneda === 'USD')
  const pendNetoARS = movsPendARS.reduce((s, m) => s + m.neto, 0)
  const pendNetoUSD = movsPendUSD.reduce((s, m) => s + m.neto, 0)

  // Pagos realizados al propietario seleccionado — filtrados de caja
  const movsLiquidados = movimientos.filter(m => m.liquidado)
  const movsLiqARS = movsLiquidados.filter(m => m.moneda === 'ARS')
  const movsLiqUSD = movsLiquidados.filter(m => m.moneda === 'USD')
  const totalLiqARS = movsLiqARS.reduce((s, m) => s + m.neto, 0)
  const totalLiqUSD = movsLiqUSD.reduce((s, m) => s + m.neto, 0)
  // pagosRealizados: mantenido por compatibilidad (puede estar vacío en modelo sin caja)
  const pagosRealizados = []

  const totalPagadoARS = 0  // no se usa (pagosRealizados de caja vacío en modelo administración)
  const totalPagadoUSD = 0

  async function registrarPagoAPropietario() {
    if (!propSelec) return
    setLoadingPago(true); setMsgPago(null)
    try {
      // MODELO ADMINISTRACIÓN: la caja registra SOLO comisiones propias.
      // El pago al propietario NO se registra en caja.
      // Se marca liquidacion_enviada=true para trazabilidad.
      const pagosDelProp = movsPendientes.map(m => m.pagoId).filter(Boolean)
      if (pagosDelProp.length > 0) {
        const { error } = await supabase.from('pagos')
          .update({ liquidacion_enviada: true })
          .in('id', pagosDelProp)
        if (error) throw new Error(error.message)
      }

      const montoMsg = [
        totalNetoARS > 0 ? fmt(totalNetoARS) + ' ARS' : '',
        totalNetoUSD > 0 ? 'USD ' + Number(totalNetoUSD).toLocaleString('es-AR') : ''
      ].filter(Boolean).join(' + ')

      // Recargar pagos del propietario para reflejar cambio en UI
      const contIds = contratos.filter(c => c.propietario_id === propSelec).map(c => c.id)
      if (contIds.length > 0) {
        const { data: pagosActualizados } = await supabase
          .from('pagos')
          .select('*')
          .in('contrato_id', contIds)
        if (pagosActualizados) setPagosLocal(prev => {
          const otrosPagos = prev.filter(p => !contIds.includes(p.contrato_id))
          return [...otrosPagos, ...pagosActualizados]
        })
      }
      setMsgPago({ ok: true, text: '✓ Liquidación marcada como enviada. Neto: ' + montoMsg })
      setModalPago(false); setObsPago('')
    } catch(e) {
      setMsgPago({ ok: false, text: 'Error: ' + e.message })
    }
    setLoadingPago(false)
  }

  return (
    <>
      <div style={{ background:'#fff', border:'0.5px solid #E8ECF0', borderRadius:12, padding:16,  marginBottom: 16 }}>
        <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 14 }}>Resumen por propietario</div>
        <Tabla
          cols={['Propietario', 'Propiedad', 'Inquilino', 'Moneda', 'Alquiler', 'Gastos prop.', 'Comisión', 'Neto a transferir']}
          filas={resumen.map(c => {
            const esUSD = c.moneda === 'USD'
            const fmtM = n => esUSD ? 'USD ' + Number(n || 0).toLocaleString('es-AR') : fmt(n)
            return [
              <span style={{ fontWeight: 'bold' }}>{c.propietario_id}</span>,
              c.propiedad_id,
              c.inquilino_id,
              <span style={{ background: esUSD ? '#E8EEFB' : '#E8F5EE', color: esUSD ? B : G, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 'bold' }}>{esUSD ? 'USD' : 'ARS'}</span>,
              <span style={{ color: esUSD ? B : '#1A1A1A', fontWeight: 'bold' }}>{fmtM(c.alquiler)}</span>,
              <span style={{ color: D }}>{c.gastosProp ? '− ' + fmt(c.gastosProp) : '—'}</span>,
              <span style={{ color: W }}>− {fmtM(c.comision)}</span>,
              <span style={{ fontWeight: 'bold', color: G }}>{fmtM(c.neto)}</span>,
            ]
          })}
        />
      </div>

      <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13 }}>Cuenta corriente por propietario</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={propSelec} onChange={e => setPropSelec(e.target.value)} style={{ padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
              <option value="">Seleccionar propietario...</option>
              {propietarios.map(p => <option key={p.id} value={p.id}>{p.apellido_nombre}</option>)}
            </select>
            <span style={{ fontSize: 12, color: '#888' }}>Desde:</span>
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={{ padding: '6px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }} />
            <span style={{ fontSize: 12, color: '#888' }}>Hasta:</span>
            <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={{ padding: '6px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }} />
            {(fechaDesde || fechaHasta) && <button onClick={() => { setFechaDesde(''); setFechaHasta('') }} style={{ padding: '6px 10px', borderRadius: 6, border: '0.5px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 12 }}>✕ Limpiar</button>}
            {propSelec && (
              <button onClick={() => {
                const token = generarTokenPortal(propSelec)
                const url = 'https://gasp.administracionpinamar.com/propietario?id=' + propSelec + '&token=' + token
                navigator.clipboard.writeText(url).then(() => alert('Link copiado: ' + url))
              }} style={{ padding: '7px 14px', borderRadius: 6, background: B, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12 }}>
                🔗 Copiar link del portal
              </button>
            )}
          </div>
        </div>

        {propSelec && (
          <>
            {prop && (
              <div style={{ background: '#F2F4F6', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12 }}>
                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{prop.apellido_nombre}</div>
                <div style={{ color: '#888', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {prop.email && <span>✉ {prop.email}</span>}
                  {prop.telefono && <span>📱 {prop.telefono}</span>}
                  {prop.cbu && <span>CBU: {prop.cbu}</span>}
                  {prop.banco && <span>{prop.banco}</span>}
                </div>
              </div>
            )}

            {movimientos.length === 0 ? (
              <div style={{ color: '#bbb', padding: 20, textAlign: 'center' }}>No hay pagos registrados para este propietario</div>
            ) : (
              <>
                <Tabla
                  cols={['Período', 'Fecha', 'Propiedad', 'Moneda', 'Alquiler', 'Gastos prop. ARS', 'Comisión', 'Neto transferido']}
                  filas={movimientos.map(m => {
                    const esUSD = m.moneda === 'USD'
                    const fmtM = n => esUSD ? 'USD ' + Number(n || 0).toLocaleString('es-AR') : fmt(n)
                    return [
                      m.periodo || '—',
                      m.fecha || '—',
                      m.propiedad,
                      <span style={{ background: esUSD ? '#E8EEFB' : '#E8F5EE', color: esUSD ? B : G, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 'bold' }}>{m.moneda}</span>,
                      <span style={{ fontWeight: 'bold', color: esUSD ? B : '#1A1A1A' }}>{fmtM(m.alquiler)}</span>,
                      m.gastosProp > 0 ? (
                        <span style={{ color: D }} title={m.gastosPropDetalle.map(g => g.concepto + ': $' + Number(g.importe).toLocaleString('es-AR')).join('\n')}>
                          − {fmt(m.gastosProp)} ⓘ
                        </span>
                      ) : '—',
                      <span style={{ color: W }}>− {fmtM(m.comision)}</span>,
                      <span style={{ fontWeight: 'bold', color: m.liquidado ? '#888' : G }}>
              {fmtM(m.neto)}
              {m.liquidado && <span style={{ fontSize: 10, color: '#888', marginLeft: 6, fontWeight: 'normal' }}>✓ Liq.</span>}
            </span>,
                    ]
                  })}
                />

                <div style={{ display: 'grid', gridTemplateColumns: movsUSD.length > 0 && movsARS.length > 0 ? '1fr 1fr' : '1fr', gap: 12, marginTop: 12 }}>
                  {movsUSD.length > 0 && (
                    <div style={{ background: '#1A1A1A', borderRadius: 8, padding: '12px 16px' }}>
                      <div style={{ fontSize: 10, color: '#9DBBF5', marginBottom: 8, fontWeight: 'bold' }}>DOLARES (USD)</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[
                          { label: 'Alquiler', value: 'USD ' + totalAlquilerUSD.toLocaleString('es-AR'), color: '#fff' },
                          { label: 'Comision', value: '- USD ' + totalComisionUSD.toLocaleString('es-AR'), color: '#F5D76E' },
                          { label: 'Neto USD', value: 'USD ' + totalNetoUSD.toLocaleString('es-AR'), color: '#6ECF7F' },
                        ].map((t, i) => (
                          <div key={i}>
                            <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>{t.label}</div>
                            <div style={{ fontSize: 14, fontWeight: 'bold', color: t.color }}>{t.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {movsARS.length > 0 && (
                    <div style={{ background: '#1A1A1A', borderRadius: 8, padding: '12px 16px' }}>
                      <div style={{ fontSize: 10, color: '#9DDCB4', marginBottom: 8, fontWeight: 'bold' }}>PESOS (ARS)</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[
                          { label: 'Alquiler', value: fmt(totalAlquilerARS), color: '#fff' },
                          { label: 'Gastos prop.', value: '- ' + fmt(totalGastosARS), color: '#F09595' },
                          { label: 'Comision', value: '- ' + fmt(totalComisionARS), color: '#F5D76E' },
                          { label: 'Neto ARS', value: fmt(totalNetoARS), color: '#6ECF7F' },
                        ].map((t, i) => (
                          <div key={i}>
                            <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>{t.label}</div>
                            <div style={{ fontSize: 14, fontWeight: 'bold', color: t.color }}>{t.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>


                {/* Pagos realizados al propietario */}
                {movsLiquidados.length > 0 && (
                  <div style={{ background: '#fff', border: '0.5px solid #9DDCB4', borderRadius: 10, padding: 16, marginTop: 12 }}>
                    <div style={{ fontWeight: 'bold', fontSize: 13, color: G, marginBottom: 10 }}>✅ Movimientos liquidados al propietario</div>
                    {movsLiquidados.map((m, i) => {
                      const fmtM = n => m.moneda === 'USD' ? 'USD ' + Number(n||0).toLocaleString('es-AR') : fmt(n)
                      return (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < movsLiquidados.length - 1 ? '0.5px solid #eee' : 'none', fontSize: 13 }}>
                          <div>
                            <span style={{ fontWeight: 'bold', color: '#555' }}>{m.periodo || '—'}</span>
                            <span style={{ color: '#888', marginLeft: 8 }}>{m.fecha}</span>
                            <span style={{ color: '#aaa', marginLeft: 8, fontSize: 11 }}>{m.propiedad}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontWeight: 'bold', color: '#888' }}>{fmtM(m.neto)}</span>
                            <button onClick={async () => {
                              if (!confirm('¿Anular la liquidación de ' + (m.periodo || m.fecha) + '? El pago volverá a pendiente.')) return
                              try {
                                await supabase.from('pagos')
                                  .update({ liquidacion_enviada: false })
                                  .eq('id', m.pagoId)
                                // Recargar pagos del propietario
                          const contIds2 = contratos.filter(c => c.propietario_id === propSelec).map(c => c.id)
                          if (contIds2.length > 0) {
                            const { data: pagosAct2 } = await supabase.from('pagos').select('*').in('contrato_id', contIds2)
                            if (pagosAct2) setPagosLocal(prev => {
                              const otros = prev.filter(p => !contIds2.includes(p.contrato_id))
                              return [...otros, ...pagosAct2]
                            })
                          }
                          setMsgPago({ ok: true, text: '✓ Liquidación de ' + (m.periodo || m.fecha) + ' anulada. Volvió a pendiente.' })
                              } catch(e) {
                                setMsgPago({ ok: false, text: 'Error: ' + e.message })
                              }
                            }} style={{ padding: '3px 10px', borderRadius: 5, background: '#FCEAEA', color: '#B83030', border: '1px solid #F09595', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
                              ✕ Anular
                            </button>
                          </div>
                        </div>
                      )
                    })}

                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #9DDCB4', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 'bold', color: G, fontSize: 13 }}>TOTAL LIQUIDADO</span>
                      <span style={{ fontWeight: 'bold', color: G }}>
                        {[totalLiqARS > 0 ? fmt(totalLiqARS) : '', totalLiqUSD > 0 ? 'USD ' + Number(totalLiqUSD).toLocaleString('es-AR') : ''].filter(Boolean).join(' + ')}
                      </span>
                    </div>
                    {pendNetoARS <= 0.01 && pendNetoUSD <= 0.01 ? (
                      <div style={{ marginTop: 8, background: '#E8F5EE', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: G, fontWeight: 'bold' }}>
                        ✅ Liquidación completa — Sin saldo pendiente
                      </div>
                    ) : (
                      <div style={{ marginTop: 8, background: '#FEF3E2', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
                        <span style={{ color: W, fontWeight: 'bold' }}>⏳ Saldo pendiente: </span>
                        {pendNetoARS > 0.01 && <span style={{ color: D, fontWeight: 'bold', marginRight: 12 }}>{fmt(pendNetoARS)}</span>}
                        {pendNetoUSD > 0.01 && <span style={{ color: D, fontWeight: 'bold' }}>{'USD ' + Number(pendNetoUSD).toLocaleString('es-AR')}</span>}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  {(fechaDesde || fechaHasta) && (
                    <div style={{ fontSize: 12, color: '#888' }}>
                      Período filtrado: {fechaDesde || 'inicio'} al {fechaHasta || 'hoy'} — {movimientos.length} movimiento{movimientos.length !== 1 ? 's' : ''}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', alignItems: 'center', flexWrap: 'wrap' }}>
                    {msgPago && (
                      <div style={{ background: msgPago.ok ? '#E8F5EE' : '#FCEAEA', border: '0.5px solid ' + (msgPago.ok ? '#9DDCB4' : '#F09595'), borderRadius: 6, padding: '8px 14px', fontSize: 13, color: msgPago.ok ? G : D }}>
                        {msgPago.ok ? '✓ ' : '✗ '}{msgPago.text}
                      </div>
                    )}
                    {(pendNetoARS > 0.01 || pendNetoUSD > 0.01) && !modalPago && (
                      <button onClick={() => setModalPago(true)} style={{ padding: '8px 18px', borderRadius: 7, background: G, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}>
                        💸 Registrar pago al propietario
                      </button>
                    )}
                    <button onClick={() => generarCuentaCorrientePDF(prop, movimientos,
                      { alquiler: totalAlquilerARS, comision: totalComisionARS, gastos: totalGastosARS, neto: totalNetoARS },
                      { alquiler: totalAlquilerUSD, comision: totalComisionUSD, gastos: totalGastosUSD, neto: totalNetoUSD },
                      perfil, pagosRealizados)} style={{ padding: '8px 18px', borderRadius: 7, background: B, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}>
                      📄 Generar PDF cuenta corriente
                    </button>
                  </div>
                </div>

                {modalPago && (
                  <div style={{ background: '#E8F5EE', border: '1px solid #9DDCB4', borderRadius: 10, padding: 16, marginTop: 12 }}>
                    <div style={{ fontWeight: 'bold', fontSize: 13, color: G, marginBottom: 10 }}>💸 Registrar pago al propietario</div>
                    <div style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>
                      Se marcará la liquidación como <strong>enviada al propietario</strong> por el neto pendiente:
                      {pendNetoARS > 0.01 && <span style={{ color: G, fontWeight: 'bold' }}> {fmt(pendNetoARS)} ARS</span>}
                      {pendNetoUSD > 0.01 && <span style={{ color: B, fontWeight: 'bold' }}> + USD {Number(pendNetoUSD).toLocaleString('es-AR')}</span>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Fecha de transferencia</div>
                        <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)}
                          style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Observaciones (opcional)</div>
                        <input type="text" value={obsPago} onChange={e => setObsPago(e.target.value)}
                          placeholder="Ej: Transferencia bancaria CBU..."
                          style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={registrarPagoAPropietario} disabled={loadingPago}
                        style={{ padding: '8px 18px', borderRadius: 7, background: loadingPago ? '#aaa' : G, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}>
                        {loadingPago ? 'Registrando...' : '✓ Confirmar pago'}
                      </button>
                      <button onClick={() => { setModalPago(false); setObsPago('') }}
                        style={{ padding: '8px 18px', borderRadius: 7, background: '#F0F0F0', color: '#555', border: 'none', cursor: 'pointer', fontSize: 13 }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {!propSelec && (
          <div style={{ color: '#bbb', padding: 20, textAlign: 'center', fontSize: 13 }}>Seleccione un propietario para ver su cuenta corriente</div>
        )}
      </div>
    </>
  )
}

function Reportes({ pagos, contratos, propiedades, inquilinos, perfil = {} }) {
  const totalCobrado = pagos.reduce((s, p) => s + Number(p.total_cobrado || 0), 0)
  const totalComision = pagos.reduce((s, p) => s + Number(p.monto_comision || 0), 0)
  const hoy = new Date()
  const mesActual = hoy.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  const anioActual = hoy.getFullYear()
  const mesNum = hoy.getMonth() + 1
  const [enviando, setEnviando] = useState({})
  const [enviados, setEnviados] = useState({})
  const [filtroEstado, setFiltroEstado] = useState('todos')

  const morosos = contratos.filter(c => c.estado === 'Vigente' && c.tipo_pago !== 'Anual anticipado').map(c => {
    const pagosMes = pagos.filter(p => {
      if (p.contrato_id !== c.id || !p.periodo) return false
      const per = p.periodo.toLowerCase()
      const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
      return per.includes(meses[mesNum - 1]) && per.includes(String(anioActual))
    })
    if (pagosMes.length > 0) {
      const pago = pagosMes[0]
      const fechaPago = new Date(pago.fecha_pago)
      const diaVenc = Number(c.dia_vencimiento) || 10
      const fechaVencMes = new Date(hoy.getFullYear(), hoy.getMonth(), diaVenc)
      const diasMora = Math.max(0, Math.ceil((fechaPago - fechaVencMes) / 86400000))
      if (diasMora > 0) {
        const tasaDiaria = (Number(c.interes_mora) || 3) / 100 / 30
        const recargo = Math.round(Number(pago.alquiler || 0) * tasaDiaria * diasMora)
        return { ...c, estado_pago: 'Pago con mora', dias_mora: diasMora, recargo, pago }
      }
      return null
    }
    const inq = inquilinos.find(i => i.id === c.inquilino_id)
    return { ...c, estado_pago: 'Sin pago', dias_mora: null, recargo: null, inq }
  }).filter(Boolean)

  const liquidacionesPendientes = pagos.filter(p => {
    if (p.liquidacion_enviada || !p.periodo) return false
    return p.periodo.includes(String(anioActual))
  }).map(p => ({ ...p, contrato: contratos.find(c => c.id === p.contrato_id) }))

  const vencen = contratos.filter(c => {
    if (!c.fecha_vencimiento) return false
    const d = Math.ceil((new Date(c.fecha_vencimiento) - hoy) / 86400000)
    return d > 0 && d <= 90
  })

  const morososFiltrados = filtroEstado === 'todos' ? morosos
    : morosos.filter(m => filtroEstado === 'sinpago' ? m.estado_pago === 'Sin pago' : m.estado_pago === 'Pago con mora')

  async function enviarAvisoMora(m) {
    const inq = inquilinos.find(i => i.id === m.inquilino_id)
    if (!inq?.email && !inq?.telefono) return alert('El inquilino no tiene email ni teléfono registrado')
    const key = m.id
    setEnviando(e => ({ ...e, [key]: true }))
    try {
      const esUSD = m.moneda === 'USD'
      const fmtM = n => esUSD ? 'USD ' + Number(n||0).toLocaleString('es-AR') : fmt(n)
      const recargo = m.recargo ? ` Con recargo estimado de ${fmtM(m.recargo)}.` : ''
      const diasMsg = m.dias_mora ? ` (${m.dias_mora} días de mora)` : ''
      const asunto = `Aviso de mora — ${m.propiedad_id} — ${mesActual}`
      const cuerpo = `Estimado/a ${inq?.apellido_nombre || m.inquilino_id},\n\nLe informamos que el pago del mes de ${mesActual} correspondiente a la propiedad ${m.propiedad_id} presenta mora${diasMsg}.${recargo}\n\nMonto del alquiler: ${fmtM(m.monto_actual)}\nInterés por mora: ${m.interes_mora || 3}% mensual\n\nPor favor regularice su situación a la brevedad.\n\n${perfil.nombre_completo || 'Administración'}\n${perfil.matricula || ''}\n${perfil.email_contacto || ''}`
      if (inq?.email) {
        await fetch('/api/notificar', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: inq.email, asunto, cuerpo }) })
      }
      setEnviados(e => ({ ...e, [key]: inq?.email ? 'email' : 'whatsapp' }))
    } catch (err) { alert('Error: ' + err.message) }
    setEnviando(e => ({ ...e, [key]: false }))
  }

  async function enviarMasivo() {
    if (!window.confirm(`¿Enviar aviso de mora a ${morososFiltrados.length} inquilinos?`)) return
    for (const m of morososFiltrados) await enviarAvisoMora(m)
    alert('✓ Avisos enviados correctamente')
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total cobrado', value: fmt(totalCobrado), color: G },
          { label: 'Mis comisiones', value: fmt(totalComision), color: B },
          { label: 'Morosos / Con mora', value: morosos.length, color: morosos.length > 0 ? D : G },
          { label: 'Liq. pendientes', value: liquidacionesPendientes.length, color: liquidacionesPendientes.length > 0 ? W : G },
        ].map((m, i) => (
          <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 'bold', color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background:'#fff', border:'0.5px solid #E8ECF0', borderRadius:12, padding:16,  marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, color: D }}>🔴 Morosos y pagos con recargo — {mesActual}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {['todos','sinpago','conmora'].map(f => (
              <button key={f} onClick={() => setFiltroEstado(f)}
                style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11,
                  background: filtroEstado === f ? D : '#F3F4F6',
                  color: filtroEstado === f ? '#fff' : '#555', fontWeight: filtroEstado === f ? 'bold' : 'normal' }}>
                {f === 'todos' ? 'Todos' : f === 'sinpago' ? 'Sin pago' : 'Con mora'}
              </button>
            ))}
            {morososFiltrados.length > 0 && (
              <button onClick={enviarMasivo}
                style={{ padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12,
                  background: W, color: '#fff', fontWeight: 'bold' }}>
                📨 Enviar aviso masivo ({morososFiltrados.length})
              </button>
            )}
          </div>
        </div>
        {morososFiltrados.length === 0 ? (
          <div style={{ color: '#bbb', fontSize: 13, padding: 12 }}>No hay morosos en el período actual</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F2F4F6' }}>
                  {['Contrato','Inquilino','Propiedad','Monto actual','Estado','Días mora','Recargo est.','Interés %','Acciones'].map((h,i) => (
                    <th key={i} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 'bold', color: '#888', textTransform: 'uppercase', letterSpacing: .4, borderBottom: '0.5px solid #ddd' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {morososFiltrados.map((m, i) => {
                  const inq = inquilinos.find(q => q.id === m.inquilino_id)
                  const esUSD = m.moneda === 'USD'
                  const fmtM = n => esUSD ? 'USD ' + Number(n||0).toLocaleString('es-AR') : fmt(n)
                  const key = m.id
                  const yaEnviado = enviados[key]
                  const enviandoNow = enviando[key]
                  return (
                    <tr key={m.id} style={{ borderBottom: '0.5px solid #eee', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11 }}>{m.id}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: 12 }}>{inq?.apellido_nombre || m.inquilino_id}</div>
                        {inq?.telefono && <div style={{ fontSize: 10, color: '#888' }}>📱 {inq.telefono}</div>}
                        {inq?.email && <div style={{ fontSize: 10, color: '#888' }}>✉ {inq.email}</div>}
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: 12 }}>{m.propiedad_id}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 'bold', color: esUSD ? B : '#1A1A1A' }}>{fmtM(m.monto_actual)}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <Pill text={m.estado_pago} color={m.estado_pago === 'Sin pago' ? 'danger' : 'warn'} />
                      </td>
                      <td style={{ padding: '8px 12px', color: m.dias_mora > 15 ? D : W, fontWeight: 'bold' }}>
                        {m.dias_mora !== null ? m.dias_mora + ' días' : '—'}
                      </td>
                      <td style={{ padding: '8px 12px', color: D, fontWeight: 'bold' }}>
                        {m.recargo ? fmtM(m.recargo) : '—'}
                      </td>
                      <td style={{ padding: '8px 12px' }}>{(m.interes_mora || 3)}% mens.</td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {yaEnviado ? (
                            <span style={{ fontSize: 11, color: G, fontWeight: 'bold' }}>✓ Enviado</span>
                          ) : (
                            <>
                              {inq?.email && (
                                <button onClick={() => enviarAvisoMora(m)} disabled={enviandoNow}
                                  style={{ padding: '3px 8px', borderRadius: 5, background: enviandoNow ? '#aaa' : W, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>
                                  {enviandoNow ? '...' : '✉ Email'}
                                </button>
                              )}
                              {inq?.telefono && (
                                <a href={`https://wa.me/${inq.telefono.replace(/\D/g,'')}?text=${encodeURIComponent(`Estimado/a ${inq.apellido_nombre}, le recordamos que el pago del mes de ${mesActual} de ${m.propiedad_id} se encuentra en mora. Por favor regularice su situación. ${perfil.nombre_completo || 'Administración'}`)}`}
                                  target="_blank" rel="noreferrer"
                                  style={{ padding: '3px 8px', borderRadius: 5, background: '#25D366', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, textDecoration: 'none' }}>
                                  📱 WA
                                </a>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ background:'#fff', border:'0.5px solid #E8ECF0', borderRadius:12, padding:16,  marginBottom: 16 }}>
        <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 12, color: W }}>Liquidaciones pendientes de envío</div>
        {liquidacionesPendientes.length === 0 ? (
          <div style={{ color: '#bbb', fontSize: 13, padding: 12 }}>No hay liquidaciones pendientes</div>
        ) : (
          <Tabla
            cols={['Pago ID', 'Contrato', 'Período', 'Propietario', 'Neto', 'Moneda']}
            filas={liquidacionesPendientes.map(p => {
              const esUSD = p.moneda === 'USD'
              const fmtM = n => esUSD ? 'USD ' + Number(n||0).toLocaleString('es-AR') : fmt(n)
              return [
                <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.id}</span>,
                p.contrato_id, p.periodo || '—', p.contrato?.propietario_id || '—',
                <span style={{ fontWeight: 'bold', color: G }}>{fmtM(p.neto_propietario)}</span>,
                <span style={{ background: esUSD ? '#E8EEFB' : '#E8F5EE', color: esUSD ? B : G, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 'bold' }}>{esUSD ? 'USD' : 'ARS'}</span>,
              ]
            })}
          />
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 12 }}>Contratos por vencer (90 días)</div>
          <Tabla
            cols={['Inquilino', 'Propiedad', 'Vencimiento', 'Días']}
            filas={vencen.map(c => {
              const dias = Math.ceil((new Date(c.fecha_vencimiento) - hoy) / 86400000)
              const inqV = inquilinos?.find(q => q.id === c.inquilino_id); const propV = propiedades?.find(p => p.id === c.propiedad_id); return [inqV?.apellido_nombre || c.inquilino_id, propV?.direccion || c.propiedad_id, c.fecha_vencimiento, <Pill text={dias + ' días'} color={dias <= 30 ? 'danger' : dias <= 60 ? 'warn' : 'ok'} />]
            })}
          />
        </div>
        <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 12 }}>Liquidación por propietario</div>
          <Tabla
            cols={['Propietario', 'Cobrado', 'Comisión', 'Neto']}
            filas={contratos.map(c => {
              const ps = pagos.filter(p => p.contrato_id === c.id)
              const al = ps.reduce((s, p) => s + Number(p.alquiler || 0), 0)
              const co = ps.reduce((s, p) => s + Number(p.monto_comision || 0), 0)
              if (!al) return null
              return [c.propietario_id, fmt(al), <span style={{ color: W }}>− {fmt(co)}</span>, <span style={{ fontWeight: 'bold', color: G }}>{fmt(al - co)}</span>]
            }).filter(Boolean)}
          />
        </div>
      </div>
    </>
  )
}

function Notificaciones({ contratos, propietarios, inquilinos, pagos, perfil = {} }) {
  const hoy = new Date()
  const [enviando, setEnviando] = useState({})
  const [resultados, setResultados] = useState({})

  const porVencer = contratos.filter(c => {
    if (!c.fecha_vencimiento) return false
    const d = Math.ceil((new Date(c.fecha_vencimiento) - hoy) / 86400000)
    return d > 0 && d <= 90
  }).map(c => {
    const dias = Math.ceil((new Date(c.fecha_vencimiento) - hoy) / 86400000)
    const inq = inquilinos.find(i => i.id === c.inquilino_id)
    const prop = propietarios.find(p => p.id === c.propietario_id)
    return { ...c, dias, inq, prop }
  })

  // Contratos con actualización ICL/IPC pendiente o próxima (en los próximos 30 días)
  const contratosPendientesAjuste = contratos.filter(c => {
    if (!c.fecha_inicio || !c.periodicidad || c.estado !== 'Vigente') return false
    const prox = calcularProxActualizacion(c.fecha_inicio, c.periodicidad)
    if (!prox) return false
    const diasHastaAjuste = Math.ceil((new Date(prox) - hoy) / 86400000)
    return diasHastaAjuste <= 30 // vence en los próximos 30 días o ya venció
  }).map(c => {
    const inq = inquilinos.find(i => i.id === c.inquilino_id)
    const prox = calcularProxActualizacion(c.fecha_inicio, c.periodicidad)
    const diasHastaAjuste = prox ? Math.ceil((new Date(prox) - hoy) / 86400000) : null
    const mesesMap = { 'Mensual': 1, 'Trimestral': 3, 'Cuatrimestral': 4, 'Semestral': 6, 'Anual': 12 }
    const meses = mesesMap[c.periodicidad] || 12
    return { ...c, inq, prox, diasHastaAjuste, meses }
  })

  const mesActual = new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  const liquidaciones = contratos.map(c => {
    const prop = propietarios.find(p => p.id === c.propietario_id)
    const inq = inquilinos.find(i => i.id === c.inquilino_id)
    const pagosMes = pagos.filter(p => p.contrato_id === c.id && p.periodo && p.periodo.toLowerCase().includes(new Date().getFullYear().toString()))
    const totalAlquiler = pagosMes.reduce((s, p) => s + Number(p.alquiler || 0), 0)
    const totalComision = pagosMes.reduce((s, p) => s + Number(p.monto_comision || 0), 0)
    const neto = totalAlquiler - totalComision
    if (!totalAlquiler || !prop?.email) return null
    return { contrato: c, prop, inq, totalAlquiler, totalComision, neto, pagosMes }
  }).filter(Boolean)

  async function enviarNotificacion(key, email, asunto, cuerpo) {
    if (!email) {
      setResultados(prev => ({ ...prev, [key]: 'error: sin email' }))
      return
    }
    setEnviando(prev => ({ ...prev, [key]: true }))
    try {
      const resp = await fetch('https://payzqbkydmvovjxlznuq.supabase.co/functions/v1/notificar-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, asunto, cuerpo })
      })
      const data = await resp.json()
      setResultados(prev => ({ ...prev, [key]: data.ok ? 'enviado' : 'error: ' + (data.error || 'desconocido') }))
    } catch (err) {
      setResultados(prev => ({ ...prev, [key]: 'error: ' + err.message }))
    }
    setEnviando(prev => ({ ...prev, [key]: false }))
  }

  function notificarVencimiento(c) {
    const email = c.inq?.email
    if (!email) return alert('El inquilino ' + c.inquilino_id + ' no tiene email registrado')
    const asunto = 'Aviso de vencimiento de contrato | ' + (c.propiedad_id || '')
    const cuerpo = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><div style="background:#1B6B35;padding:16px 20px;border-radius:8px 8px 0 0"><h2 style="color:#fff;margin:0;font-size:18px">GASP | Gestion de Alquileres</h2><p style="color:#9DDCB4;margin:4px 0 0;font-size:13px">${perfil.nombre_completo || 'Administrador'} · ${perfil.matricula || ''}</p></div><div style="background:#f9f9f9;padding:20px;border:1px solid #ddd;border-top:none"><p style="font-size:15px;color:#1A1A1A">Estimado/a <strong>${c.inq?.apellido_nombre || c.inquilino_id}</strong>,</p><p style="color:#444;line-height:1.6">Le informamos que su contrato de locación correspondiente a la propiedad <strong>${c.propiedad_id}</strong> vence el día <strong>${c.fecha_vencimiento}</strong>, es decir, en <strong>${c.dias} días</strong>.</p><p style="color:#444;margin-top:20px">Atentamente,<br><strong>${perfil.nombre_completo || 'Administrador'}</strong><br>${perfil.titulo || ''} · ${perfil.matricula || ''}</p></div></div>`
    enviarNotificacion('venc_' + c.id, email, asunto, cuerpo)
  }

  function notificarLiquidacion(liq) {
    const email = liq.prop?.email
    if (!email) return alert('El propietario ' + liq.prop?.apellido_nombre + ' no tiene email registrado')
    const fmtL = n => '$' + Number(n).toLocaleString('es-AR')
    const asunto = 'Liquidación mensual | ' + (liq.contrato.propiedad_id || '') + ' | ' + mesActual
    const cuerpo = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><div style="background:#1B6B35;padding:16px 20px;border-radius:8px 8px 0 0"><h2 style="color:#fff;margin:0;font-size:18px">GASP | Liquidación Mensual</h2><p style="color:#9DDCB4;margin:4px 0 0;font-size:13px">${perfil.nombre_completo || 'Administrador'} · ${perfil.matricula || ''}</p></div><div style="background:#f9f9f9;padding:20px;border:1px solid #ddd;border-top:none"><p style="font-size:15px;color:#1A1A1A">Estimado/a <strong>${liq.prop?.apellido_nombre || liq.contrato.propietario_id}</strong>,</p><p style="color:#444;line-height:1.6">Liquidación propiedad <strong>${liq.contrato.propiedad_id}</strong>: Alquiler ${fmtL(liq.totalAlquiler)} - Comisión ${fmtL(liq.totalComision)} = <strong>Neto ${fmtL(liq.neto)}</strong></p><p style="color:#444;margin-top:20px">Atentamente,<br><strong>${perfil.nombre_completo || 'Administrador'}</strong></p></div></div>`
    enviarNotificacion('liq_' + liq.contrato.id, email, asunto, cuerpo)
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 14, color: G }}>Contratos por vencer | Notificar inquilinos</div>
          {porVencer.length === 0 ? (
            <div style={{ color: '#bbb', fontSize: 13, padding: 12 }}>No hay contratos por vencer en 90 días</div>
          ) : porVencer.map((c, i) => {
            const key = 'venc_' + c.id
            const resultado = resultados[key]
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '0.5px solid #eee' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.dias <= 30 ? D : W, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 'bold' }}>{c.inq?.apellido_nombre || c.inquilino_id}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{c.propiedad_id} · Vence {c.fecha_vencimiento} ({c.dias} días)</div>
                  {c.inq?.email && <div style={{ fontSize: 11, color: '#aaa' }}>{c.inq.email}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {resultado ? (
                    <span style={{ fontSize: 11, color: resultado === 'enviado' ? G : D, fontWeight: 'bold' }}>{resultado === 'enviado' ? '✓ Email enviado' : '✗ ' + resultado}</span>
                  ) : (
                    <button onClick={() => notificarVencimiento(c)} disabled={enviando[key]} style={{ padding: '5px 10px', borderRadius: 6, background: enviando[key] ? '#aaa' : W, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11 }}>
                      {enviando[key] ? 'Enviando...' : '✉ Email'}
                    </button>
                  )}
                  {c.inq?.telefono && (
                    <a href={`https://wa.me/${c.inq.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`Estimado/a ${c.inq?.apellido_nombre || ''}, le informamos que su contrato de locación (${c.propiedad_id}) vence el ${c.fecha_vencimiento} (en ${c.dias} días). ${perfil.nombre_completo || 'Administrador'} - ${perfil.matricula || ''}`)}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ padding: '5px 10px', borderRadius: 6, background: '#25D366', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, textDecoration: 'none', textAlign: 'center' }}>
                      📱 WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 14, color: G }}>Liquidaciones | Notificar propietarios</div>
          {liquidaciones.length === 0 ? (
            <div style={{ color: '#bbb', fontSize: 13, padding: 12 }}>No hay liquidaciones con email disponible</div>
          ) : liquidaciones.map((liq, i) => {
            const key = 'liq_' + liq.contrato.id
            const resultado = resultados[key]
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '0.5px solid #eee' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: G, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 'bold' }}>{liq.prop?.apellido_nombre || liq.contrato.propietario_id}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{liq.contrato.propiedad_id} · Neto: ${Number(liq.neto).toLocaleString('es-AR')}</div>
                  {liq.prop?.email && <div style={{ fontSize: 11, color: '#aaa' }}>{liq.prop.email}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {resultado ? (
                    <span style={{ fontSize: 11, color: resultado === 'enviado' ? G : D, fontWeight: 'bold' }}>{resultado === 'enviado' ? '✓ Email enviado' : '✗ ' + resultado}</span>
                  ) : (
                    <button onClick={() => notificarLiquidacion(liq)} disabled={enviando[key]} style={{ padding: '5px 10px', borderRadius: 6, background: enviando[key] ? '#aaa' : G, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11 }}>
                      {enviando[key] ? 'Enviando...' : '✉ Liquidación'}
                    </button>
                  )}
                  {liq.prop?.telefono && (
                    <a href={`https://wa.me/${liq.prop.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`Estimado/a ${liq.prop?.apellido_nombre || ''}, neto a transferir $${Number(liq.neto).toLocaleString('es-AR')} por ${liq.contrato.propiedad_id}. ${perfil.nombre_completo || 'Administrador'} - ${perfil.matricula || ''}`)}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ padding: '5px 10px', borderRadius: 6, background: '#25D366', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, textDecoration: 'none', textAlign: 'center' }}>
                      📱 WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* NUEVA SECCIÓN: Aviso de aumento de alquiler al inquilino */}
      <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
        <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 14, color: W }}>⚡ Aviso de aumento de alquiler — Notificar inquilinos</div>
        {contratosPendientesAjuste.length === 0 ? (
          <div style={{ color: '#bbb', fontSize: 13, padding: 12 }}>No hay contratos con actualización pendiente o próxima en los próximos 30 días</div>
        ) : contratosPendientesAjuste.map((c, i) => {
          const key = 'aum_' + c.id
          const resultado = resultados[key]
          const vencido = c.diasHastaAjuste !== null && c.diasHastaAjuste <= 0
          const msgWA = encodeURIComponent(
            `Estimado/a ${c.inq?.apellido_nombre || 'inquilino/a'},\n\n` +
            `Le informamos que según lo estipulado en su contrato de locación (${c.id}), ` +
            `corresponde aplicar la actualización del monto del alquiler por índice ${c.indice_actualizacion} ` +
            `con periodicidad ${c.periodicidad} (cada ${c.meses} meses).\n\n` +
            `Monto actual: ${c.moneda === 'USD' ? 'USD ' : '$'}${Number(c.monto_actual).toLocaleString('es-AR')}\n` +
            `El nuevo monto será informado una vez calculado el índice actualizado.\n\n` +
            `Quedamos a su disposición.\n${perfil.nombre || 'Administración'}`
          )
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '0.5px solid #eee' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: vencido ? D : W, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 'bold' }}>{c.inq?.apellido_nombre || c.inquilino_id}</div>
                <div style={{ fontSize: 11, color: '#888' }}>
                  {c.propiedad_id} · Índice: {c.indice_actualizacion} · Periodicidad: {c.periodicidad} ({c.meses}m) · Monto actual: {c.moneda === 'USD' ? 'USD ' : '$'}{Number(c.monto_actual).toLocaleString('es-AR')}
                </div>
                <div style={{ fontSize: 11, color: vencido ? D : W, fontWeight: 'bold' }}>
                  {vencido
                    ? `⚠ Actualización vencida hace ${Math.abs(c.diasHastaAjuste)} días (${c.prox})`
                    : `🗓 Actualización en ${c.diasHastaAjuste} días (${c.prox})`}
                </div>
                {c.inq?.email && <div style={{ fontSize: 11, color: '#aaa' }}>{c.inq.email}</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {resultado ? (
                  <span style={{ fontSize: 11, color: resultado === 'enviado' ? G : D, fontWeight: 'bold' }}>
                    {resultado === 'enviado' ? '✓ Enviado' : '✗ Error'}
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      const asunto = `Actualización de alquiler — ${c.indice_actualizacion} ${c.periodicidad}`
                      const cuerpo = `Estimado/a ${c.inq?.apellido_nombre || 'inquilino/a'}:\n\n` +
                        `Le informamos que corresponde aplicar la actualización del monto de su alquiler según lo pactado en contrato:\n\n` +
                        `• Contrato: ${c.id}\n` +
                        `• Índice de actualización: ${c.indice_actualizacion}\n` +
                        `• Periodicidad: ${c.periodicidad} (cada ${c.meses} meses)\n` +
                        `• Fecha de actualización: ${c.prox}\n` +
                        `• Monto actual: ${c.moneda === 'USD' ? 'USD ' : '$'}${Number(c.monto_actual).toLocaleString('es-AR')}\n\n` +
                        `El nuevo monto será comunicado en los próximos días una vez calculado el índice.\n\n` +
                        `Ante cualquier consulta, no dude en contactarnos.\n\n` +
                        `${perfil.nombre || 'Administración'}\n${perfil.email || ''}\n${perfil.telefono || ''}`
                      enviarNotificacion(key, c.inq?.email, asunto, cuerpo)
                    }}
                    disabled={enviando[key] || !c.inq?.email}
                    style={{ padding: '5px 10px', borderRadius: 6, background: W, color: '#fff', border: 'none', cursor: c.inq?.email ? 'pointer' : 'not-allowed', fontSize: 11, opacity: c.inq?.email ? 1 : 0.5 }}>
                    {enviando[key] ? 'Enviando...' : '✉ Notificar'}
                  </button>
                )}
                {c.inq?.telefono && (
                  <a href={`https://wa.me/${c.inq.telefono.replace(/\D/g, '')}?text=${msgWA}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ padding: '5px 10px', borderRadius: 6, background: '#25D366', color: '#fff', fontSize: 11, textDecoration: 'none', textAlign: 'center' }}>
                    📱 WhatsApp
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
        <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>Información importante</div>
        <div style={{ fontSize: 12, color: '#888', lineHeight: 1.7 }}>
          <div>• Los emails se envían desde <strong>{perfil.email_contacto || 'tu email de contacto configurado en Mi Perfil'}</strong></div>
          <div>• El botón <strong>📱 WhatsApp</strong> abre WhatsApp con el mensaje pre-escrito listo para enviar.</div>
          <div>• Para recibir notificaciones, propietarios e inquilinos deben tener <strong>email y teléfono registrados</strong>.</div>
        </div>
      </div>
    </>
  )
}

function Propietarios({ data, onRefresh }) {
  const [form, setForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [apellido_nombre, setApellidoNombre] = useState('')
  const [dni_cuit, setDniCuit] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [cbu, setCbu] = useState('')
  const [alias_cbu, setAliasCbu] = useState('')
  const [banco, setBanco] = useState('')

  function reset() {
    setApellidoNombre(''); setDniCuit(''); setTelefono('')
    setEmail(''); setCbu(''); setAliasCbu(''); setBanco('')
    setForm(false); setEditando(null)
  }

  function editar(p) {
    setApellidoNombre(p.apellido_nombre || ''); setDniCuit(p.dni_cuit || '')
    setTelefono(p.telefono || ''); setEmail(p.email || ''); setCbu(p.cbu || '')
    setAliasCbu(p.alias_cbu || ''); setBanco(p.banco || '')
    setEditando(p.id); setForm(true)
  }

  async function guardar() {
    if (!apellido_nombre) return alert('Complete Apellido/Nombre')
    if (editando) {
      const { error } = await supabase.from('propietarios').update({
        apellido_nombre, dni_cuit, telefono, email, cbu, alias_cbu, banco
      }).eq('id', editando)
      if (error) return alert('Error: ' + error.message)
    } else {
      const adminId = (await supabase.auth.getUser()).data.user?.id
      let nuevoId = nextId(data, 'PR')
      let { error } = await supabase.from('propietarios').insert([{ id: nuevoId, apellido_nombre, dni_cuit, telefono, email, cbu, alias_cbu, banco, activo: true, admin_id: adminId }])
      if (error && error.code === '23505') {
        nuevoId = 'PR-' + Date.now().toString(36).toUpperCase()
        const r2 = await supabase.from('propietarios').insert([{ id: nuevoId, apellido_nombre, dni_cuit, telefono, email, cbu, alias_cbu, banco, activo: true, admin_id: adminId }])
        error = r2.error
      }
      if (error) return alert('Error: ' + error.message)
    }
    reset(); onRefresh()
  }

  async function darBaja(p) {
    if (!window.confirm('¿Dar de baja a ' + p.apellido_nombre + '?')) return
    const { error } = await supabase.from('propietarios').update({ activo: false }).eq('id', p.id)
    if (error) return alert('Error: ' + error.message)
    onRefresh()
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#888' }}>{data.length} propietarios</div>
        <BtnPrimario onClick={() => { reset(); setForm(true) }}>+ Nuevo propietario</BtnPrimario>
      </div>

      {form && (
        <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 12 }}>{editando ? 'Editar propietario — ' + editando : 'Nuevo propietario'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {!editando && <div style={{ gridColumn: 'span 2', fontSize: 11, color: '#888', marginBottom: -4 }}>ID auto: {nextId(data, 'PR')}</div>}
            <Input label="Apellido y nombre" value={apellido_nombre} onChange={setApellidoNombre} />
            <Input label="DNI / CUIT" value={dni_cuit} onChange={setDniCuit} />
            <Input label="Teléfono / WhatsApp" value={telefono} onChange={setTelefono} />
            <Input label="Email" value={email} onChange={setEmail} />
            <Input label="CBU (22 dígitos)" value={cbu} onChange={setCbu} />
            <Input label="Alias CBU" value={alias_cbu} onChange={setAliasCbu} />
            <Input label="Banco" value={banco} onChange={setBanco} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <BtnPrimario onClick={guardar}>{editando ? 'Guardar cambios' : 'Guardar'}</BtnPrimario>
            <BtnSecundario onClick={reset}>Cancelar</BtnSecundario>
          </div>
        </div>
      )}

      <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
        <Tabla
          cols={['ID', 'Apellido y nombre', 'DNI/CUIT', 'Teléfono', 'Email', 'Banco', 'CBU', 'Acciones']}
          filas={data.map(p => [
            <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.id}</span>,
            <span style={{ fontWeight: 'bold' }}>{p.apellido_nombre}</span>,
            p.dni_cuit || '—', p.telefono || '—', p.email || '—', p.banco || '—',
            p.cbu ? <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.cbu}</span> : '—',
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => editar(p)} style={{ padding: '3px 8px', borderRadius: 5, background: W, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✏ Editar</button>
              <button onClick={() => darBaja(p)} style={{ padding: '3px 8px', borderRadius: 5, background: D, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✗ Baja</button>
            </div>,
          ])}
        />
      </div>
    </>
  )
}

function Inquilinos({ data, propiedades, onRefresh }) {
  const [form, setForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [apellido_nombre, setApellidoNombre] = useState('')
  const [dni, setDni] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [propiedad_id, setPropiedadId] = useState('')
  const [garante_nombre, setGaranteNombre] = useState('')
  const [garante_dni, setGaranteDni] = useState('')
  const [garante_telefono, setGaranteTelefono] = useState('')

  function reset() {
    setApellidoNombre(''); setDni(''); setTelefono(''); setEmail('')
    setPropiedadId(''); setGaranteNombre(''); setGaranteDni(''); setGaranteTelefono('')
    setForm(false); setEditando(null)
  }

  function editar(i) {
    setApellidoNombre(i.apellido_nombre || ''); setDni(i.dni || '')
    setTelefono(i.telefono || ''); setEmail(i.email || ''); setPropiedadId(i.propiedad_id || '')
    setGaranteNombre(i.garante_nombre || ''); setGaranteDni(i.garante_dni || ''); setGaranteTelefono(i.garante_telefono || '')
    setEditando(i.id); setForm(true)
  }

  async function guardar() {
    if (!apellido_nombre) return alert('Complete Apellido/Nombre')
    if (editando) {
      const { error } = await supabase.from('inquilinos').update({
        apellido_nombre, dni, telefono, email, propiedad_id: propiedad_id || null,
        garante_nombre, garante_dni, garante_telefono
      }).eq('id', editando)
      if (error) return alert('Error: ' + error.message)
    } else {
      const adminId = (await supabase.auth.getUser()).data.user?.id
      let nuevoId = nextId(data, 'IQ')
      let { error } = await supabase.from('inquilinos').insert([{ id: nuevoId, apellido_nombre, dni, telefono, email, propiedad_id: propiedad_id || null, garante_nombre, garante_dni, garante_telefono, activo: true, admin_id: adminId }])
      if (error && error.code === '23505') {
        nuevoId = 'IQ-' + Date.now().toString(36).toUpperCase()
        const r2 = await supabase.from('inquilinos').insert([{ id: nuevoId, apellido_nombre, dni, telefono, email, propiedad_id: propiedad_id || null, garante_nombre, garante_dni, garante_telefono, activo: true, admin_id: adminId }])
        error = r2.error
      }
      if (error) return alert('Error: ' + error.message)
    }
    reset(); onRefresh()
  }

  async function darBaja(i) {
    if (!window.confirm('¿Dar de baja a ' + i.apellido_nombre + '?')) return
    const { error } = await supabase.from('inquilinos').update({ activo: false }).eq('id', i.id)
    if (error) return alert('Error: ' + error.message)
    onRefresh()
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#888' }}>{data.length} inquilinos</div>
        <BtnPrimario onClick={() => { reset(); setForm(true) }}>+ Nuevo inquilino</BtnPrimario>
      </div>

      {form && (
        <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 12 }}>{editando ? 'Editar inquilino — ' + editando : 'Nuevo inquilino'}</div>
          <div style={{ fontWeight: 'bold', fontSize: 12, color: B, marginBottom: 8 }}>Datos del inquilino</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {!editando && <div style={{ gridColumn: 'span 2', fontSize: 11, color: '#888', marginBottom: -4 }}>ID auto: {nextId(data, 'IQ')}</div>}
            <Input label="Apellido y nombre" value={apellido_nombre} onChange={setApellidoNombre} />
            <Input label="DNI" value={dni} onChange={setDni} />
            <Input label="Teléfono / WhatsApp" value={telefono} onChange={setTelefono} />
            <Input label="Email" value={email} onChange={setEmail} />
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Propiedad que ocupa</div>
              <select value={propiedad_id} onChange={e => setPropiedadId(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                <option value="">Seleccionar...</option>
                {propiedades.map(p => <option key={p.id} value={p.id}>{p.direccion} — {p.localidad}</option>)}
              </select>
            </div>
          </div>
          <div style={{ fontWeight: 'bold', fontSize: 12, color: B, marginBottom: 8 }}>Datos del garante</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <Input label="Apellido y nombre del garante" value={garante_nombre} onChange={setGaranteNombre} />
            <Input label="DNI del garante" value={garante_dni} onChange={setGaranteDni} />
            <Input label="Teléfono del garante" value={garante_telefono} onChange={setGaranteTelefono} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <BtnPrimario onClick={guardar}>{editando ? 'Guardar cambios' : 'Guardar'}</BtnPrimario>
            <BtnSecundario onClick={reset}>Cancelar</BtnSecundario>
          </div>
        </div>
      )}

      <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
        <Tabla
          cols={['ID', 'Apellido y nombre', 'DNI', 'Teléfono', 'Email', 'Propiedad', 'Garante', 'Acciones']}
          filas={data.map(i => [
            <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{i.id}</span>,
            <span style={{ fontWeight: 'bold' }}>{i.apellido_nombre}</span>,
            i.dni || '—', i.telefono || '—', i.email || '—', i.propiedad_id || '—', i.garante_nombre || '—',
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => editar(i)} style={{ padding: '3px 8px', borderRadius: 5, background: W, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✏ Editar</button>
              <button onClick={() => darBaja(i)} style={{ padding: '3px 8px', borderRadius: 5, background: D, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✗ Baja</button>
            </div>,
          ])}
        />
      </div>
    </>
  )
}

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


function Caja({ data, onRefresh, perfil = {} }) {
  const [form, setForm] = useState(false)
  const [filtroMes, setFiltroMes] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [modoFiltro, setModoFiltro] = useState('mes')
  const vacio = { tipo: 'Ingreso', categoria: 'Honorarios', concepto: '', importe: '', moneda: 'ARS', fecha: new Date().toISOString().split('T')[0], observaciones: '' }
  const [f, setF] = useState(vacio)
  const [loading, setLoading] = useState(false)

  const CATEGORIAS_INGRESO = ['Honorarios', 'Comisión de gestión', 'Honorario extra', 'Recupero de gastos', 'Otro ingreso']
  const CATEGORIAS_EGRESO = ['Librería y papelería', 'Telefonía', 'Internet', 'Movilidad', 'Honorarios profesionales', 'Impuestos y tasas', 'Publicidad', 'Mantenimiento oficina', 'Otro egreso']

  async function guardar() {
    if (!f.concepto || !f.importe) return alert('Complete concepto e importe')
    setLoading(true)
    const adminId = (await supabase.auth.getUser()).data.user?.id
    const nuevoId = nextId(data, 'CJ')
    const { error } = await supabase.from('caja').insert([{ ...f, id: nuevoId, importe: Number(f.importe) || 0, admin_id: adminId }])
    if (error) return alert('Error: ' + error.message)
    setForm(false); setF(vacio); setLoading(false); onRefresh()
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar este movimiento?')) return
    await supabase.from('caja').delete().eq('id', id)
    onRefresh()
  }

  const movsFiltrados = data.filter(m => {
    if (modoFiltro === 'mes' && filtroMes) return m.fecha && m.fecha.startsWith(filtroMes)
    if (modoFiltro === 'rango') {
      if (fechaDesde && m.fecha < fechaDesde) return false
      if (fechaHasta && m.fecha > fechaHasta) return false
    }
    return true
  })

  const saldoARS = data.filter(m => m.moneda === 'ARS').reduce((s, m) => s + (m.tipo === 'Ingreso' ? Number(m.importe) : -Number(m.importe)), 0)
  const saldoUSD = data.filter(m => m.moneda === 'USD').reduce((s, m) => s + (m.tipo === 'Ingreso' ? Number(m.importe) : -Number(m.importe)), 0)
  const ingMes = movsFiltrados.filter(m => m.tipo === 'Ingreso' && m.moneda === 'ARS').reduce((s, m) => s + Number(m.importe), 0)
  const egrMes = movsFiltrados.filter(m => m.tipo === 'Egreso' && m.moneda === 'ARS').reduce((s, m) => s + Number(m.importe), 0)
  const comMes = movsFiltrados.filter(m => m.categoria === 'Comisión de gestión' && m.moneda === 'ARS').reduce((s, m) => s + Number(m.importe), 0)
  const meses = [...new Set(data.map(m => m.fecha?.substring(0, 7)).filter(Boolean))].sort().reverse()

  const cardStyle = (bg, border) => ({ background: bg, border: '0.5px solid ' + border, borderRadius: 10, padding: 16 })
  const tabBtn = (modo) => ({ padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 'bold', background: modoFiltro === modo ? G : '#F0F0F0', color: modoFiltro === modo ? '#fff' : '#888' })

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={cardStyle('#fff', '#E8ECF0')}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>SALDO CAJA ARS</div>
          <div style={{ fontSize: 22, fontWeight: 'bold', color: saldoARS >= 0 ? G : D }}>{fmt(Math.abs(saldoARS))}</div>
          <div style={{ fontSize: 11, color: saldoARS >= 0 ? G : D }}>{saldoARS >= 0 ? '▲ positivo' : '▼ negativo'}</div>
        </div>
        <div style={cardStyle('#fff', '#E8ECF0')}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>SALDO CAJA USD</div>
          <div style={{ fontSize: 22, fontWeight: 'bold', color: saldoUSD >= 0 ? B : D }}>USD {Math.abs(saldoUSD).toLocaleString('es-AR')}</div>
          <div style={{ fontSize: 11, color: saldoUSD >= 0 ? B : D }}>{saldoUSD >= 0 ? '▲ positivo' : '▼ negativo'}</div>
        </div>
        <div style={cardStyle('#E8F5EE', '#9DDCB4')}>
          <div style={{ fontSize: 11, color: G, marginBottom: 4 }}>INGRESOS {filtroMes || 'ACUMULADO'}</div>
          <div style={{ fontSize: 22, fontWeight: 'bold', color: G }}>{fmt(ingMes)}</div>
          <div style={{ fontSize: 11, color: '#888' }}>Comisiones: {fmt(comMes)}</div>
        </div>
        <div style={cardStyle('#FCEAEA', '#F09595')}>
          <div style={{ fontSize: 11, color: D, marginBottom: 4 }}>EGRESOS {filtroMes || 'ACUMULADO'}</div>
          <div style={{ fontSize: 22, fontWeight: 'bold', color: D }}>{fmt(egrMes)}</div>
          <div style={{ fontSize: 11, color: D }}>Resultado: {fmt(ingMes - egrMes)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button style={tabBtn('mes')} onClick={() => setModoFiltro('mes')}>Por mes</button>
          <button style={tabBtn('rango')} onClick={() => setModoFiltro('rango')}>Rango de fechas</button>
          {modoFiltro === 'mes' && (
            <>
              <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} style={{ padding: '6px 12px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13 }}>
                <option value="">Todos los movimientos</option>
                {meses.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              {filtroMes && <button onClick={() => setFiltroMes('')} style={{ padding: '6px 12px', borderRadius: 7, border: '0.5px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 13 }}>✕</button>}
            </>
          )}
          {modoFiltro === 'rango' && (
            <>
              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={{ padding: '6px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13 }} />
              <span style={{ fontSize: 12, color: '#888' }}>al</span>
              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={{ padding: '6px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13 }} />
              {(fechaDesde || fechaHasta) && <button onClick={() => { setFechaDesde(''); setFechaHasta('') }} style={{ padding: '6px 10px', borderRadius: 7, border: '0.5px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 13 }}>✕</button>}
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => generarCajaPDF(movsFiltrados, fechaDesde || filtroMes, fechaHasta || filtroMes, perfil)} style={{ padding: '7px 14px', borderRadius: 7, background: B, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}>📄 PDF reporte</button>
          <BtnPrimario onClick={() => setForm(true)}>+ Movimiento manual</BtnPrimario>
        </div>
      </div>

      {form && (
        <div style={{ background:'#fff', border:'0.5px solid #E8ECF0', borderRadius:12, padding:16,  marginBottom: 16, border: '1px solid ' + G }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 12 }}>Nuevo movimiento manual</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Tipo</div>
              <select value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value, categoria: e.target.value === 'Ingreso' ? 'Honorarios' : 'Librería y papelería' })} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13, background: f.tipo === 'Ingreso' ? '#E8F5EE' : '#FCEAEA' }}>
                <option>Ingreso</option><option>Egreso</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Categoría</div>
              <select value={f.categoria} onChange={e => setF({ ...f, categoria: e.target.value })} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                {(f.tipo === 'Ingreso' ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO).map(c => <option key={c}>{c}</option>)}
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
            <BtnPrimario onClick={guardar} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</BtnPrimario>
            <BtnSecundario onClick={() => { setForm(false); setF(vacio) }}>Cancelar</BtnSecundario>
          </div>
        </div>
      )}

      <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
        {movsFiltrados.length === 0 ? (
          <div style={{ color: '#bbb', fontSize: 13, padding: 12 }}>No hay movimientos{filtroMes ? ' para el período seleccionado' : ''}</div>
        ) : (
          <Tabla
            cols={['Fecha', 'Tipo', 'Categoría', 'Concepto', 'Moneda', 'Importe', 'Origen', '']}
            filas={movsFiltrados.map(m => {
              const importeFmt = m.moneda === 'USD' ? 'USD ' + Number(m.importe).toLocaleString('es-AR') : fmt(m.importe)
              const signo = m.tipo === 'Egreso' ? '- ' : '+ '
              const origenLabel = m.referencia_pago_id ? 'Auto · ' + m.referencia_pago_id : 'Manual'
              const puedeEliminar = !m.referencia_pago_id
              return [
                m.fecha,
                <Pill text={m.tipo} color={m.tipo === 'Ingreso' ? 'ok' : 'danger'} />,
                <span style={{ fontSize: 12 }}>{m.categoria}</span>,
                <span style={{ fontSize: 12 }}>{m.concepto}</span>,
                <Pill text={m.moneda} color={m.moneda === 'USD' ? 'blue' : 'gray'} />,
                <span style={{ fontWeight: 'bold', color: m.tipo === 'Ingreso' ? G : D }}>{signo}{importeFmt}</span>,
                <span style={{ fontSize: 10, color: '#888', fontFamily: m.referencia_pago_id ? 'monospace' : 'inherit' }}>{origenLabel}</span>,
                puedeEliminar ? <button onClick={() => eliminar(m.id)} style={{ padding: '3px 8px', borderRadius: 5, background: D, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✗</button> : <span style={{ fontSize: 10, color: '#ccc' }}>—</span>
              ]
            })}
          />
        )}
      </div>
    </>
  )
}

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
    const { error } = await supabase.from('full_perfil_admin').upsert(datos, { onConflict: 'admin_id' })
    if (error) setMsg({ ok: false, text: 'Error: ' + error.message })
    else { setMsg({ ok: true, text: 'Perfil guardado correctamente.' }); onRefresh() }
    setLoading(false)
  }

  return (
    <div style={{ background:'#fff', border:'0.5px solid #E8ECF0', borderRadius:12, padding:16,  maxWidth: 600 }}>
      <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 6, color: G }}>Mi perfil profesional</div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>Estos datos aparecerán en todos los PDFs generados por el sistema.</div>
      {msg && <div style={{ background: msg.ok ? '#E8F5EE' : '#FCEAEA', border: '0.5px solid ' + (msg.ok ? '#9DDCB4' : '#F09595'), borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: msg.ok ? G : D }}>{msg.ok ? '✓ ' : '✗ '}{msg.text}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <Input label="Nombre y apellido completo" value={nombre_completo} onChange={setNombreCompleto} />
        <Input label="Título / Cargo" value={titulo} onChange={setTitulo} />
        <Input label="Matrícula (ej: RPAC Mat. N° 83)" value={matricula} onChange={setMatricula} />
        <Input label="Email de contacto" value={email_contacto} onChange={setEmailContacto} />
        <Input label="Ciudad" value={ciudad} onChange={setCiudad} />
        <Input label="Provincia" value={provincia} onChange={setProvincia} />
        <Input label="Teléfono" value={telefono} onChange={setTelefono} />
      </div>
      <div style={{ background: '#F7F8FA', borderRadius: 8, padding: 14, marginBottom: 20, fontSize: 12, color: '#555' }}>
        <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Vista previa en PDFs:</div>
        <div>{nombre_completo || 'Nombre completo'} | {titulo || 'Título'} | {matricula || 'Matrícula'}</div>
        <div>{ciudad || 'Ciudad'}, {provincia || 'Provincia'} | {email_contacto || 'email@contacto.com'}</div>
      </div>
      <BtnPrimario onClick={guardar} disabled={loading}>{loading ? 'Guardando...' : 'Guardar perfil'}</BtnPrimario>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// APP PRINCIPAL
// ──────────────────────────────────────────────────────────


// ─── COMPONENTES TEMPORARIO ─────────────────────────────


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


// ─── COMPONENTES TEMPORARIO ─────────────────────────────
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
      const data = await callFn('crear-demo-completa', { nombre, email: emailC, password })
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
        <div style={{ background:'#fff', border:'0.5px solid #E8ECF0', borderRadius:12, padding:16,  maxWidth: 500, border: '1px solid ' + B }}>
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
        </div>
      )}

      {tab === 'demo' && (
        <div style={{ background:'#fff', border:'0.5px solid #E8ECF0', borderRadius:12, padding:16,  maxWidth: 500, border: '1px solid ' + G }}>
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
        </div>
      )}

      {tab === 'clientes' && (
        <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
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
        </div>
      )}
    </>
  )
}

// ── CLIENTES GASP FULL ────────────────────────────────────────────────────────
function ClientesFull({ session, callFn }) {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nombre: '', email: '', password: '' })
  const [creando, setCreando] = useState(false)
  const [msg, setMsg] = useState(null)

  const B = '#7C3AED', G = '#1B6B35', D = '#B83030'

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('usuarios_demo').select('*').order('fecha_alta', { ascending: false })
    setClientes(data || [])
    setLoading(false)
  }

  async function crearDemo() {
    if (!form.email || !form.password) return setMsg({ ok: false, text: 'Email y contraseña son obligatorios' })
    setCreando(true); setMsg(null)
    try {
      const data = await callFn('crear-demo-completa', { nombre: form.nombre, email: form.email, password: form.password })
      if (!data.ok) throw new Error(data.error)
      setMsg({ ok: true, text: data.mensaje })
      setForm({ nombre: '', email: '', password: '' })
      cargar()
    } catch(err) {
      setMsg({ ok: false, text: 'Error: ' + err.message })
    }
    setCreando(false)
  }

  return (
    <div>
      <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 16, color: B }}>🏘 Demos GASP Full</div>

      {/* Formulario */}
      <div style={{ background: '#F5F3FF', borderRadius: 10, padding: 16, marginBottom: 20, border: '1px solid #DDD6FE' }}>
        <div style={{ fontWeight: 'bold', fontSize: 13, color: B, marginBottom: 12 }}>🚀 Nueva demo 7 días (Anual + Temporario + Inmo)</div>
        {msg && (
          <div style={{ background: msg.ok ? '#E8F5EE' : '#FCEAEA', border: '0.5px solid ' + (msg.ok ? '#9DDCB4' : '#F09595'), borderRadius: 6, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: msg.ok ? G : D }}>
            {msg.ok ? '✓ ' : '✗ '}{msg.text}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
          <Input label="Nombre" value={form.nombre} onChange={v => setForm({ ...form, nombre: v })} placeholder="Ej: Juan García" />
          <Input label="Email *" value={form.email} onChange={v => setForm({ ...form, email: v })} type="email" placeholder="cliente@email.com" />
          <Input label="Contraseña *" value={form.password} onChange={v => setForm({ ...form, password: v })} placeholder="Mín. 6 caracteres" />
        </div>
        <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 12, background: '#EDE9FE', padding: '8px 12px', borderRadius: 6 }}>
          Se crean datos en los 3 módulos: Anual (2 propietarios, 2 contratos, 2 pagos) · Temporario (2 propiedades, 3 reservas) · Inmo (1 tasación, 1 propiedad en cartera, 1 lead)
        </div>
        <Btn onClick={crearDemo} disabled={creando} color={B}>
          {creando ? 'Creando...' : '✓ Crear demo Full'}
        </Btn>
      </div>

      {/* Lista */}
      <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 10, color: '#374151' }}>
        Cuentas demo ({clientes.length})
      </div>
      {loading ? (
        <div style={{ color: '#6B7280', fontSize: 13 }}>Cargando...</div>
      ) : clientes.length === 0 ? (
        <div style={{ color: '#6B7280', fontSize: 13 }}>Sin demos creadas.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {clientes.map(c => {
            const dias = c.fecha_expiracion ? Math.ceil((new Date(c.fecha_expiracion) - new Date()) / 86400000) : null
            const activa = dias !== null && dias > 0
            return (
              <div key={c.admin_id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', borderRadius: 8,
                background: activa ? '#F5F3FF' : '#F9FAFB',
                border: `1px solid ${activa ? '#DDD6FE' : '#E5E7EB'}`
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{c.nombre || '—'}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{c.email}</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: activa ? B : '#9CA3AF' }}>
                    {activa ? `✓ ${dias} día${dias !== 1 ? 's' : ''}` : 'Expirada'}
                  </div>
                  <div style={{ color: '#9CA3AF', fontSize: 11 }}>
                    Expira: {new Date(c.fecha_expiracion).toLocaleDateString('es-AR')}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── CALENDARIO ─────────────────────────────────────────
function Calendario({ reservas, propiedades, propietarios = [], onSelect }) {
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth())
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [vista, setVista] = useState('gantt')
  const [busqueda, setBusqueda] = useState('')
  const [filtroProp, setFiltroProp] = useState('') // propietario
  const [filtroTipo, setFiltroTipo] = useState('')
  const [paginaGantt, setPaginaGantt] = useState(0)
  const PROPS_POR_PAGINA = 20

  const nombresMes = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const diasMes = new Date(anio, mes + 1, 0).getDate()
  const colorEstado = { 'Confirmada': '#1B6B35', 'Señada': '#C07D10', 'Pendiente': '#1A3FA0', 'Cancelada': '#999', 'Finalizada': '#888' }
  const bgEstado = { 'Confirmada': '#E8F5EE', 'Señada': '#FEF3E2', 'Pendiente': '#E8EEFB', 'Cancelada': '#F2F4F6', 'Finalizada': '#F2F4F6' }

  // Filtrado de propiedades
  const propsFiltradas = propiedades.filter(p => {
    const matchBusq = !busqueda || p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.localidad?.toLowerCase().includes(busqueda.toLowerCase())
    const matchProp = !filtroProp || p.propietario_id === filtroProp
    const matchTipo = !filtroTipo || p.tipo === filtroTipo
    return matchBusq && matchProp && matchTipo
  })

  // Paginación
  const totalPaginas = Math.ceil(propsFiltradas.length / PROPS_POR_PAGINA)
  const propsPagina = propsFiltradas.slice(paginaGantt * PROPS_POR_PAGINA, (paginaGantt + 1) * PROPS_POR_PAGINA)

  const tipos = [...new Set(propiedades.map(p => p.tipo).filter(Boolean))]

  function reservasDelDia(propId, dia) {
    const fecha = `${anio}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
    return reservas.filter(r =>
      r.propiedad_id === propId &&
      r.estado !== 'Cancelada' &&
      r.fecha_entrada <= fecha &&
      r.fecha_salida > fecha
    )
  }

  function esHoy(dia) {
    return new Date().toISOString().split('T')[0] === `${anio}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
  }

  function getDiaSemana(dia) {
    const d = new Date(anio, mes, dia)
    return d.getDay()
  }

  function navMes(dir) {
    let nm = mes + dir, na = anio
    if (nm > 11) { nm = 0; na++ }
    if (nm < 0) { nm = 11; na-- }
    setMes(nm); setAnio(na); setPaginaGantt(0)
  }

  // Stats del mes para el resumen
  const reservasMes = reservas.filter(r => {
    const fm = `${anio}-${String(mes+1).padStart(2,'0')}`
    return r.fecha_entrada?.startsWith(fm) || r.fecha_salida?.startsWith(fm)
  })
  const reservasConfirmadas = reservasMes.filter(r => r.estado === 'Confirmada').length
  const reservasSeñadas = reservasMes.filter(r => r.estado === 'Señada').length
  const disponibles = propiedades.filter(p => !reservasMes.some(r => r.propiedad_id === p.id)).length

  return (
    <>
      {/* Header del calendario */}
      <div style={{ background:'#fff', border:'0.5px solid #E8ECF0', borderRadius:12, padding:16,  marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => navMes(-1)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: 16 }}>‹</button>
            <div style={{ fontSize: 18, fontWeight: 'bold', minWidth: 160, textAlign: 'center' }}>{nombresMes[mes]} {anio}</div>
            <button onClick={() => navMes(1)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: 16 }}>›</button>
            <button onClick={() => { setMes(hoy.getMonth()); setAnio(hoy.getFullYear()) }}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 12 }}>Hoy</button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['gantt', 'mes'].map(v => (
              <button key={v} onClick={() => setVista(v)}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid ' + (vista === v ? G : '#ddd'), background: vista === v ? G : '#fff', color: vista === v ? '#fff' : '#555', cursor: 'pointer', fontSize: 13, fontWeight: vista === v ? 'bold' : 'normal' }}>
                {v === 'gantt' ? '📊 Gantt' : '📅 Mes'}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs del mes */}
        <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Confirmadas', value: reservasConfirmadas, color: G },
            { label: 'Señadas', value: reservasSeñadas, color: W },
            { label: 'Sin reserva', value: disponibles, color: '#888' },
            { label: 'Total propiedades', value: propiedades.length, color: B },
          ].map((k, i) => (
            <div key={i} style={{ background: '#F8F9FA', borderRadius: 8, padding: '8px 14px', textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: k.color }}>{k.value}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros + Gantt */}
      {vista === 'gantt' && (
        <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <input
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setPaginaGantt(0) }}
              placeholder={`🔍 Buscar entre ${propiedades.length} propiedades...`}
              style={{ flex: 1, minWidth: 200, padding: '7px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13 }}
            />
            <select value={filtroProp} onChange={e => { setFiltroProp(e.target.value); setPaginaGantt(0) }}
              style={{ padding: '7px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13 }}>
              <option value="">Todos los propietarios</option>
              {propietarios.map(p => <option key={p.id} value={p.id}>{p.apellido_nombre}</option>)}
            </select>
            <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPaginaGantt(0) }}
              style={{ padding: '7px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13 }}>
              <option value="">Todos los tipos</option>
              {tipos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {(busqueda || filtroProp || filtroTipo) && (
              <button onClick={() => { setBusqueda(''); setFiltroProp(''); setFiltroTipo(''); setPaginaGantt(0) }}
                style={{ padding: '7px 12px', borderRadius: 8, background: '#F3F4F6', border: '1px solid #ddd', cursor: 'pointer', fontSize: 12 }}>
                ✕ Limpiar
              </button>
            )}
          </div>

          {/* Info de paginación */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: '#888' }}>
              Mostrando {paginaGantt * PROPS_POR_PAGINA + 1}-{Math.min((paginaGantt + 1) * PROPS_POR_PAGINA, propsFiltradas.length)} de {propsFiltradas.length} propiedades
              {propsFiltradas.length !== propiedades.length && ` (filtradas de ${propiedades.length})`}
            </div>
            {totalPaginas > 1 && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button onClick={() => setPaginaGantt(p => Math.max(0, p - 1))} disabled={paginaGantt === 0}
                  style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: paginaGantt === 0 ? 'not-allowed' : 'pointer', opacity: paginaGantt === 0 ? 0.5 : 1 }}>‹</button>
                {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => {
                  const pg = i + Math.max(0, paginaGantt - 2)
                  if (pg >= totalPaginas) return null
                  return (
                    <button key={pg} onClick={() => setPaginaGantt(pg)}
                      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid ' + (pg === paginaGantt ? G : '#ddd'), background: pg === paginaGantt ? G : '#fff', color: pg === paginaGantt ? '#fff' : '#555', cursor: 'pointer', fontSize: 12 }}>
                      {pg + 1}
                    </button>
                  )
                })}
                <button onClick={() => setPaginaGantt(p => Math.min(totalPaginas - 1, p + 1))} disabled={paginaGantt === totalPaginas - 1}
                  style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: paginaGantt === totalPaginas - 1 ? 'not-allowed' : 'pointer', opacity: paginaGantt === totalPaginas - 1 ? 0.5 : 1 }}>›</button>
              </div>
            )}
          </div>

          {/* Grilla Gantt */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', left: 0, background: '#1A1A1A', color: '#fff', padding: '8px 12px', textAlign: 'left', minWidth: 140, zIndex: 2, borderRight: '1px solid #333' }}>
                    Propiedad
                  </th>
                  {Array.from({ length: diasMes }, (_, i) => i + 1).map(dia => {
                    const ds = getDiaSemana(dia)
                    const finde = ds === 0 || ds === 6
                    return (
                      <th key={dia} style={{ background: esHoy(dia) ? G : finde ? '#1A2A1A' : '#1A1A1A', color: esHoy(dia) ? '#fff' : finde ? '#9DDCB4' : '#aaa', padding: '6px 3px', textAlign: 'center', minWidth: 26, fontWeight: esHoy(dia) ? 'bold' : 'normal', borderRight: '0.5px solid #333' }}>
                        {dia}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {propsPagina.length === 0 ? (
                  <tr>
                    <td colSpan={diasMes + 1} style={{ padding: 30, textAlign: 'center', color: '#bbb' }}>
                      No hay propiedades que coincidan con los filtros
                    </td>
                  </tr>
                ) : propsPagina.map((prop, pi) => (
                  <tr key={prop.id} style={{ borderBottom: '0.5px solid #E8ECF0', background: pi % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ position: 'sticky', left: 0, background: pi % 2 === 0 ? '#fff' : '#FAFAFA', padding: '6px 10px', borderRight: '1px solid #E8ECF0', zIndex: 1, minWidth: 140 }}>
                      <div style={{ fontWeight: 'bold', fontSize: 11, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 135 }}>{prop.nombre}</div>
                      {prop.localidad && <div style={{ fontSize: 10, color: '#aaa' }}>{prop.localidad}</div>}
                    </td>
                    {Array.from({ length: diasMes }, (_, i) => i + 1).map(dia => {
                      const r = reservasDelDia(prop.id, dia)
                      const rv = r[0]
                      const ds = getDiaSemana(dia)
                      const finde = ds === 0 || ds === 6
                      return (
                        <td key={dia}
                          onClick={() => rv && onSelect && onSelect(rv)}
                          style={{
                            background: rv ? bgEstado[rv.estado] || '#E8F5EE' : finde ? '#F8FFF8' : '#fff',
                            borderRight: '0.5px solid #E8ECF0',
                            cursor: rv ? 'pointer' : 'default',
                            padding: 0,
                            height: 28,
                            textAlign: 'center'
                          }}
                          title={rv ? `${rv.huesped_nombre} — ${rv.estado}` : ''}
                        >
                          {rv && (
                            <div style={{ width: '100%', height: '100%', background: colorEstado[rv.estado] || G, opacity: 0.85, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {rv.fecha_entrada === `${anio}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}` && (
                                <span style={{ fontSize: 9, color: '#fff', fontWeight: 'bold', overflow: 'hidden', maxWidth: 22 }}>
                                  {(rv.huesped_nombre || '').split(',')[0].substring(0, 3)}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Leyenda */}
          <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            {Object.entries(colorEstado).map(([estado, color]) => (
              <div key={estado} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#888' }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: color }} />
                {estado}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vista: Mes (calendario clásico) */}
      {vista === 'mes' && (
        <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 12, color: '#888', padding: '6px 0' }}>{d}</div>
            ))}
            {Array.from({ length: (new Date(anio, mes, 1).getDay() + 6) % 7 }, (_, i) => (
              <div key={'e' + i} />
            ))}
            {Array.from({ length: diasMes }, (_, i) => i + 1).map(dia => {
              const fecha = `${anio}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
              const rsDelDia = reservas.filter(r => r.fecha_entrada <= fecha && r.fecha_salida > fecha && r.estado !== 'Cancelada')
              const esHoyDia = esHoy(dia)
              return (
                <div key={dia} style={{ border: '0.5px solid #E8ECF0', borderRadius: 8, padding: '6px 8px', minHeight: 60, background: esHoyDia ? '#F0FBF4' : '#fff' }}>
                  <div style={{ fontWeight: esHoyDia ? 'bold' : 'normal', color: esHoyDia ? G : '#1A1A1A', fontSize: 13 }}>{dia}</div>
                  {rsDelDia.slice(0, 3).map((r, i) => (
                    <div key={i} onClick={() => onSelect && onSelect(r)}
                      style={{ background: bgEstado[r.estado], borderLeft: '3px solid ' + (colorEstado[r.estado] || G), borderRadius: 3, padding: '2px 4px', marginTop: 2, fontSize: 10, cursor: 'pointer', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {r.huesped_nombre?.split(',')[0] || '—'}
                    </div>
                  ))}
                  {rsDelDia.length > 3 && <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>+{rsDelDia.length - 3} más</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}

function PropiedadesTemp({ data, onRefresh }) {
  const vacio = { nombre: '', localidad: 'Pinamar', tipo: 'Departamento', capacidad: '', descripcion: '', tarifa_diaria_ars: '', tarifa_diaria_usd: '', tarifa_semanal_ars: '', tarifa_semanal_usd: '', comision_pct: 10, propietario_id: '' }
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [importando, setImportando] = useState(false)
  const [vistaPrevia, setVistaPrevia] = useState([])
  const [erroresImport, setErroresImport] = useState([])
  const [mostrarImport, setMostrarImport] = useState(false)
  const [importMsg, setImportMsg] = useState(null)

  // Propiedades filtradas
  const propsFiltradas = (data?.propiedades || []).filter(p => {
    const matchB = !busqueda || p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.localidad?.toLowerCase().includes(busqueda.toLowerCase()) ||
      data?.propietarios?.find(o => o.id === p.propietario_id)?.apellido_nombre?.toLowerCase().includes(busqueda.toLowerCase())
    const matchT = !filtroTipo || p.tipo === filtroTipo
    return matchB && matchT
  })
  const tipos = [...new Set((data?.propiedades || []).map(p => p.tipo).filter(Boolean))]
  const getPropNombre = id => data?.propietarios?.find(o => o.id === id)?.apellido_nombre || id

  async function procesarExcel(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true); setVistaPrevia([]); setErroresImport([]); setImportMsg(null)
    try {
      // Cargar SheetJS via CDN (no requiere instalación)
      if (!window.XLSX) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script')
          s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'
          s.onload = resolve; s.onerror = reject
          document.head.appendChild(s)
        })
      }
      const XLSX = window.XLSX
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      const headers = rows[0]?.map(h => String(h).toLowerCase().trim()) || []
      const data_rows = rows.slice(1).filter(r => r.some(c => c !== ''))
      const errores = []
      const preview = data_rows.map((row, i) => {
        const get = (keys) => { for (const k of keys) { const idx = headers.findIndex(h => h.includes(k)); if (idx >= 0 && row[idx]) return String(row[idx]).trim() } return '' }
        const nombre = get(['nombre', 'propiedad'])
        const localidad = get(['localidad', 'ciudad', 'zona'])
        const tipo = get(['tipo', 'clase'])
        const capacidad = parseInt(get(['capacidad', 'personas', 'huespedes'])) || 0
        if (!nombre) errores.push(`Fila ${i+2}: falta nombre de propiedad`)
        return { nombre, localidad, tipo: tipo || 'Departamento', capacidad, tarifa_semanal_ars: parseFloat(get(['tarifa_ars','tarifa_semanal','precio_ars'])) || 0, tarifa_semanal_usd: parseFloat(get(['tarifa_usd','precio_usd'])) || 0, comision_pct: parseFloat(get(['comision','comision_pct'])) || 10, valid: !!nombre }
      })
      setVistaPrevia(preview); setErroresImport(errores)
    } catch(err) { setImportMsg({ ok: false, text: 'Error al leer el Excel: ' + err.message }) }
    setImportando(false)
  }

  async function confirmarImportacion() {
    const validas = vistaPrevia.filter(p => p.valid)
    if (validas.length === 0) return
    setImportando(true)
    try {
      const uid = (await supabase.auth.getUser()).data.user?.id
      const inserts = validas.map(p => ({ ...p, activo: true, admin_id: uid, valid: undefined }))
      const { error } = await supabase.from('prop_temp').insert(inserts)
      if (error) throw error
      setImportMsg({ ok: true, text: `✓ ${validas.length} propiedades importadas exitosamente` })
      setVistaPrevia([]); setMostrarImport(false)
      if (onRefresh) onRefresh()
    } catch(err) { setImportMsg({ ok: false, text: 'Error al importar: ' + err.message }) }
    setImportando(false)
  }

  const [form, setForm] = useState(false)
  const [f, setF] = useState(vacio)
  const [editando, setEditando] = useState(null)
  const [modalInst, setModalInst] = useState(false)
  const [propInst, setPropInst] = useState(null)
  const [instForm, setInstForm] = useState({ codigo_acceso:'', instrucciones:'', wifi_nombre:'', wifi_clave:'', direccion_maps:'', reglamento:'', contacto_urgencias:'' })
  const [guardandoInst, setGuardandoInst] = useState(false)
  const [instMsg, setInstMsg] = useState(null)

  function editar(p) {
    setF({ nombre: p.nombre||'', localidad: p.localidad||'Pinamar', tipo: p.tipo||'Departamento', capacidad: p.capacidad||'', descripcion: p.descripcion||'', tarifa_diaria_ars: p.tarifa_diaria_ars||'', tarifa_diaria_usd: p.tarifa_diaria_usd||'', tarifa_semanal_ars: p.tarifa_semanal_ars||'', tarifa_semanal_usd: p.tarifa_semanal_usd||'', comision_pct: p.comision_pct||10, propietario_id: p.propietario_id||'' })
    setEditando(p.id); setForm(true)
  }

  async function abrirInstrucciones(p) {
    setPropInst(p)
    setInstMsg(null)
    const adminId = (await supabase.auth.getUser()).data.user?.id
    const { data } = await supabase.from('instrucciones_propiedad')
      .select('*').eq('admin_id', adminId).eq('propiedad_id', p.id).maybeSingle()
    setInstForm({
      codigo_acceso: data?.codigo_acceso || '',
      instrucciones: data?.instrucciones || '',
      wifi_nombre: data?.wifi_nombre || '',
      wifi_clave: data?.wifi_clave || '',
      direccion_maps: data?.direccion_maps || '',
      reglamento: data?.reglamento || '',
      contacto_urgencias: data?.contacto_urgencias || '',
    })
    setModalInst(true)
  }

  async function guardarInstrucciones() {
    setGuardandoInst(true); setInstMsg(null)
    try {
      const adminId = (await supabase.auth.getUser()).data.user?.id
      const { error } = await supabase.from('instrucciones_propiedad').upsert({
        admin_id: adminId,
        propiedad_id: propInst.id,
        ...instForm
      }, { onConflict: 'admin_id,propiedad_id' })
      if (error) throw error
      setInstMsg({ ok: true, text: '✓ Instrucciones guardadas correctamente' })
      setTimeout(() => setModalInst(false), 1200)
    } catch(e) { setInstMsg({ ok: false, text: 'Error: ' + e.message }) }
    setGuardandoInst(false)
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


  // Renderizar filtros e importación antes del contenido principal
  const renderFiltros = () => (
    <>
      {/* Barra de búsqueda y filtros */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder={`🔍 Buscar entre ${(data?.propiedades || []).length} propiedades...`}
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13 }} />
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13 }}>
          <option value="">Todos los tipos</option>
          {tipos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={() => setMostrarImport(!mostrarImport)}
          style={{ padding: '8px 14px', borderRadius: 8, background: B, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}>
          📥 Importar Excel
        </button>
        {(busqueda || filtroTipo) && (
          <button onClick={() => { setBusqueda(''); setFiltroTipo('') }}
            style={{ padding: '8px 12px', borderRadius: 8, background: '#F3F4F6', border: '1px solid #ddd', cursor: 'pointer', fontSize: 12 }}>✕ Limpiar</button>
        )}
      </div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
        {propsFiltradas.length} propiedad(es) {(busqueda || filtroTipo) ? 'filtradas' : 'en total'}
      </div>

      {/* Panel de importación Excel */}
      {mostrarImport && (
        <div style={{ background: '#F8F9FA', border: '1px solid #ddd', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>📥 Importar propiedades desde Excel</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
            El archivo debe tener columnas: <strong>nombre, localidad, tipo, capacidad, tarifa_ars, tarifa_usd, comision_pct</strong>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={procesarExcel}
              style={{ fontSize: 13 }} />
            <a href="#" onClick={e => { e.preventDefault()
              const csv = 'nombre,localidad,tipo,capacidad,tarifa_ars,tarifa_usd,comision_pct\nDepto Sol y Mar,Pinamar,Departamento,4,500000,,10\nCasa Las Gaviotas,Pinamar,Casa,6,700000,,10'
              const b = new Blob([csv], { type: 'text/csv' })
              const u = URL.createObjectURL(b)
              const a = document.createElement('a')
              a.href = u; a.download = 'plantilla_propiedades.csv'; a.click()
            }}
              style={{ fontSize: 12, color: B }}>⬇ Descargar plantilla</a>
          </div>
          {importando && <div style={{ color: '#888', fontSize: 13 }}>⏳ Procesando archivo...</div>}
          {importMsg && (
            <div style={{ background: importMsg.ok ? '#E8F5EE' : '#FCEAEA', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: importMsg.ok ? G : D, marginBottom: 10 }}>
              {importMsg.text}
            </div>
          )}
          {erroresImport.length > 0 && (
            <div style={{ background: '#FEF3E2', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: W, marginBottom: 10 }}>
              {erroresImport.map((e, i) => <div key={i}>⚠ {e}</div>)}
            </div>
          )}
          {vistaPrevia.length > 0 && (
            <div>
              <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 8 }}>Vista previa ({vistaPrevia.filter(p => p.valid).length} válidas de {vistaPrevia.length}):</div>
              <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 10 }}>
                {vistaPrevia.slice(0, 20).map((p, i) => (
                  <div key={i} style={{ padding: '4px 8px', fontSize: 12, background: p.valid ? '#E8F5EE' : '#FCEAEA', borderRadius: 4, marginBottom: 3 }}>
                    {p.valid ? '✓' : '✗'} {p.nombre} · {p.localidad} · {p.tipo} · {p.capacidad} pers.
                    {p.tarifa_semanal_ars > 0 && ` · ARS ${p.tarifa_semanal_ars.toLocaleString('es-AR')}`}
                  </div>
                ))}
              </div>
              <button onClick={confirmarImportacion} disabled={importando || vistaPrevia.filter(p => p.valid).length === 0}
                style={{ padding: '9px 18px', borderRadius: 8, background: G, color: '#fff', border: 'none', fontWeight: 'bold', fontSize: 13, cursor: 'pointer' }}>
                ✓ Importar {vistaPrevia.filter(p => p.valid).length} propiedades
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )


  return (
    <>
      {renderFiltros()}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#888' }}>{data.length} propiedades</div>
        <Btn onClick={() => { setF(vacio); setEditando(null); setForm(true) }}>+ Nueva propiedad</Btn>
      </div>
      {form && (
        <div style={{ background:'#fff', border:'0.5px solid #E8ECF0', borderRadius:12, padding:16,  marginBottom: 16, border: '1px solid ' + G }}>
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
        </div>
      )}
      <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
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
              <button onClick={() => abrirInstrucciones(p)} title="Instrucciones de acceso"
                style={{ padding: '3px 8px', borderRadius: 5, background: B, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11 }}>📋</button>
              <button onClick={() => editar(p)} style={{ padding: '3px 8px', borderRadius: 5, background: W, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✏ Editar</button>
              <button onClick={() => darBaja(p)} style={{ padding: '3px 8px', borderRadius: 5, background: D, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✗ Baja</button>
            </div>
          ])}
        />
      </div>
    {/* Modal Instrucciones de Acceso */}
    {modalInst && propInst && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
        <div style={{ background:'#fff', borderRadius:14, padding:24, width:'100%', maxWidth:540, maxHeight:'90vh', overflowY:'auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
            <div>
              <div style={{ fontWeight:'bold', fontSize:15 }}>📋 Instrucciones de acceso</div>
              <div style={{ fontSize:12, color:'#888', marginTop:2 }}>{propInst.nombre}</div>
            </div>
            <button onClick={() => setModalInst(false)}
              style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#888' }}>✕</button>
          </div>

          {instMsg && (
            <div style={{ background: instMsg.ok ? '#E8F5EE' : '#FCEAEA', border: '0.5px solid ' + (instMsg.ok ? '#9DDCB4':'#F09595'), borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:13, color: instMsg.ok ? G : D }}>
              {instMsg.text}
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            <div style={{ gridColumn:'span 2' }}>
              <div style={{ fontSize:12, color:'#888', marginBottom:4 }}>🔑 Código de acceso</div>
              <input value={instForm.codigo_acceso} onChange={e => setInstForm({...instForm, codigo_acceso: e.target.value})}
                placeholder="Ej: 4872"
                style={{ width:'100%', padding:'8px 10px', border:'1px solid #ddd', borderRadius:7, fontSize:14, fontFamily:'monospace', boxSizing:'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize:12, color:'#888', marginBottom:4 }}>📶 Red WiFi</div>
              <input value={instForm.wifi_nombre} onChange={e => setInstForm({...instForm, wifi_nombre: e.target.value})}
                placeholder="Nombre de la red"
                style={{ width:'100%', padding:'8px 10px', border:'1px solid #ddd', borderRadius:7, fontSize:13, boxSizing:'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize:12, color:'#888', marginBottom:4 }}>🔐 Clave WiFi</div>
              <input value={instForm.wifi_clave} onChange={e => setInstForm({...instForm, wifi_clave: e.target.value})}
                placeholder="Contraseña"
                style={{ width:'100%', padding:'8px 10px', border:'1px solid #ddd', borderRadius:7, fontSize:13, boxSizing:'border-box' }} />
            </div>
            <div style={{ gridColumn:'span 2' }}>
              <div style={{ fontSize:12, color:'#888', marginBottom:4 }}>📍 Link Google Maps</div>
              <input value={instForm.direccion_maps} onChange={e => setInstForm({...instForm, direccion_maps: e.target.value})}
                placeholder="https://maps.google.com/?q=..."
                style={{ width:'100%', padding:'8px 10px', border:'1px solid #ddd', borderRadius:7, fontSize:13, boxSizing:'border-box' }} />
            </div>
            <div style={{ gridColumn:'span 2' }}>
              <div style={{ fontSize:12, color:'#888', marginBottom:4 }}>📝 Instrucciones de ingreso</div>
              <textarea value={instForm.instrucciones} onChange={e => setInstForm({...instForm, instrucciones: e.target.value})}
                placeholder="1. El portón se abre con código...
2. La llave está en..."
                rows={4}
                style={{ width:'100%', padding:'8px 10px', border:'1px solid #ddd', borderRadius:7, fontSize:13, resize:'vertical', boxSizing:'border-box' }} />
            </div>
            <div style={{ gridColumn:'span 2' }}>
              <div style={{ fontSize:12, color:'#888', marginBottom:4 }}>📋 Reglamento interno</div>
              <textarea value={instForm.reglamento} onChange={e => setInstForm({...instForm, reglamento: e.target.value})}
                placeholder="• Prohibido fumar
• Silencio 23:00 hs
• No mascotas"
                rows={3}
                style={{ width:'100%', padding:'8px 10px', border:'1px solid #ddd', borderRadius:7, fontSize:13, resize:'vertical', boxSizing:'border-box' }} />
            </div>
            <div style={{ gridColumn:'span 2' }}>
              <div style={{ fontSize:12, color:'#888', marginBottom:4 }}>📞 Contactos de urgencias</div>
              <textarea value={instForm.contacto_urgencias} onChange={e => setInstForm({...instForm, contacto_urgencias: e.target.value})}
                placeholder="Emergencias: +54 9 ...
Gas: +54 9 ..."
                rows={2}
                style={{ width:'100%', padding:'8px 10px', border:'1px solid #ddd', borderRadius:7, fontSize:13, resize:'vertical', boxSizing:'border-box' }} />
            </div>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={guardarInstrucciones} disabled={guardandoInst}
              style={{ flex:1, padding:'10px 0', borderRadius:8, background:G, color:'#fff', border:'none', fontWeight:'bold', fontSize:14, cursor:guardandoInst?'not-allowed':'pointer', opacity:guardandoInst?0.7:1 }}>
              {guardandoInst ? '⏳ Guardando...' : '✓ Guardar instrucciones'}
            </button>
            <button onClick={() => setModalInst(false)}
              style={{ padding:'10px 20px', borderRadius:8, background:'#F3F4F6', color:'#555', border:'none', cursor:'pointer', fontSize:14 }}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}
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
        <div style={{ background:'#fff', border:'0.5px solid #E8ECF0', borderRadius:12, padding:16,  marginBottom: 16, border: '1px solid ' + G }}>
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
        </div>
      )}
      <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
        <Tabla
          cols={['ID', 'Nombre', 'DNI/CUIT', 'Teléfono', 'Email', 'Ciudad', 'Banco', 'Acciones']}
          filas={data.map(p => [
            <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.id}</span>,
            <span style={{ fontWeight: 'bold' }}>{p.apellido_nombre}</span>,
            p.dni_cuit||'—', p.telefono||'—', p.email||'—', p.ciudad_residencia||'—', p.banco||'—',
            <button onClick={() => editar(p)} style={{ padding: '3px 8px', borderRadius: 5, background: W, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✏ Editar</button>
          ])}
        />
      </div>
    </>
  )
}

// ─── MÓDULO RESERVAS ─────────────────────────────────────
function Reservas({ data, reservas, propiedades, propietarios, perfil = {}, onRefresh }) {
  const _data = data || reservas || []
  const hoy = new Date().toISOString().split('T')[0]
  const vacio = { propiedad_id: '', huesped_nombre: '', huesped_dni: '', huesped_telefono: '', huesped_email: '', huesped_ciudad: '', fecha_entrada: '', fecha_salida: '', modalidad: 'Diaria', moneda: 'ARS', monto_total: '', sena: 0, fecha_cobro_sena: '', fecha_cobro_saldo: '', saldo_cobrado: false, estado: 'Pendiente', observaciones: '' }
  const [form, setForm] = useState(false)
  const [f, setF] = useState(vacio)
  const [editando, setEditando] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [procesandoIA, setProcesandoIA] = useState(false)
  const [iaMsg, setIaMsg] = useState('')
  const [iaDatos, setIaDatos] = useState(null)

  async function procesarContratoIA(e) {
    const file = e.target.files[0]
    if (!file) return
    setProcesandoIA(true); setIaMsg('Analizando contrato con IA...')
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = reject
        reader.onload = ev => resolve(ev.target.result.split(',')[1])
        reader.readAsDataURL(file)
      })

      const resp = await fetch('/api/procesar-contrato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, mediaType: 'application/pdf' })
      })

      const result = await resp.json()
      if (!result.ok || !result.datos) throw new Error(result.error || 'Sin datos en la respuesta')

      const parsed = result.datos
      setIaDatos(parsed)

      // Setear el formulario directamente con todos los datos de la IA
      const nuevoF = {
        propiedad_id: '',
        huesped_nombre: parsed.huesped_nombre || '',
        huesped_dni: parsed.huesped_dni || '',
        huesped_telefono: parsed.huesped_telefono || '',
        huesped_email: parsed.huesped_email || '',
        huesped_ciudad: parsed.huesped_ciudad || '',
        fecha_entrada: parsed.fecha_entrada || '',
        fecha_salida: parsed.fecha_salida || '',
        modalidad: parsed.modalidad || 'Diaria',
        moneda: parsed.moneda || 'ARS',
        monto_total: parsed.monto_total ? String(parsed.monto_total) : '',
        sena: parsed.sena || 0,
        fecha_cobro_sena: '',
        fecha_cobro_saldo: '',
        saldo_cobrado: false,
        estado: parsed.sena > 0 ? 'Señada' : 'Pendiente',
        observaciones: parsed.observaciones || '',
      }
      setF(nuevoF)
      setForm(true)
      setEditando(null)
      setIaMsg('✓ IA completó los datos. Verifique, seleccione la propiedad y guarde.')
    } catch(err) {
      setIaMsg('Error al procesar el PDF: ' + err.message)
    }
    setProcesandoIA(false)
  }

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
    const conflictos = _data.filter(r => {
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
    setF({ propiedad_id: r.propiedad_id||'', huesped_nombre: r.huesped_nombre||'', huesped_dni: r.huesped_dni||'', huesped_telefono: r.huesped_telefono||'', huesped_email: r.huesped_email||'', huesped_ciudad: r.huesped_ciudad||'', fecha_entrada: r.fecha_entrada||'', fecha_salida: r.fecha_salida||'', modalidad: r.modalidad||'Diaria', moneda: r.moneda||'ARS', monto_total: r.monto_total||'', sena: r.sena||0, fecha_cobro_sena: r.fecha_cobro_sena||'', fecha_cobro_saldo: r.fecha_cobro_saldo||'', saldo_cobrado: r.saldo_cobrado||false, estado: r.estado||'Pendiente', observaciones: r.observaciones||'' })
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
    const neto = monto - comision

    const datos = {
      propiedad_id: f.propiedad_id,
      huesped_nombre: f.huesped_nombre,
      huesped_dni: f.huesped_dni || '',
      huesped_telefono: f.huesped_telefono || '',
      huesped_email: f.huesped_email || '',
      huesped_ciudad: f.huesped_ciudad || '',
      fecha_entrada: f.fecha_entrada,
      fecha_salida: f.fecha_salida,
      dias,
      modalidad: f.modalidad || 'Diaria',
      moneda: f.moneda || 'ARS',
      monto_total: monto,
      sena: Number(f.sena) || 0,
      comision,
      neto_propietario: neto,
      estado: f.estado || 'Pendiente',
      observaciones: f.observaciones || '',
      fecha_cobro_sena: f.fecha_cobro_sena || null,
      fecha_cobro_saldo: f.fecha_cobro_saldo || null,
      saldo_cobrado: f.saldo_cobrado || false,
    }

    if (editando) {
      const { error } = await supabase.from('reservas_temp').update(datos).eq('id', editando)
      if (error) return alert('Error al guardar: ' + error.message)
    } else {
      let nuevoId = nextId(_data, 'RV')
      let { error } = await supabase.from('reservas_temp').insert([{ ...datos, id: nuevoId, admin_id: adminId }])
      if (error && error.code === '23505') {
        nuevoId = 'RV-' + Date.now().toString(36).toUpperCase()
        const r2 = await supabase.from('reservas_temp').insert([{ ...datos, id: nuevoId, admin_id: adminId }])
        error = r2.error
      }
      if (error) return alert('Error al guardar: ' + error.message)
      if (comision > 0) {
        await supabase.from('caja').insert([{
          id: 'CJ-' + nuevoId,
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

  const dataFiltrada = filtroEstado ? _data.filter(r => r.estado === filtroEstado) : _data
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
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ padding: '7px 14px', borderRadius: 7, background: B, color: '#fff', cursor: procesandoIA ? 'wait' : 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 'bold' }}>
            {procesandoIA ? '⏳ Analizando...' : '📄 Cargar contrato PDF (IA)'}
            <input type="file" accept=".pdf" onChange={procesarContratoIA} style={{ display: 'none' }} disabled={procesandoIA} />
          </label>
          <Btn onClick={() => { setF(vacio); setEditando(null); setIaMsg(''); setIaDatos(null); setForm(true) }}>+ Nueva reserva</Btn>
        </div>
      </div>

      {iaMsg && (
        <div style={{ background: iaMsg.startsWith('✓') ? '#E8F5EE' : iaMsg.startsWith('Error') ? '#FCEAEA' : '#E8EEFB', border: '0.5px solid ' + (iaMsg.startsWith('✓') ? '#9DDCB4' : iaMsg.startsWith('Error') ? '#F09595' : '#A8C0F0'), borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: iaMsg.startsWith('✓') ? G : iaMsg.startsWith('Error') ? D : B }}>
          {iaMsg}
        </div>
      )}

      {iaDatos && (
        <div style={{ background: '#E8EEFB', border: '0.5px solid #A8C0F0', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ fontWeight: 'bold', fontSize: 12, color: B, marginBottom: 8 }}>Datos detectados por IA — verifique antes de guardar:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, fontSize: 12 }}>
            {[
              ['Huésped', iaDatos.huesped_nombre],
              ['DNI', iaDatos.huesped_dni],
              ['Ciudad', iaDatos.huesped_ciudad],
              ['Teléfono', iaDatos.huesped_telefono],
              ['Email', iaDatos.huesped_email],
              ['Modalidad', iaDatos.modalidad],
              ['Entrada', iaDatos.fecha_entrada],
              ['Salida', iaDatos.fecha_salida],
              ['Moneda', iaDatos.moneda],
              ['Monto total', iaDatos.monto_total ? (iaDatos.moneda === 'USD' ? 'USD ' : '$') + Number(iaDatos.monto_total).toLocaleString('es-AR') : ''],
              ['Seña', iaDatos.sena ? (iaDatos.moneda === 'USD' ? 'USD ' : '$') + Number(iaDatos.sena).toLocaleString('es-AR') : ''],
              ['Observaciones', iaDatos.observaciones],
            ].map(([k, v], i) => v ? (
              <div key={i}><span style={{ color: '#888' }}>{k}: </span><strong style={{ color: '#1A1A1A' }}>{String(v)}</strong></div>
            ) : null)}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: W, fontWeight: 'bold' }}>⚠ Seleccione la propiedad manualmente y verifique los datos antes de guardar.</div>
        </div>
      )}

      {form && (
        <div style={{ background:'#fff', border:'0.5px solid #E8ECF0', borderRadius:12, padding:16,  marginBottom: 16, border: '1px solid ' + G }}>
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
              <Input label="Seña cobrada" value={f.sena} onChange={v => setF({...f, sena: v})} type="number" />
              <div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Estado</div>
                <select value={f.estado} onChange={e => setF({...f, estado: e.target.value})} style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                  <option>Pendiente</option><option>Señada</option><option>Confirmada</option><option>Cancelada</option>
                </select>
              </div>
              <Input label="Fecha cobro señal" value={f.fecha_cobro_sena} onChange={v => setF({...f, fecha_cobro_sena: v})} type="date" />
              <Input label="Fecha cobro saldo" value={f.fecha_cobro_saldo} onChange={v => setF({...f, fecha_cobro_saldo: v})} type="date" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                <input type="checkbox" checked={f.saldo_cobrado} onChange={e => setF({...f, saldo_cobrado: e.target.checked})} id="saldo_cobrado" />
                <label htmlFor="saldo_cobrado" style={{ fontSize: 13, cursor: 'pointer' }}>Saldo cobrado</label>
              </div>
            </div>
          </div>

          <Input label="Observaciones" value={f.observaciones} onChange={v => setF({...f, observaciones: v})} />

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Btn onClick={guardar}>{editando ? 'Guardar cambios' : 'Guardar reserva'}</Btn>
            <BtnSec onClick={() => { setForm(false); setEditando(null) }}>Cancelar</BtnSec>
          </div>
        </div>
      )}

      <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
        <Tabla
          cols={['ID', 'Propiedad', 'Huésped', 'Entrada', 'Salida', 'Días', 'Moneda', 'Monto', 'Seña', 'Saldo', 'Estado', 'Acciones']}
          filas={dataFiltrada.map(r => {
            const saldo = Number(r.monto_total||0) - Number(r.sena||0)
            return [
              <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.id}</span>,
              r.propiedad_id,
              <span style={{ fontWeight: 'bold' }}>{r.huesped_nombre}</span>,
              formatFecha(r.fecha_entrada),
              formatFecha(r.fecha_salida),
              r.dias + 'd',
              <Pill text={r.moneda} color={r.moneda === 'USD' ? 'blue' : 'gray'} />,
              <span style={{ fontWeight: 'bold' }}>{fmtM(r.monto_total, r.moneda)}</span>,
              fmtM(r.sena, r.moneda),
              <span style={{ color: saldo > 0 ? D : G, fontWeight: 'bold' }}>{fmtM(saldo, r.moneda)}</span>,
              <Pill text={r.estado} color={colorEstado[r.estado] || 'gray'} />,
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <button onClick={() => editar(r)} style={{ padding: '3px 8px', borderRadius: 5, background: W, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✏</button>
                <button onClick={() => generarReciboReserva(r, propiedades.find(p => p.id === r.propiedad_id), perfil)} style={{ padding: '3px 8px', borderRadius: 5, background: B, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>📄</button>
                {r.estado !== 'Cancelada' && <button onClick={() => cancelar(r)} style={{ padding: '3px 8px', borderRadius: 5, background: D, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}>✗</button>}
                {r.estado !== 'Cancelada' && (
                  <button
                    onClick={() => {
                      const url = 'https://temp.administracionpinamar.com/checkin?id=' + r.id
                      navigator.clipboard.writeText(url).then(() => alert('Link de check-in copiado:\n' + url))
                    }}
                    style={{ padding: '3px 8px', borderRadius: 5, background: r.checkin_confirmado ? '#166534' : '#0891B2', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10 }}
                    title={r.checkin_confirmado ? 'Check-in confirmado' : 'Copiar link de check-in'}
                  >
                    {r.checkin_confirmado ? '✓ CI' : '🔗 CI'}
                  </button>
                )}
              </div>
            ]
          })}
        />
      </div>
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
        <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
          <div style={{ color:'#bbb', textAlign:'center', padding:20, fontSize:13 }}>
            No hay solicitudes de reserva aún.<br />
            <span style={{ fontSize:12 }}>Las solicitudes llegan cuando los huéspedes usan el link público de reserva de cada propiedad.</span>
          </div>
        </div>
      )}

      {solicitudes.map(sol => {
        const prop = propiedades.find(p => p.id === sol.propiedad_id)
        const dias = sol.dias || Math.ceil((new Date(sol.fecha_salida) - new Date(sol.fecha_entrada)) / 86400000)
        return (
          <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
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
          </div>
        )
      })}
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



function ReportesTemp({ reservas, propiedades, propietarios }) {
  const [periodo, setPeriodo] = useState('mes_actual')
  const [vista, setVista] = useState('ocupacion')
  const hoy = new Date()

  function getReservasFiltradas() {
    const ahora = new Date()
    let desde, hasta
    if (periodo === 'mes_actual') {
      desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      hasta = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)
    } else if (periodo === 'mes_anterior') {
      desde = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
      hasta = new Date(ahora.getFullYear(), ahora.getMonth(), 0)
    } else if (periodo === 'temporada_alta') {
      const yr = ahora.getFullYear()
      desde = new Date(yr, 11, 15)
      hasta = new Date(yr + 1, 2, 15)
    } else if (periodo === 'anio_actual') {
      desde = new Date(ahora.getFullYear(), 0, 1)
      hasta = new Date(ahora.getFullYear(), 11, 31)
    } else {
      desde = new Date(ahora.getFullYear(), 0, 1)
      hasta = ahora
    }
    const fmtD = d => d.toISOString().split('T')[0]
    return reservas.filter(r =>
      r.estado !== 'Cancelada' &&
      r.fecha_entrada <= fmtD(hasta) &&
      r.fecha_salida >= fmtD(desde)
    )
  }

  const rs = getReservasFiltradas()

  // KPIs generales
  const totalReservas = rs.length
  const totalDias = rs.reduce((s, r) => s + Number(r.dias || 0), 0)
  const totalBrutoARS = rs.filter(r => r.moneda === 'ARS').reduce((s, r) => s + Number(r.monto_total || 0), 0)
  const totalBrutoUSD = rs.filter(r => r.moneda === 'USD').reduce((s, r) => s + Number(r.monto_total || 0), 0)
  const totalComARS = rs.filter(r => r.moneda === 'ARS').reduce((s, r) => s + Number(r.comision || 0), 0)
  const totalComUSD = rs.filter(r => r.moneda === 'USD').reduce((s, r) => s + Number(r.comision || 0), 0)
  const promDias = totalReservas > 0 ? (totalDias / totalReservas).toFixed(1) : 0

  // Ocupación por propiedad
  const getPropNombre = id => propiedades.find(p => p.id === id)?.nombre || id
  const ocupPorProp = propiedades.map(p => {
    const resP = rs.filter(r => r.propiedad_id === p.id)
    const diasOcup = resP.reduce((s, r) => s + Number(r.dias || 0), 0)
    const ingresoARS = resP.filter(r => r.moneda === 'ARS').reduce((s, r) => s + Number(r.monto_total || 0), 0)
    const ingresoUSD = resP.filter(r => r.moneda === 'USD').reduce((s, r) => s + Number(r.monto_total || 0), 0)
    return { id: p.id, nombre: p.nombre, reservas: resP.length, dias: diasOcup, ingresoARS, ingresoUSD, localidad: p.localidad }
  }).sort((a, b) => b.dias - a.dias)

  // Top 10 más rentables
  const top10 = [...ocupPorProp].sort((a, b) => (b.ingresoARS + b.ingresoUSD * 1000) - (a.ingresoARS + a.ingresoUSD * 1000)).slice(0, 10)

  // Origen de reservas (por huesped_ciudad)
  const ciudades = {}
  rs.forEach(r => { const c = r.huesped_ciudad || 'Sin datos'; ciudades[c] = (ciudades[c] || 0) + 1 })
  const topCiudades = Object.entries(ciudades).sort((a, b) => b[1] - a[1]).slice(0, 8)

  // Reservas por mes
  const porMes = {}
  rs.forEach(r => {
    const mes = (r.fecha_entrada || '').substring(0, 7)
    if (!mes) return
    if (!porMes[mes]) porMes[mes] = { reservas: 0, dias: 0, ars: 0, usd: 0 }
    porMes[mes].reservas++
    porMes[mes].dias += Number(r.dias || 0)
    if (r.moneda === 'ARS') porMes[mes].ars += Number(r.monto_total || 0)
    if (r.moneda === 'USD') porMes[mes].usd += Number(r.monto_total || 0)
  })
  const mesesData = Object.entries(porMes).sort((a, b) => a[0].localeCompare(b[0]))

  const maxDias = Math.max(...ocupPorProp.map(p => p.dias), 1)

  function exportarPDF() {
    const pdfScript = document.createElement('script')
    pdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    pdfScript.onload = function() {
      const { jsPDF } = window.jspdf
      const pdfDoc = new jsPDF({ unit: 'mm', format: 'a4' })
      const pageW = 210, margin = 14
      const fechaHoy = new Date().toLocaleDateString('es-AR')
      const periodoLabels = { mes_actual: 'Mes actual', mes_anterior: 'Mes anterior', anio_actual: 'Año actual', temporada_alta: 'Temporada alta' }

      pdfDoc.setFillColor(26, 63, 160)
      pdfDoc.rect(0, 0, pageW, 36, 'F')
      pdfDoc.setTextColor(255, 255, 255)
      pdfDoc.setFont('helvetica', 'bold')
      pdfDoc.setFontSize(16)
      pdfDoc.text('Reporte de Ocupación', margin, 16)
      pdfDoc.setFontSize(10)
      pdfDoc.setFont('helvetica', 'normal')
      pdfDoc.text('Período: ' + (periodoLabels[periodo] || periodo) + ' · Generado: ' + fechaHoy, margin, 26)
      pdfDoc.setTextColor(0, 0, 0)

      let posY = 48
      pdfDoc.setFont('helvetica', 'bold')
      pdfDoc.setFontSize(12)
      pdfDoc.text('Resumen del período', margin, posY)
      posY += 10
      pdfDoc.setFont('helvetica', 'normal')
      pdfDoc.setFontSize(10)
      const kpiItems = [
        ['Reservas', String(rs.length)],
        ['Días ocupados', String(totalDias) + ' días'],
        ['Estadía promedio', String(promDias) + ' días'],
        ['Total bruto ARS', '$' + Number(totalBrutoARS).toLocaleString('es-AR')],
        ['Comisión ARS', '$' + Number(totalComARS).toLocaleString('es-AR')],
        ['Total bruto USD', 'USD ' + Number(totalBrutoUSD).toLocaleString('es-AR')],
        ['Comisión USD', 'USD ' + Number(totalComUSD).toLocaleString('es-AR')],
      ]
      kpiItems.forEach(function(kpiPair) {
        pdfDoc.text(kpiPair[0] + ':', margin, posY)
        pdfDoc.setFont('helvetica', 'bold')
        pdfDoc.text(kpiPair[1], margin + 60, posY)
        pdfDoc.setFont('helvetica', 'normal')
        posY += 7
      })
      posY += 6

      pdfDoc.setFont('helvetica', 'bold')
      pdfDoc.setFontSize(12)
      pdfDoc.text('Top 10 propiedades por días ocupados', margin, posY)
      posY += 8
      pdfDoc.setFontSize(9)
      pdfDoc.setFillColor(240, 244, 255)
      pdfDoc.rect(margin, posY - 4, pageW - 2 * margin, 8, 'F')
      pdfDoc.text('Propiedad', margin + 2, posY)
      pdfDoc.text('Reservas', margin + 80, posY)
      pdfDoc.text('Días', margin + 110, posY)
      pdfDoc.text('Ingreso ARS', margin + 135, posY)
      posY += 8
      pdfDoc.setFont('helvetica', 'normal')
      top10.forEach(function(propItem, propIdx) {
        if (posY > 270) { pdfDoc.addPage(); posY = 20 }
        pdfDoc.text(String(propIdx + 1) + '. ' + (propItem.nombre || '').substring(0, 35), margin + 2, posY)
        pdfDoc.text(String(propItem.reservas), margin + 80, posY)
        pdfDoc.text(String(propItem.dias) + 'd', margin + 110, posY)
        if (propItem.ingresoARS > 0) pdfDoc.text('$' + Number(propItem.ingresoARS).toLocaleString('es-AR'), margin + 135, posY)
        posY += 7
      })

      pdfDoc.save('reporte_ocupacion_' + (periodo || 'general') + '_' + fechaHoy.replace(/\//g, '-') + '.pdf')
    }
    document.head.appendChild(pdfScript)
  }

  return (
    <div style={{ background:'#fff', border:'0.5px solid #E8ECF0', borderRadius:12, padding:16,  marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontWeight: 'bold', fontSize: 15 }}>📊 Reportes de ocupación</div>
        <button onClick={exportarPDF}
          style={{ padding: '7px 14px', borderRadius: 8, background: D, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>
          📄 Exportar PDF
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {[
          { v: 'mes_actual', l: 'Mes actual' },
          { v: 'mes_anterior', l: 'Mes anterior' },
          { v: 'anio_actual', l: 'Este año' },
          { v: 'temporada_alta', l: 'Temporada alta' },
        ].map(op => (
          <button key={op.v} onClick={() => setPeriodo(op.v)}
            style={{ padding: '7px 14px', borderRadius: 20, border: '1px solid ' + (periodo === op.v ? G : '#ddd'), background: periodo === op.v ? G : '#fff', color: periodo === op.v ? '#fff' : '#555', fontSize: 12, cursor: 'pointer', fontWeight: periodo === op.v ? 'bold' : 'normal' }}>
            {op.l}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Reservas', value: totalReservas, color: B },
          { label: 'Días ocupados', value: totalDias + ' días', color: G },
          { label: 'Estadía promedio', value: promDias + ' días', color: W },
          { label: 'Comisión ARS', value: '$' + Number(totalComARS).toLocaleString('es-AR'), color: G },
        ].map((k, i) => (
          <div key={i} style={{ background: '#fff', border: '0.5px solid #E8ECF0', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {totalComUSD > 0 && (
        <div style={{ background: '#EBF3FF', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
          <span style={{ color: B, fontWeight: 'bold' }}>Comisión USD: </span>
          <span style={{ fontWeight: 'bold' }}>USD {Number(totalComUSD).toLocaleString('es-AR')}</span>
          <span style={{ color: '#888', marginLeft: 16 }}>
            Total USD: {Number(totalBrutoUSD).toLocaleString('es-AR')} · Total ARS: ${Number(totalBrutoARS).toLocaleString('es-AR')}
          </span>
        </div>
      )}

      {/* Selectores de vista */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { v: 'ocupacion', l: '🏠 Por propiedad' },
          { v: 'top10', l: '🏆 Top 10 ingresos' },
          { v: 'origen', l: '📍 Origen huéspedes' },
          { v: 'mensual', l: '📅 Evolución mensual' },
        ].map(op => (
          <button key={op.v} onClick={() => setVista(op.v)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (vista === op.v ? B : '#ddd'), background: vista === op.v ? B : '#fff', color: vista === op.v ? '#fff' : '#555', fontSize: 12, cursor: 'pointer' }}>
            {op.l}
          </button>
        ))}
      </div>

      {/* Vista: Ocupación por propiedad (barras) */}
      {vista === 'ocupacion' && (
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 12 }}>Días ocupados por propiedad</div>
          {ocupPorProp.slice(0, 20).map((p, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                <span style={{ fontWeight: 'bold' }}>{p.nombre}</span>
                <span style={{ color: '#888' }}>{p.reservas} reservas · {p.dias} días</span>
              </div>
              <div style={{ background: '#F2F4F6', borderRadius: 20, height: 10, overflow: 'hidden' }}>
                <div style={{ background: p.dias === 0 ? '#ddd' : G, width: (p.dias / maxDias * 100) + '%', height: '100%', borderRadius: 20, transition: 'width 0.3s' }} />
              </div>
            </div>
          ))}
          {ocupPorProp.filter(p => p.dias === 0).length > 0 && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#FCEAEA', borderRadius: 8, fontSize: 12, color: D }}>
              ⚠️ {ocupPorProp.filter(p => p.dias === 0).length} propiedad(es) sin reservas en este período
            </div>
          )}
        </div>
      )}

      {/* Vista: Top 10 */}
      {vista === 'top10' && (
        <Tabla
          cols={['#', 'Propiedad', 'Localidad', 'Reservas', 'Días', 'Ingreso ARS', 'Ingreso USD']}
          filas={top10.map((p, i) => [
            <span style={{ fontWeight: 'bold', color: i < 3 ? W : '#888' }}>{i + 1}</span>,
            p.nombre,
            p.localidad || '—',
            p.reservas,
            p.dias + ' días',
            p.ingresoARS > 0 ? '$' + Number(p.ingresoARS).toLocaleString('es-AR') : '—',
            p.ingresoUSD > 0 ? 'USD ' + Number(p.ingresoUSD).toLocaleString('es-AR') : '—',
          ])}
        />
      )}

      {/* Vista: Origen */}
      {vista === 'origen' && (
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 12 }}>Ciudades de origen de huéspedes</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {topCiudades.map(([ciudad, count], i) => (
              <div key={i} style={{ background: '#fff', border: '0.5px solid #ddd', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: B }}>{count}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{ciudad}</div>
                <div style={{ fontSize: 11, color: '#aaa' }}>{Math.round(count / totalReservas * 100)}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vista: Mensual */}
      {vista === 'mensual' && (
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 12 }}>Evolución mensual</div>
          {mesesData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#bbb' }}>Sin datos en el período</div>
          ) : (
            <Tabla
              cols={['Mes', 'Reservas', 'Días', 'Ingreso ARS', 'Ingreso USD']}
              filas={mesesData.map(([mes, d]) => [
                mes,
                d.reservas,
                d.dias + ' días',
                d.ars > 0 ? '$' + Number(d.ars).toLocaleString('es-AR') : '—',
                d.usd > 0 ? 'USD ' + Number(d.usd).toLocaleString('es-AR') : '—',
              ])}
            />
          )}
        </div>
      )}

      {rs.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#bbb', fontSize: 14 }}>
          Sin reservas en el período seleccionado
        </div>
      )}
    </div>
  )
}

function ConfigMercadoPago({ session }) {
  const [mpToken, setMpToken] = useState('')
  const [mpPublicKey, setMpPublicKey] = useState('')
  const [mpModo, setMpModo] = useState('sandbox')
  const [estado, setEstado] = useState(null) // null | {configurado, email, modo}
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState(null)
  const [mostrar, setMostrar] = useState(false)

  const EF = 'https://payzqbkydmvovjxlznuq.supabase.co/functions/v1/mercadopago-preference'

  async function llamar(accion, body = {}) {
    const { data: { session: s } } = await supabase.auth.getSession()
    const r = await fetch(EF, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s?.access_token}` },
      body: JSON.stringify({ accion, ...body })
    })
    return r.json()
  }

  useEffect(() => {
    llamar('verificar_config').then(d => {
      if (d.configurado) setEstado(d)
    })
  }, [])

  async function guardarConfig() {
    setGuardando(true); setMsg(null)
    const d = await llamar('guardar_config', { mp_access_token: mpToken, mp_public_key: mpPublicKey, mp_modo: mpModo })
    if (d.ok) {
      setMsg({ ok: true, text: d.mensaje })
      setEstado({ configurado: true, email: d.email, modo: mpModo })
      setMpToken(''); setMostrar(false)
    } else {
      setMsg({ ok: false, text: d.error })
    }
    setGuardando(false)
  }

  async function desconectar() {
    if (!confirm('¿Desconectar MercadoPago? Los links de pago existentes dejarán de funcionar.')) return
    const d = await llamar('desconectar')
    if (d.ok) { setEstado(null); setMsg({ ok: true, text: '✓ MercadoPago desconectado' }) }
  }

  return (
    <div style={{ marginTop: 24, borderTop: '1px solid #eee', paddingTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 14, color: '#009EE3' }}>💳 MercadoPago</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Permite cobrar señas online directamente a tu cuenta</div>
        </div>
        {estado?.configurado && (
          <span style={{ background: '#E8F5EE', color: G, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 'bold' }}>
            ✓ Conectado
          </span>
        )}
      </div>

      {msg && (
        <div style={{ background: msg.ok ? '#E8F5EE' : '#FCEAEA', border: '0.5px solid ' + (msg.ok ? '#9DDCB4' : '#F09595'), borderRadius: 8, padding: '8px 12px', fontSize: 13, color: msg.ok ? G : D, marginBottom: 12 }}>
          {msg.text}
        </div>
      )}

      {estado?.configurado ? (
        <div style={{ background: '#F0FBF4', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 13, marginBottom: 8 }}>
            <span style={{ color: '#888' }}>Cuenta: </span><strong>{estado.email || 'Verificada'}</strong>
          </div>
          <div style={{ fontSize: 13, marginBottom: 12 }}>
            <span style={{ color: '#888' }}>Modo: </span>
            <span style={{ fontWeight: 'bold', color: estado.modo === 'produccion' ? G : W }}>
              {estado.modo === 'produccion' ? '✅ Producción' : '🧪 Sandbox (pruebas)'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setMostrar(!mostrar)}
              style={{ padding: '7px 14px', borderRadius: 8, background: '#fff', border: '1px solid #ddd', cursor: 'pointer', fontSize: 12 }}>
              {mostrar ? '▲ Ocultar' : '✏️ Cambiar credenciales'}
            </button>
            <button onClick={desconectar}
              style={{ padding: '7px 14px', borderRadius: 8, background: '#FCEAEA', color: D, border: '1px solid #F09595', cursor: 'pointer', fontSize: 12 }}>
              Desconectar
            </button>
          </div>
        </div>
      ) : (
        <div style={{ background: '#FEF3E2', border: '0.5px solid #E8A951', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>
            Sin MercadoPago configurado. Los huéspedes no podrán pagar señas online.
          </div>
          <button onClick={() => setMostrar(!mostrar)}
            style={{ padding: '8px 16px', borderRadius: 8, background: '#009EE3', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}>
            + Conectar MercadoPago
          </button>
        </div>
      )}

      {mostrar && (
        <div style={{ background: '#F8F9FA', border: '1px solid #ddd', borderRadius: 10, padding: 16, marginTop: 12 }}>
          <div style={{ fontSize: 13, color: '#555', marginBottom: 12, lineHeight: 1.5 }}>
            <strong>Cómo obtener tu Access Token:</strong><br />
            1. Ir a <a href="https://www.mercadopago.com.ar/developers/panel" target="_blank" rel="noreferrer" style={{ color: '#009EE3' }}>mercadopago.com.ar/developers/panel</a><br />
            2. Aplicación → Credenciales de producción<br />
            3. Copiar el <strong>Access Token</strong> (empieza con APP_USR-)
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Access Token (privado — nunca compartir)</div>
            <input
              type="password"
              value={mpToken}
              onChange={e => setMpToken(e.target.value)}
              placeholder="APP_USR-XXXXXXXXXXXXXXXX"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, fontFamily: 'monospace' }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>Modo</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { v: 'sandbox', l: '🧪 Sandbox (pruebas)', desc: 'Para testear sin dinero real' },
                { v: 'produccion', l: '✅ Producción', desc: 'Pagos reales' },
              ].map(op => (
                <button key={op.v} onClick={() => setMpModo(op.v)}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid ' + (mpModo === op.v ? '#009EE3' : '#ddd'), background: mpModo === op.v ? '#EBF8FF' : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: mpModo === op.v ? 'bold' : 'normal', color: mpModo === op.v ? '#009EE3' : '#555', textAlign: 'left' }}>
                  <div>{op.l}</div>
                  <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{op.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <button onClick={guardarConfig} disabled={guardando || !mpToken}
            style={{ width: '100%', padding: '10px', borderRadius: 8, background: mpToken ? '#009EE3' : '#ccc', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: 14, cursor: mpToken ? 'pointer' : 'not-allowed' }}>
            {guardando ? '⏳ Verificando y guardando...' : '💳 Conectar MercadoPago'}
          </button>
        </div>
      )}
    </div>
  )
}

function InstruccionesPropiedad({ propiedadId, adminId }) {
  const [form, setForm] = useState({
    codigo_acceso: '', instrucciones: '', wifi_nombre: '', wifi_clave: '',
    lat: '', lng: '', direccion_maps: '', reglamento: '', contacto_urgencias: ''
  })
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    if (!propiedadId) return
    supabase.from('instrucciones_propiedad')
      .select('*').eq('admin_id', adminId).eq('propiedad_id', propiedadId).maybeSingle()
      .then(({ data }) => { if (data) setForm(f => ({ ...f, ...data })) })
  }, [propiedadId])

  async function guardar() {
    setGuardando(true)
    try {
      await supabase.from('instrucciones_propiedad').upsert({
        admin_id: adminId, propiedad_id: propiedadId,
        ...form, updated_at: new Date().toISOString()
      }, { onConflict: 'admin_id,propiedad_id' })
      setMsg({ ok: true, text: '✓ Instrucciones guardadas' })
    } catch(e) { setMsg({ ok: false, text: 'Error: ' + e.message }) }
    setGuardando(false)
  }

  return (
    <div style={{ marginTop: 16, background: '#F0FBF4', borderRadius: 10, padding: 16 }}>
      <div style={{ fontWeight: 'bold', fontSize: 13, color: G, marginBottom: 12 }}>🔑 Instrucciones de acceso para huéspedes</div>
      {msg && <div style={{ background: msg.ok ? '#E8F5EE' : '#FCEAEA', borderRadius: 6, padding: '6px 12px', fontSize: 12, marginBottom: 10, color: msg.ok ? G : D }}>{msg.text}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        {[
          { label: 'Código de acceso', key: 'codigo_acceso', placeholder: 'Ej: 1234#' },
          { label: 'Contacto urgencias', key: 'contacto_urgencias', placeholder: 'Ej: 2254-555555' },
          { label: 'WiFi nombre', key: 'wifi_nombre', placeholder: 'Ej: Casa_Gaviotas' },
          { label: 'WiFi clave', key: 'wifi_clave', placeholder: 'Ej: playa2024!' },
          { label: 'Latitud (opcional)', key: 'lat', placeholder: 'Ej: -37.1234' },
          { label: 'Longitud (opcional)', key: 'lng', placeholder: 'Ej: -56.8765' },
        ].map(f => (
          <div key={f.key}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>{f.label}</div>
            <input value={form[f.key] || ''} onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
              placeholder={f.placeholder}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: 7, fontSize: 13 }} />
          </div>
        ))}
      </div>
      {[
        { label: 'Dirección / Cómo llegar', key: 'direccion_maps' },
        { label: 'Instrucciones de acceso', key: 'instrucciones' },
        { label: 'Reglamento de uso', key: 'reglamento' },
      ].map(f => (
        <div key={f.key} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>{f.label}</div>
          <textarea value={form[f.key] || ''} onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
            rows={3} style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: 7, fontSize: 13, resize: 'vertical' }} />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button onClick={guardar} disabled={guardando}
          style={{ padding: '8px 18px', borderRadius: 8, background: G, color: '#fff', border: 'none', fontWeight: 'bold', fontSize: 13, cursor: 'pointer' }}>
          {guardando ? '⏳...' : '💾 Guardar instrucciones'}
        </button>
        <a href={'/checkin?id=' + propiedadId} target="_blank" rel="noreferrer"
          style={{ padding: '8px 14px', borderRadius: 8, background: B, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 'bold' }}>
          👁 Ver portal huésped
        </a>
      </div>
    </div>
  )
}

function LiquidacionesTemp({ reservas: reservasIniciales, propiedades, propietarios, gastos = [], perfil = {}, cajaMov = [], onRefresh }) {
  const [reservasLocal, setReservasLocal] = useState(reservasIniciales)

  // Sincronizar cuando el App recarga los datos
  useEffect(() => { setReservasLocal(reservasIniciales) }, [reservasIniciales])
  const [propSelec, setPropSelec] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [modalPago, setModalPago] = useState(false)
  const [fechaTransf, setFechaTransf] = useState(new Date().toISOString().split('T')[0])
  const [obsTransf, setObsTransf] = useState('')
  const [msgPago, setMsgPago] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const prop = propietarios.find(p => p.id === propSelec)
  const propsDelOwner = propiedades.filter(p => p.propietario_id === propSelec)

  const reservasFiltradas = reservasLocal.filter(r => {
    if (!propsDelOwner.find(p => p.id === r.propiedad_id)) return false
    if (r.estado === 'Cancelada') return false
    if (fechaDesde && r.fecha_salida < fechaDesde) return false
    if (fechaHasta && r.fecha_entrada > fechaHasta) return false
    return true
  })

  // Gastos del propietario (de sus propiedades)
  const propIds = propsDelOwner.map(p => p.id)
  const gastosProp = gastos.filter(g => propIds.includes(g.propiedad_id))
  const totalGastosARS = gastosProp.filter(g => g.moneda !== 'USD').reduce((s, g) => s + Number(g.monto||0), 0)
  const totalGastosUSD = gastosProp.filter(g => g.moneda === 'USD').reduce((s, g) => s + Number(g.monto||0), 0)

  // Movimientos con campo liquidado
  const movimientos = reservasFiltradas.map(r => ({
    id: r.id,
    periodo: r.fecha_entrada + ' → ' + r.fecha_salida,
    fecha: r.fecha_salida,
    propiedad: propsDelOwner.find(p => p.id === r.propiedad_id)?.nombre || r.propiedad_id,
    huesped: r.huesped_nombre,
    dias: r.dias,
    moneda: r.moneda,
    bruto: Number(r.monto_total || 0),
    comision: Number(r.comision || 0),
    neto: Number(r.neto_propietario || 0),
    liquidado: !!r.liquidacion_enviada,
  }))

  // Separar pendientes y liquidados
  const movsPendientes = movimientos.filter(m => !m.liquidado)
  const movsLiquidados = movimientos.filter(m => m.liquidado)

  const pendNetoARS = movsPendientes.filter(m => m.moneda === 'ARS').reduce((s, m) => s + m.neto, 0)
  const pendNetoUSD = movsPendientes.filter(m => m.moneda === 'USD').reduce((s, m) => s + m.neto, 0)
  const totalLiqARS = movsLiquidados.filter(m => m.moneda === 'ARS').reduce((s, m) => s + m.neto, 0)
  const totalLiqUSD = movsLiquidados.filter(m => m.moneda === 'USD').reduce((s, m) => s + m.neto, 0)

  // Totales globales
  const totalBrutoARS = movimientos.filter(m => m.moneda === 'ARS').reduce((s, m) => s + m.bruto, 0)
  const totalBrutoUSD = movimientos.filter(m => m.moneda === 'USD').reduce((s, m) => s + m.bruto, 0)
  const totalComARS = movimientos.filter(m => m.moneda === 'ARS').reduce((s, m) => s + m.comision, 0)
  const totalComUSD = movimientos.filter(m => m.moneda === 'USD').reduce((s, m) => s + m.comision, 0)
  const totalNetoARS = totalBrutoARS - totalComARS - totalGastosARS
  const totalNetoUSD = totalBrutoUSD - totalComUSD - totalGastosUSD

  async function registrarPagoAPropietario() {
    setGuardando(true)
    try {
      const ids = movsPendientes.map(m => m.id).filter(Boolean)
      if (ids.length > 0) {
        await supabase.from('reservas_temp').update({ liquidacion_enviada: true }).in('id', ids)
      }
      // Recargar reservas del propietario para reflejar cambio en UI
      if (propIds.length > 0) {
        const { data: resAct } = await supabase
          .from('reservas_temp')
          .select('*')
          .in('propiedad_id', propIds)
        if (resAct) setReservasLocal(prev => {
          const otros = prev.filter(r => !propIds.includes(r.propiedad_id))
          return [...otros, ...resAct]
        })
      }
      setMsgPago({ ok: true, text: '✓ Pago registrado. ' + ids.length + ' reserva' + (ids.length !== 1 ? 's' : '') + ' marcada' + (ids.length !== 1 ? 's' : '') + ' como liquidada' + (ids.length !== 1 ? 's' : '') + '.' })
      setModalPago(false)
      setObsTransf('')
    } catch(e) {
      setMsgPago({ ok: false, text: 'Error: ' + e.message })
    }
    setGuardando(false)
  }

  function generarPDFLiquidacion() {
    if (!prop) return
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    script.onload = () => {
      const { jsPDF } = window.jspdf
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const W = 210, mar = 14, hoy = new Date().toLocaleDateString('es-AR')
      doc.setFillColor(26,63,160); doc.rect(0,0,W,38,'F')
      doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(16)
      doc.text('LIQUIDACIÓN AL PROPIETARIO', mar, 18)
      doc.setFontSize(10); doc.setFont('helvetica','normal')
      doc.text((perfil.nombre_administracion || 'Administración'), mar, 26)
      doc.text('Fecha: ' + hoy, W - mar, 26, { align: 'right' })
      doc.setTextColor(0,0,0)
      let y = 48
      doc.setFont('helvetica','bold'); doc.setFontSize(13)
      doc.text('Propietario: ' + prop.apellido_nombre, mar, y); y += 8
      doc.setFont('helvetica','normal'); doc.setFontSize(10)
      if (prop.email) { doc.text('Email: ' + prop.email, mar, y); y += 6 }
      if (prop.cbu) { doc.text('CBU: ' + prop.cbu + (prop.banco ? ' (' + prop.banco + ')' : ''), mar, y); y += 6 }
      y += 4
      // Tabla reservas
      doc.setFont('helvetica','bold'); doc.setFontSize(10)
      doc.setFillColor(240,245,255); doc.rect(mar, y-4, W-2*mar, 8, 'F')
      const cols = ['Reserva','Propiedad','Huésped','Entrada','Salida','Moneda','Total','Comisión','Neto']
      const widths = [18, 22, 36, 22, 22, 16, 20, 20, 20]
      let x = mar
      cols.forEach((c,i) => { doc.text(c, x+1, y+1); x += widths[i] }); y += 10
      doc.setFont('helvetica','normal')
      movimientos.forEach(m => {
        if (y > 270) { doc.addPage(); y = 20 }
        x = mar
        const row = [m.id, m.propiedad, m.huesped,
          m.periodo.split(' → ')[0], m.fecha,
          m.moneda, fmtM(m.bruto,m.moneda), fmtM(m.comision,m.moneda), fmtM(m.neto,m.moneda)]
        if (m.liquidado) { doc.setTextColor(150,150,150) }
        row.forEach((v,i) => { doc.text(String(v||''), x+1, y); x += widths[i] })
        doc.setTextColor(0,0,0)
        y += 7
      })
      y += 6
      doc.setDrawColor(200,200,200); doc.line(mar, y, W-mar, y); y += 8
      doc.setFont('helvetica','bold')
      if (totalBrutoARS > 0) {
        doc.text('Total cobrado ARS: ' + fmt(totalBrutoARS), mar, y)
        doc.text('Comisión ARS: - ' + fmt(totalComARS), mar+80, y)
        if (totalGastosARS > 0) doc.text('Gastos: - ' + fmt(totalGastosARS), mar+140, y)
        y += 7
        doc.setTextColor(27,107,53)
        doc.text('NETO ARS: ' + fmt(totalNetoARS), mar, y)
        doc.setTextColor(0,0,0); y += 7
      }
      if (totalBrutoUSD > 0) {
        doc.text('Total cobrado USD: ' + fmtUSD(totalBrutoUSD), mar, y)
        doc.text('Comisión USD: - ' + fmtUSD(totalComUSD), mar+80, y); y += 7
        doc.setTextColor(27,107,53)
        doc.text('NETO USD: ' + fmtUSD(totalNetoUSD), mar, y)
        doc.setTextColor(0,0,0); y += 7
      }
      doc.save('liquidacion_' + prop.apellido_nombre.replace(/[^a-zA-Z0-9]/g,'_') + '_' + hoy.replace(/\//g,'-') + '.pdf')
    }
    document.head.appendChild(script)
  }

  const portalUrl = typeof window !== 'undefined'
    ? window.location.origin + '/propietario-temp?id=' + propSelec
    : ''

  return (
    <>
      <div style={{ background:'#fff', border:'0.5px solid #E8ECF0', borderRadius:12, padding:16,  marginBottom: 16 }}>
        <div style={{ fontWeight: 'bold', fontSize: 15, marginBottom: 14 }}>Liquidación por propietario</div>

        {/* Selector propietario + filtros */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <select value={propSelec} onChange={e => { setPropSelec(e.target.value); setMsgPago(null) }} style={{ padding: '7px 10px', border: '1px solid #ddd', borderRadius: 7, fontSize: 13, minWidth: 200 }}>
            <option value="">Seleccionar propietario...</option>
            {propietarios.map(p => <option key={p.id} value={p.id}>{p.apellido_nombre}</option>)}
          </select>
          <span style={{ fontSize: 12, color: '#888' }}>Desde:</span>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 7, fontSize: 13 }} />
          <span style={{ fontSize: 12, color: '#888' }}>Hasta:</span>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 7, fontSize: 13 }} />
          {(fechaDesde || fechaHasta) && (
            <button onClick={() => { setFechaDesde(''); setFechaHasta('') }} style={{ padding: '6px 12px', borderRadius: 7, background: '#F3F4F6', border: '1px solid #ddd', cursor: 'pointer', fontSize: 12 }}>✕ Limpiar</button>
          )}
        </div>

        {propSelec && prop && (
          <>
            {/* Link portal propietario */}
            <button onClick={() => { navigator.clipboard.writeText(portalUrl).then(() => alert('Link copiado:\n' + portalUrl)) }} style={{ width: '100%', padding: '10px 16px', borderRadius: 8, background: B, color: '#fff', border: 'none', fontWeight: 'bold', fontSize: 13, cursor: 'pointer', marginBottom: 14, textAlign: 'left' }}>
              🔗 Copiar link portal propietario
            </button>

            {/* Datos propietario */}
            <div style={{ background: '#F8F9FA', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 13 }}>
              <div><span style={{ color: '#888' }}>Propietario: </span><strong>{prop.apellido_nombre}</strong></div>
              <div><span style={{ color: '#888' }}>Email: </span>{prop.email || '—'}</div>
              <div><span style={{ color: '#888' }}>CBU: </span><span style={{ fontFamily: 'monospace' }}>{prop.cbu || '—'}</span></div>
              <div><span style={{ color: '#888' }}>Banco: </span>{prop.banco || '—'}</div>
            </div>

            {/* Tarjetas resumen */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
              {[
                ['Total cobrado ARS', fmt(totalBrutoARS), '#fff', '#1A1A1A'],
                ['Comisión ARS', fmt(totalComARS), '#FFF5E6', W],
                ['Gastos propietario ARS', fmt(totalGastosARS), '#FCEAEA', D],
                ['Total cobrado USD', fmtUSD(totalBrutoUSD), '#fff', '#1A1A1A'],
                ['Comisión USD', fmtUSD(totalComUSD), '#FFF5E6', W],
                ['Gastos propietario USD', fmtUSD(totalGastosUSD), '#FCEAEA', D],
              ].map(([label, val, bg, color], i) => (
                <div key={i} style={{ background: bg, borderRadius: 8, padding: 12, border: '0.5px solid #E8ECF0' }}>
                  <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 15, fontWeight: 'bold', color: color }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Tarjeta NETO A TRANSFERIR */}
            {(totalNetoARS > 0 || totalNetoUSD > 0) && (
              <div style={{ background: '#F0FBF4', border: '1px solid #9DDCB4', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: G, fontWeight: 'bold', marginBottom: 6, letterSpacing: 1 }}>NETO A TRANSFERIR{totalNetoARS > 0 && totalNetoUSD > 0 ? '' : totalNetoARS > 0 ? ' ARS' : ' USD'}</div>
                {totalNetoARS > 0 && <div style={{ fontSize: 28, fontWeight: 'bold', color: G, marginBottom: 2 }}>{fmt(totalNetoARS)}</div>}
                {totalNetoUSD > 0 && <div style={{ fontSize: 28, fontWeight: 'bold', color: B, marginBottom: 2 }}>{fmtUSD(totalNetoUSD)}</div>}
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                  {totalNetoARS > 0 && <span>{fmt(totalBrutoARS)} − {fmt(totalComARS)} com. − {fmt(totalGastosARS)} gs.</span>}
                </div>
              </div>
            )}

            {/* Tabla reservas */}
            <Tabla
              cols={['Reserva','Propiedad','Huésped','Entrada','Salida','Días','Mon.','Total','Comisión','Neto']}
              filas={movimientos.map(m => [
                <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{m.id}</span>,
                m.propiedad,
                m.huesped,
                formatFecha(m.periodo.split(' → ')[0]),
                formatFecha(m.fecha),
                m.dias + 'd',
                <Pill text={m.moneda} color={m.moneda === 'USD' ? 'blue' : 'gray'} />,
                fmtM(m.bruto, m.moneda),
                <span style={{ color: W }}>- {fmtM(m.comision, m.moneda)}</span>,
                <span style={{ fontWeight: 'bold', color: m.liquidado ? '#aaa' : G }}>
                  {fmtM(m.neto, m.moneda)}
                  {m.liquidado && <span style={{ fontSize: 10, color: '#aaa', marginLeft: 5, fontWeight: 'normal' }}>✓ Liq.</span>}
                </span>,
              ])}
            />

            {/* Sección movimientos liquidados */}
            {movsLiquidados.length > 0 && (
              <div style={{ background: '#fff', border: '0.5px solid #9DDCB4', borderRadius: 10, padding: 16, marginTop: 12 }}>
                <div style={{ fontWeight: 'bold', fontSize: 13, color: G, marginBottom: 10 }}>✅ Reservas ya liquidadas al propietario</div>
                {movsLiquidados.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < movsLiquidados.length - 1 ? '0.5px solid #eee' : 'none', fontSize: 13 }}>
                    <div>
                      <span style={{ fontWeight: 'bold', color: '#555' }}>{formatFecha(m.periodo.split(' → ')[0])}</span>
                      <span style={{ color: '#888', margin: '0 6px' }}>→</span>
                      <span style={{ color: '#555' }}>{formatFecha(m.fecha)}</span>
                      <span style={{ color: '#aaa', marginLeft: 8, fontSize: 11 }}>{m.propiedad}</span>
                      <span style={{ color: '#aaa', marginLeft: 6, fontSize: 11 }}>{m.huesped}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 'bold', color: '#888' }}>{fmtM(m.neto, m.moneda)}</span>
                      <button onClick={async () => {
                        if (!confirm('¿Anular la liquidación de ' + m.huesped + '? La reserva volverá a pendiente.')) return
                        try {
                          await supabase.from('reservas_temp').update({ liquidacion_enviada: false }).eq('id', m.id)
                          // Recargar reservas del propietario
                          if (propIds.length > 0) {
                            const { data: resAct2 } = await supabase.from('reservas_temp').select('*').in('propiedad_id', propIds)
                            if (resAct2) setReservasLocal(prev => {
                              const otros2 = prev.filter(r => !propIds.includes(r.propiedad_id))
                              return [...otros2, ...resAct2]
                            })
                          }
                          setMsgPago({ ok: true, text: '✓ Liquidación anulada. Volvió a pendiente.' })
                        } catch(e) {
                          setMsgPago({ ok: false, text: 'Error: ' + e.message })
                        }
                      }} style={{ padding: '3px 10px', borderRadius: 5, background: '#FCEAEA', color: '#B83030', border: '1px solid #F09595', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
                        ✕ Anular
                      </button>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #9DDCB4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: G, fontSize: 13 }}>TOTAL LIQUIDADO</span>
                  <span style={{ fontWeight: 'bold', color: G }}>
                    {[totalLiqARS > 0.01 ? fmt(totalLiqARS) : '', totalLiqUSD > 0.01 ? fmtUSD(totalLiqUSD) : ''].filter(Boolean).join(' + ')}
                  </span>
                </div>
                {pendNetoARS <= 0.01 && pendNetoUSD <= 0.01 ? (
                  <div style={{ marginTop: 8, background: '#E8F5EE', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: G, fontWeight: 'bold' }}>
                    ✅ Liquidación completa — Sin saldo pendiente
                  </div>
                ) : (
                  <div style={{ marginTop: 8, background: '#FEF3E2', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
                    <span style={{ color: W, fontWeight: 'bold' }}>⏳ Saldo pendiente: </span>
                    {pendNetoARS > 0.01 && <span style={{ color: D, fontWeight: 'bold', marginRight: 12 }}>{fmt(pendNetoARS)}</span>}
                    {pendNetoUSD > 0.01 && <span style={{ color: D, fontWeight: 'bold' }}>{fmtUSD(pendNetoUSD)}</span>}
                  </div>
                )}
              </div>
            )}

            {/* Mensajes + botones */}
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              {msgPago && (
                <div style={{ background: msgPago.ok ? '#E8F5EE' : '#FCEAEA', border: '0.5px solid ' + (msgPago.ok ? '#9DDCB4' : '#F09595'), borderRadius: 6, padding: '8px 14px', fontSize: 13, color: msgPago.ok ? G : D }}>
                  {msgPago.ok ? '✓ ' : '✗ '}{msgPago.text}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
                <button onClick={generarPDFLiquidacion} style={{ padding: '10px 16px', borderRadius: 8, background: B, color: '#fff', border: 'none', fontWeight: 'bold', fontSize: 13, cursor: 'pointer' }}>
                  📄 Generar PDF
                </button>
                {(pendNetoARS > 0.01 || pendNetoUSD > 0.01) && !modalPago && (
                  <button onClick={() => setModalPago(true)} style={{ padding: '10px 20px', borderRadius: 8, background: G, color: '#fff', border: 'none', fontWeight: 'bold', fontSize: 14, cursor: 'pointer' }}>
                    💸 Registrar pago
                  </button>
                )}
              </div>
            </div>

            {/* Modal confirmación pago */}
            {modalPago && (
              <div style={{ marginTop: 12, background: '#F0FBF4', border: '1px solid #9DDCB4', borderRadius: 10, padding: 18 }}>
                <div style={{ fontWeight: 'bold', fontSize: 14, color: G, marginBottom: 12 }}>💸 Confirmar pago al propietario</div>
                <div style={{ fontSize: 13, marginBottom: 12 }}>
                  Se marcarán <strong>{movsPendientes.length}</strong> reserva{movsPendientes.length !== 1 ? 's' : ''} como <strong>liquidadas</strong> por el neto pendiente:
                  {pendNetoARS > 0.01 && <span style={{ color: G, fontWeight: 'bold' }}> {fmt(pendNetoARS)} ARS</span>}
                  {pendNetoUSD > 0.01 && <span style={{ color: B, fontWeight: 'bold' }}> + {fmtUSD(pendNetoUSD)}</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Fecha de transferencia</div>
                    <input type="date" value={fechaTransf} onChange={e => setFechaTransf(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 7, fontSize: 13 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Observaciones (opcional)</div>
                    <input type="text" value={obsTransf} onChange={e => setObsTransf(e.target.value)} placeholder="Nro. transferencia..." style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 7, fontSize: 13 }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={registrarPagoAPropietario} disabled={guardando} style={{ padding: '10px 20px', borderRadius: 8, background: G, color: '#fff', border: 'none', fontWeight: 'bold', fontSize: 13, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1 }}>
                    {guardando ? '⏳ Registrando...' : '✓ Confirmar pago'}
                  </button>
                  <button onClick={() => setModalPago(false)} style={{ padding: '10px 18px', borderRadius: 8, background: '#F3F4F6', border: '1px solid #ddd', fontSize: 13, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {!propSelec && (
          <div style={{ textAlign: 'center', padding: 40, color: '#bbb', fontSize: 14 }}>
            Seleccioná un propietario para ver su liquidación
          </div>
        )}
      </div>
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

function Checklist({ reservas = [], onRefresh }) {
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
      <div style={{ background:'#fff', border:'0.5px solid #E8ECF0', borderRadius:12, padding:16,  marginBottom: 16 }}>
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
      </div>
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
        <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
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
        </div>
      )}

      {tab === 'propietario' && (
        <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
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
        </div>
      )}
    </>
  )
}


// ─── MÓDULO COBRANZAS ────────────────────────────────────
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

      <div style={{ background:'#fff', border:'0.5px solid #E8ECF0', borderRadius:12, padding:16,  marginBottom: 16 }}>
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
      </div>

      <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
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
      </div>
    </>
  )
}

// ─── MÓDULO DASHBOARD ────────────────────────────────────
function DashboardTemp({ reservas = [], propiedades = [], propietarios = [], gastos = [] }) {
  const hoy = new Date().toISOString().split('T')[0]
  const en7  = new Date(Date.now() + 7*86400000).toISOString().split('T')[0]
  const en30 = new Date(Date.now() + 30*86400000).toISOString().split('T')[0]
  const hace30 = new Date(Date.now() - 30*86400000).toISOString().split('T')[0]
  const hace7  = new Date(Date.now() - 7*86400000).toISOString().split('T')[0]

  // ── KPIs operativos ─────────────────────────────────────────
  const hoyOcupadas   = propiedades.filter(p => reservas.some(r => r.propiedad_id===p.id && r.estado!=='Cancelada' && r.fecha_entrada<=hoy && r.fecha_salida>hoy)).length
  const checkinsHoy   = reservas.filter(r => r.fecha_entrada===hoy && r.estado!=='Cancelada').length
  const checkoutsHoy  = reservas.filter(r => r.fecha_salida===hoy && r.estado!=='Cancelada').length
  const proximas7     = reservas.filter(r => r.fecha_entrada>hoy && r.fecha_entrada<=en7 && r.estado!=='Cancelada').length
  const pendientesSeña= reservas.filter(r => r.estado==='Pendiente' || r.estado==='Señada').length
  const sinCheckin    = reservas.filter(r => r.fecha_entrada<=hoy && r.fecha_salida>hoy && !r.checkin_completado && r.estado!=='Cancelada').length
  const tasaOcup      = propiedades.length>0 ? Math.round(hoyOcupadas/propiedades.length*100) : 0
  const propLibres    = propiedades.length - hoyOcupadas

  // ── Ingresos ─────────────────────────────────────────────────
  const rs30 = reservas.filter(r => r.fecha_salida>=hace30 && r.fecha_salida<=hoy && r.estado!=='Cancelada')
  const ingresosARS  = rs30.filter(r=>r.moneda==='ARS').reduce((s,r)=>s+Number(r.monto_total||0),0)
  const ingresosUSD  = rs30.filter(r=>r.moneda==='USD').reduce((s,r)=>s+Number(r.monto_total||0),0)
  const comisionARS  = rs30.filter(r=>r.moneda==='ARS').reduce((s,r)=>s+Number(r.comision||0),0)
  const comisionUSD  = rs30.filter(r=>r.moneda==='USD').reduce((s,r)=>s+Number(r.comision||0),0)

  // ── Semana anterior vs actual ─────────────────────────────────
  const rsSemAnt = reservas.filter(r=>r.fecha_entrada>=hace7 && r.fecha_entrada<hoy && r.estado!=='Cancelada')
  const rsSemAct = reservas.filter(r=>r.fecha_entrada>=hoy && r.fecha_entrada<=en7 && r.estado!=='Cancelada')

  // ── Gráfico ocupación por día (próximos 14 días) ──────────────
  const dias14 = Array.from({length:14}, (_,i) => {
    const d = new Date(Date.now() + i*86400000).toISOString().split('T')[0]
    const ocupadas = propiedades.filter(p => reservas.some(r=>r.propiedad_id===p.id && r.estado!=='Cancelada' && r.fecha_entrada<=d && r.fecha_salida>d)).length
    return { fecha: d, dia: new Date(Date.now()+i*86400000).getDate(), ocupadas, pct: propiedades.length>0 ? Math.round(ocupadas/propiedades.length*100) : 0 }
  })
  const maxOcup = Math.max(...dias14.map(d=>d.ocupadas), 1)

  // ── Últimas reservas ─────────────────────────────────────────
  const proximas = reservas.filter(r=>r.fecha_entrada>=hoy && r.estado!=='Cancelada').sort((a,b)=>a.fecha_entrada.localeCompare(b.fecha_entrada)).slice(0,8)
  const recientes = reservas.filter(r=>r.fecha_entrada<hoy && r.estado!=='Cancelada').sort((a,b)=>b.fecha_entrada.localeCompare(a.fecha_entrada)).slice(0,5)

  const getProp = id => propiedades.find(p=>p.id===id)?.nombre || id
  const COLOR_ESTADO = { Confirmada:G, Señada:W, Pendiente:B, Cancelada:D, Finalizada:'#888' }
  const fmtFecha = s => { if (!s) return '—'; const [y,m,d] = s.split('-'); return `${d}/${m}` }
  const fmtFechaL = s => { if (!s) return '—'; const [y,m,d] = s.split('-'); return `${d}/${m}/${y}` }

  return (
    <>
      {/* ── Alertas del día ───────────────────────────────── */}
      {(checkinsHoy>0 || checkoutsHoy>0 || sinCheckin>0) && (
        <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
          {checkinsHoy>0 && <div style={{flex:1,minWidth:140,background:'#E8F5EE',border:'1px solid #9DDCB4',borderRadius:10,padding:'12px 16px'}}>
            <div style={{fontSize:28,fontWeight:'bold',color:G}}>{checkinsHoy}</div>
            <div style={{fontSize:13,color:G,fontWeight:'bold'}}>Check-in{checkinsHoy>1?'s':''} hoy 🏠</div>
          </div>}
          {checkoutsHoy>0 && <div style={{flex:1,minWidth:140,background:'#FEF3E2',border:'1px solid #E8A951',borderRadius:10,padding:'12px 16px'}}>
            <div style={{fontSize:28,fontWeight:'bold',color:W}}>{checkoutsHoy}</div>
            <div style={{fontSize:13,color:W,fontWeight:'bold'}}>Check-out{checkoutsHoy>1?'s':''} hoy 🚪</div>
          </div>}
          {sinCheckin>0 && <div style={{flex:1,minWidth:140,background:'#FCEAEA',border:'1px solid #F09595',borderRadius:10,padding:'12px 16px'}}>
            <div style={{fontSize:28,fontWeight:'bold',color:D}}>{sinCheckin}</div>
            <div style={{fontSize:13,color:D,fontWeight:'bold'}}>Sin check-in digital ⚠️</div>
          </div>}
        </div>
      )}

      {/* ── KPIs principales ──────────────────────────────── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:14}}>
        {[
          {label:'Ocupadas hoy', value:hoyOcupadas, sub:`de ${propiedades.length} propiedades`, color:G, icon:'🏠'},
          {label:'Tasa ocupación', value:tasaOcup+'%', sub:`${propLibres} disponibles`, color:tasaOcup>70?G:tasaOcup>40?W:D, icon:'📊'},
          {label:'Próx. 7 días', value:proximas7, sub:'reservas confirmadas', color:B, icon:'📅'},
          {label:'Pendientes seña', value:pendientesSeña, sub:'sin confirmar', color:pendientesSeña>0?W:'#888', icon:'💰'},
        ].map((k,i) => (
          <div key={i} style={{background:'#fff',border:'0.5px solid #E8ECF0',borderRadius:10,padding:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div style={{fontSize:11,color:'#888',marginBottom:6}}>{k.label}</div>
              <span style={{fontSize:18}}>{k.icon}</span>
            </div>
            <div style={{fontSize:26,fontWeight:'bold',color:k.color}}>{k.value}</div>
            <div style={{fontSize:11,color:'#aaa',marginTop:4}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Ingresos 30 días ──────────────────────────────── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:14}}>
        {[
          {label:'Ingresos ARS (30d)', value:'$'+Number(ingresosARS).toLocaleString('es-AR'), color:'#1A1A1A'},
          {label:'Comisión ARS (30d)', value:'$'+Number(comisionARS).toLocaleString('es-AR'), color:G},
          {label:'Ingresos USD (30d)', value:'USD '+Number(ingresosUSD).toLocaleString('es-AR'), color:B},
          {label:'Comisión USD (30d)', value:'USD '+Number(comisionUSD).toLocaleString('es-AR'), color:B},
        ].map((k,i) => (
          <div key={i} style={{background:'#fff',border:'0.5px solid #E8ECF0',borderRadius:10,padding:14}}>
            <div style={{fontSize:11,color:'#888',marginBottom:6}}>{k.label}</div>
            <div style={{fontSize:18,fontWeight:'bold',color:k.color}}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── Gráfico: ocupación próximos 14 días ───────────── */}
      <div style={{ background:'#fff', border:'0.5px solid #E8ECF0', borderRadius:12, padding:16, marginBottom:14}}>
        <div style={{fontWeight:'bold',fontSize:14,marginBottom:12}}>📈 Ocupación — próximos 14 días</div>
        <div style={{display:'flex',gap:4,alignItems:'flex-end',height:80}}>
          {dias14.map((d,i) => (
            <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
              <div style={{fontSize:9,color:d.pct>0?G:'#ddd',fontWeight:'bold'}}>{d.pct>0?d.pct+'%':''}</div>
              <div style={{
                width:'100%',
                height: Math.max(4, d.pct*0.6)+'px',
                background: i===0 ? B : d.pct>=80 ? G : d.pct>=50 ? W : d.pct>0 ? '#9DDCB4' : '#E8ECF0',
                borderRadius:'3px 3px 0 0',
                minHeight: 4,
              }} title={`${d.fecha}: ${d.ocupadas}/${propiedades.length} propiedades (${d.pct}%)`} />
              <div style={{fontSize:9,color:i===0?B:'#888',fontWeight:i===0?'bold':'normal'}}>{fmtFecha(d.fecha)}</div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:12,marginTop:10,fontSize:11}}>
          {[[G,'≥80%'],[W,'50-79%'],['#9DDCB4','1-49%'],['#E8ECF0','0%']].map(([c,l])=>(
            <div key={l} style={{display:'flex',alignItems:'center',gap:4}}>
              <div style={{width:10,height:10,background:c,borderRadius:2}}/>
              <span style={{color:'#888'}}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
        {/* ── Próximas reservas ──────────────────────────── */}
        <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
          <div style={{fontWeight:'bold',fontSize:14,marginBottom:12}}>📅 Próximas reservas ({proximas.length})</div>
          {proximas.length===0 ? (
            <div style={{textAlign:'center',padding:20,color:'#bbb',fontSize:13}}>Sin reservas próximas</div>
          ) : proximas.map((r,i) => (
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:i<proximas.length-1?'0.5px solid #f0f0f0':'none'}}>
              <div>
                <div style={{fontSize:13,fontWeight:'bold'}}>{r.huesped_nombre}</div>
                <div style={{fontSize:11,color:'#888'}}>{getProp(r.propiedad_id)} · {fmtFechaL(r.fecha_entrada)}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <span style={{background:(COLOR_ESTADO[r.estado]||'#888')+'20',color:COLOR_ESTADO[r.estado]||'#888',borderRadius:4,padding:'2px 8px',fontSize:11,fontWeight:'bold'}}>{r.estado}</span>
                <div style={{fontSize:11,color:'#888',marginTop:2}}>{r.dias}d</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Estado del sistema ─────────────────────────── */}
        <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
          <div style={{fontWeight:'bold',fontSize:14,marginBottom:12}}>🏠 Estado del sistema</div>
          {/* Barra ocupación */}
          <div style={{marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
              <span style={{color:'#888'}}>Ocupación hoy</span>
              <span style={{fontWeight:'bold',color:G}}>{tasaOcup}%</span>
            </div>
            <div style={{background:'#E8ECF0',borderRadius:20,height:12,overflow:'hidden'}}>
              <div style={{background:tasaOcup>70?G:tasaOcup>40?W:D,width:tasaOcup+'%',height:'100%',borderRadius:20,transition:'width 0.5s'}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#aaa',marginTop:4}}>
              <span>{hoyOcupadas} ocupadas</span><span>{propLibres} libres</span>
            </div>
          </div>
          {/* Stats rápidas */}
          {[
            ['Total propiedades', propiedades.length, '🏠'],
            ['Total propietarios', propietarios.length, '👤'],
            ['Reservas este mes', reservas.filter(r=>r.fecha_entrada?.startsWith(hoy.slice(0,7)) && r.estado!=='Cancelada').length, '📋'],
            ['Semana anterior', rsSemAnt.length+' reservas', '📅'],
            ['Semana próxima', rsSemAct.length+' reservas', '📅'],
          ].map(([label,val,icon],i) => (
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:i<4?'0.5px solid #f0f0f0':'none',fontSize:13}}>
              <span style={{color:'#888'}}>{icon} {label}</span>
              <span style={{fontWeight:'bold'}}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function generarReciboReserva(res, prop, perfil = {}) {
  const fmtN = (n, mon) => mon === 'USD' ? 'USD ' + Number(n||0).toLocaleString('es-AR') : '$' + Number(n||0).toLocaleString('es-AR')
  const script = document.createElement('script')
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
  script.onload = () => {
    cargarLogoBase64(logoB64 => {
    const { jsPDF } = window.jspdf
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const W = 210, margin = 14

    // Header azul
    doc.setFillColor(26, 63, 160)
    doc.rect(0, 0, W, 45, 'F')
    if (logoB64) doc.addImage(logoB64, 'JPEG', margin, 4, 34, 34)
    doc.setTextColor(255,255,255)
    doc.setFont('helvetica','bold'); doc.setFontSize(16)
    doc.text('GASP', margin+38, 16)
    doc.setFont('helvetica','normal'); doc.setFontSize(9)
    doc.text('Gestion de Alquileres Sistema Profesional', margin+38, 23)
    doc.setFontSize(8)
    doc.text((perfil.nombre_completo||'Administrador')+'  |  '+(perfil.titulo||'')+'  |  '+(perfil.matricula||''), margin+38, 30)
    doc.text((perfil.ciudad||'')+(perfil.provincia?', '+perfil.provincia:'')+'  |  '+(perfil.email_contacto||''), margin+38, 36)

    // Titulo
    let y = 57
    doc.setTextColor(26,63,160); doc.setFont('helvetica','bold'); doc.setFontSize(15)
    doc.text('COMPROBANTE DE RESERVA', margin, y)
    doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100)
    doc.text('N° '+(res.id||''), W-margin, y, {align:'right'})
    y += 5
    doc.setDrawColor(26,63,160); doc.setLineWidth(0.5)
    doc.line(margin, y, W-margin, y)
    y += 10

    // Datos reserva
    const datos = [
      ['Huésped:', res.huesped_nombre||'—'],
      ['DNI:', res.huesped_dni||'—'],
      ['Teléfono:', res.huesped_telefono||'—'],
      ['Email:', res.huesped_email||'—'],
      ['Ciudad:', res.huesped_ciudad||'—'],
      ['Propiedad:', (prop?.nombre||res.propiedad_id)+(prop?.localidad?' — '+prop.localidad:'')],
      ['Tipo:', prop?.tipo||'—'],
      ['Capacidad:', prop?.capacidad ? prop.capacidad+' personas' : '—'],
      ['Ingreso:', formatFecha(res.fecha_entrada)],
      ['Egreso:', formatFecha(res.fecha_salida)],
      ['Noches/días:', (res.dias||0)+' días'],
      ['Modalidad:', res.modalidad||'—'],
    ]
    doc.setFontSize(10)
    datos.forEach(([label, val]) => {
      doc.setFont('helvetica','bold'); doc.setTextColor(60,60,60)
      doc.text(label, margin, y)
      doc.setFont('helvetica','normal'); doc.setTextColor(0,0,0)
      doc.text(String(val), margin+42, y)
      y += 7
    })
    y += 4

    // Tabla cobro
    doc.setFillColor(26,63,160); doc.rect(margin, y-4, W-margin*2, 8, 'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(10)
    doc.text('CONCEPTO', margin+2, y)
    doc.text('IMPORTE', W-margin-2, y, {align:'right'})
    y += 8

    const cobros = [
      ['Monto total de la reserva', fmtN(res.monto_total, res.moneda)],
      ['Seña cobrada', fmtN(res.sena, res.moneda)],
      ['Saldo pendiente', fmtN(Number(res.monto_total||0)-Number(res.sena||0), res.moneda)],
    ]
    cobros.forEach(([label, val], i) => {
      if (i%2===0) { doc.setFillColor(247,248,250); doc.rect(margin, y-4, W-margin*2, 7, 'F') }
      doc.setTextColor(0); doc.setFont('helvetica', i===2?'bold':'normal')
      doc.text(label, margin+2, y)
      doc.setTextColor(i===2?184:0, i===2?48:0, i===2?48:0)
      doc.text(val, W-margin-2, y, {align:'right'})
      y += 7
    })

    y += 6
    doc.setDrawColor(200,200,200); doc.setLineWidth(0.3)
    doc.line(margin, y, W/2-10, y); y += 8
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(100,100,100)
    doc.text('Firma y sello', margin, y); y += 5
    doc.setFont('helvetica','bold'); doc.setTextColor(0)
    doc.text(perfil.nombre_completo||'Administrador', margin, y); y += 5
    doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100)
    doc.text((perfil.titulo||'')+(perfil.matricula?' · '+perfil.matricula:''), margin, y)

    doc.setFillColor(26,63,160); doc.rect(0, 287, W, 10, 'F')
    doc.setTextColor(200,210,255); doc.setFontSize(7)
    doc.text('GASP Alquileres Temporarios  |  '+(perfil.email_contacto||''), W/2, 293, {align:'center'})

    doc.save('Recibo_'+res.id+'_'+(res.huesped_nombre||'').replace(/ /g,'_')+'.pdf')
    }) // fin cargarLogoBase64
  }
  if (!document.querySelector('script[src*="jspdf"]')) document.head.appendChild(script)
  else script.onload()
}

// ─── PDF LIQUIDACION PROPIETARIO ─────────────────────────
function generarLiquidacionPropietario(prop, owner, reservasFiltradas, fechaDesde, fechaHasta, perfil = {}, gastosDelProp = [], pagosRealizados = []) {
  const fmtN = (n, mon) => mon === 'USD' ? 'USD ' + Number(n||0).toLocaleString('es-AR') : '$' + Number(n||0).toLocaleString('es-AR')
  const script = document.createElement('script')
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
  script.onload = () => {
    cargarLogoBase64(logoB64 => {
    const { jsPDF } = window.jspdf
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const W = 210, margin = 14

    // Header azul
    doc.setFillColor(26,63,160); doc.rect(0,0,W,45,'F')
    if (logoB64) doc.addImage(logoB64, 'JPEG', margin, 4, 34, 34)
    doc.setTextColor(255,255,255)
    doc.setFont('helvetica','bold'); doc.setFontSize(16)
    doc.text('GASP', margin+38, 16)
    doc.setFont('helvetica','normal'); doc.setFontSize(9)
    doc.text('Gestion de Alquileres Sistema Profesional', margin+38, 23)
    doc.setFontSize(8)
    doc.text((perfil.nombre_completo||'Administrador')+'  |  '+(perfil.titulo||'')+'  |  '+(perfil.matricula||''), margin+38, 30)
    doc.text((perfil.ciudad||'')+(perfil.provincia?', '+perfil.provincia:'')+'  |  '+(perfil.email_contacto||''), margin+38, 36)

    doc.setTextColor(26,63,160); doc.setFont('helvetica','bold'); doc.setFontSize(14)
    doc.text('LIQUIDACIÓN AL PROPIETARIO', margin, 56)
    doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100)
    doc.text('Período: '+(fechaDesde||'—')+' al '+(fechaHasta||'—'), margin, 62)
    doc.setDrawColor(26,63,160); doc.setLineWidth(0.5); doc.line(margin,65,W-margin,65)

    let y = 73
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
    doc.setFillColor(26,63,160); doc.rect(margin, y-4, W-margin*2, 7, 'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8)
    doc.text('Reserva', margin+1, y); doc.text('Huésped', margin+18, y)
    doc.text('Entrada', margin+55, y); doc.text('Salida', margin+75, y)
    doc.text('Días', margin+93, y); doc.text('Mon.', margin+103, y)
    doc.text('Total', margin+115, y); doc.text('Comisión', margin+133, y)
    doc.text('Neto', W-margin-1, y, {align:'right'}); y += 7

    let totBA=0, totCA=0, totNA=0, totBU=0, totCU=0, totNU=0
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
      doc.text(fmtN(r.neto_propietario, r.moneda), W-margin-1, y, {align:'right'})
      y += 6
      if (r.moneda==='USD') { totBU+=Number(r.monto_total||0); totCU+=Number(r.comision||0); totNU+=Number(r.neto_propietario||0) }
      else { totBA+=Number(r.monto_total||0); totCA+=Number(r.comision||0); totNA+=Number(r.neto_propietario||0) }
    })

    // Calcular gastos por moneda
    const gastosARS = (gastosDelProp||[]).filter(g => g.moneda !== 'USD').reduce((s,g) => s+Number(g.importe||0), 0)
    const gastosUSD = (gastosDelProp||[]).filter(g => g.moneda === 'USD').reduce((s,g) => s+Number(g.importe||0), 0)
    const netoFinalARS = totNA - gastosARS
    const netoFinalUSD = totNU - gastosUSD

    y += 4

    // Gastos del propietario (si los hay)
    if ((gastosDelProp||[]).length > 0) {
      doc.setFillColor(254,243,226); doc.rect(margin, y-4, W-margin*2, 7, 'F')
      doc.setTextColor(138,92,16); doc.setFont('helvetica','bold'); doc.setFontSize(8)
      doc.text('GASTOS DEL PROPIETARIO (a descontar)', margin+2, y); y += 7
      ;(gastosDelProp||[]).forEach((g, i) => {
        if (y > 265) { doc.addPage(); y = 20 }
        if (i%2===0) { doc.setFillColor(255,253,248); doc.rect(margin, y-3.5, W-margin*2, 6, 'F') }
        doc.setFont('helvetica','normal'); doc.setTextColor(60,60,60); doc.setFontSize(8)
        doc.text((g.concepto||'Gasto').substring(0,45), margin+2, y)
        doc.setTextColor(184,48,48)
        doc.text('- '+fmtN(g.importe, g.moneda), W-margin-1, y, {align:'right'})
        y += 6
      })
      y += 2
    }

    // Totales reservas
    ;[['TOTAL ARS',fmtN(totBA,'ARS'),fmtN(totCA,'ARS'),fmtN(totNA,'ARS')],
      ['TOTAL USD',fmtN(totBU,'USD'),fmtN(totCU,'USD'),fmtN(totNU,'USD')]].forEach(([label,bruto,com,neto]) => {
      doc.setFillColor(26,63,160); doc.rect(margin, y-4, W-margin*2, 8, 'F')
      doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(9)
      doc.text(label, margin+2, y)
      doc.text(bruto, margin+115, y)
      doc.text('- '+com, margin+133, y)
      doc.text(neto, W-margin-1, y, {align:'right'}); y += 10
    })

    // Neto final con gastos descontados
    y += 2
    if (gastosARS > 0) {
      doc.setFillColor(232,245,238); doc.rect(margin, y-4, W-margin*2, 10, 'F')
      doc.setTextColor(26,107,53); doc.setFont('helvetica','bold'); doc.setFontSize(10)
      doc.text('NETO A TRANSFERIR ARS', margin+2, y)
      doc.text(fmtN(netoFinalARS,'ARS'), W-margin-1, y, {align:'right'})
      doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(100,100,100)
      doc.text(fmtN(totNA,'ARS')+' − '+fmtN(gastosARS,'ARS')+' gastos', margin+2, y+4)
      y += 12
    }
    if (gastosUSD > 0) {
      doc.setFillColor(232,238,251); doc.rect(margin, y-4, W-margin*2, 10, 'F')
      doc.setTextColor(26,63,160); doc.setFont('helvetica','bold'); doc.setFontSize(10)
      doc.text('NETO A TRANSFERIR USD', margin+2, y)
      doc.text(fmtN(netoFinalUSD,'USD'), W-margin-1, y, {align:'right'})
      y += 12
    }

    // Pagos realizados al propietario
    const pagosARSpdf = (pagosRealizados || []).filter(p => p.moneda !== 'USD')
    const pagosUSDpdf = (pagosRealizados || []).filter(p => p.moneda === 'USD')
    const totalPagadoARSpdf = pagosARSpdf.reduce((s, p) => s + Number(p.importe || 0), 0)
    const totalPagadoUSDpdf = pagosUSDpdf.reduce((s, p) => s + Number(p.importe || 0), 0)

    if ((pagosRealizados || []).length > 0) {
      if (y > 240) { doc.addPage(); y = 20 }
      y += 4
      doc.setFillColor(17,107,53); doc.rect(margin, y-4, W-margin*2, 7, 'F')
      doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8)
      doc.text('PAGOS REALIZADOS AL PROPIETARIO', margin+2, y); y += 7

      ;(pagosRealizados || []).forEach((p, i) => {
        if (y > 265) { doc.addPage(); y = 20 }
        if (i%2===0) { doc.setFillColor(232,245,238); doc.rect(margin, y-3.5, W-margin*2, 6, 'F') }
        doc.setTextColor(50,50,50); doc.setFont('helvetica','normal'); doc.setFontSize(8)
        doc.text(p.fecha||'—', margin+2, y)
        doc.text((p.concepto||'Transferencia').substring(0,60), margin+26, y)
        doc.setTextColor(27,107,53); doc.setFont('helvetica','bold')
        const impFmt = p.moneda === 'USD' ? 'USD '+Number(p.importe||0).toLocaleString('es-AR') : '$'+Number(p.importe||0).toLocaleString('es-AR')
        doc.text(impFmt, W-margin-1, y, {align:'right'}); y += 6
      })

      doc.setFillColor(27,107,53); doc.rect(margin, y, W-margin*2, 8, 'F')
      doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(9)
      doc.text('TOTAL TRANSFERIDO AL PROPIETARIO', margin+2, y+5.5)
      const resumenPago = [
        totalPagadoARSpdf>0 ? '$'+Number(totalPagadoARSpdf).toLocaleString('es-AR') : '',
        totalPagadoUSDpdf>0 ? 'USD '+Number(totalPagadoUSDpdf).toLocaleString('es-AR') : ''
      ].filter(Boolean).join('  +  ')
      doc.text(resumenPago, W-margin-1, y+5.5, {align:'right'}); y += 10

      const saldoPendARSpdf = (netoFinalARS||0) - totalPagadoARSpdf
      const saldoPendUSDpdf = (netoFinalUSD||0) - totalPagadoUSDpdf
      if (saldoPendARSpdf > 0 || saldoPendUSDpdf > 0) {
        doc.setFillColor(254,243,226); doc.rect(margin, y, W-margin*2, 8, 'F')
        doc.setTextColor(138,92,16); doc.setFont('helvetica','bold'); doc.setFontSize(9)
        doc.text('SALDO PENDIENTE DE TRANSFERENCIA', margin+2, y+5.5)
        const resumenSaldo = [
          saldoPendARSpdf>0 ? '$'+Number(saldoPendARSpdf).toLocaleString('es-AR') : '',
          saldoPendUSDpdf>0 ? 'USD '+Number(saldoPendUSDpdf).toLocaleString('es-AR') : ''
        ].filter(Boolean).join('  +  ')
        doc.text(resumenSaldo, W-margin-1, y+5.5, {align:'right'}); y += 10
      } else {
        doc.setFillColor(232,245,238); doc.rect(margin, y, W-margin*2, 8, 'F')
        doc.setTextColor(27,107,53); doc.setFont('helvetica','bold'); doc.setFontSize(9)
        doc.text('LIQUIDACION COMPLETA — Sin saldo pendiente', margin+2, y+5.5); y += 10
      }
      y += 4
    }

    y += 4
    doc.setDrawColor(200,200,200); doc.line(margin, y, W/2-10, y); y += 8
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(100,100,100)
    doc.text('Firma y sello', margin, y); y += 5
    doc.setFont('helvetica','bold'); doc.setTextColor(0)
    doc.text(perfil.nombre_completo||'Administrador', margin, y); y += 5
    doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100)
    doc.text((perfil.titulo||'')+(perfil.matricula?' · '+perfil.matricula:''), margin, y)

    doc.setFillColor(26,63,160); doc.rect(0,287,W,10,'F')
    doc.setTextColor(200,210,255); doc.setFontSize(7)
    doc.text('GASP Alquileres Temporarios  |  '+(perfil.email_contacto||''), W/2, 293, {align:'center'})

    doc.save('Liquidacion_'+(owner?.apellido_nombre||'').replace(/ /g,'_')+'_'+(fechaDesde||'')+'.pdf')
    }) // fin cargarLogoBase64
  }
  if (!document.querySelector('script[src*="jspdf"]')) document.head.appendChild(script)
  else script.onload()
}


// ─── MÓDULO CONTRATOS ─────────────────────────────────────
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
    <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
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
    </div>
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
        <div style={{ background:'#fff', border:'0.5px solid #E8ECF0', borderRadius:12, padding:16,  marginBottom: 16, border: '1px solid ' + G }}>
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
        </div>
      )}
      <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
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
      </div>
    </>
  )
}

// ─── MÓDULO CAJA ─────────────────────────────────────────
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
          <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color }}>{val}</div>
          </div>
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
        <div style={{ background:'#fff', border:'0.5px solid #E8ECF0', borderRadius:12, padding:16,  marginBottom: 16, border: '1px solid ' + G }}>
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
        </div>
      )}

      <div style={{ background:"#fff", border:"0.5px solid #E8ECF0", borderRadius:12, padding:16 }}>
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
      </div>
    </>
  )
}

// ─── MÓDULO PERFIL ADMIN ─────────────────────────────────
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
    const { error } = await supabase.from('perfil_admin').upsert(datos, { onConflict: 'admin_id' })
    if (error) setMsg({ ok: false, text: 'Error: ' + error.message })
    else { setMsg({ ok: true, text: 'Perfil guardado.' }); onRefresh() }
    setLoading(false)
  }

  return (
    <div style={{ background:'#fff', border:'0.5px solid #E8ECF0', borderRadius:12, padding:16,  maxWidth: 600 }}>
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
      <ConfigMercadoPago session={session} />
    </div>
  )
}

// ─── APP PRINCIPAL ───────────────────────────────────────

// ─── APP GASP FULL ──────────────────────────────────────
// Componente que gestiona el acceso SSO a GASP Inmo
function InmoSSO({ session, supabase }) {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  async function abrirInmo() {
    setCargando(true)
    setError(null)
    try {
      // Obtener sesión actual con tokens frescos
      const { data, error: err } = await supabase.auth.getSession()
      if (err || !data.session) throw new Error('No hay sesión activa')
      const { access_token, refresh_token } = data.session
      const url = 'https://tasaciones.administracionpinamar.com?access_token=' +
        encodeURIComponent(access_token) + '&refresh_token=' + encodeURIComponent(refresh_token)
      window.location.href = url
    } catch (e) {
      setError(e.message)
      setCargando(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 360, gap: 20 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏘</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 6 }}>GASP Inmo</div>
        <div style={{ fontSize: 13, color: '#6B7280', maxWidth: 320, lineHeight: 1.5 }}>
          Tasaciones, Cartera de propiedades y CRM inmobiliario
        </div>
      </div>
      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 16px', fontSize: 13, color: '#B91C1C', maxWidth: 320, textAlign: 'center' }}>
          {error}
        </div>
      )}
      <button onClick={abrirInmo} disabled={cargando}
        style={{ padding: '14px 32px', background: cargando ? '#9CA3AF' : '#7C3AED', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: cargando ? 'default' : 'pointer', fontFamily: 'inherit' }}>
        {cargando ? '⏳ Conectando...' : '🚀 Ingresar a GASP Inmo'}
      </button>
      <div style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>
        Tus credenciales se transfieren automáticamente.<br />No necesitás ingresar contraseña.
      </div>
    </div>
  )
}

function Garantias({ session, supabase, contratos = [], inquilinos = [] }) {
  const [garantias, setGarantias] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [leyendoPDF, setLeyendoPDF] = useState(false)
  const [msg, setMsg] = useState(null)
  const [filtro, setFiltro] = useState({ estado: '', tipo: '', busqueda: '' })

  const TIPOS = [
    { value: 'propietario_garante', label: '🏠 Propietario garante',  color: '#1A3FA0' },
    { value: 'caucion',            label: '🛡 Seguro de caución',     color: '#166534' },
    { value: 'aval_bancario',      label: '🏦 Aval bancario',         color: '#92400E' },
    { value: 'deposito',           label: '💰 Depósito en garantía',  color: '#6D28D9' },
    { value: 'otro',               label: '📄 Otro',                  color: '#6B7280' },
  ]
  const ESTADOS = [
    { value: 'vigente',   label: 'Vigente',   color: '#166534', bg: '#DCFCE7' },
    { value: 'vencida',   label: 'Vencida',   color: '#92400E', bg: '#FEF3C7' },
    { value: 'ejecutada', label: 'Ejecutada', color: '#991B1B', bg: '#FEE2E2' },
    { value: 'cancelada', label: 'Cancelada', color: '#6B7280', bg: '#F3F4F6' },
  ]

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('garantias')
      .select('*')
      .eq('admin_id', session.user.id)
      .order('created_at', { ascending: false })
    setGarantias(data || [])
    setLoading(false)
  }

  async function guardar() {
    if (!form.contrato_id || !form.tipo)
      return setMsg({ tipo: 'warn', texto: 'Completá contrato y tipo de garantía' })
    setMsg(null)
    const id = form.id || ('GAR-' + String(Date.now()).slice(-6))
    const { error } = await supabase.from('garantias').upsert({
      ...form, id,
      admin_id: session.user.id,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })
    if (error) return setMsg({ tipo: 'error', texto: 'Error: ' + error.message })
    setMsg({ tipo: 'ok', texto: '✓ Garantía guardada.' })
    setForm(null)
    cargar()
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar esta garantía?')) return
    await supabase.from('garantias').delete().eq('id', id)
    cargar()
  }

  // ── IA: leer PDF de contrato y extraer datos de garantía (vía EF proxy) ────
  async function leerPDFConIA(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLeyendoPDF(true)
    setMsg({ tipo: 'info', texto: '🤖 Leyendo el contrato con IA...' })
    try {
      // Convertir PDF a base64
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => res(reader.result.split(',')[1])
        reader.onerror = () => rej(new Error('Error al leer el archivo'))
        reader.readAsDataURL(file)
      })

      // Llamar a la Edge Function proxy (evita CORS y exponer API key)
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/extraer-garantia-pdf`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdf_base64: base64 })
        }
      )
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Error en el servidor')

      setForm(f => ({ ...f, ...data.datos, extraido_por_ia: true }))
      setMsg({ tipo: 'ok', texto: '✓ Datos extraídos por IA. Revisá y completá lo que falte.' })
    } catch (err) {
      setMsg({ tipo: 'error', texto: 'Error al procesar el PDF: ' + err.message })
    }
    setLeyendoPDF(false)
  }

  useEffect(() => { if (session) cargar() }, [session])

  // Filtros
  let filtradas = garantias
  if (filtro.estado) filtradas = filtradas.filter(g => g.estado === filtro.estado)
  if (filtro.tipo) filtradas = filtradas.filter(g => g.tipo === filtro.tipo)
  if (filtro.busqueda) {
    const b = filtro.busqueda.toLowerCase()
    filtradas = filtradas.filter(g =>
      (g.garante_nombre || '').toLowerCase().includes(b) ||
      (g.entidad || '').toLowerCase().includes(b) ||
      (g.numero_poliza || '').toLowerCase().includes(b)
    )
  }

  // Alertas: vencimientos próximos (30 días)
  const hoy = new Date()
  const en30 = new Date(); en30.setDate(en30.getDate() + 30)
  const proximas = garantias.filter(g => {
    if (!g.fecha_vencimiento || g.estado !== 'vigente') return false
    const vto = new Date(g.fecha_vencimiento)
    return vto >= hoy && vto <= en30
  })
  const vencidas = garantias.filter(g => {
    if (!g.fecha_vencimiento || g.estado !== 'vigente') return false
    return new Date(g.fecha_vencimiento) < hoy
  })

  const formVacio = { tipo: 'propietario_garante', estado: 'vigente', moneda: 'ARS', contrato_id: '', inquilino_id: '' }

  const getContrato = id => contratos.find(c => c.id === id)
  const getInquilino = id => inquilinos.find(i => i.id === id)
  const getTipo = v => TIPOS.find(t => t.value === v)
  const getEstado = v => ESTADOS.find(e => e.value === v)

  return (
    <div>
      {/* Alertas */}
      {(proximas.length > 0 || vencidas.length > 0) && (
        <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {vencidas.length > 0 && (
            <div style={{ background: '#FEE2E2', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#991B1B', fontWeight: 600 }}>
              ⚠️ {vencidas.length} garantía{vencidas.length !== 1 ? 's' : ''} vencida{vencidas.length !== 1 ? 's' : ''} sin actualizar —
              {vencidas.map(g => ` ${g.garante_nombre || g.entidad || g.id}`).join(',')}
            </div>
          )}
          {proximas.length > 0 && (
            <div style={{ background: '#FEF9C3', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#854D0E', fontWeight: 600 }}>
              🔔 {proximas.length} garantía{proximas.length !== 1 ? 's' : ''} vence{proximas.length === 1 ? '' : 'n'} en los próximos 30 días
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>🔐 Garantías</h2>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
            {garantias.length} garantía{garantias.length !== 1 ? 's' : ''} registrada{garantias.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setForm({ ...formVacio })}
          style={{ padding: '9px 20px', borderRadius: 8, background: '#1A3FA0', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          + Nueva garantía
        </button>
      </div>

      {/* Mensaje */}
      {msg && (
        <div style={{
          background: msg.tipo === 'ok' ? '#DCFCE7' : msg.tipo === 'warn' ? '#FEF9C3' : msg.tipo === 'info' ? '#DBEAFE' : '#FEE2E2',
          color: msg.tipo === 'ok' ? '#166534' : msg.tipo === 'warn' ? '#854D0E' : msg.tipo === 'info' ? '#1E40AF' : '#991B1B',
          borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16
        }}>
          {msg.texto}
        </div>
      )}

      {/* Formulario */}
      {form && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 20, border: '1px solid #1A3FA0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1A3FA0' }}>
              {form.id ? 'Editar garantía' : 'Nueva garantía'}
            </div>
            {/* Botón leer PDF con IA */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0',
              cursor: leyendoPDF ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600, color: '#166534'
            }}>
              {leyendoPDF ? '⏳ Leyendo...' : '🤖 Extraer datos del contrato (PDF)'}
              <input type="file" accept=".pdf" onChange={leerPDFConIA} style={{ display: 'none' }} disabled={leyendoPDF} />
            </label>
          </div>

          {form.extraido_por_ia && (
            <div style={{ background: '#F0FDF4', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#166534', marginBottom: 16 }}>
              🤖 Datos extraídos por IA — revisá y corregí lo que sea necesario antes de guardar
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            {/* Contrato */}
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#6B7280', marginBottom: 4, fontWeight: 500 }}>Contrato *</label>
              <select value={form.contrato_id} onChange={e => setForm(f => ({ ...f, contrato_id: e.target.value }))}
                style={{ width: '100%', padding: '8px 11px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13, fontFamily: 'inherit' }}>
                <option value="">Seleccionar...</option>
                {contratos.map(c => <option key={c.id} value={c.id}>{c.id} — {c.inquilino_nombre || c.inquilino_id}</option>)}
              </select>
            </div>
            {/* Tipo */}
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#6B7280', marginBottom: 4, fontWeight: 500 }}>Tipo de garantía *</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                style={{ width: '100%', padding: '8px 11px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13, fontFamily: 'inherit' }}>
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Datos del garante (solo si aplica) */}
          {(form.tipo === 'propietario_garante' || form.tipo === 'otro') && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Datos del garante
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { key: 'garante_nombre', label: 'Nombre completo', placeholder: 'Juan García' },
                  { key: 'garante_dni', label: 'DNI', placeholder: '28.345.678' },
                  { key: 'garante_telefono', label: 'Teléfono', placeholder: '2267-123456' },
                  { key: 'garante_email', label: 'Email', placeholder: 'garante@email.com' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: 12, color: '#6B7280', marginBottom: 4, fontWeight: 500 }}>{label}</label>
                    <input value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      style={{ width: '100%', padding: '8px 11px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
                  </div>
                ))}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#6B7280', marginBottom: 4, fontWeight: 500 }}>Domicilio</label>
                  <input value={form.garante_domicilio || ''} onChange={e => setForm(f => ({ ...f, garante_domicilio: e.target.value }))}
                    placeholder="Calle 123, Pinamar"
                    style={{ width: '100%', padding: '8px 11px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
            </>
          )}

          {/* Datos de póliza (seguro/banco) */}
          {(form.tipo === 'caucion' || form.tipo === 'aval_bancario') && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Datos de la póliza / aval
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#6B7280', marginBottom: 4, fontWeight: 500 }}>
                    {form.tipo === 'caucion' ? 'Aseguradora' : 'Banco / Entidad'}
                  </label>
                  <input value={form.entidad || ''} onChange={e => setForm(f => ({ ...f, entidad: e.target.value }))}
                    placeholder={form.tipo === 'caucion' ? 'Ej: Fianzas y Crédito' : 'Ej: Banco Nación'}
                    style={{ width: '100%', padding: '8px 11px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#6B7280', marginBottom: 4, fontWeight: 500 }}>N° de póliza / aval</label>
                  <input value={form.numero_poliza || ''} onChange={e => setForm(f => ({ ...f, numero_poliza: e.target.value }))}
                    placeholder="Ej: 0012-00123456"
                    style={{ width: '100%', padding: '8px 11px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
            </>
          )}

          {/* Vigencia y monto */}
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Vigencia y monto
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              { key: 'fecha_inicio', label: 'Fecha inicio', type: 'date' },
              { key: 'fecha_vencimiento', label: 'Fecha vencimiento', type: 'date' },
              { key: 'monto', label: 'Monto', type: 'number', placeholder: '0' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: 12, color: '#6B7280', marginBottom: 4, fontWeight: 500 }}>{label}</label>
                <input type={type} value={form[key] || ''} placeholder={placeholder}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '8px 11px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#6B7280', marginBottom: 4, fontWeight: 500 }}>Moneda</label>
              <select value={form.moneda || 'ARS'} onChange={e => setForm(f => ({ ...f, moneda: e.target.value }))}
                style={{ width: '100%', padding: '8px 11px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13, fontFamily: 'inherit' }}>
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          {/* Estado y notas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#6B7280', marginBottom: 4, fontWeight: 500 }}>Estado</label>
              <select value={form.estado || 'vigente'} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                style={{ width: '100%', padding: '8px 11px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13, fontFamily: 'inherit' }}>
                {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#6B7280', marginBottom: 4, fontWeight: 500 }}>Descripción / Notas</label>
              <input value={form.descripcion || ''} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                placeholder="Observaciones adicionales"
                style={{ width: '100%', padding: '8px 11px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={guardar}
              style={{ padding: '9px 22px', borderRadius: 8, background: '#1A3FA0', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              💾 Guardar garantía
            </button>
            <button onClick={() => { setForm(null); setMsg(null) }}
              style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #D1D5DB', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 14, marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', border: '1px solid #E5E7EB' }}>
        <input value={filtro.busqueda} onChange={e => setFiltro(f => ({ ...f, busqueda: e.target.value }))}
          placeholder="Buscar garante, entidad, póliza..."
          style={{ flex: 1, minWidth: 200, padding: '7px 11px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
        <select value={filtro.tipo} onChange={e => setFiltro(f => ({ ...f, tipo: e.target.value }))}
          style={{ padding: '7px 11px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13, fontFamily: 'inherit' }}>
          <option value="">Todos los tipos</option>
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filtro.estado} onChange={e => setFiltro(f => ({ ...f, estado: e.target.value }))}
          style={{ padding: '7px 11px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13, fontFamily: 'inherit' }}>
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#6B7280', padding: 40 }}>Cargando...</div>
      ) : filtradas.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: '#6B7280', border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Sin garantías registradas</div>
          <div style={{ fontSize: 13 }}>Agregá la primera garantía o cargá el PDF del contrato para que la IA extraiga los datos.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtradas.map(g => {
            const tipo = getTipo(g.tipo)
            const estadoObj = getEstado(g.estado)
            const contrato = getContrato(g.contrato_id)
            const hoy = new Date()
            const vto = g.fecha_vencimiento ? new Date(g.fecha_vencimiento) : null
            const diasVto = vto ? Math.ceil((vto - hoy) / 86400000) : null
            const alertaVto = diasVto !== null && diasVto <= 30 && g.estado === 'vigente'
            return (
              <div key={g.id} style={{
                background: '#fff', borderRadius: 12, padding: '16px 20px',
                border: `1px solid ${alertaVto ? '#FCD34D' : '#E5E7EB'}`,
                borderLeft: `4px solid ${tipo?.color || '#6B7280'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>
                        {g.garante_nombre || g.entidad || tipo?.label || 'Garantía'}
                      </span>
                      <span style={{ fontSize: 11, background: estadoObj?.bg, color: estadoObj?.color, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                        {estadoObj?.label || g.estado}
                      </span>
                      <span style={{ fontSize: 11, background: (tipo?.color || '#6B7280') + '15', color: tipo?.color || '#6B7280', padding: '2px 8px', borderRadius: 10, fontWeight: 500 }}>
                        {tipo?.label || g.tipo}
                      </span>
                      {g.extraido_por_ia && (
                        <span style={{ fontSize: 10, background: '#F0FDF4', color: '#166534', padding: '2px 6px', borderRadius: 8 }}>🤖 IA</span>
                      )}
                      {alertaVto && (
                        <span style={{ fontSize: 10, background: '#FEF9C3', color: '#854D0E', padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>
                          ⚠ Vence en {diasVto} días
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6B7280', flexWrap: 'wrap' }}>
                      {g.contrato_id && <span>📄 Contrato: {g.contrato_id}</span>}
                      {g.garante_dni && <span>🪪 DNI: {g.garante_dni}</span>}
                      {g.numero_poliza && <span>🔢 Póliza: {g.numero_poliza}</span>}
                      {g.monto && <span>💰 {g.moneda} {Number(g.monto).toLocaleString('es-AR')}</span>}
                      {g.fecha_inicio && <span>📅 Desde: {new Date(g.fecha_inicio).toLocaleDateString('es-AR')}</span>}
                      {g.fecha_vencimiento && (
                        <span style={{ color: alertaVto ? '#854D0E' : '#6B7280', fontWeight: alertaVto ? 600 : 400 }}>
                          📅 Vence: {new Date(g.fecha_vencimiento).toLocaleDateString('es-AR')}
                        </span>
                      )}
                    </div>
                    {g.descripcion && (
                      <div style={{ marginTop: 6, fontSize: 12, color: '#374151', fontStyle: 'italic' }}>
                        {g.descripcion}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setForm({ ...g })}
                      style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #D1D5DB', background: '#fff', cursor: 'pointer', fontSize: 11 }}>
                      ✏ Editar
                    </button>
                    <button onClick={() => eliminar(g.id)}
                      style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: '#FEE2E2', color: '#991B1B', cursor: 'pointer', fontSize: 11 }}>
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


// ── iCAL SYNC — MÓDULO COMPLETO ──────────────────────────────────────────────
// Se inserta en GASP Temporario (gasp-admin/gasp-temp/pages/index.jsx)
// Nav: { id: 'ical', label: 'iCal Sync', icon: '🔄' }
// Render: {nav === 'ical' && <ICalSync session={session} supabase={supabase} propiedades={propiedades} />}

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
          {`https://temp.administracionpinamar.com/api/ical-export?admin_id=${(session?.user?.id || '').slice(0, 8)}...`}
        </div>
      </div>
    </div>
  )
}


// ── ESTADÍSTICAS DE MERCADO — MÓDULO COMPLETO ─────────────────────────────────
// Se inserta en GASP Inmo (gasp-admin/gasp-tasaciones/pages/index.jsx)
// Nav: { id: 'estadisticas', label: 'Estadísticas', icon: '📊' }
// Render: {nav.pagina === 'estadisticas' && <EstadisticasMercado session={session} supabase={supabase} />}

function EstadisticasMercado({ session, supabase }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState({ operacion: '', tipo: '', periodo: '12' })

  async function cargar() {
    setLoading(true)
    const adminId = session.user.id

    // Traer tasaciones finalizadas con valor
    const { data: tas } = await supabase
      .from('tas_tasaciones')
      .select('*')
      .eq('admin_id', adminId)
      .not('valor_sugerido', 'is', null)
      .order('created_at', { ascending: false })

    // Traer comparables
    const { data: comps } = await supabase
      .from('tas_comparables')
      .select('*')
      .eq('admin_id', adminId)
      .eq('incluir', true)
      .not('precio', 'is', null)
      .not('sup_m2', 'is', null)

    if (!tas) { setLoading(false); return }

    // Filtrar por período
    const meses = parseInt(filtro.periodo) || 12
    const desde = new Date()
    desde.setMonth(desde.getMonth() - meses)

    let filtered = tas.filter(t => new Date(t.created_at) >= desde)
    if (filtro.operacion) filtered = filtered.filter(t => t.operacion === filtro.operacion)
    if (filtro.tipo) filtered = filtered.filter(t => t.tipo === filtro.tipo)

    // ── Cálculos ──────────────────────────────────────────────────────────────
    // Por localidad
    const porLocalidad = {}
    filtered.forEach(t => {
      const loc = (t.localidad || 'Sin localidad').toLowerCase()
        .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      if (!porLocalidad[loc]) porLocalidad[loc] = { tasaciones: [], precios_m2: [] }
      porLocalidad[loc].tasaciones.push(t)
      if (t.precio_m2_promedio) porLocalidad[loc].precios_m2.push(Number(t.precio_m2_promedio))
    })

    // Por tipo de propiedad
    const porTipo = {}
    filtered.forEach(t => {
      const tipo = t.tipo || 'otro'
      if (!porTipo[tipo]) porTipo[tipo] = []
      porTipo[tipo].push(t)
    })

    // Evolución mensual
    const porMes = {}
    filtered.forEach(t => {
      const mes = t.created_at.slice(0, 7) // YYYY-MM
      if (!porMes[mes]) porMes[mes] = []
      porMes[mes].push(Number(t.valor_sugerido))
    })

    // Comparables: precio/m² por zona
    const compsPorZona = {}
    ;(comps || []).forEach(c => {
      const zona = (c.localidad || 'Sin zona').toLowerCase()
        .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      if (!compsPorZona[zona]) compsPorZona[zona] = []
      compsPorZona[zona].push(c.precio / c.sup_m2)
    })

    // Totales globales
    const valores = filtered.map(t => Number(t.valor_sugerido)).filter(Boolean)
    const pm2s = filtered.map(t => Number(t.precio_m2_promedio)).filter(Boolean)

    setStats({
      total: filtered.length,
      valorPromedio: valores.length ? Math.round(valores.reduce((a,b) => a+b, 0) / valores.length) : 0,
      valorMin: valores.length ? Math.min(...valores) : 0,
      valorMax: valores.length ? Math.max(...valores) : 0,
      pm2Promedio: pm2s.length ? Math.round(pm2s.reduce((a,b) => a+b, 0) / pm2s.length) : 0,
      finalizadas: filtered.filter(t => t.estado_tasacion === 'finalizada').length,
      borradores: filtered.filter(t => t.estado_tasacion === 'borrador').length,
      porLocalidad,
      porTipo,
      porMes,
      compsPorZona,
      totalComps: (comps || []).length,
    })
    setLoading(false)
  }

  useEffect(() => { if (session) cargar() }, [session, filtro])

  const fmtUSD = n => n ? 'USD ' + Number(n).toLocaleString('es-AR') : '—'
  const fmtN = n => n ? Number(n).toLocaleString('es-AR') : '—'

  if (loading) return <div style={{ textAlign: 'center', color: '#6B7280', padding: 60 }}>Calculando estadísticas...</div>

  if (!stats || stats.total === 0) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#6B7280' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Sin datos suficientes</div>
      <div style={{ fontSize: 13 }}>Completá al menos una tasación con valor sugerido para ver estadísticas.</div>
    </div>
  )

  return (
    <div>
      {/* Header + filtros */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>📊 Estadísticas de mercado</h2>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>Basado en tus tasaciones y comparables</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={filtro.operacion} onChange={e => setFiltro(f => ({ ...f, operacion: e.target.value }))}
            style={{ padding: '7px 12px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13, fontFamily: 'inherit' }}>
            <option value="">Todas las operaciones</option>
            <option value="venta">Venta</option>
            <option value="alquiler">Alquiler</option>
          </select>
          <select value={filtro.tipo} onChange={e => setFiltro(f => ({ ...f, tipo: e.target.value }))}
            style={{ padding: '7px 12px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13, fontFamily: 'inherit' }}>
            <option value="">Todos los tipos</option>
            {['casa','departamento','PH','local','terreno','lote'].map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
          <select value={filtro.periodo} onChange={e => setFiltro(f => ({ ...f, periodo: e.target.value }))}
            style={{ padding: '7px 12px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13, fontFamily: 'inherit' }}>
            <option value="3">Últimos 3 meses</option>
            <option value="6">Últimos 6 meses</option>
            <option value="12">Último año</option>
            <option value="24">Últimos 2 años</option>
          </select>
        </div>
      </div>

      {/* KPIs globales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Tasaciones', value: stats.total, sub: `${stats.finalizadas} finalizadas`, color: '#1A3FA0' },
          { label: 'Valor promedio', value: fmtUSD(stats.valorPromedio), sub: `Rango: ${fmtUSD(stats.valorMin)}–${fmtUSD(stats.valorMax)}`, color: '#166534' },
          { label: 'Precio/m² prom.', value: `USD ${fmtN(stats.pm2Promedio)}/m²`, sub: 'Sobre tasaciones propias', color: '#92400E' },
          { label: 'Comparables', value: stats.totalComps, sub: 'Analizados en tasaciones', color: '#6D28D9' },
        ].map((k, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 18, border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6, fontWeight: 500 }}>{k.label}</div>
            <div style={{ fontSize: k.label === 'Tasaciones' || k.label === 'Comparables' ? 28 : 18, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Por localidad */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #E5E7EB' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 16 }}>
            📍 Precio/m² por localidad
          </div>
          {Object.entries(stats.porLocalidad)
            .sort((a, b) => b[1].tasaciones.length - a[1].tasaciones.length)
            .slice(0, 8)
            .map(([loc, data]) => {
              const pm2 = data.precios_m2.length
                ? Math.round(data.precios_m2.reduce((a,b) => a+b, 0) / data.precios_m2.length)
                : null
              const maxPm2 = Math.max(...Object.values(stats.porLocalidad)
                .map(d => d.precios_m2.length ? Math.round(d.precios_m2.reduce((a,b)=>a+b,0)/d.precios_m2.length) : 0))
              const pct = pm2 && maxPm2 ? (pm2 / maxPm2) * 100 : 0
              return (
                <div key={loc} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                    <span style={{ fontWeight: 600, color: '#374151' }}>{loc}</span>
                    <span style={{ color: '#6B7280' }}>
                      {pm2 ? `USD ${fmtN(pm2)}/m²` : '—'}
                      <span style={{ fontSize: 11, marginLeft: 6, color: '#9CA3AF' }}>({data.tasaciones.length} tas.)</span>
                    </span>
                  </div>
                  <div style={{ height: 6, background: '#F3F4F6', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: '#1A3FA0', borderRadius: 3, transition: 'width 0.5s' }} />
                  </div>
                </div>
              )
            })}
          {Object.keys(stats.porLocalidad).length === 0 && (
            <div style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: 20 }}>Sin datos</div>
          )}
        </div>

        {/* Por tipo */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #E5E7EB' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 16 }}>
            🏠 Distribución por tipo
          </div>
          {Object.entries(stats.porTipo)
            .sort((a, b) => b[1].length - a[1].length)
            .map(([tipo, tas]) => {
              const valores = tas.map(t => Number(t.valor_sugerido)).filter(Boolean)
              const promedio = valores.length ? Math.round(valores.reduce((a,b) => a+b,0) / valores.length) : null
              const pct = Math.round((tas.length / stats.total) * 100)
              const COLORES_TIPO = { casa: '#1A3FA0', departamento: '#166534', PH: '#92400E', local: '#6D28D9', terreno: '#0891B2', lote: '#D97706' }
              const color = COLORES_TIPO[tipo] || '#6B7280'
              return (
                <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, padding: '10px 12px', background: '#F9FAFB', borderRadius: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    🏠
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>
                      {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                    </div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>
                      {tas.length} tasación{tas.length !== 1 ? 'es' : ''} · {pct}%
                      {promedio ? ` · Prom. ${fmtUSD(promedio)}` : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color }}>{pct}%</div>
                </div>
              )
            })}
          {Object.keys(stats.porTipo).length === 0 && (
            <div style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: 20 }}>Sin datos</div>
          )}
        </div>

        {/* Evolución mensual */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #E5E7EB' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 16 }}>
            📈 Evolución mensual de valores
          </div>
          {Object.keys(stats.porMes).length < 2 ? (
            <div style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: 20 }}>
              Necesitás al menos 2 meses de datos para ver la evolución.
            </div>
          ) : (() => {
            const meses = Object.entries(stats.porMes).sort()
            const promedios = meses.map(([mes, vals]) => ({
              mes,
              label: new Date(mes + '-01').toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }),
              promedio: Math.round(vals.reduce((a,b) => a+b, 0) / vals.length),
              count: vals.length
            }))
            const maxVal = Math.max(...promedios.map(p => p.promedio))
            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, paddingBottom: 4 }}>
                  {promedios.slice(-8).map((p, i) => {
                    const h = maxVal ? Math.round((p.promedio / maxVal) * 100) : 20
                    return (
                      <div key={p.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <div style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 600 }}>
                          USD {Math.round(p.promedio / 1000)}k
                        </div>
                        <div style={{
                          width: '100%', borderRadius: '4px 4px 0 0',
                          background: i === promedios.slice(-8).length - 1 ? '#1A3FA0' : '#BFDBFE',
                          height: `${Math.max(h, 8)}%`,
                          transition: 'height 0.5s'
                        }} title={`USD ${fmtN(p.promedio)} (${p.count} tas.)`} />
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {promedios.slice(-8).map(p => (
                    <div key={p.mes} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: '#9CA3AF' }}>
                      {p.label}
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>

        {/* Precio/m² comparables por zona */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #E5E7EB' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 16 }}>
            🔍 Precio/m² de comparables por zona
          </div>
          {Object.keys(stats.compsPorZona).length === 0 ? (
            <div style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: 20 }}>
              Sin comparables con datos de superficie y precio.
            </div>
          ) : (
            Object.entries(stats.compsPorZona)
              .map(([zona, pm2s]) => {
                const prom = Math.round(pm2s.reduce((a,b) => a+b, 0) / pm2s.length)
                const min = Math.round(Math.min(...pm2s))
                const max = Math.round(Math.max(...pm2s))
                return { zona, prom, min, max, n: pm2s.length }
              })
              .sort((a, b) => b.prom - a.prom)
              .slice(0, 7)
              .map(({ zona, prom, min, max, n }) => (
                <div key={zona} style={{ padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>{zona}</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#1A3FA0' }}>
                      USD {fmtN(prom)}/m²
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                    Rango: USD {fmtN(min)} – USD {fmtN(max)}/m² · {n} comparable{n !== 1 ? 's' : ''}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  )
}


// ── COLORES ──────────────────────────────────────────────────────────────────
const AZ  = '#1A3FA0'
const VD  = '#1B6B35'
const BG_SIDEBAR = '#080D1A'

export default function App() {
  const [session, setSession] = useState(null)
  const [cargando, setCargando] = useState(true)
  // Estado del módulo activo: 'anual' | 'temporal'
  const [modulo, setModulo] = useState('anual')
  const [pagina, setPagina] = useState('dashboard')

  // ── Datos compartidos ──────────────────────────────────────
  const [propietarios, setPropietarios] = useState([])
  const [propiedades, setProps] = useState([])
  const [perfil, setPerfil] = useState({})

  // ── Datos módulo ANUAL ─────────────────────────────────────
  const [inquilinos, setInquilinos] = useState([])
  const [conts, setConts] = useState([])
  const [pags, setPags] = useState([])
  const [gasts, setGasts] = useState([])
  const [cajaMov, setCajaMov] = useState([])

  // ── Datos módulo TEMPORAL ──────────────────────────────────
  const [reservas, setReservas] = useState([])
  const [gastosTemp, setGastosTemp] = useState([])
  const [cajaTemp, setCajaTemp] = useState([])
  const [propiedadesTemp, setPropiedadesTemp] = useState([])
  const [propietariosTemp, setPropietariosTemp] = useState([])

  const [isMobile, setIsMobile] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [demoInfo, setDemoInfo] = useState(null)
  const [esSuperAdmin, setEsSuperAdmin] = useState(false)


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
      if (data?.session) cargar(true)
      else setCargando(false)
    }).catch(() => { setSession(null); setCargando(false) })
  }, [])

  const adminId = session?.user?.id || null

  async function cargar(inicial = false) {
    if (inicial) setCargando(true)
    try {
      const uid = (await supabase.auth.getUser()).data.user?.id
      const adminId = uid
      if (!adminId) { if (inicial) setCargando(false); return }

      // Perfil (full_perfil_admin se mantiene propio del Full)
      const [propRes, propiedRes, perfilRes] = await Promise.all([
        supabase.from('propietarios').select('*').eq('admin_id', adminId).order('apellido_nombre'),
        supabase.from('propiedades').select('*').eq('admin_id', adminId).eq('activo', true).order('id'),
        supabase.from('full_perfil_admin').select('*').eq('admin_id', adminId).maybeSingle(),
      ])
      setPropietarios(propRes.data || [])
      setProps(propiedRes.data || [])
      setPerfil(perfilRes.data || {})

      // Datos anual — lee de tablas originales del Anual
      const [inqRes, contsRes, pagsRes, gastsRes, cajaRes] = await Promise.all([
        supabase.from('inquilinos').select('*').eq('admin_id', adminId).order('apellido_nombre'),
        supabase.from('contratos').select('*').eq('admin_id', adminId).order('id'),
        supabase.from('pagos').select('*').eq('admin_id', adminId).order('fecha_pago', { ascending: false }),
        supabase.from('gastos').select('*').eq('admin_id', adminId).order('fecha', { ascending: false }),
        supabase.from('caja').select('*').eq('admin_id', adminId).order('fecha', { ascending: false }),
      ])
      setInquilinos(inqRes.data || [])
      setConts(contsRes.data || [])
      setPags(pagsRes.data || [])
      setGasts(gastsRes.data || [])
      setCajaMov(cajaRes.data || [])

      // Datos temporal — lee de tablas originales del Temporario
      const [resRes, gastsTRes, cajaTRes, propsTRes, propietTRes] = await Promise.all([
        supabase.from('reservas_temp').select('*').eq('admin_id', adminId).order('fecha_entrada', { ascending: false }),
        supabase.from('gastos').select('*').eq('admin_id', adminId).order('fecha', { ascending: false }),
        supabase.from('caja_temp').select('*').eq('admin_id', adminId).order('fecha', { ascending: false }),
        supabase.from('prop_temp').select('*').eq('admin_id', adminId).order('id'),
        supabase.from('prop_owners_temp').select('*').eq('admin_id', adminId).order('apellido_nombre'),
      ])
      setReservas(resRes.data || [])
      setGastosTemp(gastsTRes.data || [])
      setCajaTemp(cajaTRes.data || [])
      setPropietariosTemp(propietTRes.data || [])
      // Props temporarias para el módulo temporal del Full
      setPropiedadesTemp(propsTRes.data || [])

      // Demo info
      const { data: demo } = await supabase.from('full_usuarios').select('*').eq('admin_id', adminId).eq('es_demo', true).maybeSingle()
      setDemoInfo(demo || null)
      setEsSuperAdmin((await supabase.auth.getUser()).data.user?.email === SUPERADMIN_EMAIL)
    } catch (err) {
      console.error('[GASP Full] Error en cargar:', err)
    } finally {
      if (inicial) setCargando(false)
    }
  }

  async function login(e) {
    e.preventDefault()
    setLoginLoading(true); setLoginError('')
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass })
    if (error) { setLoginError('Email o contraseña incorrectos'); setLoginLoading(false); return }
    const { data: { session } } = await supabase.auth.getSession()
    setSession(session)
    await cargar(true)
    setLoginLoading(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    setSession(null)
    setPropietarios([]); setProps([]); setInquilinos([])
    setConts([]); setPags([]); setGasts([]); setCajaMov([])
    setReservas([]); setGastosTemp([]); setCajaTemp([])
    setPagina('dashboard'); setModulo('anual')
  }

  // ── Pantallas de carga / login ─────────────────────────────
  if (cargando) return (
    <div style={{ minHeight:'100vh', background:'#080D1A', display:'flex', alignItems:'center', justifyContent:'center', color:'#4A7ABF', fontFamily:'Arial', fontSize:14 }}>
      Cargando GASP...
    </div>
  )

  if (!session) return (
    <div style={{ minHeight:'100vh', background:'#080D1A', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Arial', padding:16 }}>
      <Head><title>GASP Full — Acceso</title></Head>
      <div style={{ background:'#111828', border:'1px solid #1A2540', borderRadius:16, padding:40, width:'100%', maxWidth:400 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:42, fontWeight:'bold', color:'#fff', letterSpacing:-1 }}>GASP</div>
          <div style={{ fontSize:13, color:'#5A7AAA', marginTop:4 }}>Sistema Completo de Gestión de Alquileres</div>
          <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:12 }}>
            <span style={{ background:'#1A2F7A', color:'#7aacff', fontSize:11, padding:'3px 10px', borderRadius:100 }}>📋 Anual</span>
            <span style={{ background:'#0A2918', color:'#3acd70', fontSize:11, padding:'3px 10px', borderRadius:100 }}>🏖 Temporario</span>
            <span style={{ background:'#2D1654', color:'#c084fc', fontSize:11, padding:'3px 10px', borderRadius:100 }}>🏘 Inmo</span>
          </div>
        </div>
        <form onSubmit={login}>
          <input placeholder="Email" type="email" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)}
            style={{ width:'100%', padding:'12px 14px', marginBottom:12, borderRadius:8, border:'1px solid #1A2540', background:'#0D1426', color:'#fff', fontSize:14, boxSizing:'border-box' }} />
          <input placeholder="Contraseña" type="password" value={loginPass} onChange={e=>setLoginPass(e.target.value)}
            style={{ width:'100%', padding:'12px 14px', marginBottom:16, borderRadius:8, border:'1px solid #1A2540', background:'#0D1426', color:'#fff', fontSize:14, boxSizing:'border-box' }} />
          {loginError && <div style={{ color:'#E57373', fontSize:12, marginBottom:12, textAlign:'center' }}>{loginError}</div>}
          <button type="submit" disabled={loginLoading}
            style={{ width:'100%', padding:'12px', borderRadius:8, background:'linear-gradient(135deg,#1A3FA0,#1B6B35)', color:'#fff', border:'none', cursor:'pointer', fontSize:14, fontWeight:'bold' }}>
            {loginLoading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )

  // ── Menú de navegación ─────────────────────────────────────
  const ACCENT = modulo === 'anual' ? AZ : modulo === 'temporal' ? VD : '#7C3AED'

  const NAV_ANUAL = [
    { id: 'dashboard',      label: 'Panel principal',    icon: '📊', sec: 'Principal' },
    { id: 'propietarios',   label: 'Propietarios',        icon: '👤', sec: 'Compartido' },
    { id: 'propiedades',    label: 'Propiedades',          icon: '🏠', sec: 'Compartido' },
    { id: 'inquilinos',     label: 'Inquilinos',           icon: '👥', sec: 'Anual' },
    { id: 'contratos',      label: 'Contratos',            icon: '📋', sec: 'Anual' },
    { id: 'pagos',          label: 'Pagos',                icon: '💰', sec: 'Anual' },
    { id: 'gastos',         label: 'Gastos',               icon: '🧾', sec: 'Anual' },
    { id: 'liquidaciones',  label: 'Liquidaciones',        icon: '📑', sec: 'Anual' },
    { id: 'reportes',       label: 'Reportes',             icon: '📈', sec: 'Anual' },
    { id: 'notificaciones', label: 'Notificaciones',       icon: '🔔', sec: 'Anual' },
    { id: 'caja',           label: 'Caja',                 icon: '💵', sec: 'Anual' },
    { id: 'garantias',      label: 'Garantías',            icon: '🔐', sec: 'Admin' },
    { id: 'perfil',         label: 'Mi perfil',            icon: '⚙️', sec: 'Admin' },
    ...(esSuperAdmin ? [{ id: 'clientes', label: 'Clientes GASP', icon: '🏢', sec: 'Admin' }] : []),
  ]

  const NAV_TEMP = [
    { id:'dashboard',      label:'Panel principal',  icon:'📊', sec:'Principal' },
    { id:'propietarios',   label:'Propietarios',      icon:'👤', sec:'Compartido' },
    { id:'propiedades',    label:'Propiedades',       icon:'🏠', sec:'Compartido' },
    { id:'calendario',     label:'Calendario',        icon:'🗓', sec:'Temporal' },
    { id:'reservas',       label:'Reservas',          icon:'🏖', sec:'Temporal' },
    { id:'cobranzas',      label:'Cobranzas',         icon:'💳', sec:'Temporal' },
    { id:'contratos_t',    label:'Contratos',         icon:'📋', sec:'Temporal' },
    { id:'checklist',      label:'Checklist',         icon:'✅', sec:'Temporal' },
    { id:'solicitudes',    label:'Solicitudes',       icon:'📩', sec:'Temporal' },
    { id:'limpieza_t',     label:'Limpieza',          icon:'🧹', sec:'Temporal' },
    { id:'temporadas_t',   label:'Temporadas',        icon:'📆', sec:'Temporal' },
    { id:'ical',           label:'iCal Sync',         icon:'🔄', sec:'Temporal' },
    { id:'gastos_t',       label:'Gastos',            icon:'🧾', sec:'Temporal' },
    { id:'liquidaciones_t',label:'Liquidaciones',     icon:'📑', sec:'Temporal' },
    { id:'notificaciones_t',label:'Notificaciones',   icon:'🔔', sec:'Temporal' },
    { id:'caja_t',         label:'Caja',              icon:'💵', sec:'Temporal' },
    { id:'reportes',       label:'Reportes',          icon:'📊', sec:'Temporal' },
    { id:'mi_perfil',      label:'Mi perfil',         icon:'⚙️', sec:'Admin' },
    { id:'equipo',         label:'Equipo',            icon:'👥', sec:'Admin' },
    ...(esSuperAdmin ? [{ id:'clientes', label:'Clientes GASP', icon:'🏢', sec:'Admin' }] : []),
  ]

  const NAV_INMO = [
    { id: 'tasaciones',  label: 'Tasaciones',  seccion: 'Inmo' },
    { id: 'cartera',     label: 'Cartera',      seccion: 'Inmo' },
    { id: 'crm_inmo',   label: 'CRM',          seccion: 'Inmo' },
    { id: 'perfil_inmo',label: 'Mi perfil',    seccion: 'Inmo' },
    ...(esSuperAdmin ? [{ id: 'clientes', label: 'Clientes', seccion: 'Inmo' }] : []),
  ]

  const NAV = modulo === 'anual' ? NAV_ANUAL : modulo === 'temporal' ? NAV_TEMP : NAV_INMO

  const secciones = [...new Set(NAV.map(n => n.sec || n.seccion).filter(Boolean))]

  return (
    <div style={{ minHeight:'100vh', fontFamily:'Segoe UI, Arial, sans-serif', position:'relative' }}>
      <Head>
        <title>GASP Full</title>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#080D1A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="GASP Full" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
      </Head>

      {menuAbierto && isMobile && (
        <div onClick={() => setMenuAbierto(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:199 }} />
      )}

      {/* ── SIDEBAR ── */}
      <aside style={{ width:240, background:BG_SIDEBAR, display:'flex', flexDirection:'column',
        position:'fixed', top:0, left:0, height:'100vh', zIndex:200, overflowY:'auto',
        transform: isMobile && !menuAbierto ? 'translateX(-100%)' : 'translateX(0)',
        transition:'transform 0.25s ease'
      }}>
        {/* Logo */}
        <div style={{ padding:'20px 16px 12px', borderBottom:'1px solid #1A2540' }}>
          <div style={{ fontSize:28, fontWeight:'bold', color:'#fff', letterSpacing:-0.5 }}>GASP</div>
          <div style={{ fontSize:11, color:'#4A6A8A', marginTop:2 }}>Sistema Completo</div>
        </div>

        {/* Selector de módulo */}
        <div style={{ padding:'12px 12px 8px' }}>
          <div style={{ fontSize:10, color:'#4A6A8A', fontWeight:'bold', letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:8 }}>Módulo activo</div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={() => { setModulo('anual'); setPagina('dashboard') }}
              style={{ flex:1, padding:'8px 4px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:'bold',
                background: modulo==='anual' ? AZ : '#111828',
                color: modulo==='anual' ? '#fff' : '#4A6A8A' }}>
              📋 Anual
            </button>
            <button onClick={() => { setModulo('temporal'); setPagina('dashboard') }}
              style={{ flex:1, padding:'8px 4px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:'bold',
                background: modulo==='temporal' ? VD : '#111828',
                color: modulo==='temporal' ? '#fff' : '#4A6A8A' }}>
              🏖 Temp.
            </button>
            <button onClick={() => { setModulo('inmo'); setPagina('tasaciones') }}
              style={{ flex:1, padding:'8px 4px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:'bold',
                background: modulo==='inmo' ? '#7C3AED' : '#111828',
                color: modulo==='inmo' ? '#fff' : '#4A6A8A' }}>
              🏘 Inmo
            </button>
          </div>
        </div>

        {/* Demo banner */}
        {demoInfo && (() => {
          const exp = new Date(demoInfo.fecha_expiracion)
          const dias = Math.ceil((exp - new Date()) / 86400000)
          return dias > 0 ? (
            <div style={{ margin:'0 12px 8px', background:'#2A1A0A', border:'1px solid #8B5E15', borderRadius:8, padding:'8px 12px', fontSize:11, color:'#E8A020' }}>
              ⏳ Demo — {dias} día{dias!==1?'s':''} restante{dias!==1?'s':''}
            </div>
          ) : null
        })()}

        {/* Navegación */}
        <nav style={{ flex:1, padding:'8px 0' }}>
          {secciones.map(sec => (
            <div key={sec}>
              <div style={{ fontSize:9, color:'#3A5A7A', fontWeight:'bold', letterSpacing:'0.15em', textTransform:'uppercase', padding:'10px 16px 4px' }}>{sec}</div>
              {NAV.filter(n => (n.sec || n.seccion) === sec).map(n => (
                <div key={n.id} onClick={() => { setPagina(n.id); setMenuAbierto(false) }}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 16px', cursor:'pointer', borderRadius:8, margin:'1px 8px',
                    background: pagina===n.id ? (modulo==='anual' ? 'rgba(26,63,160,0.2)' : 'rgba(27,107,53,0.2)') : 'transparent',
                    color: pagina===n.id ? (modulo==='anual' ? '#7aacff' : '#3acd70') : '#7A9ABF' }}>
                  <span style={{ fontSize:14 }}>{n.icon}</span>
                  <span style={{ fontSize:13 }}>{n.label}</span>
                  {pagina===n.id && <div style={{ marginLeft:'auto', width:3, height:16, borderRadius:2, background:ACCENT }} />}
                </div>
              ))}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding:'12px 16px', borderTop:'1px solid #1A2540' }}>
          <button onClick={logout}
            style={{ width:'100%', padding:'8px', borderRadius:8, background:'transparent', border:'1px solid #2A3A5A', color:'#6A8AAA', cursor:'pointer', fontSize:12 }}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div style={{ marginLeft: isMobile ? 0 : 240, minHeight:'100vh', display:'flex', flexDirection:'column',
        paddingBottom: isMobile ? 64 : 0 }}>

        {/* Header */}
        <div style={{ background:'#fff', borderBottom:'0.5px solid #ddd', padding:'0 24px', height:52,
          display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0,
          borderTop:`3px solid ${ACCENT}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {isMobile && (
              <button onClick={() => setMenuAbierto(m => !m)}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:'#333', padding:'4px 8px', lineHeight:1 }}>☰</button>
            )}
            <div style={{ fontWeight:'bold', fontSize:15, color: ACCENT }}>
              {NAV.find(n => n.id === pagina)?.label || 'Panel'}
            </div>
            <span style={{ background: modulo==='anual' ? '#E8EEFB' : '#E8F5EE',
              color: modulo==='anual' ? AZ : VD,
              fontSize:10, fontWeight:'bold', padding:'2px 8px', borderRadius:100 }}>
              {modulo === 'anual' ? 'ANUAL' : 'TEMPORARIO'}
            </span>
          </div>
          <button onClick={() => cargar()}
            style={{ padding:'5px 14px', borderRadius:6, border:'0.5px solid #ddd', background:'#F7F8FA', cursor:'pointer', fontSize:12 }}>
            ↺ Actualizar
          </button>
        </div>

        {/* Contenido */}
        <div style={{ flex:1, overflowY:'auto', padding:24 }}>
          {/* ── MÓDULO ANUAL ── */}
          {modulo === 'anual' && (
            <>
              {pagina === 'dashboard'      && <Dashboard props={propiedades} conts={conts} pags={pags} gasts={gasts} inquilinos={inquilinos} />}
              {pagina === 'propietarios'   && <Propietarios data={propietarios} onRefresh={cargar} />}
              {pagina === 'propiedades'    && <Propiedades data={propiedades} propietarios={propietarios} onRefresh={cargar} />}
              {pagina === 'inquilinos'     && <Inquilinos data={inquilinos} propiedades={propiedades} onRefresh={cargar} />}
              {pagina === 'contratos'      && <Contratos data={conts} propietarios={propietarios} inquilinos={inquilinos} propiedades={propiedades} perfil={perfil} onRefresh={cargar} />}
              {pagina === 'pagos'          && <Pagos data={pags} contratos={conts} gastos={gasts} perfil={perfil} propietarios={propietarios} inquilinos={inquilinos} propiedades={propiedades} onRefresh={cargar} />}
              {pagina === 'gastos'         && <Gastos data={gasts} propiedades={propiedades} onRefresh={cargar} />}
              {pagina === 'liquidaciones'  && <Liquidaciones contratos={conts} propietarios={propietarios} inquilinos={inquilinos} propiedades={propiedades} pagos={pags} gastos={gasts} perfil={perfil} cajaMov={cajaMov} onRefresh={cargar} />}
              {pagina === 'reportes'       && <Reportes contratos={conts} pagos={pags} propietarios={propietarios} inquilinos={inquilinos} propiedades={propiedades} gastos={gasts} perfil={perfil} />}
              {pagina === 'notificaciones' && <Notificaciones contratos={conts} propietarios={propietarios} inquilinos={inquilinos} pagos={pags} perfil={perfil} />}
              {pagina === 'caja'           && <Caja data={cajaMov} perfil={perfil} onRefresh={cargar} />}
              {pagina === 'garantias'      && <Garantias session={session} supabase={supabase} contratos={conts} inquilinos={inquilinos} />}
              {pagina === 'perfil'         && <PerfilAdmin perfil={perfil} onRefresh={cargar} />}
              {pagina === 'clientes'       && esSuperAdmin && <Clientes session={session} />}
            </>
          )}
          {/* ── MÓDULO TEMPORAL ── */}
          {modulo === 'temporal' && (
            <>
              {pagina === 'dashboard'       && <DashboardTemp reservas={reservas} propiedades={propiedadesTemp} propietarios={propietariosTemp} gastos={gastosTemp} />}
              {pagina === 'propietarios'    && <PropietariosTemp data={propietariosTemp} onRefresh={cargar} />}
              {pagina === 'propiedades'     && <PropiedadesTemp data={propiedadesTemp} propietarios={propietariosTemp} onRefresh={cargar} />}
              {pagina === 'calendario'      && <Calendario reservas={reservas} propiedades={propiedadesTemp} propietarios={propietariosTemp} />}
              {pagina === 'reservas'        && <Reservas reservas={reservas} propiedades={propiedadesTemp} propietarios={propietariosTemp} onRefresh={cargar} />}
              {pagina === 'cobranzas'       && <Cobranzas reservas={reservas} propiedades={propiedadesTemp} gastos={gastosTemp} onRefresh={cargar} />}
              {pagina === 'contratos_t'     && <ContratosTemp reservas={reservas} propiedades={propiedadesTemp} propietarios={propietariosTemp} perfil={perfil} />}
              {pagina === 'checklist'       && <Checklist reservas={reservas} propiedades={propiedadesTemp} onRefresh={cargar} />}
              {pagina === 'solicitudes'   && <Solicitudes adminId={adminId} propiedades={propiedadesTemp} onRefresh={cargar} />}
              {pagina === 'limpieza_t'      && <Limpieza adminId={adminId} reservas={reservas} propiedades={propiedadesTemp} onRefresh={cargar} />}
              {pagina === 'temporadas_t'    && <Temporadas adminId={adminId} propiedades={propiedadesTemp} />}
              {pagina === 'limpieza'     && <Limpieza adminId={adminId} reservas={reservas} propiedades={propiedadesTemp} onRefresh={cargar} />}
              {pagina === 'temporadas'   && <Temporadas adminId={adminId} propiedades={propiedadesTemp} />}
              {pagina === 'ical'           && <ICalSync session={session} supabase={supabase} propiedades={propiedadesTemp} />}
              {pagina === 'reportes'     && modulo === 'temporal' && <ReportesTemp reservas={reservas} propiedades={propiedadesTemp} propietarios={propietariosTemp} />}
              {pagina === 'gastos_t'        && <GastosTemp gastos={gastosTemp} propiedades={propiedadesTemp} propietarios={propietariosTemp} reservas={reservas} onRefresh={cargar} />}
              {pagina === 'liquidaciones_t' && <LiquidacionesTemp reservas={reservas} propiedades={propiedadesTemp} propietarios={propietariosTemp} gastos={gastosTemp} perfil={perfil} cajaMov={cajaTemp} onRefresh={cargar} />}
              {pagina === 'notificaciones_t'&& <NotificacionesTemp contratos={[]} propietarios={propietariosTemp} reservas={reservas} propiedades={propiedadesTemp} perfil={perfil} />}
              {pagina === 'caja_t'          && <CajaTemp data={cajaTemp} perfil={perfil} onRefresh={cargar} />}
              {pagina === 'mi_perfil'          && <PerfilAdminTemp perfil={perfil} onRefresh={cargar} session={session} />}
              {pagina === 'clientes'        && esSuperAdmin && <ClientesGaspTemp session={session} />}
            {pagina === 'reportes'   && modulo === 'temporal' && <ReportesTemp reservas={reservas} propiedades={propiedadesTemp} propietarios={propietariosTemp} />}
            {pagina === 'equipo'     && <GestionUsuarios session={session} supabase={supabase} />}
            </>
          )}
          {/* ── MÓDULO INMO ── */}
          {modulo === 'inmo' && (
            <>
              {pagina === 'estadisticas' ? (
                <EstadisticasMercado session={session} supabase={supabase} />
              ) : (
                <InmoSSO session={session} supabase={supabase} />
              )}
            </>
          )}

        </div>
      </div>

      {isMobile && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, height:56,
          background:BG_SIDEBAR, borderTop:`1px solid #1A2540`, display:'flex', zIndex:100 }}>
          {(modulo === 'anual'
            ? [{ id:'dashboard',icon:'📊',label:'Inicio'},{id:'contratos',icon:'📋',label:'Contratos'},
               {id:'pagos',icon:'💰',label:'Pagos'},{id:'liquidaciones',icon:'📑',label:'Liquid.'},{id:'caja',icon:'💵',label:'Caja'}]
            : [{id:'dashboard',icon:'📊',label:'Inicio'},{id:'reservas',icon:'🏖',label:'Reservas'},
               {id:'cobranzas',icon:'💳',label:'Cobros'},{id:'liquidaciones_t',icon:'📑',label:'Liquid.'},{id:'caja_t',icon:'💵',label:'Caja'}]
          ).map(n => (
            <button key={n.id} onClick={() => { setPagina(n.id); setMenuAbierto(false) }}
              style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:1,
                background:'none', border:'none', cursor:'pointer', padding:'6px 0',
                color: pagina===n.id ? (modulo==='anual' ? '#7aacff' : '#3acd70') : '#4A6A8A',
                borderTop: pagina===n.id ? `2px solid ${ACCENT}` : '2px solid transparent' }}>
              <span style={{ fontSize:18 }}>{n.icon}</span>
              <span style={{ fontSize:9, fontWeight: pagina===n.id ? 'bold' : 'normal' }}>{n.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
