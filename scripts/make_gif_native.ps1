Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName WindowsBase

$inputPath = "C:\Users\HP\.gemini\antigravity\brain\tempmediaStorage\media__1775695277998.png"
$outputPath = "C:\Users\HP\Desktop\APK\tsubasa_running.gif"

Write-Host "Iniciando codificación nativa de GIF..."

# 1. Cargar la imagen base
$srcImg = [System.Drawing.Bitmap]::FromFile($inputPath)
$frameWidth = 256
$frameHeight = 514
$frameCount = 4

# 2. Preparar el encoder de GIF de WPF (más potente que GDI+)
$encoder = New-Object System.Windows.Media.Imaging.GifBitmapEncoder

for ($i = 0; $i -lt $frameCount; $i++) {
    Write-Host "Procesando cuadro $($i + 1)..."
    
    # Slicing con System.Drawing
    $rect = New-Object System.Drawing.Rectangle ($i * $frameWidth), 0, $frameWidth, $frameHeight
    $frameBmp = $srcImg.Clone($rect, $srcImg.PixelFormat)
    
    # Convertir System.Drawing.Bitmap a System.Windows.Media.Imaging.BitmapSource
    $ms = New-Object System.IO.MemoryStream
    $frameBmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $ms.Position = 0
    
    $decoder = [System.Windows.Media.Imaging.BitmapDecoder]::Create($ms, [System.Windows.Media.Imaging.BitmapCreateOptions]::None, [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad)
    $frame = $decoder.Frames[0]
    
    # Añadir frame al encoder
    $encoder.Frames.Add($frame)
    
    # Limpiar
    $frameBmp.Dispose()
    $ms.Dispose()
}

# 3. Guardar el archivo final
Write-Host "Guardando GIF en: $outputPath"
$fs = [System.IO.File]::OpenWrite($outputPath)
$encoder.Save($fs)
$fs.Close()

# Limpiar imagen base
$srcImg.Dispose()

Write-Host "¡¡ÉXITO!! GIF animado creado sin herramientas externas."
