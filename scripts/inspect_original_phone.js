import XLSX from 'xlsx-js-style';

const inputFile = 'C:\\Users\\HP\\Desktop\\CLIENTES ZONA JUVE _MODIFICADO.xlsx';

try {
  const workbook = XLSX.readFile(inputFile);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet['!ref']);
  
  console.log("Checking row 21-30 for Column E (index 4) in the unmodified file.");
  let col = 4;
  for (let r = 20; r <= 35; r++) {
      const cellRef = XLSX.utils.encode_cell({c: col, r: r});
      const nameRef = XLSX.utils.encode_cell({c: 1, r: r}); // Nombre
      const cell = sheet[cellRef];
      const name = sheet[nameRef] ? sheet[nameRef].v : '???';
      
      if (cell) {
          console.log(`Row ${r+1} (${name}): t=${cell.t}, v=${cell.v}, w=${cell.w}`);
      } else {
          console.log(`Row ${r+1} (${name}): EMPTY`);
      }
  }

} catch (e) {
  console.error("Error al procesar el archivo:", e);
}
