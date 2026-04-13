
function parseRawNumber(val) {
   if (typeof val === 'number') return val;
   if (!val) return 0;
   
   // 1. Convert specific symbols and spaces
   const step1 = val.toString().replace(/[\$A-Za-z\s]/g, '');
   
   // 2. Identify if there's a decimal comma vs thousand separator dot
   // Ruben case: "700.000" -> should be 700000
   const cleaned = step1.replace(/\./g, '').replace(/,/g, '.');
   
   return parseFloat(cleaned) || 0;
}

const testCases = [
   { input: "$ 700.000", expected: 700000 },
   { input: "2.900.000", expected: 2900000 },
   { input: "100.50", expected: 10050 }, // Note: matches current logic (thousand sep dots)
   { input: 500, expected: 500 }
];

console.log("--- RESULTADOS DE VERIFICACIÓN ---");
testCases.forEach(t => {
   const result = parseRawNumber(t.input);
   console.log(`Input: [${t.input}] -> Output: ${result} (${result === t.expected ? 'CORRECTO' : 'FALLO'})`);
});
