import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, UserIcon } from '@heroicons/react/24/outline';
import PlayerNameWithBadge from './PlayerNameWithBadge';
import { teamOwners } from '../data/teamOwners';
import { teamPrimaryColors, teamSecondaryColors, teamEmojis } from '../data/teamColors';
import { countryAbbrToFullNames } from '../data/countryInfo';
import { ChevronUpIcon, ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

// Team background color mapping
const teamBgColors = teamPrimaryColors

// Team secondary color mapping
const teamTextColors = teamSecondaryColors

// Country abbreviation to full name mapping
const countryNames = countryAbbrToFullNames

// Dynamic logo function
const getTeamLogo = (teamName) => {
  const filename = teamName.toLowerCase().replace(/ /g, '-');
  const imagePath = `/logos/${filename}.png`;
  return { imagePath, emoji: teamEmojis[teamName] || '🏏' };
};

function Teams({ teams, players, leaderMap }) {
  const [imageError, setImageError] = React.useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedTeamPlayers, setSelectedTeamPlayers] = useState([]);
  const [modalLogoError, setModalLogoError] = useState({});

  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [roleFilter, setRoleFilter] = useState('all');

  const getTeamPlayers = (teamName) => players.filter(p => p.team === teamName);
  const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));

  const handleTeamClick = (team) => {
    const teamPlayersList = getTeamPlayers(team.name);
    setSelectedTeam(team);
    setSelectedTeamPlayers(teamPlayersList);
    setModalLogoError({});
  };

  // Filter and sort players
  const filteredAndSortedPlayers = useMemo(() => {
    let filtered = selectedTeamPlayers.filter(p => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (countryNames[p.country] || p.country)?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Role filter
      const matchesRole = roleFilter === 'all' || p.role === roleFilter;
      
      return matchesSearch && matchesRole;
    });

    // Sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch(sortField) {
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          break;
        case 'role':
          aVal = a.role || '';
          bVal = b.role || '';
          break;
        case 'country':
          aVal = countryNames[a.country] || a.country || '';
          bVal = countryNames[b.country] || b.country || '';
          break;
        case 'soldPrice':
          aVal = a.soldPrice || 0;
          bVal = b.soldPrice || 0;
          break;
        case 'points':
          aVal = a.points || 0;
          bVal = b.points || 0;
          break;
        default:
          aVal = a.name || '';
          bVal = b.name || '';
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [selectedTeamPlayers, searchTerm, sortField, sortDirection, roleFilter]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUpIcon style={{ width: 14, height: 14, marginLeft: 4 }} /> : 
      <ChevronDownIcon style={{ width: 14, height: 14, marginLeft: 4 }} />;
  };

  const closeModal = () => {
    setSelectedTeam(null);
    setSelectedTeamPlayers([]);
  };

  const handleModalLogoError = (teamName) => {
    setModalLogoError(prev => ({ ...prev, [teamName]: true }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      style={{ position: 'relative', minHeight: '100vh' }}
    >
      {/* Background Image - Only for Teams Page */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'url("/teams-ai.jpeg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
        opacity: 0.6,
        zIndex: -2,
      }} />
      
      {/* Dark Overlay for Text Readability */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: -1,
      }} />

      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'center',  // Add this for horizontal centering
          alignItems: 'center',
          width: '100%'  // Take full width
        }}
      >
        {!imageError ? (
          <img 
            src="/delulu-womens-league.jpeg" 
            alt="DWL Logo"
            style={{ 
              height: '250px',
              width: 'auto',
              objectFit: 'contain',
              marginBottom: '3rem',
              borderRadius: '50%',
            }}
            onError={() => setImageError(true)}
          />
        ) : (
          <svg 
            height="250px" 
            width="250px" 
            viewBox="0 0 250 250"
            style={{ marginBottom: '3rem' }}
          >
            <defs>
              {/* Gradient for circle background */}
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#667eea" />
                <stop offset="100%" stopColor="#764ba2" />
              </linearGradient>
              
              {/* Shadow filter for bevel effect */}
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="rgba(0,0,0,0.3)" />
              </filter>
              
              {/* Path for text curve - goes around the circle */}
              <path id="circlePath" d="M 125, 125 m -90, 0 a 90,90 0 1,1 180,0 a 90,90 0 1,1 -180,0" />
            </defs>
            
            {/* Outer circle with bevel effect */}
            <circle 
              cx="125" 
              cy="125" 
              r="120" 
              fill="url(#gradient)" 
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="3"
              filter="url(#shadow)"
            />
            
            {/* Inner highlight for bevel */}
            <circle 
              cx="125" 
              cy="125" 
              r="115" 
              fill="none" 
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="4"
            />
            
            {/* Curved text */}
            <text 
              fill="white" 
              fontSize="24" 
              fontWeight="bold"
              letterSpacing="3.5"
            >
              <textPath href="#circlePath" startOffset="50%" textAnchor="middle">
                DWL TEAMS DWL TEAMS DWL TEAMS
              </textPath>
            </text>
          </svg>
        )}
      </div>
      
      <div className="teams-grid">
        {sortedTeams.map((team, idx) => {
          const teamPlayers = getTeamPlayers(team.name);
          const bgColor = teamBgColors[team.name] || '#667eea';
          const ownerInfo = teamOwners[team.name] || { instaId: "coming_soon", instaUrl: "#" };
          const { imagePath, emoji } = getTeamLogo(team.name);
          
          return (
            <motion.div 
              key={team.id} 
              className="team-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -8, scale: 1.02 }}
              onClick={() => handleTeamClick(team)}
              style={{
                background: bgColor,
                borderRadius: '20px',
                overflow: 'hidden',
                cursor: 'pointer',
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                transition: 'all 0.3s ease',
                minHeight: '320px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Logo Section */}
              <div style={{ 
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                background: `rgba(0,0,0,0.05)`,
                minHeight: '200px'
              }}>
                <img 
                  src={imagePath}
                  alt={team.name}
                  style={{
                    maxWidth: '85%',
                    maxHeight: '160px',
                    objectFit: 'contain',
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const parent = e.target.parentElement;
                    parent.style.fontSize = '5rem';
                    parent.style.display = 'flex';
                    parent.style.alignItems = 'center';
                    parent.style.justifyContent = 'center';
                    parent.innerHTML = emoji;
                  }}
                />
              </div>
              
              {/* Info Section */}
              <div style={{ 
                padding: '1.5rem',
                background: `rgba(255,255,255,0.95)`,
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ 
                    fontSize: '1.3rem', 
                    margin: 0, 
                    color: bgColor,
                    fontWeight: 'bold'
                  }}>
                    {team.name}
                  </h3>
                </div>
                
                <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>POINTS</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: bgColor }}>
                      {Math.round(team.totalPoints || 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PLAYERS</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: bgColor }}>
                      {teamPlayers.length}
                    </div>
                  </div>
                </div>
                
                {/* Owner Info */}
                <div style={{ 
                  paddingTop: '0.75rem', 
                  borderTop: `1px solid ${bgColor}20`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <UserIcon style={{ width: 14, height: 14, color: '#999' }} />
                  <span style={{ fontSize: '0.75rem', color: '#999' }}>Owner:</span>
                  <a 
                    href={ownerInfo.instaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      color: bgColor,
                      textDecoration: 'none',
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.opacity = '0.7'}
                    onMouseLeave={(e) => e.target.style.opacity = '1'}
                  >
                    @{ownerInfo.instaId}
                  </a>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Team Details Modal with Bigger Logo */}
      <AnimatePresence>
        {selectedTeam && (
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
            onClick={closeModal}
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
                flexDirection: 'column'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header with Logo */}
              <div style={{
                padding: '1.5rem',
                background: teamBgColors[selectedTeam.name] || 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem'
              }}>
                {/* Team Logo - Bigger */}
                <div style={{
                  width: '120px',
                  height: '120px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {!modalLogoError[selectedTeam.name] ? (
                    <img 
                      src={getTeamLogo(selectedTeam.name).imagePath}
                      alt={selectedTeam.name}
                      style={{
                        width: '100px',
                        height: '100px',
                        objectFit: 'contain'
                      }}
                      onError={() => handleModalLogoError(selectedTeam.name)}
                    />
                  ) : (
                    <div style={{
                      fontSize: '3rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {getTeamLogo(selectedTeam.name).emoji}
                    </div>
                  )}
                </div>
                
                {/* Team Info */}
                <div style={{ flex: 1, color: teamTextColors[selectedTeam.name] || 'white' }}>
                  <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{selectedTeam.name}</h2>
                  <p style={{ margin: '0.5rem 0 0', opacity: 0.9 }}>
                    {selectedTeamPlayers.length} Players • {Math.round(selectedTeam.totalPoints || 0).toLocaleString()} Total Points
                  </p>
                </div>
                
                {/* Close Button */}
                <button
                  onClick={closeModal}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                >
                  <XMarkIcon style={{ width: 22, height: 22, color: 'white' }} />
                </button>
              </div>

              {/* Modal Body - Player List */}
              <div style={{
                padding: '1.5rem',
                overflowY: 'auto',
                flex: 1
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '1rem',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}>
                  {/* Search Box */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    padding: '0.4rem 0.75rem', 
                    border: '1px solid #2a2a3e', 
                    borderRadius: '8px',
                    background: '#0d0d1a'
                  }}>
                    <MagnifyingGlassIcon style={{ width: 16, height: 16, color: '#999' }} />
                    <input 
                      type="text" 
                      placeholder="Search players, roles, countries..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ border: 'none', outline: 'none', fontSize: '0.85rem', width: '250px', background: 'transparent', color: '#e0e0e0' }}
                    />
                  </div>
                  
                  {/* Results count */}
                  <div style={{ fontSize: '0.75rem', color: '#999' }}>
                    {filteredAndSortedPlayers.length} of {selectedTeamPlayers.length} players
                  </div>
                </div>

                {/* Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #2a2a3e' }}>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#e0e0e0', cursor: 'pointer' }} onClick={() => handleSort('name')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          Player {getSortIcon('name')}
                        </div>
                      </th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#e0e0e0', cursor: 'pointer' }} onClick={() => handleSort('role')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          Role {getSortIcon('role')}
                        </div>
                      </th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#e0e0e0', cursor: 'pointer' }} onClick={() => handleSort('country')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          Country {getSortIcon('country')}
                        </div>
                      </th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#e0e0e0', cursor: 'pointer' }} onClick={() => handleSort('soldPrice')}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                          Sold Price {getSortIcon('soldPrice')}
                        </div>
                      </th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#e0e0e0', cursor: 'pointer' }} onClick={() => handleSort('points')}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                          Points {getSortIcon('points')}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedPlayers.map(p => {
                      const countryFullName = countryNames[p.country] || p.country || '-';
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid #2a2a3e' }}>
                          <td style={{ padding: '0.75rem 1rem', color: '#ccc' }}>
                            <PlayerNameWithBadge name={p.name} captainVC={p.captainVC} leaderMap={leaderMap} />
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#999' }}>
                            {p.role || '-'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#999' }}>
                            {countryFullName}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 'bold', color: '#FF8C00' }}>
                            {p.soldPrice ? `₹${p.soldPrice.toLocaleString()}` : '₹0'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 'bold', color: p.points > 0 ? '#28a745' : (p.points < 0 ? '#FF4444' : '#adb5bd') }}>
                            {(() => {
                              const points = p.points || 0;
                              return points % 1 === 0 ? points : points.toFixed(1);
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Empty state */}
                {filteredAndSortedPlayers.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                    No players match your search criteria
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .teams-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
        }
        
        .team-card {
          transition: all 0.3s ease;
        }
        
        .team-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 12px 30px rgba(0,0,0,0.2);
        }
        
        @media (max-width: 900px) {
          .teams-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1.5rem;
          }
        }
        
        @media (max-width: 600px) {
          .teams-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }
      `}</style>
    </motion.div>
  );
}

export default Teams;