import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrophyIcon, UserGroupIcon, CalendarIcon, EyeIcon } from '@heroicons/react/24/outline';
import PlayerNameWithBadge from './PlayerNameWithBadge';
import { fetchMatchDetails } from '../services/api';
import MatchDetailsModal from './MatchDetailsModal';
import { teamPrimaryColors, teamSecondaryColors } from '../data/teamColors';
import { countryAbbrToFullNames } from '../data/countryInfo';

// Team primary color mapping
const teamBgColors = teamPrimaryColors

// Team secondary color mapping
const teamColors = teamSecondaryColors

// Country abbreviation to full name mapping
const countryNames = countryAbbrToFullNames

const TournamentStatsCards = ({ stats }) => {
  const cards = [
    { key: 'mostRuns', icon: '💪🏻', color: '#FF6B35', label: 'Most Runs', valueKey: 'runs', unit: 'runs' },
    { key: 'mostWickets', icon: '🎯', color: '#28a745', label: 'Most Wickets', valueKey: 'wickets', unit: 'wkts' },
    { key: 'highestStrikeRate', icon: '⚡', color: '#FFD700', label: 'Highest Strike Rate', valueKey: 'strikeRate', unit: '', isRate: true },
    { key: 'bestEconomy', icon: '🛡️', color: '#2196F3', label: 'Best Economy', valueKey: 'economy', unit: '', isRate: true }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '1rem',
      marginBottom: '2rem'
    }}>
      {cards.map(card => {
        const player = stats[card.key];
        if (!player) {
          return (
            <div key={card.key} style={{
              background: 'rgba(17, 17, 34, 0.8)',
              borderRadius: '16px',
              padding: '1rem',
              border: '1px solid rgba(255,255,255,0.08)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{card.icon}</div>
              <div style={{ fontSize: '0.7rem', color: card.color, textTransform: 'uppercase', letterSpacing: '1px' }}>{card.label}</div>
              <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.5rem' }}>No data yet</div>
            </div>
          );
        }

        const value = card.isRate ? 
          (card.key === 'highestStrikeRate' ? player.strikeRate?.toFixed(2) : player.economy?.toFixed(2)) : 
          player[card.valueKey];

        return (
          <div key={card.key} style={{
            background: 'rgba(17, 17, 34, 0.8)',
            borderRadius: '16px',
            padding: '1rem',
            border: '1px solid rgba(255,255,255,0.08)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{card.icon}</div>
            <div style={{ fontSize: '0.7rem', color: card.color, textTransform: 'uppercase', letterSpacing: '1px' }}>{card.label}</div>
            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white', marginTop: '0.5rem' }}>
              {player.name}
            </div>
            <div style={{ fontSize: '0.8rem', color: card.color, fontWeight: 'bold' }}>
              {value} {card.unit}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#666' }}>
              {player.dwlTeam}
            </div>
          </div>
        );
      })}
    </div>
  );
};

function Stats({ teams, players, matches, leaderMap, tournamentStats, setActiveTab }) {
  // State for match details modal
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchDetails, setMatchDetails] = useState(null);
  const [toast, setToast] = useState(null);

  const totalPoints = teams.reduce((sum, t) => sum + (t.totalPoints || 0), 0);
  const topPerformers = [...players].sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 10);
  
  // Total matches in the tournament (33 games)
  const TOTAL_MATCHES = 33;
  const matchesPlayed = matches.length;

  function formatDate(dateString) {
    if (!dateString) return '';
    
    // Split the YYYY-MM-DD format manually to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    
    // Use UTC month to avoid timezone shifts
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${day}-${monthNames[month - 1]}-${year}`;
  }

  const getMatchDate = (matchTitle) => {
    if (!matchTitle) return  "";
    const parts = matchTitle.split(" | ");
    return formatDate(parts[1]?.trim() || "");
  };

  // Calculate highest match score for each team
  const getTeamHighestScore = () => {
    const teamScores = {};
    
    // Initialize teamScores
    teams.forEach(team => {
      teamScores[team.name] = { points: 0, matchNum: null };
    });
    
    // If no matches, return empty
    if (!matches || matches.length === 0) {
      return teamScores;
    }
    
    // Iterate through matches and use teamPoints
    matches.forEach(match => {
      if (match.teamPoints) {
        for (const [teamName, score] of Object.entries(match.teamPoints)) {
          if (teamScores[teamName] && score > teamScores[teamName].points) {
            teamScores[teamName] = { points: score, matchNum: match.matchNum };
          }
        }
      }
    });
    
    return teamScores;
  };
  
  const teamHighestScores = getTeamHighestScore();
  
  // Sort teams by highest total points in a match
  const topHighestScores = [...teams]
    .map(team => ({
      name: team.name,
      abbr: team.abbr,
      points: teamHighestScores[team.name]?.points || 0,
      matchNum: teamHighestScores[team.name]?.matchNum || '-'
    }))
    .sort((a, b) => b.points - a.points);
    
  // Create a mapping from team name to abbreviation
  const teamNameToAbbr = {};
  teams.forEach(team => {
    teamNameToAbbr[team.name] = team.abbr;
  });

  // Handle match click to open modal
  const handleMatchClick = async (match) => {
    setSelectedMatch(match);
    try {
      const details = await fetchMatchDetails(match.matchNum);
      setMatchDetails(details);
    } catch (error) {
      setToast({ message: 'Failed to load match details', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const closeMatchDetails = () => {
    setSelectedMatch(null);
    setMatchDetails(null);
  };

  const statsCards = [
    { title: 'Total Teams', value: teams.length, icon: TrophyIcon, color: '#FFD700', tab: 'teams' },
    { title: 'Total Players', value: players.length, icon: UserGroupIcon, color: '#4CAF50', tab: 'players' },
    { 
      title: 'Matches Played', 
      value: (
        <span>
          {matchesPlayed}
          <span style={{ fontSize: '0.9rem', marginLeft: '0.15rem' }}>/{TOTAL_MATCHES}</span>
        </span>
      ), 
      icon: CalendarIcon, 
      color: '#2196F3',
      tab: 'matches'
    },
  ];
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="stats-grid">
        {statsCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div 
              key={idx} 
              className="card" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onClick={() => setActiveTab(stat.tab)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
              }}
            >
              <div style={{ width: '60px', height: '60px', borderRadius: '15px', background: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon style={{ width: '30px', height: '30px', color: 'white' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '2rem', margin: 0 }}>{stat.value}</h3>
                <p style={{ margin: 0, color: '#666' }}>{stat.title}</p>
              </div>
            </div>
          );
        })}
      </div>

      <TournamentStatsCards stats={tournamentStats} />

      {/* Top Performers and Highest Scores - Side by Side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Top Performers Card */}
        <div className="card">
          <h3 className="card-title">🏆 Top 10 Performers (Overall)</h3>
          {topPerformers.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderBottom: '1px solid #e0e0e0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 'bold', minWidth: '30px' }}>{i + 1}.</span>
                <PlayerNameWithBadge name={p.name} captainVC={p.captainVC} leaderMap={leaderMap} />
                <span style={{ 
                  fontSize: '0.7rem', 
                  color: teamColors[p.team] || 'rgba(255,255,255,0.95)', 
                  background: teamBgColors[p.team] || '#f0f0f0', 
                  padding: '0.1rem 0.5rem', 
                  borderRadius: '2px',
                  border: `2px solid ${teamColors[p.team] || '#ccc'}`
                }}>
                  {teamNameToAbbr[p.team] || p.team || '??'}
                </span>
                <span style={{ 
                  fontSize: '0.7rem', 
                  color: '#777', 
                  background: '#f0f0f0', 
                  padding: '0.2rem 0.5rem', 
                  borderRadius: '12px'
                }}>
                  {p.country || p.country || '??'}
                </span>
              </div>
              <span style={{ color: '#28a745', fontWeight: 'bold' }}>{p.points.toLocaleString() || 0} pts</span>
            </div>
          ))}
          {topPerformers.length === 0 && (
            <div style={{ textAlign: 'center', color: '#999', padding: '1rem' }}>
              No player data available yet
            </div>
          )}
        </div>
        
        {/* Highest Match Score Card */}
        <div className="card">
          <h3 className="card-title">🌟 Best Game for Each DWL Team</h3>
          {topHighestScores.map((team, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderBottom: '1px solid #e0e0e0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 'bold', minWidth: '30px' }}>{i + 1}.</span>
                <span style={{ fontWeight: '500' }}>{team.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#FF5722', fontWeight: 'bold' }}>{team.points.toLocaleString()} pts</span>
                {team.matchNum !== '-' && (
                  <span style={{ 
                    fontSize: '0.7rem', 
                    color: '#666', 
                    background: '#e0e0e0', 
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '12px'
                  }}>
                    M{team.matchNum}
                  </span>
                )}
              </div>
            </div>
          ))}
          {topHighestScores.length === 0 && (
            <div style={{ textAlign: 'center', color: '#999', padding: '1rem' }}>
              No match data available yet
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity - Clickable matches with modal */}
      <div className="card">
        <h3 className="card-title">📋 Recent Activity</h3>
        {matches.length === 0 ? <p style={{ textAlign: 'center', color: '#999' }}>No matches yet</p> :
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {matches.slice(0, 5).map((m, i) => {
              // Find the best performing DWL team from teamPoints
              let bestTeam = null;
              let bestPoints = 0;
              
              if (m.teamPoints) {
                for (const [team, points] of Object.entries(m.teamPoints)) {
                  if (points > bestPoints) {
                    bestPoints = points;
                    bestTeam = team;
                  }
                }
              }

              // Get match type from title (first part before "|")
              const matchTitleFirstPart = m.title?.split("|")[0]?.toLowerCase() || "";
              
              // Check match conditions in order of precedence
              const isMatchTied = m.title?.includes('Match tied');
              const isSemiFinal = matchTitleFirstPart.includes('semi-final');
              const isFinal = matchTitleFirstPart.includes('final') && !isSemiFinal;
              
              // Determine border style based on match importance
              let borderStyle = {};
              let borderClass = '';
              
              if (isMatchTied) {
                // Tied match - Rainbow border (supersedes all)
                borderStyle = {
                  border: '2px solid',
                };
                borderClass = 'rainbow-border';
              } else if (isFinal) {
                // Final match - Gold border
                borderStyle = {
                  border: '2px solid #FFD700',
                };
              } else if (isSemiFinal) {
                // Semi-final match - Silver border
                borderStyle = {
                  border: '2px solid #C0C0C0',
                };
              } else {
                // Regular match - Dark border
                borderStyle = {
                  border: '1px solid #2a2a3e',
                };
              }
              
              return (
                <div 
                  key={i} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '0.75rem', 
                    background: 'rgba(17, 17, 34, 0.8)', 
                    borderRadius: '10px', 
                    flexWrap: 'wrap', 
                    gap: '0.5rem',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    ...borderStyle
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(17, 17, 34, 0.8)'}
                  className={borderClass}
                  onClick={() => handleMatchClick(m)}
                >
                  <span>
                    <span style={{ fontWeight: 'bold', color: '#667eea', paddingRight: '2rem' }}>Match #{m.matchNum}</span>
                    <span style={{ color: '#999', fontSize: '80%' }}>{getMatchDate(m.title)}</span>
                  </span>
                  <span>
                    <span style={{ 
                      fontWeight: m.winner === m.team1 ? 'bold' : 'normal',
                      color: m.winner === m.team1 ? '#28a745' : 'inherit'
                    }}>
                      {countryNames[m.team1]}
                    </span>
                    {' vs '}
                    <span style={{ 
                      fontWeight: m.winner === m.team2 ? 'bold' : 'normal',
                      color: m.winner === m.team2 ? '#28a745' : 'inherit'
                    }}>
                      {countryNames[m.team2]}
                    </span>
                  </span>
                  {bestTeam && (
                    <span style={{ color: '#FF8C00', fontWeight: 'bold', fontSize: '0.8rem' }}>
                      ☆ {bestTeam} ({bestPoints} pts)
                    </span>
                  )}
                  <button 
                    style={{ 
                      padding: '0.3rem 0.8rem', 
                      background: '#667eea', 
                      border: 'none', 
                      borderRadius: '15px', 
                      color: 'white', 
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMatchClick(m);
                    }}
                  >
                    <EyeIcon style={{ width: 14, height: 14 }} />
                    View Details
                  </button>
                </div>
              );
            })}
          </div>
        }
      </div>

      {/* Match Details Modal */}
      <AnimatePresence>
        {selectedMatch && matchDetails && (
          <MatchDetailsModal match={matchDetails} onClose={closeMatchDetails} />
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          padding: '0.75rem 1.5rem',
          borderRadius: '10px',
          background: toast.type === 'success' ? '#28a745' : '#dc3545',
          color: 'white',
          fontWeight: 'bold',
          zIndex: 1100,
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes rainbow {
          0% { border-color: red; }
          16% { border-color: orange; }
          33% { border-color: yellow; }
          50% { border-color: green; }
          66% { border-color: blue; }
          83% { border-color: indigo; }
          100% { border-color: violet; }
        }
        
        .rainbow-border {
          animation: rainbow 5s linear infinite;
        }
      `}</style>
    </motion.div>
  );
}

export default Stats;