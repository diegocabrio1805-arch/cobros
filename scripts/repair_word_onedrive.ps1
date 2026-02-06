# Script para verificar y reparar documento Word desde OneDrive

$sourceFile = "C:\Users\DANIEL\OneDrive\Documentos\PAGARE\PAGARE DE 1.200.000 villa elisa.docx"
$outputFile = "C:\Users\DANIEL\Desktop\PAGARE_1200000_REPARADO.docx"

Write-Host "=== REPARADOR DE DOCUMENTOS WORD ===" -ForegroundColor Cyan
Write-Host ""

# Verificar si el archivo existe
if (-not (Test-Path $sourceFile)) {
    Write-Host "ERROR: El archivo no existe en la ruta especificada" -ForegroundColor Red
    Write-Host "Ruta: $sourceFile" -ForegroundColor Yellow
    exit 1
}

# Obtener informacion del archivo
$fileInfo = Get-Item $sourceFile
Write-Host "Archivo encontrado:" -ForegroundColor Green
Write-Host "  Nombre: $($fileInfo.Name)" -ForegroundColor White
Write-Host "  Tamano: $($fileInfo.Length) bytes" -ForegroundColor White
Write-Host "  Atributos: $($fileInfo.Attributes)" -ForegroundColor White
Write-Host ""

# Verificar si es un archivo de OneDrive solo en la nube
if ($fileInfo.Attributes -match "ReparsePoint") {
    Write-Host "ADVERTENCIA: Este archivo puede estar solo en la nube de OneDrive" -ForegroundColor Yellow
    Write-Host "Intentando descargar el archivo..." -ForegroundColor Yellow
    Write-Host ""
    
    # Intentar forzar la descarga leyendo el archivo
    try {
        $null = Get-Content $sourceFile -TotalCount 1
        Start-Sleep -Seconds 2
    }
    catch {
        Write-Host "No se pudo forzar la descarga automaticamente" -ForegroundColor Yellow
    }
}

# Intentar copiar el archivo
try {
    Write-Host "Copiando archivo al escritorio..." -ForegroundColor Cyan
    
    # Metodo 1: Copy-Item directo
    Copy-Item -Path $sourceFile -Destination $outputFile -Force -ErrorAction Stop
    
    Write-Host "EXITO: Archivo copiado correctamente" -ForegroundColor Green
    Write-Host "Ubicacion: $outputFile" -ForegroundColor White
    Write-Host ""
    
    # Verificar el archivo copiado
    $copiedFile = Get-Item $outputFile
    Write-Host "Archivo reparado:" -ForegroundColor Green
    Write-Host "  Tamano: $($copiedFile.Length) bytes" -ForegroundColor White
    
    # Verificar firma ZIP (los .docx son archivos ZIP)
    $bytes = [System.IO.File]::ReadAllBytes($outputFile)
    if ($bytes.Length -ge 2) {
        $sig1 = $bytes[0].ToString("X2")
        $sig2 = $bytes[1].ToString("X2")
        $signature = "$sig1$sig2"
        
        Write-Host "  Firma: $signature" -ForegroundColor White
        
        if ($signature -eq "504B") {
            Write-Host "  Estado: Estructura ZIP valida (DOCX correcto)" -ForegroundColor Green
        }
        else {
            Write-Host "  Estado: Firma no estandar - puede estar corrupto" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "=== INSTRUCCIONES ===" -ForegroundColor Cyan
    Write-Host "1. Intenta abrir el archivo desde el escritorio" -ForegroundColor White
    Write-Host "2. Si Word muestra error, usa 'Abrir y reparar':" -ForegroundColor White
    Write-Host "   - Abre Word" -ForegroundColor Gray
    Write-Host "   - Archivo > Abrir > Examinar" -ForegroundColor Gray
    Write-Host "   - Selecciona el archivo" -ForegroundColor Gray
    Write-Host "   - Click en la flecha junto a 'Abrir'" -ForegroundColor Gray
    Write-Host "   - Selecciona 'Abrir y reparar'" -ForegroundColor Gray
    Write-Host ""
    
    # Abrir el archivo
    Write-Host "Abriendo archivo..." -ForegroundColor Cyan
    Start-Process $outputFile
    
}
catch {
    Write-Host "ERROR al copiar el archivo" -ForegroundColor Red
    Write-Host "Detalles: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "SOLUCION ALTERNATIVA:" -ForegroundColor Cyan
    Write-Host "1. Abre el Explorador de archivos" -ForegroundColor White
    Write-Host "2. Ve a: $sourceFile" -ForegroundColor Yellow
    Write-Host "3. Click derecho > Copiar" -ForegroundColor White
    Write-Host "4. Ve al Escritorio y pega el archivo" -ForegroundColor White
    Write-Host "5. Intenta abrir el archivo copiado" -ForegroundColor White
    exit 1
}
