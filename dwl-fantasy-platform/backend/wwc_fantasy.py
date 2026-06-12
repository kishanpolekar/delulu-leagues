#!/usr/bin/env python3
"""
WWC Fantasy Points Calculator - Standalone script to fetch match scorecards and calculate fantasy points
Supports Super Over (one-over eliminator) stats
Usage: python wwc_fantasy.py -m 1529304
"""

import json
import re
import asyncio
import argparse
from playwright.async_api import async_playwright


# ============================================================================
# CONSTANTS
# ============================================================================

WWC_SERIES_ID: int = 1483859 # WWC 2026 Series ID - CHANGE THIS FOR DIFFERENT SEASONS


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def overs_to_decimal(overs: float) -> float:
    """Convert cricket overs notation to decimal.
    e.g. 0.4 (4 balls) -> 0.6667
         1.2 (1 over 2 balls) -> 1.3333
    """
    if overs is None or overs == 0:
        return 0.0
    whole: int = int(overs)
    extra_balls: float = round((overs - whole) * 10)
    return (whole * 6 + extra_balls) / 6


# ============================================================================
# FANTASY POINTS CALCULATION RULES
# ============================================================================
class FantasyPointsCalculator:
    """Calculate fantasy points based on WWC scoring rules."""
    
    # Batting points
    RUN_POINT: int = 1
    FOUR_BONUS: int = 1
    SIX_BONUS: int = 2
    FIFTY_BONUS: int = 25
    HUNDRED_BONUS: int = 50
    ONE_FIFTY_BONUS: int = 75
    DUCK_PENALTY: int = -15
    GOLDEN_DUCK_PENALTY: int = -25
    DIAMOND_DUCK_PENALTY: int = -35
    
    # Strike rate bonus thresholds (SR range -> points)
    SR_BONUS: list[tuple[int, int, int]] = [
        (150, 175, 5), (175, 200, 10), (200, 225, 15), (225, 250, 20),
        (250, 275, 25), (275, 300, 30), (300, 325, 35), (325, 350, 40),
        (350, 600, 45), (600, 1000, 50)
    ]
    SR_PENALTY: int = -15  # For SR < 100 (minimum 3 balls, not out on zero)
    
    # Bowling points
    WICKET_POINT: int = 40
    THREE_WICKET_HAUL_BONUS: int = 25
    FOUR_WICKET_HAUL_BONUS: int = 35
    FIVE_WICKET_HAUL_BONUS: int = 50
    SIX_WICKET_HAUL_BONUS: int = 75
    HATTRICK_BONUS: int = 45
    MAIDEN_OVER_BONUS: int = 20
    
    # Economy rate bonus thresholds
    ECON_BONUS: list[tuple[int, int, int]] = [
        (0, 4, 50), (4, 5, 35), (5, 6, 25), (6, 7, 15), (7, 8, 10)
    ]
    # Economy rate penalties thresholds
    ECON_PENALTIES: list[tuple[int, int, int]] = [
        (12, 14, -10), (14, 16, -15), (16, 20, -20)
    ]
    ECON_FINAL_PENALTY: int = -25  # For economy >= 20 (minimum 6 balls)
    
    # Fielding points
    FIELDING_POINT: int = 30  # Any type of dismissal (catch, run-out, stumping)
    
    # Bonuses
    POTM_BONUS: int = 50
    
    @classmethod
    def calculate_batting_points(cls, runs: int, balls: int, fours: int, sixes: int, 
                                  is_out: bool, dismissal: str = "", is_super_over: bool = False) -> dict[str, int | dict]:
        """Calculate batting fantasy points."""
        points: int = 0
        breakdown: dict[str, int] = {}
        
        # Runs
        if runs > 0:
            points += runs * cls.RUN_POINT
            breakdown["runs"] = runs * cls.RUN_POINT
        
        # Fours and Sixes
        if fours > 0:
            points += fours * cls.FOUR_BONUS
            breakdown["fours"] = fours * cls.FOUR_BONUS
        if sixes > 0:
            points += sixes * cls.SIX_BONUS
            breakdown["sixes"] = sixes * cls.SIX_BONUS
        
        # Strike Rate Bonus (apply to Super Over as well)
        if balls >= 3 and runs >= 0:
            sr: float = (runs / balls) * 100
            sr_applied: bool = False
            
            for low, high, bonus in cls.SR_BONUS:
                if low <= sr < high:
                    points += bonus
                    breakdown[f"sr_{int(low)}_{int(high)}"] = bonus
                    sr_applied = True
                    break
            
            # Strike rate penalty for SR < 100 (with 3+ balls faced)
            # Penalty applies if: runs > 0 OR player is NOT out
            if not sr_applied and sr < 100 and (runs > 0 or not is_out):
                points += cls.SR_PENALTY
                breakdown["sr_penalty"] = cls.SR_PENALTY
        
        # Fifty, Hundred, Hundred-Fifty bonuses (NOT APPLICABLE for Super Over)
        if not is_super_over:
            if runs >= 150:
                points += cls.ONE_FIFTY_BONUS
                breakdown["150_plus"] = cls.ONE_FIFTY_BONUS
            elif runs >= 100:
                points += cls.HUNDRED_BONUS
                breakdown["century"] = cls.HUNDRED_BONUS
            elif runs >= 50:
                points += cls.FIFTY_BONUS
                breakdown["fifty"] = cls.FIFTY_BONUS
        
        # Duck penalties (apply to Super Over as well)
        if runs == 0 and is_out:
            dismissal_lower: str = dismissal.lower()
            if balls == 1:
                points += cls.GOLDEN_DUCK_PENALTY
                breakdown["golden_duck"] = cls.GOLDEN_DUCK_PENALTY
            elif balls == 0:
                points += cls.DIAMOND_DUCK_PENALTY
                breakdown["diamond_duck"] = cls.DIAMOND_DUCK_PENALTY
            else:
                points += cls.DUCK_PENALTY
                breakdown["duck"] = cls.DUCK_PENALTY
        
        return {"total": points, "breakdown": breakdown}
    
    @classmethod
    def calculate_bowling_points(cls, overs: float, maidens: int, runs_conceded: int,
                                  wickets: int, is_super_over: bool = False, has_hattrick: bool = False) -> dict[str, int | dict]:
        """Calculate bowling fantasy points."""
        points: int = 0
        breakdown: dict[str, int] = {}
        
        # Wickets
        if wickets > 0:
            points += wickets * cls.WICKET_POINT
            breakdown["wickets"] = wickets * cls.WICKET_POINT
        
        # Wicket haul bonus (NOT APPLICABLE for Super Over)
        if not is_super_over:
            if wickets >= 6:
                points += cls.SIX_WICKET_HAUL_BONUS
                breakdown["6_wicket_haul"] = cls.SIX_WICKET_HAUL_BONUS
            elif wickets >= 5:
                points += cls.FIVE_WICKET_HAUL_BONUS
                breakdown["5_wicket_haul"] = cls.FIVE_WICKET_HAUL_BONUS
            elif wickets >= 4:
                points += cls.FOUR_WICKET_HAUL_BONUS
                breakdown["4_wicket_haul"] = cls.FOUR_WICKET_HAUL_BONUS
            elif wickets >= 3:
                points += cls.THREE_WICKET_HAUL_BONUS
                breakdown["3_wicket_haul"] = cls.THREE_WICKET_HAUL_BONUS
        
        # Hat-trick bonus (can apply in Super Over)
        if has_hattrick:
            points += cls.HATTRICK_BONUS
            breakdown["hattrick"] = cls.HATTRICK_BONUS
        
        # Maiden over bonus (can apply in Super Over)
        if maidens > 0:
            points += maidens * cls.MAIDEN_OVER_BONUS
            breakdown["maidens"] = maidens * cls.MAIDEN_OVER_BONUS
        
        # Economy Rate Bonus (APPLICABLE for both Regular and Super Over)
        # Convert cricket overs to decimal to check minimum balls requirement
        decimal_overs: float = overs_to_decimal(overs)
        if decimal_overs >= 1.0:  # Minimum 6 balls (1.0 decimal overs)
            economy: float = runs_conceded / decimal_overs if decimal_overs > 0 else 0
            econ_applied: bool = False
            
            for low, high, bonus in cls.ECON_BONUS:
                if low <= economy < high:
                    points += bonus
                    breakdown[f"econ_{low}_{high}"] = bonus
                    econ_applied = True
                    break
            
            for low, high, penalty in cls.ECON_PENALTIES:
                if low <= economy < high:
                    points += penalty
                    breakdown[f"econ_{low}_{high}"] = penalty
                    econ_applied = True
                    break
            
            if not econ_applied and economy >= 20:
                points += cls.ECON_FINAL_PENALTY
                breakdown["econ_final_penalty"] = cls.ECON_FINAL_PENALTY
        
        return {"total": points, "breakdown": breakdown}
    
    @classmethod
    def calculate_fielding_points(cls, catches: int, run_outs: int, stumpings: int) -> dict[str, int | dict]:
        """Calculate fielding fantasy points."""
        total_dismissals: int = catches + run_outs + stumpings
        points: int = total_dismissals * cls.FIELDING_POINT
        return {"total": points, "breakdown": {"fielding": points} if points > 0 else {}}
    
    @classmethod
    def calculate_total_points(cls, batting: dict, bowling: dict, fielding: dict, is_motm: bool = False) -> int:
        """Calculate total fantasy points including Man of the Match bonus."""
        total: int = batting.get("total", 0) + bowling.get("total", 0) + fielding.get("total", 0)
        if is_motm:
            total += cls.POTM_BONUS
        return total


class WWCScorecard:
    """Fetch and parse WWC match scorecards directly from ESPNcricinfo."""
    
    def __init__(self, match_id: int, debug: bool = False):
        self.match_id: int = match_id
        self.series_id: int = WWC_SERIES_ID
        self.debug: bool = debug
        self.url: str = f"https://www.espncricinfo.com/series/icc-women-s-t20-world-cup-2026-{self.series_id}/match-{match_id}/full-scorecard"
        self.raw_data: dict | None = None
        self.next_data: dict | None = None
        self.page_content: str | None = None
        self.players: dict = {}
        self.team_mapping: dict = {}
        self.batting_first_team: str | None = None
        self.bowling_first_team: str | None = None
        self.player_of_match: str | None = None
        self.player_of_match_full_name: str | None = None
        self.impact_subs: dict = {}
        self.home_team: str | None = None
        self.away_team: str | None = None
        self.has_super_over: bool = False
        self.super_over_data: list | None = None
        
        self.colors: dict[str, str] = {
            "gold": "\033[93m",      # Player of the Match
            "green": "\033[92m",     # Subbed in
            "red": "\033[91m",       # Subbed out
            "cyan": "\033[96m",      # Fantasy Points
            "yellow": "\033[93m",    # Super Over points
            "reset": "\033[0m"
        }
        
        # Team full names mapping
        self.team_full_names: dict[str, str] = {
            "AUS-W": "AUSTRALIA WOMEN",
            "BAN-W": "BANGLADESH WOMEN",
            "IND-W": "INDIA WOMEN",
            "NL-W": "NETHERLANDS WOMEN",
            "PAK-W": "PAKISTAN WOMEN",
            "SA-W": "SOUTH AFRICA WOMEN",
            "ENG-W": "ENGLAND WOMEN",
            "IRE-W": "IRELAND WOMEN",
            "NZ-W": "NEW ZEALAND WOMEN",
            "SCO-W": "SCOTLAND WOMEN",
            "SL-W": "SRI LANKA WOMEN",
            "WI-W": "WEST INDIES WOMEN"
        }
    
    async def fetch(self):
        """Fetch the match page and extract __NEXT_DATA__."""
        async with async_playwright() as pw:
            browser = await pw.webkit.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15"
            )
            page = await context.new_page()
            
            print(f"📡 Fetching match: {self.url}")
            await page.goto(self.url, wait_until="domcontentloaded", timeout=60000)
            
            content: str = await page.content()
            self.page_content = content
            await browser.close()
            
            match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', content, re.DOTALL)
            if not match:
                raise Exception("Could not find __NEXT_DATA__ in page")
            
            self.next_data = json.loads(match.group(1))
            self.raw_data = self._extract_match_data()
            self._extract_player_of_match()
            self._build_team_mapping()
            self._determine_home_away_teams()
            self._check_for_super_over()
            self._build_player_stats()
            return self
    
    def _extract_match_data(self) -> dict:
        try:
            app_data = self.next_data["props"]["appPageProps"]["data"]
            if "match" in app_data and "content" in app_data:
                data = app_data
            elif "data" in app_data:
                data = app_data["data"]
            else:
                raise KeyError("No match/content in appPageProps.data")
            
            return {
                "match": data.get("match", {}),
                "content": data.get("content", {}),
                "match_players": data.get("matchPlayers", {})
            }
        except KeyError as e:
            raise Exception(f"Unexpected __NEXT_DATA__ structure: {e}")
    
    def _extract_player_of_match(self) -> None:
        content: dict = self.raw_data.get("content", {})
        
        if "matchPlayerAwards" in content:
            awards: list = content["matchPlayerAwards"]
            for award in awards:
                if award.get("type") == "PLAYER_OF_MATCH":
                    self.player_of_match_full_name = award.get("player", {}).get("longName")
                    self.player_of_match = award.get("player", {}).get("name")
                    break
        
        if not self.player_of_match and "playerOfMatch" in content:
            pom_data = content["playerOfMatch"]
            if isinstance(pom_data, dict):
                self.player_of_match_full_name = pom_data.get("longName")
                self.player_of_match = pom_data.get("name")
            elif isinstance(pom_data, str):
                self.player_of_match = pom_data
    
    def _build_team_mapping(self) -> None:
        teams: list = self.raw_data["match"].get("teams", [])
        for team in teams:
            team_obj = team["team"]
            object_id: str = str(team_obj["objectId"])
            self.team_mapping[object_id] = team_obj["abbreviation"]
    
    def _determine_home_away_teams(self) -> None:
        """Determine home and away teams from match data."""
        match: dict = self.raw_data.get("match", {})
        teams: list = match.get("teams", [])
        
        for team in teams:
            team_obj: dict = team.get("team", {})
            is_home: bool = team.get("isHome", False)
            abbreviation: str = team_obj.get("abbreviation", "")
            
            if is_home:
                self.home_team = abbreviation
            else:
                self.away_team = abbreviation
        
        if self.debug:
            print(f"DEBUG: Home team: {self.home_team}, Away team: {self.away_team}")
    
    def _check_for_super_over(self) -> None:
        """Check if the match has a Super Over."""
        content: dict = self.raw_data.get("content", {})
        super_over_innings: list = content.get("superOverInnings", [])
        
        if super_over_innings and len(super_over_innings) > 0:
            self.has_super_over = True
            self.super_over_data = super_over_innings
            if self.debug:
                print(f"DEBUG: Super Over detected with {len(super_over_innings)} innings")
    
    def _add_squad_members(self) -> None:
        """Add all squad members to self.players even if they didn't bat or bowl."""
        content: dict = self.raw_data.get("content", {})
        match_players: dict = content.get("matchPlayers", {})
        team_players_list: list = match_players.get("teamPlayers", [])
        
        for tp in team_players_list:
            team_obj: dict = tp.get("team", {})
            team_id: str = str(team_obj.get("objectId", ""))
            team_abbr: str = self.team_mapping.get(team_id, "")
            
            for player in tp.get("players", []):
                full_name: str = player.get("longName", "")
                short_name: str = player.get("name", "")
                
                if not full_name:
                    continue
                
                if full_name not in self.players:
                    self.players[full_name] = {
                        "full_name": full_name,
                        "short_name": short_name,
                        "fielding_name": player.get("fieldingName", ""),
                        "player_id": player.get("objectId"),
                        "team": team_abbr,
                        "batting": [],
                        "bowling": [],
                        "fielding": {"catches": 0, "run_outs": 0, "stumpings": 0},
                        "super_over_batting": [],
                        "super_over_bowling": [],
                        "super_over_fielding": {"catches": 0, "run_outs": 0, "stumpings": 0},
                        "impact_role": None,
                        "fantasy_points": 0,
                        "super_over_points": 0
                    }
                    if self.debug:
                        print(f"DEBUG: Added squad member {full_name} ({short_name}) to team {team_abbr}")
                elif not self.players[full_name].get("team"):
                    self.players[full_name]["team"] = team_abbr
    
    def _create_temporary_player(self, name: str, team: str) -> None:
        """Create a temporary player entry for a fielder not in the match data."""
        temp_name: str = name.strip()
        
        if temp_name not in self.players:
            self.players[temp_name] = {
                "full_name": temp_name,
                "short_name": temp_name,
                "fielding_name": name, # (for temporary players, use the name itself as fielding name)
                "player_id": None,
                "team": team,
                "batting": [],
                "bowling": [],
                "fielding": {"catches": 0, "run_outs": 0, "stumpings": 0},
                "super_over_batting": [],
                "super_over_bowling": [],
                "super_over_fielding": {"catches": 0, "run_outs": 0, "stumpings": 0},
                "impact_role": None,
                "fantasy_points": 0,
                "super_over_points": 0
            }
            if self.debug:
                print(f"DEBUG: Created temporary player '{temp_name}' for team {team}")
        else:
            if self.players[temp_name].get("team") is None:
                self.players[temp_name]["team"] = team
                if self.debug:
                    print(f"DEBUG: Updated team for existing player '{temp_name}' to {team}")
    
    def _process_super_over_stats(self) -> None:
        """Process Super Over batting and bowling stats separately."""
        if not self.has_super_over or not self.super_over_data:
            return
        
        if self.debug:
            print("DEBUG: Processing Super Over stats")
        
        for inning_idx, inning in enumerate(self.super_over_data, 1):
            # Get the batting team for this Super Over innings
            batting_team_obj: dict = inning.get("team", {})
            batting_team_id: str = str(batting_team_obj.get("objectId", ""))
            batting_team: str = self.team_mapping.get(batting_team_id, "")
            
            # Bowling team is the other team
            bowling_team: str | None = None
            for team_id, team_abbr in self.team_mapping.items():
                if team_id != batting_team_id:
                    bowling_team = team_abbr
                    break
            
            # Process Super Over batting stats
            for batsman in inning.get("inningBatsmen", []):
                player: dict = batsman.get("player", {})
                full_name: str = player.get("longName", "")
                short_name: str = player.get("name", "")
                
                if not full_name:
                    continue
                
                if full_name not in self.players:
                    self._create_temporary_player(full_name, batting_team)
                
                batted: bool = batsman.get("battedType") == "yes"
                is_out: bool = batsman.get("isOut", False)
                
                self.players[full_name]["super_over_batting"].append({
                    "innings": inning_idx,
                    "runs": batsman.get("runs") if batted else None,
                    "balls": batsman.get("balls") if batted else None,
                    "fours": batsman.get("fours") if batted else None,
                    "sixes": batsman.get("sixes") if batted else None,
                    "is_out": is_out,
                    "dismissal": batsman.get("dismissalText", {}).get("long", "out") if is_out else "not out"
                })
                if self.debug:
                    print(f"DEBUG: Super Over batting for {full_name}: {batsman.get('runs')} runs")
            
            # Process Super Over bowling stats
            for bowler in inning.get("inningBowlers", []):
                player: dict = bowler.get("player", {})
                full_name: str = player.get("longName", "")
                short_name: str = player.get("name", "")
                
                if not full_name:
                    continue
                
                if full_name not in self.players:
                    self._create_temporary_player(full_name, bowling_team)
                
                overs = bowler.get("overs")
                self.players[full_name]["super_over_bowling"].append({
                    "innings": inning_idx,
                    "overs": float(overs) if overs is not None else None,
                    "maidens": bowler.get("maidens"),
                    "runs": bowler.get("conceded"),
                    "wickets": bowler.get("wickets"),
                    "economy": bowler.get("economy")
                })
                if self.debug:
                    print(f"DEBUG: Super Over bowling for {full_name}: {bowler.get('wickets')} wickets")
            
            # Process Super Over fielding stats - USE SAME LOGIC AS REGULAR FIELDING
            for batsman in inning.get("inningBatsmen", []):
                if batsman.get("isOut"):
                    dismissal_text: dict = batsman.get("dismissalText", {})
                    fielder_text: str = dismissal_text.get("fielderText")
                    
                    if fielder_text:
                        fielder_name: str = self._extract_fielder_name(fielder_text)
                        has_dagger: bool = '†' in fielder_text
                        
                        if fielder_name:
                            # First try to find existing player using the same matching logic
                            matched_player: str | None = self._find_best_player_match(fielder_name, bowling_team)
                            
                            if matched_player:
                                # Player found in existing players
                                dismissal_short: str = dismissal_text.get("short", "").lower()
                                if "caught" in dismissal_short:
                                    self.players[matched_player]["super_over_fielding"]["catches"] += 1
                                elif "stumped" in dismissal_short:
                                    self.players[matched_player]["super_over_fielding"]["stumpings"] += 1
                                elif "run out" in dismissal_short:
                                    self.players[matched_player]["super_over_fielding"]["run_outs"] += 1
                                if self.debug:
                                    print(f"DEBUG: Super Over fielding - {fielder_name} matched to {matched_player}")
                            else:
                                # Create temporary player only if no match found
                                self._create_temporary_player(fielder_name, bowling_team)
                                dismissal_short = dismissal_text.get("short", "").lower()
                                if "caught" in dismissal_short:
                                    self.players[fielder_name]["super_over_fielding"]["catches"] += 1
                                elif "stumped" in dismissal_short:
                                    self.players[fielder_name]["super_over_fielding"]["stumpings"] += 1
                                elif "run out" in dismissal_short:
                                    self.players[fielder_name]["super_over_fielding"]["run_outs"] += 1
                                if self.debug:
                                    print(f"DEBUG: Super Over fielding - created temporary player {fielder_name}")
    
    def _build_player_stats(self) -> None:
        """Build a complete stats dictionary for each player and calculate fantasy points."""
        content: dict = self.raw_data["content"]
        innings_raw: list = content.get("innings", [])
        
        if innings_raw:
            first_innings_team_id: str = str(innings_raw[0].get("team", {}).get("objectId", ""))
            self.batting_first_team = self.team_mapping.get(first_innings_team_id, "")
            for team_id, team_abbr in self.team_mapping.items():
                if team_id != first_innings_team_id:
                    self.bowling_first_team = team_abbr
                    break
        
        # Process regular innings
        for inning_idx, inning in enumerate(innings_raw, 1):
            batting_team_obj: dict = inning.get("team", {})
            batting_team_id: str = str(batting_team_obj.get("objectId", ""))
            batting_team: str = self.team_mapping.get(batting_team_id, "")
            
            bowling_team: str | None = None
            for team_id, team_abbr in self.team_mapping.items():
                if team_id != batting_team_id:
                    bowling_team = team_abbr
                    break
            
            # Process batting stats
            for batsman in inning.get("inningBatsmen", []):
                player: dict = batsman.get("player", {})
                full_name: str = player.get("longName", "")
                short_name: str = player.get("name", "")
                
                if not full_name:
                    continue
                
                if full_name not in self.players:
                    self.players[full_name] = {
                        "full_name": full_name,
                        "short_name": short_name,
                        "fielding_name": player.get("fieldingName", ""),
                        "player_id": player.get("objectId"),
                        "team": batting_team,
                        "batting": [],
                        "bowling": [],
                        "fielding": {"catches": 0, "run_outs": 0, "stumpings": 0},
                        "super_over_batting": [],
                        "super_over_bowling": [],
                        "super_over_fielding": {"catches": 0, "run_outs": 0, "stumpings": 0},
                        "impact_role": None,
                        "fantasy_points": 0,
                        "super_over_points": 0
                    }
                elif not self.players[full_name].get("team"):
                    self.players[full_name]["team"] = batting_team
                
                batted: bool = batsman.get("battedType") == "yes"
                is_out: bool = batsman.get("isOut", False)
                
                if not batted:
                    dismissal: str = "did not bat"
                elif is_out:
                    dismissal_raw: dict = batsman.get("dismissalText", {})
                    dismissal = dismissal_raw.get("long", "out")
                else:
                    dismissal = "not out"
                
                self.players[full_name]["batting"].append({
                    "innings": inning_idx,
                    "runs": batsman.get("runs") if batted else None,
                    "balls": batsman.get("balls") if batted else None,
                    "fours": batsman.get("fours") if batted else None,
                    "sixes": batsman.get("sixes") if batted else None,
                    "strike_rate": batsman.get("strikerate") if batted else None,
                    "is_out": is_out,
                    "dismissal": dismissal
                })
            
            # Process bowling stats
            for bowler in inning.get("inningBowlers", []):
                player: dict = bowler.get("player", {})
                full_name: str = player.get("longName", "")
                short_name: str = player.get("name", "")
                
                if not full_name:
                    continue
                
                if full_name not in self.players:
                    self.players[full_name] = {
                        "full_name": full_name,
                        "short_name": short_name,
                        "fielding_name": player.get("fieldingName", ""),
                        "player_id": player.get("objectId"),
                        "team": bowling_team,
                        "batting": [],
                        "bowling": [],
                        "fielding": {"catches": 0, "run_outs": 0, "stumpings": 0},
                        "super_over_batting": [],
                        "super_over_bowling": [],
                        "super_over_fielding": {"catches": 0, "run_outs": 0, "stumpings": 0},
                        "impact_role": None,
                        "fantasy_points": 0,
                        "super_over_points": 0
                    }
                elif not self.players[full_name].get("team"):
                    self.players[full_name]["team"] = bowling_team
                
                overs = bowler.get("overs")
                self.players[full_name]["bowling"].append({
                    "innings": inning_idx,
                    "overs": float(overs) if overs is not None else None,
                    "maidens": bowler.get("maidens"),
                    "runs": bowler.get("conceded"),
                    "wickets": bowler.get("wickets"),
                    "economy": bowler.get("economy"),
                    "dots": bowler.get("dots")
                })
        
        # Add all squad members who haven't been added yet
        self._add_squad_members()
        
        # Process Super Over stats if present
        if self.has_super_over:
            self._process_super_over_stats()

         # ========== NEW: Detect hat-tricks from notes ==========
        hat_tricks = self._detect_hattricks_from_notes()
        if self.debug and hat_tricks:
            print(f"DEBUG: Hat-tricks detected: {hat_tricks}")
        
        self._add_fielding_stats()
        self._calculate_fantasy_points(hat_tricks)
        
        if self.debug:
            print("\nDEBUG: Players with fielding stats:")
            for full_name, player_data in self.players.items():
                catches: int = player_data["fielding"]["catches"]
                run_outs: int = player_data["fielding"]["run_outs"]
                stumpings: int = player_data["fielding"]["stumpings"]
                so_catches: int = player_data["super_over_fielding"]["catches"]
                so_run_outs: int = player_data["super_over_fielding"]["run_outs"]
                so_stumpings: int = player_data["super_over_fielding"]["stumpings"]
                if catches > 0 or run_outs > 0 or stumpings > 0 or so_catches > 0 or so_run_outs > 0 or so_stumpings > 0:
                    print(f"  {full_name} ({player_data.get('team', '?')}): C={catches}, RO={run_outs}, St={stumpings} | SO: C={so_catches}, RO={so_run_outs}, St={so_stumpings}")
    
    def _extract_fielder_name(self, fielder_text: str) -> str:
        """Extract actual fielder name from fielderText."""
        if not fielder_text:
            return ""
        
        fielder_name = fielder_text.strip()
        
        # Remove ALL dagger symbols using regex (handles any Unicode dagger)
        # This matches †, ‡, and any other dagger variant
        fielder_name = re.sub(r'[†‡\u2020\u2021]', '', fielder_name)
        fielder_name = fielder_name.strip()
        
        # Now remove wicketkeeper indicator (daggers are already gone)
        if fielder_name.startswith("c "):
            fielder_name = fielder_name[2:].strip()
        if fielder_name.startswith("st "):
            fielder_name = fielder_name[3:].strip()
        
        # Handle substitute fielder pattern
        sub_match = re.search(r'sub\s*\(\s*([^)]+)\s*\)', fielder_name, re.IGNORECASE)
        if not sub_match:
            sub_match = re.search(r'sub\s+([A-Za-z\s]+)', fielder_name, re.IGNORECASE)
        
        if sub_match:
            fielder_name = sub_match.group(1).strip()
        
        fielder_name = re.sub(r'^sub\s*', '', fielder_name, flags=re.IGNORECASE).strip()
        
        # Final cleanup - remove any remaining dagger just in case
        fielder_name = re.sub(r'[†‡\u2020\u2021]', '', fielder_name).strip()
        
        return fielder_name
    
    def _get_match_score(self, full_name: str, search_name: str, search_parts: list) -> int:
        """Calculate how well the search name matches the player."""
        player_data: dict = self.players[full_name]
        player_short: str = player_data.get("short_name", "").lower()
        player_full: str = full_name.lower()
        
        score: int = 0
        
        # EXACT MATCHES get highest priority
        # Exact match on full name (case-insensitive)
        if search_name == player_full:
            score = 10000
        # Exact match on short name
        elif search_name == player_short:
            score = 9000
        
        # FULL NAME CONTAINS SEARCH (search name is a subset of full name)
        # The longer the search name, the higher the score
        elif search_name in player_full:
            score = 5000 + len(search_name)
        # Search name contains the full name (full name is a subset of search)
        elif player_full in search_name:
            score = 4000 + len(player_full)
        
        # SHORT NAME MATCHES
        # Short name contains search
        elif search_name in player_short:
            score = 3000 + len(search_name)
        # Search contains short name
        elif player_short in search_name:
            score = 2000 + len(player_short)
        
        # CHECK FIRST PART (first name or initial)
        if len(search_parts) >= 1:
            first: str = search_parts[0].lower()
            player_first: str = player_short.split()[0] if player_short.split() else ""
            
            # Exact first name match
            if first == player_first:
                score += 800
            # Player first name starts with search first
            elif player_first.startswith(first):
                score += 400
            # Search first starts with player first
            elif first.startswith(player_first):
                score += 300
        
        # HANDLE SINGLE WORD (just last name) - prefer shorter player name
        if len(search_parts) == 1:
            # Single word - shorter player name gets higher score
            score += (500 - len(player_full))
        else:
            # Multiple words - prefer player whose short name starts with first word
            if len(search_parts) >= 1:
                first = search_parts[0].lower()
                if player_short.startswith(first):
                    score += 200
        
        return score
    
    def _find_best_player_match(self, name: str, team_abbr: str = None) -> str | None:
        """Find the best matching player in the roster."""
        if not name:
            return None
        
        name_lower: str = name.lower().strip()
        
        # First, check if this is a substitute fielder (contains 'sub')
        is_substitute: bool = 'sub' in name_lower
        
        # Build list of candidates in this team
        candidates: list[tuple[str, int]] = []
        for full_name, player_data in self.players.items():
            if team_abbr and player_data.get("team") != team_abbr:
                continue
            
            # Check for matches
            full_lower: str = full_name.lower()
            short_name: str = player_data.get("short_name", "").lower()
            
            # Exact match on full name
            if full_lower == name_lower:
                candidates.append((full_name, 100))
            # Exact match on short name
            elif short_name == name_lower:
                candidates.append((full_name, 95))
            # Full name contains the search name
            elif name_lower in full_lower:
                candidates.append((full_name, 70))
            # Search name contains full name
            elif full_lower in name_lower:
                candidates.append((full_name, 70))
            # Last name match (for names like "Pandey", "Roy")
            elif ' ' not in name_lower and full_lower.split()[-1] == name_lower:
                candidates.append((full_name, 50))
            # Initial match (e.g., "S Mandhana" vs "Smriti Mandhana")
            elif ' ' in name_lower and len(name_lower.split()[0]) <= 2:
                parts: list = name_lower.split()
                init: str = parts[0]
                last: str = parts[-1]
                full_parts: list = full_lower.split()
                if len(full_parts) >= 2 and full_parts[-1] == last and full_parts[0].startswith(init):
                    candidates.append((full_name, 60))
        
        if not candidates:
            return None
        
        # If this is a substitute fielder, check for duplicate last names in the team
        if is_substitute:
            # Get the last name from the search name
            last_name: str = name_lower.split()[-1] if ' ' in name_lower else name_lower
            
            # Count how many players in this team have the same last name
            same_last_name_count: int = 0
            for full_name, player_data in self.players.items():
                if team_abbr and player_data.get("team") == team_abbr:
                    player_last: str = full_name.lower().split()[-1]
                    if player_last == last_name:
                        same_last_name_count += 1
            
            # If there are multiple players with same last name, ONLY match exact full name
            if same_last_name_count > 1:
                # Filter candidates to only exact full name matches
                exact_matches: list = [c for c in candidates if c[1] >= 95]
                if exact_matches:
                    return exact_matches[0][0]
                # No exact match - create new temporary player instead of matching incorrectly
                return None
        
        # Return the candidate with highest score
        candidates.sort(key=lambda x: x[1], reverse=True)
        return candidates[0][0]

    def _add_fielding_stats(self) -> None:
        """Add fielding statistics to players based on dismissal data."""
        content: dict = self.raw_data["content"]
        innings_raw: list = content.get("innings", [])
        
        # Build mapping from short name to full name (for quick lookup)
        short_to_full: dict = {}
        for full_name, player_data in self.players.items():
            short_name: str = player_data.get("short_name", "")
            if short_name:
                short_to_full[short_name.lower()] = full_name
        
        # Note: Wicketkeepers are now determined from the config file's Role column
        # We'll use that data passed from the pipeline instead of hardcoded lists
        
        if self.debug:
            print("DEBUG: Fielding stats processing (wicketkeeper data from config)")
        
        # Helper function to extract fielder name from dismissal text
        def extract_fielder_name(fielder_text: str) -> str:
            """Extract the fielder name from dismissal text."""
            if not fielder_text:
                return ""
            
            # Remove the 'c ' prefix
            text: str = fielder_text
            if text.startswith("c "):
                text = text[2:]
            elif text.startswith("c"):
                text = text[1:]
            
            # Handle substitute fielder pattern first
            sub_pattern: str = r'(?:sub|impact|replacement)\s*\(([^)]+)\)|\(sub\)\s*([^\s]+(?:\s+[^\s]+)?)'
            sub_match = re.search(sub_pattern, text, re.IGNORECASE)
            if sub_match:
                name: str = sub_match.group(1) or sub_match.group(2)
                if name:
                    return name.strip()
            
            # Find where " b " appears (the bowler)
            b_index: int = text.lower().find(' b ')
            if b_index != -1:
                text = text[:b_index]
            
            # Remove any remaining sub indicators
            text = re.sub(r'\s*\(?(?:sub|impact|replacement)\)?\s*', ' ', text, flags=re.IGNORECASE)
            text = text.strip()
            
            return text
        
        # Helper function to extract name from dismissal text
        def extract_name_from_dismissal(fielder_text: str, dismissal_type: str) -> str | None:
            """Extract player name from stumping or catch dismissal text."""
            if not fielder_text:
                return None
            
            if dismissal_type == "stumping":
                # Remove "st " prefix
                text: str = fielder_text[3:].strip()
            elif dismissal_type == "catch":
                # Remove "c " prefix
                text = fielder_text[2:].strip()
            else:
                return None
            
            # Remove dagger if present
            text = text.replace('†', '').strip()
            
            # Remove sub indicator if present
            text = re.sub(r'\s*\(?(?:sub|impact|replacement)\)?\s*', ' ', text, flags=re.IGNORECASE)
            text = text.strip()
            
            # Find where " b " appears (the bowler)
            b_index = text.lower().find(' b ')
            if b_index != -1:
                text = text[:b_index].strip()
            
            return text if text else None
        
        # Process regular innings fielding
        for inning in innings_raw:
            batting_team_obj: dict = inning.get("team", {})
            batting_team_id: str = str(batting_team_obj.get("objectId", ""))
            fielding_team: str | None = None
            for team_id, team_abbr in self.team_mapping.items():
                if team_id != batting_team_id:
                    fielding_team = team_abbr
                    break
            
            for batsman in inning.get("inningBatsmen", []):
                if batsman.get("isOut"):
                    dismissal_text: dict = batsman.get("dismissalText", {})
                    dismissal_long: str = dismissal_text.get("long", "")
                    dismissal_short: str = dismissal_text.get("short", "").lower()
                    fielder_text: str = dismissal_text.get("fielderText")
                    bowler_text: str = dismissal_text.get("bowlerText", "")
                    
                    if "hit wicket" in dismissal_long.lower():
                        continue
                    
                    # Run Out
                    if "run out" in dismissal_short or "run out" in dismissal_long.lower():
                        if fielder_text:
                            # Remove daggers first
                            fielder_text = re.sub(r'[†‡\u2020\u2021]', '', fielder_text)
                            
                            runout_match = re.search(r'\(([^)]+)\)', fielder_text)
                            if runout_match:
                                fielders_str: str = runout_match.group(1)
                                for raw_name in fielders_str.split('/'):
                                    raw_name = raw_name.strip()
                                    has_dagger: bool = '†' in raw_name
                                    raw_name = raw_name.replace('†', '').strip()
                                    
                                    # Check if this is a substitute fielder
                                    if 'sub' in raw_name.lower():
                                        # Extract name from "sub (Player Name)" pattern
                                        sub_match = re.search(r'sub\s*\(([^)]+)\)', raw_name, re.IGNORECASE)
                                        if sub_match:
                                            sub_name: str = sub_match.group(1).strip()
                                            matched_player: str | None = self._find_best_player_match(sub_name, fielding_team)
                                            if matched_player:
                                                self.players[matched_player]["fielding"]["run_outs"] += 1
                                                if self.debug:
                                                    print(f"DEBUG: Substitute fielder {matched_player} credited with run out")
                                            else:
                                                self._create_temporary_player(sub_name, fielding_team)
                                    elif has_dagger:
                                        # Wicketkeeper - we'll credit them (the config will have role info)
                                        matched_player = self._find_best_player_match(raw_name, fielding_team)
                                        if matched_player:
                                            self.players[matched_player]["fielding"]["run_outs"] += 1
                                    else:
                                        matched_player = self._find_best_player_match(raw_name, fielding_team)
                                        if matched_player:
                                            self.players[matched_player]["fielding"]["run_outs"] += 1
                                        else:
                                            self._create_temporary_player(raw_name, fielding_team)
                            continue
                    
                    # Caught & Bowled
                    if "c & b" in dismissal_long.lower() or "c&b" in dismissal_long.lower():
                        c_and_b_match = re.search(r'c\s*&\s*b\s+([A-Za-z\s]+(?:[A-Za-z]))', dismissal_long, re.IGNORECASE)
                        if c_and_b_match:
                            bowler_name: str = c_and_b_match.group(1).strip()
                            matched_player = self._find_best_player_match(bowler_name, fielding_team)
                            if matched_player:
                                self.players[matched_player]["fielding"]["catches"] += 1
                        continue
                    
                    if not fielder_text:
                        continue
                    
                    # Stumping
                    if fielder_text.startswith("st "):
                    
                        # Remove daggers first
                        fielder_text = re.sub(r'[†‡\u2020\u2021]', '', fielder_text)
                        
                        # Credit wicketkeeper (role will be determined from config)
                        wk_name_from_text: str | None = extract_name_from_dismissal(fielder_text, "stumping")
                        matched_player = self._find_best_player_match(wk_name_from_text, fielding_team)
                        if matched_player:
                            self.players[matched_player]["fielding"]["stumpings"] += 1
                        continue
                    
                    # Regular caught
                    if fielder_text.startswith("c "):
                    
                        # Remove daggers first
                        fielder_text = re.sub(r'[†‡\u2020\u2021]', '', fielder_text)
                        
                        if self.debug:
                            print(f"DEBUG: Raw fielder_text: '{fielder_text}'")
                        
                        has_dagger = '†' in fielder_text
                        fielder_name: str | None = None
                        
                        # Method 1: Extract from "c sub (Player Name)" pattern
                        sub_pattern1: str = r'c\s+sub\s*\(([^)]+)\)'
                        match1 = re.search(sub_pattern1, fielder_text, re.IGNORECASE)
                        if match1:
                            fielder_name = match1.group(1).strip()
                            if self.debug:
                                print(f"DEBUG: Extracted substitute from pattern1: '{fielder_name}'")
                        
                        # Method 2: Extract from "c (sub) Player Name" pattern
                        if not fielder_name:
                            sub_pattern2 = r'c\s*\(sub\)\s*([^\s]+(?:\s+[^\s]+)?)'
                            match2 = re.search(sub_pattern2, fielder_text, re.IGNORECASE)
                            if match2:
                                fielder_name = match2.group(1).strip()
                                if self.debug:
                                    print(f"DEBUG: Extracted substitute from pattern2: '{fielder_name}'")
                        
                        # Method 3: Extract from anything with "sub" in it
                        if not fielder_name and 'sub' in fielder_text.lower():
                            sub_pattern3 = r'sub\s*\(?([A-Za-z\s]+)\)?\s+b'
                            match3 = re.search(sub_pattern3, fielder_text, re.IGNORECASE)
                            if match3:
                                fielder_name = match3.group(1).strip()
                                if self.debug:
                                    print(f"DEBUG: Extracted substitute from pattern3: '{fielder_name}'")
                        
                        # Method 4: Use the existing extract_fielder_name function
                        if not fielder_name:
                            fielder_name = extract_fielder_name(fielder_text)
                            if self.debug:
                                print(f"DEBUG: extract_fielder_name returned: '{fielder_name}'")
                        
                        # If we found a substitute fielder name, credit them
                        if fielder_name and 'sub' in fielder_text.lower():
                            # This is a substitute fielder
                            matched_player = self._find_best_player_match(fielder_name, fielding_team)
                            if matched_player:
                                self.players[matched_player]["fielding"]["catches"] += 1
                                if self.debug:
                                    print(f"DEBUG: Substitute fielder {matched_player} credited with catch (from '{fielder_name}')")
                            else:
                                self._create_temporary_player(fielder_name, fielding_team)
                                matched_player = self._find_best_player_match(fielder_name, fielding_team)
                                if matched_player:
                                    self.players[matched_player]["fielding"]["catches"] += 1
                                    if self.debug:
                                        print(f"DEBUG: Created temporary substitute {matched_player} for catch")
                            continue  # Skip further processing for substitute
                        
                        # Not a substitute - proceed with normal fielder logic
                        if not fielder_name:
                            fielder_name = extract_fielder_name(fielder_text)
                        
                        if fielder_name:
                            matched_player = self._find_best_player_match(fielder_name, fielding_team)
                            if matched_player:
                                self.players[matched_player]["fielding"]["catches"] += 1
                                if self.debug:
                                    print(f"DEBUG: Catch credited to {matched_player} (from '{fielder_name}')")
                            else:
                                self._create_temporary_player(fielder_name, fielding_team)
                                matched_player = self._find_best_player_match(fielder_name, fielding_team)
                                if matched_player:
                                    self.players[matched_player]["fielding"]["catches"] += 1
            
            # Process run-outs from fall of wickets
            for fow in inning.get("inningFallOfWickets", []):
                dismissal_text = fow.get("dismissalText", {})
                dismissal_short = dismissal_text.get("short", "").lower()
                fielder_text = dismissal_text.get("fielderText", "")
                
                if dismissal_short == "run out" or "run out" in dismissal_short:
                    if fielder_text:
                        runout_match = re.search(r'\(([^)]+)\)', fielder_text)
                        if runout_match:
                            fielders_str = runout_match.group(1)
                            for raw_name in fielders_str.split('/'):
                                raw_name = raw_name.strip()
                                has_dagger = '†' in raw_name
                                raw_name = raw_name.replace('†', '').strip()
                                
                                # Check for substitute fielder
                                if 'sub' in raw_name.lower():
                                    sub_match = re.search(r'sub\s*\(([^)]+)\)', raw_name, re.IGNORECASE)
                                    if sub_match:
                                        sub_name = sub_match.group(1).strip()
                                        matched_player = self._find_best_player_match(sub_name, fielding_team)
                                        if matched_player:
                                            self.players[matched_player]["fielding"]["run_outs"] += 1
                                        else:
                                            self._create_temporary_player(sub_name, fielding_team)
                                elif has_dagger:
                                    # Wicketkeeper
                                    matched_player = self._find_best_player_match(raw_name, fielding_team)
                                    if matched_player:
                                        self.players[matched_player]["fielding"]["run_outs"] += 1
                                else:
                                    matched_player = self._find_best_player_match(raw_name, fielding_team)
                                    if matched_player:
                                        self.players[matched_player]["fielding"]["run_outs"] += 1
                                    else:
                                        self._create_temporary_player(raw_name, fielding_team)


    def _detect_hattricks_from_notes(self) -> dict[str, bool]:
        """
        Parse the notes section to detect hat-tricks.
        
        Looks for patterns like:
        "Nandani Sharma took a hat-trick with the wickets of 8-209 (Ahuja, 19.4 ov), 9-209 (Gayakwad, 19.5 ov), 10-209 (Renuka Singh, 19.6 ov)"
        
        Returns:
            Dictionary mapping bowler full name -> boolean (True if they took a hat-trick)
        """
        hat_tricks = {}
        
        # Get the notes from raw_data
        notes_data = self.raw_data.get("content", {}).get("notes", {})
        groups = notes_data.get("groups", [])
        
        # Pattern to match hat-trick announcement
        # Format: "<player_name> took a hat-trick with the wickets of ..."
        hat_trick_pattern = re.compile(
            r'([A-Za-z\s]+)\s+took\s+a\s+hat-trick',
            re.IGNORECASE
        )
        
        for group in groups:
            notes = group.get("notes", [])
            for note in notes:
                match = hat_trick_pattern.search(note)
                if match:
                    bowler_name = match.group(1).strip()
                    
                    # Try to match the bowler name to a player in our roster
                    # The name in notes might be short name (e.g., "Nandani Sharma")
                    # We need to find the full name in our players
                    matched_player = self._find_player_by_name(bowler_name)
                    
                    if matched_player:
                        hat_tricks[matched_player] = True
                        if self.debug:
                            print(f"DEBUG: Hat-trick detected for {matched_player} (from note: {bowler_name})")
                    else:
                        # Store by the name from notes, we'll try to match later
                        hat_tricks[bowler_name] = True
                        if self.debug:
                            print(f"DEBUG: Hat-trick detected for {bowler_name} (not yet matched to roster)")
        
        return hat_tricks

    def _find_player_by_name(self, name: str) -> str | None:
        """
        Find a player in self.players by partial name matching.
        
        Args:
            name: Player name from notes (e.g., "Nandani Sharma")
        
        Returns:
            Full player name if found, None otherwise
        """
        if not name:
            return None
        
        name_lower = name.lower().strip()
        
        # First try exact match on full_name
        for full_name in self.players.keys():
            if full_name.lower() == name_lower:
                return full_name
        
        # Then try if name is contained in full_name
        for full_name in self.players.keys():
            if name_lower in full_name.lower():
                return full_name
        
        # Then try matching fielding_name or short_name
        for full_name, player_data in self.players.items():
            fielding_name = player_data.get("fielding_name", "").lower()
            short_name = player_data.get("short_name", "").lower()
            
            if fielding_name and name_lower in fielding_name:
                return full_name
            if short_name and name_lower in short_name:
                return full_name
            if name_lower in fielding_name or name_lower in short_name:
                return full_name
        
        return None
    

    def _calculate_fantasy_points(self, hat_tricks: dict[str, bool] = None) -> None:
        """Calculate fantasy points for each player based on their stats.
        
        Args:
            hat_tricks: Dictionary mapping player names to boolean indicating if they took a hat-trick
        """
        if hat_tricks is None:
            hat_tricks = {}

        for player_name, player_data in self.players.items():
            # Regular batting points
            reg_runs: int = 0
            reg_balls: int = 0
            reg_fours: int = 0
            reg_sixes: int = 0
            reg_is_out: bool = False
            reg_dismissal: str = ""
            
            for batting in player_data["batting"]:
                if batting.get("runs") is not None:
                    reg_runs += batting["runs"]
                    reg_balls += batting.get("balls", 0) or 0
                    reg_fours += batting.get("fours", 0) or 0
                    reg_sixes += batting.get("sixes", 0) or 0
                    reg_is_out = batting.get("is_out", False)
                    reg_dismissal = batting.get("dismissal", "")
            
            reg_batting_points: dict = FantasyPointsCalculator.calculate_batting_points(
                reg_runs, reg_balls, reg_fours, reg_sixes, reg_is_out, reg_dismissal, is_super_over=False
            )
            
            # Super Over batting points
            so_runs: int = 0
            so_balls: int = 0
            so_fours: int = 0
            so_sixes: int = 0
            so_is_out: bool = False
            so_dismissal: str = ""
            
            for batting in player_data["super_over_batting"]:
                if batting.get("runs") is not None:
                    so_runs += batting["runs"]
                    so_balls += batting.get("balls", 0) or 0
                    so_fours += batting.get("fours", 0) or 0
                    so_sixes += batting.get("sixes", 0) or 0
                    so_is_out = batting.get("is_out", False)
                    so_dismissal = batting.get("dismissal", "")
            
            so_batting_points = FantasyPointsCalculator.calculate_batting_points(
                so_runs, so_balls, so_fours, so_sixes, so_is_out, so_dismissal, is_super_over=True
            )
            
            # Check if this player has a hat-trick
            # Try exact match first, then partial match
            has_hattrick = False
            
            # Exact match on full name
            if player_name in hat_tricks:
                has_hattrick = hat_tricks[player_name]
            else:
                # Try matching by short name or fielding name
                short_name = player_data.get("short_name", "")
                fielding_name = player_data.get("fielding_name", "")
                
                for bowler_name in hat_tricks.keys():
                    if (short_name and bowler_name.lower() in short_name.lower()) or \
                    (fielding_name and bowler_name.lower() in fielding_name.lower()) or \
                    (bowler_name.lower() in player_name.lower()):
                        has_hattrick = True
                        if self.debug:
                            print(f"DEBUG: Matched hat-trick for {player_name} via '{bowler_name}'")
                        break

            # Regular bowling stats - store both cricket and decimal
            reg_overs_cricket: float = 0.0
            reg_overs_decimal: float = 0.0
            reg_maidens: int = 0
            reg_runs_bowled: int = 0
            reg_wickets: int = 0
            
            for bowling in player_data["bowling"]:
                if bowling.get("overs"):
                    overs_val: float = bowling["overs"]
                    reg_overs_cricket += overs_val
                    reg_overs_decimal += overs_to_decimal(overs_val)
                reg_maidens += bowling.get("maidens", 0) or 0
                reg_runs_bowled += bowling.get("runs", 0) or 0
                reg_wickets += bowling.get("wickets", 0) or 0
            
            # Calculate economy
            reg_economy: float = (reg_runs_bowled / reg_overs_decimal) if reg_overs_decimal > 0 else 0
            
            # For bowling points calculation, pass the cricket overs (function will convert)
            reg_bowling_points = FantasyPointsCalculator.calculate_bowling_points(
                reg_overs_cricket, reg_maidens, reg_runs_bowled, reg_wickets, is_super_over=False, has_hattrick=has_hattrick
            )
            
            # Super Over bowling stats
            so_overs_cricket: float = 0.0
            so_overs_decimal: float = 0.0
            so_maidens: int = 0
            so_runs_bowled: int = 0
            so_wickets: int = 0
            
            for bowling in player_data["super_over_bowling"]:
                if bowling.get("overs"):
                    overs_val = bowling["overs"]
                    so_overs_cricket += overs_val
                    so_overs_decimal += overs_to_decimal(overs_val)
                so_maidens += bowling.get("maidens", 0) or 0
                so_runs_bowled += bowling.get("runs", 0) or 0
                so_wickets += bowling.get("wickets", 0) or 0
            
            so_bowling_points = FantasyPointsCalculator.calculate_bowling_points(
                so_overs_cricket, so_maidens, so_runs_bowled, so_wickets, is_super_over=True
            )
            
            # Regular fielding points
            fielding = player_data["fielding"]
            reg_fielding_points = FantasyPointsCalculator.calculate_fielding_points(
                fielding.get("catches", 0),
                fielding.get("run_outs", 0),
                fielding.get("stumpings", 0)
            )
            
            # Super Over fielding points
            so_fielding = player_data["super_over_fielding"]
            so_fielding_points = FantasyPointsCalculator.calculate_fielding_points(
                so_fielding.get("catches", 0),
                so_fielding.get("run_outs", 0),
                so_fielding.get("stumpings", 0)
            )
            
            # Check if Player of the Match
            is_motm: bool = (player_name == self.player_of_match_full_name or
                            player_data.get("short_name") == self.player_of_match)
            
            # Calculate totals
            total_batting: int = reg_batting_points["total"] + so_batting_points["total"]
            total_bowling: int = reg_bowling_points["total"] + so_bowling_points["total"]
            total_fielding: int = reg_fielding_points["total"] + so_fielding_points["total"]
            so_total: int = so_batting_points["total"] + so_bowling_points["total"] + so_fielding_points["total"]
            
            total_points: int = total_batting + total_bowling + total_fielding
            if is_motm:
                total_points += FantasyPointsCalculator.POTM_BONUS
            
            player_data["fantasy_points"] = total_points
            player_data["super_over_points"] = so_total
            player_data["regular_points"] = total_points - so_total
            player_data["batting_points"] = total_batting
            player_data["bowling_points"] = total_bowling
            player_data["fielding_points"] = total_fielding
            player_data["is_motm"] = is_motm
            
            # Store breakdown for display
            player_data["reg_batting"] = reg_batting_points["total"]
            player_data["reg_bowling"] = reg_bowling_points["total"]
            player_data["reg_fielding"] = reg_fielding_points["total"]
            player_data["so_batting"] = so_batting_points["total"]
            player_data["so_bowling"] = so_bowling_points["total"]
            player_data["so_fielding"] = so_fielding_points["total"]
            
            # Store bowling stats for display
            player_data["reg_overs_cricket"] = reg_overs_cricket
            player_data["reg_overs_decimal"] = reg_overs_decimal
            player_data["reg_maidens"] = reg_maidens
            player_data["reg_runs_bowled"] = reg_runs_bowled
            player_data["reg_wickets"] = reg_wickets
            player_data["reg_economy"] = reg_economy
            player_data["has_hattrick"] = has_hattrick
    
    def get_match_info(self) -> dict:
        match: dict = self.raw_data["match"]
        content: dict = self.raw_data["content"]
        teams: list = match.get("teams", [])
        
        toss_winner_id = match.get("tossWinnerTeamId")
        toss_choice = match.get("tossWinnerChoice")
        toss_decision = "bat" if toss_choice == 1 else "bowl" if toss_choice == 2 else None
        
        winner_id = match.get("winnerTeamId")
        winner_name = None
        if winner_id:
            for team in teams:
                if team["team"]["id"] == winner_id:
                    winner_name = team["team"]["abbreviation"]
                    break
        
        toss_winner = None
        if toss_winner_id:
            for team in teams:
                if team["team"]["id"] == toss_winner_id:
                    toss_winner = team["team"]["abbreviation"]
                    break
        
        venue: str = match.get("ground", {}).get("longName", "")
        city: str = match.get("ground", {}).get("location", "").rstrip(',')
        
        return {
            "title": match.get("title", ""),
            "season": match.get("season", ""),
            "date": (match.get("startDate") or "")[:10],
            "venue": venue,
            "city": city,
            "result": content.get("status", {}).get("statusText", match.get("statusText", "")),
            "toss": {"winner": toss_winner, "decision": toss_decision},
            "winner": winner_name,
            "player_of_match": self.player_of_match_full_name or self.player_of_match,
            "format": match.get("format", ""),
            "series_name": match.get("series", {}).get("name", ""),
            "has_super_over": self.has_super_over
        }
    
    def get_full_scorecard(self) -> dict:
        return {
            "match_info": self.get_match_info(),
            "players": list(self.players.values())
        }
    
    def print_pretty_scorecard(self) -> None:
        """Print a human-readable scorecard with fantasy points and Super Over breakdown."""
        info: dict = self.get_match_info()
        
        venue_display: str = info['venue']
        if info['city']:
            venue_display = f"{info['venue']}, {info['city']}"
        
        print("\n" + "="*150)
        print(f"🏏 {info['title']}")
        print(f"📅 {info['date']} | 📍 {venue_display}")
        print(f"🏆 {info['series_name']} ({info['format']})")
        if info['has_super_over']:
            print(f"⚡ SUPER OVER MATCH!")
        print("="*150)
        
        if info['toss']['winner'] and info['toss']['decision']:
            print(f"\n🎲 Toss: {info['toss']['winner']} chose to {info['toss']['decision']}")
        print(f"✅ Result: {info['result']}")
        
        if info['player_of_match']:
            print(f"⭐ Player of the Match: {info['player_of_match']}")
        
        teams_in_match: list = list(self.team_mapping.values())
        
        if self.home_team and self.home_team in teams_in_match:
            team_order = [
                (self.home_team, "HOME TEAM"),
                (self.away_team, "AWAY TEAM")
            ] if self.away_team in teams_in_match else [(self.home_team, "HOME TEAM")]
        else:
            if self.batting_first_team and self.batting_first_team in teams_in_match:
                other_team: str = teams_in_match[0] if teams_in_match[0] != self.batting_first_team else teams_in_match[1]
                team_order = [(self.batting_first_team, ""), (other_team, "")]
            else:
                team_order = [(team, "") for team in teams_in_match]
        
        team_players_dict: dict = {}
        for team_abbr, _ in team_order:
            team_players_dict[team_abbr] = []
        
        for player in self.players.values():
            player_team: str = player.get("team", "")
            if player_team in team_players_dict:
                team_players_dict[player_team].append(player)
        
        for team_abbr, home_away_label in team_order:
            team_players: list = team_players_dict.get(team_abbr, [])
            if not team_players:
                continue
            
            full_team_name: str = self.team_full_names.get(team_abbr, team_abbr.upper())
            
            if home_away_label:
                team_display: str = f"{home_away_label}: {full_team_name}"
            else:
                team_display = full_team_name
            
            print(f"\n{'─'*150}")
            print(f"🏏 {team_display}")
            print(f"{'─'*150}")
            
            # Header with fantasy points column
            if info['has_super_over']:
                print(f"\n{'Player':<35} "
                      f"{'Runs':>6} {'Balls':>6} {'4s':>6} {'6s':>6} {'Strike Rate':>11}  "
                      f"{'Overs':>6} {'Maidens':>7} {'Runs':>5} {'Wkts':>5} {'Economy':>8}  "
                      f"{'Catches':>7} {'Run Outs':>8} {'Stumpings':>9}  "
                      f"{'Reg Pts':>8} {'SO Pts':>8} {'Total':>8}")
                print(f"{'─'*35} "
                      f"{'─'*6} {'─'*6} {'─'*6} {'─'*6} {'─'*11}  "
                      f"{'─'*6} {'─'*7} {'─'*5} {'─'*5} {'─'*8}  "
                      f"{'─'*7} {'─'*8} {'─'*9}  "
                      f"{'─'*8} {'─'*8} {'─'*8}")
            else:
                print(f"\n{'Player':<35} "
                      f"{'Runs':>6} {'Balls':>6} {'4s':>6} {'6s':>6} {'Strike Rate':>11}  "
                      f"{'Overs':>6} {'Maidens':>7} {'Runs':>5} {'Wkts':>5} {'Economy':>8}  "
                      f"{'Catches':>7} {'Run Outs':>8} {'Stumpings':>9}  "
                      f"{'Fantasy Pts':>12}")
                print(f"{'─'*35} "
                      f"{'─'*6} {'─'*6} {'─'*6} {'─'*6} {'─'*11}  "
                      f"{'─'*6} {'─'*7} {'─'*5} {'─'*5} {'─'*8}  "
                      f"{'─'*7} {'─'*8} {'─'*9}  "
                      f"{'─'*12}")
            
            for player in sorted(team_players, key=lambda x: x.get("full_name", "")):
                name: str = player["full_name"][:34] if player["full_name"] else player.get("short_name", "")
                
                is_pom: bool = player.get("is_motm", False)
                impact_role: str | None = player.get("impact_role")
                
                color: str = self.colors["reset"]
                if is_pom:
                    color = self.colors["gold"]
                elif impact_role == "subbed_in":
                    color = self.colors["green"]
                elif impact_role == "subbed_out":
                    color = self.colors["red"]
                
                # Batting stats
                total_runs: int = sum(b.get("runs", 0) or 0 for b in player["batting"])
                total_balls: int = sum(b.get("balls", 0) or 0 for b in player["batting"])
                total_fours: int = sum(b.get("fours", 0) or 0 for b in player["batting"])
                total_sixes: int = sum(b.get("sixes", 0) or 0 for b in player["batting"])
                
                strike_rate: float | None = None
                if total_balls > 0 and total_runs > 0:
                    strike_rate = (total_runs / total_balls) * 100
                sr_display: str = f"{strike_rate:.1f}" if strike_rate is not None else "-"
                
                runs_display: str = str(total_runs) if total_runs > 0 else "-"
                balls_display: str = str(total_balls) if total_balls > 0 else "-"
                fours_display: str = str(total_fours) if total_fours > 0 else "-"
                sixes_display: str = str(total_sixes) if total_sixes > 0 else "-"
                
                # Bowling stats - use stored values from _calculate_fantasy_points
                reg_overs_cricket = player.get("reg_overs_cricket", 0)
                reg_maidens = player.get("reg_maidens", 0)
                reg_runs_bowled = player.get("reg_runs_bowled", 0)
                reg_wickets = player.get("reg_wickets", 0)
                reg_economy = player.get("reg_economy", 0)

                overs_display: str = f"{reg_overs_cricket:.1f}" if reg_overs_cricket > 0 else "-"
                maidens_display: str = str(reg_maidens) if reg_maidens > 0 else "-"
                runs_bowled_display: str = str(reg_runs_bowled) if reg_runs_bowled > 0 else "-"
                wickets_display: str = str(reg_wickets) if reg_wickets > 0 else "-"
                economy_display: str = f"{reg_economy:.2f}" if reg_overs_cricket > 0 else "-"
                
                # Fielding stats
                fielding = player["fielding"]
                catches: int = fielding.get("catches", 0)
                run_outs: int = fielding.get("run_outs", 0)
                stumpings: int = fielding.get("stumpings", 0)
                
                # Fantasy points
                fantasy_points: int = player.get("fantasy_points", 0)
                
                # Hat-trick
                hattrick_indicator = " 🎩" if player.get("has_hattrick", False) else ""

                if info['has_super_over']:
                    regular_pts: int = player.get("regular_points", 0)
                    so_pts: int = player.get("super_over_points", 0)
                    print(f"{color}{name:<35} "
                          f"{runs_display:>6} {balls_display:>6} {fours_display:>6} {sixes_display:>6} {sr_display:>11}  "
                          f"{overs_display:>6} {maidens_display:>7} {runs_bowled_display:>5} {wickets_display:>5} {economy_display:>8}  "
                          f"{catches:>7} {run_outs:>8} {stumpings:>9}  "
                          f"{self.colors['cyan']}{regular_pts:>8.0f}{self.colors['reset']} "
                          f"{self.colors['yellow']}{so_pts:>8.0f}{self.colors['reset']} "
                          f"{self.colors['cyan']}{fantasy_points:>8.0f}{self.colors['reset']}")
                else:
                    print(f"{color}{hattrick_indicator} {name:<35} "
                          f"{runs_display:>6} {balls_display:>6} {fours_display:>6} {sixes_display:>6} {sr_display:>11}  "
                          f"{overs_display:>6} {maidens_display:>7} {runs_bowled_display:>5} {wickets_display:>5} {economy_display:>8}  "
                          f"{catches:>7} {run_outs:>8} {stumpings:>9}  "
                          f"{self.colors['cyan']}{fantasy_points:>12.0f}{self.colors['reset']}")
            
            # Team totals
            innings_raw: list = self.raw_data["content"].get("innings", [])
            team_runs: int = 0
            team_wickets: int = 0
            team_overs: float = 0.0
            
            for inning in innings_raw:
                team_obj: dict = inning.get("team", {})
                inning_team_id: str = str(team_obj.get("objectId", ""))
                inning_team_abbr: str = self.team_mapping.get(inning_team_id, "")
                if inning_team_abbr == team_abbr:
                    team_runs = inning.get("runs", 0)
                    team_wickets = inning.get("wickets", 0)
                    team_overs = inning.get("overs", 0)
                    break
            
            print(f"\n{'Team Total':<35} "
                  f"{team_runs:>3}/{team_wickets} ({team_overs:.1f} ov)")
        
        print("\n" + "="*150 + "\n")


async def main_async(match_id: int, output_file: str | None = None, quiet: bool = False, debug: bool = False) -> int:
    """Async main function to fetch and display scorecard."""
    try:
        scorecard = WWCScorecard(match_id, debug=debug)
        await scorecard.fetch()
        
        if not quiet:
            scorecard.print_pretty_scorecard()
        
        if output_file:
            full_data: dict = scorecard.get_full_scorecard()
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(full_data, f, indent=2, ensure_ascii=False)
            print(f"💾 Scorecard saved to {output_file}")
        
        return 0
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1


def main() -> int:
    parser = argparse.ArgumentParser(description='Extract WWC match scorecard with Fantasy Points calculation')
    parser.add_argument('-m', '--match-id', type=int, required=True, 
                        help='ESPNcricinfo match ID (e.g., 1529305)')
    parser.add_argument('--output', '-o', type=str, 
                        help='Output JSON file path (optional)')
    parser.add_argument('--quiet', '-q', action='store_true',
                        help='Suppress console output, only save JSON if specified')
    parser.add_argument('--debug', '-d', action='store_true',
                        help='Print debug information')
    
    args = parser.parse_args()
    
    return asyncio.run(main_async(args.match_id, args.output, args.quiet, args.debug))


if __name__ == "__main__":
    exit(main())
