import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const videoPath = 'C:\\Users\\Usuario\\Desktop\\video anexo\\Corte_Segundos_El_Ga (1).mp4';
const outputImgPath = 'C:\\Users\\Usuario\\Desktop\\video anexo\\referencia_corte_2.png';

async function main() {
  console.log(`Checking if video exists at: ${videoPath}`);
  if (!fs.existsSync(videoPath)) {
    console.error('❌ Video file not found');
    process.exit(1);
  }

  console.log('Extracting the last frame using ffmpeg...');
  try {
    // Extract the very last frame of the 10-second video
    execSync(`ffmpeg -y -sseof -3 -i "${videoPath}" -update true -frames:v 1 "${outputImgPath}"`, { stdio: 'inherit' });
    console.log(`✅ Reference image created successfully at: ${outputImgPath}`);
  } catch (error) {
    console.error('❌ Failed to extract frame with ffmpeg. Checking if ffmpeg is in path...', error.message);
  }
}

main().catch(console.error);
