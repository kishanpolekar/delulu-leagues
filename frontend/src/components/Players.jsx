import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MagnifyingGlassIcon, ArrowUpIcon, ArrowDownIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { countryAbbrToFullNames } from '../data/countryInfo';

// Country abbreviation to full name mapping
const countryNames = countryAbbrToFullNames

function Players({ players, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedDwlTeam, setSelectedDwlTeam] = useState('all');
  const [selectedCaptainVC, setSelectedCaptainVC] = useState('all'); // NEW
  const [sortField, setSortField] = useState('points');
  const [sortDirection, setSortDirection] = useState('desc');
  const [toast, setToast] = useState(null);

  // Get unique values for filters
  const roles = useMemo(() => {
    const unique = [...new Set(players.map(p => p.role).filter(Boolean))];
    return ['all', ...unique];
  }, [players]);

  const countries = useMemo(() => {
    const unique = [...new Set(players.map(p => {
      const fullName = countryNames[p.country] || p.country;
      return fullName;
    }).filter(Boolean))];
    return ['all', ...unique.sort()];
  }, [players]);

  const dwlTeams = useMemo(() => {
    const unique = [...new Set(players.map(p => p.team).filter(Boolean))];
    return ['all', ...unique.sort()];
  }, [players]);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Filter and sort players
  const filteredAndSortedPlayers = useMemo(() => {
    let filtered = players.filter(p => {
      const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           p.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (countryNames[p.country] || p.country)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           p.team?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = selectedRole === 'all' || p.role === selectedRole;
      const matchesCountry = selectedCountry === 'all' || (countryNames[p.country] || p.country) === selectedCountry;
      const matchesDwlTeam = selectedDwlTeam === 'all' || p.team === selectedDwlTeam;
      const matchesCaptainVC = selectedCaptainVC === 'all' || p.captainVC === selectedCaptainVC; // NEW
      return matchesSearch && matchesRole && matchesCountry && matchesDwlTeam && matchesCaptainVC;
    });

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
        case 'team':
          aVal = a.team || '';
          bVal = b.team || '';
          break;
        case 'captainVC':
          aVal = a.captainVC || '';
          bVal = b.captainVC || '';
          break;
        case 'points':
          aVal = a.points || 0;
          bVal = b.points || 0;
          break;
        default:
          aVal = a.points || 0;
          bVal = b.points || 0;
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [players, searchTerm, selectedRole, selectedCountry, selectedDwlTeam, selectedCaptainVC, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ArrowUpIcon style={{ width: 14, height: 14, marginLeft: 4 }} /> : 
      <ArrowDownIcon style={{ width: 14, height: 14, marginLeft: 4 }} />;
  };

  const getRoleColor = (role) => {
    if (role?.includes('allrounder')) return '#28a745';
    if (role?.includes('bowler')) return '#dc3545';
    if (role?.includes('batter')) return '#17a2b8';
    if (role?.includes('wicketkeeper')) return '#ffc107';
    return '#6c757d';
  };

  const getCaptainVCBadge = (captainVC) => {
    if (captainVC === 'C') {
      return {
        background: '#FFD700',
        color: '#333',
        padding: '0.2rem 0.5rem',
        borderRadius: '12px',
        fontSize: '0.7rem',
        fontWeight: 'bold',
        display: 'inline-block',
        minWidth: '35px',
        textAlign: 'center'
      };
    } else if (captainVC === 'VC') {
      return {
        background: '#C0C0C0',
        color: '#333',
        padding: '0.2rem 0.5rem',
        borderRadius: '12px',
        fontSize: '0.7rem',
        fontWeight: 'bold',
        display: 'inline-block',
        minWidth: '35px',
        textAlign: 'center'
      };
    }
    return null;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>⭐ Player Directory</h2>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', border: '2px solid #e0e0e0', borderRadius: '10px' }}>
            <MagnifyingGlassIcon style={{ width: 20, height: 20, color: '#999' }} />
            <input 
              type="text" 
              placeholder="Search players by name, role, country, or team..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: '1rem', background: 'transparent', color: '#e0e0e0' }} 
            />
          </div>
          
          <select 
            value={selectedRole} 
            onChange={(e) => setSelectedRole(e.target.value)} 
            style={{ padding: '0.5rem 1rem', border: '2px solid #e0e0e0', borderRadius: '10px', cursor: 'pointer', minWidth: '130px' }}
          >
            {roles.map(r => <option key={r} value={r}>{r === 'all' ? 'All Roles' : r}</option>)}
          </select>
          
          <select 
            value={selectedCountry} 
            onChange={(e) => setSelectedCountry(e.target.value)} 
            style={{ padding: '0.5rem 1rem', border: '2px solid #e0e0e0', borderRadius: '10px', cursor: 'pointer', minWidth: '130px' }}
          >
            {countries.map(c => <option key={c} value={c}>{c === 'all' ? 'All Countries' : c}</option>)}
          </select>
          
          <select 
            value={selectedDwlTeam} 
            onChange={(e) => setSelectedDwlTeam(e.target.value)} 
            style={{ padding: '0.5rem 1rem', border: '2px solid #e0e0e0', borderRadius: '10px', cursor: 'pointer', minWidth: '160px' }}
          >
            {dwlTeams.map(t => <option key={t} value={t}>{t === 'all' ? 'All DWL Teams' : t}</option>)}
          </select>

          {/* NEW: C/VC Filter Dropdown */}
          <select 
            value={selectedCaptainVC} 
            onChange={(e) => setSelectedCaptainVC(e.target.value)} 
            style={{ padding: '0.5rem 1rem', border: '2px solid #e0e0e0', borderRadius: '10px', cursor: 'pointer', minWidth: '100px' }}
          >
            <option value="all">All (C/VC)</option>
            <option value="C">Captain (C)</option>
            <option value="VC">Vice-Captain (VC)</option>
          </select>
        </div>
        
        <div style={{ marginBottom: '1rem', color: '#666', fontSize: '0.9rem' }}>
          Showing {filteredAndSortedPlayers.length} of {players.length} players
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white' }}>
                <th style={{ padding: '1rem', textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('name')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Player {getSortIcon('name')}
                  </div>
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('role')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Role {getSortIcon('role')}
                  </div>
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('country')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Country {getSortIcon('country')}
                  </div>
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('team')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    DWL Team {getSortIcon('team')}
                  </div>
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('captainVC')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    C/VC {getSortIcon('captainVC')}
                  </div>
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('points')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Points {getSortIcon('points')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedPlayers.map(p => {
                const countryFullName = countryNames[p.country] || p.country;
                const badgeStyle = getCaptainVCBadge(p.captainVC);
                return (
                  <tr 
                    key={p.id} 
                    style={{ borderBottom: '1px solid #e0e0e0', transition: 'background 0.3s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(102, 126, 234, 0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '1rem' }}><strong>{p.name}</strong></td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ background: getRoleColor(p.role), padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', color: 'white' }}>
                        {p.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>{countryFullName}</td>
                    <td style={{ padding: '1rem' }}>{p.team || 'Unassigned'}</td>
                    <td style={{ padding: '1rem' }}>
                      {badgeStyle ? (
                        <span style={badgeStyle}>{p.captainVC}</span>
                      ) : (
                        <span style={{ color: '#999', fontSize: '0.7rem' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', color: p.points > 0 ? '#28a745' : (p.points < 0 ? '#FF4444' : '#adb5bd'), fontWeight: 'bold' }}>{p.points || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredAndSortedPlayers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
            No players found matching your criteria
          </div>
        )}
      </div>
      
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
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </motion.div>
  );
}

export default Players;