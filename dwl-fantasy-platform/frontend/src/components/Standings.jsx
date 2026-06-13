import React from 'react';
import { motion } from 'framer-motion';
import { teamPrimaryColors, teamSecondaryColors, teamEmojis, teamAbbreviations } from '../data/teamColors';
import { downloadExcel } from '../services/api';

// Team primary color mapping for row background
const teamBgColors = teamPrimaryColors

// Team secondary color mapping for row text
const teamColors = teamSecondaryColors

const defaultColor = '#333333';

const downloadDisabled = (matches) => {
  if (!matches || matches.length === 0) {
    return true;
  }
  return false;
};

const getTeamMatchPoints = (teamName, matches) => {
  const matchPoints = [];
  
  if (!matches || matches.length === 0) {
    return [];
  }
  
  const sortedMatches = [...matches].sort((a, b) => b.matchNum - a.matchNum);
  const last5Matches = sortedMatches.slice(0, 5);
  
  for (const match of last5Matches) {
    let teamPoints = 0;
    
    if (match.teamPoints && match.teamPoints[teamName]) {
      teamPoints = match.teamPoints[teamName];
    }
    else if (match.points) {
      for (const [player, playerData] of Object.entries(match.points)) {
        if (playerData.dwl_team === teamName) {
          teamPoints += playerData.final_pts || 0;
        }
      }
    }
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
  
  const maxPoints = 200;
  const normalized = Math.min(Math.max(points, 0), maxPoints) / maxPoints;
  
  let hue;
  if (normalized < 0.5) {
    hue = normalized * 120;
  } else {
    hue = 60 + (normalized - 0.5) * 120;
  }
  
  return `hsl(${hue}, 70%, 50%)`;
};

const getFormFontColor = (points) => {
  if (points === null) return '#666';
  if (points < 0) return 'white';
  if (points === 0) return '#333';
  
  const maxPoints = 200;
  const normalized = Math.min(Math.max(points, 0), maxPoints) / maxPoints;
  
  let hue;
  if (normalized < 0.5) {
    hue = normalized * 120;
  } else {
    hue = 60 + (normalized - 0.5) * 120;
  }
  
  if (points >= 100) {
    return 'white';
  } else if (points >= 50) {
    return '#333';
  } else {
    return 'white';
  }
};

const getFormTooltip = (points, matchNum, isMostRecent) => {
  if (points === 0) return `Match ${matchNum}: No Points`;
  return `Match ${matchNum}: ${points} points${isMostRecent ? ' (Most Recent)' : ''}`;
};

function Standings({ teams, matches = [] }) {
  const [downloading, setDownloading] = React.useState(false);
  const [windowWidth, setWindowWidth] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  
  React.useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Determine screen size category
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;
  
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

  // Responsive column widths based on screen size
  const getColumnConfig = () => {
    if (isMobile) {
      return {
        pos: '50px',
        team: 'minmax(130px, 1fr)',
        points: '60px',
        form: 'minmax(180px, auto)',
        logoSize: 35,
        fontSize: {
          pos: '1.2rem',
          team: '0.85rem',
          points: '1.1rem',
          formValue: '0.7rem',
          formLabel: '0.6rem'
        },
        padding: '0.5rem',
        showFullName: true,
        useAbbreviation: true
      };
    } else if (isTablet) {
      return {
        pos: '70px',
        team: 'minmax(200px, 1fr)',
        points: '80px',
        form: 'minmax(280px, auto)',
        logoSize: 50,
        fontSize: {
          pos: '1.8rem',
          team: '1.2rem',
          points: '1.4rem',
          formValue: '0.85rem',
          formLabel: '0.7rem'
        },
        padding: '0.75rem',
        showFullName: false,
        useAbbreviation: true
      };
    } else {
      return {
        pos: '150px',
        team: '1fr',
        points: '200px',
        form: '400px',
        logoSize: 75,
        fontSize: {
          pos: '2.5rem',
          team: '1.8rem',
          points: '1.8rem',
          formValue: '1rem',
          formLabel: '0.8rem'
        },
        padding: '1rem',
        showFullName: false,
        useAbbreviation: false
      };
    }
  };
  
  const config = getColumnConfig();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="card" style={{ padding: isMobile ? '0.75rem' : '1rem' }}>
        {/* Header with Download Button */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <h2 className="card-title" style={{ 
            fontSize: isMobile ? '1.3rem' : (isTablet ? '1.8rem' : '2.3rem'), 
            margin: 0 
          }}>
            POINTS TABLE
          </h2>
          <button
            onClick={handleDownloadExcel}
            disabled={downloadDisabled(matches) || downloading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: isMobile ? '0.5rem 0.8rem' : '0.6rem 1.2rem',
              background: (downloadDisabled(matches) || downloading) ? '#6c757d' : 'linear-gradient(135deg, #28a745, #20c997)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: 'bold',
              cursor: downloading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              fontSize: isMobile ? '0.75rem' : '0.9rem',
              whiteSpace: 'nowrap'
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
                📊 {isMobile ? 'Excel' : 'Download Excel'}
              </>
            )}
          </button>
        </div>
        
        <div style={{ 
          overflowX: 'auto', 
          overflowY: 'visible',
          WebkitOverflowScrolling: 'touch'
        }}>
          {/* Header */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: `${config.pos} ${config.team} ${config.points} ${config.form}`,
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            borderRadius: '12px 12px 0 0',
            minWidth: isMobile ? '400px' : (isTablet ? '550px' : '700px')
          }}>
            <div style={{ 
              padding: `${config.padding} ${isMobile ? '0.25rem' : config.padding}`, 
              textAlign: 'center', 
              fontWeight: 'bold', 
              fontSize: isMobile ? '0.75rem' : (isTablet ? '0.85rem' : '1rem')
            }}>
              POS
            </div>
            <div style={{ 
              padding: `${config.padding} ${isMobile ? '0.25rem' : config.padding}`, 
              textAlign: 'left', 
              fontWeight: 'bold', 
              fontSize: isMobile ? '0.75rem' : (isTablet ? '0.85rem' : '1rem')
            }}>
              TEAM
            </div>
            <div style={{ 
              padding: `${config.padding} ${isMobile ? '0.25rem' : config.padding}`, 
              textAlign: 'left', 
              fontWeight: 'bold', 
              fontSize: isMobile ? '0.75rem' : (isTablet ? '0.85rem' : '1rem')
            }}>
              PTS
            </div>
            <div style={{ 
              padding: `${config.padding} ${isMobile ? '0.25rem' : config.padding}`, 
              textAlign: 'left', 
              fontWeight: 'bold', 
              fontSize: isMobile ? '0.75rem' : (isTablet ? '0.85rem' : '1rem')
            }}>
              RECENT FORM
            </div>
          </div>
          
          {/* Rows */}
          {sortedTeams.map((team, idx) => {
            const position = idx + 1;
            const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : position;
            const teamColor = teamColors[team.name] || defaultColor;
            const bgColor = teamBgColors[team.name] || 'rgba(17, 17, 34, 0.5)';
            const recentForm = getTeamMatchPoints(team.name, matches);
            const { imagePath, emoji } = getTeamLogo(team.name);
            const teamAbbr = teamAbbreviations[team.name] || team.name.substring(0, 3).toUpperCase();
            
            // Determine what to show for team name
            const displayName = config.useAbbreviation ? teamAbbr : team.name.toUpperCase();
            
            return (
              <div 
                key={team.id} 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: `${config.pos} ${config.team} ${config.points} ${config.form}`,
                  borderBottom: '1px solid #2a2a3e',
                  transition: 'background 0.3s',
                  minWidth: isMobile ? '400px' : (isTablet ? '550px' : '700px'),
                  background: bgColor,
                }}
              >
                {/* POS Column */}
                <div style={{ 
                  padding: `${config.padding} ${isMobile ? '0.25rem' : config.padding}`, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: 'rgba(17, 17, 34, 0.5)',
                }}>
                  <span style={{ fontSize: config.fontSize.pos }}>{medal}</span>
                </div>
                
                {/* Team Column */}
                <div style={{ 
                  padding: `${config.padding} ${isMobile ? '0.25rem' : config.padding}`, 
                  display: 'flex', 
                  alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '0.75rem', width: '100%' }}>
                    <div style={{ 
                      width: config.logoSize, 
                      height: config.logoSize, 
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
                          parent.style.fontSize = isMobile ? '1.5rem' : (isTablet ? '2rem' : '2.8rem');
                          parent.innerHTML = emoji;
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ 
                        color: teamColor, 
                        fontWeight: 'bold', 
                        fontSize: config.fontSize.team, 
                        lineHeight: '1.2',
                        display: 'block',
                        wordBreak: 'break-word',
                        whiteSpace: 'normal'
                      }}>
                        {displayName}
                      </span>
                      {config.showFullName && (
                        <span style={{ 
                          fontSize: '0.6rem', 
                          color: '#999',
                          display: 'block',
                          marginTop: '0.2rem',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word'
                        }}>
                          {team.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Points Column */}
                <div style={{ 
                  padding: `${config.padding} ${isMobile ? '0.25rem' : config.padding}`, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'flex-start',
                  fontWeight: 'bold',
                  color: teamColor,
                  fontSize: config.fontSize.points,
                }}>
                  {(() => {
                    const points = team.totalPoints || 0;
                    return points % 1 === 0 ? points : points.toFixed(1);
                  })()}
                </div>
                
                {/* Recent Form Column */}
                <div style={{ 
                  padding: `${config.padding} ${isMobile ? '0.25rem' : config.padding}`, 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  overflowX: 'auto',
                  overflowY: 'visible',
                  WebkitOverflowScrolling: 'touch'
                }}>
                  {recentForm.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#999', fontSize: isMobile ? '0.65rem' : '0.7rem' }}>
                      No matches
                    </div>
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      gap: isMobile ? '0.2rem' : (isTablet ? '0.25rem' : '0.3rem'), 
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
                            width: isMobile ? '30px' : (isTablet ? '40px' : '60px'),
                            height: isMobile ? '24px' : (isTablet ? '28px' : '32px'),
                            borderRadius: '20%',
                            background: getFormPointColor(form.points),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: getFormFontColor(form.points),
                            fontWeight: 'bold',
                            fontSize: config.fontSize.formValue,
                            boxShadow: form.isMostRecent ? '0 0 0 1.5px rgb(255, 255, 255), 0 0 0 3px #667eea' : 'none',
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseEnter={(e) => {
                            if (!isMobile) e.currentTarget.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isMobile) e.currentTarget.style.transform = 'scale(1)';
                          }}
                          >
                            {form.points === 0 ? '-' : form.points}
                          </div>
                          
                          <div style={{
                            fontSize: config.fontSize.formLabel,
                            color: '#999',
                            fontWeight: form.isMostRecent ? 'bold' : 'normal',
                            whiteSpace: 'nowrap'
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
            padding: 0.5rem !important;
          }
        }
      `}</style>
    </motion.div>
  );
}

export default Standings;