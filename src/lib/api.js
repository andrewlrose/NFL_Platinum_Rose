// src/lib/api.js

let ODDS_API_KEY = "";
let OPENAI_API_KEY = "";

try {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    ODDS_API_KEY = import.meta.env.VITE_ODDS_API_KEY;
    OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  }
} catch (e) {}

if ((!ODDS_API_KEY || !OPENAI_API_KEY) && typeof process !== 'undefined' && process.env) {
  if(!ODDS_API_KEY) ODDS_API_KEY = process.env.REACT_APP_ODDS_API_KEY;
  if(!OPENAI_API_KEY) OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
}

if (!ODDS_API_KEY) { ODDS_API_KEY = "522b1a7404d734b29f5f9785250be2a7"; }

export { ODDS_API_KEY, OPENAI_API_KEY };

export const fetchAIAnalysis = async (game, transcript, apiKey, expertList, defaultExpertId) => {
    const favorite = game.spread < 0 ? game.home : game.visitor; 
    const underdog = game.spread < 0 ? game.visitor : game.home; 
    const spreadLine = Math.abs(game.spread); 
    const truncatedText = transcript.substring(0, 100000); 
    
    // --- SMART PARSER LOGIC ---
    // We check who the expert is to tailor the prompt instructions.
    let specialInstructions = "";
    
    // TULEY-SPECIFIC LOGIC
    // Tuley mixes "Best Bets" (Straight) with "Teaser Portfolio" (Teasers).
    // We must force the AI to distinguish between them based on his specific keywords.
    if (transcript.toLowerCase().includes("tuley") || (expertList.find(e => e.id === defaultExpertId)?.name.includes("Tuley"))) {
        specialInstructions = `
        CRITICAL RULES FOR DAVE TULEY:
        1. "TEASER" DETECTION: Only mark 'isTeaser: true' if he explicitly uses phrases like "Teaser Portfolio", "Wong Teaser", "Teaser Zone", "Crossing 3 and 7", or "6-point teaser".
        2. "STRAIGHT BET" DETECTION: If he says "Best Bet", "ATS Pick", "Pool Play", or "Take the points" WITHOUT mentioning a teaser, classify as 'type: Spread' and 'isTeaser: false'.
        3. "LEANS": If he says "Pool Play" but not "Best Bet", mark 'pickType: Lean'.
        `;
    }

    const prompt = `
    You are a Professional Sports Betting Analyst. 
    YOUR MISSION: Extract betting picks and insights EXCLUSIVELY for the game: ${game.visitor} vs ${game.home}. 
    
    INPUT CONTEXT: 
    - Favorite: ${favorite} (-${spreadLine}) 
    - Underdog: ${underdog} (+${spreadLine}) 
    
    ${specialInstructions}

    CLASSIFICATION RULES: 
    1. "Best Bet": Explicitly called "Best Bet", "Lock", "Favorite play", or >1 Unit size. 
    2. "Standard": A normal official play. 
    3. "Lean": "Small play", "Pizza bet", or "Opinion only". 
    
    EXTRACTION REQUIREMENTS: 
    - FILTER: Ignore any discussion about other games. 
    - RATIONALE: In 'summary', capture the specific "Why". 
    - QUOTES: The 'analysis' field must be a VERBATIM quote from the text. 
    
    Structure: [{ 
        "expertName": "Speaker Name", 
        "selection": "Team/Over/Under/Player", 
        "type": "Spread/Total/Moneyline/injury/Prop", 
        "line": "e.g. +3.5", 
        "summary": ["Rationale point 1"], 
        "analysis": "Direct Verbatim Quote", 
        "pickType": "Best Bet/Standard/Lean", 
        "isTeaser": boolean, 
        "isParlay": boolean 
    }] 
    
    Transcript Segment: "${truncatedText}"`;
    
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", { 
            method: "POST", 
            headers: { 
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${apiKey}` 
            }, 
            body: JSON.stringify({ 
                model: "gpt-4o-mini", 
                messages: [{ role: "user", content: prompt }], 
                temperature: 0.1 
            }) 
        });
        
        const data = await response.json();
        if(data.choices) {
            let raw = data.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();
            const results = JSON.parse(raw);
            const allowedTerms = [ 
                game.visitor.toLowerCase(), 
                game.home.toLowerCase(), 
                game.visitor.split(' ').pop().toLowerCase(), 
                game.home.split(' ').pop().toLowerCase(), 
                game.visitor.split(' ')[0].toLowerCase(), 
                game.home.split(' ')[0].toLowerCase(), 
                "over", 
                "under" 
            ];
            
            return results.filter(r => { 
                if (!r.selection || !r.analysis) return false; 
                const sel = r.selection.toLowerCase(); 
                if (r.type.toLowerCase().includes('spread') || r.type.toLowerCase().includes('moneyline')) { 
                    return allowedTerms.some(term => sel.includes(term)); 
                } 
                return true; 
            }).map(p => ({ 
                ...p, 
                gameId: game.id, 
                expertId: expertList.find(e => e.name.toLowerCase().includes(p.expertName.toLowerCase().split(" ")[0]))?.id || defaultExpertId || 0 
            }));
        }
    } catch (e) { console.error("AI Fetch Error", e); }
    return [];
};