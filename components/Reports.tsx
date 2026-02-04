
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppState, Role, CollectionLog, LoanStatus, CollectionLogType, AppSettings, PaymentStatus } from '../types';
import { formatCurrency } from '../utils/helpers';

import { getTranslation } from '../utils/translations';

interface ReportsProps {
   state: AppState;
   settings?: AppSettings;
}

declare const L: any;

const Reports: React.FC<ReportsProps> = ({ state, settings }) => {
   const mapRef = useRef<HTMLDivElement>(null);
   const leafletMap = useRef<any>(null);
   const layerGroup = useRef<any>(null);
   const activeSettings = settings || state.settings;
   const t = getTranslation(activeSettings.language);

   const [selectedCollector, setSelectedCollector] = useState<string>('all');
   const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
   const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]); // NEW
   const [selectedFilter, setSelectedFilter] = useState<'all' | 'payment' | 'nopayment' | 'liquidation'>('all');
   const [stats, setStats] = useState({ totalStops: 0, devilStops: 0, totalDistance: 0 });

   const [aiReport, setAiReport] = useState<any>(null);
   const [showAiModal, setShowAiModal] = useState(false); // NEW
   const [loadingAi, setLoadingAi] = useState(false);

   const collectors = state.users.filter(u => u.role === Role.COLLECTOR);

   const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLon = (lon2 - lon1) * (Math.PI / 180);
      const a =
         Math.sin(dLat / 2) * Math.sin(dLat / 2) +
         Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
         Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
   };

   const routeData = useMemo(() => {
      let logs = state.collectionLogs.filter(log => {
         const logDate = new Date(log.date).toISOString().split('T')[0];
         const start = selectedDate;
         const end = endDate && endDate >= selectedDate ? endDate : selectedDate;
         return logDate >= start && logDate <= end;
      });

      if (selectedCollector !== 'all') {
         logs = logs.filter(log => {
            const loan = state.loans.find(l => l.id === log.loanId);
            return loan?.collectorId === selectedCollector;
         });
      }

      if (selectedFilter !== 'all') {
         logs = logs.filter(log => {
            if (selectedFilter === 'liquidation') return log.isRenewal;
            if (selectedFilter === 'payment') return log.type === CollectionLogType.PAYMENT && !log.isRenewal;
            if (selectedFilter === 'nopayment') return log.type === CollectionLogType.NO_PAGO;
            return true;
         });
      }

      return logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
   }, [state.collectionLogs, state.loans, selectedCollector, selectedDate, endDate, selectedFilter]);

   useEffect(() => {
      if (mapRef.current && !leafletMap.current) {
         leafletMap.current = L.map(mapRef.current, { zoomControl: false }).setView([4.5709, -74.2973], 13);

         // 1. OpenStreetMap (Reliable Standard)
         const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
         });

         // 2. Google Streets (Robust HTTPS)
         const googleStreets = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            attribution: 'Google Maps'
         });

         // 3. Google Hybrid (Satellite + Roads)
         const googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            attribution: 'Google Maps'
         });

         // 4. Esri Satellite (Alternative)
         const esriSat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles © Esri'
         });

         // Default to OSM for reliability
         osm.addTo(leafletMap.current);

         // Layer Control
         const baseMaps = {
            "🌍 OpenStreetMap": osm,
            "🗺️ Google Calles": googleStreets,
            "🛰️ Google Híbrido": googleHybrid,
            "🌎 Esri Satélite": esriSat
         };

         L.control.layers(baseMaps).addTo(leafletMap.current);
         L.control.zoom({ position: 'bottomright' }).addTo(leafletMap.current);

         layerGroup.current = L.layerGroup().addTo(leafletMap.current);
      }

      if (layerGroup.current) {
         layerGroup.current.clearLayers();

         if (routeData.length === 0) {
            setStats({ totalStops: 0, devilStops: 0, totalDistance: 0 });

            // If no data, ensure we are not at 0,0 (Blue Ocean)
            // If we have default view already set, good. 
            // If user has location permission, it might have panned?
            // Let's reset view to default for safety if no points
            // leafletMap.current.setView([4.5709, -74.2973], 13); 
            return;
         }

         const points: any[] = [];
         let calculatedDist = 0;
         let devils = 0;

         // Buscar el punto de inicio oficial (Apertura)
         const openingLog = routeData.find(l => l.type === CollectionLogType.OPENING && l.location && l.location.lat !== 0);
         const startIcon = L.divIcon({ className: 'custom-icon', html: '<div style="font-size: 24px;">🏁</div>', iconAnchor: [12, 12] });
         const endIcon = L.divIcon({ className: 'custom-icon', html: '<div style="font-size: 24px;">🏁</div>', iconAnchor: [12, 12] });

         if (openingLog) {
            L.marker([openingLog.location.lat, openingLog.location.lng], { icon: startIcon }).addTo(layerGroup.current);
            points.push([openingLog.location.lat, openingLog.location.lng]);
         }

         routeData.forEach((log, index) => {
            const client = state.clients.find(c => c.id === log.clientId);
            // Ignorar logs de apertura (ya tienen bandera propia) y coordenadas invalidas
            if (log.type === CollectionLogType.OPENING || !client || !log.location || (log.location.lat === 0 && log.location.lng === 0)) return;

            const lat = log.location.lat;
            const lng = log.location.lng;
            points.push([lat, lng]);

            const timeStr = new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            let isDevil = false;
            let timeDiffText = '';

            if (index < routeData.length - 1) {
               const nextLog = routeData[index + 1];
               const currTime = new Date(log.date).getTime();
               const nextTime = new Date(nextLog.date).getTime();
               const diffMinutes = (nextTime - currTime) / (1000 * 60);

               const distToNext = calculateDistance(lat, lng, nextLog.location.lat, nextLog.location.lng);
               calculatedDist += distToNext;

               if (diffMinutes > 60 && distToNext < 1) {
                  isDevil = true;
                  devils++;
                  const hours = Math.floor(diffMinutes / 60);
                  const mins = Math.round(diffMinutes % 60);
                  timeDiffText = `${hours}h ${mins}m detenido aquí`;
               }
            }

            if (isDevil) {
               const devilIcon = L.divIcon({
                  className: 'devil-marker',
                  html: `
                  <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                    <div style="position: absolute; inset: 0; background: rgba(239, 68, 68, 0.5); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                    <div style="font-size: 32px; position: relative; z-index: 10; filter: drop-shadow(0 4px 4px rgba(0,0,0,0.5)); transform: scale(1.2);">😈</div>
                  </div>
                `,
                  iconSize: [40, 40],
                  iconAnchor: [20, 20]
               });

               L.marker([lat, lng], { icon: devilIcon })
                  .bindPopup(`<div style="text-align: center;"><h3 style="margin: 0; color: #ef4444; font-weight: 900; font-size: 14px;">Inactividad Detectada</h3><p style="font-size: 12px; margin: 5px 0;">${timeDiffText}</p><p style="font-size: 10px;">${client?.name}</p></div>`)
                  .addTo(layerGroup.current);
            } else {
               // Enhanced Markers for Google Maps look
               const isPayment = log.type === CollectionLogType.PAYMENT;
               const isRenewal = log.isRenewal;

               let bgColor = '#ef4444'; // Red (No Payment)
               let borderColor = '#991b1b';
               let emoji = '😡';

               if (isPayment) {
                  bgColor = '#10b981'; // Emerald (Payment)
                  borderColor = '#065f46';
                  emoji = '😊';
               }
               if (isRenewal) {
                  bgColor = '#3b82f6'; // Blue (Liquidation)
                  borderColor = '#1e40af';
                  emoji = '😇';
               }

               const markerHtml = `
                <div style="
                    background-color: ${bgColor};
                    border: 2px solid white;
                    border-radius: 50% 50% 50% 0;
                    width: 30px;
                    height: 30px;
                    transform: rotate(-45deg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                ">
                    <div style="transform: rotate(45deg); font-size: 16px;">${emoji}</div>
                </div>
               `;

               const googleIcon = L.divIcon({
                  className: 'google-marker',
                  html: markerHtml,
                  iconSize: [30, 30],
                  iconAnchor: [15, 30],
                  popupAnchor: [0, -30]
               });

               L.marker([lat, lng], { icon: googleIcon })
                  .bindPopup(`
                    <div style="min-width: 150px; text-align: center;">
                        <h4 style="margin:0; font-weight:900; color:#1e293b; font-size:12px;">${client?.name}</h4>
                        <p style="margin:4px 0; font-size:14px; font-weight:bold; color:${bgColor}">${isRenewal ? 'LIQUIDACIÓN' : log.type}</p>
                        <p style="margin:0; font-size:10px; color:#64748b;">${timeStr}</p>
                        ${log.amount ? `<p style="margin-top:4px; font-weight:900; font-family:monospace;">${formatCurrency(log.amount, activeSettings)}</p>` : ''}
                    </div>
                  `)
                  .addTo(layerGroup.current);
            }

            if (index === 0 && !openingLog) {
               L.marker([lat, lng], { icon: startIcon }).addTo(layerGroup.current);
            }
            if (index === routeData.length - 1 && routeData.length > (openingLog ? 0 : 1)) {
               L.marker([lat, lng], { icon: endIcon }).addTo(layerGroup.current);
            }
         });

         // Removed Polyline as requested (Ghost Line)
         // if (points.length > 1) {
         //    L.polyline(points, { color: '#4285F4', weight: 5, opacity: 0.8 }).addTo(layerGroup.current);
         // }

         // Smart centering: Filter out invalid 0,0 coordinates
         const validPoints = points.filter(p => Math.abs(p[0]) > 0.1 || Math.abs(p[1]) > 0.1);

         if (validPoints.length > 0) {
            const bounds = L.latLngBounds(validPoints);
            leafletMap.current.fitBounds(bounds, { padding: [50, 50] });
         } else if (state.clients.length > 0) {
            // Fallback: Center on the first client with a valid location
            const clientWithLoc = state.clients.find(c => c.location && (Math.abs(c.location.lat) > 0.1));
            if (clientWithLoc) {
               leafletMap.current.setView([clientWithLoc.location.lat, clientWithLoc.location.lng], 14);
            }
         } else if (points.length === 1) {
            leafletMap.current.setView(points[0], 16);
         }

         // CRITICAL: Ensure map tiles load correctly even if container size was zero on init
         setTimeout(() => {
            if (leafletMap.current) leafletMap.current.invalidateSize();
         }, 300);

         setStats({
            totalStops: routeData.length,
            devilStops: devils,
            totalDistance: parseFloat(calculatedDist.toFixed(2))
         });
      }
   }, [routeData, state.clients]);

   const handleRunAiAudit = async () => {
      if (selectedCollector === 'all') {
         alert("Por favor selecciona un cobrador específico para auditar.");
         return;
      }

      setLoadingAi(true);
      setAiReport(null);
      setShowAiModal(true); // Open modal immediately showing loading state

      const collectorName = state.users.find(u => u.id === selectedCollector)?.name || 'Desconocido';

      // --- NEW: Contextual Data Collection per Client ---
      const assignedLoans = state.loans.filter(l =>
         l.status === LoanStatus.ACTIVE && l.collectorId === selectedCollector
      );

      const clientContexts = assignedLoans.map(loan => {
         const client = state.clients.find(c => c.id === loan.clientId);
         const clientLogs = routeData.filter(log => log.clientId === loan.clientId);

         // Get relevant installments (those due in the period or the latest one)
         const relevantInstallments = loan.installments.filter(inst => {
            const dueStr = inst.dueDate.split('T')[0];
            return (dueStr >= selectedDate && dueStr <= (endDate || selectedDate)) || inst.status !== PaymentStatus.PAID;
         }).slice(0, 3); // Take top 3 for tokens efficiency

         return {
            cliente: client?.name || 'Desconocido',
            frecuencia: loan.frequency,
            cuotas: relevantInstallments.map(i => ({
               vencimiento: i.dueDate.split('T')[0],
               estado: i.status,
               valor: i.amount
            })),
            gestiones: clientLogs.map(log => ({
               tipo: log.type,
               fecha: new Date(log.date).toISOString().split('T')[0],
               hora: new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
               monto: log.amount || 0
            }))
         };
      });

      const totalAssigned = clientContexts.length;
      const visitedCount = clientContexts.filter(c => c.gestiones.length > 0).length;
      const missingCount = totalAssigned - visitedCount;
      const coverage = totalAssigned > 0 ? (visitedCount / totalAssigned) * 100 : 0;

      const prompt = `
      Actúa como un Auditor Senior de Cobranza. Tu objetivo es evaluar el CRITERIO y CUMPLIMIENTO del cobrador "${collectorName}".
      PERIODO: ${selectedDate} hasta ${endDate || selectedDate}.

      REGLAS DE AUDITORÍA (Criterios):
      1. PRÉSTAMO DIARIO: Debe haber una gestión (PAGO o NO PAGO) CADA DÍA del periodo auditado. Si no hay registro, es falta grave.
      2. PRÉSTAMO SEMANAL: La gestión debe ocurrir máximo 1-3 días después del vencimiento de la cuota. Evalúa cuántos días pasaron.
      3. PRÉSTAMO MENSUAL: Si la cuota vence un día específico (ej. el día 4), el cobrador tiene un margen de 1 a 6 días para reportar la gestión o el no pago.
      4. SIEMPRE prioriza la presencia: Si el cliente no pagó, el cobrador DEBE registrar un "NO PAGO". La ausencia de registro es peor que un no pago.

      DATOS DE LA RUTA:
      - Cobertura Total: ${coverage.toFixed(1)}% (${visitedCount} de ${totalAssigned} clientes).
      - Detalle Contextual por Cliente:
      ${JSON.stringify(clientContexts, null, 2)}

      INSTRUCCIONES DE SALIDA:
      - Define si el cobrador tiene "Criterio de Cobranza" o si es descuidado.
      - Menciona casos específicos (nombres de clientes) donde se pasó de los días permitidos según la frecuencia.
      - Sé firme: Un cobrador que no registra "No Pago" está ocultando la realidad de la ruta.

      FORMATO JSON:
      {
        "score": number (0-100),
        "verdict": "string",
        "analysis": "string (Análisis de cumplimiento y tiempos según frecuencia)",
        "missed_clients_analysis": "string (Detalle de clientes abandonados o gestiones tardías)",
        "recommendation": "string"
      }
    `;

      let data: any = null;

      try {
         const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
         if (!apiKey) {
            throw new Error("VITE_GEMINI_API_KEY no está configurada");
         }

         // Switch to 'gemini-flash-latest' as 1.5 is not explicitly listed but this alias is available
         const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
            {
               method: "POST",
               headers: {
                  "Content-Type": "application/json",
               },
               body: JSON.stringify({
                  contents: [{
                     parts: [{ text: prompt }]
                  }],
                  generationConfig: {
                     temperature: 0.2,
                     maxOutputTokens: 8192,
                     response_mime_type: "application/json"
                  }
               }),
            }
         );

         if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            // Specific handling for Quota Exceeded
            if (response.status === 429) {
               throw new Error("⏳ Has excedido el límite de consultas gratuitas por minuto. Por favor espera 30 segundos e intenta de nuevo.");
            }
            throw new Error(errorData.error?.message || `Error HTTP ${response.status}`);
         }

         data = await response.json();
         let jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;

         if (!jsonText) {
            throw new Error("La IA no devolvió un análisis válido.");
         }

         // Aggressive JSON cleaning: Extract only the outer {} object
         const firstBrace = jsonText.indexOf('{');
         const lastBrace = jsonText.lastIndexOf('}');

         if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            jsonText = jsonText.substring(firstBrace, lastBrace + 1);
         } else {
            // Fallback: Remove common markdown wrappers if brace search fails
            jsonText = jsonText.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
         }

         console.log("AI Cleaned Response:", jsonText.substring(0, 100) + "...");

         setAiReport(JSON.parse(jsonText));

      } catch (error: any) {
         console.error("AI Error", error);
         if (data) {
            console.log("Failed JSON Content:", data?.candidates?.[0]?.content?.parts?.[0]?.text);
         }

         let msg = "Error conectando con el Auditor IA.";
         // Customize user message based on error type
         if (error.message && error.message.includes("excedido")) {
            msg = error.message; // Use our custom 429 message
         } else if (error.message && error.message.includes("JSON")) {
            msg += "\nDetalle: La IA devolvió una respuesta con formato inválido.";
         } else if (error.message) {
            msg += `\nDetalle: ${error.message}`;
         }
         alert(msg);
         setShowAiModal(false); // Close modal on error
      } finally {
         setLoadingAi(false);
      }
   };

   return (
      <div className="h-full flex flex-col space-y-4 animate-fadeIn pb-20">
         {/* --- AI AUDIT MODAL --- */}
         {showAiModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
               <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border-4 border-indigo-500/30 relative">
                  {/* Close Button */}
                  <button
                     onClick={() => setShowAiModal(false)}
                     className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full w-10 h-10 flex items-center justify-center transition-all z-50"
                  >
                     <i className="fa-solid fa-xmark text-lg"></i>
                  </button>

                  <div className="p-8">
                     <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center">
                           <i className={`fa-solid ${loadingAi ? 'fa-satellite-dish animate-pulse' : 'fa-robot'} text-3xl text-indigo-600`}></i>
                        </div>
                        <div>
                           <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Reporte Auditoría IA</h2>
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                              Periodo: {selectedDate} / {endDate || selectedDate}
                           </p>
                        </div>
                     </div>

                     {loadingAi ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                           <i className="fa-solid fa-circle-notch animate-spin text-5xl text-indigo-500"></i>
                           <p className="text-sm font-black text-indigo-400 uppercase tracking-widest animate-pulse">Analizando Recorrido y Rendimiento...</p>
                        </div>
                     ) : aiReport ? (
                        <div className="space-y-6">
                           {/* Score Card */}
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className={`col-span-1 rounded-[2rem] p-6 text-center border-4 ${aiReport.score >= 80 ? 'bg-emerald-50 border-emerald-100' : aiReport.score >= 50 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'}`}>
                                 <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">Puntaje</p>
                                 <div className={`text-6xl font-black mb-2 ${aiReport.score >= 80 ? 'text-emerald-600' : aiReport.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                    {aiReport.score}
                                 </div>
                                 <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${aiReport.score >= 80 ? 'bg-emerald-200 text-emerald-800' : aiReport.score >= 50 ? 'bg-amber-200 text-amber-800' : 'bg-red-200 text-red-800'}`}>
                                    {aiReport.verdict}
                                 </span>
                              </div>

                              <div className="col-span-2 bg-slate-50 rounded-[2rem] p-6 border border-slate-100">
                                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <i className="fa-solid fa-chart-line text-indigo-500"></i> Análisis General
                                 </h4>
                                 <p className="text-sm text-slate-700 font-medium leading-relaxed mb-4 text-justify">
                                    {aiReport.analysis}
                                 </p>
                                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <i className="fa-solid fa-user-xmark text-red-500"></i> Clientes No Visitados
                                 </h4>
                                 <p className="text-sm text-slate-700 font-medium leading-relaxed text-justify">
                                    {aiReport.missed_clients_analysis}
                                 </p>
                              </div>
                           </div>

                           <div className="bg-indigo-50 rounded-[2rem] p-6 border border-indigo-100 flex items-start gap-4">
                              <div className="bg-indigo-100 p-3 rounded-full shrink-0">
                                 <i className="fa-solid fa-lightbulb text-indigo-600 text-xl"></i>
                              </div>
                              <div>
                                 <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Recomendación IA</h4>
                                 <p className="text-sm font-bold text-indigo-900 leading-snug">
                                    {aiReport.recommendation}
                                 </p>
                              </div>
                           </div>
                        </div>
                     ) : (
                        <div className="text-center py-10">Error al cargar reporte.</div>
                     )}
                  </div>
               </div>
            </div>
         )}

         <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
               <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
                     <i className="fa-solid fa-satellite-dish text-blue-600 animate-pulse"></i>
                     {t.reports.title}
                  </h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{t.reports.subtitle}</p>
               </div>

               <div className="flex flex-wrap gap-4 w-full md:w-auto">
                  <div className="flex gap-2">
                     <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-400">DESDE</span>
                        <input
                           type="date"
                           value={selectedDate}
                           onChange={(e) => setSelectedDate(e.target.value)}
                           className="bg-transparent border-none outline-none text-xs font-black text-slate-700 uppercase"
                           style={{ colorScheme: 'light' }}
                        />
                     </div>
                     <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-400">HASTA</span>
                        <input
                           type="date"
                           value={endDate}
                           onChange={(e) => setEndDate(e.target.value)}
                           className="bg-transparent border-none outline-none text-xs font-black text-slate-700 uppercase"
                           style={{ colorScheme: 'light' }}
                        />
                     </div>
                  </div>

                  <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 flex items-center gap-2">
                     <i className="fa-solid fa-user-astronaut text-slate-900"></i>
                     <select
                        value={selectedCollector}
                        onChange={(e) => setSelectedCollector(e.target.value)}
                        className="bg-transparent border-none outline-none text-xs font-black text-slate-700 uppercase cursor-pointer"
                     >
                        <option value="all">Todos</option>
                        {collectors.map(c => (
                           <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                     </select>
                  </div>
               </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-50">
               <button
                  onClick={() => setSelectedFilter('all')}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${selectedFilter === 'all' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
               >
                  🚀 Todos
               </button>
               <button
                  onClick={() => setSelectedFilter('payment')}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${selectedFilter === 'payment' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
               >
                  😊 Pagos
               </button>
               <button
                  onClick={() => setSelectedFilter('nopayment')}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${selectedFilter === 'nopayment' ? 'bg-red-600 text-white shadow-lg' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
               >
                  😡 No Pago
               </button>
               <button
                  onClick={() => setSelectedFilter('liquidation')}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${selectedFilter === 'liquidation' ? 'bg-blue-600 text-white shadow-lg' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
               >
                  😇 Liquidar
               </button>

               <button
                  onClick={handleRunAiAudit}
                  disabled={selectedCollector === 'all'}
                  className="ml-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-lg shadow-indigo-500/30 uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  <i className="fa-solid fa-microchip"></i>
                  {t.reports.runAudit}
               </button>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm text-center">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.reports.stops}</p>
               <p className="text-xl font-black text-slate-800">{stats.totalStops}</p>
            </div>
            <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm text-center relative overflow-hidden">
               <div className={`absolute inset-0 opacity-10 ${stats.devilStops > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">{t.reports.longStops}</p>
               <div className="relative z-10 flex items-center justify-center gap-2">
                  <span className="text-2xl">{stats.devilStops > 0 ? '😈' : '✅'}</span>
                  <p className={`text-xl font-black ${stats.devilStops > 0 ? 'text-red-600' : 'text-green-600'}`}>{stats.devilStops}</p>
               </div>
            </div>
            <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm text-center">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.reports.distance}</p>
               <p className="text-xl font-black text-blue-600">{stats.totalDistance} km</p>
            </div>
            <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm text-center">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.reports.status}</p>
               <p className={`text-xl font-black ${stats.totalStops > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {stats.totalStops > 0 ? 'Activa' : '---'}
               </p>
            </div>
         </div>

         {/* OLD CARD REMOVED */}

         <div className="w-full bg-slate-900 rounded-[2rem] shadow-xl overflow-hidden relative border-4 border-slate-800 h-[400px]">
            <div ref={mapRef} className="w-full h-full z-10"></div>
            {routeData.length === 0 && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-20 text-white">
                  <i className="fa-solid fa-map-location-dot text-6xl text-slate-700 mb-4"></i>
                  <h3 className="text-xl font-black uppercase tracking-tight">Sin Recorrido</h3>
               </div>
            )}
         </div>

         {routeData.length > 0 && (
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
               <div className="p-5 border-b border-slate-50 flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historial Detallado de Ruta</h3>
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">{routeData.length} Registros</span>
               </div>

               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-slate-50 text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">
                           <th className="px-6 py-4">Hora</th>
                           <th className="px-6 py-4">Estado</th>
                           <th className="px-6 py-4">Cliente</th>
                           <th className="px-6 py-4">Monto</th>
                           <th className="px-6 py-4 text-center">GPS</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {routeData.filter(l => l.type !== CollectionLogType.OPENING).map((log) => {
                           const client = state.clients.find(c => c.id === log.clientId);
                           const time = new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                           const getEmoji = () => {
                              if (log.isRenewal) return '😇';
                              if (log.type === CollectionLogType.PAYMENT) return '😊';
                              return '😡';
                           };

                           return (
                              <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                 <td className="px-6 py-4 text-[10px] font-black text-slate-400 font-mono tracking-tighter">{time}</td>
                                 <td className="px-6 py-4">
                                    <span className={`flex items-center gap-2 text-[10px] font-black uppercase ${log.isRenewal ? 'text-blue-600' : log.type === CollectionLogType.PAYMENT ? 'text-emerald-600' : 'text-red-600'}`}>
                                       <span className="text-lg">{getEmoji()}</span>
                                       {log.isRenewal ? 'Liquidado' : log.type === CollectionLogType.PAYMENT ? 'Cobrado' : 'No Pago'}
                                    </span>
                                 </td>
                                 <td className="px-6 py-4">
                                    <p className="text-[11px] font-black text-slate-800 uppercase tracking-tighter truncate max-w-[150px]">{client?.name}</p>
                                    <p className="text-[7px] font-black text-slate-400 uppercase truncate max-w-[150px]">{client?.address}</p>
                                 </td>
                                 <td className="px-6 py-4 font-black font-mono text-[10px] text-slate-700">
                                    {log.amount ? formatCurrency(log.amount, activeSettings) : '-'}
                                 </td>
                                 <td className="px-6 py-4 text-center">
                                    {log.location && log.location.lat !== 0 ? (
                                       <a
                                          href={`https://www.google.com/maps?q=${log.location.lat},${log.location.lng}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                       >
                                          <i className="fa-solid fa-location-dot text-[10px]"></i>
                                       </a>
                                    ) : (
                                       <span className="text-[9px] font-black text-red-500 uppercase flex flex-col items-center">
                                          <i className="fa-solid fa-circle-exclamation text-xs mb-1"></i>
                                          Sin GPS
                                       </span>
                                    )}
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
            </div>
         )}
      </div>
   );
};

export default Reports;
