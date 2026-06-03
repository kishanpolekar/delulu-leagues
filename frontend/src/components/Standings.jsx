import React from 'react';
import { motion } from 'framer-motion';
import { teamPrimaryColors, teamSecondaryColors, teamEmojis } from '../data/teamColors';
import { downloadExcel } from '../services/api'; // Add this import

// Team primary color mapping for row background
const teamBgColors = teamPrimaryColors

// Team secondary color mapping for row text
const teamColors = teamSecondaryColors

const defaultColor = '#333333';

const getTeamMatchPoints = (teamName, matches) => {
  const matchPoints = [];
  
  if (!matches || matches.length === 0) {
    return [];
  }
  
  const sortedMatches = [...matches].sort((a, b) => b.matchNum - a.matchNum);
  const last5Matches = sortedMatches.slice(0, 5);
  
  for (const match of last5Matches) {
    let teamPoints = 0;
    
    // Option 1: Using teamPoints (from your updated API)
    if (match.teamPoints && match.teamPoints[teamName]) {
      teamPoints = match.teamPoints[teamName];
    }
    // Option 2: Using points property
    else if (match.points) {
      for (const [player, playerData] of Object.entries(match.points)) {
        if (playerData.dwl_team === teamName) {
          teamPoints += playerData.final_pts || 0;
        }
      }
    }
    // Option 3: Using match_entry (from your JSON storage)
    else if (match.match_entry) {
      for (const [player, playerData] of Object.entries(match.match_entry)) {
        if (playerData.dwl_team === teamName) {
          teamPoints += playerData.final_pts || 0;
        }
      }
    }
    
    matchPoints.push({
      points: teamPoints,
      matchNum: match.matchNum,
      isMostRecent: match === sortedMatches[0]
    });
  }
  
  return matchPoints;
};

const getFormPointColor = (points) => {
  if (points === null) return '#ccc';
  if (points < 0) return '#dc3545';
  if (points === 0) return '#adb5bd';
  
  // Red at 0, Green at 200, Yellow/Orange in between
  const maxPoints = 200;
  const normalized = Math.min(Math.max(points, 0), maxPoints) / maxPoints;
  
  // Hue: 0 (red) → 60 (yellow) → 120 (green)
  let hue;
  if (normalized < 0.5) {
    // Red to Yellow: 0 to 60
    hue = normalized * 120;
  } else {
    // Yellow to Green: 60 to 120
    hue = 60 + (normalized - 0.5) * 120;
  }
  
  return `hsl(${hue}, 70%, 50%)`;
};

const getFormFontColor = (points) => {
  if (points === null) return '#666';
  if (points < 0) return 'white';
  if (points === 0) return '#333';
  
  // Calculate brightness to determine if we need white or black text
  const maxPoints = 200;
  const normalized = Math.min(Math.max(points, 0), maxPoints) / maxPoints;
  
  // Hue: 0 (red) → 60 (yellow) → 120 (green)
  let hue;
  if (normalized < 0.5) {
    hue = normalized * 120;
  } else {
    hue = 60 + (normalized - 0.5) * 120;
  }
  
  // Calculate perceived brightness
  // Convert HSL to RGB approximation for brightness check
  const saturation = 70;
  const lightness = 50;
  
  // For HSL colors, lightness 50% is medium
  // Darker colors need white text, lighter colors need black text
  if (points >= 100) {
    return 'white';  // Dark greens need white text
  } else if (points >= 50) {
    return '#333';   // Yellow/light colors need dark text
  } else {
    return 'white';  // Reds/oranges need white text
  }
};

const getFormTooltip = (points, matchNum, isMostRecent) => {
  if (points === 0) return `Match ${matchNum}: No Points`;
  return `Match ${matchNum}: ${points} points${isMostRecent ? ' (Most Recent)' : ''}`;
};

function Standings({ teams, matches = [] }) {
  const [downloading, setDownloading] = React.useState(false);
  const sortedTeams = [...teams].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));

  const getTeamLogo = (teamName) => {
    const filename = teamName.toLowerCase().replace(/ /g, '-');
    const imagePath = `/logos/${filename}.png`;
    return { imagePath, emoji: teamEmojis[teamName] || '🏏' };
  };

  const handleDownloadExcel = async () => {
    setDownloading(true);
    try {
      await downloadExcel();
    } catch (error) {
      console.error('Failed to download Excel:', error);
      alert('Failed to download Excel file. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="card" style={{ padding: '1rem' }}>
        {/* Header with Download Button */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <h2 className="card-title" style={{ fontSize: '2.3rem', margin: 0 }}>POINTS TABLE</h2>
          <button
            onClick={handleDownloadExcel}
            disabled={downloading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.2rem',
              background: downloading ? '#6c757d' : 'linear-gradient(135deg, #28a745, #20c997)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: 'bold',
              cursor: downloading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '0.9rem'
            }}
            onMouseEnter={(e) => {
              if (!downloading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {downloading ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid white',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Downloading...
              </>
            ) : (
              <>
                📊 Download Excel
              </>
            )}
          </button>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          {/* Header */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '150px 1fr 200px 400px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            borderRadius: '12px 12px 0 0',
            minWidth: '700px'
          }}>
            <div style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>POS</div>
            <div style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>TEAM</div>
            <div style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>POINTS</div>
            <div style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>RECENT FORM</div>
          </div>
          
          {/* Rows */}
          {sortedTeams.map((team, idx) => {
            const position = idx + 1;
            const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : position;
            const teamColor = teamColors[team.name] || defaultColor;
            const bgColor = teamBgColors[team.name] || 'rgba(17, 17, 34, 0.5)';
            const recentForm = getTeamMatchPoints(team.name, matches);
            const { imagePath, emoji } = getTeamLogo(team.name);
            
            return (
              <div 
                key={team.id} 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '150px 1fr 200px 400px',
                  borderBottom: '1px solid #2a2a3e',
                  transition: 'background 0.3s',
                  minWidth: '700px',
                  height: '80px',
                  overflow: 'hidden',
                  background: bgColor,
                }}
              >
                {/* POS Column */}
                <div style={{ 
                  padding: '0 0.5rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '100%'
                }}>
                  <span style={{ fontSize: '2.5rem' }}>{medal}</span>
                </div>
                
                {/* Team Column */}
                <div style={{ 
                  padding: '0 0.5rem', 
                  display: 'flex', 
                  alignItems: 'center',
                  height: '100%'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ 
                      width: '75px', 
                      height: '75px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: 'transparent',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      <img 
                        src={imagePath} 
                        alt={team.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const parent = e.target.parentElement;
                          parent.style.fontSize = '2.8rem';
                          parent.innerHTML = emoji;
                        }}
                      />
                    </div>
                    <div>
                      <span style={{ color: teamColor, fontWeight: 'bold', fontSize: '1.8rem', lineHeight: '1.2' }}>
                        {team.name.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Points Column */}
                <div style={{ 
                  padding: '0 0.5rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'left',
                  fontWeight: 'bold',
                  color: teamColor,
                  fontSize: '1.8rem',
                  height: '100%'
                }}>
                  {(() => {
                    const points = team.totalPoints || 0;
                    return points % 1 === 0 ? points : points.toFixed(1);
                  })()}
                </div>
                
                {/* Recent Form Column */}
                <div style={{ 
                  padding: '0 0.5rem', 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  height: '100%',
                  overflowX: 'auto'
                }}>
                  {recentForm.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#999', fontSize: '0.7rem' }}>
                      No matches
                    </div>
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      gap: '0.3rem', 
                      alignItems: 'center',
                      flexWrap: 'nowrap'
                    }}>
                      {recentForm.map((form, formIdx) => (
                        <div
                          key={formIdx}
                          style={{
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.1rem'
                          }}
                          title={getFormTooltip(form.points, form.matchNum, form.isMostRecent)}
                        >
                          <div style={{
                            width: '60px',
                            height: '32px',
                            borderRadius: '20%',
                            background: getFormPointColor(form.points),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: getFormFontColor(form.points),
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            boxShadow: form.isMostRecent ? '0 0 0 1.5px rgb(255, 255, 255), 0 0 0 3px #667eea' : 'none',
                            cursor: 'pointer',
                            transition: 'transform 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          >
                            {form.points === 0 ? '-' : form.points}
                          </div>
                          
                          <div style={{
                            fontSize: '0.8rem',
                            color: '#999',
                            fontWeight: form.isMostRecent ? 'bold' : 'normal'
                          }}>
                            M{form.matchNum}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .card {
            padding: 0.75rem !important;
          }
        }
      `}</style>
    </motion.div>
  );
}

export default Standings;