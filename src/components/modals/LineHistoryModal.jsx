import React from 'react';
import { LineChart, X } from 'lucide-react';

function SimpleLineChart({ data, dataKey, color, label }) {
  if (!data || data.length === 0) return <div className="text-gray-500 text-xs text-center p-4">No Data</div>;
  
  const values = data.map(d => d[dataKey]);
  // Increased height and padding slightly to make room for text labels
  const width = 400; 
  const height = 100; 
  const padding = 20;
  
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => { 
      const x = padding + (i / (data.length - 1 || 1)) * (width - 2 * padding); 
      // Invert Y because SVG 0 is at the top
      const normalizedY = (d[dataKey] - minVal) / range; 
      const y = height - padding - (normalizedY * (height - 2 * padding)); 
      return `${x},${y}`; 
  }).join(" ");

  return (
    <div className="mb-6 last:mb-0">
        <div className="flex justify-between mb-2">
            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</h5>
            <div className="text-[10px] text-gray-500">
                Open: <span className="text-white font-mono">{values[0]}</span> 
                <span className="mx-1">→</span> 
                Now: <span className="text-white font-mono">{values[values.length-1]}</span>
            </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-2 border border-gray-700 relative flex items-center justify-center shadow-inner">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                {/* The Line */}
                <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
                
                {/* The Dots and Labels */}
                {data.map((d, i) => { 
                    const x = padding + (i / (data.length - 1 || 1)) * (width - 2 * padding); 
                    const normalizedY = (d[dataKey] - minVal) / range; 
                    const y = height - padding - (normalizedY * (height - 2 * padding)); 
                    const val = d[dataKey];
                    // Format value: add '+' for positive spreads if needed
                    const displayVal = (dataKey === 'spread' && val > 0) ? `+${val}` : val;

                    return (
                        <g key={i}>
                            <circle cx={x} cy={y} r="4" fill={color} className="stroke-gray-900 stroke-2" />
                            <text 
                                x={x} 
                                y={y - 12} 
                                textAnchor="middle" 
                                fill="white" 
                                fontSize="12" 
                                fontWeight="bold"
                                className="drop-shadow-md"
                            >
                                {displayVal}
                            </text>
                        </g>
                    ) 
                })}
            </svg>
        </div>
    </div>
  )
}

export default function LineMovementModal({ isOpen, onClose, game }) {
  if (!isOpen || !game) return null;
  
  let chartData = game.lineHistory || [];
  // Ensure we always have at least 2 points to draw a line. If only 1, duplicate it.
  if (chartData.length === 0) {
      chartData = [{ date: 'Now', spread: game.spread, total: game.total }];
  }
  if (chartData.length === 1) { 
      chartData = [ ...chartData, { date: 'Now', spread: game.spread, total: game.total } ]; 
  }
  
  return (
    <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg shadow-2xl">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900 rounded-t-xl">
                <div className="flex gap-2 items-center text-blue-400">
                    <LineChart size={20}/>
                    <h3 className="font-bold text-lg">Line History</h3>
                </div>
                <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                    <X size={20}/>
                </button>
            </div>
            
            <div className="p-6">
                <h4 className="text-white font-bold text-lg mb-6 text-center tracking-wide">
                    {game.visitor} <span className="text-gray-500 text-sm">@</span> {game.home}
                </h4>
                
                <SimpleLineChart data={chartData} dataKey="spread" color="#10b981" label="SPREAD" />
                <SimpleLineChart data={chartData} dataKey="total" color="#f59e0b" label="TOTAL" />
            </div>
        </div>
    </div>
  );
}