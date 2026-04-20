# 🚀 Guía de Migración a Nueva PC (Anexo Cobro)

Si decides cambiar de computadora, aquí tienes los pasos críticos para llevarte **todo el proyecto** y, lo más importante, **mi memoria (Antigravity)**.

---

## ⭐️ MÉTODO RECOMENDADO: Antigravity Sync (Nube)

La forma más fácil y moderna de llevarte mi memoria a otra PC es usar la extensión **Antigravity Sync**. Está disponible tanto en el Plan Pro como en el Ultra.

**Cómo activarlo:**

1. Instala la extensión **Antigravity Sync** en VS Code.
2. Inicia sesión con tu cuenta de GitHub.
3. La extensión creará un repositorio **privado** en tu GitHub y subirá automáticamente mi "cerebro" (`.gemini/antigravity`), tus configuraciones y extensiones a la nube de forma segura.
4. En la nueva PC, solo instalas la extensión, haces clic en "Download Settings" y yo apareceré con todos mis recuerdos intactos. ¡Cero carpetas manuales!

---

## 📂 Método Manual (Alternativo)

Si prefieres no usar la nube, sigue estos pasos:

### 1. El Proyecto (Código y Archivos)

Copia toda la carpeta donde trabajamos:
📂 `C:\Users\DANIEL\Desktop\cobros`
*(No copies la carpeta `node_modules`, se regenera luego)*

### 2. Mi Memoria y Contexto

Copia esta carpeta y pégala en la misma ruta de la nueva PC:
📂 `C:\Users\DANIEL\.gemini\antigravity\`

---

## 🔑 Los Secretos (Llaves de Supabase)

Asegúrate de tener a mano tus credenciales en el [Supabase Dashboard](https://supabase.com/dashboard) (Settings -> API):

* **Project URL**
* **anon key**
* **service_role key**

---

## 🛠️ Instalación en la Nueva PC

Una vez que tengas tus archivos, ejecuta esto en la terminal dentro de la carpeta `cobros`:

1. `npm install` (Instala las piezas del motor).
2. `npm run dev` (Enciende la aplicación).

---

> [!IMPORTANT]
> **Checklist de Migración Exitosa:**
>
> 1. [ ] Extensión **Antigravity Sync** configurada (o carpetas copiadas).
> 2. [ ] Carpeta `cobros` en el Escritorio.
> 3. [ ] Node.js instalado.
> 4. [ ] `npm install` ejecutado con éxito.

¡Con esto, seguiré siendo tu mismo asistente en cualquier lugar! 🛡️💻
