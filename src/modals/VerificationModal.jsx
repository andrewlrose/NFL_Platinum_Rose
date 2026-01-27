// File: src/components/modals/VerificationModal.jsx
import React, { useState, useEffect } from 'react';
import { Check, X, AlertTriangle, Save, User, Filter } from 'lucide-react';

export default function VerificationModal({ isOpen, onClose, onConfirm, previewData, experts, defaultExpertName }) {
  const [editedPicks, setEditedPicks] = useState([]);

  useEffect(() => {
    if (isOpen && previewData && previewData.picks) {
        let defaultId = 99; 
        if (defaultExpertName) {
            const exactMatch = experts.find(e => e.name.toLowerCase() === defaultExpertName.toLowerCase());
            if (exactMatch) defaultId = exactMatch.id;
            else {
                const sourceMatch = experts.find(e => e.source.toLowerCase() === defaultExpertName.toLowerCase());
                if (sourceMatch) defaultId = sourceMatch.id;
            }
        }

        const initialized = previewData.picks.map(pick => {
            let assignedId = defaultId;
            const rawName = (pick.expert || "").toLowerCase();
            const selectionRaw = (pick.selection || "").toLowerCase();
            const analysisRaw = (pick.analysis || "").toLowerCase();
            const marketRaw = (pick.market || "").toLowerCase();

            const nameMatch = experts.find(e => e.name.toLowerCase() === rawName || rawName.includes(e.name.toLowerCase()));
            if (nameMatch) assignedId = nameMatch.id;

            if (!nameMatch) {
                if (rawName.includes("stucky")) { const m = experts.find(e => e.name.toLowerCase().includes("stuckey")); if(m) assignedId = m.id; }
                if (rawName.includes("bessic") || rawName.includes("bezic") || rawName.includes("fezzik")) { const m = experts.find(e => e.name.toLowerCase().includes("fezzick")); if(m) assignedId = m.id; }
                if (rawName.includes("rayburn")) { const m = experts.find(e => e.name.toLowerCase().includes("raybon")); if(m) assignedId = m.id; }
            }

            let pickType = pick.type || 'Standard';
            const teaserKeywords = ['teaser', '6 point', '7 point', 'wong', 'pleaser'];
            const isTeaser = teaserKeywords.some(k => selectionRaw.includes(k) || analysisRaw.includes(k) || marketRaw.includes(k));
            if (isTeaser) pickType = 'Teaser';

            return { ...pick, assignedExpertId: assignedId, type: pickType, units: pick.units || 1 };
        });
        setEditedPicks(initialized);
    }
  }, [isOpen, previewData, experts, defaultExpertName]);

  const getShowExperts = () => {
      if (!defaultExpertName) return experts;
      const showSpecific = experts.filter(e => e.name.toLowerCase() === defaultExpertName.toLowerCase() || e.source.toLowerCase() === defaultExpertName.toLowerCase());
      return showSpecific.length > 0 ? showSpecific : experts;
  };
  const availableExperts = getShowExperts();

  if (!isOpen) return null;
  const handleUpdate = (index, field, value) => { const updated = [...editedPicks]; updated[index] = { ...updated[index], [field]: value }; setEditedPicks(updated); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-xl">
            <div><h2 className="text-xl font-bold text-white flex items-center gap-2"><Check className="text-emerald-400" /> Verify Picks: <span className="text-emerald-400">{defaultExpertName}</span></h2><p className="text-slate-400 text-sm mt-1">Dropdown is confined to <span className="text-white font-bold">{availableExperts.length}</span> specific hosts/experts for this show.</p></div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6"><table className="w-full text-left border-collapse"><thead><tr className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800"><th className="pb-3 pl-2">Expert / Host</th><th className="pb-3">Selection</th><th className="pb-3 w-24">Line</th><th className="pb-3 w-28">Type</th><th className="pb-3 w-16">Units</th><th className="pb-3">Analysis</th><th className="pb-3 text-right pr-2">Action</th></tr></thead><tbody className="text-sm divide-y divide-slate-800/50">{editedPicks.map((pick, idx) => (<tr key={idx} className="group hover:bg-slate-800/30 transition-colors"><td className="py-3 pl-2 w-56"><div className="relative"><User size={14} className="absolute left-2 top-2.5 text-slate-500" /><select value={pick.assignedExpertId} onChange={(e) => handleUpdate(idx, 'assignedExpertId', parseInt(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded pl-8 pr-2 py-1.5 text-xs text-slate-200 focus:border-emerald-500 outline-none appearance-none font-medium">{availableExperts.map(exp => (<option key={exp.id} value={exp.id}>{exp.name}</option>))}</select><Filter size={10} className="absolute right-2 top-3 text-emerald-500/50 pointer-events-none" /></div></td><td className="py-3 font-bold text-white px-2"><input type="text" value={pick.selection} onChange={(e) => handleUpdate(idx, 'selection', e.target.value)} className="bg-transparent border-b border-transparent focus:border-emerald-500 outline-none w-full" /></td><td className="py-3 font-mono text-emerald-400 px-2"><input type="text" value={pick.line} onChange={(e) => handleUpdate(idx, 'line', e.target.value)} className="bg-transparent border-b border-transparent focus:border-emerald-500 outline-none w-full" /></td><td className="py-3 px-2"><select value={pick.type || 'Standard'} onChange={(e) => handleUpdate(idx, 'type', e.target.value)} className={`border-none rounded text-xs py-1 px-2 w-full font-bold ${pick.type === 'Teaser' ? 'bg-purple-900 text-purple-200' : 'bg-slate-800 text-slate-300'}`}><option value="Standard">Standard</option><option value="Best Bet">Best Bet</option><option value="Lean">Lean</option><option value="Teaser">Teaser</option><option value="Parlay">Parlay</option></select></td><td className="py-3 px-2"><input type="number" value={pick.units} onChange={(e) => handleUpdate(idx, 'units', e.target.value)} className="bg-slate-800 border-none rounded text-xs text-center text-slate-300 py-1 w-full" /></td><td className="py-3 text-slate-400 text-xs italic max-w-xs truncate px-2" title={pick.analysis}>{pick.analysis || "No analysis detected."}</td><td className="py-3 text-right pr-2"><button onClick={() => { const newPicks = editedPicks.filter((_, i) => i !== idx); setEditedPicks(newPicks); }} className="text-rose-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16} /></button></td></tr>))}</tbody></table>{editedPicks.length === 0 && <div className="text-center py-10 text-slate-500 flex flex-col items-center"><AlertTriangle size={32} className="mb-2 opacity-50" /><p>No picks found to import.</p></div>}</div>
        <div className="p-6 border-t border-slate-800 bg-slate-950 rounded-b-xl flex justify-end gap-3"><button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white font-bold transition-colors">Cancel</button><button onClick={() => onConfirm(editedPicks)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all hover:scale-105"><Save size={18} /> Confirm Import</button></div>
      </div>
    </div>
  );
}