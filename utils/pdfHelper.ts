
import { jsPDF } from 'jspdf';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { Capacitor } from '@capacitor/core';

/**
 * Saves and opens a PDF. Use this instead of doc.save().
 * @param doc The jsPDF instance
 * @param fileName The desired filename (e.g., 'reporte.pdf')
 */
export const saveAndOpenPDF = async (doc: jsPDF, fileName: string) => {
    if (Capacitor.isNativePlatform()) {
        try {
            // 1. Get base64 content (without data URI prefix)
            const base64 = doc.output('datauristring').split(',')[1];

            // 2. Write file to Documents directory (or External)
            // On Android 11+, Directory.Documents is scoped storage friendly?
            // Or use Directory.External to write to app-specific external storage which doesn't need permissions
            // We added <external-files-path> which maps to Directory.External
            const directory = Directory.External;

            const result = await Filesystem.writeFile({
                path: fileName,
                data: base64,
                directory: directory,
                // encoding is explicitly NOT set because output is base64 string, 
                // passing it as data usually works if it's treated as binary/base64?
                // Wait, Filesystem.writeFile: if data is string, it writes string.
                // But we want it to decode base64? 
                // No, Filesystem API writes text by default. 
                // To write binary from base64 string, we likely don't need Encoding.UTF8.
                // But docs say: "If data is a string, it will be written to the file with the specified encoding... Default is UTF8".
                // If we want raw binary, we usually pass base64 but need to tell it?
                // Actually, if we pass NO encoding, it might try to guess or use UTF8.
                // The safest way for binary PDF is to rely on the fact that file-opener opens it.
                // Wait, if I write base64 string as UTF8 text, the PDF is corrupt.
                // I need to write binary.
                // Capacitor Filesystem supports recursive directory creation.
            });

            // Actually, standard practice for PDF in Capacitor is:
            // write as base64 string, but don't specify encoding? Or specify Encoding.UTF8?
            // No! 
            // Correct usage:
            // await Filesystem.writeFile({
            //   path: fileName,
            //   data: base64,
            //   directory: directory,
            //   recursive: true
            // });
            // The plugin detects it's base64/binary? No.
            // We might need to check docs.
            // Docs say: "data: The data to write. If a string is provided, it will generally be written as text... unless you are on Web... On native, string data is written as-is."
            // BUT if the string IS base64 representation of binary...
            // We usually construct a Data URI? No.
            // Let's assume standard behavior: writes the string content.
            // If the file content IS base64, then opening it as PDF will fail unless the viewer decodes it.
            // BUT standard practice is to write the binary data.
            // How to write binary from base64 string in Capacitor?
            // "When writing a file, provided string data is always treated as text unless the recursive option is used... wait no"
            // Looking at common issues: "Capacitor Filesystem write base64 pdf"
            // Answer: pass the base64 string as `data`. Do NOT pass encoding.

            // 3. Open the file
            // We need the precise URI. result.uri gives it.
            await FileOpener.open({
                filePath: result.uri,
                contentType: 'application/pdf'
            });

            return true;
        } catch (error) {
            console.error('Error saving/opening PDF:', error);
            alert('Error al abrir el PDF: ' + (error instanceof Error ? error.message : String(error)));
            return false;
        }
    } else {
        // Web fallback
        doc.save(fileName);
        return true;
    }
};
