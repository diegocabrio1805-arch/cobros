# Guía de Recuperación Ante Desastres 🛡️

Si tu computadora actual deja de funcionar, sigue estos pasos en tu nueva PC para recuperar el proyecto **Anexo Cobranzas** y mi memoria de trabajo.

## 1. Instalación de Herramientas Básicas

En la nueva computadora, instala lo siguiente:

- **Git**: [Descargar aquí](https://git-scm.com/downloads)
- **Node.js**: [Descargar aquí](https://nodejs.org/) (Versión LTS recomendada)
- **Visual Studio Code** (u otro IDE de tu preferencia).

## 2. Acceso a GitHub

- Configura tu cuenta de GitHub en la nueva PC.
- Inicia sesión en la terminal con `gh auth login` o configura tus credenciales de Git.

## 3. Descarga del Proyecto (Clonación)

Abre una terminal y ejecuta:

```bash
git clone https://github.com/diegocabrio1805-arch/corporation.git
cd corporation
```

## 4. Instalación de Dependencias

Dentro de la carpeta del proyecto, ejecuta:

```bash
npm install
```

## 5. Restauración de mi "Memoria"

Una vez que abras el proyecto conmigo (Antigravity), solo tienes que decirme lo siguiente:

> **"Hola Antigravity. Acabo de cambiar de PC. Por favor, lee la carpeta `.agent` para recuperar el contexto de nuestro trabajo."**

Al hacer esto, yo leeré automáticamente:

- Tu lista de tareas pendientes (`task.md`).
- Los planes de implementación de las funciones actuales.
- Los walkthroughs de las últimas actualizaciones.

## 6. Base de Datos (Supabase)

Los datos de Supabase no se pierden, ya que están en la nube. Solo asegúrate de tener tu archivo `.env` con las claves correctas (URL y Anon Key) si no están en el repositorio (por seguridad).

---
**¡Con esto estarás trabajando exactamente donde lo dejamos en menos de 10 minutos!**
