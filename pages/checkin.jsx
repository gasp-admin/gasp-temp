import { useState, useEffect } from 'react'
import Head from 'next/head'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function CheckIn() {
  const [reserva, setReserva] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)

  // Form data — pre-cargado desde la reserva, editable por el huésped
  const [form, setForm] = useState({
    huesped_nombre: '',
    huesped_dni: '',
    huesped_telefono: '',
    huesped_email: '',
    huesped_ciudad: '',
    vehiculo_patente: '',
    vehiculo_modelo: '',
    hora_llegada: '',
    cantidad_personas: '',
    observaciones_checkin: '',
    acepta_reglamento: false,
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    if (!id) { setError('Link inválido. Solicitá el link correcto a tu administrador.'); setLoading(false); return }

    async function cargar() {
      try {
        // Query 1: reserva por ID (sin join)
        const { data: res, error: err1 } = await supabase
          .from('reservas_temp')
          .select('*')
          .eq('id', id)
          .maybeSingle()

        if (err1) { setError('Error al cargar la reserva: ' + err1.message); setLoading(false); return }
        if (!res) { setError('Reserva no encontrada. Verificá que el link sea correcto.'); setLoading(false); return }

        // Query 2: datos de la propiedad (separado para no depender de FK en el join)
        let propData = null
        if (res.propiedad_id) {
          const { data: prop } = await supabase
            .from('prop_temp')
            .select('nombre, direccion')
            .eq('id', res.propiedad_id)
            .maybeSingle()
          propData = prop
        }

        setReserva({ ...res, prop_temp: propData })
        setForm(prev => ({
          ...prev,
          huesped_nombre: res.huesped_nombre || '',
          huesped_dni: res.huesped_dni || '',
          huesped_telefono: res.huesped_telefono || '',
          huesped_email: res.huesped_email || '',
          huesped_ciudad: res.huesped_ciudad || '',
        }))
      } catch (e) {
        setError('Error de conexión: ' + e.message)
      }
      setLoading(false)
    }
    cargar()
  }, [])

  async function enviarCheckin() {
    if (!form.huesped_nombre || !form.huesped_dni || !form.hora_llegada) {
      alert('Completá nombre, DNI y hora estimada de llegada.')
      return
    }
    if (!form.acepta_reglamento) {
      alert('Debés aceptar el reglamento de la propiedad para confirmar el check-in.')
      return
    }
    setEnviando(true)
    const { error: err } = await supabase
      .from('reservas_temp')
      .update({
        huesped_nombre: form.huesped_nombre,
        huesped_dni: form.huesped_dni,
        huesped_telefono: form.huesped_telefono,
        huesped_email: form.huesped_email,
        huesped_ciudad: form.huesped_ciudad,
        vehiculo_patente: form.vehiculo_patente || null,
        vehiculo_modelo: form.vehiculo_modelo || null,
        hora_llegada_estimada: form.hora_llegada || null,
        cantidad_personas: form.cantidad_personas ? Number(form.cantidad_personas) : null,
        observaciones_checkin: form.observaciones_checkin || null,
        checkin_confirmado: true,
        checkin_fecha: new Date().toISOString(),
      })
      .eq('id', reserva.id)
    if (err) { alert('Error al guardar: ' + err.message); setEnviando(false); return }
    setEnviado(true)
    setEnviando(false)
  }

  const V = '#1B6B35'
  const dias = reserva ? Math.ceil((new Date(reserva.fecha_salida) - new Date(reserva.fecha_entrada)) / 86400000) : 0

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0FBF4', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', color: '#666' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🏖</div>
        <div style={{ fontSize: 14, color: '#555' }}>Cargando tu reserva...</div>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0FBF4', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', padding: 32, maxWidth: 360 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Link inválido</div>
        <div style={{ color: '#666', fontSize: 13 }}>{error}</div>
      </div>
    </div>
  )

  if (enviado) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0FBF4', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', padding: 32, maxWidth: 440 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <div style={{ fontWeight: 700, fontSize: 22, color: V, marginBottom: 8 }}>¡Check-in confirmado!</div>
        <div style={{ color: '#374151', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          Gracias, <strong>{form.huesped_nombre}</strong>. Tu información fue recibida correctamente.<br />
          Te esperamos el <strong>{reserva.fecha_entrada && new Date(reserva.fecha_entrada).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
          {form.hora_llegada && ` alrededor de las ${form.hora_llegada}`}.
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '0.5px solid #D1FAE5', fontSize: 13, color: '#374151', textAlign: 'left' }}>
          <div style={{ marginBottom: 6 }}>🏠 <strong>{reserva.prop_temp?.nombre || reserva.propiedad_id}</strong></div>
          {reserva.prop_temp?.direccion && <div style={{ color: '#6B7280', marginBottom: 6 }}>📍 {reserva.prop_temp.direccion}</div>}
          <div>📅 {reserva.fecha_entrada} → {reserva.fecha_salida} ({dias} {dias === 1 ? 'noche' : 'noches'})</div>
        </div>
        <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 16 }}>Powered by GASP Temporario</div>
      </div>
    </div>
  )

  const Input2 = ({ label, value, onChange, type = 'text', required, placeholder }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
        {label}{required && <span style={{ color: '#EF4444' }}> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #D1D5DB', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', background: '#fff' }}
      />
    </div>
  )

  return (
    <>
      <Head>
        <title>Check-in — {reserva.huesped_nombre || 'Tu reserva'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#F0FBF4', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

        {/* Header */}
        <div style={{ background: V, padding: '20px 20px 28px', color: '#fff' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 6 }}>GASP Alquileres Temporarios</div>
            <div style={{ fontSize: 21, fontWeight: 700, marginBottom: 4 }}>🏖 Check-in digital</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>Confirmá tus datos antes de llegar</div>
          </div>
        </div>

        <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px' }}>

          {/* Resumen reserva */}
          <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #D1FAE5', padding: '16px 18px', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#111', marginBottom: 10 }}>
              🏠 {reserva.prop_temp?.nombre || reserva.propiedad_id}
            </div>
            {reserva.prop_temp?.direccion && (
              <div style={{ color: '#6B7280', fontSize: 13, marginBottom: 8 }}>📍 {reserva.prop_temp.direccion}</div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 13, color: '#374151' }}>
              <div><span style={{ color: '#9CA3AF', fontSize: 11 }}>Entrada</span><br /><strong>{reserva.fecha_entrada && new Date(reserva.fecha_entrada).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></div>
              <div><span style={{ color: '#9CA3AF', fontSize: 11 }}>Salida</span><br /><strong>{reserva.fecha_salida && new Date(reserva.fecha_salida).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></div>
              <div><span style={{ color: '#9CA3AF', fontSize: 11 }}>Noches</span><br /><strong>{dias}</strong></div>
              <div><span style={{ color: '#9CA3AF', fontSize: 11 }}>Estado</span><br />
                <span style={{ fontWeight: 700, color: reserva.checkin_confirmado ? V : '#F59E0B' }}>
                  {reserva.checkin_confirmado ? '✓ Confirmado' : '⏳ Pendiente'}
                </span>
              </div>
            </div>
          </div>

          {/* Formulario */}
          <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #E5E7EB', padding: '20px 18px', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 16 }}>Datos del huésped</div>

            <Input2 label="Apellido y nombre" value={form.huesped_nombre} onChange={v => setForm({...form, huesped_nombre: v})} required placeholder="García, Juan Carlos" />
            <Input2 label="DNI / Pasaporte" value={form.huesped_dni} onChange={v => setForm({...form, huesped_dni: v})} required placeholder="30.123.456" />
            <Input2 label="Teléfono / WhatsApp" value={form.huesped_telefono} onChange={v => setForm({...form, huesped_telefono: v})} type="tel" placeholder="+54 11 1234-5678" />
            <Input2 label="Email" value={form.huesped_email} onChange={v => setForm({...form, huesped_email: v})} type="email" placeholder="email@ejemplo.com" />
            <Input2 label="Ciudad de origen" value={form.huesped_ciudad} onChange={v => setForm({...form, huesped_ciudad: v})} placeholder="Buenos Aires" />

            <div style={{ borderTop: '0.5px solid #F3F4F6', margin: '16px 0' }} />
            <div style={{ fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 14 }}>Datos de llegada</div>

            <Input2 label="Hora estimada de llegada" value={form.hora_llegada} onChange={v => setForm({...form, hora_llegada: v})} type="time" required />
            <Input2 label="Cantidad de personas" value={form.cantidad_personas} onChange={v => setForm({...form, cantidad_personas: v})} type="number" placeholder="2" />

            <div style={{ borderTop: '0.5px solid #F3F4F6', margin: '16px 0' }} />
            <div style={{ fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 14 }}>Vehículo (opcional)</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input2 label="Patente" value={form.vehiculo_patente} onChange={v => setForm({...form, vehiculo_patente: v})} placeholder="ABC123" />
              <Input2 label="Modelo" value={form.vehiculo_modelo} onChange={v => setForm({...form, vehiculo_modelo: v})} placeholder="Peugeot 208" />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Observaciones</label>
              <textarea
                value={form.observaciones_checkin}
                onChange={e => setForm({...form, observaciones_checkin: e.target.value})}
                placeholder="Llegamos tarde, venimos con mascota, necesitamos cuna, etc."
                rows={3}
                style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #D1D5DB', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            {/* Reglamento */}
            <div style={{ background: '#F0FBF4', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>📋 Reglamento de la propiedad</div>
              <ul style={{ margin: '4px 0', paddingLeft: 18, color: '#6B7280' }}>
                <li>No se permiten fiestas ni eventos sin autorización previa</li>
                <li>Horario de silencio: 23hs a 8hs</li>
                <li>Está prohibido fumar en el interior</li>
                <li>El huésped es responsable por daños causados durante la estadía</li>
                <li>El check-out es hasta las 10:00hs del día de salida</li>
              </ul>
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: '#374151', marginBottom: 20 }}>
              <input
                type="checkbox"
                checked={form.acepta_reglamento}
                onChange={e => setForm({...form, acepta_reglamento: e.target.checked})}
                style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0 }}
              />
              <span>Acepto el reglamento de la propiedad y me comprometo a cumplirlo durante toda mi estadía.</span>
            </label>

            <button
              onClick={enviarCheckin}
              disabled={enviando}
              style={{ width: '100%', padding: '13px', borderRadius: 10, background: enviando ? '#9CA3AF' : V, color: '#fff', border: 'none', cursor: enviando ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 700 }}
            >
              {enviando ? '⏳ Enviando...' : '✅ Confirmar check-in'}
            </button>
          </div>

          <div style={{ textAlign: 'center', color: '#D1D5DB', fontSize: 11, paddingBottom: 20 }}>
            Powered by GASP Temporario · Datos seguros
          </div>
        </div>
      </div>
    </>
  )
}
