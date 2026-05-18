import { useState, useEffect } from 'react'
import Head from 'next/head'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const EF_URL = 'https://payzqbkydmvovjxlznuq.supabase.co/functions/v1'
const V = '#1B6B35'
const B = '#009EE3' // azul MP

function fmtMonto(monto, moneda) {
  const n = Number(monto || 0)
  if (moneda === 'USD') return 'USD ' + n.toLocaleString('es-AR', { minimumFractionDigits: 0 })
  return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0 })
}

export default function CheckIn() {
  const [reserva, setReserva] = useState(null)
  const [propiedad, setPropiedad] = useState(null)
  const [instrucciones, setInstrucciones] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('reserva')
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [generandoLink, setGenerandoLink] = useState(false)
  const [msgPago, setMsgPago] = useState(null)

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
        // Reserva
        const { data: res, error: err1 } = await supabase
          .from('reservas_temp')
          .select('*')
          .eq('id', id)
          .maybeSingle()

        if (err1) { setError('Error al cargar la reserva: ' + err1.message); setLoading(false); return }
        if (!res) { setError('Reserva no encontrada. Verificá que el link sea correcto.'); setLoading(false); return }

        setReserva(res)
        setForm(prev => ({
          ...prev,
          huesped_nombre: res.huesped_nombre || '',
          huesped_dni: res.huesped_dni || '',
          huesped_telefono: res.huesped_telefono || '',
          huesped_email: res.huesped_email || '',
          huesped_ciudad: res.huesped_ciudad || '',
        }))

        // Propiedad
        if (res.propiedad_id) {
          const { data: prop } = await supabase
            .from('prop_temp')
            .select('nombre, tipo, localidad, capacidad')
            .eq('id', res.propiedad_id)
            .maybeSingle()
          setPropiedad(prop)
        }

        // Instrucciones de acceso
        if (res.propiedad_id && res.admin_id) {
          const { data: inst } = await supabase
            .from('instrucciones_propiedad')
            .select('*')
            .eq('propiedad_id', res.propiedad_id)
            .eq('admin_id', res.admin_id)
            .maybeSingle()
          setInstrucciones(inst)
        }

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

  // Generar link de pago MP (llamada pública via api proxy, no necesita auth del huésped)
  async function generarLinkPago() {
    setGenerandoLink(true)
    setMsgPago(null)
    try {
      // Usamos un endpoint API del frontend que llama a la EF con el token del admin
      // en este caso el portal del huésped no tiene sesión, así que usamos
      // una API route de Next.js que actúa como proxy
      const res = await fetch('/api/generar-link-pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reserva_id: reserva.id })
      })
      const data = await res.json()
      if (data.ok && data.init_point) {
        setReserva(prev => ({ ...prev, link_pago_mp: data.init_point }))
        setMsgPago({ ok: true, text: 'Link generado correctamente' })
      } else {
        setMsgPago({ ok: false, text: data.error || 'No se pudo generar el link. Contactar al administrador.' })
      }
    } catch (e) {
      setMsgPago({ ok: false, text: 'Error de conexión.' })
    }
    setGenerandoLink(false)
  }

  const dias = reserva
    ? Math.ceil((new Date(reserva.fecha_salida) - new Date(reserva.fecha_entrada)) / 86400000)
    : 0

  // ── CAMPO CORRECTO: seña con ñ ──────────────────────────────────────
  // reserva['seña'] es el nombre real del campo en Supabase
  const montoSenia = reserva ? Number(reserva['seña'] || 0) : 0
  const montoTotal = reserva ? Number(reserva.monto_total || 0) : 0
  const saldo = montoTotal - montoSenia

  // ── ESTADOS DE PANTALLA ─────────────────────────────────────────────
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
          <div style={{ marginBottom: 6 }}>🏠 <strong>{propiedad?.nombre || reserva.propiedad_id}</strong></div>
          {propiedad?.localidad && <div style={{ color: '#6B7280', marginBottom: 6 }}>📍 {propiedad.localidad}</div>}
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

  const TABS = [
    { id: 'reserva', label: '📋 Reserva' },
    { id: 'acceso',  label: '🔑 Acceso' },
    { id: 'pago',    label: '💳 Pago seña' },
    { id: 'checkin', label: '✅ Check-in' },
  ]

  return (
    <>
      <Head>
        <title>Portal Huésped — {reserva.huesped_nombre || 'Tu reserva'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#F0FBF4', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

        {/* Header */}
        <div style={{ background: V, padding: '20px 20px 16px', color: '#fff' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Administración</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>¡Hola, {reserva.huesped_nombre?.split(',')[0] || reserva.huesped_nombre || 'Huésped'}!</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
              {reserva.fecha_entrada} → {reserva.fecha_salida} · {dias} {dias === 1 ? 'noche' : 'noches'}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', overflowX: 'auto' }}>
          <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  padding: '12px 14px', border: 'none', background: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: tab === t.id ? 700 : 400,
                  color: tab === t.id ? V : '#6B7280',
                  borderBottom: tab === t.id ? `2px solid ${V}` : '2px solid transparent',
                  whiteSpace: 'nowrap', flexShrink: 0
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px' }}>

          {/* ── TAB: RESERVA ── */}
          {tab === 'reserva' && (
            <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #E5E7EB', padding: '18px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>🏠 {propiedad?.nombre || reserva.propiedad_id}</div>
              {propiedad?.localidad && <div style={{ color: '#6B7280', fontSize: 13, marginBottom: 12 }}>📍 {propiedad.localidad}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', fontSize: 13, color: '#374151' }}>
                <div>
                  <div style={{ color: '#9CA3AF', fontSize: 11, marginBottom: 2 }}>Entrada</div>
                  <strong>{reserva.fecha_entrada && new Date(reserva.fecha_entrada).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
                </div>
                <div>
                  <div style={{ color: '#9CA3AF', fontSize: 11, marginBottom: 2 }}>Salida</div>
                  <strong>{reserva.fecha_salida && new Date(reserva.fecha_salida).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
                </div>
                <div>
                  <div style={{ color: '#9CA3AF', fontSize: 11, marginBottom: 2 }}>Noches</div>
                  <strong>{dias}</strong>
                </div>
                <div>
                  <div style={{ color: '#9CA3AF', fontSize: 11, marginBottom: 2 }}>Capacidad</div>
                  <strong>{propiedad?.capacidad ? `${propiedad.capacidad} personas` : '—'}</strong>
                </div>
                <div>
                  <div style={{ color: '#9CA3AF', fontSize: 11, marginBottom: 2 }}>Total</div>
                  <strong style={{ color: V }}>{fmtMonto(montoTotal, reserva.moneda)}</strong>
                </div>
                <div>
                  <div style={{ color: '#9CA3AF', fontSize: 11, marginBottom: 2 }}>Seña</div>
                  <strong>{fmtMonto(montoSenia, reserva.moneda)}</strong>
                </div>
                <div>
                  <div style={{ color: '#9CA3AF', fontSize: 11, marginBottom: 2 }}>Saldo al ingresar</div>
                  <strong>{fmtMonto(saldo, reserva.moneda)}</strong>
                </div>
                <div>
                  <div style={{ color: '#9CA3AF', fontSize: 11, marginBottom: 2 }}>Estado</div>
                  <strong style={{ color: reserva.estado === 'Confirmada' ? V : '#F59E0B' }}>{reserva.estado}</strong>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: ACCESO ── */}
          {tab === 'acceso' && (
            <div>
              {instrucciones ? (
                <div>
                  {/* Código de acceso */}
                  {instrucciones.codigo_acceso && (
                    <div style={{ background: '#0A0F1A', borderRadius: 12, padding: '20px 18px', marginBottom: 14, textAlign: 'center', border: '1px solid rgba(56,189,248,0.2)' }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>Código de acceso</div>
                      <div style={{ fontSize: 42, fontWeight: 800, color: '#22C55E', letterSpacing: 10, fontFamily: 'monospace' }}>{instrucciones.codigo_acceso}</div>
                    </div>
                  )}

                  {/* WiFi */}
                  {(instrucciones.wifi_nombre || instrucciones.wifi_clave) && (
                    <div style={{ background: '#fff', borderRadius: 10, border: '0.5px solid #E5E7EB', padding: '14px 16px', marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>📶 WiFi</div>
                      {instrucciones.wifi_nombre && <div style={{ fontWeight: 700, fontSize: 14 }}>{instrucciones.wifi_nombre}</div>}
                      {instrucciones.wifi_clave && <div style={{ color: '#6B7280', fontSize: 13, marginTop: 2 }}>Clave: <strong>{instrucciones.wifi_clave}</strong></div>}
                    </div>
                  )}

                  {/* Instrucciones */}
                  {instrucciones.instrucciones && (
                    <div style={{ background: '#fff', borderRadius: 10, border: '0.5px solid #E5E7EB', padding: '14px 16px', marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>📋 Instrucciones de acceso</div>
                      <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{instrucciones.instrucciones}</div>
                    </div>
                  )}

                  {/* Mapa */}
                  {instrucciones.direccion_maps && (
                    <a href={instrucciones.direccion_maps} target="_blank" rel="noreferrer"
                      style={{ display: 'block', textAlign: 'center', padding: '12px', background: '#3B82F6', color: '#fff', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none', marginBottom: 10 }}>
                      📍 Ver en Google Maps
                    </a>
                  )}

                  {/* Reglamento */}
                  {instrucciones.reglamento && (
                    <div style={{ background: '#FFF9F0', borderRadius: 10, border: '0.5px solid #FED7AA', padding: '14px 16px', marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: '#92400E', marginBottom: 6, fontWeight: 600 }}>📋 Reglamento</div>
                      <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{instrucciones.reglamento}</div>
                    </div>
                  )}

                  {/* Urgencias */}
                  {instrucciones.contacto_urgencias && (
                    <div style={{ background: '#FEF2F2', borderRadius: 10, border: '0.5px solid #FECACA', padding: '14px 16px' }}>
                      <div style={{ fontSize: 12, color: '#991B1B', marginBottom: 4, fontWeight: 600 }}>🆘 Contacto urgencias</div>
                      <div style={{ fontSize: 13, color: '#374151' }}>{instrucciones.contacto_urgencias}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🔑</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Instrucciones no disponibles</div>
                  <div style={{ fontSize: 13 }}>El administrador enviará las instrucciones de acceso próximamente.</div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: PAGO SEÑA ── */}
          {tab === 'pago' && (
            <div>
              {/* Resumen montos */}
              <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #E5E7EB', padding: '16px 18px', marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, color: '#6B7280' }}>Monto total</div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{fmtMonto(montoTotal, reserva.moneda)}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, color: '#6B7280' }}>Seña a pagar</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: montoSenia > 0 ? V : '#9CA3AF' }}>
                    {montoSenia > 0 ? fmtMonto(montoSenia, reserva.moneda) : '—'}
                  </div>
                </div>
                {saldo > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F3F4F6', paddingTop: 10 }}>
                    <div style={{ fontSize: 13, color: '#6B7280' }}>Saldo al ingresar</div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#374151' }}>{fmtMonto(saldo, reserva.moneda)}</div>
                  </div>
                )}
              </div>

              {/* Estado del pago */}
              {reserva.senia_pagada_mp ? (
                // ✅ Seña pagada via MP
                <div style={{ background: '#D1FAE5', borderRadius: 12, padding: '20px 18px', textAlign: 'center', border: '1px solid #6EE7B7' }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: V, marginBottom: 4 }}>¡Seña pagada!</div>
                  <div style={{ fontSize: 13, color: '#065F46' }}>El pago fue confirmado correctamente.</div>
                </div>

              ) : montoSenia <= 0 ? (
                // Sin monto definido
                <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '24px 18px', textAlign: 'center', border: '0.5px solid #E5E7EB' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#374151', marginBottom: 6 }}>Coordinar pago con el administrador</div>
                  <div style={{ fontSize: 13, color: '#6B7280' }}>El monto de la seña se acordará directamente.</div>
                </div>

              ) : reserva.link_pago_mp ? (
                // ✅ Link disponible — mostrar botón de pago
                <div>
                  <a
                    href={reserva.link_pago_mp}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'block', textAlign: 'center', padding: '16px',
                      background: B, color: '#fff', borderRadius: 12,
                      fontWeight: 700, fontSize: 16, textDecoration: 'none',
                      boxShadow: '0 4px 12px rgba(0,158,227,0.3)',
                      marginBottom: 12
                    }}>
                    💳 Pagar seña — {fmtMonto(montoSenia, reserva.moneda)}
                  </a>
                  <div style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.5 }}>
                    Serás redirigido a Mercado Pago para completar el pago de forma segura.<br />
                    Podés pagar con tarjeta de crédito, débito o dinero en cuenta MP.
                  </div>
                </div>

              ) : (
                // Sin link — opción de generar o contactar
                <div style={{ textAlign: 'center' }}>
                  <div style={{ background: '#F3F4F6', borderRadius: 12, padding: '24px 18px', marginBottom: 14 }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>💳</div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#374151', marginBottom: 6 }}>
                      Pago online no disponible aún
                    </div>
                    <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>
                      El administrador aún no generó el link de pago online.<br />
                      Podés coordinar el pago directamente:
                    </div>
                  </div>

                  <div style={{ background: '#fff', borderRadius: 10, border: '0.5px solid #E5E7EB', padding: '14px 16px', textAlign: 'left' }}>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>📞 Alternativas de pago</div>
                    <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
                      • Transferencia bancaria<br />
                      • Efectivo al momento del ingreso<br />
                      • Contactar al administrador para más opciones
                    </div>
                  </div>

                  {msgPago && (
                    <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: msgPago.ok ? '#D1FAE5' : '#FEE2E2', color: msgPago.ok ? '#065F46' : '#991B1B', fontSize: 13 }}>
                      {msgPago.text}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: CHECK-IN ── */}
          {tab === 'checkin' && (
            <div>
              {reserva.checkin_confirmado ? (
                <div style={{ background: '#D1FAE5', borderRadius: 12, padding: '24px 18px', textAlign: 'center', border: '1px solid #6EE7B7', marginBottom: 16 }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: V }}>¡Check-in confirmado!</div>
                  <div style={{ fontSize: 13, color: '#065F46', marginTop: 4 }}>
                    {reserva.checkin_fecha && `Registrado el ${new Date(reserva.checkin_fecha).toLocaleDateString('es-AR')}`}
                  </div>
                </div>
              ) : null}

              <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #E5E7EB', padding: '20px 18px' }}>
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

                {/* Reglamento desde instrucciones o default */}
                <div style={{ background: '#F0FBF4', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>📋 Reglamento de la propiedad</div>
                  {instrucciones?.reglamento ? (
                    <div style={{ color: '#6B7280', whiteSpace: 'pre-line' }}>{instrucciones.reglamento}</div>
                  ) : (
                    <ul style={{ margin: '4px 0', paddingLeft: 18, color: '#6B7280' }}>
                      <li>No se permiten fiestas ni eventos sin autorización previa</li>
                      <li>Horario de silencio: 23hs a 8hs</li>
                      <li>Está prohibido fumar en el interior</li>
                      <li>El huésped es responsable por daños causados durante la estadía</li>
                      <li>El check-out es hasta las 10:00hs del día de salida</li>
                    </ul>
                  )}
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
            </div>
          )}

          <div style={{ textAlign: 'center', color: '#D1D5DB', fontSize: 11, paddingBottom: 24, marginTop: 12 }}>
            Powered by GASP Temporario · Datos seguros
          </div>
        </div>
      </div>
    </>
  )
}
