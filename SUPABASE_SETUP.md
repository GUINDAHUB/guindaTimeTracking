# Configuración de Supabase para Guinda Time Tracking

## 1. Crear proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Haz clic en "New Project"
4. Elige tu organización y crea el proyecto
5. Espera a que se complete la configuración (2-3 minutos)

## 2. Configurar Storage

1. En el dashboard de Supabase, ve a **Storage** en el menú lateral
2. Haz clic en **"New bucket"**
3. Nombre del bucket: `csv-files`
4. Marca **"Public bucket"** como NO (mantén privado)
5. Haz clic en **"Create bucket"**

## 3. Configurar políticas de acceso

1. Ve a **Storage** > **Policies**
2. Haz clic en **"New Policy"** para el bucket `csv-files`
3. Crea las siguientes políticas:

### Política 1: Permitir lectura
- **Policy name**: `Allow public read access`
- **Target roles**: `public`
- **Operation**: `SELECT`
- **Policy definition**:
```sql
true
```

### Política 2: Permitir escritura
- **Policy name**: `Allow public insert access`
- **Target roles**: `public`
- **Operation**: `INSERT`
- **Policy definition**:
```sql
true
```

### Política 3: Permitir eliminación
- **Policy name**: `Allow public delete access`
- **Target roles**: `public`
- **Operation**: `DELETE`
- **Policy definition**:
```sql
true
```

## 4. Obtener credenciales

1. Ve a **Settings** > **API**
2. Copia los siguientes valores:
   - **Project URL** (algo como `https://xxxxx.supabase.co`)
   - **anon public** key (una cadena larga que empieza con `eyJ...`)

## 5. Configurar variables de entorno

1. Crea un archivo `.env.local` en la raíz del proyecto
2. Añade las siguientes variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

3. Reemplaza los valores con los de tu proyecto

## 6. Desplegar en Vercel

1. Añade las variables de entorno en Vercel:
   - Ve a tu proyecto en Vercel
   - Settings > Environment Variables
   - Añade `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. Redespliega la aplicación

## 7. Verificar funcionamiento

1. Sube un CSV a la aplicación
2. Haz clic en "Ver CSVs guardados"
3. Deberías ver tu CSV en la lista
4. Prueba a cargar y eliminar CSVs

## Solución de problemas

### Error: "Invalid API key"
- Verifica que las variables de entorno estén correctamente configuradas
- Asegúrate de usar la "anon public" key, no la "service_role" key

### Error: "Bucket not found"
- Verifica que el bucket se llame exactamente `csv-files`
- Asegúrate de que el bucket esté creado en el proyecto correcto

### Error: "Permission denied"
- Verifica que las políticas de acceso estén configuradas correctamente
- Asegúrate de que las políticas permitan operaciones `SELECT`, `INSERT` y `DELETE`

## Costos

- Supabase tiene un plan gratuito generoso
- El almacenamiento de archivos CSV es muy eficiente
- No deberías tener problemas de costos para el uso típico de una agencia
