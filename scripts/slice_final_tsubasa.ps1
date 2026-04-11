Add-Type -AssemblyName System.Drawing

$inputPath = "c:\Users\HP\.gemini\antigravity\scratch\cobros\tsubasa_final_6_frames_rojo.png"
$outputDir = "c:\Users\HP\.gemini\antigravity\scratch\cobros\assets\tsubasa_run"

if (-not (Test-Path $outputDir)) { New-Item -ItemType Directory -Path $outputDir }

$srcImg = [System.Drawing.Bitmap]::FromFile($inputPath)
$totalWidth = $srcImg.Width
$totalHeight = $srcImg.Height

$cols = 3
$rows = 2
$cellW = [int]([math]::Floor($totalWidth / $cols))
$cellH = [int]([math]::Floor($totalHeight / $rows))

Write-Host "Slicing sheet ($totalWidth x $totalHeight) into $cols x $rows grid..."
Write-Host "Frame size: $cellW x $cellH"

for ($r = 0; $r -lt $rows; $r++) {
    for ($c = 0; $c -lt $cols; $c++) {
        $idx = ($r * $cols) + $c + 1
        $x = $c * $cellW
        $y = $r * $cellH
        
        $outputPath = Join-Path $outputDir "tsubasa_0$($idx).png"
        
        # Create a clean transparent bitmap for the crop
        $cropImg = New-Object System.Drawing.Bitmap $cellW, $cellH
        $g = [System.Drawing.Graphics]::FromImage($cropImg)
        $g.Clear([System.Drawing.Color]::Transparent)
        
        $srcRect = New-Object System.Drawing.Rectangle $x, $y, $cellW, $cellH
        $destRect = New-Object System.Drawing.Rectangle 0, 0, $cellW, $cellH
        
        $g.DrawImage($srcImg, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
        $cropImg.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        $g.Dispose()
        $cropImg.Dispose()
        
        Write-Host "Saved: $outputPath"
    }
}

$srcImg.Dispose()
Write-Host "¡Slicing completado con éxito en $outputDir!"
