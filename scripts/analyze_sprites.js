import Jimp from 'jimp';
import fs from 'fs';

const imagePath = 'C:/Users/HP/.gemini/antigravity/brain/tempmediaStorage/media__1775695277998.png';

async function analyze() {
    try {
        const image = await Jimp.read(imagePath);
        console.log(`Dimensions: ${image.bitmap.width}x${image.bitmap.height}`);
        
        // Assuming 4 frames in 1 row based on the image name/context
        const frames = 4;
        const frameWidth = image.bitmap.width / frames;
        const frameHeight = image.bitmap.height;
        
        console.log(`Calculated Frame Size: ${frameWidth}x${frameHeight}`);
        
        fs.writeFileSync('sprite_info.json', JSON.stringify({
            width: image.bitmap.width,
            height: image.bitmap.height,
            frames: frames,
            frameWidth: frameWidth,
            frameHeight: frameHeight
        }, null, 2));
    } catch (e) {
        console.error(e);
    }
}

analyze();
