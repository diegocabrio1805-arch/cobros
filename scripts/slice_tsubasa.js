import { Jimp } from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function sliceImage() {
    const inputPath = 'C:/Users/HP/.gemini/antigravity/brain/c6f5555f-3316-41fd-b4c2-db6e6b0f381c/tsubasa_final_dynamic_knees_sheet_1775765525238.png';
    const outputDir = 'C:/Users/HP/Desktop';
    const rows = 2;
    const cols = 3;

    try {
        console.log(`Loading image: ${inputPath}`);
        const image = await Jimp.read(inputPath);
        
        const width = image.bitmap.width;
        const height = image.bitmap.height;
        const frameWidth = Math.floor(width / cols);
        const frameHeight = Math.floor(height / rows);

        console.log(`Image dimensions: ${width}x${height}`);
        console.log(`Frame dimensions: ${frameWidth}x${frameHeight}`);

        let count = 1;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = c * frameWidth;
                const y = r * frameHeight;
                
                const outputName = `tsubasa_run_dark_${count.toString().padStart(2, '0')}.png`;
                const outputPath = path.join(outputDir, outputName);
                
                console.log(`Slicing frame ${count} at (${x}, ${y})...`);
                
                const frame = image.clone().crop({ x, y, w: frameWidth, h: frameHeight });
                await frame.write(outputPath);
                
                console.log(`Saved: ${outputPath}`);
                count++;
            }
        }
        console.log('Successfully sliced all frames!');
    } catch (error) {
        console.error('Error slicing image:', error);
    }
}

sliceImage();
