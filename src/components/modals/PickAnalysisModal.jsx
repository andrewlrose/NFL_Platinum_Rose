import React from 'react';
import { BrainCircuit, X } from 'lucide-react';

export default function PickAnalysisModal({ pick, expertName, onClose }) {
  if(!pick) return null;
  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"><div className="bg-gray-900 border border-emerald-500/30 rounded-xl w-full max-w-md"><div className="p-4 border-b border-gray-800 flex justify-between bg-emerald-900/10"><div className="flex gap-2 text-emerald-400"><BrainCircuit/><h3 className="font-bold">Deep Dive</h3></div><button onClick={onClose}><X/></button></div><div className="p-6 space-y-4"><div className="text-sm text-gray-400">Analysis for {expertName}:</div>{pick.summary && pick.summary.length > 0 && (<div className="mb-3"><ul className="list-disc pl-4 space-y-2">{pick.summary.map((s, i) => (<li key={i} className="text-sm text-white font-medium">{s}</li>))}</ul></div>)}<div className="bg-gray-800/50 p-3 rounded italic text-gray-300 text-xs">{pick.analysis}</div></div></div></div>
  );
}