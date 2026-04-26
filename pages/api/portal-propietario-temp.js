// API portal propietario - GASP Temporario
// Proxy hacia Edge Function de Supabase que calcula neto real (bruto - comision - gastos)

export default async function handler(req, res) {
  const { id } = req.query
  if (!id) return res.status(200).json({ ok: false, error: 'ID no especificado' })

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/portal-propietario-temp?id=' + id
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const resp = await fetch(url, {
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
    })
    const data = await resp.json()
    return res.status(200).json(data)
  } catch (err) {
    return res.status(200).json({ ok: false, error: err.message })
  }
}
