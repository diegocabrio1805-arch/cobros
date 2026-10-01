---
description: Reglas y procedimientos estrictos para cuando el usuario solicita una "auditoria".
---

# Regla de Auditoría Estricta

Cuando el usuario pida una "auditoría", "auditoria", o "auditar" código (especialmente en procesos de importación de Excel o lógica de cobros), DEBES aplicar y recordar los siguientes principios históricos de este repositorio:

1. **La Trampa del Falsy (El Cero):** 
   Revisar siempre que las variables numéricas que puedan contener un cero legítimo (ej. proveniente de una celda vacía o un guion `-`) sean validadas usando comprobación de tipo estricta (`typeof var === 'number' && !isNaN(var)`). NUNCA usar el operador lógico `||` para valores de pago, ya que rechaza el 0 matemático y detona inyecciones de pagos fantasmas (como ocurrió en `utils/excelHelper.ts` con el `LOG-MIG`).

2. **Heurísticas Destructivas (Auto-Detect):**
   El usuario exige que el sistema confíe 100% en los datos ingresados en la interfaz o planillas, incluso si las proyecciones de cuotas u otras matemáticas no cuadran perfectamente. NUNCA reescribas o "auto-corrijas" el Total, Saldo o Monto Cobrado sin autorización explícita. (Esta heurística fue eliminada de `excelHelper.ts`).

3. **Inyección de LOG-MIG (Monto mayor al saldo):**
   Si se reporta el error de "monto mayor al saldo" teniendo un saldo visualmente correcto, asume que el backend está generando un `LOG` de pago oculto que colapsa el saldo interno a cero. Busca la fuente de inyección analizando dónde se calcula el monto a pagar inicial.

4. **Regla de Solo Lectura:**
   Durante una "auditoría", nunca debes modificar el código hasta que el usuario te conceda "luz verde". Tu rol inicial es estrictamente de Diagnóstico (Code QA).
