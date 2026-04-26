// API portal propietario - GASP Temporario
// Acceso por ID — sin validación de token

async function sbFetch(table, params) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/' + table + '?' + params
  const resp = await fetch(url, {
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  })
  return resp.json()
}

export default async function handler(req, res) {
  const { id } = req.query
  if (!id) return res.status(200).json({ ok: false, error: 'ID no especificado' })

  try {
    const [propData, propsData, reservasData, cajaData] = await Promise.all([
      sbFetch('prop_owners_temp', 'id=eq.' + id + '&select=*'),
      sbFetch('prop_temp', 'propietario_id=eq.' + id + '&activo=eq.true&select=*'),
      sbFetch('reservas_temp', 'select=*&order=fecha_entrada.desc'),
      sbFetch('caja_temp', 'tipo=eq.Egreso&categoria=eq.Pago%20a%20propietario&select=*&order=fecha.desc'),
    ])

    if (!propData || propData.length === 0)
      return res.status(200).json({ ok: false, error: 'Propietario no encontrado' })

    const propietario = propData[0]
    const propiedades = propsData || []
    const propIds = propiedades.map(p => p.id)
    const hoy = new Date().toISOString().split('T')[0]

    const todasReservas = (reservasData || []).filter(r =>
      propIds.includes(r.propiedad_id) && r.estado !== 'Cancelada'
    )
    const reservasActivas = todasReservas.filter(r => r.fecha_salida >= hoy)
    const historial = todasReservas.filter(r => r.fecha_salida < hoy)

    const totalBrutoARS = todasReservas.filter(r => r.moneda === 'ARS').reduce((s, r) => s + Number(r.monto_total || 0), 0)
    const totalBrutoUSD = todasReservas.filter(r => r.moneda === 'USD').reduce((s, r) => s + Number(r.monto_total || 0), 0)
    const totalComisionARS = todasReservas.filter(r => r.moneda === 'ARS').reduce((s, r) => s + Number(r.comision || 0), 0)
    const totalComisionUSD = todasReservas.filter(r => r.moneda === 'USD').reduce((s, r) => s + Number(r.comision || 0), 0)
    const totalNetoARS = totalBrutoARS - totalComisionARS
    const totalNetoUSD = totalBrutoUSD - totalComisionUSD

    const apellido = (propietario.apellido_nombre || '').toLowerCase().split(',')[0].trim()
    const pagosRealizados = (cajaData || []).filter(m =>
      (m.concepto || '').toLowerCase().includes(apellido)
    )
    const totalPagadoARS = pagosRealizados.filter(p => p.moneda !== 'USD').reduce((s, p) => s + Number(p.importe || 0), 0)
    const totalPagadoUSD = pagosRealizados.filter(p => p.moneda === 'USD').reduce((s, p) => s + Number(p.importe || 0), 0)

    return res.status(200).json({
      ok: true, propietario, propiedades, reservasActivas, historial,
      totalBrutoARS, totalBrutoUSD, totalComisionARS, totalComisionUSD,
      totalNetoARS, totalNetoUSD, pagosRealizados, totalPagadoARS, totalPagadoUSD,
    })
  } catch (err) {
    return res.status(200).json({ ok: false, error: err.message })
  }
}
