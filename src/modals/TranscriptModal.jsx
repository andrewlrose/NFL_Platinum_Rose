import React, { useState, useEffect, useMemo } from 'react';
import { Mic, X, UserPlus, Trash2, FileText, User, PlayCircle } from 'lucide-react';

export default function TranscriptModal({ isOpen, onClose, onSaveAndStart, onAnalyzeStored, transcripts, onDelete, onClearAll, isProcessingAI, experts, onOpenExpertManager, onUpdateTranscript }) {
  const [text, setText] = useState("");
  const [src, setSrc] = useState(experts[0]?.source || "Unknown");
  
  useEffect(() => { if (isOpen) { setText(""); } }, [isOpen]);
  
  const groupedExperts = useMemo(() => {
    return experts.reduce((acc, exp) => {
      const group = exp.source || "Other";
      if (!acc[group]) acc[group] = [];
      acc[group].push(exp);
      return acc;
    }, {});
  }, [experts]);
  
  const uniqueSources = [...new Set(experts.map(e => e.source))].sort();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center shrink-0"><div className="flex gap-2 text-emerald-400"><Mic /><h3 className="font-bold">Audio & Transcript Manager</h3></div><button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button></div>
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center"><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Add New Transcript</label><button onClick={onOpenExpertManager} className="text-[10px] text-blue-400 hover:text-white flex items-center gap-1"><UserPlus size={12}/> Add New Source</button></div>
            <select value={src} onChange={e => setSrc(e.target.value)} className="w-full bg-gray-950 border border-gray-800 p-2 rounded text-white focus:border-emerald-500 outline-none">{uniqueSources.map(s => <option key={s} value={s}>{s}</option>)}</select>
            <textarea className="w-full h-32 bg-gray-950 border border-gray-800 p-4 rounded text-white focus:border-emerald-500 outline-none resize-none" value={text} onChange={e => setText(e.target.value)} placeholder="Paste transcript text here..." />
            <div className="flex justify-end gap-3"><button onClick={() => { onSaveAndStart(text, src); }} disabled={!text.trim() || isProcessingAI} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-white font-bold transition-colors flex items-center gap-2">Start Matchup Wizard</button></div>
          </div>
          <div className="h-px bg-gray-800 w-full mb-6"></div>
          <div>
            <div className="flex justify-between items-center mb-4"><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Saved Transcripts ({transcripts.length})</label>{transcripts.length > 0 && (<button onClick={onClearAll} className="text-[10px] bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 px-2 py-1 rounded flex items-center gap-1 transition-colors"><Trash2 size={12} /> Clear All</button>)}</div>
            {transcripts.length === 0 ? <div className="text-center p-6 border-2 border-dashed border-gray-800 rounded-lg text-gray-600 text-sm">No transcripts saved yet. Use Bulk Import or paste text above.</div> : <div className="space-y-3">{transcripts.map(t => (<div key={t.id} className="bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 p-3 rounded flex justify-between items-start group transition-colors"><div className="flex items-start gap-3 flex-1"><div className="bg-gray-700/50 p-2 rounded-full text-blue-400 mt-1"><FileText size={16} /></div><div className="min-w-0 flex-1"><div className="font-bold text-sm text-white truncate mb-0.5" title={t.source}>{t.source}</div><div className="text-[10px] text-gray-500 mb-2">{t.date} • {t.text ? t.text.length : 0} chars</div><div className="flex items-center gap-2"><span className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1"><User size={10}/> Default:</span><select value={t.defaultExpertId || ""} onChange={(e) => onUpdateTranscript(t.id, { defaultExpertId: parseInt(e.target.value) })} className="bg-gray-700 border border-gray-600 rounded text-xs text-white font-medium p-1 outline-none w-48 cursor-pointer hover:bg-gray-600 transition-colors"><option value="" className="bg-gray-800 text-gray-400">Auto-Detect (AI)</option>{Object.keys(groupedExperts).sort().map(groupName => (<optgroup key={groupName} label={groupName} className="bg-gray-900 text-gray-400 font-bold">{groupedExperts[groupName].sort((a, b) => { if (a.type === 'Show') return -1; if (b.type === 'Show') return 1; return a.name.localeCompare(b.name); }).map(ex => (<option key={ex.id} value={ex.id} className="bg-gray-800 text-white font-normal">{ex.type === 'Show' ? `📺 ${ex.name} (Show)` : ex.name}</option>))}</optgroup>))}</select></div></div></div><div className="flex gap-2 shrink-0 mt-1"><button onClick={() => onAnalyzeStored(t.text, t.source, t.defaultExpertId)} className="px-3 py-1.5 bg-emerald-900/30 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-800/50 rounded flex items-center gap-2 transition-all text-xs font-bold" title="Run Wizard"><PlayCircle size={14}/> Analyze</button><button onClick={() => onDelete(t.id)} className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-900/20 rounded-full transition-all" title="Delete"><Trash2 size={16} /></button></div></div>))}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}