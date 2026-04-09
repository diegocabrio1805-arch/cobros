Add-Type -AssemblyName System.Drawing

$inputPath = "C:\Users\HP\Desktop\APK\tsubasa_sprite.png"
$outputPath = "C:\Users\HP\Desktop\APK\tsubasa_transparente.png"

Write-Host "Cargando imagen: $inputPath"
$bitmap = [System.Drawing.Bitmap]::FromFile($inputPath)
$newBitmap = new-object System.Drawing.Bitmap($bitmap.Width, $bitmap.Height)

# Definir el umbral para el blanco (puedes ajustar si es necesario)
$threshold = 240 

Write-Host "Procesando píxeles... Esto puede tardar unos segundos."

for ($y = 0; $y -lt $bitmap.Height; $y++) {
    for ($x = 0; $x -lt $bitmap.Width; $x++) {
        $color = $bitmap.GetPixel($x, $y)
        
        # Si el píxel es blanco (o muy cercano al blanco en los 3 canales)
        if ($color.R -ge $threshold -and $color.G -ge $threshold -and $color.B -ge $threshold) {
            # Establecer como transparente
            $newBitmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        } else {
            # Mantener el color original
            $newBitmap.SetPixel($x, $y, $color)
        }
    }
}

Write-Host "Guardando resultado en: $outputPath"
$newBitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Liberar recursos
$bitmap.Dispose()
$newBitmap.Dispose()

Write-Host "¡Proceso terminado con éxito!"
