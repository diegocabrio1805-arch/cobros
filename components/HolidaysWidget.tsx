import React, { useState, useEffect } from 'react';

interface HolidaysWidgetProps {
  countryCode: string;
}

interface Holiday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

const HolidaysWidget: React.FC<HolidaysWidgetProps> = ({ countryCode }) => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHolidays = async () => {
      setLoading(true);
      try {
        const year = new Date().getFullYear();
        const currentMonth = new Date().getMonth(); // 0-indexed

        // Fetch public holidays for the given year and country code
        const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
        if (!res.ok) throw new Error('Error fetching holidays');
        const data: Holiday[] = await res.json();

        // Filter only holidays that belong to the current month
        const thisMonthHolidays = data.filter(h => {
          const hDate = new Date(h.date + "T00:00:00");
          return hDate.getMonth() === currentMonth;
        });

        // Sort them by date
        thisMonthHolidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setHolidays(thisMonthHolidays);
      } catch (error) {
        console.error("Failed to load holidays", error);
      } finally {
        setLoading(false);
      }
    };

    if (countryCode) {
      fetchHolidays();
    }
  }, [countryCode]);

  if (loading) {
    return (
      <div className="bg-white px-3 py-2 rounded-md flex items-center justify-center gap-2 border border-slate-200 shadow-sm">
        <i className="fa-solid fa-spinner fa-spin text-[10px] text-emerald-500"></i>
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Buscando feriados...</span>
      </div>
    );
  }

  if (holidays.length === 0) {
    return (
      <div className="bg-white px-3 py-2 rounded-md flex items-center justify-center border border-slate-200 shadow-sm">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center">
          Sin feriados este mes
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-md border border-slate-200 shadow-sm flex flex-col max-h-[120px] overflow-y-auto custom-scrollbar overflow-hidden">
      <div className="bg-slate-800 text-white px-3 py-1.5 text-[9px] font-black uppercase tracking-widest flex items-center sticky top-0 z-10">
        <i className="fa-solid fa-flag mr-1.5 text-rose-500"></i> Feriados del Mes ({countryCode})
      </div>
      <div className="flex flex-col gap-1.5 p-3 pt-2">
      {holidays.map((h, i) => {
        const d = new Date(h.date + "T00:00:00");
        const isPast = d.getTime() < new Date().setHours(0, 0, 0, 0);
        const isToday = d.getTime() === new Date().setHours(0, 0, 0, 0);

        const dayName = new Intl.DateTimeFormat('es', { weekday: 'short' }).format(d);
        const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);

        return (
          <div key={i} className={`flex items-center justify-between gap-2 text-[10px] opacity-100 ${isToday ? 'bg-rose-50 px-1 rounded-sm' : ''}`}>
            <span className={`font-mono font-black shrink-0 ${isToday ? 'text-rose-600' : 'text-black'}`}>
              {capitalizedDay} {d.getDate().toString().padStart(2, '0')}
            </span>
            <span className={`font-black truncate text-right ${isToday ? 'text-rose-700' : 'text-black'}`} title={h.localName}>
              {h.localName}
            </span>
          </div>
        );
      })}
      </div>
    </div>
  );
};

export default HolidaysWidget;
