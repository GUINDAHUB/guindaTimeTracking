import { getCSVFiles } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const files = await getCSVFiles()
    
    res.status(200).json({ 
      success: true, 
      data: files,
      message: 'Lista de CSVs obtenida correctamente' 
    })
  } catch (error) {
    console.error('Error getting CSV files:', error)
    res.status(500).json({ 
      error: 'Error obteniendo lista de CSVs', 
      details: error.message 
    })
  }
}
