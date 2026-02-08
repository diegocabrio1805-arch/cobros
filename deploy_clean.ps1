# deploy_clean.ps1
# Version Simplificada para Ejecucion Automatica

Write-Host "INICIANDO DESPLIEGUE AUTOMATICO..." -ForegroundColor Cyan

# 1. Verificar Estado
Write-Host "1. Verificando estado de Netlify..." -ForegroundColor Yellow
try {
    netlify status
}
catch {
    Write-Host "WARNING: No se pudo verificar estado. Intentando continuar..." -ForegroundColor Red
}

# 2. Limpiar
Write-Host "2. Limpiando carpeta dist..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
    Write-Host "   Carpeta dist eliminada." -ForegroundColor Green
}

# 3. Compilar
Write-Host "3. Compilando (npm run build)..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Fallo la compilacion." -ForegroundColor Red
    exit 1
}

# 4. Desplegar
Write-Host "4. Subiendo a Produccion..." -ForegroundColor Yellow
# --prod despliega a produccion
# --dir=dist especifica la carpeta
cmd /c "netlify deploy --prod --dir=dist"

if ($LASTEXITCODE -ne 0) { 
    Write-Host "ERROR: Fallo el despliegue." -ForegroundColor Red
    exit 1
}

Write-Host "DESPLIEGUE EXITOSO." -ForegroundColor Green
exit 0
