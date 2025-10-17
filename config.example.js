// Configuración de Supabase
// Copia este archivo a config.js y reemplaza los valores con los de tu proyecto de Supabase

export const supabaseConfig = {
  url: 'your_supabase_url_here',
  anonKey: 'your_supabase_anon_key_here'
}

// Instrucciones para configurar Supabase:
// 1. Ve a https://supabase.com y crea un nuevo proyecto
// 2. En el dashboard, ve a Settings > API
// 3. Copia la URL del proyecto y la anon key
// 4. Reemplaza los valores arriba
// 5. En Storage, crea un bucket llamado 'csv-files'
// 6. Configura las políticas de acceso para permitir lectura/escritura
