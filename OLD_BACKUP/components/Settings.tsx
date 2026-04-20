
import React, { useState } from 'react';
import { AppState, AppSettings, Language, CountryCode, Role } from '../types';
import { getTranslation } from '../utils/translations';

interface SettingsProps {
  state: AppState;
  updateSettings: (settings: AppSettings) => void;
  setActiveTab: (tab: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ state, updateSettings, setActiveTab }) => {
  const { language, country, numberFormat } = state.settings;
  const t = getTranslation(language);
  const isAdmin = state.currentUser?.role === Role.ADMIN;
  const isManager = state.currentUser?.role === Role.MANAGER;
  const isPowerUser = isAdmin || isManager;

  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportPhone, setSupportPhone] = useState(state.settings.technicalSupportPhone || '');

  // --- PRINTER LOGIC ---
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [printerDevices, setPrinterDevices] = useState<any[]>([]);
  const [scanningPrinters, setScanningPrinters] = useState(false);

  const handleScanPrinters = async () => {
    setScanningPrinters(true);
    try {
      const { listBondedDevices, checkBluetoothEnabled, enableBluetooth } = await import('../services/bluetoothPrinterService');

      const enabled = await checkBluetoothEnabled();
      if (!enabled) {
        const success = await enableBluetooth();
        if (!success) {
          alert("Es necesario activar el Bluetooth para buscar impresoras.");
          setScanningPrinters(false);
          return;
        }
      }

      const devices = await listBondedDevices();
      setPrinterDevices(devices);
      if (devices.length === 0) {
        alert("No se encontraron dispositivos VINCULADOS. Por favor ve a Ajustes de Android > Bluetooth y vincula tu impresora primero.");
      }
    } catch (e: any) {
      console.error(e);
      alert(`Error buscando impresoras: ${e.message || JSON.stringify(e)}\n\n⚠️ IMPORTANTE ANDROID 12+:\nSi el error persiste, ve a Ajustes del Celular > Aplicaciones > Anexo Cobro > Permisos y activa manualmente "Dispositivos Cercanos" (Nearby Devices) y "Ubicación".`);
    } finally {
      setScanningPrinters(false);
    }
  };

  const handleSelectPrinter = async (device: any) => {
    try {
      const { connectToPrinter } = await import('../services/bluetoothPrinterService');
      const connected = await connectToPrinter(device.id); // device.id = MAC address
      if (connected) {
        alert(`Conectado a ${device.name}`);
        setShowPrinterModal(false);
      }
    } catch (e) {
      alert("Error al conectar: " + e);
    }
  };

  const handleLanguageChange = (lang: Language) => {
    updateSettings({ ...state.settings, language: lang });
  };

  const handleCountryChange = (ctry: CountryCode) => {
    updateSettings({ ...state.settings, country: ctry });
  };

  const handleFormatChange = (fmt: 'dot' | 'comma') => {
    updateSettings({ ...state.settings, numberFormat: fmt });
  };

  const handleSaveSupportPhone = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({ ...state.settings, technicalSupportPhone: supportPhone });
    setShowSupportModal(false);
    alert("Número de Soporte Técnico actualizado.");
  };

  const handleSaveAndExit = () => {
    // Como los cambios se aplican inmediatamente en los handlers individuales,
    // este botón sirve como confirmación de salida.
    setActiveTab(isPowerUser ? 'dashboard' : 'route');
  };

  const countries = [
    { code: 'AG', name: 'Antigua y Barbuda', flag: '🇦🇬' },
    { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
    { code: 'BS', name: 'Bahamas', flag: '🇧🇸' },
    { code: 'BB', name: 'Barbados', flag: '🇧🇧' },
    { code: 'BZ', name: 'Belice', flag: '🇧🇿' },
    { code: 'BO', name: 'Bolivia', flag: '🇧🇴' },
    { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
    { code: 'CA', name: 'Canadá', flag: '🇨🇦' },
    { code: 'CL', name: 'Chile', flag: '🇨🇱' },
    { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
    { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
    { code: 'CU', name: 'Cuba', flag: '🇨🇺' },
    { code: 'DM', name: 'Dominica', flag: '🇩🇲' },
    { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
    { code: 'SV', name: 'El Salvador', flag: '🇸🇻' },
    { code: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
    { code: 'GD', name: 'Granada', flag: '🇬🇩' },
    { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
    { code: 'GY', name: 'Guyana', flag: '🇬🇾' },
    { code: 'HT', name: 'Haití', flag: '🇭🇹' },
    { code: 'HN', name: 'Honduras', flag: '🇭🇳' },
    { code: 'JM', name: 'Jamaica', flag: '🇯🇲' },
    { code: 'MX', name: 'México', flag: '🇲🇽' },
    { code: 'NI', name: 'Nicaragua', flag: '🇳🇮' },
    { code: 'PA', name: 'Panamá', flag: '🇵🇦' },
    { code: 'PY', name: 'Paraguay', flag: '🇵🇾' },
    { code: 'PE', name: 'Perú', flag: '🇵🇪' },
    { code: 'DO', name: 'Rep. Dominicana', flag: '🇩🇴' },
    { code: 'KN', name: 'San Cristóbal y N.', flag: '🇰🇳' },
    { code: 'VC', name: 'San Vicente y G.', flag: '🇻🇨' },
    { code: 'LC', name: 'Santa Lucía', flag: '🇱🇨' },
    { code: 'SR', name: 'Surinam', flag: '🇸🇷' },
    { code: 'TT', name: 'Trinidad y Tobago', flag: '🇹🇹' },
    { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
    { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  ];

  const languages = [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-8 animate-fadeIn pb-32 px-1">
      <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 rounded-xl md:rounded-2xl flex items-center justify-center text-white text-lg shadow-xl">
            <i className="fa-solid fa-gear"></i>
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">Opciones</h2>
            <p className="text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-widest mt-1">Configuración Regional</p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setSupportPhone(state.settings.technicalSupportPhone || '');
              setShowSupportModal(true);
            }}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-headset"></i>
            CONFIGURAR SOPORTE TÉCNICO
          </button>
        )}
      </div>

      {isPowerUser && (
        <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-6">
            <i className="fa-solid fa-coins text-xl md:text-2xl text-amber-500"></i>
            <h3 className="text-base md:text-lg font-black text-slate-800 uppercase">Formato de Moneda</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleFormatChange('dot')}
              className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${numberFormat !== 'comma' ? 'border-emerald-600 bg-emerald-50' : 'border-slate-100 bg-slate-50 active:border-emerald-200'}`}
            >
              <span className={`text-xl font-black ${numberFormat !== 'comma' ? 'text-emerald-700' : 'text-slate-500'}`}>1.000.000,00</span>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">PUNTO DE MIL</span>
            </button>

            <button
              onClick={() => handleFormatChange('comma')}
              className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${numberFormat === 'comma' ? 'border-emerald-600 bg-emerald-50' : 'border-slate-100 bg-slate-50 active:border-emerald-200'}`}
            >
              <span className={`text-xl font-black ${numberFormat === 'comma' ? 'text-emerald-700' : 'text-slate-500'}`}>1,000,000.00</span>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">PUNTO DE COMA</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        {/* COLUMNA 1: IDIOMA */}
        <div className="flex flex-col gap-4 md:gap-6">
          <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all h-full">
            <div className="flex items-center gap-3 mb-5 md:mb-6">
              <i className="fa-solid fa-language text-xl md:text-2xl text-blue-600"></i>
              <h3 className="text-base md:text-lg font-black text-slate-800 uppercase">Idioma App</h3>
            </div>

            <div className="space-y-2 md:space-y-3">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code as Language)}
                  className={`w-full p-3.5 md:p-4 rounded-xl md:rounded-2xl border-2 flex items-center justify-between transition-all group ${language === lang.code ? 'border-blue-600 bg-blue-50' : 'border-slate-100 active:border-blue-200'}`}
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <span className="text-xl md:text-2xl">{lang.flag}</span>
                    <span className={`font-black uppercase text-xs md:text-sm ${language === lang.code ? 'text-blue-700' : 'text-slate-600'}`}>{lang.name}</span>
                  </div>
                  {language === lang.code && <i className="fa-solid fa-circle-check text-blue-600"></i>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* COLUMNA 2: PAÍS + BOTÓN GUARDAR Y SALIR */}
        <div className="flex flex-col gap-4 md:gap-6">
          <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all h-fit flex flex-col">
            <div className="flex items-center gap-3 mb-1.5 md:mb-2">
              <i className="fa-solid fa-earth-americas text-xl md:text-2xl text-emerald-600"></i>
              <h3 className="text-base md:text-lg font-black text-slate-800 uppercase">País de Operación</h3>
            </div>
            <p className="text-[8px] md:text-[10px] text-slate-400 mb-4 font-medium leading-relaxed">
              Ajusta festivos y formato de moneda.
            </p>

            <div className="grid grid-cols-1 gap-1.5 max-h-[300px] md:max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {countries.map((ctry) => (
                <button
                  key={ctry.code}
                  onClick={() => handleCountryChange(ctry.code as CountryCode)}
                  className={`w-full p-2.5 md:p-3 rounded-xl border-2 flex items-center justify-between transition-all ${country === ctry.code ? 'border-emerald-600 bg-emerald-50' : 'border-slate-100 active:border-emerald-200'}`}
                >
                  <div className="flex items-center gap-2 md:gap-3">
                    <span className="text-lg md:text-2xl">{ctry.flag}</span>
                    <span className={`font-black uppercase text-[10px] md:text-xs ${country === ctry.code ? 'text-emerald-700' : 'text-slate-600'}`}>{ctry.name}</span>
                  </div>
                  {country === ctry.code && <i className="fa-solid fa-circle-check text-emerald-600"></i>}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSaveAndExit}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-2xl md:rounded-[2rem] shadow-xl shadow-emerald-500/20 transition-all active:scale-95 uppercase tracking-[0.2em] text-xs md:text-sm flex items-center justify-center gap-3 border-b-4 border-emerald-800"
          >
            <i className="fa-solid fa-cloud-arrow-up text-lg"></i>
            GUARDAR Y SALIR
          </button>
        </div>
      </div>

      {/* SECCIÓN IMPRESORA */}
      <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all">
        <div className="flex items-center gap-3 mb-6">
          <i className="fa-solid fa-print text-xl md:text-2xl text-slate-800"></i>
          <h3 className="text-base md:text-lg font-black text-slate-800 uppercase">Impresora Bluetooth</h3>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center">
          <button
            onClick={() => {
              setShowPrinterModal(true);
              handleScanPrinters();
            }}
            className="w-full md:w-auto bg-slate-800 text-white px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <i className="fa-brands fa-bluetooth-b text-lg"></i>
            CONFIGURAR IMPRESORA
          </button>

          <button
            onClick={async () => {
              try {
                const { printText, isPrinterConnected, connectToPrinter } = await import('../services/bluetoothPrinterService');
                // Intentar conectar si no lo está
                if (!isPrinterConnected()) {
                  await connectToPrinter();
                }
                setTimeout(async () => {
                  const success = await printText("PRUEBA DE IMPRESION\n\nSistema de Cobros\nConexion Exitosa\n\n................................\n\n");
                  if (success) alert("✅ Prueba enviada");
                }, 500);
              } catch (e: any) {
                alert("Error al imprimir: " + e.message);
              }
            }}
            className="w-full md:w-auto bg-white border-2 border-slate-200 text-slate-600 px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-slate-800 hover:text-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-receipt text-lg"></i>
            IMPRIMIR PRUEBA
          </button>
        </div>
        <p className="text-[9px] text-slate-400 mt-4 font-bold uppercase tracking-wide">
          <i className="fa-solid fa-circle-info mr-2 text-blue-500"></i>
          Configure aquí su impresora para los recibos de pago.
        </p>
      </div>

      {/* MODAL CONFIGURACION IMPRESORA */}
      {showPrinterModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-scaleIn">
            <div className="bg-slate-900 p-6 flex justify-between items-center">
              <h3 className="text-white font-black uppercase text-lg tracking-tighter">
                <i className="fa-brands fa-bluetooth-b text-blue-400 mr-2"></i>
                Configurar Impresora
              </h3>
              <button onClick={() => setShowPrinterModal(false)} className="text-white/50 hover:text-white">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            <div className="p-6">
              <div className="flex justify-center mb-6">
                <button
                  onClick={handleScanPrinters}
                  disabled={scanningPrinters}
                  className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all ${scanningPrinters ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'}`}
                >
                  {scanningPrinters ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin"></i> BUSCANDO...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-magnifying-glass"></i> BUSCAR DISPOSITIVOS
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {printerDevices.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <i className="fa-solid fa-print text-4xl mb-2 opacity-20"></i>
                    <p className="text-[10px] font-bold uppercase">No se encontraron dispositivos</p>
                    <p className="text-[9px] mt-2">Asegurate de haber vinculado tu impresora desde los ajustes de Bluetooth de Android.</p>
                  </div>
                ) : (
                  printerDevices.map((dev, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectPrinter(dev)}
                      className="w-full text-left p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all group"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-black text-slate-700 uppercase text-xs">{dev.name || 'Dispositivo Desconocido'}</p>
                          <p className="font-mono text-[10px] text-slate-400">{dev.id}</p>
                        </div>
                        <i className="fa-solid fa-chevron-right text-slate-300 group-hover:text-blue-500"></i>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showSupportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-sm overflow-hidden animate-scaleIn border border-white/20">
            <div className="p-5 bg-blue-600 text-white flex justify-between items-center sticky top-0 z-10">
              <div>
                <h3 className="text-base font-black uppercase tracking-tighter leading-none">Soporte Técnico</h3>
                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mt-1">Configuración Global</p>
              </div>
              <button onClick={() => setShowSupportModal(false)} className="w-8 h-8 bg-white/10 text-white rounded-lg flex items-center justify-center hover:bg-red-600 transition-all">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <form onSubmit={handleSaveSupportPhone} className="p-6 space-y-4 bg-slate-50">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número de Teléfono</label>
                <div className="relative">
                  <i className="fa-solid fa-phone absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                  <input
                    required
                    type="tel"
                    autoFocus
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                    placeholder="Ej: +57 300 123 4567"
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-base font-black text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/20 shadow-inner"
                  />
                </div>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-2 ml-1 leading-relaxed">
                  <i className="fa-solid fa-info-circle mr-1 text-blue-500"></i>
                  Este número aparecerá en el menú lateral de todos los Gerentes.
                </p>
              </div>
              <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">
                GUARDAR CAMBIOS
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
