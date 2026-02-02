# 🚀 Deployment Manual a Vercel - Guía Paso a Paso

## ✅ Build Completado

Tu sistema de cobros ya está compilado y listo para subir a Vercel.
Los archivos optimizados están en: `C:\Users\DANIEL\Desktop\cobros\dist`

## 📋 Pasos para Deployment desde la Web

### Paso 1: Abrir Vercel Dashboard

1. Abre tu navegador
2. Ve a [vercel.com](https://vercel.com)
3. Inicia sesión con tu cuenta: `diegovillalba_1805@hotmail.com`

### Paso 2: Crear Nuevo Proyecto

1. Haz clic en **"Add New..."** (botón en la esquina superior derecha)
2. Selecciona **"Project"**

### Paso 3: Subir tu Proyecto

Tienes dos opciones:

#### Opción A: Subir Carpeta Directamente (MÁS FÁCIL)

1. En la página "Let's build something new"
2. Busca la opción **"Deploy from CLI"** o **"Upload"**
3. Si no la ves, usa la Opción B

#### Opción B: Usar GitHub (RECOMENDADO)

1. En la página, haz clic en **"Continue with GitHub"**
2. Autoriza a Vercel para acceder a GitHub
3. Crea un nuevo repositorio en GitHub:
   - Ve a [github.com/new](https://github.com/new)
   - Nombre: `sistema-cobros`
   - Privado o Público (tu eliges)
   - Haz clic en "Create repository"

4. Sube tu código a GitHub:
   ```bash
   cd C:\Users\DANIEL\Desktop\cobros
   git init
   git add .
   git commit -m "Sistema de cobros listo para deployment"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/sistema-cobros.git
   git push -u origin main
   ```

5. Vuelve a Vercel y selecciona el repositorio `sistema-cobros`

### Paso 4: Configurar el Proyecto

Vercel detectará automáticamente que es un proyecto Vite. Verifica que:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Paso 5: Configurar Variables de Entorno

**IMPORTANTE:** Antes de hacer clic en "Deploy", agrega las variables de entorno:

1. Haz clic en **"Environment Variables"**
2. Agrega estas variables:

| Variable | Valor |
|----------|-------|
| `VITE_SUPABASE_URL` | Tu URL de Supabase |
| `VITE_SUPABASE_ANON_KEY` | Tu clave pública de Supabase |
| `GEMINI_API_KEY` | Tu API key de Gemini |

**¿Dónde encontrar estos valores?**

- **Supabase**: [app.supabase.com](https://app.supabase.com) → Tu Proyecto → Settings → API
- **Gemini**: [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)

3. Para cada variable:
   - Escribe el nombre en "Key"
   - Escribe el valor en "Value"
   - Marca: ✅ Production, ✅ Preview, ✅ Development
   - Haz clic en "Add"

### Paso 6: Deploy

1. Verifica que todo esté correcto
2. Haz clic en **"Deploy"**
3. Espera 2-3 minutos mientras Vercel:
   - Instala dependencias
   - Ejecuta el build
   - Despliega tu aplicación

### Paso 7: ¡Listo!

Una vez que termine, Vercel te dará:

- ✅ Una URL como: `https://sistema-cobros.vercel.app`
- ✅ Un dashboard para ver logs y estadísticas
- ✅ Deployments automáticos en cada cambio (si usaste GitHub)

## 🔧 Solución Alternativa: Deployment Directo

Si prefieres no usar GitHub, puedes usar Vercel CLI con un token manual:

1. Ve a [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Haz clic en "Create Token"
3. Dale un nombre: "Sistema Cobros"
4. Copia el token
5. Ejecuta:
   ```bash
   vercel --token TU_TOKEN_AQUI
   ```

## 📊 Verificación

Una vez desplegado, verifica que funcione:

1. Abre la URL que te dio Vercel
2. Prueba iniciar sesión
3. Verifica que puedas ver clientes y préstamos
4. Confirma que la sincronización funcione

## 🎉 Resultado Final

Tu sistema estará disponible 24/7 en:
```
https://sistema-cobros.vercel.app
```

Podrás compartir esta URL con:
- ✅ Gerentes
- ✅ Administradores
- ✅ Cualquier persona autorizada

La APK de los cobradores seguirá funcionando perfectamente, ya que se conecta directamente a Supabase.

## 💡 Próximos Pasos (Opcional)

### Actualizar la APK para usar la nueva URL

Si quieres que la APK use la web en Vercel en lugar de localhost:

1. Busca en el código donde está `http://localhost:3000`
2. Reemplaza por `https://sistema-cobros.vercel.app`
3. Reconstruye la APK

**Nota:** Esto es opcional. La APK actual funciona perfectamente porque se conecta directamente a Supabase.
