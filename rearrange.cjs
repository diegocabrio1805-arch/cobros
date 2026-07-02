const fs = require('fs');

const content = fs.readFileSync('c:/Users/Usuario/.antigravity/cobros/components/Dashboard.tsx', 'utf-8');

// 1. Weeks mapping
const weeks_regex = /(<div className="flex flex-col lg:flex-row gap-4 items-start overflow-x-auto pb-2">\s*\{weeklyData\.weeks\.map\(\(week, wi\) => \(\s*<div key=\{wi\} className="border border-slate-100 rounded-xl overflow-hidden shadow-sm bg-white shrink-0">\s*<table className="w-auto text-sm border-collapse">)(.*?)(<\/table>\s*<\/div>\s*\)\)\s*<\/div>)/s;

// 2. Total 5 Sem
const total_regex = /(<div className="flex items-center gap-4 bg-slate-900 text-white rounded-2xl p-3 w-fit text-sm shadow-inner overflow-x-auto max-w-full">\s*<span className="font-black text-xs uppercase tracking-wider pl-1 whitespace-nowrap">TOTAL 5 SEM\.<\/span>.*?<\/div>\s*<\/div>)/s;

// 3. Ultimo Registro
const ultimo_regex = /(<div className="flex flex-col gap-5 items-start mt-6">\s*<div className="overflow-x-auto border border-slate-100 rounded-xl shadow-sm bg-white shrink-0">\s*<table className="w-full text-sm border-collapse">)(.*?)(<\/table>\s*<\/div>\s*<\/div>)/s;

const weeks_match = content.match(weeks_regex);
const total_match = content.match(total_regex);
const ultimo_match = content.match(ultimo_regex);

if (!weeks_match || !total_match || !ultimo_match) {
    console.log('Failed to match one of the blocks!');
    if (!weeks_match) console.log('Weeks failed');
    if (!total_match) console.log('Total failed');
    if (!ultimo_match) console.log('Ultimo failed');
    process.exit(1);
}

const new_weeks_wrapper_start = `<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch pb-2">
              {weeklyData.weeks.map((week, wi) => (
                <div key={wi} className="border border-slate-100 rounded-xl overflow-hidden shadow-sm bg-white w-full h-full flex flex-col">
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm border-collapse">
`;

const new_weeks_wrapper_end = `
                    </table>
                  </div>
                </div>
              ))}`;

const new_ultimo_wrapper_start = `
              {/* Tabla de Cobros de Hoy y Ayer (6to Cuadro) */}
              <div className="border border-slate-100 rounded-xl shadow-sm bg-white w-full h-full flex flex-col overflow-hidden">
                <div className="overflow-x-auto flex-1 h-full">
                  <table className="w-full text-sm border-collapse h-full">
`;

const new_ultimo_wrapper_end = `
                  </table>
                </div>
              </div>
            </div>`; // Closes the grid

const new_total_block = `
            {/* Total global 5 semanas */}
            ${total_match[1]}
`;

const new_content = new_weeks_wrapper_start + weeks_match[2] + new_weeks_wrapper_end + new_ultimo_wrapper_start + ultimo_match[2] + new_ultimo_wrapper_end + new_total_block;

const start_idx = weeks_match.index;
const end_idx = ultimo_match.index + ultimo_match[0].length;

const final_content = content.substring(0, start_idx) + new_content + content.substring(end_idx);

fs.writeFileSync('c:/Users/Usuario/.antigravity/cobros/components/Dashboard.tsx', final_content, 'utf-8');
console.log('Success');
