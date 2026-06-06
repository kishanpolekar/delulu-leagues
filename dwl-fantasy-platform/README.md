# DWL Fantasy League Platform

## Complete Fantasy Cricket Management System

A full-stack fantasy cricket platform for the Delulu Women's League (DWL), featuring automated scorecard fetching, real-time point calculation, team management, and interactive dashboards.

## 🏏 Overview

This platform automates the entire fantasy cricket league management process:

1. **Automated Scorecard Fetching** - Pulls live match data from ESPNcricinfo
2. **Smart Player Matching** - Maps ESPN players to DWL fantasy rosters
3. **Real-time Point Calculation** - Applies WWC scoring rules with captain/VC multipliers
4. **Interactive Dashboard** - React-based frontend for league management
5. **Admin Controls** - Secure match fetching and configuration management

---

## 📋 Table of Contents

- [System Architecture](#-system-architecture)
- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [API Documentation](#-api-documentation)
- [Frontend Guide](#-frontend-guide)
- [Scoring Rules](#-scoring-rules)
- [Troubleshooting](#-troubleshooting)
- [Development](#-development)

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│                    http://localhost:5173                        │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              │ REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API Server (FastAPI)                        │
│                     http://localhost:8000                       │
├─────────────────────────────────────────────────────────────────┤
│  • Match fetching endpoint      • Authentication                │
│  • Standings generation         • Excel download                │
│  • Player/team management       • Config upload                 │
└─────────────┬───────────────────────────────┬───────────────────┘
              │                               │
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────────┐
│  ESPNcricinfo Scraper   │     │      Supabase Database          │
│    (Playwright/WebKit)  │     │    • Match history              │
│                         │     │    • Player stats               │
│  • WWC Fantasy Points   │     │    • Team standings             │
│  • Super Over support   │     └─────────────────────────────────┘
│  • Player matching      │
└─────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Local File Storage                           │
│  • WWC_Config.xlsx (league configuration)                       │
│  • DWL_Scores.xlsx (generated reports)                          │
│  • espn_match_info/ (raw match data)                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### Backend Features
- ✅ **Automated Scorecard Fetching** - Real-time data from ESPNcricinfo
- ✅ **Super Over Support** - Full handling of one-over eliminators
- ✅ **Comprehensive Scoring Rules** - Batting, bowling, fielding with bonuses
- ✅ **Smart Player Matching** - Multi-strategy name matching algorithm
- ✅ **Captain/VC Multipliers** - 2x and 1.5x point multipliers
- ✅ **Supabase Integration** - Cloud-based data persistence
- ✅ **Excel Report Generation** - Per-team sheets with match-by-match breakdown
- ✅ **Admin Authentication** - Password protection with lockout mechanism
- ✅ **CORS Support** - Secure frontend-backend communication

### Frontend Features
- ✅ **Interactive Dashboard** - Real-time standings and match updates
- ✅ **Team Management** - View rosters with captain/VC indicators
- ✅ **Player Stats** - Detailed performance metrics per player
- ✅ **Match History** - Browse past matches with detailed stats
- ✅ **Admin Panel** - Secure match fetching and configuration upload
- ✅ **Responsive Design** - Works on desktop and tablet devices
- ✅ **Team Logos** - Visual identification for all 7 DWL teams
- ✅ **Owner Profiles** - Team owner information and photos

---

## 📦 Prerequisites

### System Requirements
- **Python 3.8+** (backend)
- **Node.js 16+** (frontend)
- **npm** or **yarn** (package manager)

### Required Accounts
- **Supabase** (free tier) - For data persistence
- **ESPNcricinfo** (no account needed - public access)

---

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd dwl-fantasy-platform
```

### 2. Backend Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install playwright pandas openpyxl supabase fastapi uvicorn python-dotenv

# Install Playwright browsers
playwright install webkit
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Or use the setup script (Linux/Mac)
chmod +x setup_frontend.sh
./setup_frontend.sh
```

---

## ⚙️ Configuration

### 1. Environment Variables (.env)

Create a `.env` file in the project root:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-or-service-role-key

# Admin Security
ADMIN_PASSWORD=your_secure_password_here
MAX_FAILED_ATTEMPTS=3
LOCKOUT_DURATION_MINUTES=30

# CORS Configuration (comma-separated)
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Server Configuration (optional)
API_HOST=127.0.0.1
API_PORT=8000
```

### 2. League Configuration (WWC_Config.xlsx)

Create an Excel file with the following sheets:

#### Sheet 1: "DWLTeams"
| Abbrv | Team Name |
|-------|-----------|
| GD | Gully Divas |
| JR | Janaki Royals |
| KQ | Konkan Queens |
| RR | Rajputana Ranis |
| SS | Sarafa Strikers |
| SGS | Singara Singapengal |
| VW | Vanitha Warriors |

#### Sheet 2: "Players"
| Player Name | Role | DWL Team | Country | Sold Price |
|-------------|------|----------|---------|------------|
| Beth Mooney | Wicketkeeper | Gully Divas | Australia | 8.5 |
| Smriti Mandhana | Batter | Janaki Royals | India | 9.0 |
| Deepti Sharma | All-rounder | Konkan Queens | India | 7.5 |
| Sophie Ecclestone | Bowler | Rajputana Ranis | England | 8.0 |

**Role values:** `Wicketkeeper`, `Batter`, `Bowler`, `All-rounder`

**Country values:** Australia, Bangladesh, India, Netherlands, Pakistan, South Africa, England, Ireland, New Zealand, Scotland, Sri Lanka, West Indies

#### Team Sheets (GD, JR, KQ, RR, SS, SGS, VW)

Each team sheet defines captain/vice-captain for each match round:

| (Empty) | Player Name | (Empty) | Role |
|---------|-------------|---------|------|
| | Beth Mooney | | Captain |
| | Tahlia McGrath | | Vice-Captain |
| | Ashleigh Gardner | | |
| | Ellyse Perry | | |

**Important:** The pipeline reads the 4th column (Role) - values should be "Captain" or "Vice-Captain" (case-insensitive).

### 3. Supabase Setup

Create a `matches` table in your Supabase project:

```sql
CREATE TABLE matches (
    match_num INTEGER PRIMARY KEY,
    match_entry JSONB NOT NULL,
    team1_country TEXT,
    team2_country TEXT,
    match_winner TEXT,
    match_title TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎯 Running the Application

### Option 1: Full Stack (Recommended)

#### Terminal 1: Backend API Server
```bash
# From project root
python api_server.py
```
Expected output:
```
==================================================
🚀 Starting DWL Fantasy League API Server
==================================================
📖 Loading configuration from WWC_Config.xlsx
   Loaded 7 teams
   Loaded 112 players
✅ Configuration loaded successfully
INFO:     Uvicorn running on http://127.0.0.1:8000
```

#### Terminal 2: Frontend Development Server
```bash
cd frontend
npm run dev
```
Expected output:
```
  VITE v5.0.0  ready in 500 ms
  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Option 2: Backend Only (CLI Mode)

```bash
# Fetch and calculate points for a match
python wwc_fantasy.py -m 1527674

# Process match for DWL league
python dwl_scoring_pipeline.py -m 1527674 -n 1

# Generate Excel from existing matches
python dwl_scoring_pipeline.py
```

### Option 3: Frontend Only (Development)

```bash
cd frontend
npm run dev
# API calls will go to http://localhost:8000
```

---

## 🔌 API Documentation

### Base URL
```
http://localhost:8000
```

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API information and available endpoints |
| GET | `/api/health` | Health check with configuration status |
| GET | `/api/teams` | Get all DWL teams with rosters and standings |
| GET | `/api/players` | Get all players with points and roles |
| GET | `/api/matches` | Get list of all matches |
| GET | `/api/match-details/{match_num}` | Get detailed stats for a specific match |
| GET | `/api/standings` | Get current league standings |
| GET | `/api/download-excel` | Download DWL_Scores.xlsx report |
| GET | `/api/espn-match-info/{match_num}` | Get raw ESPN match data |
| GET | `/api/password-status` | Get admin lockout status |
| GET | `/api/admin-config` | Get admin configuration |

### Admin Endpoints (Requires Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/verify-password` | Verify admin password |
| POST | `/api/change-password` | Change admin password |
| POST | `/api/fetch-match` | Fetch and process a new match |
| POST | `/api/upload-config` | Upload new configuration file |

### Example: Fetch a Match

```bash
curl -X POST http://localhost:8000/api/fetch-match \
  -H "Content-Type: application/json" \
  -d '{"match_id":1527674,"match_num":1}'
```

Response:
```json
{
  "success": true,
  "match_num": 1,
  "team1": "IND-W",
  "team2": "PAK-W",
  "match_winner": "IND-W",
  "match_entry": {
    "Beth Mooney": {
      "pts": 145,
      "final_pts": 290,
      "is_motm": true,
      "dwl_team": "Gully Divas"
    }
  },
  "unmatched": [],
  "info": "M1: India Women vs Pakistan Women | 2024-02-15 | India won by 6 wickets"
}
```

---

## 🎨 Frontend Guide

### Application Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx      # Main dashboard with stats
│   │   ├── Teams.jsx          # Team rosters and points
│   │   ├── Players.jsx        # Player directory
│   │   ├── Matches.jsx        # Match history
│   │   ├── Standings.jsx      # League standings
│   │   ├── Stats.jsx          # Advanced statistics
│   │   ├── Settings.jsx       # Admin controls
│   │   ├── AboutUs.jsx        # Team information
│   │   └── Navbar.jsx         # Navigation component
│   ├── services/
│   │   ├── api.js             # API service layer
│   │   └── statsService.js    # Statistics calculations
│   ├── data/
│   │   ├── teamColors.js      # Team color schemes
│   │   ├── teamOwners.js      # Owner information
│   │   └── countryInfo.js     # Country mappings
│   └── styles/
│       └── App.css            # Global styles
```

### Navigation

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Overview with key statistics |
| Teams | `/teams` | Team rosters with captain/VC badges |
| Players | `/players` | All players with points and roles |
| Matches | `/matches` | Match history with results |
| Standings | `/standings` | League leaderboard |
| Stats | `/stats` | Detailed player statistics |
| Settings | `/settings` | Admin panel (password required) |
| About | `/about` | Team and owner information |

### Admin Workflow

1. **Navigate to Settings** (`/settings`)
2. **Enter Admin Password** (configured in `.env`)
3. **Fetch New Match:**
   - Enter ESPNcricinfo match ID
   - Enter league match number
   - Click "Fetch Match"
4. **Upload Configuration:**
   - Upload updated `WWC_Config.xlsx`
   - System reloads automatically
5. **Download Reports:**
   - Click "Download Excel Report"
   - Get comprehensive league data

### Frontend Features in Detail

#### Dashboard
- Real-time standings update
- Top performers (batting, bowling, fielding)
- Recent matches summary
- Team performance charts

#### Teams View
- Team cards with logos and colors
- Player rosters with role badges
- Captain (🏆) and Vice-Captain (🥈) indicators
- Individual player points

#### Match Details Modal
- Full scorecard with all players
- Batting stats (runs, balls, 4s, 6s, SR)
- Bowling stats (overs, maidens, wickets, economy)
- Fielding stats (catches, run-outs, stumpings)
- Super Over stats (when applicable)
- Point breakdown by category

#### Stats Page
- Batting leaderboard
- Bowling leaderboard
- Fielding leaderboard
- Most Valuable Player (MVP) rankings
- Player comparison tools

---

## 📊 Scoring Rules

### Batting Points

| Event | Points |
|-------|--------|
| Run | +1 |
| Four | +1 (bonus) |
| Six | +2 (bonus) |
| Fifty (50-99) | +25 |
| Century (100-149) | +50 |
| 150+ runs | +75 |
| Duck (out for 0) | -15 |
| Golden Duck (1 ball) | -25 |
| Diamond Duck (0 balls) | -35 |

### Strike Rate Bonus (min 3 balls)

| Strike Rate | Points |
|-------------|--------|
| 150-174.99 | +5 |
| 175-199.99 | +10 |
| 200-224.99 | +15 |
| 225-249.99 | +20 |
| 250-274.99 | +25 |
| 275-299.99 | +30 |
| 300-324.99 | +35 |
| 325-349.99 | +40 |
| 350-599.99 | +45 |
| 600+ | +50 |

**Penalty:** -15 for SR < 100 (runs > 0 OR not out)

### Bowling Points

| Event | Points |
|-------|--------|
| Wicket | +40 |
| 3-wicket haul | +25 |
| 4-wicket haul | +35 |
| 5-wicket haul | +50 |
| 6+ wickets | +75 |
| Hat-trick | +45 |
| Maiden over | +20 |

### Economy Rate (min 6 balls)

| Economy | Points |
|---------|--------|
| 0.00-3.99 | +50 |
| 4.00-4.99 | +35 |
| 5.00-5.99 | +25 |
| 6.00-6.99 | +15 |
| 7.00-7.99 | +10 |
| 12.00-13.99 | -10 |
| 14.00-15.99 | -15 |
| 16.00-19.99 | -20 |
| 20.00+ | -25 |

### Fielding Points

| Event | Points |
|-------|--------|
| Catch | +30 |
| Run Out | +30 |
| Stumping | +30 |

### Bonuses

| Bonus | Points |
|-------|--------|
| Player of the Match | +50 |

### Captain/VC Multipliers

| Role | Multiplier |
|------|------------|
| Captain | 2.0x |
| Vice-Captain | 1.5x |
| Regular | 1.0x |

---

## 🔧 Troubleshooting

### Common Issues and Solutions

#### Backend Issues

| Issue | Solution |
|-------|----------|
| `ModuleNotFoundError: No module named 'playwright'` | Run `pip install playwright && playwright install webkit` |
| `Could not find __NEXT_DATA__ in page` | ESPN changed page structure; check match URL |
| `Supabase connection failed` | Verify SUPABASE_URL and SUPABASE_KEY in .env |
| `Config file not found` | Ensure WWC_Config.xlsx is in project root |
| `Port 8000 already in use` | Change port: `uvicorn api_server:app --port 8001` |

#### Frontend Issues

| Issue | Solution |
|-------|----------|
| `API calls failing` | Check if backend is running on port 8000 |
| `CORS errors` | Update ALLOWED_ORIGINS in .env to include frontend URL |
| `Build fails` | Delete node_modules and run `npm install` again |
| `Blank page on load` | Check browser console for errors |

#### Playwright Issues

```bash
# Reinstall Playwright browsers
playwright install webkit --force

# Or install all browsers
playwright install --force

# Check installation
playwright --version
```

#### Excel Generation Issues

```bash
# Check file permissions
chmod 644 DWL_Scores.xlsx

# Verify openpyxl installation
pip install --upgrade openpyxl

# Check config file structure
python -c "import pandas as pd; print(pd.ExcelFile('WWC_Config.xlsx').sheet_names)"
```

### Debug Mode

Enable debug output for detailed logging:

```bash
# Backend debug
python api_server.py --debug

# CLI debug
python wwc_fantasy.py -m 1527674 --debug
python dwl_scoring_pipeline.py -m 1527674 -n 1 --debug
```

---

## 🧪 Development

### Running Tests

```bash
# Test API endpoints
curl http://localhost:8000/api/health

# Test player matching
python -c "from dwl_scoring_pipeline import build_dwl_lookup; print(build_dwl_lookup(['Beth Mooney', 'S Mandhana']))"

# Test ESPN fetching
python wwc_fantasy.py -m 1527674 --quiet
```

### Project Structure

```
dwl-fantasy-platform/
.
├── backend
│   ├── api_server.py
│   ├── Dockerfile
│   ├── dwl_scoring_pipeline.py
│   ├── requirements.txt
│   ├── setup_backend.sh
│   ├── WWC_Config.xlsx
│   └── wwc_fantasy.py
├── Final Folder Structure.txt
├── frontend
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── public
│   │   ├── delulu-womens-league.jpeg
│   │   ├── dwl-logo.png
│   │   ├── group-ai.jpeg
│   │   ├── logos
│   │   │   ├── gully-divas.png
│   │   │   ├── janaki-royals.png
│   │   │   ├── konkan-queens.png
│   │   │   ├── rajputana-ranis.png
│   │   │   ├── sarafa-strikers.png
│   │   │   ├── singara-singapengal.png
│   │   │   └── vanitha-warriors.png
│   │   ├── owners
│   │   │   ├── asrayram-gopalakrishnan.jpeg
│   │   │   ├── barghavi-varadarajan.jpeg
│   │   │   ├── kishan-polekar.jpeg
│   │   │   ├── kridish-uprety.jpeg
│   │   │   ├── nikhil-satheesan.jpeg
│   │   │   ├── nimesh-bhatia.jpeg
│   │   │   └── sam-dsouza.jpeg
│   │   └── teams-ai.jpeg
│   ├── setup_frontend.sh
│   ├── src
│   │   ├── App.jsx
│   │   ├── components
│   │   │   ├── AboutUs.jsx
│   │   │   ├── ChangePassword.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── MatchDetailsModal.jsx
│   │   │   ├── Matches.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── PlayerNameWithBadge.jsx
│   │   │   ├── Players.jsx
│   │   │   ├── Scoring.jsx
│   │   │   ├── Settings.jsx
│   │   │   ├── Standings.jsx
│   │   │   ├── Stats.jsx
│   │   │   └── Teams.jsx
│   │   ├── data
│   │   │   ├── countryInfo.js
│   │   │   ├── teamColors.js
│   │   │   └── teamOwners.js
│   │   ├── index.css
│   │   ├── index.jsx
│   │   ├── services
│   │   │   ├── api.js
│   │   │   └── statsService.js
│   │   └── styles
│   │       └── App.css
│   └── vite.config.js
├── README.md
├── Script Usage Instructions.png
├── start.bat
├── start.py
└── start.sh
```

### Creating requirements.txt

```bash
pip freeze > requirements.txt
```

Example `requirements.txt`:
```
fastapi==0.104.1
uvicorn==0.24.0
pandas==2.1.3
openpyxl==3.1.2
playwright==1.40.0
supabase==1.2.0
python-dotenv==1.0.0
```

### Customizing Frontend

#### Adding New Team Logo
1. Add logo to `frontend/public/logos/`
2. Update team mapping in `frontend/src/data/teamColors.js`

#### Modifying Team Colors
Edit `frontend/src/data/teamColors.js`:
```javascript
export const teamColors = {
  "GD": { primary: "#FF6B6B", secondary: "#4ECDC4" },
  // Add other teams...
};
```

#### Updating Owner Information
Edit `frontend/src/data/teamOwners.js`:
```javascript
export const teamOwners = {
  "Gully Divas": {
    name: "Owner Name",
    photo: "/owners/photo.jpg",
    bio: "Owner biography..."
  }
};
```

---

## 📈 Performance Optimization

### Backend Optimization
- Use `--reload` only in development
- Implement caching for frequently accessed data
- Use connection pooling for Supabase
- Batch Excel generation for multiple matches

### Frontend Optimization
- Lazy load routes with React.lazy()
- Implement virtual scrolling for large lists
- Use React.memo() for expensive components
- Optimize images and assets

---

## 🔒 Security Best Practices

1. **Never commit `.env` to version control**
2. **Use strong ADMIN_PASSWORD** (min 12 chars with special chars)
3. **Regularly rotate passwords** via Settings page
4. **Use HTTPS in production** (deploy behind reverse proxy)
5. **Implement rate limiting** for API endpoints
6. **Validate all file uploads** (size, type, content)
7. **Keep dependencies updated** (`npm audit`, `pip list --outdated`)

---

## 🚢 Deployment

### Backend Deployment (Production)

```bash
# Using gunicorn (Linux)
gunicorn -w 4 -k uvicorn.workers.UvicornWorker api_server:app

# Using systemd service
sudo systemctl start dwl-api

# Using Docker
docker build -t dwl-api .
docker run -p 8000:8000 --env-file .env dwl-api
```

### Frontend Deployment

```bash
# Build production bundle
cd frontend
npm run build

# Serve with nginx
sudo cp -r dist/* /var/www/html/dwl/

# Or use Vite preview
npm run preview
```

### Environment Variables for Production

```env
SUPABASE_URL=production_url
SUPABASE_KEY=production_key
ADMIN_PASSWORD=strong_password
ALLOWED_ORIGINS=https://yourdomain.com
API_HOST=0.0.0.0
API_PORT=8000
```

---

## 📞 Support

### Resources
- **API Documentation**: `http://localhost:8000/docs` (FastAPI Swagger UI)
- **Supabase Dashboard**: Your project dashboard
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

## 📊 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-05 | Initial release with full functionality |
| 1.0.1 | TBD | Bug fixes and performance improvements |

---

**Built with ❤️ for the Delulu Women's League**