import React from 'react';
import { CloudRain, CloudSnow, Wind, Sun, Shield } from 'lucide-react';

const WeatherBadge = ({ weather }) => {
  // 1. Safety Check: If no weather data, return nothing or a placeholder
  if (!weather) return null;

  // 2. Handle Dome Games (Simple & Clean)
  if (weather.summary === 'DOME') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-800 border border-slate-700">
        <Shield size={12} className="text-emerald-400" />
        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">Indoors</span>
      </div>
    );
  }

  // 3. Icon Logic for Outdoor Games
  const getIcon = () => {
    const s = weather.summary?.toLowerCase() || '';
    if (s.includes('rain')) return <CloudRain size={12} className="text-blue-400" />;
    if (s.includes('snow')) return <CloudSnow size={12} className="text-white" />;
    if (s.includes('wind')) return <Wind size={12} className="text-gray-400" />;
    return <Sun size={12} className="text-yellow-400" />;
  };

  // 4. Outdoor Badge (Temp + Wind + Icon)
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-slate-800 border border-slate-700 shadow-sm">
      {getIcon()}
      <div className="flex gap-2 text-[10px] font-medium text-slate-300">
        <span>{weather.temp || 'TBD'}</span>
        {/* Only show wind if it exists and isn't 0 mph */}
        {weather.wind && weather.wind !== '0 mph' && (
          <span className="text-slate-500 pl-2 border-l border-slate-600">{weather.wind}</span>
        )}
      </div>
    </div>
  );
};

export default WeatherBadge;