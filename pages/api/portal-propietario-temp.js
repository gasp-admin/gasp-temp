// pages/api/portal-propietario-temp.js
// Proxy hacia la Edge Function de Supabase
export default async function handler(req, res) {
  const { id } = req.query
  if (!id) return res.status(400).json({ ok: false, error: 'ID requerido' })

  try {
    const EF_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/portal-propietario-temp`
    const resp = await fetch(`${EF_URL}?id=${id}`, {
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await resp.json()
    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message })
  }
}
