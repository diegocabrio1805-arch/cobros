# 06 - Reportes y Auditoría IA

Este documento detalla la implementación de las funciones de reporte y la configuración del motor de Inteligencia Artificial.

## 1. Reportes de Cartera General

Se han implementado dos métodos de exportación en la pestaña "Cartera" de `Clients.tsx`:

### A. Impresión Directa (HTML)
- **Función:** `handlePrintCartera`
- **Mecánica:** Genera una ventana temporal (`window.open`) con un diseño CSS optimizado para impresión.
- **Datos:** Utiliza `carteraExcelData`, respetando los filtros activos (Cobrador, Nombre, Fecha).

### B. Exportación a PDF (jsPDF)
- **Función:** `handleExportPDF`
- **Biblioteca:** `jspdf` (importación dinámica).
- **Características:**
    - Encabezado corporativo automático.
    - Soporte multi-página.
    - Zebra-styling para legibilidad.
    - Indicadores visuales de mora (Rojo) y saldo.

---

## 2. Configuración de Gemini AI

### Modelo Utilizado
- **Modelo:** `gemini-1.5-flash`
- **Razón:** Versión estándar y gratuita que ofrece mayor compatibilidad entre versiones de API (v1 y v1beta).
- **Servicios:** Centralizado en `services/geminiService.ts`.

### Seguridad y Despliegue (GitHub Pages)
Para que la IA funcione en el servidor de GitHub, se requiere la siguiente configuración:

1.  **Workflow (`static.yml`):** El proceso de construcción pasa el secreto `VITE_GEMINI_API_KEY` al compilador de Vite.
2.  **Secretos de GitHub:** La clave debe estar configurada en `Settings > Secrets and variables > Actions` bajo el nombre exactum `VITE_GEMINI_API_KEY`.

---
*Documentación actualizada: 14 Febrero 2026*
