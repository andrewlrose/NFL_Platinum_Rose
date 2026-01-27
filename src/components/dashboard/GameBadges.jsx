import React from 'react';
import { 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  Scale, 
  Target, 
  Flag, 
  Trophy, 
  Activity, 
  Maximize2 
} from 'lucide-react';

/**
 * 1. CONTEST VALUE
 * Highlights CLV (Closing Line Value) against the fixed contest spread.
 */
export const ContestValue = ({ liveSpread, contestSpread, homeTeam, visitorTeam }) => {
  if (!contestSpread) return null;

  // Calculate Edge
  // Example: Contest: Chiefs -3.5 | Live: Chiefs -6.5 | Edge: 3.0 points (Good!)
  // We need to determine which side has the value.
  
  // Simple logic for now: Just show the difference
  const diff = Math.abs(liveSpread - contestSpread);
  if (diff < 1.5) return null; // Ignore small noise

  return (
    <div className="flex items-center gap-1 bg-amber-900/30 border border-amber-600/50 text-amber-500 text-[10px] font-bold px-2 py-0.5 rounded">
      <Trophy size={10} />
      <span>{diff.toFixed(1)}pt CLV Edge</span>
    </div>
  );
};

/**
 * 2. SHARP VS PUBLIC
 * Detects "Pros vs Joes" divergence using Money % vs Ticket %
 */
export const SharpPublicBadge = ({ splits }) => {
  if (!splits?.spread) return null;

  const { cash, tickets } = splits.spread;
  
  // Safety check
  if (cash === undefined || tickets === undefined) return null;

  const diff = cash - tickets;
  const threshold = 15; // 15% divergence triggers the badge

  // Scenario A: High Cash, Low Tickets (Sharps)
  if (diff >= threshold) {
    return (
      <div className="flex items-center gap-1 bg-emerald-950 border border-emerald-500/50 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded shadow-[0_0_10px_rgba(16,185,129,0.2)]">
        <TrendingUp size={12} />
        <span>SHARP ACTION</span>
      </div>
    );
  }

  // Scenario B: Low Cash, High Tickets (Public)
  if (diff <= -threshold) {
    return (
      <div className="flex items-center gap-1 bg-red-950 border border-red-500/50 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded">
        <Users size={12} />
        <span>PUBLIC HEAVY</span>
      </div>
    );
  }

  return null;
};

/**
 * 3. WONG TEASER FLAG
 * Detects if the game falls into the "Wong Teaser" Key Numbers (crosses 3 and 7).
 */
export const WongFlag = ({ game }) => {
  const spread = game.spread;
  const total = game.total;
  
  if (!spread || !total) return null;

  // Basic Wong Rules:
  // Favorite: -7.5 to -8.5 (Tease down to -1.5 / -2.5)
  // Underdog: +1.5 to +2.5 (Tease up to +7.5 / +8.5)
  // Total logic (optional but standard): Total should be low (<49) to increase value of points
  
  let isWong = false;
  let label = "";

  if (spread >= 1.5 && spread <= 2.5) {
    isWong = true;
    label = `${game.visitor} (+${spread} → +${spread + 6})`;
  } else if (spread >= -8.5 && spread <= -7.5) {
    isWong = true;
    label = `${game.visitor} (${spread} → ${spread + 6})`; // Teasing visitor? Wait, usually focus on fav/dog logic
  }
  
  // Logic correction: We look at the line itself regardless of team
  // Home Fav (-7.5 to -8.5) -> Tease Home
  // Home Dog (+1.5 to +2.5) -> Tease Home
  // Vis Fav ... etc.

  // Simplified Logic for Badge:
  // Just checking ranges
  const isFavRange = (spread <= -7.5 && spread >= -8.5) || (spread >= 7.5 && spread <= 8.5); // Favoring 3 & 7 crossing
  const isDogRange = (spread >= 1.5 && spread <= 2.5) || (spread <= -1.5 && spread >= -2.5);

  if (isFavRange || isDogRange) {
      return (
        <div className="flex items-center gap-1 bg-fuchsia-900/30 border border-fuchsia-500/50 text-fuchsia-400 text-[10px] font-bold px-2 py-0.5 rounded">
            <Maximize2 size={10} />
            <span>WONG TEASER</span>
        </div>
      );
  }

  return null;
};

/**
 * 4. INJURY ALERT
 * Simple badge if key players are out.
 */
export const InjuryBadge = ({ injuries }) => {
  if (!injuries || injuries.length === 0) return null;
  return (
    <div className="flex items-center gap-1 bg-red-900/20 border border-red-500/30 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded cursor-help" title={injuries.join(', ')}>
      <Activity size={10} />
      <span>{injuries.length} INJ</span>
    </div>
  );
};

/**
 * 5. PRO SPLITS (Detailed)
 * Shows a mini-bar for splits if available (alternative to the modal).
 */
export const ProSplits = ({ splits, home, visitor }) => {
    // This is a placeholder if you want inline splits
    return null; 
};

/**
 * 6. PLAYER PROPS LIST
 * Accordion item for props
 */
export const PlayerPropsList = ({ props }) => {
    if (!props || props.length === 0) return null;
    return (
        <div className="mt-2 border-t border-gray-800 pt-2">
            <div className="text-[10px] font-bold text-gray-500 mb-1 uppercase">Key Player Props</div>
            <div className="space-y-1">
                {props.map((prop, i) => (
                    <div key={i} className="flex justify-between text-xs text-slate-300">
                        <span>{prop.name}</span>
                        <span className="font-mono text-emerald-400">{prop.line}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

/**
 * 7. CONFLICTING SIGNAL (Math vs Man)
 * Alerts when the AI Sim differs significantly from the Vegas Line.
 */
export const ConflictingSignal = ({ game, simData }) => {
    if (!simData || !game.spread) return null;

    const vegas = game.spread;
    const ai = simData.trueLine; // e.g. -7.5
    
    // Calculate difference
    const diff = Math.abs(ai - vegas);
    
    // Threshold: 3 points of value
    if (diff >= 3.0) {
        return (
            <div className="flex items-center gap-1 bg-blue-900/30 border border-blue-500/50 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded animate-pulse">
                <Target size={10} />
                <span>AI VALUE {diff.toFixed(1)}pts</span>
            </div>
        );
    }
    return null;
};