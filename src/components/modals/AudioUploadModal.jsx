import React, { useState, useEffect } from 'react';
import { X, Mic, Users, Key, Zap, RefreshCw, CheckCircle, Trash2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { INITIAL_EXPERTS } from '../../lib/constants'; 

export default function AudioUploadModal({ isOpen, onClose, onAnalyze, experts = [] }) {
  const [text, setText] = useState('');
  
  // Check for Global Key (Sponsor Mode)
  const GLOBAL_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';
  const hasGlobalKey = GLOBAL_KEY.startsWith('sk-');

  // Check for User Key (Local Storage)
  const [userKey, setUserKey] = useState(localStorage.getItem('PR_OPENAI_KEY') || '');
  
  const activeKey = hasGlobalKey ? GLOBAL_KEY : userKey;

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null); // 🔥 NEW: Error State
  const [isNewSource, setIsNewSource] = useState(false); 
  const [selectedSource, setSelectedSource] = useState(""); 
  const [newSourceName, setNewSourceName] = useState('');

  const expertList = experts.length > 0 ? experts : INITIAL_EXPERTS;
  const uniqueShows = Array.from(new Set(expertList.map(e => e.source))).sort();

  useEffect(() => {
      if (isOpen) {
          setText('');
          setErrorMsg(null);
          const stored = localStorage.getItem('PR_OPENAI_KEY');
          if (stored) setUserKey(stored);
      }
  }, [isOpen]);

  const handleSaveUserKey = (val) => {
      setUserKey(val);
      if (val.startsWith('sk-')) localStorage.setItem('PR_OPENAI_KEY', val);
  };

  const handleClearUserKey = () => {
      setUserKey('');
      localStorage.removeItem('PR_OPENAI_KEY');
  };

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setErrorMsg(null); // Clear previous errors

    if (isNewSource && !newSourceName.trim()) { alert("Enter a show name."); return; }
    if (!isNewSource && !selectedSource) { alert("Select a show."); return; }
    if (!activeKey) { alert("No API Key found."); return; }

    setIsProcessing(true);
    
    const sourceData = {
        name: isNewSource ? newSourceName : selectedSource,
        isNew: isNewSource,
        apiKey: activeKey
    };

    try {
        // 🔥 SAFE EXECUTION
        await onAnalyze(text, sourceData);
    } catch (err) {
        console.error("Modal Caught Error:", err);
        setErrorMsg("Analysis failed. Check console for details.");
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
           <div className="flex items-center gap-3">
             <div className={`p-2 rounded-lg border ${hasGlobalKey ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}`}>
                {hasGlobalKey ? <ShieldCheck size={24} /> : <Mic size={24} />}
             </div>
             <div>
                <h3 className="font-bold text-white text-lg">AI Transcript Analyzer</h3>
                <p className="text-xs text-slate-400">
                    {hasGlobalKey ? "Platinum Pro Access Enabled" : "Client-Side Processing"}
                </p>
             </div>
           </div>
           <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors"><X size={20}/></button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar bg-slate-900">
           
           {/* ERROR MESSAGE */}
           {errorMsg && (
               <div className="bg-rose-500/10 border border-rose-500/50 p-3 rounded-lg flex items-center gap-2 text-rose-400 text-sm font-bold">
                   <AlertTriangle size={16} /> {errorMsg}
               </div>
           )}

           {/* API KEY SECTION */}
           <div className={`border p-4 rounded-xl transition-colors ${activeKey ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-slate-950 border-slate-700'}`}>
               {hasGlobalKey ? (
                   <div className="flex items-center gap-3">
                       <div className="bg-emerald-500/20 p-2 rounded-full text-emerald-400"><ShieldCheck size={18} /></div>
                       <div><div className="text-sm font-bold text-white">Platinum Access Active</div><div className="text-xs text-emerald-400">System is ready.</div></div>
                   </div>
               ) : (
                   <>
                       <div className="flex justify-between items-center mb-2">
                            <label className="text-[10px] font-bold uppercase flex items-center gap-2 text-slate-400 tracking-wider">
                                <Key size={12} className={userKey ? "text-emerald-400" : "text-slate-500"} /> 
                                {userKey ? <span className="text-emerald-400">User Key Saved</span> : "OpenAI API Key Required"}
                            </label>
                            {userKey && <button onClick={handleClearUserKey} className="text-[10px] text-slate-500 hover:text-rose-400 flex items-center gap-1"><Trash2 size={10} /> Clear</button>}
                       </div>
                       {userKey ? (
                           <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono bg-emerald-900/10 p-2 rounded border border-emerald-500/10"><CheckCircle size={14} /> Key loaded from browser.</div>
                       ) : (
                           <input type="password" placeholder="sk-..." className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2 text-sm focus:border-indigo-500 outline-none font-mono" value={userKey} onChange={(e) => handleSaveUserKey(e.target.value)} />
                       )}
                   </>
               )}
           </div>

           {/* SOURCE SELECTOR */}
           <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl">
              <label className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-2 mb-3 tracking-wider"><Users size={12} /> Select Source / Expert</label>
              <div className="flex gap-2 mb-4 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  <button onClick={() => setIsNewSource(false)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${!isNewSource ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>Existing Show</button>
                  <button onClick={() => setIsNewSource(true)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${isNewSource ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>+ Create New</button>
              </div>
              {isNewSource ? (
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-3 text-sm focus:border-indigo-500 outline-none" placeholder="e.g. 'The Daily Wager'" value={newSourceName} onChange={(e) => setNewSourceName(e.target.value)} />
              ) : (
                  <select className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-3 text-sm focus:border-indigo-500 outline-none appearance-none" value={selectedSource} onChange={(e) => setSelectedSource(e.target.value)}>
                      <option value="">-- Choose a Source --</option>
                      {uniqueShows.map((s, i) => <option key={i} value={s}>{s}</option>)}
                  </select>
              )}
           </div>

           {/* TRANSCRIPT INPUT */}
           <div className="flex-1 min-h-[200px] relative flex flex-col">
               <label className="text-[10px] font-bold uppercase text-slate-500 mb-2 tracking-wider">Paste Transcript</label>
               <textarea className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 focus:border-indigo-500 outline-none resize-none leading-relaxed" placeholder='Paste raw text here...' value={text} onChange={(e) => setText(e.target.value)} />
           </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 flex justify-end gap-3 bg-slate-950">
           <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white text-sm font-bold">Cancel</button>
           <button 
                onClick={handleAnalyze} 
                disabled={!text || isProcessing || !activeKey}
                className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg ${isProcessing ? 'bg-indigo-600 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed'}`}
            >
              {isProcessing ? <><RefreshCw size={18} className="animate-spin" /> Analyzing...</> : <><Zap size={18} fill="currentColor" /> Extract Picks</>}
           </button>
        </div>
      </div>
    </div>
  );
}