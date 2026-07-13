import React, { useState, useEffect } from 'react';

const WEATHER_CODE_MAP: Record<number, { icon: string, label: string }> = {
  0: { icon: 'fa-sun', label: 'Despejado' },
  1: { icon: 'fa-cloud-sun', label: 'Mayormente despejado' },
  2: { icon: 'fa-cloud-sun', label: 'Parcialmente nublado' },
  3: { icon: 'fa-cloud', label: 'Nublado' },
  45: { icon: 'fa-smog', label: 'Niebla' },
  48: { icon: 'fa-smog', label: 'Niebla escarcha' },
  51: { icon: 'fa-cloud-rain', label: 'Llovizna ligera' },
  53: { icon: 'fa-cloud-rain', label: 'Llovizna moderada' },
  55: { icon: 'fa-cloud-rain', label: 'Llovizna densa' },
  56: { icon: 'fa-cloud-rain', label: 'Llovizna helada ligera' },
  57: { icon: 'fa-cloud-rain', label: 'Llovizna helada densa' },
  61: { icon: 'fa-cloud-showers-heavy', label: 'Lluvia ligera' },
  63: { icon: 'fa-cloud-showers-heavy', label: 'Lluvia moderada' },
  65: { icon: 'fa-cloud-showers-heavy', label: 'Lluvia fuerte' },
  66: { icon: 'fa-cloud-showers-heavy', label: 'Lluvia helada ligera' },
  67: { icon: 'fa-cloud-showers-heavy', label: 'Lluvia helada fuerte' },
  71: { icon: 'fa-snowflake', label: 'Nieve ligera' },
  73: { icon: 'fa-snowflake', label: 'Nieve moderada' },
  75: { icon: 'fa-snowflake', label: 'Nieve fuerte' },
  77: { icon: 'fa-snowflake', label: 'Granos de nieve' },
  80: { icon: 'fa-cloud-showers-heavy', label: 'Chubascos ligeros' },
  81: { icon: 'fa-cloud-showers-heavy', label: 'Chubascos moderados' },
  82: { icon: 'fa-cloud-showers-heavy', label: 'Chubascos violentos' },
  85: { icon: 'fa-snowflake', label: 'Chubascos de nieve ligeros' },
  86: { icon: 'fa-snowflake', label: 'Chubascos de nieve fuertes' },
  95: { icon: 'fa-cloud-bolt', label: 'Tormenta eléctrica' },
  96: { icon: 'fa-cloud-bolt', label: 'Tormenta eléctrica leve' },
  99: { icon: 'fa-cloud-bolt', label: 'Tormenta eléctrica fuerte' },
};

const WeatherWidget: React.FC = () => {
  const [weatherData, setWeatherData] = useState<any>(null);
  const [locationName, setLocationName] = useState<string>('Buscando ubicación...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showHourly, setShowHourly] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDrop, setShowSearchDrop] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadWeather = async (lat: number, lon: number, name: string) => {
    setLoading(true);
    try {
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation_probability,weather_code&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`);
      const wData = await weatherRes.json();
      setLocationName(name);
      setWeatherData(wData);
      setErrorMsg(null);
    } catch (e) {
      setErrorMsg('Error al obtener datos del clima');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3) {
      setSearchResults([]);
      setShowSearchDrop(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=es&format=json`);
        const data = await res.json();
        setSearchResults(data.results || []);
        setShowSearchDrop(true);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectLocation = (loc: any) => {
    const name = `${loc.name}, ${loc.country}`;
    const lat = loc.latitude;
    const lon = loc.longitude;
    localStorage.setItem('manual_weather_location', JSON.stringify({ lat, lon, name }));
    setShowSearchDrop(false);
    setSearchQuery('');
    loadWeather(lat, lon, name);
  };

  useEffect(() => {
    const savedLoc = localStorage.getItem('manual_weather_location');
    if (savedLoc) {
      try {
        const { lat, lon, name } = JSON.parse(savedLoc);
        loadWeather(lat, lon, name);
        return;
      } catch(e) {}
    }

    if (!navigator.geolocation) {
      setErrorMsg('Geolocalización no soportada en este navegador');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        try {
          const locRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=es`);
          const locData = await locRes.json();
          const name = locData.locality || locData.city || locData.principalSubdivision || 'Desconocido';
          loadWeather(lat, lon, name);
        } catch (e) {
          setErrorMsg('Error al obtener nombre de ubicación');
          setLoading(false);
        }
      },
      (err) => {
        console.error(err);
        setErrorMsg('ESCRIBIR ubicación o buscar ciudad manualmente');
        setLoading(false);
      },
      { timeout: 10000 }
    );
  }, []);

  if (loading) {
    return (
      <div className="flex-1 max-w-2xl bg-white/5 backdrop-blur-md rounded-md p-4 border border-white/10 shadow-inner flex items-center justify-center min-h-[90px]">
        <div className="animate-pulse flex items-center gap-2 text-emerald-400">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <span className="text-[10px] font-bold tracking-widest uppercase">Obteniendo clima actual...</span>
        </div>
      </div>
    );
  }

  if (errorMsg || !weatherData) {
    return (
      <div className="flex-1 max-w-2xl bg-slate-900/40 backdrop-blur-md rounded-md p-4 border border-rose-500/20 shadow-inner flex flex-col justify-center min-h-[90px] relative z-[9999]">
        <div className="flex items-center justify-center gap-3 text-white mb-3">
          <i className="fa-solid fa-location-dot animate-bounce text-emerald-400 text-lg"></i>
          <span className="text-sm font-black uppercase tracking-widest drop-shadow-md">{errorMsg || "Ubicación no encontrada"}</span>
        </div>
        <div className="relative z-[9999]">
           <input 
             type="text" 
             placeholder="Buscar ciudad manualmente (ej. Asunción)..." 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full bg-black border border-white/10 rounded-md py-2.5 px-3 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition-colors relative z-[9999]"
           />
           {isSearching && <i className="fa-solid fa-spinner fa-spin absolute right-3 top-3 text-emerald-500 text-xs z-[9999]"></i>}
        </div>

        {showSearchDrop && searchResults.length > 0 && (
          <div className="absolute top-[100%] left-0 right-0 mt-2 bg-slate-800 border border-white/10 rounded-md shadow-2xl z-[9999] max-h-[180px] overflow-y-auto custom-scrollbar">
             {searchResults.map((loc) => (
               <button 
                 key={loc.id} 
                 onClick={() => handleSelectLocation(loc)}
                 className="w-full text-left px-3 py-2.5 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors border-b border-white/5 last:border-0"
               >
                 <span className="font-bold text-white">{loc.name}</span>
                 {loc.admin1 && <span className="text-[10px]">, {loc.admin1}</span>}
                 <span className="text-[10px] ml-1 opacity-70">({loc.country})</span>
               </button>
             ))}
          </div>
        )}
      </div>
    );
  }

  const current = weatherData?.current;
  const daily = weatherData?.daily;
  const hourly = weatherData?.hourly;

  // Guard defensivo: si el estado asíncrono aún no resolvió current, esperamos en silencio
  if (!current || current.weather_code === undefined) return null;

  const weatherStatus = WEATHER_CODE_MAP[current.weather_code as keyof typeof WEATHER_CODE_MAP] || { icon: 'fa-cloud', label: 'Desconocido' };

  const getBackgroundImage = (code: number) => {
    const isNight = currentTime.getHours() >= 19 || currentTime.getHours() < 6;
    const base = import.meta.env.BASE_URL || './';
    
    if (code === 0 || code === 1) {
      return isNight ? `${base}weather/night_clear.png` : `${base}weather/sunny.png`;
    }
    if ([2, 3, 45, 48].includes(code)) return `${base}weather/cloudy.png`;
    return `${base}weather/rainy.png`;
  };
  
  const getIconForTime = (icon: string, hours: number) => {
    const isNight = hours >= 19 || hours < 6;
    if (isNight) {
      if (icon === 'fa-sun') return 'fa-moon';
      if (icon === 'fa-cloud-sun') return 'fa-cloud-moon';
    }
    return icon;
  };
  
  const bgImage = getBackgroundImage(current.weather_code);
  const currentIcon = getIconForTime(weatherStatus.icon, currentTime.getHours());

  let startIndex = 0;
  if (hourly && hourly.time) {
     const nowTime = currentTime.getTime();
     startIndex = hourly.time.findIndex((t: string) => new Date(t).getTime() > nowTime) - 1;
     if (startIndex < 0) startIndex = 0;
  }

  const handleResetLocation = () => {
    localStorage.removeItem('manual_weather_location');
    setWeatherData(null);
    setSearchQuery('');
    setErrorMsg('Buscar nueva ubicación');
  };

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto xl:mx-0 flex flex-col relative group transition-all z-20">
      <div 
        className={`w-full p-3 border border-white/10 shadow-xl flex gap-4 overflow-hidden relative transition-all duration-300 ${showHourly ? 'rounded-t-md rounded-b-none border-b-0' : 'rounded-md'}`}
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Semi-transparent overlay for text readability on bright backgrounds */}
        <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors pointer-events-none z-0"></div>
      
      {/* TODAY WEATHER */}
      <div className="w-[240px] shrink-0 border-r border-white/20 pr-4 flex flex-col justify-center relative z-10 text-shadow-sm">
        <div className="flex items-center justify-between mb-1.5">
          <div 
            className="flex items-center gap-1.5 text-slate-300 cursor-pointer hover:text-white transition-colors group/loc"
            onClick={handleResetLocation}
            title="Haz clic para cambiar la ubicación"
          >
            <i className="fa-solid fa-location-dot text-[11px] text-emerald-400 group-hover/loc:scale-125 transition-transform"></i>
            <span className="text-[11px] font-bold uppercase tracking-widest truncate">{locationName}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-blue-400 uppercase tracking-widest drop-shadow-md" title="Probabilidad de Lluvia">
             <i className="fa-solid fa-droplet"></i>
             <span>{current.precipitation_probability || 0}%</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 py-0.5">
          <div className="w-14 h-14 rounded-md bg-white/10 flex items-center justify-center text-white text-3xl shadow-inner shrink-0">
            <i className={`fa-solid ${currentIcon}`}></i>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="text-5xl font-black text-white font-mono leading-none tracking-tighter drop-shadow-md">
              {Math.round(current.temperature_2m)}°
            </div>
            <div className="text-[11px] font-bold text-slate-200 uppercase tracking-widest leading-tight mt-1 text-center">
              {weatherStatus.label}
            </div>
          </div>
        </div>
      </div>

      {/* 5-DAY FORECAST */}
      <div className="flex-1 flex justify-between items-center relative z-10 px-2 overflow-x-auto custom-scrollbar">
        {[1, 2, 3, 4, 5].map((index) => {
          if (!daily || !daily.time || !daily.time[index]) return null;
          const dateStr = daily.time[index];
          const dateObj = new Date(dateStr + "T00:00:00");
          let dayName = new Intl.DateTimeFormat('es', { weekday: 'short' }).format(dateObj);
          dayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
          
          const code = daily.weather_code[index];
          const stat = WEATHER_CODE_MAP[code as keyof typeof WEATHER_CODE_MAP] || { icon: 'fa-cloud' };
          
          const maxTemp = Math.round(daily.temperature_2m_max[index]);
          const minTemp = Math.round(daily.temperature_2m_min[index]);
          const rain = daily.precipitation_probability_max[index];

          return (
            <div key={index} className="flex flex-col items-center justify-center gap-1.5 px-3 shrink-0">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest drop-shadow-sm">{dayName}</span>
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm text-white hover:scale-110 hover:bg-white/20 transition-all cursor-help" title={`${maxTemp}° / ${minTemp}° - Lluvia: ${rain}%`}>
                <i className={`fa-solid ${stat.icon} drop-shadow-md`}></i>
              </div>
              <div className="flex flex-col items-center gap-0 text-[10px] font-mono font-bold tracking-tighter leading-tight drop-shadow-sm">
                <span className="text-white">{maxTemp}°</span>
                <span className="text-slate-300">{minTemp}°</span>
              </div>
            </div>
          );
        })}
      </div>

      <button 
        onClick={() => setShowHourly(!showHourly)}
        className="absolute bottom-0 right-0 w-6 h-6 bg-black/30 hover:bg-black/50 rounded-tl-md flex items-center justify-center text-white/70 hover:text-white transition-colors z-20"
        title="Ver previsión por horas"
      >
         <i className={`fa-solid fa-chevron-${showHourly ? 'up' : 'down'} text-[10px]`}></i>
      </button>
    </div>

    {/* HOURLY FORECAST DRAWER */}
    {showHourly && hourly && (
      <div className="w-full bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-b-md p-3 overflow-x-auto custom-scrollbar flex gap-4 animate-fadeIn shadow-2xl relative z-10" style={{ marginTop: '-1px' }}>
        {hourly.time.slice(startIndex, startIndex + 24).map((timeStr: string, idx: number) => {
          const date = new Date(timeStr);
          const isNow = idx === 0;
          const hourLabel = isNow ? 'Ahora' : date.toLocaleTimeString('es', {hour: '2-digit', minute:'2-digit', hour12: false});
          
          const code = hourly.weather_code[startIndex + idx];
          const temp = Math.round(hourly.temperature_2m[startIndex + idx]);
          const stat = WEATHER_CODE_MAP[code as keyof typeof WEATHER_CODE_MAP] || { icon: 'fa-cloud' };
          const hourlyIcon = getIconForTime(stat.icon, date.getHours());

          return (
            <div key={idx} className={`flex flex-col items-center gap-2.5 min-w-[50px] shrink-0 ${isNow ? 'bg-white/10 rounded-md p-1.5 -m-1.5' : ''}`}>
              <span className={`text-[10px] font-bold tracking-widest uppercase ${isNow ? 'text-emerald-400' : 'text-slate-300'}`}>{hourLabel}</span>
              <i className={`fa-solid ${hourlyIcon} ${isNow ? 'text-white' : 'text-slate-300'} text-xl drop-shadow-md`}></i>
              <span className={`text-sm font-mono font-black tracking-tighter ${isNow ? 'text-white' : 'text-slate-200'}`}>{temp}°</span>
            </div>
          );
        })}
      </div>
    )}
  </div>
  );
};

export default WeatherWidget;
