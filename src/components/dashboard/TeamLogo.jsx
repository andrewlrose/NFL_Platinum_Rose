import React from 'react';

// Official ESPN Logo URLs
const LOGO_URLS = {
  "Cardinals": "https://a.espncdn.com/i/teamlogos/nfl/500/ari.png",
  "Falcons": "https://a.espncdn.com/i/teamlogos/nfl/500/atl.png",
  "Ravens": "https://a.espncdn.com/i/teamlogos/nfl/500/bal.png",
  "Bills": "https://a.espncdn.com/i/teamlogos/nfl/500/buf.png",
  "Panthers": "https://a.espncdn.com/i/teamlogos/nfl/500/car.png",
  "Bears": "https://a.espncdn.com/i/teamlogos/nfl/500/chi.png",
  "Bengals": "https://a.espncdn.com/i/teamlogos/nfl/500/cin.png",
  "Browns": "https://a.espncdn.com/i/teamlogos/nfl/500/cle.png",
  "Cowboys": "https://a.espncdn.com/i/teamlogos/nfl/500/dal.png",
  "Broncos": "https://a.espncdn.com/i/teamlogos/nfl/500/den.png",
  "Lions": "https://a.espncdn.com/i/teamlogos/nfl/500/det.png",
  "Packers": "https://a.espncdn.com/i/teamlogos/nfl/500/gb.png",
  "Texans": "https://a.espncdn.com/i/teamlogos/nfl/500/hou.png",
  "Colts": "https://a.espncdn.com/i/teamlogos/nfl/500/ind.png",
  "Jaguars": "https://a.espncdn.com/i/teamlogos/nfl/500/jax.png",
  "Chiefs": "https://a.espncdn.com/i/teamlogos/nfl/500/kc.png",
  "Raiders": "https://a.espncdn.com/i/teamlogos/nfl/500/lv.png",
  "Chargers": "https://a.espncdn.com/i/teamlogos/nfl/500/lac.png",
  "Rams": "https://a.espncdn.com/i/teamlogos/nfl/500/lar.png",
  "Dolphins": "https://a.espncdn.com/i/teamlogos/nfl/500/mia.png",
  "Vikings": "https://a.espncdn.com/i/teamlogos/nfl/500/min.png",
  "Patriots": "https://a.espncdn.com/i/teamlogos/nfl/500/ne.png",
  "Saints": "https://a.espncdn.com/i/teamlogos/nfl/500/no.png",
  "Giants": "https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png",
  "Jets": "https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png",
  "Eagles": "https://a.espncdn.com/i/teamlogos/nfl/500/phi.png",
  "Steelers": "https://a.espncdn.com/i/teamlogos/nfl/500/pit.png",
  "49ers": "https://a.espncdn.com/i/teamlogos/nfl/500/sf.png",
  "Seahawks": "https://a.espncdn.com/i/teamlogos/nfl/500/sea.png",
  "Buccaneers": "https://a.espncdn.com/i/teamlogos/nfl/500/tb.png",
  "Titans": "https://a.espncdn.com/i/teamlogos/nfl/500/ten.png",
  "Commanders": "https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png"
};

const TeamLogo = ({ team, size = "md" }) => {
  // Size classes
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-12 h-12"
  };
  const currentSize = sizeClasses[size] || sizeClasses.md;

  // 1. Try to get the real logo
  const logoUrl = LOGO_URLS[team];

  if (logoUrl) {
    return (
      <img 
        src={logoUrl} 
        alt={team} 
        className={`${currentSize} object-contain drop-shadow-md`}
      />
    );
  }

  // 2. Fallback to Letters if name doesn't match
  return (
    <div className={`${currentSize} rounded-full bg-slate-700 flex items-center justify-center text-white font-bold border border-white/10`}>
      {team ? team.substring(0, 1).toUpperCase() : "?"}
    </div>
  );
};

export default TeamLogo;