import React, { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

export function Badge({ children, className }) {
    return <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${className}`}>{children}</span>;
}

export function Toast({ message, onClose }) { 
    useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]); 
    return <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 z-50"><CheckCircle2 size={18}/><span>{message}</span></div>; 
}

export function ProgressBar({ leftLabel, rightLabel, leftPercent, rightPercent, leftColor="bg-green-500", rightColor="bg-gray-600" }) {
    return (
      <div className="w-full">
          <div className="flex justify-between text-xs mb-1 font-medium text-gray-400"><span>{leftLabel} {leftPercent}%</span><span>{rightLabel} {rightPercent}%</span></div>
          <div className="flex w-full h-2 bg-gray-700 rounded-full overflow-hidden"><div className={`h-full ${leftColor}`} style={{width:`${leftPercent}%`}}/><div className={`h-full ${rightColor}`} style={{width:`${rightPercent}%`}}/></div>
      </div>
    );
}