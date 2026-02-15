import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    FileText,
    History,
    Plus,
    Save,
    Printer,
    Trash2,
    X,
    FileDown,
    Search,
    Copy,
    RefreshCw,
    Edit3,
    ChevronDown,
    Coins,
    BookmarkPlus,
    BookOpen,
    Smartphone,
    Maximize2,
    FileBox,
    Pencil
} from 'lucide-react';
import { DocumentData, DocumentType, TextTemplate, PaperSize } from './types';
import { numberToWordsSpanish } from './utils/numberToWords';
import { jsPDF } from 'jspdf';

const DEFAULT_PAGARE_TEXT = `El día [FECHA] Pagaré (mos) solidariamente libre de gastos y sin Presto a su orden, en el domicilio [DOMICILIO] La cantidad de [MONEDA_NOMBRE] [MONTO_LETRAS].

Por el valor recibido en [CONCEPTO] A mi entera satisfacción. En caso de que este documento no fuese abonado en el día del vencimiento se constituirá(n) el (los) deudor(res) en mora y sin intimación judicial ni extrajudicial el pago; originando también una pena de ...% mensual con el pago de la pena no se entiende extinguida la obligación principal, además de los intereses y comisiones pactados, que continuarán devengándose hasta el reembolso total del crédito, sin que implique novación, prórroga o espera, a todos los efectos legales acepto(amos) la jurisdicción del juzgado de Paz de la ciudad de Villa Elisa.`;

const DEFAULT_RECIBO_TEXT = `Recibí de [DEUDOR_NOMBRE] la cantidad de [MONEDA_NOMBRE] [MONTO_LETRAS] por concepto de [CONCEPTO].`;

const DEFAULT_MANUAL_TEXT = `Escriba aquí el contenido de su documento...`;

const CURRENCIES = [
    { symbol: 'Gs.', name: 'GUARANIES' },
    { symbol: 'AR$', name: 'PESOS ARGENTINOS' },
    { symbol: 'R$', name: 'REALES BRASILEROS' },
    { symbol: '$', name: 'DOLARES' },
    { symbol: '€', name: 'EUROS' },
    { symbol: 'Bs.', name: 'BOLIVARES' },
    { symbol: 'S/', name: 'SOLES' },
];

const Generator: React.FC = () => {
    const [documents, setDocuments] = useState<DocumentData[]>([]);
    const [templates, setTemplates] = useState<TextTemplate[]>([]);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false);
    const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
    const [isPaperMenuOpen, setIsPaperMenuOpen] = useState(false);
    const [paperSize, setPaperSize] = useState<PaperSize>('A4');

    const currencyMenuRef = useRef<HTMLDivElement>(null);
    const templateMenuRef = useRef<HTMLDivElement>(null);
    const paperMenuRef = useRef<HTMLDivElement>(null);
    const printFrameRef = useRef<HTMLIFrameElement>(null);

    const [formData, setFormData] = useState<Partial<DocumentData>>({
        type: DocumentType.PAGARE,
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        currencySymbol: 'Gs.',
        currencyName: 'GUARANIES',
        amountInWords: '',
        concept: '',
        folio: '',
        debtorName: '',
        beneficiaryName: '',
        documentIdNumber: '',
        phoneNumber: '',
        paymentMethod: 'Efectivo',
        legalText: DEFAULT_PAGARE_TEXT,
    });

    useEffect(() => {
        const savedDocs = localStorage.getItem('offline_docs');
        const savedTemplates = localStorage.getItem('text_templates');
        const savedPaper = localStorage.getItem('paper_size') as PaperSize;
        if (savedDocs) setDocuments(JSON.parse(savedDocs));
        if (savedTemplates) setTemplates(JSON.parse(savedTemplates));
        if (savedPaper) setPaperSize(savedPaper);
    }, []);

    useEffect(() => {
        if (formData.amount !== undefined && formData.type !== DocumentType.MANUAL) {
            const words = numberToWordsSpanish(formData.amount || 0);
            setFormData(prev => ({ ...prev, amountInWords: words }));
        }
    }, [formData.amount, formData.type]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (currencyMenuRef.current && !currencyMenuRef.current.contains(event.target as Node)) {
                setIsCurrencyMenuOpen(false);
            }
            if (templateMenuRef.current && !templateMenuRef.current.contains(event.target as Node)) {
                setIsTemplateMenuOpen(false);
            }
            if (paperMenuRef.current && !paperMenuRef.current.contains(event.target as Node)) {
                setIsPaperMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const saveToHistory = () => {
        if (formData.type !== DocumentType.MANUAL && (!formData.debtorName || !formData.amount)) {
            alert("Complete campos obligatorios (Nombre y Monto)");
            return;
        }
        const newDoc: DocumentData = {
            ...formData as DocumentData,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            folio: formData.folio || new Date().getTime().toString().slice(-4)
        };
        const updated = [newDoc, ...documents];
        setDocuments(updated);
        localStorage.setItem('offline_docs', JSON.stringify(updated));
        alert("Documento guardado.");
        resetForm();
    };

    const saveCurrentAsTemplate = () => {
        const name = prompt("Nombre para esta plantilla:");
        if (!name) return;
        const newTemplate: TextTemplate = {
            id: crypto.randomUUID(),
            name,
            content: formData.legalText || '',
            type: formData.type || DocumentType.PAGARE
        };
        const updated = [...templates, newTemplate];
        setTemplates(updated);
        localStorage.setItem('text_templates', JSON.stringify(updated));
        alert("Plantilla de texto guardada.");
    };

    const deleteTemplate = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("¿Eliminar plantilla?")) {
            const updated = templates.filter(t => t.id !== id);
            setTemplates(updated);
            localStorage.setItem('text_templates', JSON.stringify(updated));
        }
    };

    const resetForm = () => {
        setFormData({
            type: formData.type || DocumentType.PAGARE,
            date: new Date().toISOString().split('T')[0],
            amount: 0,
            currencySymbol: 'Gs.',
            currencyName: 'GUARANIES',
            amountInWords: '',
            concept: '',
            folio: '',
            debtorName: '',
            beneficiaryName: '',
            documentIdNumber: '',
            phoneNumber: '',
            paymentMethod: 'Efectivo',
            legalText: formData.type === DocumentType.PAGARE ? DEFAULT_PAGARE_TEXT : (formData.type === DocumentType.RECIBO ? DEFAULT_RECIBO_TEXT : DEFAULT_MANUAL_TEXT),
        });
    };

    const generatePDF = (doc: Partial<DocumentData>, isPrint: boolean = false) => {
        const isThermal = paperSize === 'Thermal58mm';
        const isOficio = paperSize === 'Oficio';

        let pdf: jsPDF;
        if (isThermal) {
            pdf = new jsPDF('p', 'mm', [58, 300]);
        } else if (isOficio) {
            pdf = doc.type === DocumentType.RECIBO
                ? new jsPDF('l', 'mm', [330, 216])
                : new jsPDF('p', 'mm', [216, 330]);
        } else {
            pdf = doc.type === DocumentType.RECIBO
                ? new jsPDF('l', 'mm', 'a4')
                : new jsPDF('p', 'mm', 'a4');
        }

        const thermalFontSize = 10;

        if (doc.type === DocumentType.MANUAL) {
            if (isThermal) {
                let y = 15;
                pdf.setFontSize(thermalFontSize);
                pdf.setFont('helvetica', 'normal');
                const splitText = pdf.splitTextToSize(doc.legalText || '', 48);
                pdf.text(splitText, 5, y, { lineHeightFactor: 1.4 });
            } else {
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'normal');
                const splitText = pdf.splitTextToSize(doc.legalText || '', 180);
                pdf.text(splitText, 15, 20, { lineHeightFactor: 1.5 });
            }
        } else if (doc.type === DocumentType.RECIBO) {
            if (isThermal) {
                let y = 10;
                pdf.setFontSize(12);
                pdf.setTextColor(0);
                pdf.setFont('helvetica', 'bold');
                pdf.text('RECIBO DE PAGO', 29, y, { align: 'center' });

                y += 10;
                pdf.setFontSize(thermalFontSize);
                pdf.setFont('helvetica', 'normal');
                pdf.text(`Fecha: ${doc.date || ''}`, 5, y);
                y += 7;
                pdf.text(`Folio: ${doc.folio || ''}`, 5, y);
                y += 2;
                pdf.line(5, y, 53, y);

                y += 10;
                pdf.setFont('helvetica', 'bold');
                pdf.text('Recibí de:', 5, y);
                y += 6;
                pdf.setFont('helvetica', 'normal');
                pdf.text(doc.debtorName || '', 5, y);

                y += 10;
                pdf.setFont('helvetica', 'bold');
                pdf.text(`Monto: ${doc.currencySymbol} ${doc.amount?.toLocaleString()}`, 5, y);

                y += 7;
                pdf.setFont('helvetica', 'normal');
                const splitWords = pdf.splitTextToSize(`${doc.amountInWords} ${doc.currencyName}`, 48);
                pdf.text(splitWords, 5, y, { lineHeightFactor: 1.2 });
                y += (splitWords.length * 5.5);

                y += 5;
                pdf.setFont('helvetica', 'bold');
                pdf.text('Concepto:', 5, y);
                y += 6;
                pdf.setFont('helvetica', 'normal');
                const splitConcept = pdf.splitTextToSize(doc.concept || '', 48);
                pdf.text(splitConcept, 5, y, { lineHeightFactor: 1.2 });
                y += (splitConcept.length * 5.5);

                y += 5;
                pdf.text(`Pago: ${doc.paymentMethod}`, 5, y);

                y += 6;
                pdf.line(5, y, 53, y);
                y += 8;
                pdf.setFont('helvetica', 'bold');
                pdf.text('Recibido por:', 5, y);
                y += 6;
                pdf.setFont('helvetica', 'normal');
                pdf.text(doc.beneficiaryName || '', 5, y);
                y += 6;
                pdf.text(`CI: ${doc.documentIdNumber || ''}`, 5, y);
                y += 6;
                pdf.text(`Tel: ${doc.phoneNumber || ''}`, 5, y);

                y += 25;
                pdf.line(10, y, 48, y);
                pdf.setFontSize(8);
                pdf.text('FIRMA RECIBO', 29, y + 5, { align: 'center' });
            } else {
                pdf.setDrawColor(0);
                pdf.setLineWidth(0.5);
                pdf.setTextColor(60, 100, 180);
                pdf.setFontSize(28);
                pdf.setFont('helvetica', 'bold');
                pdf.text('RECIBO DE PAGO', 15, 25);

                pdf.setTextColor(0);
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'normal');
                pdf.text('Fecha', 140, 25);
                pdf.text(doc.date || '', 165, 25);
                pdf.text('No.', 235, 25);
                pdf.text(doc.folio || '', 250, 25);

                pdf.setFont('helvetica', 'bold');
                pdf.text('Recibí de:', 35, 45);
                pdf.setFont('helvetica', 'normal');
                pdf.text(doc.debtorName || '', 70, 45);

                pdf.rect(isOficio ? 270 : 240, 35, 45, 12);
                pdf.text(`${doc.currencySymbol} ${doc.amount?.toLocaleString()}`, isOficio ? 273 : 243, 43);

                pdf.text(`# ${doc.amountInWords} ${doc.currencyName} #`, 65, 58);
                pdf.text(doc.concept || '', 65, 75);

                pdf.text(`[Nombre]: ${doc.beneficiaryName || ''}`, 65, 113);
                pdf.text(`[Documento]: ${doc.documentIdNumber || ''}`, 65, 120);
                pdf.text(`[Teléfono]: ${doc.phoneNumber || ''}`, 65, 127);
            }
        } else {
            // PAGARE
            if (isThermal) {
                let y = 10;
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'bold');
                pdf.text('PAGARE A LA ORDEN', 29, y, { align: 'center' });

                y += 10;
                pdf.setFontSize(thermalFontSize);
                pdf.setFont('helvetica', 'normal');
                pdf.text(`Vencimiento: ${doc.date || ''}`, 5, y);
                y += 7;
                pdf.setFont('helvetica', 'bold');
                pdf.text(`Monto: ${doc.currencySymbol} ${doc.amount?.toLocaleString()}`, 5, y);
                y += 2;
                pdf.line(5, y, 53, y);

                y += 10;
                let bodyText = doc.legalText || DEFAULT_PAGARE_TEXT;
                bodyText = bodyText
                    .replace(/\[FECHA\]/g, doc.date || '___/___/___')
                    .replace(/\[MONEDA_NOMBRE\]/g, (doc.currencyName || 'GUARANIES').toUpperCase())
                    .replace(/\[MONTO_LETRAS\]/g, (doc.amountInWords || '________________').toUpperCase())
                    .replace(/\[CONCEPTO\]/g, (doc.concept || '________________'))
                    .replace(/\[DOMICILIO\]/g, (doc.beneficiaryName || '________________'))
                    .replace(/\[DEUDOR_NOMBRE\]/g, (doc.debtorName || '________________'));

                pdf.setFont('helvetica', 'normal');
                const splitBody = pdf.splitTextToSize(bodyText, 48);
                pdf.text(splitBody, 5, y, { lineHeightFactor: 1.4 });
                y += (splitBody.length * 5.5) + 12;

                pdf.setLineDashPattern([1, 1], 0);

                y += 20;
                pdf.line(10, y, 48, y);
                pdf.setFontSize(8);
                pdf.text('FIRMA', 29, y + 5, { align: 'center' });

                y += 20;
                pdf.line(10, y, 48, y);
                pdf.setFontSize(8);
                pdf.text('ACLARACIÓN', 29, y + 5, { align: 'center' });
                pdf.setFontSize(thermalFontSize);
                pdf.text(doc.debtorName || '', 29, y - 2, { align: 'center' });

                y += 20;
                pdf.line(10, y, 48, y);
                pdf.setFontSize(8);
                pdf.text('NRO. DE CÉDULA', 29, y + 5, { align: 'center' });
                pdf.setFontSize(thermalFontSize);
                pdf.text(doc.documentIdNumber || '', 29, y - 2, { align: 'center' });
            } else {
                pdf.setFontSize(20);
                pdf.setFont('helvetica', 'bold');
                pdf.text('PAGARE A LA ORDEN', 105, 30, { align: 'center' });
                pdf.setFontSize(14);
                pdf.text('VENCIMIENTO:', 20, 55);
                pdf.setFont('helvetica', 'normal');
                const formattedAmount = doc.amount?.toLocaleString('es-PY', { minimumFractionDigits: doc.currencySymbol === 'Gs.' ? 0 : 2 }).replace(/,/g, '.') || '0';
                pdf.text(`${doc.currencySymbol}  ${formattedAmount}.-`, 20, 68);

                let bodyText = doc.legalText || DEFAULT_PAGARE_TEXT;
                bodyText = bodyText
                    .replace(/\[FECHA\]/g, doc.date || '___/___/___')
                    .replace(/\[MONEDA_NOMBRE\]/g, (doc.currencyName || 'GUARANIES').toUpperCase())
                    .replace(/\[MONTO_LETRAS\]/g, (doc.amountInWords || '________________').toUpperCase())
                    .replace(/\[CONCEPTO\]/g, (doc.concept || '________________'))
                    .replace(/\[DOMICILIO\]/g, (doc.beneficiaryName || '________________'))
                    .replace(/\[DEUDOR_NOMBRE\]/g, (doc.debtorName || '________________'));

                pdf.setFontSize(12);
                const splitBody = pdf.splitTextToSize(bodyText, 170);
                pdf.text(splitBody, 20, 90, { lineHeightFactor: 1.5 });

                const bottomY = isOficio ? 250 : 220;
                pdf.setFontSize(12);
                pdf.text('FIRMA', 20, bottomY);
                pdf.text('ACLARACIÓN', 20, bottomY + 20);
                pdf.text('Nro. DE CÉDULA:', 20, bottomY + 40);

                const lineX = 60;
                const lineLength = 80;
                pdf.setLineDashPattern([1, 1], 0);
                pdf.line(lineX, bottomY, lineX + lineLength, bottomY);
                pdf.line(lineX, bottomY + 20, lineX + lineLength, bottomY + 20);
                pdf.setFontSize(10);
                pdf.text(doc.debtorName || '', lineX + 2, bottomY + 18);
                pdf.line(lineX, bottomY + 40, lineX + lineLength, bottomY + 40);
                pdf.text(doc.documentIdNumber || '', lineX + 2, bottomY + 38);
            }
        }

        if (isPrint) {
            const blobUrl = pdf.output('bloburl');
            if (printFrameRef.current) {
                printFrameRef.current.src = blobUrl;
                printFrameRef.current.onload = () => {
                    printFrameRef.current?.contentWindow?.focus();
                    printFrameRef.current?.contentWindow?.print();
                };
            } else {
                window.open(blobUrl, '_blank');
            }
        } else {
            pdf.save(`${doc.type}_${doc.folio || 'doc'}.pdf`);
        }
    };

    const filteredTemplates = useMemo(() => {
        return templates.filter(t => t.type === formData.type);
    }, [templates, formData.type]);

    const changePaperSize = (size: PaperSize) => {
        setPaperSize(size);
        localStorage.setItem('paper_size', size);
        setIsPaperMenuOpen(false);
    };

    const handleTypeChange = (type: DocumentType) => {
        const text = type === DocumentType.PAGARE ? DEFAULT_PAGARE_TEXT : (type === DocumentType.RECIBO ? DEFAULT_RECIBO_TEXT : DEFAULT_MANUAL_TEXT);
        setFormData({ ...formData, type, legalText: text });
    };

    return (
        <div className="flex flex-col md:flex-row bg-slate-50 min-h-screen">
            <iframe ref={printFrameRef} className="hidden" title="Impresión" />

            {/* Sidebar Local para Historial (Solo Escritorio) */}
            <aside className={`fixed inset-y-0 left-0 z-40 transition-transform duration-300 transform bg-white border-r border-slate-200 w-72 lg:relative lg:translate-x-0 ${isHistoryOpen ? 'translate-x-0' : '-translate-x-full hidden lg:block'}`}>
                <div className="flex flex-col h-full">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><History className="w-4 h-4 text-indigo-600" /> Historial</h2>
                        <button onClick={() => setIsHistoryOpen(false)} className="lg:hidden text-slate-400"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="p-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input type="text" placeholder="Buscar..." className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-800 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {documents.filter(d => (d.folio || '').includes(searchTerm) || (d.debtorName || '').toLowerCase().includes(searchTerm.toLowerCase())).map(doc => (
                            <div key={doc.id} className="p-3 bg-white border border-slate-100 rounded-xl hover:shadow-sm group">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[8px] font-black text-indigo-600 uppercase">{doc.type}</span>
                                    <span className="text-[8px] text-slate-400 font-bold">#{doc.folio || '---'}</span>
                                </div>
                                <h3 className="text-[10px] font-black text-slate-700 truncate uppercase">{doc.debtorName || doc.legalText?.substring(0, 20) || '(Sin título)'}</h3>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[9px] font-black text-slate-600">{doc.type !== DocumentType.MANUAL ? `${doc.currencySymbol} ${doc.amount.toLocaleString()}` : 'Manual'}</span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setFormData({ ...doc, id: undefined }); setIsHistoryOpen(false); }} className="p-1 hover:bg-slate-100 text-slate-600 rounded-md"><Copy className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => generatePDF(doc, true)} className="p-1 hover:bg-slate-100 text-slate-600 rounded-md"><Printer className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => { if (confirm("¿Eliminar?")) { const updated = documents.filter(d => d.id !== doc.id); setDocuments(updated); localStorage.setItem('offline_docs', JSON.stringify(updated)); } }} className="p-1 hover:bg-red-50 text-red-500 rounded-md"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </aside>

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between shadow-sm z-30">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsHistoryOpen(true)} className="lg:hidden p-2 text-slate-500 bg-slate-50 rounded-xl"><History className="w-5 h-5" /></button>
                        <div>
                            <h1 className="text-xs font-black text-slate-900 uppercase tracking-tighter">Generador de Pagarés</h1>
                            <p className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">v6.1.45 • Offline Ready</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative" ref={paperMenuRef}>
                            <button onClick={() => setIsPaperMenuOpen(!isPaperMenuOpen)} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-black uppercase text-slate-600 hover:bg-slate-100 transition-all">
                                {paperSize === 'A4' ? <Maximize2 className="w-3.5 h-3.5" /> : paperSize === 'Oficio' ? <FileBox className="w-3.5 h-3.5" /> : <Printer className="w-3.5 h-3.5" />}
                                {paperSize === 'A4' ? 'Papel A4' : paperSize === 'Oficio' ? 'Papel Oficio' : 'Térmico 58mm'}
                                <ChevronDown className="w-3 h-3" />
                            </button>
                            {isPaperMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50">
                                    <button onClick={() => changePaperSize('A4')} className="w-full px-4 py-3 text-left text-[9px] font-black uppercase text-slate-600 hover:bg-slate-50 flex items-center gap-2"><Maximize2 className="w-4 h-4" /> Papel A4</button>
                                    <button onClick={() => changePaperSize('Oficio')} className="w-full px-4 py-3 text-left text-[9px] font-black uppercase text-slate-600 hover:bg-slate-50 flex items-center gap-2"><FileBox className="w-4 h-4" /> Papel Oficio</button>
                                    <button onClick={() => changePaperSize('Thermal58mm')} className="w-full px-4 py-3 text-left text-[9px] font-black uppercase text-slate-600 hover:bg-slate-50 flex items-center gap-2"><Printer className="w-4 h-4" /> Térmico 58mm</button>
                                </div>
                            )}
                        </div>
                        <button onClick={saveToHistory} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"><Save className="w-3.5 h-3.5 inline mr-1" /> Guardar</button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    <div className="max-w-3xl mx-auto space-y-6">
                        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex gap-1 bg-slate-200 p-1 rounded-xl">
                                    <button onClick={() => handleTypeChange(DocumentType.PAGARE)} className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${formData.type === DocumentType.PAGARE ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Pagaré</button>
                                    <button onClick={() => handleTypeChange(DocumentType.RECIBO)} className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${formData.type === DocumentType.RECIBO ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Recibo</button>
                                    <button onClick={() => handleTypeChange(DocumentType.MANUAL)} className={`px-3 py-1.5 rounded-lg transition-all ${formData.type === DocumentType.MANUAL ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><Pencil className="w-4 h-4" /></button>
                                </div>
                                <div className="flex items-center gap-2 relative text-right" ref={templateMenuRef}>
                                    <button type="button" onClick={() => setIsTemplateMenuOpen(!isTemplateMenuOpen)} className="text-[8px] font-black text-indigo-600 uppercase border border-indigo-100 px-3 py-1.5 rounded-lg hover:bg-white"><BookOpen className="w-3 h-3 inline mr-1" /> Plantillas</button>
                                    {isTemplateMenuOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50">
                                            <div className="p-3 bg-slate-50 border-b border-slate-100 font-black text-[9px] text-slate-400 rotate-0">GUARDADAS</div>
                                            <div className="p-1 max-h-64 overflow-y-auto">
                                                {filteredTemplates.length === 0 && <p className="p-4 text-center text-[8px] font-bold text-slate-400 uppercase tracking-widest">Sin plantillas</p>}
                                                {filteredTemplates.map(t => (
                                                    <button key={t.id} type="button" onClick={() => { setFormData({ ...formData, legalText: t.content }); setIsTemplateMenuOpen(false); }} className="w-full flex items-center justify-between px-3 py-3 text-left hover:bg-indigo-50 rounded-xl group"><span className="text-[10px] font-black text-slate-700 uppercase truncate">{t.name}</span> <Trash2 onClick={(e) => deleteTemplate(t.id, e)} className="w-3 h-3 text-slate-300 hover:text-red-500" /></button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 md:p-10 space-y-6">
                                {formData.type !== DocumentType.MANUAL && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Monto Principal</label>
                                            <div className="flex gap-2">
                                                <div className="flex-1 relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">{formData.currencySymbol}</span>
                                                    <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-black text-lg text-slate-900" />
                                                </div>
                                                <div className="relative" ref={currencyMenuRef}>
                                                    <button type="button" onClick={() => setIsCurrencyMenuOpen(!isCurrencyMenuOpen)} className="h-full px-4 bg-white border-2 border-slate-100 rounded-2xl text-[9px] font-black uppercase text-slate-600 flex items-center gap-2">{formData.currencySymbol} <ChevronDown className="w-3 h-3" /></button>
                                                    {isCurrencyMenuOpen && (
                                                        <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-1">
                                                            {CURRENCIES.map(curr => (
                                                                <button key={curr.name} type="button" onClick={() => { setFormData({ ...formData, currencySymbol: curr.symbol, currencyName: curr.name }); setIsCurrencyMenuOpen(false); }} className="w-full px-4 py-2 text-left text-[9px] font-black uppercase hover:bg-slate-50 rounded-lg">{curr.name} ({curr.symbol})</button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                                                <p className="text-[10px] font-black text-emerald-700 uppercase italic">SON: {formData.amountInWords || 'CERO'} {formData.currencyName}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2 text-black">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha y Documento</label>
                                            <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-black text-sm" />
                                            <input type="text" value={formData.folio} onChange={(e) => setFormData({ ...formData, folio: e.target.value })} placeholder="Número de Folio / Referencia" className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black text-xs" />
                                        </div>

                                        <div className="space-y-4 md:col-span-2 text-black">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase">{formData.type === DocumentType.PAGARE ? 'Nombre del Deudor' : 'De (Nombre Pagador)'}</label>
                                                    <input type="text" value={formData.debtorName} onChange={(e) => setFormData({ ...formData, debtorName: e.target.value })} className="w-full p-3 bg-indigo-50/20 border-2 border-indigo-100 rounded-2xl font-black text-sm outline-none" placeholder="EJ: JUAN PÉREZ" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase">Cédula / Documento</label>
                                                    <input type="text" value={formData.documentIdNumber} onChange={(e) => setFormData({ ...formData, documentIdNumber: e.target.value })} className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm outline-none" placeholder="EJ: 4.567.890" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase">{formData.type === DocumentType.PAGARE ? 'Nombre del Beneficiario' : 'Para (Nombre Quien Recibe)'}</label>
                                                    <input type="text" value={formData.beneficiaryName} onChange={(e) => setFormData({ ...formData, beneficiaryName: e.target.value })} className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm outline-none" placeholder="EJ: PRESTAMASTER" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase">Concepto / Motivo</label>
                                                    <input type="text" value={formData.concept} onChange={(e) => setFormData({ ...formData, concept: e.target.value })} className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm outline-none" placeholder="EJ: PRESTAMO PERSONAL" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Edit3 className="w-3.5 h-3.5" /> Redacción del Documento</label>
                                        <button type="button" onClick={saveCurrentAsTemplate} className="text-[8px] font-black text-emerald-600 uppercase border border-emerald-100 px-3 py-1.5 rounded-lg hover:bg-emerald-50"><BookmarkPlus className="w-3 h-3 inline mr-1" /> Guardar como Plantilla</button>
                                    </div>
                                    <textarea rows={formData.type === DocumentType.MANUAL ? 15 : 6} value={formData.legalText} onChange={(e) => setFormData({ ...formData, legalText: e.target.value })} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:border-indigo-500 transition-all outline-none font-serif text-sm leading-relaxed text-slate-800 font-bold" placeholder="Redacte el contenido aquí..." />
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                    <button type="button" onClick={() => generatePDF(formData)} className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"><FileDown className="w-5 h-5" /> Generar PDF</button>
                                    <button type="button" onClick={() => generatePDF(formData, true)} className="flex-1 flex items-center justify-center gap-3 px-6 py-4 border-2 border-slate-900 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all"><Printer className="w-5 h-5" /> Imprimir Ticket</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Generator;
