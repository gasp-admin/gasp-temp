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
              text: `Analizá este documento de alquiler temporario (puede ser contrato, comprobante de reserva, recibo o similar).
Extraé SOLO estos datos y devolvé UNICAMENTE un JSON válido sin markdown, sin backticks, sin texto adicional:
{
  "huesped_nombre": "Apellido y nombre del huesped/locatario/inquilino",
  "huesped_dni": "DNI del huesped",
  "huesped_telefono": "Telefono del huesped",
  "huesped_email": "Email del huesped",
  "huesped_ciudad": "Ciudad de origen del huesped",
  "fecha_entrada": "fecha de ingreso/entrada en formato YYYY-MM-DD",
  "fecha_salida": "fecha de egreso/salida en formato YYYY-MM-DD",
  "modalidad": "Diaria o Semanal segun corresponda",
  "moneda": "ARS si es pesos, USD si es dolares",
  "monto_total": numero del monto total de la reserva sin simbolos,
  "sena": numero de la seña/anticipo/deposito sin simbolos,
  "observaciones": "cualquier dato relevante adicional"
}
Reglas: Si un dato no aparece en el documento, usa "" para textos y 0 para numeros. Responde SOLO el JSON.`
            }
          ]
        }]
      })
    })

    const data = await response.json()

    if (data.error) {
      return res.status(500).json({ ok: false, error: data.error.message || 'Error de API' })
    }

    const textBlock = data.content?.find(b => b.type === 'text')
    const txt = textBlock?.text || '{}'

    // Limpiar cualquier markdown
    const clean = txt
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    let parsed = {}
    try {
      parsed = JSON.parse(clean)
    } catch (_) {
      // Si falla el parse, intentar extraer JSON del texto
      const match = clean.match(/\{[\s\S]*\}/)
      if (match) {
        try { parsed = JSON.parse(match[0]) } catch (__) { parsed = {} }
      }
    }

    // Normalizar: convertir sena -> seña para el frontend
    const datos = {
      huesped_nombre: parsed.huesped_nombre || '',
      huesped_dni: String(parsed.huesped_dni || ''),
      huesped_telefono: String(parsed.huesped_telefono || ''),
      huesped_email: parsed.huesped_email || '',
      huesped_ciudad: parsed.huesped_ciudad || '',
      fecha_entrada: parsed.fecha_entrada && parsed.fecha_entrada !== 'YYYY-MM-DD' ? parsed.fecha_entrada : '',
      fecha_salida: parsed.fecha_salida && parsed.fecha_salida !== 'YYYY-MM-DD' ? parsed.fecha_salida : '',
      modalidad: parsed.modalidad || 'Diaria',
      moneda: parsed.moneda === 'USD' ? 'USD' : 'ARS',
      monto_total: Number(parsed.monto_total) || 0,
      sena: Number(parsed.sena) || 0,
      observaciones: parsed.observaciones || '',
    }

    return res.status(200).json({ ok: true, datos })

  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message })
  }
}
