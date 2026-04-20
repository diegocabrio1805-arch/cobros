Add-Type -AssemblyName System.Drawing

$inputPath = "C:\Users\HP\.gemini\antigravity\brain\b3dc83de-f7f1-46e4-a87b-a7790224bc28\tsubasa_running_blue_6frames_1775702831970.png"
$outputDir = "C:\Users\HP\Desktop\APK\oliver mayor"
$individualDir = Join-Path $outputDir "individuales"

if (-not (Test-Path $individualDir)) { New-Item -ItemType Directory -Path $individualDir -Force }

Write-Host "Cargando imagen base..."
$src = [System.Drawing.Bitmap]::FromFile($inputPath)
$width = $src.Width
$height = $src.Height

# 1. Crear copia con fondo transparente
Write-Host "Removiendo fondo blanco (iteración de píxeles)..."
$transparentSheet = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($transparentSheet)

for ($y = 0; $y -lt $height; $y++) {
    for ($x = 0; $x -lt $width; $x++) {
        $pixel = $src.GetPixel($x, $y)
        # Si NO es blanco (umbral 240)
        if ($pixel.R -lt 250 -or $pixel.G -lt 250 -or $pixel.B -lt 250) {
            $transparentSheet.SetPixel($x, $y, $pixel)
        } else {
            $transparentSheet.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
    }
}

# Guardar hoja completa
$sheetPath = Join-Path $outputDir "tsubasa_running_sheet.png"
$transparentSheet.Save($sheetPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Hoja guardada en: $sheetPath"

# 2. Slicing
$frameCount = 6
$frameWidth = [Math]::Floor($width / $frameCount)

for ($i = 0; $i -lt $frameCount; $i++) {
    $rect = New-Object System.Drawing.Rectangle ($i * $frameWidth), 0, $frameWidth, $height
    $frame = $transparentSheet.Clone($rect, $transparentSheet.PixelFormat)
    $framePath = Join-Path $individualDir "tsubasa_run_frame_0$($i+1).png"
    $frame.Save($framePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $frame.Dispose()
    Write-Host "Cuadro $($i+1) guardado."
}

$src.Dispose()
$transparentSheet.Dispose()
$graphics.Dispose()
Write-Host "¡Proceso finalizado con éxito!"
