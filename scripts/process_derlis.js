import XLSX from 'xlsx-js-style';

const inputFile = 'C:\\Users\\HP\\Desktop\\DERLIS ZONA 2.xlsx';
const outputFile = 'C:\\Users\\HP\\Desktop\\PLANILLA_DERLIS_FINAL_ORDENADA.xlsx';

try {
  console.log('Leyendo archivo de Derlis...');
  const workbook = XLSX.readFile(inputFile);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet['!ref']);
  
  // 1. Identificar columnas clave
  let saldoColIdx = -1;
  let celularColIdx = -1;
  const HEADER_ROW = 0; // Asumimos la cabecera en fila 0
  
  // Buscar en las primeras 5 filas por si acaso
  for(let r=0; r<=5; r++){
     for (let c = range.s.c; c <= range.e.c; ++c) {
       const cell = sheet[XLSX.utils.encode_cell({c: c, r: r})];
       if (cell && cell.v) {
           const val = String(cell.v).toUpperCase();
           if (val.includes('SALDO TOTAL')) saldoColIdx = c;
           if (val.includes('CELULAR')) celularColIdx = c;
       }
     }
     if (saldoColIdx !== -1 || celularColIdx !== -1) break;
  }

  // Fallbacks basados en el archivo anterior
  if (saldoColIdx === -1) saldoColIdx = 10;
  if (celularColIdx === -1) celularColIdx = 4;
  
  console.log(`Columnas detectadas -> CELULAR: ${celularColIdx}, SALDO: ${saldoColIdx}`);

  // 2. Extraer y formatear cada celda mientras leemos
  const startRow = Math.max(1, range.s.r + 1); 
  const rows = [];

  let numerosModificados = 0;
  let celularesModificados = 0;

  for (let r = startRow; r <= range.e.r; ++r) {
    const rowCells = [];
    let sortValue = 0;
    
    for (let c = range.s.c; c <= range.e.c; ++c) {
      const cellRef = XLSX.utils.encode_cell({c: c, r: r});
      let cell = sheet[cellRef];
      
      if (!cell) {
          rowCells.push(undefined);
          continue;
      }

      // Arreglar formatos de dinero a estilo español (15,000.00 -> 15.000,00)
      if (cell.t === 's' && cell.v) {
         if (/^[-]?\s*[\d,]+\.\d{2}$/.test(String(cell.v))) {
           const original = String(cell.v);
           const newValue = original.replace(/\./g, 'TEMP_DOT').replace(/,/g, '.').replace(/TEMP_DOT/g, ',');
           cell.v = newValue;
           cell.w = newValue;
           numerosModificados++;
         }
      }

      // Arreglar números de celular
      if (c === celularColIdx) {
          let strValue = String(cell.v).trim();
          let cleanNum = strValue.replace(/[^\d+]/g, '');
          let newPhone = null;

          if (cleanNum.startsWith('+595')) {
              newPhone = cleanNum; 
          } else if (cleanNum.startsWith('595') && cleanNum.length >= 11) {
              newPhone = '+' + cleanNum;
          } else if (cleanNum.startsWith('09') && cleanNum.length === 10) {
              newPhone = '+595' + cleanNum.substring(1);
          } else if (cleanNum.startsWith('9') && cleanNum.length === 9) {
              newPhone = '+595' + cleanNum;
          }

          if (newPhone) {
              cell.v = newPhone;
              cell.t = 's'; 
              cell.w = newPhone;
              celularesModificados++;
          }
      }

      rowCells.push(cell);
      
      // Obtener el valor para el ordenamiento
      if (c === saldoColIdx) {
        let valStr = String(cell.v).trim();
        valStr = valStr.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]+/g,"");
        const num = parseFloat(valStr);
        if (!isNaN(num)) sortValue = num;
      }
    }
    
    // Ignorar filas totalmente vacías
    if (rowCells.some(cell => cell !== undefined)) {
        rows.push({ rowCells, sortValue });
    }
  }

  console.log(`Procesados: ${numerosModificados} montos y ${celularesModificados} celulares.`);

  // 3. Ordenar filas de menor a mayor
  rows.sort((a, b) => a.sortValue - b.sortValue);

  // 4. Reescribir la hoja ordenando los datos
  for (let r = startRow; r <= range.e.r; ++r) {
    for (let c = range.s.c; c <= range.e.c; ++c) {
      delete sheet[XLSX.utils.encode_cell({c: c, r: r})];
    }
  }

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
  
  range.e.r = Math.max(range.s.r, rIndex - 1);
  sheet['!ref'] = XLSX.utils.encode_range(range);

  console.log('Guardando nuevo archivo Derlis...');
  
  try {
      XLSX.writeFile(workbook, outputFile);
      console.log('¡Archivo NUEVO guardado con éxito!');
  } catch (writeErr) {
      console.error("Error al escribir el archivo final:", writeErr);
  }

} catch (e) {
  console.error("Error general:", e);
}
