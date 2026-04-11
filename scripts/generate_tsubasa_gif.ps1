Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName WindowsBase

$files = Get-ChildItem "c:\Users\HP\.gemini\antigravity\scratch\cobros\assets\tsubasa_run\tsubasa_*.png" | Sort-Object Name
$outputPath = "c:\Users\HP\.gemini\antigravity\scratch\cobros\tsubasa_running_final.gif"

Write-Host "Generando GIF animado de Tsubasa..."

# Preparar el encoder de GIF de WPF
$encoder = New-Object System.Windows.Media.Imaging.GifBitmapEncoder

foreach ($file in $files) {
    Write-Host "Procesando $($file.Name)..."
    
    $stream = [System.IO.File]::OpenRead($file.FullName)
    $decoder = [System.Windows.Media.Imaging.BitmapDecoder]::Create($stream, [System.Windows.Media.Imaging.BitmapCreateOptions]::None, [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad)
    $frame = $decoder.Frames[0]
    
    $encoder.Frames.Add($frame)
    $stream.Close()
    $stream.Dispose()
}

Write-Host "Guardando GIF en: $outputPath"
$fs = [System.IO.File]::OpenWrite($outputPath)
$encoder.Save($fs)
$fs.Close()
$fs.Dispose()

Write-Host "¡GIF creado con éxito!"
