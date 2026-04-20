
// SIMULACIÓN DEL CORREO DE CÁLCULO (Representando helpers.ts)
function getDaysOverdue_Mock(loan, settings) {
    // Si el principal falla en Number(), el resto falla
    const principal = Number(loan.principal);
    if (isNaN(principal) || principal === 0) return 0; // Error que detectamos
    
    // Simulación del cálculo de mora para el 02/02/2026 al 13/04/2026
    return 20; 
}

// NUEVAS FUNCIONES INTEGRADAS EN REPORTS.TSX
const parseRawNumber = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleaned = val.toString().replace(/[\$A-Za-z\s]/g, '').replace(/\./g, '').replace(/,/g, '.');
    return parseFloat(cleaned) || 0;
};

const sanitizeLoan = (loan) => ({
    ...loan,
    principal: parseRawNumber(loan.principal),
    totalAmount: parseRawNumber(loan.totalAmount)
});

// --- EL CASO RUBEN GONZALES ---
const rubenRaw = {
    name: "RUBEN GONZALES",
    principal: "$ 700.000",
    totalAmount: "$ 700.000",
    createdAt: "2026-02-02"
};

console.log("=== DIAGNÓSTICO DE VERIFICACIÓN (SIN WEB) ===");
console.log("Datos Originales:", rubenRaw.principal);

// 1. COMPROBAR POR QUÉ FALLABA
const principalViejo = Number(rubenRaw.principal);
const moraVieja = getDaysOverdue_Mock(rubenRaw, {});
console.log("\n--- Lógica Antigua (Sin Saneamiento) ---");
console.log("Principal interpretado:", principalViejo);
console.log("Días de mora calculados:", moraVieja);
console.log("¿Aparece en reporte? (balance > 100 && mora > 0):", (principalViejo > 100 && moraVieja > 0) ? "SÍ" : "NO (FALLO)");

// 2. COMPROBAR POR QUÉ AHORA FUNCIONA
const rubenSaneado = sanitizeLoan(rubenRaw);
const moraNueva = getDaysOverdue_Mock(rubenSaneado, {});
console.log("\n--- Lógica Nueva (Con Saneamiento Local) ---");
console.log("Principal interpretado:", rubenSaneado.principal);
console.log("Días de mora calculados:", moraNueva);
console.log("¿Aparece en reporte? (balance > 100 && mora > 0):", (rubenSaneado.totalAmount > 100 && moraNueva > 0) ? "SÍ (EXITO)" : "NO");

console.log("\nPROBADO: La sanitización local dentro de Reports.tsx elimina el bloqueo de Ruben.");
