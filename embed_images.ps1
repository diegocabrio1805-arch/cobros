# Script para incrustar imagenes como base64 en el HTML y generar PDF

$inputHtml = "C:\Users\DANIEL\Desktop\cobros\PROPUESTA_COMERCIAL.html"
$outputHtml = "C:\Users\DANIEL\Desktop\cobros\PROPUESTA_COMERCIAL_print.html"
$outputPdf = "C:\Users\DANIEL\Desktop\cobros\PROPUESTA_COMERCIAL.pdf"

$html = Get-Content $inputHtml -Raw -Encoding UTF8

# Reemplazar cada src de imagen local por base64
$pattern = 'src="([^"]+\.(png|jpg|jpeg|gif|webp|PNG|JPG|JPEG))"'
$html = [regex]::Replace($html, $pattern, {
        param($match)
        $path = $match.Groups[1].Value
        # Normalizar ruta (reemplazar / por \)
        $path = $path.Replace('/', '\')
        if (Test-Path $path) {
            $bytes = [System.IO.File]::ReadAllBytes($path)
            $b64 = [Convert]::ToBase64String($bytes)
            $ext = [System.IO.Path]::GetExtension($path).ToLower().TrimStart('.')
            if ($ext -eq 'jpg') { $ext = 'jpeg' }
            Write-Host "Incrustando: $path"
            return "src=`"data:image/$ext;base64,$b64`""
        }
        else {
            Write-Host "NO ENCONTRADO: $path"
            return $match.Value
        }
    })

# Guardar HTML con imagenes incrustadas
[System.IO.File]::WriteAllText($outputHtml, $html, [System.Text.Encoding]::UTF8)
Write-Host "HTML con imagenes guardado: $outputHtml"

# Generar PDF con Chrome headless
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$args = @(
    "--headless",
    "--disable-gpu",
    "--print-to-pdf=`"$outputPdf`"",
    "--print-to-pdf-no-header",
    "--no-margins",
    "file:///$($outputHtml.Replace('\','/'))"
)
Write-Host "Generando PDF..."
Start-Process -FilePath $chrome -ArgumentList $args -Wait -NoNewWindow
Write-Host "PDF generado: $outputPdf"
