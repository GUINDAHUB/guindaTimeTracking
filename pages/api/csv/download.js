import { downloadCSV } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { fileName } = req.query
    
    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' })
    }

    const blob = await downloadCSV(fileName)
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    res.send(buffer)
  } catch (error) {
    console.error('Error downloading CSV:', error)
    res.status(500).json({ 
      error: 'Error descargando CSV', 
      details: error.message 
    })
  }
}
