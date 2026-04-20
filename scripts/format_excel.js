import XLSX from 'xlsx-js-style';
import path from 'path';

const inputFile = 'C:\\Users\\HP\\Desktop\\CLIENTES ZONA JUVE.xlsx';
const outputFile = 'C:\\Users\\HP\\Desktop\\CLIENTES ZONA JUVE _MODIFICADO.xlsx';

try {
  console.log('Leyendo archivo...');
  const workbook = XLSX.readFile(inputFile);
  
  let totalModificados = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref']);
    
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({c: C, r: R});
        const cell = sheet[cellRef];
        
        if (cell && cell.t === 's' && cell.v) {
          // Check if string matches pattern like "15,000.00" or "13,000,000.00"
          // Pattern: digits and commas, followed by a period and 2 digits
          if (/^[\d,]+\.\d+$/.test(cell.v)) {
            const original = cell.v;
            // 15,000.00 -> 15TEMP000.00 -> 15.000TEMP00 -> 15.000,00
            const newValue = original.replace(/\./g, 'TEMP_DOT').replace(/,/g, '.').replace(/TEMP_DOT/g, ',');
            
            cell.v = newValue;
            cell.w = newValue; // Update formatted text too
            totalModificados++;
          }
        }
      }
    }
  }

  console.log(`Guardando archivo... Se modificaron ${totalModificados} celdas.`);
  XLSX.writeFile(workbook, outputFile);
  console.log('¡Archivo guardado con éxito como CLIENTES ZONA JUVE _MODIFICADO.xlsx !');

} catch (e) {
  console.error("Error al procesar el archivo:", e);
}
