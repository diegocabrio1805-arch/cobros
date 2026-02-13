
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

  const [typeFilter, setTypeFilter] = useState<'ALL' | CollectionLogType>('ALL');
  const [collectorFilter, setCollectorFilter] = useState<string>('ALL');

  const collectors = useMemo(() => {
    return (Array.isArray(state.users) ? state.users : []).filter(u => u.role === Role.COLLECTOR);
  }, [state.users]);

  // Enriquecer logs con información de cobrador y cliente
  const enrichedLogs = useMemo(() => {
    return (Array.isArray(state.collectionLogs) ? state.collectionLogs : []).map(log => {
      const loan = (Array.isArray(state.loans) ? state.loans : []).find(l => l.id === log.loanId);
      const collector = (Array.isArray(state.users) ? state.users : []).find(u => u.id === loan?.collectorId);
      const client = (Array.isArray(state.clients) ? state.clients : []).find(c => c.id === log.clientId);
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
      const matchType = typeFilter === 'ALL' || log.type === typeFilter;
      const matchCollector = collectorFilter === 'ALL' || log.collectorId === collectorFilter;
      return matchType && matchCollector;
    });
  }, [enrichedLogs, typeFilter, collectorFilter]);

  useEffect(() => {
    if (mapRef.current && !leafletMap.current) {
      const defaultPos = enrichedLogs.length > 0 && enrichedLogs[0].location
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

    if (markersLayer.current) {
      markersLayer.current.clearLayers();

      filteredLogs.forEach((log) => {
        if (!log.location || log.location.lat === 0) return;

        const isPayment = log.type === CollectionLogType.PAYMENT;
        const isVirtual = log.isVirtual;
        const isRenewal = log.isRenewal;

        let emoji = '⏳';
        let bgColor = '#fee2e2';
        let borderColor = '#ef4444';
        let textColor = '#991b1b';
        let typeLabel = 'Sin Abono';

        if (isPayment) {
          if (isRenewal) {
            emoji = '♻️';
            bgColor = '#fff7ed'; // Amber lighter
            borderColor = '#d97706'; // Amber 600
            textColor = '#92400e'; // Amber 800
            typeLabel = 'Liquidación';
          } else if (isVirtual) {
            emoji = '📱';
            bgColor = '#eff6ff'; // Blue lighter
            borderColor = '#2563eb'; // Blue 600
            textColor = '#1e40af'; // Blue 800
            typeLabel = 'Transferencia';
          } else {
            emoji = '💵';
            bgColor = '#dcfce7'; // Emerald lighter
            borderColor = '#16a34a'; // Emerald 600
            textColor = '#15803d'; // Emerald 800
            typeLabel = 'Efectivo';
          }
        }

        const collectorInitial = log.collectorName.split(' ')[0];

        const customIcon = L.divIcon({
          className: 'custom-map-marker',
          html: `
            <div style="display: flex; flex-direction: column; align-items: center; transform: translateY(-50%);">
              <div style="
                background-color: ${bgColor}; 
                padding: 4px 10px;
                border: 2px solid ${borderColor}; 
                border-radius: 14px; 
                display: flex; 
                align-items: center; 
                gap: 6px;
                box-shadow: 0 8px 15px rgba(0,0,0,0.2);
                z-index: 2;
                white-space: nowrap;
              ">
                <span style="font-size: 12px;">${emoji}</span>
                <span style="font-size: 10px; font-weight: 900; color: ${textColor}; text-transform: uppercase;">
                  ${collectorInitial}
                </span>
              </div>
              <div style="
                margin-top: 4px;
                background-color: #0f172a;
                color: white;
                font-weight: 800;
                font-size: 8px;
                padding: 2px 8px;
                border-radius: 6px;
                white-space: nowrap;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                text-transform: uppercase;
                z-index: 1;
                border: 1px solid rgba(255,255,255,0.1);
              ">
                ${log.clientName}
              </div>
            </div>
          `,
          iconSize: [100, 50],
          iconAnchor: [50, 25]
        });

        const popupContent = `
          <div style="font-family: 'Inter', sans-serif; padding: 5px; min-width: 180px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
              <div style="width: 35px; height: 35px; background: ${bgColor}; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                ${emoji}
              </div>
              <div>
                <p style="margin: 0; font-size: 9px; font-weight: 900; color: ${borderColor}; text-transform: uppercase; letter-spacing: 0.5px;">
                   ${typeLabel}
                </p>
                <p style="margin: 0; font-size: 11px; font-weight: 800; color: #1e293b; text-transform: uppercase;">
                   ${log.collectorName}
                </p>
              </div>
            </div>
            <h4 style="margin: 0; font-weight: 900; color: #0f172a; font-size: 14px; text-transform: uppercase;">${log.clientName}</h4>
            ${log.amount ? `<p style="margin: 5px 0 0; font-weight: 900; color: #10b981; font-size: 16px;">${formatCurrency(log.amount, state.settings)}</p>` : ''}
            <div style="margin-top: 12px; display: flex; align-items: center; gap: 6px; color: #94a3b8; font-size: 9px; font-weight: 700; text-transform: uppercase;">
              <i class="fa-solid fa-clock"></i>
              <span>${new Date(log.date).toLocaleString('es-CO', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</span>
            </div>
          </div>
        `;

        L.marker([log.location.lat, log.location.lng], { icon: customIcon })
          .bindPopup(popupContent, {
            closeButton: false,
            offset: L.point(0, -5),
            className: 'custom-leaflet-popup'
          })
          .addTo(markersLayer.current);
      });

      if (filteredLogs.length > 0) {
        const bounds = L.latLngBounds(filteredLogs.map(l => [l.location.lat, l.location.lng]));
        leafletMap.current.fitBounds(bounds, { padding: [100, 100], maxZoom: 16 });
      }
    }
  }, [typeFilter, collectorFilter, filteredLogs, enrichedLogs]);

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

          <div className="flex flex-wrap gap-4 w-full lg:w-auto">
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
                ⏳ No Pagos
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
                {(Array.isArray(collectors) ? collectors : []).map(c => (
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
              <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-500 flex items-center justify-center text-xs">💵</div>
              <div>
                <p className="text-[10px] font-black text-slate-700 uppercase leading-none">Efectivo</p>
                <p className="text-[9px] font-bold text-emerald-600 uppercase mt-0.5">Cobro Físico</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-500 flex items-center justify-center text-xs">📱</div>
              <div>
                <p className="text-[10px] font-black text-slate-700 uppercase leading-none">Transf.</p>
                <p className="text-[9px] font-bold text-blue-600 uppercase mt-0.5">Abono Virtual</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-100 border border-orange-500 flex items-center justify-center text-xs">♻️</div>
              <div>
                <p className="text-[10px] font-black text-slate-700 uppercase leading-none">Liq.</p>
                <p className="text-[9px] font-bold text-orange-600 uppercase mt-0.5">Renovación</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 border border-red-500 flex items-center justify-center text-xs">⏳</div>
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
              {(Array.isArray(state.users) ? state.users : []).find(u => u.id === collectorFilter)?.name.charAt(0)}
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Viendo Ruta Individual</p>
              <p className="text-[10px] font-black uppercase">{(Array.isArray(state.users) ? state.users : []).find(u => u.id === collectorFilter)?.name}</p>
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
