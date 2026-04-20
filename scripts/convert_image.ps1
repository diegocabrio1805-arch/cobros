Add-Type -AssemblyName System.Drawing
$src = "C:\Users\HP\.gemini\antigravity\brain\b3dc83de-f7f1-46e4-a87b-a7790224bc28\media__1775693252390.jpg"
$dest = "C:\Users\HP\Desktop\APK\tsubasa_sprite.png"
$img = [System.Drawing.Image]::FromFile($src)
$img.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
$img.Dispose()
Write-Host "Conversión completada: $dest"
