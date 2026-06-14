#!/usr/bin/env python3
"""
DWL Fantasy League - API Server
Run with: python api_server.py
"""

import json
import io
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse
from pydantic import BaseModel
from supabase import create_client, Client
import uvicorn
import pandas as pd

# Import your existing modules
from wwc_fantasy import WWCScorecard
from dwl_scoring_pipeline import (
    read_dwl_config, process_scorecard, load_match_data, save_match_data, generate_excel, extract_espn_names
)

# Global state
teams_data = None
players_data = None
config_loaded = False

# Load environment variables
load_dotenv()

# Admin password from environment variable
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "SimplePass123")
MAX_FAILED_ATTEMPTS = int(os.getenv("MAX_FAILED_ATTEMPTS", "3"))
LOCKOUT_DURATION_MINUTES = int(os.getenv("LOCKOUT_DURATION_MINUTES", "5"))
LOCKOUT_DURATION_SECONDS = LOCKOUT_DURATION_MINUTES * 60

# Admin lockout state (store in memory with persistence)
ADMIN_CONFIG_FILE = "admin_lockout.json"

def load_lockout_state():
    """Load lockout state from file"""
    if Path(ADMIN_CONFIG_FILE).exists():
        with open(ADMIN_CONFIG_FILE, 'r') as f:
            return json.load(f)
    return {
        "failed_attempts": 0,
        "is_locked": False,
        "lock_until": None
    }

def save_lockout_state(state):
    """Save lockout state to file"""
    with open(ADMIN_CONFIG_FILE, 'w') as f:
        json.dump(state, f)

# Initialize lockout state
lockout_state = load_lockout_state()

# Configuration
CONFIG_PATH = "WWC_Config.xlsx"
DATA_FILE = "wwc_match_data.json"
EXCEL_OUTPUT_FILE = "DWL_Scores.xlsx"

# Storage configuration
STORAGE_MODE = os.getenv("STORAGE_MODE", "local").lower()
BUCKET_NAME = "excel-files"
EXCEL_FILE_PATH = "DWL_Scores.xlsx"  # Path within the bucket

def is_production_mode() -> bool:
    """Check if running in production mode with Supabase storage."""
    return STORAGE_MODE == "production"

# Configure Supabase client
supabase_client: Client = None
def get_supabase_client() -> Client:
    """Initialize and return the Supabase client."""
    global supabase_client
    if not is_production_mode():
        return None
    
    if supabase_client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        if not url or not key:
            print("⚠️ SUPABASE_URL or SUPABASE_KEY not set. Supabase features will be unavailable.")
            return None
        supabase_client = create_client(url, key)
        print("ℹ️ PROD: SUPABASE client connected. (api_server)")
    return supabase_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events"""
    global teams_data, players_data, config_loaded
    
    # Startup
    print("\n" + "="*50)
    print("🚀 Starting DWL Fantasy League API Server")
    print("="*50)
    
    try:
        if Path(CONFIG_PATH).exists():
            await load_config()
            config_loaded = True
            print("✅ Configuration loaded successfully")
        else:
            print(f"⚠️ Config file not found: {CONFIG_PATH}")
            print("   Please upload WWC_Config.xlsx via the Players tab")
    except Exception as e:
        print(f"❌ Error loading config: {e}")
    
    yield
    
    # Shutdown
    print("\n" + "="*50)
    print("👋 Shutting down DWL Fantasy League API Server")
    print("="*50)


app = FastAPI(
    title="DWL Fantasy League API",
    version="1.0.0",
    description="API for Delulu Women's League Fantasy Cricket Platform",
    lifespan=lifespan
)

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MatchRequest(BaseModel):
    match_id: int
    match_num: int


@app.get("/")
async def root():
    return {
        "message": "DWL Fantasy League API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/api/health",
            "teams": "/api/teams",
            "players": "/api/players",
            "matches": "/api/matches",
            "standings": "/api/standings",
            "fetch_match": "POST /api/fetch-match",
            "upload_config": "POST /api/upload-config"
        }
    }


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "config_loaded": config_loaded,
        "config_path": str(Path(CONFIG_PATH).absolute()) if Path(CONFIG_PATH).exists() else None
    }


class PasswordVerifyRequest(BaseModel):
    password: str

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

@app.post("/api/verify-password")
async def verify_password(request: PasswordVerifyRequest):
    """Verify admin password with lockout tracking"""
    global lockout_state
    
    # Check if currently locked
    if lockout_state.get("is_locked", False):
        lock_until = lockout_state.get("lock_until")
        if lock_until and datetime.now().timestamp() < lock_until:
            remaining = int(lock_until - datetime.now().timestamp())
            return {
                "success": False,
                "is_locked": True,
                "remaining_seconds": remaining,
                "message": f"Too many failed attempts. Try again in {remaining//60} minutes."
            }
        else:
            # Lock expired, reset state
            lockout_state = {
                "failed_attempts": 0,
                "is_locked": False,
                "lock_until": None
            }
            save_lockout_state(lockout_state)
    
    # Verify password
    if request.password == ADMIN_PASSWORD:
        # Reset failed attempts on successful login
        lockout_state["failed_attempts"] = 0
        lockout_state["is_locked"] = False
        lockout_state["lock_until"] = None
        save_lockout_state(lockout_state)
        return {
            "success": True,
            "remaining_attempts": MAX_FAILED_ATTEMPTS
        }
    else:
        # Increment failed attempts
        lockout_state["failed_attempts"] = lockout_state.get("failed_attempts", 0) + 1
        remaining_attempts = MAX_FAILED_ATTEMPTS - lockout_state["failed_attempts"]
        
        # Check if should lock
        if lockout_state["failed_attempts"] >= MAX_FAILED_ATTEMPTS:
            lockout_state["is_locked"] = True
            lockout_state["lock_until"] = datetime.now().timestamp() + LOCKOUT_DURATION_SECONDS
            save_lockout_state(lockout_state)
            return {
                "success": False,
                "is_locked": True,
                "remaining_seconds": LOCKOUT_DURATION_SECONDS,
                "message": f"Too many failed attempts. Locked for {LOCKOUT_DURATION_MINUTES} minutes."
            }
        
        save_lockout_state(lockout_state)
        return {
            "success": False,
            "remaining_attempts": remaining_attempts,
            "message": f"Incorrect password. {remaining_attempts} attempt(s) remaining."
        }


@app.post("/api/change-password")
async def change_password(request: PasswordChangeRequest):
    """Change admin password (requires current password)"""
    global ADMIN_PASSWORD
    
    # Verify current password
    if request.current_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    # Validate new password
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    
    # Update environment variable in memory
    ADMIN_PASSWORD = request.new_password
    
    # Update .env file
    env_path = Path(".env")
    if env_path.exists():
        lines = env_path.read_text().splitlines()
        updated = False
        for i, line in enumerate(lines):
            if line.startswith("ADMIN_PASSWORD="):
                lines[i] = f"ADMIN_PASSWORD={request.new_password}"
                updated = True
                break
        if not updated:
            lines.append(f"ADMIN_PASSWORD={request.new_password}")
        env_path.write_text("\n".join(lines))
    
    # Reset lockout state
    global lockout_state
    lockout_state = {
        "failed_attempts": 0,
        "is_locked": False,
        "lock_until": None
    }
    save_lockout_state(lockout_state)
    
    return {"success": True, "message": "Password changed successfully"}


@app.get("/api/password-status")
async def get_password_status():
    """Get current lockout status"""
    if lockout_state.get("is_locked", False):
        lock_until = lockout_state.get("lock_until")
        if lock_until and datetime.now().timestamp() < lock_until:
            remaining = int(lock_until - datetime.now().timestamp())
            return {
                "is_locked": True,
                "remaining_seconds": remaining,
                "remaining_minutes": remaining // 60,
                "failed_attempts": lockout_state.get("failed_attempts", 0)
            }
    
    return {
        "is_locked": False,
        "failed_attempts": lockout_state.get("failed_attempts", 0),
        "max_attempts": MAX_FAILED_ATTEMPTS
    }


@app.get("/api/admin-config")
async def get_admin_config():
    """Get admin configuration (max attempts, lockout duration)"""
    return {
        "max_failed_attempts": MAX_FAILED_ATTEMPTS,
        "lockout_duration_minutes": LOCKOUT_DURATION_MINUTES,
        "lockout_duration_seconds": LOCKOUT_DURATION_SECONDS
    }


@app.get("/api/teams")
async def get_teams():
    """Get all DWL teams with their stats"""
    global teams_data, players_data
    
    if not config_loaded:
        raise HTTPException(status_code=503, detail="Configuration not loaded. Please upload WWC_Config.xlsx")
    
    match_history = load_match_data(DATA_FILE)
    
    teams_list = []
    capt_vc = teams_data.get("capt_vc", {})
    name_to_abbr = teams_data.get("name_to_abbr", {})
    player_status = teams_data.get("player_status", {})
    
    for abbr, team_name in teams_data.get("abbr_to_name", {}).items():
        roster = teams_data.get("rosters", {}).get(team_name, [])
        team_capt_vc = capt_vc.get(abbr, {})
        
        # Calculate total points from all matches
        total_points = 0
        for match_num, match_data in match_history.items():
            match_entry = match_data.get("match_entry", {})
            for player, player_data in match_entry.items():
                if player_data.get("dwl_team") == team_name:
                    total_points += player_data.get("final_pts", 0)
        
        matches_played = len(match_history)
        
        # Calculate wins (team with higher total points in a match)
        wins = 0
        for match_num, match_data in match_history.items():
            match_entry = match_data.get("match_entry", {})
            team_points = {}
            for player, player_data in match_entry.items():
                team = player_data.get("dwl_team", "")
                team_points[team] = team_points.get(team, 0) + player_data.get("final_pts", 0)
            
            if team_points.get(team_name, 0) > max(team_points.values(), default=0):
                wins += 1
        
        # Build players list with captain/VC info
        players_list = []
        for p in roster:
            # Determine if player is captain or vice-captain
            player_role_in_team = ""
            if team_capt_vc.get(p) == 2.0:
                player_role_in_team = "C"
            elif team_capt_vc.get(p) == 1.5:
                player_role_in_team = "VC"
            
            # Get player status
            status = player_status.get(p, "")
            
            players_list.append({
                "id": hash(p),
                "name": p,
                "role": players_data.get("player_role", {}).get(p, ""),
                "country": players_data.get("player_country", {}).get(p, ""),
                "team": team_name,
                "teamAbbr": abbr,
                "points": 0,
                "captainVC": player_role_in_team,
                "soldPrice": players_data.get("player_price", {}).get(p, 0),
                "status": status,
            })
        
        teams_list.append({
            "id": abbr,
            "name": team_name,
            "abbr": abbr,
            "totalPoints": round(total_points, 1),
            "matchesPlayed": matches_played,
            "wins": wins,
            "players": players_list
        })
    
    return teams_list


@app.get("/api/players")
async def get_players():
    """Get all players with their stats and captain/VC status"""
    global players_data, teams_data
    
    if not config_loaded:
        raise HTTPException(status_code=503, detail="Configuration not loaded")
    
    match_history = load_match_data(DATA_FILE)
    
    # Calculate player points
    player_points = {}
    for match_num, match_data in match_history.items():
        match_entry = match_data.get("match_entry", {})
        for player, player_data in match_entry.items():
            player_points[player] = player_points.get(player, 0) + player_data.get("final_pts", 0)
    
    # Get captain/VC mappings
    capt_vc = teams_data.get("capt_vc", {})
    name_to_abbr = teams_data.get("name_to_abbr", {})
    player_status = teams_data.get("player_status", {})
    
    players_list = []
    for player_name, team in players_data.get("player_team", {}).items():
        # Find if player is captain or VC for their team
        team_abbr = name_to_abbr.get(team, "")
        player_role_in_team = ""
        if team_abbr in capt_vc:
            if capt_vc[team_abbr].get(player_name) == 2.0:
                player_role_in_team = "C"
            elif capt_vc[team_abbr].get(player_name) == 1.5:
                player_role_in_team = "VC"
        
        # Get player status
        status = player_status.get(player_name, "")
        
        players_list.append({
            "id": abs(hash(player_name)) % 1000000,
            "name": player_name,
            "role": players_data.get("player_role", {}).get(player_name, ""),
            "country": players_data.get("player_country", {}).get(player_name, ""),
            "team": team,
            "teamAbbr": team_abbr,
            "points": round(player_points.get(player_name, 0), 1),
            "captainVC": player_role_in_team,
            "soldPrice": players_data.get("player_price", {}).get(player_name, 0),
            "status": status,
        })
    
    return players_list


@app.get("/api/matches")
async def get_matches():
    """Get all matches with team points for stats page"""
    match_history = load_match_data(DATA_FILE)
    
    matches_list = []
    for match_num, match_data in match_history.items():
        team1_country = match_data.get("team1_country", "")
        team2_country = match_data.get("team2_country", "")
        match_winner = match_data.get("match_winner", "")
        match_title = match_data.get("match_title", "")
        match_entry = match_data.get("match_entry", {})
        
        # Calculate total points per team from match_entry (THIS IS KEY FOR STATS PAGE)
        team_points = {
            'Gully Divas': 0,
            'Janaki Royals': 0,
            'Konkan Queens': 0,
            'Rajputana Ranis': 0,
            'Sarafa Strikers': 0,
            'Singara Singapengal': 0,
            'Vanitha Warriors': 0,
        }
        for player, player_data in match_entry.items():
            team = player_data.get("dwl_team", "")
            points = player_data.get("final_pts", 0)
            team_points[team] = team_points.get(team, 0) + points
        
        matches_list.append({
            "id": match_num,
            "matchNum": match_num,
            "team1": team1_country,
            "team2": team2_country,
            "winner": match_winner,
            "title": match_title,
            "teamPoints": team_points  # ← THIS IS CRITICAL for the Stats
        })
    
    return sorted(matches_list, key=lambda x: x["matchNum"], reverse=True)


@app.get("/api/match-details/{match_num}")
async def get_match_details(match_num: int):
    """Get full match details including player points and stats for a specific match"""
    match_history = load_match_data(DATA_FILE)
    
    if match_num not in match_history:
        raise HTTPException(status_code=404, detail=f"Match {match_num} not found")
    
    match_data = match_history[match_num]
    match_entry = match_data.get("match_entry", {})
    team1_country = match_data.get("team1_country", "")
    team2_country = match_data.get("team2_country", "")
    match_winner = match_data.get("match_winner", "")
    match_title = match_data.get("match_title", "")
    
    # Calculate team totals and collect player details
    team_points = {
        'Gully Divas': 0,
        'Janaki Royals': 0,
        'Konkan Queens': 0,
        'Rajputana Ranis': 0,
        'Sarafa Strikers': 0,
        'Singara Singapengal': 0,
        'Vanitha Warriors': 0,
    }
    player_details = []
    
    for player_name, player_data in match_entry.items():
        dwl_team = player_data.get("dwl_team", "")
        country = player_data.get("country", "")
        final_pts = player_data.get("final_pts", 0)
        raw_pts = player_data.get("pts", 0)
        raw_batting_pts = player_data.get("regular_batting_pts", 0)
        raw_bowling_pts = player_data.get("regular_bowling_pts", 0)
        raw_fielding_pts = player_data.get("regular_fielding_pts", 0)
        super_over_pts = player_data.get("super_over_pts", 0)
        so_batting_pts = player_data.get("so_batting_pts", 0)
        so_bowling_pts = player_data.get("so_bowling_pts", 0)
        so_fielding_pts = player_data.get("so_fielding_pts", 0)
        is_motm = player_data.get("is_motm", False)
        stats = player_data.get("_stats", {})
        
        # Accumulate team points
        team_points[dwl_team] = team_points.get(dwl_team, 0) + final_pts
        
        # Collect player details for display
        player_details.append({
            "name": player_name,
            "country": country,
            "dwl_team": dwl_team,
            "points": round(final_pts, 1),
            "raw_points": round(raw_pts, 1),
            "raw_batting_pts": round(raw_batting_pts, 1),
            "raw_bowling_pts": round(raw_bowling_pts, 1),
            "raw_fielding_pts": round(raw_fielding_pts, 1),
            "super_over_pts": round(super_over_pts,1),
            "so_batting_pts": round(so_batting_pts, 1),
            "so_bowling_pts": round(so_bowling_pts, 1),
            "so_fielding_pts": round(so_fielding_pts, 1),
            "is_motm": is_motm,
            "runs": stats.get("runs", 0),
            "balls": stats.get("balls", 0),
            "fours": stats.get("fours", 0),
            "sixes": stats.get("sixes", 0),
            "wickets": stats.get("wickets", 0),
            "overs": stats.get("overs", 0),
            "maidens": stats.get("maidens", 0),
            "runs_conceded": stats.get("runs_c", 0),
            "catches": stats.get("catches", 0),
            "run_outs": stats.get("run_outs", 0),
            "stumpings": stats.get("stumpings", 0),
            "so_runs": stats.get("so_runs", 0),
            "so_balls": stats.get("so_balls", 0),
            "so_fours": stats.get("so_fours", 0),
            "so_sixes": stats.get("so_sixes", 0),
            "so_overs": stats.get("so_overs", 0),
            "so_maidens": stats.get("so_maidens", 0),
            "so_runs_conceded": stats.get("so_runs_c", 0),
            "so_wickets": stats.get("so_wickets", 0),
            "so_catches": stats.get("so_catches", 0),
            "so_run_outs": stats.get("so_run_outs", 0),
            "so_stumpings": stats.get("so_stumpings", 0),
            "multiplier": stats.get("mult", 1.0)
        })
    
    # Sort players by points descending
    player_details.sort(key=lambda x: x["points"], reverse=True)
    
    return {
        "match_num": match_num,
        "title": match_title,
        "team1": team1_country,
        "team2": team2_country,
        "winner": match_winner,
        "team_points": team_points,
        "players": player_details,
        "total_players": len(player_details)
    }


@app.post("/api/fetch-match")
async def fetch_match(request: MatchRequest):
    """Fetch a match from ESPN and calculate fantasy points"""
    global config_loaded
    
    try:
        print(f"\n📡 Fetching match {request.match_id} as M{request.match_num}")
        
        # Fetch scorecard
        sc = WWCScorecard(request.match_id, debug=False)
        await sc.fetch()

        # Get the full scorecard data
        full_data = sc.get_full_scorecard()
        match_info = full_data.get("match_info", {})
        match_result = match_info.get("result", "")
        
        # Check if match has begun BEFORE processing
        if "Match yet to begin" in match_result or "Match not started" in match_result:
            print(f"⚠️ Match {request.match_id} has not started yet")
            raise HTTPException(
                status_code=204, 
                detail="Match has not started yet. Please check back later"
            )
        
        # Ensure config is loaded
        if not config_loaded:
            await load_config()
            if not config_loaded:
                raise HTTPException(status_code=503, detail="Configuration not loaded. Please upload WWC_Config.xlsx")
        
        # Process scorecard
        result, unmatched, info_str = process_scorecard(
            sc.get_full_scorecard(),
            request.match_num,
            teams_data["name_lookup"],
            teams_data["player_team"],
            teams_data["capt_vc"],
            teams_data["name_to_abbr"],
            teams_data["abbr_to_name"],
            player_country=teams_data["player_country"],
            country_wicketkeepers=teams_data.get("country_wicketkeepers", {}),
            debug=False
        )

        match_entry = result["match_entry"]
        team1_country = result["team1_country"]
        team2_country = result["team2_country"]
        match_winner = result["match_winner"]
        
        # Save to Supabase
        match_history = load_match_data(DATA_FILE)
        
        # Check if duplicate match exists BEFORE adding to history
        if info_str in json.dumps(match_history):
            print(f"⚠️ Match already exists. Not adding duplicate entry.")
            raise HTTPException(
                status_code=409, 
                detail="Match already exists in history. Duplicate entry not added."
            )
        
        match_history[request.match_num] = {
            "match_entry": match_entry,
            "team1_country": team1_country,
            "team2_country": team2_country,
            "match_winner": match_winner,
            "match_title": info_str
        }
        save_match_data(match_history, DATA_FILE)

        try:
            os.makedirs("espn_names_match", exist_ok=True)
            # Extract ESPN names for analysis
            extract_espn_names(sc.get_full_scorecard(), f"espn_names_match/match_{request.match_num}.txt")
        except Exception as espn_error:
            print(f"⚠️ Warning: Could not save ESPN names match: {espn_error}")
        
        
        # ========== Update Excel file ==========
        
        print(f"📝 Updating Excel file...")

        use_supabase = is_production_mode()
        print(f"   Storage mode: {'PRODUCTION (Supabase)' if use_supabase else 'LOCAL (file)'}")

        sb_client: Client | None = None
        if use_supabase:
            sb_client = get_supabase_client()
            if not sb_client:
                raise HTTPException(status_code=503, detail="Supabase client not available")
        
        try:
            # Load existing match history
            all_match_nums = sorted(match_history.keys())
            
            # Get teams data for Excel generation
            # Note: generate_excel now takes use_supabase parameter to decide where to save the file
            teams_abbr = teams_data.get("teams_abbr", {})
            rosters = teams_data.get("rosters", {})
            capt_vc = teams_data.get("capt_vc", {})
            name_to_abbr = teams_data.get("name_to_abbr", {})
            player_country = teams_data.get("player_country", {})
            player_status = teams_data.get("player_status", {})
            
            # Generate fresh Excel file with all matches
            generate_excel(
                sb_client if sb_client else None,
                EXCEL_FILE_PATH,
                teams_abbr,
                rosters,
                capt_vc,
                match_history,
                all_match_nums,
                player_country,
                player_status,
                use_supabase=use_supabase
            )
        except Exception as excel_error:
            print(f"⚠️ Warning: Could not update Excel file: {excel_error}")
        # ========== END Excel update ==========
        
        # ========== Save ESPN match info to separate file ==========
        espn_info_path = f"espn_match_info/match_{request.match_num}.json"
        print(f"💾 Saving ESPN match info to: {os.path.abspath(espn_info_path)}")
        
        try:
            # Create directory if it doesn't exist
            
            os.makedirs("espn_match_info", exist_ok=True)
            
            # Get full scorecard data
            full_data = sc.get_full_scorecard()
            
            # Save to file
            with open(espn_info_path, 'w', encoding='utf-8') as f:
                json.dump(full_data, f, indent=2, ensure_ascii=False)
            print(f"✅ ESPN match info saved successfully")
        except Exception as espn_error:
            print(f"⚠️ Warning: Could not save ESPN match info: {espn_error}")
        # ========== END ESPN info save ==========
        
        print(f"✅ Match {request.match_num} processed successfully!")
        print(f"   Countries: {team1_country} vs {team2_country}")
        print(f"   Winner: {match_winner}")
        print(f"   Players matched: {len(match_entry)}")
        if unmatched:
            print(f"   Unmatched: {len(unmatched)}")
        
        return {
            "success": True,
            "match_num": request.match_num,
            "team1": team1_country,
            "team2": team2_country,
            "match_winner": match_winner,
            "match_entry": match_entry,
            "unmatched": unmatched[:20] if len(unmatched) > 20 else unmatched,
            "info": info_str
        }
        
    except Exception as e:
        print(f"❌ Error fetching match: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/download-excel")
async def download_excel():
    """Download the DWL_Scores.xlsx file - from Supabase or local based on mode."""

    if is_production_mode():
        # Production mode: Download from Supabase Storage
        sb_client = get_supabase_client()
        if not sb_client:
            raise HTTPException(status_code=503, detail="Supabase client not available")
    
        try:
            # Download from Supabase Storage
            response = sb_client.storage.from_(BUCKET_NAME).download(EXCEL_FILE_PATH)
            
            # Return as file download
            return Response(
                content=response,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": "attachment; filename=DWL_Scores.xlsx"}
            )
        except Exception as e:
            print(f"❌ Error downloading from Supabase: {e}")
            raise HTTPException(
                status_code=404, 
                detail="Excel file not found in Supabase. Generate it first by running the update process."
            )
    else:
        # Local mode: Read from local file
        excel_path = "DWL_Scores.xlsx"
        
        print("Current working directory:", os.getcwd())
        print("Looking for excel file at:", Path(excel_path).absolute())
        print(f"Found excel file? {Path(excel_path).absolute().exists()}")
        
        if not Path(excel_path).absolute().exists():
            raise HTTPException(status_code=404, detail="Excel file not found locally")
        
        return FileResponse(
            excel_path,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename="DWL_Scores.xlsx"
        )


@app.get("/api/espn-match-info/{match_num}")
async def get_espn_match_info(match_num: int):
    """Get the saved ESPN match info for a specific match"""
    espn_info_path = f"espn_match_info/match_{match_num}.json"
    
    if not Path(espn_info_path).exists():
        raise HTTPException(status_code=404, detail=f"No ESPN match info found for match {match_num}")
    
    with open(espn_info_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    return data


@app.get("/api/standings")
async def get_standings():
    """Get current standings"""
    teams = await get_teams()
    sorted_teams = sorted(teams, key=lambda x: x["totalPoints"], reverse=True)
    
    standings = []
    for idx, team in enumerate(sorted_teams):
        standings.append({
            "position": idx + 1,
            "team": team["name"],
            "abbr": team["abbr"],
            "matchesPlayed": team["matchesPlayed"],
            "wins": team["wins"],
            "points": team["totalPoints"]
        })
    
    return standings


@app.get("/api/storage-mode")
async def get_storage_mode():
    """Get current storage mode (local/production)."""
    mode = "local" if STORAGE_MODE == "local" else "production"
    return {
        "mode": mode,
        "is_local": mode == "local",
        "is_production": mode == "production"
    }


async def load_config():
    """Load DWL configuration"""
    global teams_data, players_data
    
    try:
        
        print("📖 Loading configuration from", CONFIG_PATH)
        
        (
            teams_abbr, rosters, player_team, capt_vc,
            name_lookup, abbr_to_name, name_to_abbr, all_roster_names,
            player_country, country_wicketkeepers, player_status,
        ) = read_dwl_config(CONFIG_PATH, debug=False)
        
        # Load player roles from config
        players_df = pd.read_excel(CONFIG_PATH, sheet_name="Players")
        players_df.columns = [c.strip() for c in players_df.columns]
        
        player_role = {}
        player_price = {}
        for _, row in players_df.iterrows():
            pname = str(row["Player Name"]).strip()
            role = str(row.get("Role", "")).strip().lower()
            price = row.get("Sold Price", 0) or row.get("Price", 0)
            if pname and pname != "nan":
                player_role[pname] = role
                if price and price != "nan":
                    try:
                        player_price[pname] = float(price)
                    except:
                        player_price[pname] = 0
        
        teams_data = {
            "teams_abbr": teams_abbr,
            "rosters": rosters,
            "player_team": player_team,
            "capt_vc": capt_vc,
            "name_lookup": name_lookup,
            "abbr_to_name": abbr_to_name,
            "name_to_abbr": name_to_abbr,
            "all_roster_names": all_roster_names,
            "player_country": player_country,
            "country_wicketkeepers": country_wicketkeepers,
            "player_status": player_status,
        }
        
        players_data = {
            "player_team": player_team,
            "player_country": player_country,
            "player_role": player_role,
            "player_price": player_price,
            "player_status": player_status,
        }
        
        print(f"   Loaded {len(abbr_to_name)} teams")
        print(f"   Loaded {len(player_team)} players")
        if player_status:
            injured = sum(1 for s in player_status.values() if s == "Injured")
            replacements = sum(1 for s in player_status.values() if s == "Replacement")
            if injured > 0 or replacements > 0:
                print(f"   Player status: {injured} injured, {replacements} replacements")
        
    except Exception as e:
        print(f"❌ Error loading config: {e}")
        raise


if __name__ == "__main__":
    uvicorn.run(
        "api_server:app",
        host="127.0.0.1",
        port=8000,
        reload=False,
        log_level="info"
    )