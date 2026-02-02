
import React, { useState, useEffect } from 'react';
import { User, Role, AppState, CountryCode } from '../types';
import { getTranslation } from '../utils/translations';
import { formatCountryTime, getCountryName } from '../utils/helpers';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  user: User;
  state: AppState;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  menuItems: any[];
  onSync: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout, user, state, isOpen, setIsOpen, menuItems, onSync }) => {
  const isAdmin = user.role === Role.ADMIN;
  const isManager = user.role === Role.MANAGER;
  const isPowerUser = isAdmin || isManager;

  const [currentTime, setCurrentTime] = useState<string>('');
  const t = getTranslation(state.settings.language).menu;

  const countryCode = state.settings.country as CountryCode;
  const countryName = getCountryName(countryCode);

  const flags: Record<string, string> = {
    AG: '🇦🇬', AR: '🇦🇷', BS: '🇧🇸', BB: '🇧🇧', BZ: '🇧🇿', BO: '🇧🇴', BR: '🇧🇷',
    CA: '🇨🇦', CL: '🇨🇱', CO: '🇨🇴', CR: '🇨🇷', CU: '🇨🇺', DM: '🇩🇲', EC: '🇪🇨',
    SV: '🇸🇻', US: '🇺🇸', GD: '🇬🇩', GT: '🇬🇹', GY: '🇬🇾', HT: '🇭🇹', HN: '🇭🇳',
    JM: '🇯🇲', MX: '🇲🇽', NI: '🇳🇮', PA: '🇵🇦', PY: '🇵🇾', PE: '🇵🇪', DO: '🇩🇴',
    KN: '🇰🇳', VC: '🇻🇨', LC: '🇱🇨', SR: '🇸🇷', TT: '🇹🇹', UY: '🇺🇾', VE: '🇻🇪'
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(formatCountryTime(countryCode));
    }, 1000);
    setCurrentTime(formatCountryTime(countryCode));
    return () => clearInterval(timer);
  }, [countryCode]);


  const filteredItems = menuItems; // Used passed items directly

  const technicalSupportPhone = state.settings.technicalSupportPhone;

  return (
    <div className="w-64 bg-[#0f172a] h-screen sticky top-0 hidden md:flex flex-col text-slate-400 border-r border-slate-800">
      <div className="p-6 border-b border-slate-800 space-y-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-emerald-500 flex items-center gap-3 uppercase tracking-tighter">
            <i className="fa-solid fa-sack-dollar text-2xl"></i>
            <span className="text-xs">Anexo Cobro</span>
          </h1>
        </div>

        {/* Sección de País y Hora Local */}
        <div className="bg-white/5 rounded-xl p-3 border border-white/5 animate-fadeIn">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg leading-none">{flags[countryCode] || '🌎'}</span>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter truncate">{countryName}</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <i className="fa-regular fa-clock text-[10px]"></i>
            <span className="text-xs font-black font-mono tracking-widest">{currentTime}</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => (
          <React.Fragment key={item.id}>
            <button
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === item.id
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'hover:bg-slate-800 hover:text-slate-200'
                }`}
            >
              <i className={`fa-solid ${item.icon} w-5 text-lg ${activeTab === item.id ? 'text-white' : 'text-slate-50'}`}></i>
              {item.label}
            </button>
            {item.id === 'settings' && isManager && technicalSupportPhone && (
              <div className="px-4 py-3 mt-1 bg-white/5 rounded-xl border border-white/5 animate-fadeIn">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Soporte Técnico</p>
                <a href={`tel:${technicalSupportPhone}`} className="text-[10px] font-black text-emerald-400 flex items-center gap-2 hover:text-emerald-300 transition-colors">
                  <i className="fa-solid fa-phone-volume text-xs"></i>
                  {technicalSupportPhone}
                </a>
              </div>
            )}
          </React.Fragment>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-2">
        <button
          onClick={onSync}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black text-blue-400 hover:bg-blue-400/10 transition-colors uppercase tracking-widest mb-1"
        >
          <i className="fa-solid fa-cloud-arrow-down w-5 text-lg"></i>
          Sincronizar Datos
        </button>

        <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 rounded-2xl border border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-sm font-black shadow-lg shadow-emerald-500/30">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-white truncate uppercase tracking-tighter">{user.name}</p>
            <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">{user.role}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black text-red-400 hover:bg-red-400/10 transition-colors uppercase tracking-widest"
        >
          <i className="fa-solid fa-right-from-bracket w-5 text-lg"></i>
          {t.logout}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
