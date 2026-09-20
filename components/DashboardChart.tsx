import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '../utils/helpers';
import { AppSettings } from '../types';

const Custom3DBar = (props: any) => {
  const { fill, x, y, width, height } = props;
  const depth = 20; // Mayor profundidad para parecer fajo de billetes

  if (!height || height <= 0) return null;

  const cx = x + width / 2 + depth / 2;
  const cy = y - depth / 2;
  const patternId = `stack-${fill.replace('#', '')}`;

  return (
    <g>
      <defs>
        <pattern id={`${patternId}-front`} width="10" height="6" patternUnits="userSpaceOnUse">
          <rect width="10" height="6" fill={fill} />
          <line x1="0" y1="0" x2="10" y2="0" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
        </pattern>
        <pattern id={`${patternId}-side`} width="10" height="6" patternUnits="userSpaceOnUse">
          <rect width="10" height="6" fill={fill} />
          <rect width="10" height="6" fill="black" fillOpacity="0.2" />
          <line x1="0" y1="0" x2="10" y2="0" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
        </pattern>
      </defs>

      {/* Cara Frontal (Líneas de billetes apilados) */}
      <rect x={x} y={y} width={width} height={height} fill={`url(#${patternId}-front)`} stroke="rgba(0,0,0,0.4)" strokeWidth={1} />
      
      {/* Cara Lateral Derecha */}
      <polygon 
        points={`${x + width},${y} ${x + width + depth},${y - depth} ${x + width + depth},${y + height - depth} ${x + width},${y + height}`} 
        fill={`url(#${patternId}-side)`} 
        stroke="rgba(0,0,0,0.4)" 
        strokeWidth={1}
        strokeLinejoin="round"
      />
      
      {/* Cara Superior (Billete Principal) */}
      <g>
        <polygon 
          points={`${x},${y} ${x + depth},${y - depth} ${x + width + depth},${y - depth} ${x + width},${y}`} 
          fill={fill}
          stroke="rgba(0,0,0,0.4)" 
          strokeWidth={1}
          strokeLinejoin="round"
        />
        <polygon 
          points={`${x},${y} ${x + depth},${y - depth} ${x + width + depth},${y - depth} ${x + width},${y}`} 
          fill="white"
          fillOpacity={0.15}
        />
        {/* Marco interno del billete */}
        <polygon 
          points={`${x + 3},${y - 2} ${x + depth - 2},${y - depth + 3} ${x + width + depth - 5},${y - depth + 3} ${x + width - 3},${y - 2}`} 
          fill="transparent"
          stroke="rgba(0,0,0,0.1)"
          strokeWidth={0.5}
        />
      </g>
    </g>
  );
};

interface DashboardChartProps {
  data: any[];
  settings: AppSettings;
  t: any;
}

const DashboardChart: React.FC<DashboardChartProps> = ({ data, settings, t }) => {
  return (
    <ResponsiveContainer width="100%" height={250} minWidth={0}>
      <BarChart data={data} margin={{ top: 30, right: 30, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#f8fafc', fontWeight: 700 }}
          dy={10}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 9, fill: '#e2e8f0', fontWeight: 600 }}
          tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
        />
        <Tooltip
          cursor={{ fill: '#1e293b', opacity: 0.6 }}
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-slate-800 p-3 rounded-xl shadow-xl border border-slate-700">
                  <p className="text-slate-300 font-bold text-[10px] uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-emerald-400 font-mono font-black text-sm">
                    {formatCurrency(payload[0].value, settings)}
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="value" name={t.charts?.value || 'Value'} shape={<Custom3DBar />} barSize={45}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default DashboardChart;
