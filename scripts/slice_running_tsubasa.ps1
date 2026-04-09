Add-Type -AssemblyName System.Drawing

$inputPath = "C:\Users\HP\Desktop\APK\oliver mayor\tsubasa_running_sheet.png"
$outputDir = "C:\Users\HP\Desktop\APK\oliver mayor\individuales"

if (-not (Test-Path $outputDir)) { New-Item -ItemType Directory -Path $outputDir }

$srcImg = [System.Drawing.Bitmap]::FromFile($inputPath)
$totalWidth = $srcImg.Width
$totalHeight = $srcImg.Height

$frameCount = 6
$frameWidth = [Math]::Floor($totalWidth / $frameCount)
$frameHeight = $totalHeight

Write-Host "Slicing sheet ($totalWidth x $totalHeight) into $frameCount frames of size ($frameWidth x $frameHeight)..."

for ($i = 0; $i -lt $frameCount; $i++) {
    $x = $i * $frameWidth
    $outputPath = Join-Path $outputDir "tsubasa_run_frame_0$($i + 1).png"
    
    $rect = New-Object System.Drawing.Rectangle $x, 0, $frameWidth, $frameHeight
    $cropImg = $srcImg.Clone($rect, $srcImg.PixelFormat)
    $cropImg.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $cropImg.Dispose()
    
    Write-Host "Saved: $outputPath"
}

$srcImg.Dispose()
Write-Host "¡Slicing completado con éxito!"
