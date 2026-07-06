// src/services/statsService.js

/**
 * Convert cricket overs notation to total balls bowled
 * e.g. 0.4 (4 balls) -> 4 balls
 *      1.2 (1 over 2 balls) -> 8 balls (6 + 2)
 *      3.4 (3 overs 4 balls) -> 22 balls (18 + 4)
 *      2.0 (2 overs) -> 12 balls
 */
export function oversToBalls(overs) {
  if (!overs || overs === 0) return 0;
  
  const whole = Math.floor(overs);
  const decimal = overs - whole;
  const extraBalls = Math.round(decimal * 10);
  
  return (whole * 6) + extraBalls;
}

/**
 * Calculate tournament-wide statistics from match details data
 * @param {Array} matchDetails - Array of full match detail objects (from /api/match-details)
 * @returns {Object} Tournament statistics and leader lookup
 */
export function calculateTournamentStats(matchDetails) {
  const playerStats = {};

  if (!matchDetails || matchDetails.length === 0) {
    return {
      mostRuns: null,
      mostWickets: null,
      highestStrikeRate: null,
      bestEconomy: null,
      leaderMap: {}
    };
  }

  // Process each match's players
  matchDetails.forEach(match => {
    const players = match.players || [];
    
    players.forEach(player => {
      const playerName = player.name;
      
      if (!playerStats[playerName]) {
        playerStats[playerName] = {
          name: playerName,
          dwlTeam: player.dwl_team || '',
          country: player.country || '',
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          wickets: 0,
          runsConceded: 0,
          overs: 0,
          maidens: 0,
          matches: 0,
          // Track dismissals for batting average
          dismissals: 0,
          // Track balls bowled (calculated from overs)
          ballsBowled: 0
        };
      }
      
      const stats = playerStats[playerName];
      
      // Add regular stats (not Super Over for tournament leaders)
      stats.runs += player.runs || 0;
      stats.balls += player.balls || 0;
      stats.fours += player.fours || 0;
      stats.sixes += player.sixes || 0;
      stats.wickets += player.wickets || 0;
      stats.runsConceded += player.runs_conceded || 0;
      
      // Add overs and calculate balls bowled correctly
      const oversValue = player.overs || 0;
      stats.overs += oversValue;
      stats.ballsBowled += oversToBalls(oversValue);
      
      stats.maidens += player.maidens || 0;
      stats.matches += 1;
      
      // Track dismissals (simplified - if player faced balls and got out)
      // For simplicity, we'll track if they got out (is_out is not directly available here)
      // Using a simple heuristic: if they have runs but also got out in the match
      // We'll track dismissals from the match data if available
      if (player.is_out) {
        stats.dismissals += 1;
      }
      
      // Update country if it's set in this player (in case it wasn't set before)
      if (player.country && !stats.country) {
        stats.country = player.country;
      }
    });
  });

  const players = Object.values(playerStats);
  
  // Calculate derived stats for each player
  players.forEach(player => {
    // Batting average (runs / dismissals, only count players with at least 1 dismissal)
    player.battingAverage = player.dismissals > 0 ? player.runs / player.dismissals : player.runs;
    
    // Strike rate
    player.strikeRate = player.balls > 0 ? (player.runs / player.balls) * 100 : 0;
    
    // Bowling economy (runs per over)
    player.economy = player.overs > 0 ? player.runsConceded / player.overs : 999;
  });
  
  // Find leaders with tie-breakers
  const mostRuns = findMostRunsLeader(players);
  const mostWickets = findMostWicketsLeader(players);
  const highestStrikeRate = findHighestStrikeRateLeader(players);
  const bestEconomy = findBestEconomyLeader(players);

  // Create a map for quick lookup: player name -> list of leader categories
  const leaderMap = {};
  
  if (mostRuns) {
    leaderMap[mostRuns.name] = [...(leaderMap[mostRuns.name] || []), 'mostRuns'];
  }
  if (mostWickets) {
    leaderMap[mostWickets.name] = [...(leaderMap[mostWickets.name] || []), 'mostWickets'];
  }
  if (highestStrikeRate) {
    leaderMap[highestStrikeRate.name] = [...(leaderMap[highestStrikeRate.name] || []), 'highestStrikeRate'];
  }
  if (bestEconomy) {
    leaderMap[bestEconomy.name] = [...(leaderMap[bestEconomy.name] || []), 'bestEconomy'];
  }

  return {
    mostRuns,
    mostWickets,
    highestStrikeRate,
    bestEconomy,
    leaderMap
  };
}

/**
 * Find player with most runs (tie-breaker: higher strike rate, then better batting average)
 */
function findMostRunsLeader(players) {
  if (players.length === 0) return null;
  
  return [...players]
    .filter(p => p.runs > 0)
    .sort((a, b) => {
      // Primary: Most runs
      if (a.runs !== b.runs) return b.runs - a.runs;
      
      // Tie-breaker 1: Higher strike rate
      if (a.strikeRate !== b.strikeRate) return b.strikeRate - a.strikeRate;
      
      // Tie-breaker 2: Better batting average
      return (b.battingAverage || 0) - (a.battingAverage || 0);
    })[0] || null;
}

/**
 * Find player with most wickets (tie-breaker: better economy, then more balls bowled)
 */
function findMostWicketsLeader(players) {
  if (players.length === 0) return null;
  
  return [...players]
    .filter(p => p.wickets > 0)
    .sort((a, b) => {
      // Primary: Most wickets
      if (a.wickets !== b.wickets) return b.wickets - a.wickets;
      
      // Tie-breaker 1: Better economy (lower is better)
      if (a.economy !== b.economy) return a.economy - b.economy;
      
      // Tie-breaker 2: More balls bowled
      return b.ballsBowled - a.ballsBowled;
    })[0] || null;
}

/**
 * Find player with highest strike rate (tie-breaker: more balls faced, then better batting average)
 * Minimum 50 balls faced to qualify
 */
function findHighestStrikeRateLeader(players) {
  const qualified = players.filter(p => p.balls >= 50 && p.runs > 0);
  
  if (qualified.length === 0) return null;
  
  return [...qualified]
    .sort((a, b) => {
      // Primary: Higher strike rate
      if (a.strikeRate !== b.strikeRate) return b.strikeRate - a.strikeRate;
      
      // Tie-breaker 1: More balls faced
      if (a.balls !== b.balls) return b.balls - a.balls;
      
      // Tie-breaker 2: Better batting average
      return (b.battingAverage || 0) - (a.battingAverage || 0);
    })[0] || null;
}

/**
 * Find player with best economy (tie-breaker: more balls bowled, then more wickets taken)
 * Minimum 10 overs (60 balls) to qualify
 */
function findBestEconomyLeader(players) {
  const qualified = players.filter(p => p.overs >= 10 && p.wickets > 0);
  
  if (qualified.length === 0) return null;
  
  return [...qualified]
    .sort((a, b) => {
      // Primary: Better economy (lower is better)
      if (a.economy !== b.economy) return a.economy - b.economy;
      
      // Tie-breaker 1: More balls bowled
      if (a.ballsBowled !== b.ballsBowled) return b.ballsBowled - a.ballsBowled;
      
      // Tie-breaker 2: More wickets taken
      return b.wickets - a.wickets;
    })[0] || null;
}

// Icon configuration for each leader category
export const leaderIcons = {
  mostRuns: { icon: "💪🏻", color: "#FF6B35", label: "Most Runs", tooltip: "Leading Run Scorer" },
  mostWickets: { icon: "🎯", color: "#28a745", label: "Most Wickets", tooltip: "Leading Wicket Taker" },
  highestStrikeRate: { icon: "⚡", color: "#FFD700", label: "Highest Strike Rate", tooltip: "Best Strike Rate (min 50 balls)" },
  bestEconomy: { icon: "🛡️", color: "#2196F3", label: "Best Economy", tooltip: "Best Bowling Economy (min 10 overs)" }
};

// Helper function to get icons for a player
export function getPlayerLeaderIcons(playerName, leaderMap) {
  if (!leaderMap || !leaderMap[playerName]) return [];
  
  return leaderMap[playerName].map(category => ({
    icon: leaderIcons[category].icon,
    color: leaderIcons[category].color,
    tooltip: leaderIcons[category].tooltip,
    category
  }));
}