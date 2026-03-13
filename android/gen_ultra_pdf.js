const { jsPDF } = require("jspdf");
const fs = require("fs");
const path = require("path");

async function generateUltraGraphicPDF() {
    const doc = new jsPDF();
    const ARTIFACT_DIR = "C:/Users/DANIEL/.gemini/antigravity/brain/06e83451-225f-47a8-a110-f008ad92385a";
    const OUTPUT_FILE = "c:/Users/DANIEL/Desktop/cobros/Anexo_Cobro_Ciberseguridad.pdf";

    // Colors
    const BBVA_DARK = [0, 68, 129];
    const BBVA_BLUE = [0, 110, 190];
    const DARK_BG = [15, 23, 42];
    const TEXT_WHITE = [255, 255, 255];
    const TEXT_LIGHT = [148, 163, 184];

    function addImagePage(title, headline, body, howItWorks, levelBBVA, imageName) {
        doc.addPage();
        const imagePath = path.join(ARTIFACT_DIR, imageName);

        // Background Header
        doc.setFillColor(...BBVA_DARK);
        doc.rect(0, 0, 210, 45, 'F');

        doc.setTextColor(...TEXT_WHITE);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(24);
        doc.text(title, 20, 30);

        let y = 55;

        // Headline
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(14);
        const splitHeadline = doc.splitTextToSize(headline, 170);
        doc.text(splitHeadline, 20, y);
        y += (splitHeadline.length * 7) + 5;

        // Image in the middle
        if (fs.existsSync(imagePath)) {
            const imgData = fs.readFileSync(imagePath).toString('base64');
            const imgW = 170;
            const imgH = 95;
            const centerX = (210 - imgW) / 2;
            doc.addImage(`data:image/png;base64,${imgData}`, 'PNG', centerX, y, imgW, imgH);
            y += imgH + 10;
        }

        // Explanation Boxes
        doc.setFillColor(248, 250, 252);
        doc.rect(20, y, 170, 60, 'F');

        let textY = y + 8;
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);

        doc.setFont("helvetica", "bold");
        doc.text("COMO FUNCIONA:", 25, textY);
        doc.setFont("helvetica", "normal");
        const splitHow = doc.splitTextToSize(howItWorks, 120);
        doc.text(splitHow, 65, textY);
        textY += (splitHow.length * 5) + 8;

        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 102, 0);
        doc.text("NIVEL BBVA:", 25, textY);
        doc.setFont("helvetica", "normal");
        const splitBBVA = doc.splitTextToSize(levelBBVA, 120);
        doc.text(splitBBVA, 65, textY);
    }

    // --- PAGE 1: COVER ---
    const coverPath = path.join(ARTIFACT_DIR, "cyber_cover_ultra_1772254639981.png");
    if (fs.existsSync(coverPath)) {
        const coverData = fs.readFileSync(coverPath).toString('base64');
        doc.addImage(`data:image/png;base64,${coverData}`, 'PNG', 0, 0, 210, 297);
    }

    // Overlay gradients or boxes for text visibility
    doc.setFillColor(0, 0, 0, 0.4); // Transparent overlay
    doc.rect(0, 180, 210, 117, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(40);
    doc.text("ANEXO COBRO", 20, 210);
    doc.setFontSize(22);
    doc.text("Seguridad Bancaria de", 20, 225);
    doc.text("Grado Empresarial", 20, 238);

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(1.5);
    doc.line(20, 248, 100, 248);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("PILARES TECNOLOGICOS Y PROTECCION DE ACTIVOS", 20, 260);

    // --- PAGE 2: RLS ---
    addImagePage(
        "1. PILAR: RLS",
        "La Boveda por Cliente (Row Level Security)",
        "",
        "El servidor de base de datos rechaza cualquier pedido que no venga de un usuario autenticado. Cada dato tiene un compartimento estanco.",
        "Politica de 'Privilegio Minimo'. Nadie ve nada que no le pertenezca estrictamente, igual que una caja fuerte bancaria.",
        "cyber_vault_banco_v2_1772253401287.png"
    );

    // --- PAGE 3: JWT ---
    addImagePage(
        "2. PILAR: JWT",
        "Autenticacion mediante Tokens Encriptados",
        "",
        "Cada clic viaja firmado digitalmente. Si se intenta modificar un saldo en transito, la firma se rompe y el sistema bloquea la cuenta.",
        "Estandar de intercambio de identidad usado en las APIs financieras modernas para banca movil.",
        "cyber_token_final_v1_1772253542951.png"
    );

    // --- PAGE 4: SSL ---
    addImagePage(
        "3. PILAR: SSL/TLS",
        "Encriptacion en Transito de 256 bits",
        "",
        "Toda la informacion viaja por un 'tunel blindado'. Si alguien intercepta la señal de Wi-Fi, solo vera simbolos aleatorios.",
        "El candadito verde de seguridad bancaria, obligatorio para la transmision de datos sensibles.",
        "cyber_truck_final_v2_1772253574178.png"
    );

    // --- PAGE 5: INFRASTRUCTURE ---
    addImagePage(
        "4. PILAR: NUBE",
        "Infraestructura Blindada (AWS / Google Cloud)",
        "",
        "Reside en centros de datos mundiales con proteccion contra ataques DDoS y copias de seguridad automaticas constantes.",
        "Uso de PostgreSQL, el motor mas robusto del mundo. BBVA y las Fintech usan las mismas nubes y protocolos.",
        "cyber_cloud_final_v2_1772253594041.png"
    );

    // --- PAGE 6: SUMMARY ---
    doc.addPage();
    doc.setFillColor(...BBVA_DARK);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.text("RESUMEN TECNICO", 105, 50, { align: "center" });

    doc.setFontSize(14);
    const summ = "Lo que hemos hecho con los Triggers de Auth y el RLS es transformar tu aplicacion de una 'hoja de datos' a un Sistema Multi-Inquilino Seguro.";
    doc.text(doc.splitTextToSize(summ, 160), 105, 80, { align: "center" });

    // Icon strip if exists
    const iconsPath = path.join(ARTIFACT_DIR, "cyber_pilar_icons_1772254656884.png");
    if (fs.existsSync(iconsPath)) {
        doc.addImage(`data:image/png;base64,${fs.readFileSync(iconsPath).toString('base64')}`, 'PNG', 30, 110, 150, 150);
    }

    doc.setFontSize(10);
    doc.setTextColor(...TEXT_LIGHT);
    doc.text("DATO CLAVE: Los protocolos de comunicacion (HTTPS, JWT, PostgreSQL) son exactamente los mismos en BBVA y Anexo Cobro.", 105, 280, { align: "center" });

    const pdfOutput = doc.output("arraybuffer");
    fs.writeFileSync(OUTPUT_FILE, Buffer.from(pdfOutput));
    console.log("PDF Ultra-Grafico Generado.");
}

generateUltraGraphicPDF();
