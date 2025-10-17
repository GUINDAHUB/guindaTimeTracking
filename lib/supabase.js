import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase - reemplaza con tus valores
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Función para subir un archivo CSV a Supabase Storage
export async function uploadCSV(file, fileName) {
  const { data, error } = await supabase.storage
    .from('csv-files')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })
  
  if (error) throw error
  return data
}

// Función para obtener la lista de archivos CSV
export async function getCSVFiles() {
  const { data, error } = await supabase.storage
    .from('csv-files')
    .list('', {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' }
    })
  
  if (error) throw error
  return data
}

// Función para descargar un archivo CSV
export async function downloadCSV(fileName) {
  const { data, error } = await supabase.storage
    .from('csv-files')
    .download(fileName)
  
  if (error) throw error
  return data
}

// Función para eliminar un archivo CSV
export async function deleteCSV(fileName) {
  const { data, error } = await supabase.storage
    .from('csv-files')
    .remove([fileName])
  
  if (error) throw error
  return data
}
