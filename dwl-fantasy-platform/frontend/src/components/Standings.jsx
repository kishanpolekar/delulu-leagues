import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactDOM from 'react-dom';
import { teamPrimaryColors, teamSecondaryColors, teamEmojis, teamAbbreviations } from '../data/teamColors';
import { downloadExcel } from '../services/api';

// Team primary color mapping for row background
const teamBgColors = teamPrimaryColors

// Team secondary color mapping for row text
const teamColors = teamSecondaryColors

const defaultColor = '#333333';

const AWARD_DETAILS = {
  '💪🏻': { label: 'Most Runs', description: 'Leading run scorer of the tournament' },
  '🎯': { label: 'Most Wickets', description: 'Leading wicket taker of the tournament' },
  '⚡': { label: 'Highest Strike Rate', description: 'Best batting strike rate (min 50 balls)' },
  '🛡️': { label: 'Best Economy', description: 'Best bowling economy (min 10 overs)' },
  '🌟': { label: 'Most DWL Points', description: 'Most DWL points in a single match' }
};

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

// Tooltip component rendered via portal
const TooltipPortal = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  if (!mounted) return null;
  
  return ReactDOM.createPortal(
    children,
    document.body
  );
};

function Standings({ teams, matches = [], teamAwards = {} }) {
  const [downloading, setDownloading] = React.useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ left: 0, top: 0, placedBelow: false });
  const [tooltipContent, setTooltipContent] = useState(null);
  const iconRefs = useRef({});
  
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

  const calculateTooltipPosition = (iconRef, awardInfo) => {
    if (!iconRef) return null;
    
    const rect = iconRef.getBoundingClientRect();
    const tooltipWidth = 200; // Approximate width
    const tooltipHeight = 60; // Approximate height
    
    // Calculate position - center it above the icon
    let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
    let top = rect.top - tooltipHeight - 10;
    let placedBelow = false;
    
    // Prevent going off the left side
    if (left < 10) {
      left = 10;
    }
    
    // Prevent going off the right side
    if (left + tooltipWidth > window.innerWidth - 10) {
      left = window.innerWidth - tooltipWidth - 10;
    }
    
    // If it would go off the top, place it below
    if (top < 10) {
      top = rect.bottom + 10;
      placedBelow = true;
    }
    
    return { left, top, placedBelow };
  };

  const handleTooltipMouseEnter = (e, icon, indexKey) => {
    const iconRef = iconRefs.current[indexKey];
    if (!iconRef) return;
    
    const awardInfo = AWARD_DETAILS[icon];
    
    // Set content
    setTooltipContent({
      label: awardInfo?.label || 'Award Winner',
      description: awardInfo?.description || ''
    });
    
    // Set active tooltip
    setActiveTooltip(indexKey);
    
    // Calculate position
    const position = calculateTooltipPosition(iconRef, awardInfo);
    if (position) {
      setTooltipPosition(position);
    }
  };

  const handleTooltipMouseLeave = () => {
    setActiveTooltip(null);
    setTooltipContent(null);
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
            disabled={downloadDisabled(matches) || downloading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.2rem',
              background: (downloadDisabled(matches) || downloading) ? '#6c757d' : 'linear-gradient(135deg, #28a745, #20c997)',
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
            gridTemplateColumns: '150px 1fr 180px 400px 120px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            borderRadius: '12px 12px 0 0',
            minWidth: '750px'
          }}>
            <div style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>POS</div>
            <div style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>TEAM</div>
            <div style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>POINTS</div>
            <div style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>RECENT FORM</div>
            <div style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>AWARDS</div>
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
            const awards = teamAwards[team.name] || [];
            
            return (
              <div 
                key={team.id} 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '150px 1fr 180px 400px 120px',
                  borderBottom: '1px solid #2a2a3e',
                  transition: 'background 0.3s',
                  minWidth: '750px',
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
                  height: '100%',
                  background: 'rgba(17, 17, 34, 0.5)',
                }}>
                  <span className="medal" style={{ fontSize: '2.5rem' }}>{medal}</span>
                </div>
                
                {/* Team Column */}
                <div style={{ 
                  padding: '0 0.5rem', 
                  display: 'flex', 
                  alignItems: 'center',
                  height: '100%'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="team-logo" style={{ 
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
                      <span className="team-name-desktop" style={{ color: teamColor, fontWeight: 'bold', fontSize: '1.8rem', lineHeight: '1.2' }}>
                        {team.name.toUpperCase()}
                      </span>
                      <span className="team-name-mobile" style={{ color: teamColor, fontWeight: 'bold', fontSize: '1.8rem', lineHeight: '1.2' }}>
                        {teamAbbr}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Points Column */}
                <div className="points" style={{ 
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
                          <div className="form-box" style={{
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
                
                {/* Awards Column */}
                <div style={{ 
                  padding: '0 0.5rem', 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  gap: '0.25rem',
                  flexWrap: 'wrap'
                }}>
                  {awards.map((icon, i) => {
                    const indexKey = `${team.id}-${i}`;
                    const isActive = activeTooltip === indexKey;
                    
                    return (
                      <div
                        key={i}
                        ref={(el) => { iconRefs.current[indexKey] = el; }}
                        style={{
                          position: 'relative',
                          display: 'inline-block',
                          cursor: 'help',
                          zIndex: 1
                        }}
                        onMouseEnter={(e) => handleTooltipMouseEnter(e, icon, indexKey)}
                        onMouseLeave={handleTooltipMouseLeave}
                      >
                        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Tooltip Portal - Rendered at document.body level */}
      {activeTooltip && tooltipContent && (
        <TooltipPortal>
          <div
            style={{
              position: 'fixed',
              left: tooltipPosition.left + 'px',
              top: tooltipPosition.top + 'px',
              background: 'rgba(0,0,0,0.92)',
              color: 'white',
              padding: '0.5rem 0.8rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              zIndex: 99999,
              pointerEvents: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.1)',
              maxWidth: '300px',
              opacity: 1,
              visibility: 'visible',
              transition: 'opacity 0.15s ease'
            }}
          >
            <div style={{ fontWeight: 'bold', color: '#FFD700' }}>
              {tooltipContent.label}
            </div>
            <div style={{ fontSize: '0.6rem', color: '#ccc', marginTop: '0.15rem' }}>
              {tooltipContent.description}
            </div>
            <div style={{
              position: 'absolute',
              [tooltipPosition.placedBelow ? 'top' : 'bottom']: tooltipPosition.placedBelow ? '-6px' : '-6px',
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: '12px',
              height: '12px',
              background: 'rgba(0,0,0,0.92)',
              borderRight: '1px solid rgba(255,255,255,0.1)',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }} />
          </div>
        </TooltipPortal>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Hide mobile elements on desktop */
        .team-name-mobile {
          display: none;
        }
        
        /* Mobile styles - only changes for screens <= 768px */
        @media (max-width: 768px) {
          .card {
            padding: 0.75rem !important;
          }
          
          /* Hide desktop team name, show mobile */
          .team-name-desktop {
            display: none !important;
          }
          
          .team-name-mobile {
            display: block !important;
          }
          
          /* Override grid template columns for mobile */
          div[style*="display: grid"] {
            grid-template-columns: 50px minmax(120px, .5fr) 70px minmax(140px, auto) 60px !important;
            min-width: 480px !important;
          }
          
          /* Reduce logo size on mobile */
          .team-logo {
            width: 35px !important;
            height: 35px !important;
          }
          
          /* Reduce medal font size on mobile */
          .medal {
            font-size: 1.2rem !important;
          }
          
          /* Reduce points font size on mobile */
          .points {
            font-size: 1rem !important;
          }
          
          /* Reduce form box size on mobile */
          .form-box {
            width: 30px !important;
            height: 24px !important;
            font-size: 0.65rem !important;
          }
          
          /* Reduce header padding on mobile */
          div[style*="padding: 1rem"] {
            padding: 0.5rem !important;
          }
        }
      `}</style>
    </motion.div>
  );
}

export default Standings;