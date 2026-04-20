Add-Type -AssemblyName System.Drawing

$code = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;

public class ImageProcessor {
    public static void RemoveConnectedBackground(string inputPath, string outputPath, int tolerance) {
        using (Bitmap bmp = new Bitmap(inputPath)) {
            int width = bmp.Width;
            int height = bmp.Height;
            
            // Creamos una máscara de lo que es "fondo"
            bool[,] isBackground = new bool[width, height];
            Queue<Point> queue = new Queue<Point>();
            
            // Color de fondo de referencia (esquina superior izquierda)
            Color bgColor = bmp.GetPixel(0, 0);
            
            // Empezamos desde los 4 bordes
            for (int x = 0; x < width; x++) {
                queue.Enqueue(new Point(x, 0));
                queue.Enqueue(new Point(x, height - 1));
            }
            for (int y = 0; y < height; y++) {
                queue.Enqueue(new Point(0, y));
                queue.Enqueue(new Point(width - 1, y));
            }
            
            while (queue.Count > 0) {
                Point p = queue.Dequeue();
                if (p.X < 0 || p.X >= width || p.Y < 0 || p.Y >= height) continue;
                if (isBackground[p.X, p.Y]) continue;
                
                Color c = bmp.GetPixel(p.X, p.Y);
                int diff = Math.Abs(c.R - bgColor.R) + Math.Abs(c.G - bgColor.G) + Math.Abs(c.B - bgColor.B);
                
                if (diff <= tolerance) {
                    isBackground[p.X, p.Y] = true;
                    // Vecinos (incluyendo diagonales para mejor captura)
                    queue.Enqueue(new Point(p.X + 1, p.Y));
                    queue.Enqueue(new Point(p.X - 1, p.Y));
                    queue.Enqueue(new Point(p.X, p.Y + 1));
                    queue.Enqueue(new Point(p.X, p.Y - 1));
                }
            }
            
            // Aplicamos la transparencia
            Bitmap res = new Bitmap(width, height, PixelFormat.Format32bppArgb);
            for (int y = 0; y < height; y++) {
                for (int x = 0; x < width; x++) {
                    if (isBackground[x, y]) {
                        res.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                    } else {
                        res.SetPixel(x, y, bmp.GetPixel(x, y));
                    }
                }
            }
            
            res.Save(outputPath, ImageFormat.Png);
            res.Dispose();
        }
    }
}
"@

Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing

$input = "C:\Users\HP\Desktop\APK\oliver mayor\temp_gen.png"
$output = "C:\Users\HP\Desktop\APK\oliver mayor\v2_pro\tsubasa_sheet_final.png"

# Copiamos la imagen generada a un lugar temporal para procesar
Copy-Item "C:\Users\HP\.gemini\antigravity\brain\b3dc83de-f7f1-46e4-a87b-a7790224bc28\tsubasa_blueprint_8frames_running_1775708705353.png" "C:\Users\HP\Desktop\APK\oliver mayor\temp_gen.png" -Force

if (-not (Test-Path "C:\Users\HP\Desktop\APK\oliver mayor\v2_pro")) { New-Item -ItemType Directory -Path "C:\Users\HP\Desktop\APK\oliver mayor\v2_pro" -Force }

Write-Host "Iniciando remoción de fondo conectado (Smart Flood Fill)..."
[ImageProcessor]::RemoveConnectedBackground("C:\Users\HP\Desktop\APK\oliver mayor\temp_gen.png", $output, 40)
Write-Host "Hoja final generada con éxito."
