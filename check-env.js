// check-env.js
const requiredEnv = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_GEMINI_API_KEY'
];

console.log('--- VERIFICACIÓN DE VARIABLES DE ENTORNO ---');

const missing = [];
requiredEnv.forEach(key => {
    if (!process.env[key]) {
        console.error(`❌ FALTANTE: ${key}`);
        missing.push(key);
    } else {
        console.log(`✅ ${key}: Configurada (${process.env[key].length} chars)`);
    }
});

if (missing.length > 0) {
    console.error('\n⚠️  ADVERTENCIA CRÍTICA: La aplicación puede fallar por falta de configuración.');
    process.exit(1);
} else {
    console.log('\n✅ Todo parece correcto.');
}
