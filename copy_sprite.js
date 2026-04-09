const fs = require('fs');
const path = require('path');

const src = "C:\\Users\\HP\\.gemini\\antigravity\\brain\\3355ff5b-cdc5-45f0-8374-ce7f5377aca8\\tsubasa_kick_spritesheet_1775435379599.png";
const dest = "c:\\Users\\HP\\..gemini\\antigravity\\scratch\\cobros\\tsubasa_kick_demo\\tsubasa_sheet.png";

try {
    fs.copyFileSync(src, dest);
    console.log("File copied successfully to " + dest);
} catch (err) {
    console.error("Error copying file:", err);
    // Try without the extra dot in path if I miscalculated
    const dest2 = "c:\\Users\\HP\\.gemini\\antigravity\\scratch\\cobros\\tsubasa_kick_demo\\tsubasa_sheet.png";
    try {
        fs.copyFileSync(src, dest2);
        console.log("File copied successfully to " + dest2);
    } catch (err2) {
        console.error("Error copying file second attempt:", err2);
    }
}
