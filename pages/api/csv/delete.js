import { deleteCSV } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { fileName } = req.body
    
    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' })
    }

    const result = await deleteCSV(fileName)
    
    res.status(200).json({ 
      success: true, 
      data: result,
      message: 'CSV eliminado correctamente' 
    })
  } catch (error) {
    console.error('Error deleting CSV:', error)
    res.status(500).json({ 
      error: 'Error eliminando CSV', 
      details: error.message 
    })
  }
}
