import XLSX from 'xlsx-js-style';

const filePath = 'C:\\Users\\HP\\Desktop\\CLIENTES ZONA JUVE.xlsx';
try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Get data as array of arrays to see exact values
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });
  console.log("RAW DATA (First 10 rows):");
  console.log(JSON.stringify(data.slice(0, 10), null, 2));

  // Also get data with raw: false to see formatted values
  const formattedData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
  console.log("\nFORMATTED DATA (First 10 rows):");
  console.log(JSON.stringify(formattedData.slice(0, 10), null, 2));

  // List all cell addresses to see formats
  console.log("\nCELL METADATA (Sample of first row with numbers):");
  const range = XLSX.utils.decode_range(sheet['!ref']);
  for(let R = 0; R <= Math.min(5, range.e.r); ++R) {
    for(let C = 0; C <= range.e.c; ++C) {
      const cellAddress = {c:C, r:R};
      const cellRef = XLSX.utils.encode_cell(cellAddress);
      const cell = sheet[cellRef];
      if(cell) {
        console.log(`${cellRef}: type=${cell.t}, v=${cell.v}, w=${cell.w}, z=${cell.z}`);
      }
    }
  }

} catch (e) {
  console.error("Error reading file:", e);
}
