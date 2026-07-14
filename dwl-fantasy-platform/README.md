# DWL Fantasy League Platform

## Full-stack fantasy cricket management system for the Delulu Women’s League

This repository contains a complete fantasy-cricket workflow for the Delulu Women’s League (DWL). The application fetches match scorecards from ESPNcricinfo, maps ESPN player names to DWL roster players, calculates fantasy points using WWC-style rules, stores match history, generates a standings Excel workbook, and exposes the data through a React frontend and a FastAPI backend.

The system is implemented across three Python modules and one React app:
- Backend fetcher and scoring engine: backend/wwc_fantasy.py
- Backend pipeline and Excel generation: backend/dwl_scoring_pipeline.py
- Backend API and admin logic: backend/api_server.py
- Frontend: frontend/src

---

## 1. What the application does

The platform automates the following workflow:

1. Load DWL league configuration from a single Excel file.
2. Fetch a live or archived match scorecard from ESPNcricinfo using Playwright.
3. Extract batting, bowling, fielding, and super-over statistics.
4. Match ESPN player names to DWL roster names using a normalization and fuzzy-style matching strategy.
5. Apply fantasy scoring rules, captain and vice-captain multipliers, and player-of-the-match bonuses.
6. Store match results in local JSON or Supabase.
7. Generate a professional Excel workbook with:
   - one sheet per DWL team,
   - a standings sheet,
   - per-match point columns,
   - team totals and player totals.
8. Expose the data to a React dashboard through a FastAPI API.

---

## 2. Core architecture

```text
React frontend (Vite)  ->  FastAPI backend  ->  ESPNcricinfo scraper
        |                             |                 |
        |                             |                 +--> match data + player stats
        |                             |
        |                             +--> local JSON or Supabase storage
        |
        +--> Excel download / standings workbook
```

### Backend modules

- backend/wwc_fantasy.py
  - Uses Playwright WebKit to fetch ESPN match pages.
  - Extracts the page’s __NEXT_DATA__ payload.
  - Builds team mappings, home/away teams, player-of-match information, and player stat objects.
  - Calculates fantasy points using WWC-style rules.
  - Supports super-over handling.

- backend/dwl_scoring_pipeline.py
  - Reads the DWL Excel config.
  - Maps ESPN players to DWL roster players.
  - Processes a fetched scorecard into a DWL match entry.
  - Saves match history and award data locally or to Supabase.
  - Generates the Excel workbook that powers the standings and team sheets.

- backend/api_server.py
  - Runs a FastAPI application.
  - Serves team, player, match, standings, award, and download endpoints.
  - Implements password verification and lockout protection.
  - Loads the Excel config on startup and serves it to the frontend.

### Frontend modules

- frontend/src/App.jsx
  - Main application shell.
  - Loads backend health and data on startup.
  - Routes between dashboard, standings, teams, players, matches, stats, settings, and about pages.

- frontend/src/services/api.js
  - Central API client for backend requests.
  - Handles health checks, team/player/match downloads, Excel download, admin password flows, and award application.

- frontend/src/services/statsService.js
  - Aggregates tournament stats such as most runs, most wickets, highest strike rate, and best economy.

---

## 3. Runtime flow

### A. Startup
When the backend starts, it:
- loads environment variables from a local .env file,
- reads backend/WWC_Config.xlsx if present,
- builds team and player lookup data,
- loads match history from local JSON or Supabase,
- exposes the app over localhost:8000.

### B. Match ingestion
When a match is fetched:
- the ESPN page is loaded through Playwright,
- the __NEXT_DATA__ JSON is parsed,
- batting, bowling, fielding, and super-over data are collected,
- player names are matched to DWL roster names,
- fantasy points are calculated,
- the result is stored in the match history,
- the Excel workbook is regenerated.

### C. Frontend usage
The React app:
- calls the FastAPI endpoints to load teams, players, matches, standings, and awards,
- displays the current leaderboard and detailed match breakdowns,
- allows the admin to fetch a new match and change the admin password.

---

## 4. Required environment variables

Create a .env file in the project root with values similar to:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-or-service-role-key
ADMIN_PASSWORD=SimplePass123
MAX_FAILED_ATTEMPTS=3
LOCKOUT_DURATION_MINUTES=5
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
STORAGE_MODE=local
API_HOST=127.0.0.1
API_PORT=8000
```

### Notes
- If STORAGE_MODE=local, data is stored in JSON files in the project directory.
- If STORAGE_MODE=production, the backend uses Supabase tables named matches and awards, plus Supabase storage for the Excel workbook.
- The admin password is also stored in memory and can be updated through the API and the Settings UI.

---

## 5. Excel configuration format

The application expects a single Excel file named WWC_Config.xlsx in the backend directory or project root.

### Required sheets

#### Sheet: DWLTeams
Columns:
- Abbrv
- Team Name

Example:
| Abbrv | Team Name |
|---|---|
| GD | Gully Divas |
| JR | Janaki Royals |
| KQ | Konkan Queens |
| RR | Rajputana Ranis |
| SS | Sarafa Strikers |
| SGS | Singara Singapengal |
| VW | Vanitha Warriors |

#### Sheet: Players
Columns:
- Player Name
- Role
- DWL Team
- Country
- Sold Price

Example:
| Player Name | Role | DWL Team | Country | Sold Price |
|---|---|---|---|---|
| Beth Mooney | Wicketkeeper | Gully Divas | Australia | 8.5 |
| Smriti Mandhana | Batter | Janaki Royals | India | 9.0 |

Supported role values are lowercased and used as-is for display, including wicketkeeper, batter, bowler, and all-rounder.

#### Team sheets
Each DWL team abbreviation must have a sheet with the same name as the abbreviation, for example GD, JR, KQ, RR, SS, SGS, VW.

The pipeline reads the 4th column in these sheets and interprets values such as:
- Captain
- Vice-Captain

The values are translated into multipliers:
- Captain = 2.0x
- Vice-Captain = 1.5x
- Everyone else = 1.0x

---

## 6. Fantasy scoring rules implemented

The scoring engine in backend/wwc_fantasy.py implements the WWC-style points system used in this project.

### Batting points
- Run: +1 each
- Four: +1 each
- Six: +2 each
- Fifty (50-99): +25
- Century (100-149): +50
- 150+: +75
- Duck (out for 0): -15
- Golden duck (1 ball): -25
- Diamond duck (0 balls): -35

### Strike-rate bonuses
The code applies a strike-rate bonus if the batter faces at least 3 balls.
- 150-174.99: +5
- 175-199.99: +10
- 200-224.99: +15
- 225-249.99: +20
- 250-274.99: +25
- 275-299.99: +30
- 300-324.99: +35
- 325-349.99: +40
- 350-599.99: +45
- 600+: +50

A penalty of -15 is applied when the strike rate is below 100 and the batter has scored runs or remained not out.

### Bowling points
- Wicket: +40 each
- 3-wicket haul: +25
- 4-wicket haul: +35
- 5-wicket haul: +50
- 6+ wickets: +75
- Hat-trick: +45
- Maiden over: +20

### Economy-rate bonuses and penalties
The code evaluates economy after converting overs into decimal form and requiring at least 6 balls (1.0 overs).
- 0.00-3.99: +50
- 4.00-4.99: +35
- 5.00-5.99: +25
- 6.00-6.99: +15
- 7.00-7.99: +10
- 12.00-13.99: -10
- 14.00-15.99: -15
- 16.00-19.99: -20
- 20.00+: -25

### Fielding points
- Catch: +30
- Run out: +30
- Stumping: +30

### Bonus
- Player of the Match: +50

### Captain and vice-captain multipliers
- Captain: 2.0x
- Vice-Captain: 1.5x
- Regular player: 1.0x

### Super Over handling
The app supports super-over data and calculates separate super-over batting, bowling, and fielding points. Super-over wicket-haul bonuses are not applied, but multi-over economy calculations are still handled. Super-over points are stored separately and included in the final total when relevant.

---

## 7. Player matching logic

The pipeline does not rely on a single exact-name match. Instead, it uses several strategies in backend/dwl_scoring_pipeline.py:

1. Direct match on normalized full name.
2. Match on short name or ESPN shorthand variants.
3. Match on fielding name (last name) when it is unique for a country.
4. Match by substring containment when a full-name and roster-name overlap.

If a match cannot be resolved confidently, the player is listed as unmatched.

---

## 8. Data structures and persistence

### Match history
Each saved match is stored as:
```json
{
  "match_num": 1,
  "match_entry": {
    "Beth Mooney": {
      "pts": 145,
      "regular_pts": 145,
      "regular_batting_pts": 70,
      "regular_bowling_pts": 0,
      "regular_fielding_pts": 0,
      "super_over_pts": 0,
      "so_batting_pts": 0,
      "so_bowling_pts": 0,
      "so_fielding_pts": 0,
      "final_pts": 290,
      "is_motm": true,
      "dwl_team": "Gully Divas",
      "country": "AUS-W",
      "_stats": { ... }
    }
  },
  "team1_country": "IND-W",
  "team2_country": "PAK-W",
  "match_winner": "IND-W",
  "match_title": "M1: India Women vs Pakistan Women"
}
```

### Award data
Award data is stored as a structure containing:
- award winners (player-level bonus points),
- team-level award icon arrays.

The Excel workbook can include award bonuses and visual indicators after awards are applied.

### Local storage
The backend writes:
- backend/wwc_match_data.json for match history
- backend/wwc_award_data.json for award data
- backend/DWL_Scores.xlsx for the generated workbook
- backend/espn_match_info for raw saved ESPN payloads
- backend/espn_names_match for extracted ESPN names

---

## 9. Backend API reference

Base URL:
```text
http://localhost:8000
```

### Public endpoints
- GET / : API metadata and route summary
- GET /api/health : backend health status
- GET /api/teams : all DWL teams with rosters and point totals
- GET /api/players : all players with points, team, role, country, and captain/VC marker
- GET /api/matches : all processed matches with team totals by match
- GET /api/match-details/{match_num} : full per-player details for one match
- GET /api/standings : sorted standings data
- GET /api/download-excel : download the Excel workbook
- GET /api/espn-match-info/{match_num} : fetch saved ESPN match payload
- GET /api/password-status : current admin lockout state
- GET /api/admin-config : number of allowed failed attempts and lockout duration
- GET /api/storage-mode : storage mode info

### Admin endpoints
- POST /api/verify-password : verifies the admin password and tracks failed attempts
- POST /api/change-password : changes the admin password and updates the .env file if present
- POST /api/fetch-match : fetches a match, processes scorecard data, saves it, and regenerates the Excel workbook
- POST /api/apply-awards : applies award bonuses and updates the Excel workbook
- GET /api/awards : loads award data
- GET /api/team-awards : loads team award icons for the standings table

### Example request
```bash
curl -X POST http://localhost:8000/api/fetch-match \
  -H "Content-Type: application/json" \
  -d '{"match_id":1527674,"match_num":1}'
```

---

## 10. Frontend experience

The frontend is a single-page React application with animated transitions and multiple views.

### Main views
- Dashboard: overview of the league and top performers.
- Teams: rosters with captain/VC badges and points.
- Players: list of players with team, role, points, sold price, and status.
- Matches: browse processed matches, open detail modals, and add new matches through the admin workflow.
- Standings: points table with team logos, recent form, and award icons.
- Stats: league-level leaders for runs, wickets, strike rate, and economy.
- Settings: password change and admin controls.
- About: team-owner and league information.

### Admin workflow in the UI
1. Open the Matches view.
2. Enter the admin password.
3. Submit a match ID and a DWL match number.
4. The backend fetches the match, calculates points, stores it, and regenerates the Excel report.
5. The application updates the standings and match data reactively.

### Security behavior in the frontend
The Matches page implements a front-end lockout state for repeated failed password attempts. The lockout duration and maximum attempts are loaded from the backend and mirrored to local storage as a fallback.

---

## 11. Excel workbook output

The Excel file generated by the pipeline contains:
- one sheet per DWL team,
- a Standings sheet,
- a column for each processed match,
- player totals and overall team totals,
- optional award bonus and award icon columns.

### Team sheet layout
Each team sheet contains:
- team title and abbreviation,
- legend for captain / vice-captain / player-of-the-match,
- player roster rows,
- match-by-match score columns,
- a final team total.

### Standings sheet layout
The standings sheet shows:
- position,
- team name and abbreviation,
- total points,
- per-match totals,
- optional award icons.

---

## 12. Running the application

### Backend
From the project root:
```bash
cd backend
python api_server.py
```

The server runs on:
```text
http://127.0.0.1:8000
```

### Frontend
From the frontend folder:
```bash
cd frontend
npm install
npm run dev
```

The frontend runs on:
```text
http://localhost:5173 | http://localhost:3000
```

### CLI mode
You can also run the scoring pipeline without the web app:
```bash
cd backend
python wwc_fantasy.py -m 1527674
python dwl_scoring_pipeline.py -m 1527674 -n 1
python dwl_scoring_pipeline.py
```

---

## 13. Project structure

```text
dwl-fantasy-platform/
├── backend/
│   ├── api_server.py
│   ├── dwl_scoring_pipeline.py
│   ├── wwc_fantasy.py
│   ├── requirements.txt
│   ├── setup_backend.sh
│   ├── WWC_Config.xlsx
│   ├── wwc_match_data.json
│   ├── wwc_award_data.json
│   ├── DWL_Scores.xlsx
│   ├── espn_match_info/
│   └── espn_names_match/
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── public/
│   └── src/
│       ├── App.jsx
│       ├── components/
│       ├── data/
│       ├── services/
│       └── styles/
├── README.md
├── Script Usage Instructions.png
├── start.bat
├── start.py
└── start.sh
```

---

## 14. Troubleshooting

### Common issues
- Playwright error: install browsers with `playwright install webkit`.
- Config file missing: ensure WWC_Config.xlsx is present.
- Backend cannot connect: verify the FastAPI server is running and CORS origins are allowed.
- Excel download fails: verify the workbook exists and the backend has permissions to read it.
- Password lockout: wait for the lockout window to expire or change the password through the environment and restart the server.

### Useful debugging commands
```bash
cd backend
python api_server.py
python wwc_fantasy.py -m 1527674 --debug
python dwl_scoring_pipeline.py -m 1527674 -n 1 --debug
```

---

## 15. Summary

This application is a complete fantasy-cricket management system for the Delulu Women’s League. It combines:
- an ESPN scorecard fetcher,
- a fantasy scoring engine,
- a DWL-specific matching and pipeline layer,
- a FastAPI backend with admin controls,
- a React dashboard with standings and player analytics,
- and an Excel export workflow.

The codebase is built around the idea that every match can be fetched, processed, stored, and displayed in a consistent way while preserving captain/vice-captain multipliers, super-over details, award bonuses, and detailed player-level stats.

---

## 📞 Support

### Resources
- **API Documentation**: `http://localhost:8000/docs` (FastAPI Swagger UI)
- **Supabase Dashboard**: Your project's database dashboard
- **Render Dashboard**: Your project's frontend and backend services dashboard
- **ESPNcricinfo**: Match IDs and schedules

### Contact
For issues, questions, or feature requests:
1. Check troubleshooting section
2. Enable debug mode for logs
3. Contact development team with error messages
 
#### Email: delululeagues@gmail.com

---

## 📄 License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

---

## 🙏 Acknowledgments

- **ESPNcricinfo** for providing match data
- **Supabase** for cloud database services
- **All DWL Team Owners** for their support
- **Open Source Community** for the amazing tools

---

**Built with ❤️ for the Delulu Women's League**