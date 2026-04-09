Add-Type -AssemblyName System.Drawing

$inputPath = "C:\Users\HP\Desktop\APK\oliver mayor\v2_pro\tsubasa_sheet_final.png"
$outputDir = "C:\Users\HP\Desktop\APK\oliver mayor\v2_pro"

$srcImg = [System.Drawing.Bitmap]::FromFile($inputPath)
$totalWidth = $srcImg.Width
$totalHeight = $srcImg.Height

$frameCount = 8
$frameWidth = [Math]::Floor($totalWidth / $frameCount)
$frameHeight = $totalHeight

Write-Host "Recortando hoja maestra ($totalWidth x $totalHeight) en $frameCount cuadros..."

for ($i = 0; $i -lt $frameCount; $i++) {
    $x = $i * $frameWidth
    $outputPath = Join-Path $outputDir "tsubasa_v2_f$($i + 1).png"
    
    $rect = New-Object System.Drawing.Rectangle $x, 0, $frameWidth, $frameHeight
    $cropImg = $srcImg.Clone($rect, $srcImg.PixelFormat)
    $cropImg.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $cropImg.Dispose()
    
    Write-Host "Cuadro $($i + 1) guardado."
}

$srcImg.Dispose()
Write-Host "¡Slicing de alta fidelidad completado!"
