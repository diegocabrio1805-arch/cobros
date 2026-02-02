
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppState, Role, CollectionLog, LoanStatus, CollectionLogType } from '../types';
import { formatCurrency } from '../utils/helpers';
import { GoogleGenAI, Type } from "@google/genai";
import { getTranslation } from '../utils/translations';

interface ReportsProps {
   state: AppState;
}

declare const L: any;

const Reports: React.FC<ReportsProps> = ({ state }) => {
   const mapRef = useRef<HTMLDivElement>(null);
   const leafletMap = useRef<any>(null);
   const layerGroup = useRef<any>(null);
   const t = getTranslation(state.settings.language);

   const [selectedCollector, setSelectedCollector] = useState<string>('all');
   const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
   const [stats, setStats] = useState({ totalStops: 0, devilStops: 0, totalDistance: 0 });

   const [aiReport, setAiReport] = useState<any>(null);
   const [loadingAi, setLoadingAi] = useState(false);

   const collectors = state.users.filter(u => {
      if (u.role !== Role.COLLECTOR) return false;
      if (state.currentUser?.role === Role.MANAGER) {
         return u.managedBy === state.currentUser.id;
      }
      return true;
   });

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
         return logDate === selectedDate;
      });

      if (selectedCollector !== 'all') {
         logs = logs.filter(log => {
            const loan = state.loans.find(l => l.id === log.loanId);
            return loan?.collectorId === selectedCollector;
         });
      }

      return logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
   }, [state.collectionLogs, state.loans, selectedCollector, selectedDate]);

   useEffect(() => {
      if (mapRef.current && !leafletMap.current) {
         leafletMap.current = L.map(mapRef.current, { zoomControl: false }).setView([4.5709, -74.2973], 13);
         L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
         }).addTo(leafletMap.current);
         L.control.zoom({ position: 'bottomright' }).addTo(leafletMap.current);
         layerGroup.current = L.layerGroup().addTo(leafletMap.current);
      }

      if (layerGroup.current) {
         layerGroup.current.clearLayers();

         if (routeData.length === 0) {
            setStats({ totalStops: 0, devilStops: 0, totalDistance: 0 });
            return;
         }

         const points: any[] = [];
         let calculatedDist = 0;
         let devils = 0;

         const startIcon = L.divIcon({ className: 'custom-icon', html: '<div style="font-size: 24px;">🏁</div>', iconAnchor: [12, 12] });
         const endIcon = L.divIcon({ className: 'custom-icon', html: '<div style="font-size: 24px;">🏁</div>', iconAnchor: [12, 12] });

         routeData.forEach((log, index) => {
            const client = state.clients.find(c => c.id === log.clientId);
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
               L.circleMarker([lat, lng], {
                  radius: 6,
                  fillColor: log.type === 'PAGO' ? '#10b981' : '#ef4444',
                  color: '#fff',
                  weight: 2,
                  opacity: 1,
                  fillOpacity: 1
               }).bindPopup(`<b>${timeStr}</b><br/>${client?.name}<br/>${log.type}`).addTo(layerGroup.current);
            }

            if (index === 0) L.marker([lat, lng], { icon: startIcon }).addTo(layerGroup.current);
            if (index === routeData.length - 1 && routeData.length > 1) L.marker([lat, lng], { icon: endIcon }).addTo(layerGroup.current);
         });

         if (points.length > 1) {
            L.polyline(points, { color: '#3b82f6', weight: 4, opacity: 0.7, dashArray: '10, 10', lineCap: 'round' }).addTo(layerGroup.current);
            const bounds = L.latLngBounds(points);
            leafletMap.current.fitBounds(bounds, { padding: [50, 50] });
         } else if (points.length === 1) {
            leafletMap.current.setView(points[0], 15);
         }

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

      const collectorName = state.users.find(u => u.id === selectedCollector)?.name || 'Desconocido';
      const assignedLoans = state.loans.filter(l =>
         l.status === LoanStatus.ACTIVE && l.collectorId === selectedCollector
      );
      const totalAssignedClients = new Set(assignedLoans.map(l => l.clientId)).size;
      const visitedClientIds = new Set(routeData.map(log => log.clientId));
      const totalVisited = visitedClientIds.size;
      const missingClients = totalAssignedClients - totalVisited;
      const routeCoverage = totalAssignedClients > 0 ? (totalVisited / totalAssignedClients) * 100 : 0;
      const payments = routeData.filter(l => l.type === CollectionLogType.PAYMENT).length;
      const noPayments = routeData.filter(l => l.type === CollectionLogType.NO_PAGO).length;
      const collectedAmount = routeData.reduce((acc, l) => acc + (l.amount || 0), 0);
      const devilStops = stats.devilStops;

      const prompt = `
      Actúa como un Auditor Jefe de Cobranzas. Evalúa al cobrador "${collectorName}".
      DATOS:
      - Asignados: ${totalAssignedClients}
      - Visitados: ${totalVisited}
      - Cobertura: ${routeCoverage.toFixed(1)}%
      - Faltantes: ${missingClients}
      - Paradas sospechosas: ${devilStops}
      - Gestión: ${payments} Pagos vs ${noPayments} No Pagos.
      - Recaudo: ${formatCurrency(collectedAmount)}

      Responde SOLAMENTE en JSON:
      {
        "score": number (0 a 100),
        "verdict": "string (Ej: EXCELENTE, PELIGRO)",
        "analysis": "string (Resumen corto)",
        "recommendation": "string (Acción)"
      }
    `;

      try {
         const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
         const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview',
            contents: prompt,
            config: {
               responseMimeType: "application/json",
               responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                     score: { type: Type.INTEGER },
                     verdict: { type: Type.STRING },
                     analysis: { type: Type.STRING },
                     recommendation: { type: Type.STRING }
                  }
               }
            }
         });
         setAiReport(JSON.parse(response.text || '{}'));
      } catch (error) {
         console.error("AI Error", error);
         alert("Error conectando con el Auditor IA.");
      } finally {
         setLoadingAi(false);
      }
   };

   return (
      <div className="h-full flex flex-col space-y-4 animate-fadeIn pb-20">
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
                  <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 flex items-center gap-2">
                     <i className="fa-regular fa-calendar text-slate-900"></i>
                     <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-transparent border-none outline-none text-xs font-black text-slate-700 uppercase"
                        style={{ colorScheme: 'light' }}
                     />
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

         <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[2rem] p-5 shadow-xl relative overflow-hidden border border-indigo-500/30">
            <div className="absolute top-0 right-0 p-6 opacity-10">
               <i className="fa-solid fa-robot text-7xl text-white"></i>
            </div>

            <div className="relative z-10">
               <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
                  <div>
                     <h3 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-2">
                        <i className="fa-solid fa-brain text-indigo-400"></i>
                        {t.reports.aiAudit}
                     </h3>
                  </div>
                  <button
                     onClick={handleRunAiAudit}
                     disabled={loadingAi || selectedCollector === 'all'}
                     className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-black rounded-xl shadow-lg shadow-indigo-500/30 uppercase tracking-widest text-[10px] transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  >
                     {loadingAi ? <i className="fa-solid fa-circle-notch animate-spin text-black"></i> : <i className="fa-solid fa-microchip text-black"></i>}
                     {loadingAi ? t.common.loading : t.reports.runAudit}
                  </button>
               </div>

               {aiReport && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fadeIn">
                     <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 flex flex-col items-center justify-center text-center">
                        <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1">{t.reports.score}</p>
                        <div className={`text-4xl font-black mb-1 ${aiReport.score >= 80 ? 'text-emerald-400' : aiReport.score >= 50 ? 'text-amber-400' : 'text-red-500'}`}>
                           {aiReport.score}/100
                        </div>
                        <span className={`px-3 py-0.5 rounded-full text-[9px] font-black uppercase ${aiReport.score >= 80 ? 'bg-emerald-500/20 text-emerald-300' : aiReport.score >= 50 ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'}`}>
                           {aiReport.verdict}
                        </span>
                     </div>

                     <div className="lg:col-span-2 bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 flex flex-col justify-center">
                        <div className="mb-2">
                           <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                              <i className="fa-solid fa-magnifying-glass-chart text-indigo-400"></i> {t.reports.analysis}
                           </h4>
                           <p className="text-xs text-slate-200 leading-relaxed font-medium line-clamp-3">"{aiReport.analysis}"</p>
                        </div>
                        <div className="pt-2 border-t border-white/5">
                           <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                              <i className="fa-solid fa-gavel text-red-400"></i> {t.reports.recommendation}
                           </h4>
                           <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-wide truncate">{aiReport.recommendation}</p>
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </div>

         <div className="w-full bg-slate-900 rounded-[2rem] shadow-xl overflow-hidden relative border-4 border-slate-800 h-[400px]">
            <div ref={mapRef} className="w-full h-full z-10"></div>
            {routeData.length === 0 && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-20 text-white">
                  <i className="fa-solid fa-map-location-dot text-6xl text-slate-700 mb-4"></i>
                  <h3 className="text-xl font-black uppercase tracking-tight">Sin Recorrido</h3>
               </div>
            )}
         </div>
      </div>
   );
};

export default Reports;
