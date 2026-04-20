
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('c:/Users/HP/Desktop/tsubasa_run_red_j_style.png')
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
        
        $outPath = "c:/Users/HP/Desktop/tsubasa_cuadro_j_" + $idx.ToString("00") + ".png"
        $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        $g.Dispose()
        $bmp.Dispose()
        Write-Host "SAVED:$outPath"
    }
}
$img.Dispose()
