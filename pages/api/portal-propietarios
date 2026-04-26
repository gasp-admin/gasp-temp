// API portal propietario - GASP Temporario
// Lee tablas _temp + caja_temp para pagos realizados

function generarToken(id) {
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

async function sbFetch(table, params) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/' + table + '?' + params
  const resp = await fetch(url, {
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  })
  return resp.json()
}

export default async function handler(req, res) {
  const { id, token } = req.query
  if (!id || !token) return res.status(200).json({ ok: false, error: 'Parametros faltantes' })

  const tokenEsperado = generarToken(id)
  if (token !== tokenEsperado) return res.status(200).json({ ok: false, error: 'Token invalido' })

  try {
    const [propData, propsData, reservasData, cajaData] = await Promise.all([
      sbFetch('prop_owners_temp', 'id=eq.' + id + '&select=*'),
      sbFetch('prop_temp', 'propietario_id=eq.' + id + '&activo=eq.true&select=*'),
      sbFetch('reservas_temp', 'select=*&order=fecha_entrada.desc'),
      sbFetch('caja_temp', 'tipo=eq.Egreso&categoria=eq.Pago%20a%20propietario&select=*&order=fecha.desc'),
    ])

    if (!propData || propData.length === 0) return res.status(200).json({ ok: false, error: 'Propietario no encontrado' })

    const propietario = propData[0]
    const propiedades = propsData || []
    const propIds = propiedades.map(p => p.id)

    // Reservas de las propiedades del propietario
    const reservas = (reservasData || []).filter(r => propIds.includes(r.propiedad_id))

    const reservasActivas = reservas.filter(r =>
      r.estado !== 'Cancelada' && r.fecha_salida >= new Date().toISOString().split('T')[0]
    )
    const historial = reservas.filter(r =>
      r.estado !== 'Cancelada' && r.fecha_salida < new Date().toISOString().split('T')[0]
    )

    // Totales
    const totalBrutoARS = reservas.filter(r => r.moneda === 'ARS' && r.estado !== 'Cancelada').reduce((s, r) => s + Number(r.monto_total || 0), 0)
    const totalBrutoUSD = reservas.filter(r => r.moneda === 'USD' && r.estado !== 'Cancelada').reduce((s, r) => s + Number(r.monto_total || 0), 0)
    const totalComisionARS = reservas.filter(r => r.moneda === 'ARS' && r.estado !== 'Cancelada').reduce((s, r) => s + Number(r.comision || 0), 0)
    const totalComisionUSD = reservas.filter(r => r.moneda === 'USD' && r.estado !== 'Cancelada').reduce((s, r) => s + Number(r.comision || 0), 0)
    const totalNetoARS = totalBrutoARS - totalComisionARS
    const totalNetoUSD = totalBrutoUSD - totalComisionUSD

    // Pagos realizados — filtrar por nombre del propietario
    const apellido = (propietario.apellido_nombre || '').toLowerCase().split(',')[0].trim()
    const pagosRealizados = (cajaData || []).filter(m =>
      (m.concepto || '').toLowerCase().includes(apellido)
    )
    const totalPagadoARS = pagosRealizados.filter(p => p.moneda !== 'USD').reduce((s, p) => s + Number(p.importe || 0), 0)
    const totalPagadoUSD = pagosRealizados.filter(p => p.moneda === 'USD').reduce((s, p) => s + Number(p.importe || 0), 0)

    return res.status(200).json({
      ok: true,
      propietario,
      propiedades,
      reservasActivas,
      historial,
      totalBrutoARS, totalBrutoUSD,
      totalComisionARS, totalComisionUSD,
      totalNetoARS, totalNetoUSD,
      pagosRealizados,
      totalPagadoARS, totalPagadoUSD,
    })
  } catch (err) {
    return res.status(200).json({ ok: false, error: err.message })
  }
}
