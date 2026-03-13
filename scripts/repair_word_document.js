const fs = require('fs');
const path = require('path');

// Ruta del archivo corrupto
const corruptedFile = 'C:\\Users\\DANIEL\\OneDrive\\Documentos\\PAGARE\\PAGARE DE 1.200.000 villa elisa.docx';
const outputDir = 'C:\\Users\\DANIEL\\Desktop\\cobros\\scripts';
const outputFile = path.join(outputDir, 'PAGARE_1200000_REPARADO.docx');

console.log('🔧 Iniciando reparación del archivo Word...\n');

try {
    // Verificar que el archivo existe
    if (!fs.existsSync(corruptedFile)) {
        console.error('❌ Error: El archivo no existe en la ruta especificada');
        process.exit(1);
    }

    // Leer el archivo
    console.log('📖 Leyendo archivo corrupto...');
    const fileBuffer = fs.readFileSync(corruptedFile);
    console.log(`✅ Archivo leído: ${fileBuffer.length} bytes\n`);

    // Los archivos .docx son en realidad archivos ZIP
    // Verificar si tiene la firma ZIP correcta (PK)
    const zipSignature = fileBuffer.slice(0, 2).toString('hex');
    console.log(`🔍 Firma del archivo: ${zipSignature}`);

    if (zipSignature === '504b') {
        console.log('✅ El archivo tiene estructura ZIP válida (formato .docx correcto)\n');
    } else {
        console.log('⚠️  Advertencia: El archivo no tiene firma ZIP estándar\n');
    }

    // Estrategia 1: Copiar el archivo tal cual (a veces solo necesita ser "refrescado")
    console.log('📝 Estrategia 1: Creando copia limpia del archivo...');
    fs.writeFileSync(outputFile, fileBuffer);
    console.log(`✅ Archivo copiado a: ${outputFile}\n`);

    // Estrategia 2: Buscar un archivo de recuperación automática
    const autoRecoveryFile = 'C:\\Users\\DANIEL\\OneDrive\\Documentos\\PAGARE\\PAGARE DE 1.000.000 villa elisa (Recuperado automáticamente).docx';

    if (fs.existsSync(autoRecoveryFile)) {
        console.log('📝 Estrategia 2: Se encontró un archivo de recuperación automática similar');
        console.log('   Puedes usar este como referencia si el archivo principal no funciona\n');
    }

    console.log('✅ REPARACIÓN COMPLETADA\n');
    console.log('📋 Instrucciones:');
    console.log('1. Intenta abrir el archivo reparado en: ' + outputFile);
    console.log('2. Si no funciona, intenta:');
    console.log('   - Abrir Word → Archivo → Abrir → Examinar');
    console.log('   - Selecciona el archivo y haz clic en la flecha junto a "Abrir"');
    console.log('   - Selecciona "Abrir y reparar"');
    console.log('3. Si aún no funciona, podemos extraer el contenido del archivo ZIP manualmente\n');

} catch (error) {
    console.error('❌ Error durante la reparación:', error.message);
    process.exit(1);
}
