export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' })

  try {
    const { base64, mediaType } = req.body
    if (!base64) return res.status(400).json({ ok: false, error: 'base64 requerido' })

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: mediaType || 'application/pdf', data: base64 }
            },
            {
              type: 'text',
              text: 'Extraé del contrato de alquiler temporario SOLO los siguientes datos en JSON puro sin markdown ni backticks ni explicaciones: {"huesped_nombre":"","huesped_dni":"","huesped_telefono":"","huesped_email":"","huesped_ciudad":"","fecha_entrada":"YYYY-MM-DD","fecha_salida":"YYYY-MM-DD","modalidad":"Diaria o Semanal","moneda":"ARS o USD","monto_total":0,"sena":0,"observaciones":""}. Si no encontras un dato dejalo vacio o 0. Responde SOLO el JSON.'
            }
          ]
        }]
      })
    })

    const data = await response.json()
    const textBlock = data.content?.find(b => b.type === 'text')
    const txt = textBlock?.text || '{}'
    const clean = txt.replace(/```json/g, '').replace(/```/g, '').trim()

    let parsed = {}
    try { parsed = JSON.parse(clean) } catch (_) { parsed = {} }

    if ('sena' in parsed) { parsed['sena_val'] = parsed['sena']; delete parsed['sena'] }

    return res.status(200).json({ ok: true, datos: parsed, sena: parsed['sena_val'] || 0 })
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message })
  }
}
