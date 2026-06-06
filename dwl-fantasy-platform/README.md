# DWL Fantasy League Platform

## 🏏 Delulu Women's League - Complete Fantasy Cricket Management System

A full-stack fantasy cricket league management platform for the Women's T20 World Cup, featuring live score fetching from ESPNcricinfo, automatic fantasy points calculation, captain/vice-captain multipliers, and an interactive React dashboard.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation Guide](#installation-guide)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Configuration](#configuration)
  - [Excel Configuration File](#excel-configuration-file)
  - [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
  - [One-Click Start (Recommended)](#one-click-start-recommended)
  - [Manual Start](#manual-start)
- [Usage Guide](#usage-guide)
  - [Uploading Configuration](#uploading-configuration)
  - [Fetching Matches](#fetching-matches)
  - [Viewing Standings](#viewing-standings)
  - [Managing Teams](#managing-teams)
  - [Player Directory](#player-directory)
  - [Match Details](#match-details)
- [Fantasy Points Scoring System](#fantasy-points-scoring-system)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

The DWL Fantasy League Platform is a comprehensive solution for running fantasy cricket leagues based on women's international cricket. It automatically fetches live match data from ESPNcricinfo, calculates fantasy points based on real player performances, and provides an interactive dashboard for league management.

### How It Works

1. **Configuration**: Upload an Excel file with team rosters, player roles, and captain/VC assignments
2. **Match Fetching**: Enter an ESPNcricinfo match ID to automatically fetch scorecards
3. **Points Calculation**: System calculates fantasy points using predefined scoring rules
4. **Live Dashboard**: View standings, team performance, and player stats in real-time

---

## Features

### Backend Features
- 🔄 **Automatic Match Fetching** - Pulls live scorecards from ESPNcricinfo
- 📊 **Fantasy Points Calculation** - Comprehensive scoring system with bonuses and penalties
- 👑 **Captain/VC Multipliers** - 2x for captain, 1.5x for vice-captain
- 🏏 **Super Over Support** - Handles one-over eliminators separately
- 📁 **Excel Configuration** - Easy team and player management via Excel
- 💾 **Persistent Storage** - Supabase-based match history storage
- 🎯 **Smart Player Matching** - Uses ESPN's longName and fieldingName fields
- 🔐 **Admin Password Protection** - Secure access for adding matches
- 📈 **Tournament Statistics** - Most runs, most wickets, highest strike rate, best economy

### Frontend Features
- 📈 **Interactive Dashboard** - Charts, stats cards, and performance metrics
- 🏆 **Live Standings** - Real-time league table with rankings
- 👥 **Team Management** - View team rosters, player points, and stats
- ⭐ **Player Directory** - Searchable, filterable player database
- 🎮 **Match Center** - Add matches manually or fetch from ESPN
- 📊 **Stats Page** - Tournament-wide statistics and leaderboards
- 📜 **Scoring Rules** - Detailed explanation of points system
- 🔐 **Admin Password Modal** - Secure match addition with lockout protection
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🎨 **Modern UI** - Dark theme with smooth animations

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI Framework |
| Vite | 5.x | Build Tool |
| Axios | 1.6.x | HTTP Client |
| Framer Motion | 10.x | Animations |
| Chart.js | 4.x | Data Visualization |
| React Chart.js 2 | 5.x | Chart Components |
| Heroicons | 2.x | Icons |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.9+ | Core Language |
| FastAPI | 0.104.x | API Framework |
| Uvicorn | 0.24.x | ASGI Server |
| Pandas | 2.1.x | Data Processing |
| Playwright | 1.40.x | Web Scraping |
| OpenPyXL | 3.1.x | Excel Processing |
| Python-dotenv | 1.0.x | Environment Variables |

---

## Project Structure

```
dwl-fantasy-platform/
│
├── backend/                              # Python backend
│   ├── api_server.py                    # FastAPI server with all endpoints
│   ├── wwc_fantasy.py                   # ESPN scorecard fetcher
│   ├── dwl_scoring_pipeline.py          # Fantasy points calculator
│   ├── requirements.txt                 # Python dependencies
│   ├── .env                             # Environment variables (create this)
│   ├── WWC_Config.xlsx                  # League configuration file
│   ├── wwc_match_data.json              # Match history storage (auto-created)
│   ├── DWL_Scores.xlsx                  # Generated Excel output
│   ├── admin_lockout.json               # Password lockout tracking (auto-created)
│   ├── espn_match_info/                 # Raw ESPN match data (auto-created)
│   ├── espn_names_match/                # Extracted player names (auto-created)
│   └── venv/                            # Python virtual environment
│
├── frontend/                             # React frontend
│   ├── src/
│   │   ├── components/                  # React components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Standings.jsx
│   │   │   ├── Teams.jsx
│   │   │   ├── Players.jsx
│   │   │   ├── Matches.jsx
│   │   │   ├── Stats.jsx
│   │   │   ├── Scoring.jsx
│   │   │   ├── MatchDetailsModal.jsx
│   │   │   ├── PlayerNameWithBadge.jsx
│   │   │   ├── Navbar.jsx
│   │   │   └── ChangePassword.jsx
│   │   ├── services/                    # API services
│   │   │   └── api.js
│   │   ├── data/                        # Static data
│   │   │   ├── teamColors.js
│   │   │   ├── countryInfo.js
│   │   │   └── teamOwners.js
│   │   ├── styles/                      # CSS styles
│   │   │   └── App.css
│   │   ├── App.jsx                      # Main app component
│   │   ├── index.js                     # Entry point
│   │   └── index.css                    # Global styles
│   ├── public/                          # Static assets
│   │   ├── logos/                       # Team logo images
│   │   └── *.jpeg                       # Background images
│   ├── package.json                     # NPM dependencies
│   ├── vite.config.js                   # Vite configuration
│   └── node_modules/                    # NPM packages
│
├── start.bat                            # Windows launcher
├── start.sh                             # Mac/Linux launcher
├── start.py                             # Cross-platform Python launcher
└── README.md                            # This file
```

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Version | Download Link |
|-------------|---------|---------------|
| **Node.js** | v16 or higher | [nodejs.org](https://nodejs.org/) |
| **Python** | 3.9 or higher | [python.org](https://python.org/downloads/) |
| **npm** or **yarn** | Latest | Comes with Node.js |
| **Git** (optional) | Latest | [git-scm.com](https://git-scm.com/) |

---

## Installation Guide

### Backend Setup

#### Step 1: Navigate to Backend Directory

```bash
cd backend
```

#### Step 2: Create Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
```

#### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

#### Step 4: Install Playwright Browser

```bash
playwright install webkit
```

#### Step 5: Create Environment Variables File

Create a `.env` file in the `backend/` directory:

```bash
# backend/.env
ADMIN_PASSWORD=YourSecurePasswordHere
MAX_FAILED_ATTEMPTS=3
LOCKOUT_DURATION_MINUTES=30
```

#### Step 6: Place Configuration File

Place your `WWC_Config.xlsx` file in the `backend/` directory.

### Frontend Setup

#### Step 1: Navigate to Frontend Directory

```bash
cd frontend
```

#### Step 2: Install Dependencies

```bash
npm install
```

#### Step 3: Create Environment Variables File

Create a `.env` file in the `frontend/` directory:

```bash
# frontend/.env
VITE_API_URL=http://localhost:8000/api
```

#### Step 4: Add Assets

Place team logo images in `frontend/public/logos/` with naming convention:
- `andhra-capitals.png`
- `bengaluru-lions.png`
- `chennai-thunder.png`
- `hyderabad-haramis.png`
- `kutte-kamine-riders.png`
- `kochi-tuskers.png`
- `mangaluru-bevarsis.png`
- `nepali-rhinos.png`
- `rajasthan-ragers.png`

---

## Configuration

### Excel Configuration File (`WWC_Config.xlsx`)

The configuration file is the heart of your league. It contains all team and player information.

#### Sheet 1: `DWLTeams`

| Column | Description | Example |
|--------|-------------|---------|
| Abbrv | Team abbreviation | AC |
| Team Name | Full team name | Andhra Capitals |

#### Sheet 2: `Players`

| Column | Description | Example |
|--------|-------------|---------|
| Player Name | Full player name | Beth Mooney |
| Role | Player role | wicketkeeper batter |
| DWL Team | Fantasy team name | Andhra Capitals |
| Country | Player's country | Australia |
| Sold Price | Auction price (optional) | 200000 |

**Valid Roles:**
- `batter` / `top-order batter` / `middle-order batter` / `opening batter`
- `bowler`
- `allrounder` / `bowling allrounder` / `batting allrounder`
- `wicketkeeper` / `wicketkeeper batter`

#### Sheet 3: Team Sheets (e.g., `AC`, `BL`, `CT`, etc.)

These sheets are used to assign captains and vice-captains.

| Column | Description |
|--------|-------------|
| Team Player No. | Sequential number |
| Player Name | Player's name |
| Country | Auto-populated via VLOOKUP |
| Captain/ Vice-Captain | Enter `captain` or `vice-captain` |

### Environment Variables

#### Backend `.env`

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_PASSWORD` | (required) | Password for adding matches |
| `MAX_FAILED_ATTEMPTS` | 3 | Number of failed attempts before lockout |
| `LOCKOUT_DURATION_MINUTES` | 30 | Lockout duration in minutes |

#### Frontend `.env`

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000/api` | Backend API URL |

---

## Running the Application

### One-Click Start (Recommended)

#### Windows
Double-click `start.bat`

#### Mac/Linux
```bash
chmod +x start.sh
./start.sh
```

#### Cross-platform (Python)
```bash
python start.py
```

### Manual Start

#### Terminal 1 - Backend

```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
python api_server.py
```

#### Terminal 2 - Frontend

```bash
cd frontend
npm run dev
```

### Access the Application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Documentation | http://localhost:8000/docs |

---

## Usage Guide

### 1. Uploading Configuration

1. Navigate to the **Players** tab
2. Click **"Upload Config"** button
3. Select your `WWC_Config.xlsx` file
4. Wait for confirmation message

### 2. Fetching a Match

1. Go to **Matches** tab
2. Click **"Add Match"** button
3. Enter admin password
4. Enter:
   - **Match Number**: Your league's match number (auto-increments)
   - **ESPN Match ID**: The ESPNcricinfo match ID
5. Click **"Add Match"** button
6. The system will automatically calculate fantasy points

### 3. Viewing Standings

- Navigate to **Standings** tab
- See live rankings with medals (🥇🥈🥉)
- View recent form (last 5 matches)
- Color-coded performance indicators

### 4. Managing Teams

- Go to **Teams** tab
- Click on any team card to expand and see player roster
- Click on any player to see detailed stats
- View owner information with Instagram links

### 5. Player Directory

- Navigate to **Players** tab
- Use search bar to find players by name, role, or country
- Filter by role, country, DWL team, or captain/VC status
- Sort by any column
- Click on any player row to see detailed stats

### 6. Match Details

- Click on any match in **Matches** tab or **Recent Activity** section
- View full scorecard with:
  - Team points summary
  - Player-by-player statistics
  - Super Over stats (if applicable)
  - Captain/VC multipliers

---

## Fantasy Points Scoring System

### Batting Points

| Action | Points |
|--------|--------|
| Run scored | +1 |
| Four | +1 (bonus) |
| Six | +2 (bonus) |
| Fifty (50+ runs) | +25 |
| Century (100+ runs) | +50 |
| 150+ runs | +75 |
| Duck (0 runs, out) | -15 |
| Golden duck (1st ball) | -25 |
| Diamond duck (0 balls) | -35 |

### Strike Rate Bonus (min 3 balls)

| Strike Rate | Points |
|-------------|--------|
| 150-174 | +5 |
| 175-199 | +10 |
| 200-224 | +15 |
| 225-249 | +20 |
| 250-274 | +25 |
| 275-299 | +30 |
| 300-324 | +35 |
| 325-349 | +40 |
| 350-599 | +45 |
| 600+ | +50 |
| Below 100 | -15 |

### Bowling Points

| Action | Points |
|--------|--------|
| Wicket | +30 |
| 3-wicket haul | +25 |
| 5-wicket haul | +50 |
| Hat-trick | +45 |
| Maiden over | +10 |

### Economy Rate Bonus (min 3 balls)

| Economy Rate | Points |
|--------------|--------|
| 0-5.99 | +25 |
| 6-6.99 | +15 |
| 7-7.99 | +10 |
| 12+ | -10 |

### Fielding Points

| Action | Points |
|--------|--------|
| Catch | +20 |
| Run out | +20 |
| Stumping | +20 |

### Bonuses

| Achievement | Points |
|-------------|--------|
| Player of the Match | +25 |
| Captain (multiplier) | ×2 |
| Vice-Captain | ×1.5 |

---

## API Documentation

Once the backend is running, visit `http://localhost:8000/docs` for interactive API documentation.

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Check backend status |
| `/api/teams` | GET | Get all teams with stats |
| `/api/players` | GET | Get all players with points |
| `/api/matches` | GET | Get match history |
| `/api/standings` | GET | Get current standings |
| `/api/fetch-match` | POST | Fetch match from ESPN |
| `/api/upload-config` | POST | Upload config Excel file |
| `/api/match-details/{num}` | GET | Get full match details |
| `/api/verify-password` | POST | Verify admin password |
| `/api/change-password` | POST | Change admin password |
| `/api/password-status` | GET | Get lockout status |
| `/api/admin-config` | GET | Get admin configuration |

---

## Troubleshooting

### Common Issues and Solutions

#### Backend Won't Start

**Error**: `ModuleNotFoundError: No module named 'fastapi'`

**Solution**:
```bash
pip install -r requirements.txt
```

**Error**: `FileNotFoundError: WWC_Config.xlsx`

**Solution**: Place your `WWC_Config.xlsx` file in the `backend/` directory

**Error**: `playwright._impl._api_types.Error: Executable doesn't exist`

**Solution**:
```bash
playwright install webkit
```

**Error**: `address already in use`

**Solution**: Change port in `api_server.py` or kill the process using the port

#### Frontend Won't Start

**Error**: `Cannot find module`

**Solution**:
```bash
npm install
```

**Error**: `VITE_API_URL not defined`

**Solution**: Create `.env` file in `frontend/` with `VITE_API_URL=http://localhost:8000/api`

#### Connection Issues

**Error**: `Backend server is not running`

**Solutions**:
1. Check if backend is running: `curl http://localhost:8000/api/health`
2. Verify port 8000 is not in use
3. Check firewall settings
4. Restart both servers

**Error**: `CORS policy error`

**Solution**: The backend has CORS middleware enabled for localhost. Make sure you're using `localhost` not `127.0.0.1`

#### Match Fetching Issues

**Error**: `Could not find __NEXT_DATA__ in page`

**Solutions**:
1. Verify the match ID is correct
2. Check if the match has started
3. Try a different match ID

**Error**: `Match has not started yet`

**Solution**: Wait for the match to begin and try again

**Error**: `Configuration not loaded`

**Solution**: Upload your `WWC_Config.xlsx` file in the Players tab

#### Password Issues

**Error**: `Too many failed attempts`

**Solution**: Wait for the lockout period to expire (default 30 minutes) or delete `admin_lockout.json` in backend folder

---

## Deployment

### Deploying Backend

#### Option 1: Using Docker

Create `Dockerfile`:

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install webkit

COPY . .

CMD ["uvicorn", "api_server:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t dwl-backend .
docker run -p 8000:8000 dwl-backend
```

#### Option 2: Using Render (Free Tier)

1. Push code to GitHub
2. Create a new Web Service on Render
3. Connect your repository
4. Set build command: `pip install -r requirements.txt && playwright install webkit`
5. Set start command: `uvicorn api_server:app --host 0.0.0.0 --port $PORT`
6. Add environment variables in Render dashboard

### Deploying Frontend

#### Build for Production

```bash
cd frontend
npm run build
```

The build files will be in `dist/` folder.

#### Deploy to Vercel (Free)

```bash
npm install -g vercel
vercel
```

#### Deploy to Netlify (Free)

```bash
npm run build
# Drag and drop dist/ folder to Netlify
```

### Deploy to Render (Static Site + Web Service)

1. **Backend**: Deploy as Web Service (as above)
2. **Frontend**: Deploy as Static Site
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Add environment variable: `VITE_API_URL` = your backend URL

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Coding Standards

- **Python**: Follow PEP 8
- **JavaScript/React**: Use ESLint with Airbnb config
- **Comments**: Document complex logic
- **Commit Messages**: Use conventional commits format

---

## License

This project is licensed under the MIT License.

---

## Acknowledgments

- ESPNcricinfo for match data
- React and FastAPI communities
- All contributors and testers

---

## Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check troubleshooting section above
- Review API documentation at `/docs`

---

**Built with ❤️ for the Delulu Women's League**

*Last Updated: 2026*
