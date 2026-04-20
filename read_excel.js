var X = require('./node_modules/xlsx');
var fs = require('fs');
var wb = X.readFile('C:/Users/HP/Desktop/prueba 77777.xlsx');
var ws = wb.Sheets[wb.SheetNames[0]];
var rows = X.utils.sheet_to_json(ws, { header: 1, raw: false });
var out = 'SHEETS: ' + wb.SheetNames.join(',') + '\nTOTAL_ROWS: ' + rows.length + '\n';
rows.slice(0, 10).forEach(function(row, i) {
    out += 'R' + i + ':' + JSON.stringify(row) + '\n';
});
fs.writeFileSync('C:/Users/HP/.gemini/antigravity/scratch/cobros/excel_output.txt', out, 'utf8');
process.stdout.write('DONE\n');
