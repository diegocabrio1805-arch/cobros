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

// SVG del icono de billetera
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#2563eb" rx="80"/>
  <g stroke="#ffffff" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <rect x="140" y="200" width="232" height="160" rx="20"/>
    <path d="M 140 200 L 140 180 Q 140 160 160 160 L 352 160 Q 372 160 372 180 L 372 200"/>
    <circle cx="340" cy="280" r="20"/>
    <circle cx="340" cy="280" r="8" fill="#ffffff"/>
    <text x="220" y="310" font-family="Arial, sans-serif" font-size="100" font-weight="bold" fill="#ffffff" text-anchor="middle">$</text>
  </g>
</svg>`;

console.log('🎨 Generando iconos para Android...\n');
console.log('Tamaños a generar:');
Object.entries(sizes).forEach(([density, size]) => {
    console.log(`  - mipmap-${density}: ${size}x${size}px`);
});

console.log('\n📝 SVG guardado en: icon_wallet_source.svg');
fs.writeFileSync('icon_wallet_source.svg', svgContent);

console.log('\n⚠️  NOTA: Para convertir SVG a PNG necesitas instalar una herramienta.');
console.log('Opciones:');
console.log('  1. Usar un convertidor online: https://cloudconvert.com/svg-to-png');
console.log('  2. Instalar Inkscape: https://inkscape.org/');
console.log('  3. Usar ImageMagick: https://imagemagick.org/');
console.log('\nO puedo crear los archivos PNG directamente usando canvas...');
