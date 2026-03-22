const fs = require('fs');
const dest = 'C:\\Users\\HP\\Desktop\\cobros\\components\\Clients.tsx';
const src = 'C:\\Users\\HP\\.gemini\\antigravity\\scratch\\cobros\\components\\Clients.tsx';

try {
  if (fs.existsSync(dest) && fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log("SUCCESSFULLY COPIED Clients.tsx to Desktop!");
  } else {
    console.log("Error: One of the files doesn't exist");
  }
} catch (e) {
  console.log("Error copying:", e);
}
