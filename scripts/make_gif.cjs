const Jimp = require('jimp');
const GIFEncoder = require('gifencoder');
const fs = require('fs');

const inputPath = 'C:/Users/HP/.gemini/antigravity/brain/tempmediaStorage/media__1775695277998.png';
const outputPath = 'C:/Users/HP/Desktop/APK/tsubasa_running.gif';

async function createGif() {
    console.log('Iniciando creación de GIF...');
    const image = await Jimp.read(inputPath);
    const width = 256;
    const height = 514;
    
    const encoder = new GIFEncoder(width, height);
    encoder.createReadStream().pipe(fs.createWriteStream(outputPath));
    
    encoder.start();
    encoder.setRepeat(0);   // 0 for repeat, -1 for no-repeat
    encoder.setDelay(100);  // frame delay in ms
    encoder.setQuality(10); // image quality. 10 is default.

    for (let i = 0; i < 4; i++) {
        console.log(`Procesando cuadro ${i + 1}...`);
        const frame = image.clone().crop(i * width, 0, width, height);
        // GIFEncoder needs raw pixel data
        encoder.addFrame(frame.bitmap.data);
    }

    encoder.finish();
    console.log('¡GIF creado con éxito en:', outputPath);
}

createGif().catch(err => console.error('Error:', err));
