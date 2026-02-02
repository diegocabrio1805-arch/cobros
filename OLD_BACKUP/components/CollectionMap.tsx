
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { AppState, CollectionLogType, Role } from '../types';
import { formatCurrency } from '../utils/helpers';

interface CollectionMapProps {
  state: AppState;
}

declare const L: any; // Leaflet is globally available via CDN

const CollectionMap: React.FC<CollectionMapProps> = ({ state }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markersLayer = useRef<any>(null);

  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);
  const [typeFilter, setTypeFilter] = useState<'ALL' | CollectionLogType>('ALL');
  const [collectorFilter, setCollectorFilter] = useState<string>('ALL');

  const collectors = useMemo(() => {
    return state.users.filter(u => u.role === Role.COLLECTOR);
  }, [state.users]);

  // Enriquecer logs con información de cobrador y cliente
  const enrichedLogs = useMemo(() => {
    return state.collectionLogs.map(log => {
      const loan = state.loans.find(l => l.id === log.loanId);
      const collector = state.users.find(u => u.id === loan?.collectorId);
      const client = state.clients.find(c => c.id === log.clientId);
      return {
        ...log,
        collectorName: collector?.name || 'Admin/Otro',
        collectorId: collector?.id || 'admin',
        clientName: client?.name || 'Cliente Desconocido'
      };
    });
  }, [state.collectionLogs, state.loans, state.users, state.clients]);

  const filteredLogs = useMemo(() => {
    return enrichedLogs.filter(log => {
      const logDate = new Date(log.date).toISOString().split('T')[0];
      const matchDate = dateFilter === '' || logDate === dateFilter;
      const matchType = typeFilter === 'ALL' || log.type === typeFilter;
      const matchCollector = collectorFilter === 'ALL' || log.collectorId === collectorFilter;
      return matchDate && matchType && matchCollector;
    });
  }, [enrichedLogs, dateFilter, typeFilter, collectorFilter]);

  useEffect(() => {
    if (mapRef.current && !leafletMap.current) {
      const defaultPos = enrichedLogs.length > 0
        ? [enrichedLogs[0].location.lat, enrichedLogs[0].location.lng]
        : [4.5709, -74.2973];

      leafletMap.current = L.map(mapRef.current, {
        zoomControl: false
      }).setView(defaultPos, 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(leafletMap.current);

      L.control.zoom({ position: 'bottomright' }).addTo(leafletMap.current);
      markersLayer.current = L.layerGroup().addTo(leafletMap.current);
    }
  }, [enrichedLogs]); // Init dependency

  // Effect for updating markers and routes based on filters
  useEffect(() => {
    if (leafletMap.current && markersLayer.current) {
      markersLayer.current.clearLayers();

      // Agrupar marcadores por ubicación para manejar solapamientos (Jitter simple)
      const locCounts: { [key: string]: number } = {};
      const getJitteredPos = (lat: number, lng: number) => {
        const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
        if (!locCounts[key]) locCounts[key] = 0;
        const count = locCounts[key];
        locCounts[key]++;

        // Si es el primero, no mover. Si hay más, aplicar offset en espiral/círculo
        if (count === 0) return [lat, lng];

        const angle = count * 2.5; // Radianes aproximados para dispersión
        const radius = 0.00015 * Math.ceil(count / 5); // 0.00015 grados ~ 15 metros

        return [
          lat + (radius * Math.cos(angle)),
          lng + (radius * Math.sin(angle))
        ];
      };

      const routePoints: any[] = [];

      filteredLogs.forEach((log) => {
        const isPayment = log.type === CollectionLogType.PAYMENT;
        const [lat, lng] = getJitteredPos(log.location.lat, log.location.lng);
        routePoints.push([lat, lng]);

        const bgColor = isPayment ? '#10b981' : '#ef4444'; // emerald-500 : red-500
        const ringColor = isPayment ? '#d1fae5' : '#fee2e2'; // emerald-100 : red-100

        const emoji = isPayment ? '😊' : '😠';

        // Marcador con Emojis (Caritas)
        const customIcon = L.divIcon({
          className: 'custom-map-marker-face',
          html: `
            <div style="position: relative; width: 30px; height: 30px;">
               <div style="
                 position: absolute;
                 top: 50%; left: 50%;
                 transform: translate(-50%, -50%);
                 width: 30px; height: 30px;
                 background-color: ${isPayment ? '#fff' : '#fff'};
                 border: 2px solid ${bgColor};
                 border-radius: 50%;
                 box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                 display: flex;
                 align-items: center;
                 justify-content: center;
                 font-size: 20px;
                 z-index: 10;
               ">
                 ${emoji}
               </div>
               <div style="
                 position: absolute;
                 top: 50%; left: 50%;
                 transform: translate(-50%, -50%);
                 width: 40px; height: 40px;
                 background-color: ${ringColor};
                 opacity: 0.5;
                 border-radius: 50%;
                 animation: pulse 2s infinite;
                 z-index: 5;
               "></div>
               <div style="
                 position: absolute;
                 top: 100%;
                 left: 50%;
                 transform: translateX(-50%);
                 margin-top: 6px;
                 background-color: rgba(15, 23, 42, 0.95);
                 color: white;
                 padding: 3px 8px;
                 border-radius: 6px;
                 font-size: 9px;
                 font-weight: 800;
                 white-space: nowrap;
                 text-transform: uppercase;
                 box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                 z-index: 20;
                 pointer-events: none;
                 border: 1px solid rgba(255,255,255,0.2);
               ">
                 ${log.clientName}
               </div>
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -10]
        });

        const popupContent = `
          <div style="font-family: 'Inter', sans-serif; min-width: 200px;">
            <div style="background-color: ${isPayment ? '#064e3b' : '#7f1d1d'}; padding: 12px; border-radius: 12px 12px 0 0; color: white;">
               <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px;">
                  <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px;">
                     ${isPayment ? 'Pago Exitoso' : 'No Pago'}
                  </span>
                  <span style="font-size: 10px; opacity: 0.8;">${new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
               </div>
               <h3 style="margin: 0; font-size: 14px; font-weight: 900; leading: 1.2;">${log.clientName}</h3>
            </div>
            
            <div style="padding: 12px; background: white; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              ${log.amount ? `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                 <span style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Monto:</span>
                 <span style="font-size: 16px; font-weight: 900; color: #059669; font-family: monospace;">${formatCurrency(log.amount)}</span>
              </div>` : ''}
              
             <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #334155; padding-top: 8px; border-top: 1px dashed #e2e8f0;">
                 <div style="width: 24px; height: 24px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900;">
                    ${log.collectorName.charAt(0)}
                 </div>
                 <div>
                    <span style="display: block; font-size: 8px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Realizado por</span>
                    <span style="font-weight: 700;">${log.collectorName}</span>
                 </div>
              </div>

              <a href="https://www.google.com/maps/search/?api=1&query=${log.location.lat},${log.location.lng}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; text-align: center; margin-top: 12px; background: #0f172a; color: white; padding: 8px 12px; border-radius: 8px; font-size: 9px; font-weight: 800; text-decoration: none; text-transform: uppercase; transition: all 0.2s;">
                 <i class="fa-solid fa-map-location-dot"></i> 
                 Ver en Google Maps
              </a>
            </div>
          </div>
        `;

        L.marker([lat, lng], { icon: customIcon })
          .bindPopup(popupContent, {
            closeButton: false,
            className: 'custom-leaflet-popup-modern'
          })
          .addTo(markersLayer.current);
      });

      // Dibujar línea de ruta si hay un cobrador seleccionado
      if (collectorFilter !== 'ALL' && routePoints.length > 1) {
        L.polyline(routePoints, {
          color: '#3b82f6', // blue-500
          weight: 3,
          opacity: 0.6,
          dashArray: '10, 10',
          lineCap: 'round'
        }).addTo(markersLayer.current);
      }

      if (filteredLogs.length > 0) {
        const bounds = L.latLngBounds(routePoints);
        leafletMap.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
      }
    }
  }, [state, dateFilter, typeFilter, collectorFilter, filteredLogs]);

  const handleOpenMG = () => {
    if (filteredLogs.length === 0) return alert('No hay puntos visibles para mostrar en Google Maps.');

    // Validar límite de URL de Google Maps (aprox 10-15 puntos para garantizar funcionamiento)
    const MAX_POINTS = 12;
    const pointsToMap = filteredLogs.slice(0, MAX_POINTS);

    if (filteredLogs.length > MAX_POINTS) {
      alert(`Se mostrarán los primeros ${MAX_POINTS} puntos de ${filteredLogs.length} debido a límites de Google Maps.`);
    }

    const path = pointsToMap.map(log => `${log.location.lat},${log.location.lng}`).join('/');
    const url = `https://www.google.com/maps/dir/${path}`;
    window.open(url, '_blank');
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-fadeIn">
      {/* Panel de Control de Mapa */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <i className="fa-solid fa-map-location-dot text-emerald-600"></i>
              Auditoría Geográfica
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Monitoreo de rutas y efectividad en vivo</p>
          </div>

          <div className="flex flex-wrap gap-4 w-full lg:w-auto items-center">
            {/* Filtro Fecha */}
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
              <i className="fa-solid fa-calendar-day text-slate-400 text-xs"></i>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent border-none outline-none text-[10px] font-black text-slate-700 uppercase tracking-widest cursor-pointer"
              />
            </div>

            <button
              onClick={handleOpenMG}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2 transition-all active:scale-95"
              title="Abrir Ruta en Google Maps"
            >
              <i className="fa-solid fa-map"></i>
              MG
            </button>

            {/* Filtro Tipo */}
            <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
              <button
                onClick={() => setTypeFilter('ALL')}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${typeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Todo
              </button>
              <button
                onClick={() => setTypeFilter(CollectionLogType.PAYMENT)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${typeFilter === CollectionLogType.PAYMENT ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-emerald-600'}`}
              >
                😊 Pagos
              </button>
              <button
                onClick={() => setTypeFilter(CollectionLogType.NO_PAGO)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${typeFilter === CollectionLogType.NO_PAGO ? 'bg-red-600 text-white shadow-md' : 'text-slate-500 hover:text-red-600'}`}
              >
                😠 No Pagos
              </button>
            </div>

            {/* Selector de Cobrador */}
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 flex-1 lg:flex-none">
              <i className="fa-solid fa-user-tag text-slate-400 text-xs"></i>
              <select
                value={collectorFilter}
                onChange={(e) => setCollectorFilter(e.target.value)}
                className="bg-transparent border-none outline-none text-[10px] font-black text-slate-700 uppercase tracking-widest w-full cursor-pointer"
              >
                <option value="ALL">TODOS LOS COBRADORES</option>
                {collectors.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Contenedor del Mapa */}
      <div className="flex-1 bg-white p-2 rounded-[3rem] border border-slate-100 shadow-2xl relative overflow-hidden min-h-[500px]">
        <div ref={mapRef} className="h-full w-full z-10"></div>

        {/* Leyenda Flotante */}
        <div className="absolute bottom-8 left-8 z-[1000] bg-white/90 backdrop-blur-md p-6 rounded-[2rem] border border-white shadow-2xl space-y-4 pointer-events-none hidden md:block border-l-4 border-l-emerald-500">
          <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-2">Resumen de Vista</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-500 flex items-center justify-center text-xs">😊</div>
              <div>
                <p className="text-[10px] font-black text-slate-700 uppercase leading-none">Abonos</p>
                <p className="text-[9px] font-bold text-emerald-600 uppercase mt-0.5">Captura Exitosa</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 border border-red-500 flex items-center justify-center text-xs">😠</div>
              <div>
                <p className="text-[10px] font-black text-slate-700 uppercase leading-none">Sin Pago</p>
                <p className="text-[9px] font-bold text-red-500 uppercase mt-0.5">Mora Reportada</p>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase">Filtros Activos: <span className="text-blue-600">{filteredLogs.length} GESTIONES</span></p>
          </div>
        </div>

        {/* Badge de Cobrador Seleccionado */}
        {collectorFilter !== 'ALL' && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-slideDown">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black">
              {state.users.find(u => u.id === collectorFilter)?.name.charAt(0)}
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Viendo Ruta Individual</p>
              <p className="text-[10px] font-black uppercase">{state.users.find(u => u.id === collectorFilter)?.name}</p>
            </div>
          </div>
        )}
      </div>

      {filteredLogs.length === 0 && (
        <div className="bg-slate-900 text-white p-10 rounded-[2.5rem] flex flex-col items-center text-center gap-4 animate-fadeIn">
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center text-3xl">
            <i className="fa-solid fa-satellite-dish animate-pulse"></i>
          </div>
          <div>
            <h3 className="text-lg font-black uppercase">Sin Datos Disponibles</h3>
            <p className="text-slate-400 text-sm max-w-sm font-medium">No hay registros que coincidan con los filtros seleccionados para este período o cobrador.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionMap;
