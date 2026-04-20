$code = @"
using System;
using System.Drawing;
using System.Collections.Generic;

public class ImageProcessor {
    public static void FloodFillAlpha(string inputPath, string outputPath) {
        using (Bitmap bitmap = (Bitmap)Image.FromFile(inputPath)) {
            int width = bitmap.Width;
            int height = bitmap.Height;
            using (Bitmap newBitmap = new Bitmap(width, height, System.Drawing.Imaging.PixelFormat.Format32bppArgb)) {
                using (Graphics g = Graphics.FromImage(newBitmap)) {
                    g.DrawImage(bitmap, 0, 0, width, height);
                }

                bool[] visited = new bool[width * height];
                Queue<Point> queue = new Queue<Point>();
                
                // Add corners if valid
                if (width > 0 && height > 0) {
                    Point[] corners = {
                        new Point(0, 0),
                        new Point(width - 1, 0),
                        new Point(0, height - 1),
                        new Point(width - 1, height - 1)
                    };
                    foreach (var corner in corners) {
                        int idx = corner.Y * width + corner.X;
                        if (!visited[idx]) {
                            visited[idx] = true;
                            queue.Enqueue(corner);
                        }
                    }
                }

                while (queue.Count > 0) {
                    Point p = queue.Dequeue();
                    Color c = newBitmap.GetPixel(p.X, p.Y);
                    
                    // Threshold check (white background)
                    if (c.R >= 245 && c.G >= 245 && c.B >= 245) {
                        newBitmap.SetPixel(p.X, p.Y, Color.FromArgb(0, 0, 0, 0));
                        
                        int[] dx = { 1, -1, 0, 0 };
                        int[] dy = { 0, 0, 1, -1 };
                        for (int i = 0; i < 4; i++) {
                            int nx = p.X + dx[i];
                            int ny = p.Y + dy[i];
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                int idx = ny * width + nx;
                                if (!visited[idx]) {
                                    visited[idx] = true;
                                    queue.Enqueue(new Point(nx, ny));
                                }
                            }
                        }
                    }
                }
                newBitmap.Save(outputPath, System.Drawing.Imaging.ImageFormat.Png);
            }
        }
    }
}
"@

Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing
[ImageProcessor]::FloodFillAlpha("C:\Users\HP\.gemini\antigravity\brain\b3dc83de-f7f1-46e4-a87b-a7790224bc28\media__1775693252390.jpg", "C:\Users\HP\Desktop\APK\tsubasa_transparente_final.png")
Write-Host "¡Proceso terminado con éxito usando C# inteligente!"
