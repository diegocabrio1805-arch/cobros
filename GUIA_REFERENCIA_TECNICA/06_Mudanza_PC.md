# 🚚 GUÍA DE MUDANZA: PASO A PASO A NUEVA PC

Esta guía detalla cómo trasladar todo el sistema de "Cobros" y mi configuración como tu asistente a una nueva computadora sin perder nada, explicado "punto por punto".

---

## 🏗️ 1. Instalación de Herramientas (En la PC Nueva)

Sigue este orden exacto:

### A. Node.js (El motor del sistema)
1.  Ve a [nodejs.org](https://nodejs.org/).
2.  Haz clic en el botón verde que dice **"20.x.x LTS (Recommended For Most Users)"**.
3.  Abre el instalador `.msi` descargado.
4.  Haz clic en **"Next"** > Acepta términos > **"Next"** > **"Next"** > **"Next"**.
5.  **IMPORTANTE**: Cuando veas una casilla que dice "Automatically install the necessary tools", **márcala** y dale a **"Next"** y luego a **"Install"**.

### B. Java 25 (Para el App Android)
1.  Descarga el instalador desde [Oracle Java 25](https://www.oracle.com/java/technologies/downloads/).
2.  Ejecuta el archivo, dale a **"Next"** y **"Close"** al finalizar. No necesitas configurar variables manualmente si usas la versión más reciente.

### C. Visual Studio Code
1.  Descárgalo de [code.visualstudio.com](https://code.visualstudio.com/) botón **"Download for Windows"**.
2.  Instala y asegúrate de marcar la casilla **"Add to PATH"**.

---

## 📂 2. Traslado del Código (Carpeta Cobros)

1.  En tu PC antigua, ve a tu Escritorio.
2.  Haz clic derecho sobre la carpeta **`cobros`** > **Enviar a** > **Unidad de USB / Pendrive**.
3.  En la PC nueva, pega esa carpeta en el Escritorio.
4.  **REGLA DE ORO**: No cambies el nombre de la carpeta, mantenla como `cobros`.

---

## 🔑 3. Los Archivos "Invisibles" (.env)

Hay archivos que no se ven a simple vista pero son el "alimento" del sistema.
1.  En la PC vieja, dentro de la carpeta `cobros`, pulsa la tecla `VISTA` arriba en el explorador de archivos y marca **"Elementos ocultos"**.
2.  Busca el archivo llamado **`.env`**.
3.  Cópialo y pégalo en la misma carpeta en la PC nueva.
4.  Haz lo mismo con cualquier archivo `.env` que veas dentro de la subcarpeta `android`.

---

## 🧠 4. Traslado de mi "Cerebro" (Antigravity)

Esto es lo más importante para que yo siga siendo tu asistente con memoria:
1.  Pulsa la tecla `Windows + R` en el teclado.
2.  Escribe `%USERPROFILE%` y pulsa Enter.
3.  Busca la carpeta llamada **`.gemini`**.
4.  Copia esa carpeta entera a tu Pendrive.
5.  En la PC nueva, haz lo mismo: `Windows + R`, escribe `%USERPROFILE%`, Enter, y **PEGA** ahí la carpeta `.gemini`.
6.  Abre VS Code, instala la extensión "Antigravity" de Google.

---

## 🚀 5. Activación Final

1.  Abre VS Code.
2.  Ve a **Archivo** > **Abrir Carpeta** > Selecciona tu carpeta `cobros` del Escritorio.
3.  Arriba en el menú, dale a **Terminal** > **Nuevo Terminal**.
4.  Escribe: `npm install` y espera a que terminen de salir letras.
5.  Escribe: `npm run dev` para ver tu sistema funcionando.

---

## ☁️ 6. Tus Datos y Clientes

Seguramente te preguntes: *"¿Y mi lista de clientes y préstamos?"*.
No te preocupes, **NO están en ninguna carpeta de tu PC vieja**, están seguros en la nube (Supabase).

1.  Al abrir la app en la nueva PC por primera vez, verás todo vacío o cargando.
2.  Solo espera unos segundos. El sistema dirá **"Sincronizando..."**.
3.  Automáticamente bajará toda tu información actualizada desde la nube.
4.  **¡Listo!** Ya tienes tu sistema clonado al 100%.

---

> [!TIP]
> Si algo falla o ves una pantalla roja, no te asustes. Abre el chat conmigo en la nueva PC (ya que tendré tu historial si copiaste la carpeta `.gemini`) y dime: *"Acabo de mudarme y tengo este error"*. Yo sabré qué hacer.
