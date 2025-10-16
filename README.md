## Guinda Time Pivot

Aplicación web para convertir el CSV de ClickUp en una tabla pivote Cliente×Empleado con totales, y exportación a Excel/CSV.

### Ejecutar en local

Abre `index.html` en el navegador o levanta un servidor estático:

```bash
npx serve .
```

### Despliegue en Vercel

1. Asegúrate de tener la CLI: `npm i -g vercel`
2. Dentro del directorio del proyecto:
   ```bash
   vercel
   ```
3. Para producción:
   ```bash
   vercel --prod
   ```

La configuración está en `vercel.json`. Hay una función serverless de prueba en `api/ping`.

### Uso

1. Arrastra y suelta el CSV exportado de ClickUp (debe incluir `Folder Name`, `User Name`/`Username` y `Time Tracked`).
2. La app muestra la matriz de tiempos con totales; puedes conmutar entre HH:MM:SS y horas decimales.
3. Exporta a Excel o CSV.


