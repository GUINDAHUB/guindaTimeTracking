import { uploadCSV } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { fileName, fileContent } = req.body
    
    if (!fileName || !fileContent) {
      return res.status(400).json({ error: 'fileName and fileContent are required' })
    }

    // Convertir el contenido base64 a Blob (manejo UTF-8)
    const binaryString = atob(fileContent)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: 'text/csv; charset=utf-8' })

    const result = await uploadCSV(blob, fileName)
    
    res.status(200).json({ 
      success: true, 
      data: result,
      message: 'CSV subido correctamente' 
    })
  } catch (error) {
    console.error('Error uploading CSV:', error)
    res.status(500).json({ 
      error: 'Error subiendo CSV', 
      details: error.message 
    })
  }
}
