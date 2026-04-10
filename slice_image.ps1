
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('c:/Users/HP/Desktop/tsubasa_run_red_j_style.png')
$w = $img.Width
$h = $img.Height
"DIMENSIONS:$w,$h"

$cols = 3
$rows = 2
$cellW = [math]::Floor($w / $cols)
$cellH = [math]::Floor($h / $rows)

# Assuming "the word at the bottom" is in a small margin
# We'll crop the total height slightly if needed, or just let the 2nd row be slightly shorter
# to avoid the very bottom edge. Or better, just slice the 6 cells exactly.

for ($r = 0; $r -lt $rows; $r++) {
    for ($c = 0; $c -lt $cols; $c++) {
        $idx = ($r * $cols) + $c + 1
        $rect = New-Object System.Drawing.Rectangle ($c * $cellW), ($r * $cellH), $cellW, $cellH
        $bmp = New-Object System.Drawing.Bitmap $cellW, $cellH
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        
        # Transparent background handle if needed, but System.Drawing.Image usually keeps it
        $g.Clear([System.Drawing.Color]::Transparent)
        $g.DrawImage($img, (New-Object System.Drawing.Rectangle 0, 0, $cellW, $cellH), $rect, [System.Drawing.GraphicsUnit]::Pixel)
        
        $outPath = "c:/Users/HP/Desktop/tsubasa_cuadro_j_" + $idx.ToString("00") + ".png"
        $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        $g.Dispose()
        $bmp.Dispose()
        "SAVED:$outPath"
    }
}
$img.Dispose()
