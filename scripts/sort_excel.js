import XLSX from 'xlsx-js-style';
import fs from 'fs';

const inputFile = 'C:\\Users\\HP\\Desktop\\PLANILLA_LISTA_FINAL.xlsx';
const outputFile = 'C:\\Users\\HP\\Desktop\\PLANILLA_LISTA_FINAL_ORDENADA.xlsx';

try {
  console.log('Leyendo archivo...');
  const workbook = XLSX.readFile(inputFile);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet['!ref']);
  
  // 1. Encontrar la columna "SALDO TOTAL"
  let saldoColIdx = -1;
  const HEADER_ROW = 0; // asumimos que la fila 0 tiene las cabeceras
  for (let c = range.s.c; c <= range.e.c; ++c) {
    const cell = sheet[XLSX.utils.encode_cell({c: c, r: HEADER_ROW})];
    if (cell && cell.v && String(cell.v).toUpperCase().includes('SALDO TOTAL')) {
      saldoColIdx = c;
      break;
    }
  }

  if (saldoColIdx === -1) {
     // Si no encuentra la cabecera, buscamos en un par de filas más
     for(let r=1; r<=3; r++){
        for (let c = range.s.c; c <= range.e.c; ++c) {
            const cell = sheet[XLSX.utils.encode_cell({c: c, r: r})];
            if (cell && cell.v && String(cell.v).toUpperCase().includes('SALDO TOTAL')) {
              saldoColIdx = c;
              break;
            }
        }
        if(saldoColIdx !== -1) break;
     }
  }
  
  if (saldoColIdx === -1) {
      saldoColIdx = 10;
      console.log('No se encontró cabecera "SALDO TOTAL", usando columna K por defecto.');
  } else {
     console.log(`Columna de SALDO TOTAL encontrada en el índice ${saldoColIdx}`);
  }

  // 2. Extraer filas de datos (fila cabecera + 1 a N) conservando las celdas completas
  const rows = [];
  const startRow = Math.max(1, range.s.r + 1); // Siempre empezamos de la fila 1 (suponiendo que la 0 es la cabecera)
  for (let r = startRow; r <= range.e.r; ++r) {
    const rowCells = [];
    let sortValue = 0; // Si no hay saldo, es 0
    
    for (let c = range.s.c; c <= range.e.c; ++c) {
      const cellRef = XLSX.utils.encode_cell({c: c, r: r});
      const cell = sheet[cellRef];
      rowCells.push(cell); // Mantenemos el objeto celda original que retiene formatos
      
      // Extraemos el valor para poder ordenarlo
      if (c === saldoColIdx && cell) {
        let valStr = String(cell.v).trim();
        // Si tiene formato '15.000,00', quitar puntos y cambiar coma por punto
        valStr = valStr.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]+/g,"");
        const num = parseFloat(valStr);
        if (!isNaN(num)) sortValue = num;
      }
    }
    
    // Solo agregar si la fila no está completamente vacía
    if (rowCells.some(cell => cell !== undefined)) {
        rows.push({ rowCells, sortValue });
    }
  }

  console.log(`Encontradas ${rows.length} filas de datos.`);

  // 3. Ordenar filas de menor a mayor basado en sortValue
  rows.sort((a, b) => a.sortValue - b.sortValue);
  console.log("Filas ordenadas de saldo 0 al saldo mayor.");

  // 4. Reescribir la hoja. Limpiamos todas las celdas de las filas (1 a N)
  for (let r = startRow; r <= range.e.r; ++r) {
    for (let c = range.s.c; c <= range.e.c; ++c) {
      delete sheet[XLSX.utils.encode_cell({c: c, r: r})];
    }
  }

  // 5. Asignar las filas ordenadas de vuelta a la hoja
  let rIndex = startRow;
  for (const rowObj of rows) {
    for (let c = 0; c < rowObj.rowCells.length; ++c) {
      const origCell = rowObj.rowCells[c];
      if (origCell) {
        const newRef = XLSX.utils.encode_cell({c: c + range.s.c, r: rIndex});
        sheet[newRef] = origCell;
      }
    }
    rIndex++;
  }
  
  // Actualizar rango real en caso de filas vacías
  range.e.r = Math.max(range.s.r, rIndex - 1);
  sheet['!ref'] = XLSX.utils.encode_range(range);

  console.log('Guardando archivo ordenado en nueva ruta...');
  
  try {
      XLSX.writeFile(workbook, outputFile);
      console.log('¡Archivo NUEVO guardado y ordenado con éxito!');
  } catch (writeErr) {
      if (writeErr.code === 'EBUSY') {
          console.error('ERROR_LOCKED');
      } else {
          console.error("Error al escribir:", writeErr);
      }
  }

} catch (e) {
  console.error("Error general:", e);
}
