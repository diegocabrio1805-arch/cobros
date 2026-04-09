import XLSX from 'xlsx-js-style';
import fs from 'fs';

const inputFile = 'C:\\Users\\HP\\Desktop\\CLIENTES ZONA JUVE.xlsx';

try {
  console.log('Leyendo archivo original...');
  const workbook = XLSX.readFile(inputFile);
  
  let numerosModificados = 0;
  let celularesModificados = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref']);
    
    // Asumiendo que Celular está en la columna E (índice 4) basado en los datos anteriores
    // Pero vamos a buscar la cabecera primero por si acaso
    let celularColIdx = -1;
    for (let c = range.s.c; c <= range.e.c; ++c) {
      const headerCell = sheet[XLSX.utils.encode_cell({c: c, r: 0})]; // fila 0 o 1
      if (headerCell && headerCell.v && String(headerCell.v).toUpperCase().includes('CELULAR')) {
        celularColIdx = c;
        break;
      }
    }
    
    // Si no lo encuentra en la fila 0, buscamos en la fila 1, 2, 3...
    if (celularColIdx === -1) {
      for(let r = 0; r <= 5; r++) {
         for (let c = range.s.c; c <= range.e.c; ++c) {
            const tempCell = sheet[XLSX.utils.encode_cell({c: c, r: r})];
            if (tempCell && tempCell.v && String(tempCell.v).toUpperCase().includes('CELULAR')) {
              celularColIdx = c;
              break;
            }
         }
         if (celularColIdx !== -1) break;
      }
    }
    
    if (celularColIdx === -1) {
      celularColIdx = 4; // Por defecto E
    }

    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({c: C, r: R});
        const cell = sheet[cellRef];
        
        if (!cell) continue;

        // 1. Arreglar formatos de montos (15,000.00 -> 15.000,00)
        if (cell.t === 's' && cell.v) {
          if (/^[-]?\s*[\d,]+\.\d{2}$/.test(String(cell.v))) {
            const original = String(cell.v);
            const newValue = original.replace(/\./g, 'TEMP_DOT').replace(/,/g, '.').replace(/TEMP_DOT/g, ',');
            cell.v = newValue;
            cell.w = newValue;
            numerosModificados++;
          }
        }

        // 2. Arreglar celulares en la columna de CELULAR (incluyendo notación científica)
        if (C === celularColIdx && R > 0) { // Omitir cabecera
          let strValue = String(cell.v).trim();
          // Limpiamos todo caracter que no sea numero o el signo +
          let cleanNum = strValue.replace(/[^\d+]/g, '');
          
          let newPhone = null;

          if (cleanNum.startsWith('+595')) {
              newPhone = cleanNum; // Ya está bien pero lo dejamos limpio de espacios
          } else if (cleanNum.startsWith('595') && cleanNum.length >= 11) {
              newPhone = '+' + cleanNum;
          } else if (cleanNum.startsWith('09') && cleanNum.length === 10) {
              newPhone = '+595' + cleanNum.substring(1);
          } else if (cleanNum.startsWith('9') && cleanNum.length === 9) {
              newPhone = '+595' + cleanNum;
          }

          if (newPhone) {
              cell.v = newPhone;
              cell.t = 's'; // Transformarlo a texto para que Excel no lo vuelva a hacer E+11
              cell.w = newPhone;
              celularesModificados++;
          }
        }
      }
    }
  }

  console.log(`Guardando archivo... Se modificaron ${numerosModificados} montos y ${celularesModificados} celulares.`);
  
  try {
      XLSX.writeFile(workbook, inputFile);
      console.log('¡Archivo sobrescrito con éxito en la ruta original!');
  } catch (writeErr) {
      if (writeErr.code === 'EBUSY') {
          console.error('ERROR_LOCKED');
      } else {
          console.error("Error al escribir:", writeErr);
      }
  }

} catch (e) {
  console.error("Error al procesar el archivo:", e);
}
