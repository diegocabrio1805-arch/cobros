import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const imagePath = 'c:/Users/HP/Desktop/tsubasa_run_red_j_style.png';
const outputDir = 'c:/Users/HP/Desktop';

const psScript = `
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('${imagePath}')
$w = [int]$img.Width
$h = [int]$img.Height

# Remove bottom word: Crop the bottom 60 pixels
$usableH = [int]($h - 60)

$cols = 3
$rows = 2
$cellW = [int]([math]::Floor($w / $cols))
$cellH = [int]([math]::Floor($usableH / $rows))

for ($r = 0; $r -lt $rows; $r++) {
    for ($c = 0; $c -lt $cols; $c++) {
        $idx = ($r * $cols) + $c + 1
        $srcX = [int]($c * $cellW)
        $srcY = [int]($r * $cellH)
        
        $rect = New-Object System.Drawing.Rectangle $srcX, $srcY, $cellW, $cellH
        $bmp = New-Object System.Drawing.Bitmap $cellW, $cellH
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        
        $g.Clear([System.Drawing.Color]::Transparent)
        $destRect = New-Object System.Drawing.Rectangle 0, 0, $cellW, $cellH
        $g.DrawImage($img, $destRect, $rect, [System.Drawing.GraphicsUnit]::Pixel)
        
        $outPath = "${outputDir}/tsubasa_cuadro_j_" + $idx.ToString("00") + ".png"
        $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        $g.Dispose()
        $bmp.Dispose()
        Write-Host "SAVED:$outPath"
    }
}
$img.Dispose()
`;

const scriptPath = 'c:/Users/HP/.gemini/antigravity/scratch/cobros/scripts/slice_spritesheet_v2.ps1';
fs.writeFileSync(scriptPath, psScript);

try {
    const output = execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`).toString();
    console.log(output);
} catch (error) {
    console.error('Error executing slicing script:', error.message);
}
