// API portal propietario - GASP Temporario

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
    const propData = await sbFetch('prop_owners_temp', 'id=eq.' + id + '&select=*')
    if (!propData || propData.length === 0)
      return res.status(200).json({ ok: false, error: 'Propietario no encontrado' })

    const propietario = propData[0]
    const adminId = propietario.admin_id

    const [propsData, reservasData, gastosData, cajaData] = await Promise.all([
      sbFetch('prop_temp', 'propietario_id=eq.' + id + '&activo=eq.true&admin_id=eq.' + adminId + '&select=*'),
      sbFetch('reservas_temp', 'admin_id=eq.' + adminId + '&select=*&order=fecha_entrada.desc'),
      sbFetch('gastos_temp', 'admin_id=eq.' + adminId + '&responsable=eq.Propietario&select=*'),
      sbFetch('caja_temp', 'tipo=eq.Egreso&categoria=eq.Pago%20a%20propietario&admin_id=eq.' + adminId + '&select=*&order=fecha.desc'),
    ])

    const propiedades = propsData || []
    const propIds = propiedades.map(p => p.id)
    const hoy = new Date().toISOString().split('T')[0]

    const todasReservas = (reservasData || []).filter(r =>
      propIds.includes(r.propiedad_id) && r.estado !== 'Cancelada'
    )
    const reservasActivas = todasReservas.filter(r => r.fecha_salida >= hoy)
    const historial = todasReservas.filter(r => r.fecha_salida < hoy)

    // Totales brutos y comisiones
    const totalBrutoARS = todasReservas.filter(r => r.moneda === 'ARS').reduce((s, r) => s + Number(r.monto_total || 0), 0)
    const totalBrutoUSD = todasReservas.filter(r => r.moneda === 'USD').reduce((s, r) => s + Number(r.monto_total || 0), 0)
    const totalComisionARS = todasReservas.filter(r => r.moneda === 'ARS').reduce((s, r) => s + Number(r.comision || 0), 0)
    const totalComisionUSD = todasReservas.filter(r => r.moneda === 'USD').reduce((s, r) => s + Number(r.comision || 0), 0)

    // Gastos del propietario — filtrados por propietario_id O por propiedad del propietario
    const gastosDelProp = (gastosData || []).filter(g =>
      g.propietario_id === id || propIds.includes(g.propiedad_id)
    )
    const totalGastosARS = gastosDelProp.filter(g => g.moneda !== 'USD').reduce((s, g) => s + Number(g.importe || 0), 0)
    const totalGastosUSD = gastosDelProp.filter(g => g.moneda === 'USD').reduce((s, g) => s + Number(g.importe || 0), 0)

    // Neto real = bruto - comision - gastos propietario
    const totalNetoARS = totalBrutoARS - totalComisionARS - totalGastosARS
    const totalNetoUSD = totalBrutoUSD - totalComisionUSD - totalGastosUSD

    // Pagos realizados al propietario
    const apellido = (propietario.apellido_nombre || '').toLowerCase().split(',')[0].trim()
    const pagosRealizados = (cajaData || []).filter(m =>
      (m.concepto || '').toLowerCase().includes(apellido)
    )
    const totalPagadoARS = pagosRealizados.filter(p => p.moneda !== 'USD').reduce((s, p) => s + Number(p.importe || 0), 0)
    const totalPagadoUSD = pagosRealizados.filter(p => p.moneda === 'USD').reduce((s, p) => s + Number(p.importe || 0), 0)

    return res.status(200).json({
      ok: true, propietario, propiedades, reservasActivas, historial,
      totalBrutoARS, totalBrutoUSD,
      totalComisionARS, totalComisionUSD,
      totalGastosARS, totalGastosUSD,
      totalNetoARS, totalNetoUSD,
      pagosRealizados, totalPagadoARS, totalPagadoUSD,
    })
  } catch (err) {
    return res.status(200).json({ ok: false, error: err.message })
  }
}
