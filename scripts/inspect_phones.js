import XLSX from 'xlsx-js-style';

const inputFile = 'C:\\Users\\HP\\Desktop\\CLIENTES ZONA JUVE.xlsx';

try {
  const workbook = XLSX.readFile(inputFile);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet['!ref']);
  
  console.log("Checking row 2-10 for Column E (index 4) or wherever CELULAR is.");
  let col = 4;
  for (let r = 0; r <= 15; r++) {
      const cellRef = XLSX.utils.encode_cell({c: col, r: r});
      const cell = sheet[cellRef];
      if (cell) {
          console.log(`Row ${r+1} (${cellRef}): t=${cell.t}, v=${cell.v}, w=${cell.w}`);
      } else {
          console.log(`Row ${r+1} (${cellRef}): EMPTY`);
      }
  }

} catch (e) {
  console.error("Error al procesar el archivo:", e);
}
