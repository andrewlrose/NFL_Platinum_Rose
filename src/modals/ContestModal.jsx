// File: src/components/modals/ContestModal.jsx
import React, { useState } from 'react';
import { X, Trophy, Save, AlertCircle } from 'lucide-react';

// 1. MAP CODES TO YOUR APP'S TEAM NAMES
const TEAM_MAP = {
    "ARI": "Cardinals", "ATL": "Falcons", "BAL": "Ravens", "BUF": "Bills", 
    "CAR": "Panthers", "CHI": "Bears", "CIN": "Bengals", "CLE": "Browns", 
    "DAL": "Cowboys", "DEN": "Broncos", "DET": "Lions", "GB": "Packers", 
    "HOU": "Texans", "IND": "Colts", "JAX": "Jaguars", "KC": "Chiefs", 
    "LAC": "Chargers", "LAR": "Rams", "LV": "Raiders", "MIA": "Dolphins", 
    "MIN": "Vikings", "NE": "Patriots", "NO": "Saints", "NYG": "Giants", 
    "NYJ": "Jets", "PHI": "Eagles", "PIT": "Steelers", "SEA": "Seahawks", 
    "SF": "49ers", "TB": "Buccaneers", "TEN": "Titans", "WAS": "Commanders"
};

export default function ContestModal({ isOpen, onClose, contestLines, liveGames, onUpdateLines }) {
  const [inputText, setInputText] = useState('');

  if (!isOpen) return null;

  const handleParse = () => {
      // 2. UPDATED PARSER (Handled Tabs & Spaces)
      // ([A-Z]{2,3})    -> Team A
      // (?:\+\+)?       -> Optional "++"
      // \s* -> Allow any spaces/tabs (FIX)
      // ([-+]?[\d\.]+)  -> Spread
      // \s* -> Allow any spaces/tabs (FIX)
      // ([A-Z]{2,3})    -> Team B
      const regex = /([A-Z]{2,3})(?:\+\+)?\s*([-+]?[\d\.]+)\s*([A-Z]{2,3})(?:\+\+)?/g;
      
      const newLines = [];
      let match;

      // Clean input: Remove headers and time/date noise
      // We also verify we don't accidentally delete the tabs before regex sees them
      const cleanInput = inputText.replace(/Favorite.*Line.*Underdog.*Kickoff/g, '').replace(/[A-Za-z]{3}\s\d{1,2}:\d{2}\s[ap]m/g, ' ');

      while ((match = regex.exec(cleanInput)) !== null) {
          const teamCode = match[1]; // e.g. "BUF"
          const spreadVal = parseFloat(match[2]); // e.g. -10
          
          // Debug check to see if we are catching them
          console.log(`Found: ${teamCode} ${spreadVal}`);

          const fullTeamName = TEAM_MAP[teamCode];
          
          if (fullTeamName) {
              newLines.push({
                  id: Date.now() + Math.random(),
                  team: fullTeamName,
                  spread: spreadVal,
                  source: "Super Contest"
              });
          }
      }

      if (newLines.length > 0) {
          onUpdateLines(newLines);
          alert(`✅ Successfully parsed ${newLines.length} contest lines!`);
          onClose();
      } else {
          alert("⚠️ Could not find any valid lines. Please check the format.");
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl p-6 shadow-2xl">
        
        <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Trophy className="text-amber-500" /> Contest Lines
                </h2>
                <p className="text-slate-400 text-sm">Paste raw lines to compare against live odds.</p>
            </div>
            <button onClick={onClose}><X className="text-slate-400 hover:text-white" /></button>
        </div>

        <div className="space-y-4">
            <textarea 
                className="w-full h-48 bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs font-mono text-slate-300 focus:outline-none focus:border-amber-500 transition-colors whitespace-pre"
                placeholder={`Paste raw text here... Example:
BUF     -10     CLE
DAL++   -2.5    LAC
SEA++   -1      LAR`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
            />

            <div className="bg-amber-900/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-3">
                <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                <div className="text-xs text-amber-200/80">
                    <strong>Tip:</strong> Supports both "Mashed" (BUF-10CLE) and "Tabbed" (BUF -10 CLE) formats.
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
                <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white text-sm font-bold">Cancel</button>
                <button 
                    onClick={handleParse}
                    className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-amber-900/20"
                >
                    <Save size={18} /> Process Lines
                </button>
            </div>
        </div>

        {/* PREVIEW EXISTING LINES */}
        {contestLines.length > 0 && (
            <div className="mt-6 border-t border-slate-800 pt-4">
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Active Contest Lines</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto pr-2">
                    {contestLines.map(line => (
                        <div key={line.id} className="flex justify-between items-center bg-slate-800/50 px-3 py-1.5 rounded border border-slate-700 text-xs">
                            <span className="text-slate-200 font-medium">{line.team}</span>
                            <span className="text-amber-400 font-bold">{line.spread > 0 ? `+${line.spread}` : line.spread}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>
    </div>
  );
}