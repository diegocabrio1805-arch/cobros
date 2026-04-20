const XLSX = require('./node_modules/xlsx');

try {
    const wb = XLSX.readFile('C:/Users/HP/Desktop/prueba 77777.xlsx');
    console.log('Sheets:', wb.SheetNames);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
    
    console.log('TOTAL ROWS:', rows.length);
    rows.slice(0, 8).forEach((r, i) => {
        console.log('Row[' + i + ']:', JSON.stringify(r));
    });
} catch(e) {
    console.error('Error:', e.message);
}
