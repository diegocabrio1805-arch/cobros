Add-Type -AssemblyName System.Drawing

$inputPath = "C:\Users\HP\.gemini\antigravity\brain\b3dc83de-f7f1-46e4-a87b-a7790224bc28\media__1775693252390.jpg"
$outputPath = "C:\Users\HP\Desktop\APK\tsubasa_transparente_final.png"

Write-Host "Cargando imagen original: $inputPath"
$bitmap = [System.Drawing.Bitmap]::FromFile($inputPath)
$width = $bitmap.Width
$height = $bitmap.Height

# Creamos una copia en memoria con soporte de transparencia (32bpp)
$newBitmap = new-object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

# Copiamos la imagen original a la nueva bitmap
$g = [System.Drawing.Graphics]::FromImage($newBitmap)
$g.DrawImage($bitmap, 0, 0, $width, $height)
$g.Dispose()

# Array para registrar píxeles visitados (para el BFS)
$visited = new-object "bool[]" ($width * $height)

# Cola para el algoritmo BFS (Breadth-First Search)
$queue = new-object System.Collections.Generic.Queue[System.Drawing.Point]

# Marcamos los puntos de inicio (las 4 esquinas del fondo)
# Esquina Superior Izquierda (0,0)
if ($width -gt 0 -and $height -gt 0) {
    $queue.Enqueue((new-object System.Drawing.Point(0,0)))
    $visited[0] = $true
}
# Esquina Superior Derecha
if ($width -gt 1) {
    $x = $width - 1
    if (-not $visited[$x]) { $queue.Enqueue((new-object System.Drawing.Point($x, 0))); $visited[$x] = $true }
}
# Esquina Inferior Izquierda
if ($height -gt 1) {
    $idx = ($height - 1) * $width
    if (-not $visited[$idx]) { $queue.Enqueue((new-object System.Drawing.Point(0, $height - 1))); $visited[$idx] = $true }
}

# Umbral para detectar el fondo (blanco)
$threshold = 240

Write-Host "Ejecutando Flood Fill inteligente... Protegiendo uniforme."

while ($queue.Count -gt 0) {
    $p = $queue.Dequeue()
    $c = $newBitmap.GetPixel($p.X, $p.Y)

    # Si el píxel es blanco/claro (parte del fondo)
    if ($c.R -ge $threshold -and $c.G -ge $threshold -and $c.B -ge $threshold) {
        # Lo volvemos transparente
        $newBitmap.SetPixel($p.X, $p.Y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))

        # Añadimos los 4 vecinos manualmente para evitar errores de array
        # Vecino Derecha
        $nx = $p.X + 1
        $ny = $p.Y
        if ($nx -lt $width) {
            $idx = ($ny * $width) + $nx
            if (-not $visited[$idx]) { $visited[$idx] = $true; $queue.Enqueue((new-object System.Drawing.Point($nx, $ny))) }
        }
        # Vecino Izquierda
        $nx = $p.X - 1
        if ($nx -ge 0) {
            $idx = ($ny * $width) + $nx
            if (-not $visited[$idx]) { $visited[$idx] = $true; $queue.Enqueue((new-object System.Drawing.Point($nx, $ny))) }
        }
        # Vecino Abajo
        $nx = $p.X
        $ny = $p.Y + 1
        if ($ny -lt $height) {
            $idx = ($ny * $width) + $nx
            if (-not $visited[$idx]) { $visited[$idx] = $true; $queue.Enqueue((new-object System.Drawing.Point($nx, $ny))) }
        }
        # Vecino Arriba
        $ny = $p.Y - 1
        if ($ny -ge 0) {
            $idx = ($ny * $width) + $nx
            if (-not $visited[$idx]) { $visited[$idx] = $true; $queue.Enqueue((new-object System.Drawing.Point($nx, $ny))) }
        }
    }
}

Write-Host "Guardando imagen final protegida: $outputPath"
$newBitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Limpiar
$bitmap.Dispose()
$newBitmap.Dispose()

Write-Host "¡Perfecto! El fondo se eliminó respetando el cuerpo del personaje."
