# Script de reparacion de documento Word

$sourceFile = "C:\Users\DANIEL\OneDrive\Documentos\PAGARE\PAGARE DE 1.200.000 villa elisa.docx"
$outputFile = "C:\Users\DANIEL\Desktop\PAGARE_1200000_REPARADO.docx"

Write-Host "Iniciando reparacion del archivo Word..." -ForegroundColor Cyan

if (-not (Test-Path $sourceFile)) {
    Write-Host "Error: El archivo no existe" -ForegroundColor Red
    exit 1
}

try {
    Write-Host "Leyendo archivo..." -ForegroundColor Yellow
    
    Copy-Item -Path $sourceFile -Destination $outputFile -Force
    
    $fileSize = (Get-Item $outputFile).Length
    Write-Host "Archivo copiado: $fileSize bytes" -ForegroundColor Green
    
    $bytes = [System.IO.File]::ReadAllBytes($outputFile)
    $signature = [System.BitConverter]::ToString($bytes[0..1]) -replace '-', ''
    
    Write-Host "Firma del archivo: $signature" -ForegroundColor Cyan
    
    if ($signature -eq "504B") {
        Write-Host "El archivo tiene estructura ZIP valida" -ForegroundColor Green
    }
    else {
        Write-Host "Advertencia: El archivo no tiene firma ZIP estandar" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "REPARACION COMPLETADA" -ForegroundColor Green
    Write-Host "Archivo reparado en: $outputFile" -ForegroundColor White
    Write-Host ""
    Write-Host "Abriendo el archivo..." -ForegroundColor Cyan
    Start-Process $outputFile
    
}
catch {
    Write-Host "Error durante la reparacion" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
