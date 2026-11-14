# Delulu Leagues

Delulu Leagues is a monorepo for full-stack fantasy cricket league applications. Each application is organized around a particular league season or tournament, with its own roster and tournament data, scoring configuration, match history, and user experience.

The platform is designed to support domestic and international cricket across both the men's and women's game. Tournament-specific apps can automate scorecard collection, player matching, fantasy scoring, standings, awards, and league reporting. The applications currently in this repository are the two DWL women's league seasons listed below.

## Applications in this repository

| Application | Fantasy league season | Cricket tournament |
| --- | --- | --- |
| [`dwl-fantasy-platform/`](./dwl-fantasy-platform/) | Delulu Women's League Season 1 | Women's T20 World Cup 2026 |
| [`dwl-season-2/`](./dwl-season-2/) | Delulu Women's League Season 2 | Women's Premier League 2027 |

Each folder is a standalone application with its own backend, frontend, configuration, launcher scripts, and application-specific README. Run an app from its own directory; there is no shared root-level runtime or dependency installation.

## What the applications do

The DWL apps provide a full workflow for running a fantasy cricket competition:

- **Collect match data:** retrieve live or archived ESPNcricinfo scorecards with Playwright.
- **Process player performances:** extract batting, bowling, fielding, and super-over statistics.
- **Match players to league rosters:** resolve scorecard names against configured fantasy players, with unresolved names surfaced for review.
- **Calculate fantasy points:** apply tournament scoring rules, captain and vice-captain multipliers, and player-of-the-match bonuses.
- **Persist match and award data:** use local JSON files by default, with Supabase support available in the applications.
- **Refresh league reports:** generate an Excel workbook containing standings, team sheets, player totals, and match-by-match points.
- **Explore results in a dashboard:** view standings, teams, players, matches, statistics, and awards in a React web application.
- **Manage league operations:** use the admin interface to fetch matches, apply awards, download reports, and manage the admin password.

The exact rules, roster, tournament schedule, and stored data are application-specific. Refer to an app's README and backend configuration before using it for a season.

## Technology

- **Frontend:** React 18, Vite, Axios, Chart.js, Recharts, and Framer Motion
- **Backend:** Python, FastAPI, and Uvicorn
- **Match ingestion:** Playwright and ESPNcricinfo scorecard data
- **League configuration and exports:** Excel workbooks processed with pandas and openpyxl
- **Persistence:** local JSON files or optional Supabase integration

## Repository layout

```text
.
├── dwl-fantasy-platform/       # DWL Season 1 app
│   ├── backend/                # API, scorecard processing, scoring, and data
│   ├── frontend/               # React dashboard
│   ├── start.py                # Cross-platform launcher
│   ├── start.sh                # macOS/Linux launcher
│   └── README.md               # Season 1 setup and application details
└── dwl-season-2/               # DWL Season 2 app
    ├── backend/
    ├── frontend/
    ├── start.py
    ├── start.sh
    └── README.md               # Season 2 setup and application details
```

## Run an application

### Requirements

- Python 3
- Node.js and npm
- Internet access for fetching scorecards and installing Playwright's WebKit browser
- Optional: a Supabase project when using remote storage

### Quick start

Choose one application and run its launcher from that app's directory:

```bash
cd dwl-fantasy-platform
python3 start.py
```

On macOS or Linux, the shell launcher is also available:

```bash
cd dwl-fantasy-platform
./start.sh
```

To run Season 2 instead, use `dwl-season-2` in place of `dwl-fantasy-platform`. The launchers prepare the app's Python environment and frontend dependencies, start the backend and Vite development server, and report the local URLs. On Windows, use `start.bat` or `python start.py`.

The launchers use the default local ports: frontend `http://localhost:3000`, backend `http://localhost:8000`, and FastAPI documentation `http://localhost:8000/docs`. Run one application at a time unless you configure different ports; the two apps use the same defaults.

### Manual setup

From the selected application directory, install and start the backend and frontend in separate terminals:

```bash
# Terminal 1: backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
playwright install webkit
python api_server.py
```

```bash
# Terminal 2: frontend
cd frontend
npm install
npm run dev
```

On Windows, activate the virtual environment with `venv\Scripts\activate` instead of `source venv/bin/activate`. The frontend's Vite configuration proxies `/api` requests to the local backend.

## Configuration and data

Each app has its own tournament configuration workbook and match data under its `backend/` directory. Do not copy one season's roster, scorecards, or generated results into another app unless you intend to use that data there.

For local development, the apps use local JSON storage. Supabase-backed storage and admin settings may require environment variables; consult the selected app's README for its exact configuration. Keep credentials in a local, untracked `.env` file, never commit real passwords or API keys, and avoid using production credentials for local testing.

The backend can generate or update application data files and the Excel standings workbook as matches are processed. Treat those files as season-specific data.

## Tournament expansion

The monorepo structure keeps each league season's configuration and data isolated while allowing the collection of applications to cover different domestic and international tournaments, including men's and women's competitions. When adding an application, give it a dedicated directory with its own backend, frontend, tournament configuration, launcher, and README; do not assume scoring rules or rosters are interchangeable between tournaments.

## More information

- [DWL Season 1 application guide](./dwl-fantasy-platform/README.md)
- [DWL Season 2 application guide](./dwl-season-2/README.md)
