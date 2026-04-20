const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Tamaños necesarios para Android
const sizes = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192
};

function generateIcon(size, outputPath) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Fondo azul con esquinas redondeadas
    const cornerRadius = size * 0.15625; // 80/512 ratio
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.moveTo(cornerRadius, 0);
    ctx.lineTo(size - cornerRadius, 0);
    ctx.quadraticCurveTo(size, 0, size, cornerRadius);
    ctx.lineTo(size, size - cornerRadius);
    ctx.quadraticCurveTo(size, size, size - cornerRadius, size);
    ctx.lineTo(cornerRadius, size);
    ctx.quadraticCurveTo(0, size, 0, size - cornerRadius);
    ctx.lineTo(0, cornerRadius);
    ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
    ctx.closePath();
    ctx.fill();

    // Configuración de líneas blancas
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = size * 0.02734375; // 14/512 ratio
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = 'none';

    // Escalar proporciones
    const scale = size / 512;

    // Cuerpo de la billetera
    const x = 140 * scale;
    const y = 200 * scale;
    const w = 232 * scale;
    const h = 160 * scale;
    const r = 20 * scale;

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.stroke();

    // Solapa superior
    ctx.beginPath();
    ctx.moveTo(140 * scale, 200 * scale);
    ctx.lineTo(140 * scale, 180 * scale);
    ctx.quadraticCurveTo(140 * scale, 160 * scale, 160 * scale, 160 * scale);
    ctx.lineTo(352 * scale, 160 * scale);
    ctx.quadraticCurveTo(372 * scale, 160 * scale, 372 * scale, 180 * scale);
    ctx.lineTo(372 * scale, 200 * scale);
    ctx.stroke();

    // Círculo exterior del cierre
    ctx.beginPath();
    ctx.arc(340 * scale, 280 * scale, 20 * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Círculo interior del cierre (relleno)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(340 * scale, 280 * scale, 8 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Símbolo $
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${100 * scale}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 220 * scale, 300 * scale);

    // Guardar PNG
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ Generado: ${outputPath}`);
}

console.log('🎨 Generando iconos PNG para Android...\n');

// Crear directorios si no existen
Object.keys(sizes).forEach(density => {
    const dir = path.join(__dirname, 'app', 'src', 'main', 'res', `mipmap-${density}`);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Generar ic_launcher.png
    const outputPath = path.join(dir, 'ic_launcher.png');
    generateIcon(sizes[density], outputPath);

    // Copiar como ic_launcher_round.png también
    const roundPath = path.join(dir, 'ic_launcher_round.png');
    fs.copyFileSync(outputPath, roundPath);
    console.log(`✅ Copiado: ${roundPath}`);
});

console.log('\n✨ ¡Todos los iconos generados exitosamente!');
console.log('\n📁 Ubicación: android/app/src/main/res/mipmap-*/');
