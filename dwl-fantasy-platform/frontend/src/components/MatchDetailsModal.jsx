import React from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon, TrophyIcon, UserIcon } from '@heroicons/react/24/outline';
import { teamPrimaryColors } from '../data/teamColors';
import { countryAbbrToFullNames } from '../data/countryInfo';


// Country abbreviation to full name mapping
const countryNames = countryAbbrToFullNames

// Team primary color mapping
const teamBgColors = teamPrimaryColors

function MatchDetailsModal({ match, onClose }) {
  if (!match) return null;

  // Get match type from title (first part before "|")
  const matchTitleFirstPart = match.title?.split("|")[0]?.toLowerCase() || "";
  
  // Check match conditions in order of precedence
  const isMatchTied = match.title?.includes('Match tied');
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

  function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  }

  const getMatchDateAndResult = (matchTitle) => {
    if (!matchTitle) return { date: "", result: "" };
    const parts = matchTitle.split(" | ");
    return {
      date: formatDate(parts[1]?.trim() || ""),
      result: parts[2]?.trim() || ""
    };
  };

  const { date, result } = getMatchDateAndResult(match.title);

  // Check if there are any Super Over stats
  const hasSuperOver = match.players?.some(player => 
    player.so_runs > 0 || player.so_balls > 0 || player.so_fours > 0 || 
    player.so_sixes > 0 || player.so_overs > 0 ||  player.so_runs_conceded > 0 ||
    player.so_wickets > 0 || player.so_catches > 0 || player.so_run_outs > 0 || player.so_stumpings > 0
  );

  // Filter players who have Super Over contributions
  const superOverPlayers = match.players?.filter(player => 
    player.so_runs > 0 || player.so_balls > 0 || player.so_fours > 0 || 
    player.so_sixes > 0 || player.so_overs > 0 ||  player.so_runs_conceded > 0 ||
    player.so_wickets > 0 || player.so_catches > 0 || player.so_run_outs > 0 || player.so_stumpings > 0
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        style={{
          background: '#0d0d1a',
          borderRadius: '24px',
          maxWidth: '1000px',
          width: '100%',
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          ...borderStyle
        }}
        className={borderClass}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.5rem',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Match #{match.match_num}</h2>
              {isFinal && <span style={{ background: '#FFD700', color: '#333', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>FINAL</span>}
              {isSemiFinal && <span style={{ background: '#C0C0C0', color: '#333', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>SEMI-FINAL</span>}
              {isMatchTied && <span style={{ background: 'linear-gradient(90deg, red, orange, yellow, green, blue, indigo, violet)', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>TIED</span>}
            </div>
            <h6 style={{ margin: '0.25rem 0 0 0', opacity: 0.8 }}>{date}</h6>
            <p style={{ margin: '0.5rem 0 0', opacity: 0.9 }}>
              {countryNames[match.team1]} vs {countryNames[match.team2]}
              {<span style={{ marginLeft: '1rem' }}>🏆 Winner: <strong>{result}</strong></span>}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <XMarkIcon style={{ width: 22, height: 22, color: 'white' }} />
          </button>
        </div>

        {/* Team Points Summary */}
        <div style={{
          padding: '1rem 1.5rem',
          background: '#0d0d1a',
          borderBottom: '1px solid #2a2a3e',
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {Object.entries(match.team_points || {})
            .sort((a, b) => b[1] - a[1])
            .map(([team, points]) => {
              // Get all countries that played in this match
              const matchCountries = [];
              match.players?.forEach(player => {
                if (player.country && !matchCountries.includes(player.country)) {
                  matchCountries.push(player.country);
                }
              });
              
              // Count players from each country in this DWL team for this match
              const countryCounts = {};
              match.players?.forEach(player => {
                if (player.dwl_team === team && player.country) {
                  countryCounts[player.country] = (countryCounts[player.country] || 0) + 1;
                }
              });
              
              // Ensure all match countries are represented (with 0 if no players)
              matchCountries.forEach(country => {
                if (!countryCounts[country]) {
                  countryCounts[country] = 0;
                }
              });
              
              // Sort countries alphabetically
              const sortedCountries = Object.keys(countryCounts).sort();

              return (
                <div key={team} style={{ 
                  textAlign: 'center',
                  width: '90px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ 
                    padding: '0.75rem 0.5rem',
                    background: 'white',
                    fontSize: '1.5rem', 
                    fontWeight: 'bold', 
                    color: points > 0 ? '#28a745' : (points < 0 ? '#FF4444' : '#adb5bd')
                  }}>
                    {points}
                  </div>
                  
                  <div style={{ 
                    padding: '0.5rem 0.25rem',
                    background: teamBgColors[team] || '#667eea',
                    fontSize: '0.65rem', 
                    color: 'white', 
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                    textAlign: 'center',
                    lineHeight: '1.3',
                    minHeight: '90px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    wordBreak: 'break-word'
                  }}>
                    <div>{team}</div>
                    <div style={{ 
                      fontSize: '0.55rem', 
                      opacity: 0.85, 
                      marginTop: '0.25rem',
                      borderTop: '1px solid rgba(255,255,255,0.3)',
                      paddingTop: '0.25rem',
                      width: '100%'
                    }}>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(40px, 1fr))',
                        gap: '0.1rem',
                        justifyContent: 'center'
                      }}>
                        {sortedCountries.map((country, idx) => (
                          <div key={idx} style={{ textAlign: 'center' }}>
                            <div>{country}</div>
                            <div style={{ fontWeight: 'bold' }}>{countryCounts[country]}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Main Match Table */}
        <div style={{
          padding: '1.5rem',
          overflowY: 'auto',
          flex: 1
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#e0e0e0', fontSize: '1rem' }}>📊 Match Scorecard</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #2a2a3e' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#e0e0e0' }}>Player</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#e0e0e0' }}>Country</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#e0e0e0' }}>DWL Team</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', color: '#e0e0e0' }}>Batting</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', color: '#e0e0e0' }}>Bowling</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', color: '#e0e0e0' }}>
                  Fielding
                  <div style={{ fontSize: '0.6rem', fontWeight: 'normal', color: '#888', marginTop: '0.25rem' }}>
                    C | R.O. | St
                  </div>
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'center', color: '#e0e0e0' }}>Points</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', color: '#e0e0e0' }}>×</th>
              </tr>
            </thead>
            <tbody>
              {match.players?.map((player, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #2a2a3e' }}>
                  <td style={{ padding: '0.75rem', color: '#ccc' }}>
                    <div>
                      <span style={{ fontWeight: '500' }}>{player.name}</span>
                      {player.is_motm && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: '#FFD700' }}>⭐ MoM</span>}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#999' }}>{player.country || '-'}</td>
                  <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#999' }}>{player.dwl_team || '-'}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', color: '#ccc' }}>
                    {player.balls > 0 ? `${player.runs} (${player.balls})` : '-'}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', color: '#ccc' }}>
                    {player.overs > 0 ? `${player.wickets}/${player.runs_conceded} (${player.overs})` : '-'}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', color: '#ccc' }}>
                    {player.catches > 0 ? `${player.catches} | ` : '- |'} {player.run_outs > 0 ? `${player.run_outs} | ` : '- |'} {player.stumpings > 0 ? `${player.stumpings}` : '-'}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', color: player.raw_points > 0 ? '#28a745' : (player.raw_points < 0 ? '#FF4444' : '#adb5bd') }}>
                    {player.raw_points}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.8rem', color: '#888' }}>
                    {player.multiplier > 1 ? `${player.multiplier}×` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Super Over Table */}
          {hasSuperOver && (
            <>
              <h3 style={{ margin: '1.5rem 0 1rem 0', color: '#FFD700', fontSize: '1rem' }}>⚡ Super Over Scorecard</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #2a2a3e' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#e0e0e0' }}>Player</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#e0e0e0' }}>Country</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#e0e0e0' }}>DWL Team</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', color: '#e0e0e0' }}>Batting (SO)</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', color: '#e0e0e0' }}>Bowling (SO)</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', color: '#e0e0e0' }}>
                      Fielding (SO)
                      <div style={{ fontSize: '0.6rem', fontWeight: 'normal', color: '#888', marginTop: '0.25rem' }}>
                        C | R.O. | St
                      </div>
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', color: '#e0e0e0' }}>SO Points</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', color: '#e0e0e0' }}>×</th>
                  </tr>
                </thead>
                <tbody>
                  {superOverPlayers.map((player, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #2a2a3e' }}>
                      <td style={{ padding: '0.75rem', color: '#ccc' }}>
                        <div>
                          <span style={{ fontWeight: '500' }}>{player.name}</span>
                          {player.is_motm && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: '#FFD700' }}>⭐ MoM</span>}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#999' }}>{player.country || '-'}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#999' }}>{player.dwl_team || '-'}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', color: '#ccc' }}>
                        {player.so_balls > 0 ? `${player.so_runs} (${player.so_balls})` : '-'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', color: '#ccc' }}>
                        {player.so_overs > 0 ? `${player.so_wickets}/${player.so_runs_conceded} (${player.so_overs})` : '-'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', color: '#ccc' }}>
                        {player.so_catches > 0 ? `${player.so_catches} | ` : '- |'} {player.so_run_outs > 0 ? `${player.so_run_outs} | ` : '- |'} {player.so_stumpings > 0 ? `${player.so_stumpings}` : '-'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', color: '#FFD700' }}>
                        {player.super_over_pts || 0}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.8rem', color: '#888' }}>
                        {player.multiplier > 1 ? `${player.multiplier}×` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </motion.div>
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
          animation: rainbow 2s linear infinite;
        }
      `}</style>
    </motion.div>
  );
}

export default MatchDetailsModal;