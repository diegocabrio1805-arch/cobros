# 🚀 Guía de Deployment a Vercel

## Paso 1: Crear Cuenta en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Haz clic en **"Sign Up"**
3. Regístrate con **GitHub** (recomendado) o email
4. Es **100% GRATIS**

## Paso 2: Instalar Vercel CLI

Abre PowerShell o CMD y ejecuta:

```bash
npm install -g vercel
```

## Paso 3: Hacer Login en Vercel

En la terminal, ejecuta:

```bash
vercel login
```

Sigue las instrucciones para autenticarte.

## Paso 4: Deployment

### Opción A: Deployment Directo (Más Rápido)

1. Abre la terminal en la carpeta del proyecto:
   ```bash
   cd C:\Users\DANIEL\Desktop\cobros
   ```

2. Ejecuta el comando de deployment:
   ```bash
   vercel
   ```

3. Responde las preguntas:
   - **Set up and deploy?** → `Y` (Yes)
   - **Which scope?** → Selecciona tu cuenta
   - **Link to existing project?** → `N` (No)
   - **What's your project's name?** → `sistema-cobros` (o el nombre que prefieras)
   - **In which directory is your code located?** → `./` (presiona Enter)
   - **Want to override the settings?** → `N` (No)

4. ¡Listo! Vercel te dará una URL como:
   ```
   https://sistema-cobros.vercel.app
   ```

### Opción B: Con GitHub (Recomendado para largo plazo)

1. Crea un repositorio en GitHub
2. Sube tu código:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/tu-usuario/sistema-cobros.git
   git push -u origin main
   ```

3. En Vercel:
   - Click en **"New Project"**
   - Importa el repositorio de GitHub
   - Vercel detectará automáticamente que es un proyecto Vite
   - Click en **"Deploy"**

## Paso 5: Configurar Variables de Entorno

1. Ve a tu proyecto en Vercel Dashboard
2. Click en **"Settings"** → **"Environment Variables"**
3. Agrega estas variables:

   | Variable | Valor | Dónde obtenerlo |
   |----------|-------|-----------------|
   | `VITE_SUPABASE_URL` | `https://tu-proyecto.supabase.co` | [Supabase Dashboard](https://app.supabase.com) → Settings → API |
   | `VITE_SUPABASE_ANON_KEY` | `tu-clave-publica` | [Supabase Dashboard](https://app.supabase.com) → Settings → API |
   | `GEMINI_API_KEY` | `tu-api-key` | [Google AI Studio](https://makersuite.google.com/app/apikey) |

4. Marca las tres opciones:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

5. Click en **"Save"**

## Paso 6: Redeploy con Variables

Después de agregar las variables:

1. Ve a **"Deployments"**
2. Click en los tres puntos del último deployment
3. Click en **"Redeploy"**
4. Espera a que termine (1-2 minutos)

## Paso 7: Verificar que Funciona

1. Abre la URL que te dio Vercel
2. Verifica que puedas:
   - ✅ Iniciar sesión
   - ✅ Ver clientes
   - ✅ Ver préstamos
   - ✅ Sincronización funciona

## Paso 8: Dominio Personalizado (Opcional)

Si quieres un dominio como `cobros.tuempresa.com`:

1. En Vercel → **"Settings"** → **"Domains"**
2. Agrega tu dominio
3. Sigue las instrucciones de DNS

## Comandos Útiles

```bash
# Deployment a producción
vercel --prod

# Ver logs en tiempo real
vercel logs

# Ver lista de deployments
vercel ls

# Eliminar proyecto
vercel remove sistema-cobros
```

## Actualizar la APK (Futuro)

Para que la APK use la nueva URL de Vercel en lugar de localhost:

1. Busca en el código donde está `http://localhost:3000`
2. Reemplázalo por `https://sistema-cobros.vercel.app`
3. Reconstruye la APK

**Nota:** Esto es opcional. La APK actual seguirá funcionando porque se conecta directamente a Supabase.

## Solución de Problemas

### Error: "Build failed"
- Verifica que `npm run build` funcione localmente
- Revisa los logs en Vercel para ver el error específico

### Error: "Cannot connect to Supabase"
- Verifica que las variables de entorno estén configuradas correctamente
- Asegúrate de que las URLs no tengan espacios ni caracteres extra

### La página se ve en blanco
- Abre la consola del navegador (F12)
- Revisa si hay errores de JavaScript
- Verifica que `vercel.json` esté configurado correctamente

## Resultado Final

✅ Tu sistema estará disponible 24/7 en:
```
https://sistema-cobros.vercel.app
```

✅ Podrás compartir esta URL con:
- Gerentes
- Administradores
- Cualquier persona autorizada

✅ La APK de los cobradores seguirá funcionando perfectamente

## Soporte

Si tienes problemas:
1. Revisa los logs en Vercel Dashboard
2. Verifica las variables de entorno
3. Asegúrate de que el build local funcione
