# Plan de Implementación: Importación y Exportación Masiva (45 Columnas)

## 1. Diseño y Flujo de Trabajo

* **Pestaña 1 (Trabajo Diario):** Se mantiene **intacta** como la usan hoy en la calle. Lleva los datos esenciales (Nombre, Cédula, Teléfonos, Dirección y **GPS**).
* **Pestaña 2 (Registro Completo):** Se agrega esta nueva vista que contiene el resto de las 45 columnas del Excel (Historial, Garantes, Referencias, Detalles de crédito, etc.).
* **Sincronización:** Ambas pestañas se alimentan del mismo lugar. Importar el Excel llena auto-mágicamente ambas pestañas. Lo que se edite en la Pestaña 1, se actualiza en el registro completo de la Pestaña 2.

---

## 2. Códigos y Modificaciones Proyectadas

*(Estos códigos están diseñados pero **NO** ejecutados. Se aplicarán solo cuando tú des la orden)*

### A. Preparar Base de Datos (Supabase SQL)

Se deben añadir las nuevas columnas a las tablas actuales de `clients` y `loans` para poder recibir las 45 columnas del Excel sin perder datos.

```sql
-- Ejemplo del comando SQL que ejecutaremos en Supabase:
ALTER TABLE clients 
ADD COLUMN estado_civil TEXT,
ADD COLUMN empresa_trabajo TEXT,
ADD COLUMN garante_nombre TEXT,
ADD COLUMN garante_cedula TEXT,
ADD COLUMN gps_trabajo_lat NUMERIC,
ADD COLUMN gps_trabajo_lng NUMERIC;
-- (Se añadirán todas las columnas necesarias que indique tu Excel original)
```

### B. Modificar Interfaz Visual (Frontend - React)

Creación de las dos pestañas en el componente de registro (`components/ClientForm.tsx` o similar).

```tsx
// Estructura proyectada para la pantalla de registro
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function FormularioCliente() {
  return (
    <Tabs defaultValue="diario" className="w-full">
      <TabsList>
        <TabsTrigger value="diario">Planilla Diaria (Trabajo)</TabsTrigger>
        <TabsTrigger value="completo">Registro Completo (Excel)</TabsTrigger>
      </TabsList>
      
      {/* PESTAÑA 1: INTACTA COMO AHORA CON EL GPS */}
      <TabsContent value="diario">
        <FormularioActualConGPS />
      </TabsContent>
      
      {/* PESTAÑA 2: NUEVA PANTALLA CON LOS 45 CAMPOS */}
      <TabsContent value="completo">
        <FormularioExtendio45Datos />
      </TabsContent>
    </Tabs>
  )
}
```

### C. Sistema de Importación Masiva (Subir Archivo)

Un módulo que utilice la librería instalada para leer el Excel, clasificar los datos y guardarlos de golpe en la base de datos.

```typescript
// Lógica proyectada para procesar el Excel (importExcel.ts)
import * as XLSX from 'xlsx';

export const procesarExcelMasivo = async (archivo: File) => {
  const lector = new FileReader();
  lector.onload = async (e) => {
    const data = new Uint8Array(e.target?.result as ArrayBuffer);
    const libro = XLSX.read(data, { type: 'array' });
    const hoja1 = libro.Sheets[libro.SheetNames[0]];
    
    // Transformar el Excel a Formato de Sistema
    const datosCliente = XLSX.utils.sheet_to_json(hoja1);
    
    // 1. Separar datos de Perfil (Pestaña 1)
    // 2. Separar datos de Historial (Pestaña 2)
    // 3. Guardar en Base de Datos de forma asíncrona
    console.log("Subiendo archivo completo al servidor...");
  };
  lector.readAsArrayBuffer(archivo);
};
```

### D. Sistema de Exportación (Bajar Archivo)

Función para generar la plantilla perfecta de 45 columnas y descargarla a la computadora.

```typescript
// Lógica proyectada para generar el reporte Excel (exportExcel.ts)
import * as XLSX from 'xlsx-js-style';

export const descargarBaseDeDatos = (datosDelSistema) => {
  // Configurar las 45 columnas exactas
  const hoja = XLSX.utils.json_to_sheet(datosDelSistema);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Base_Completa");
  
  // Forzar descarga del Excel en el navegador
  XLSX.writeFile(libro, "Respaldo_Sistema_45_Columnas.xlsx");
};
```

---

## 3. Instrucciones de Ejecución

Cuando desees avanzar con este desarrollo, simplemente dime:

1. *"Muéstrame la lista de las 45 columnas para organizarlas"*
2. O bien, *"Ejecuta la modificación visual de las pestañas"*
3. O bien, *"Empieza con el código de Importación de Excel"*

El sistema esperará tu orden para inyectar este código.
