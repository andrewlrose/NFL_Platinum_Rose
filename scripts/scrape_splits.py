import requests
import pandas as pd
import json
import re
from io import StringIO
from datetime import datetime

# --- CONFIGURATION ---
URL = "https://data.vsin.com/nfl/betting-splits/"

# ROBUST MAPPING (Keep this, it's working perfectly!)
FULL_MAP = {
    "WAS": 1, "WASHINGTON": 1, "COMMANDERS": 1,
    "DAL": 1, "DALLAS": 1, "COWBOYS": 1,
    "MIN": 2, "MINNESOTA": 2, "VIKINGS": 2,
    "DET": 2, "DETROIT": 2, "LIONS": 2,
    "KC": 3, "KANSAS": 3, "CHIEFS": 3,
    "DEN": 3, "DENVER": 3, "BRONCOS": 3,
    "LAC": 4, "CHARGERS": 4,
    "HOU": 4, "HOUSTON": 4, "TEXANS": 4,
    "GB": 5, "GREEN": 5, "PACKERS": 5,
    "BAL": 5, "BALTIMORE": 5, "RAVENS": 5,
    "CAR": 6, "CAROLINA": 6, "PANTHERS": 6,
    "SEA": 6, "SEATTLE": 6, "SEAHAWKS": 6,
    "CIN": 7, "CINCINNATI": 7, "BENGALS": 7,
    "ARI": 7, "ARIZONA": 7, "CARDINALS": 7,
    "CLE": 8, "CLEVELAND": 8, "BROWNS": 8,
    "PIT": 8, "PITTSBURGH": 8, "STEELERS": 8,
    "IND": 9, "INDIANAPOLIS": 9, "COLTS": 9,
    "JAX": 9, "JACKSONVILLE": 9, "JAGUARS": 9,
    "MIA": 10, "MIAMI": 10, "DOLPHINS": 10,
    "TB": 10, "TAMPA": 10, "BUCCANEERS": 10,
    "NYJ": 11, "JETS": 11,
    "NE": 11, "ENGLAND": 11, "PATRIOTS": 11,
    "TEN": 12, "TENNESSEE": 12, "TITANS": 12,
    "NO": 12, "ORLEANS": 12, "SAINTS": 12,
    "LV": 13, "VEGAS": 13, "RAIDERS": 13,
    "NYG": 13, "GIANTS": 13,
    "BUF": 14, "BUFFALO": 14, "BILLS": 14,
    "PHI": 14, "PHILADELPHIA": 14, "EAGLES": 14,
    "SF": 15, "FRANCISCO": 15, "49ERS": 15,
    "CHI": 15, "CHICAGO": 15, "BEARS": 15,
    "ATL": 16, "ATLANTA": 16, "FALCONS": 16,
    "LAR": 16, "RAMS": 16
}

def clean_pct(val):
    """
    Parses messy strings like '60%40%Win' or '93%7%-'
    Returns the FIRST number found (Visitor %).
    """
    if not val: return 50
    try:
        val_str = str(val).strip()
        # Regex to find the first sequence of digits followed by a %
        match = re.search(r"(\d+)%", val_str)
        if match:
            return int(match.group(1))
        return 50
    except:
        return 50

def scrape_real_data():
    print(f"🚀 FINAL MODE: Scraping {URL}...")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
    
    try:
        response = requests.get(URL, headers=headers)
        response.raise_for_status()
        
        # FIX: Use StringIO to avoid FutureWarning
        tables = pd.read_html(StringIO(response.text))
        
        if not tables:
            print("❌ No tables found.")
            return {}
            
        print(f"✅ Found {len(tables)} tables.")
        df = tables[0]
        
        processed_data = {}
        
        for index, row in df.iterrows():
            try:
                row_str = str(row.values).upper()
                
                found_id = None
                for keyword, g_id in FULL_MAP.items():
                    if keyword in row_str:
                        found_id = g_id
                        break
                
                if not found_id:
                    continue
                
                if found_id in processed_data:
                    continue

                # VSiN Column Mapping (Based on your X-Ray logs)
                # 2: Spread Handle, 3: Spread Bets
                # 5: Total Handle,  6: Total Bets
                # 8: ML Handle,     9: ML Bets
                
                # FIX: Use .iloc to avoid FutureWarning
                def get_val(idx):
                    if idx < len(row): return clean_pct(row.iloc[idx])
                    return 50

                splits_entry = {
                    "ats": {
                        "visitorTicket": get_val(3), "homeTicket": 100 - get_val(3),
                        "visitorMoney": get_val(2),  "homeMoney": 100 - get_val(2)
                    },
                    "total": {
                        "overTicket": get_val(6), "underTicket": 100 - get_val(6),
                        "overMoney": get_val(5),  "underMoney": 100 - get_val(5)
                    },
                    "ml": {
                        "visitorTicket": get_val(9), "homeTicket": 100 - get_val(9),
                        "visitorMoney": get_val(8), "homeMoney": 100 - get_val(8)
                    }
                }
                
                processed_data[found_id] = {
                    "id": found_id,
                    "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "splits": splits_entry
                }
                print(f"🔹 Parsed Game {found_id}: ATS Tickets {splits_entry['ats']['visitorTicket']}%")
                
            except Exception as e:
                print(f"⚠️ Row Error: {e}")
                continue

        print(f"💾 Scraped {len(processed_data)} games.")
        return processed_data

    except Exception as e:
        print(f"❌ CRITICAL ERROR: {e}")
        return {}

def save_json(data):
    file_path = 'betting_splits.json'
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)

if __name__ == "__main__":
    real_data = scrape_real_data()
    if real_data:
        save_json(real_data)