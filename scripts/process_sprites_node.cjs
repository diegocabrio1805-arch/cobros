const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

const inputPath = 'C:/Users/HP/.gemini/antigravity/brain/b3dc83de-f7f1-46e4-a87b-a7790224bc28/tsubasa_running_blue_6frames_1775702831970.png';
const outputDir = 'C:/Users/HP/Desktop/APK/oliver mayor';
const individualDir = path.join(outputDir, 'individuales');

if (!fs.existsSync(individualDir)) {
    fs.mkdirSync(individualDir, { recursive: true });
}

async function process() {
    console.log('Cargando imagen...');
    const image = await Jimp.read(inputPath);
    
    // 1. Remover fondo blanco (Flood fill básico o iteración)
    // Para bordes suaves, podemos usar un pequeño desenfoque o simplemente filtrar
    console.log('Removiendo fondo blanco...');
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
        const r = this.bitmap.data[idx + 0];
        const g = this.bitmap.data[idx + 1];
        const b = this.bitmap.data[idx + 2];
        
        // Si es muy blanco (tolerancia)
        if (r > 240 && g > 240 && b > 240) {
            this.bitmap.data[idx + 3] = 0; // Alpha 0
        }
    });

    const sheetPath = path.join(outputDir, 'tsubasa_running_sheet.png');
    await image.writeAsync(sheetPath);
    console.log('Hoja de sprites guardada:', sheetPath);

    // 2. Slicing
    const frameCount = 6;
    const frameWidth = Math.floor(image.bitmap.width / frameCount);
    const frameHeight = image.bitmap.height;

    console.log(`Recortando ${frameCount} cuadros de ${frameWidth}x${frameHeight}...`);
    for (let i = 0; i < frameCount; i++) {
        const frame = image.clone().crop(i * frameWidth, 0, frameWidth, frameHeight);
        const framePath = path.join(individualDir, `tsubasa_frame_0${i + 1}.png`);
        await frame.writeAsync(framePath);
        console.log('Guardado:', framePath);
    }

    console.log('¡Proceso completado con éxito!');
}

process().catch(console.error);
