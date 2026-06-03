// src/services/statsService.js

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
          dwlTeam: player.dwl_team,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          wickets: 0,
          runsConceded: 0,
          overs: 0,
          maidens: 0,
          matches: 0
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
      stats.overs += player.overs || 0;
      stats.maidens += player.maidens || 0;
      stats.matches += 1;
    });
  });

  const players = Object.values(playerStats);
  
  // Find leaders
  const mostRuns = [...players].sort((a, b) => b.runs - a.runs)[0] || null;
  const mostWickets = [...players].sort((a, b) => b.wickets - a.wickets)[0] || null;
  
  const highestStrikeRate = [...players]
    .filter(p => p.balls >= 50 && p.runs > 0)
    .map(p => ({ ...p, strikeRate: (p.runs / p.balls) * 100 }))
    .sort((a, b) => b.strikeRate - a.strikeRate)[0] || null;
  
  const bestEconomy = [...players]
    .filter(p => p.overs >= 10 && p.wickets > 0)
    .map(p => ({ ...p, economy: p.runsConceded / p.overs }))
    .sort((a, b) => a.economy - b.economy)[0] || null;

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