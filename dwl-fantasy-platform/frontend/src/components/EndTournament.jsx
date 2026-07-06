import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrophyIcon, KeyIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { teamPrimaryColors, teamSecondaryColors } from '../data/teamColors';
import { verifyAdminPassword, getPasswordStatus, getAdminConfig } from '../services/api';

const teamBgColors = teamPrimaryColors;
const teamColors = teamSecondaryColors;

function EndTournament({ 
  teams: initialTeams, 
  players: initialPlayers, 
  matches, 
  matchDetails, 
  tournamentStats, 
  leaderMap,
  onComplete,
  onUpdateStandings 
}) {
  const [currentAwardIndex, setCurrentAwardIndex] = useState(-1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showFinalStandings, setShowFinalStandings] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(true);
  const [password, setPassword] = useState('');
  const [isPasswordCorrect, setIsPasswordCorrect] = useState(false);
  const [showAwards, setShowAwards] = useState(false);
  const [awardWinners, setAwardWinners] = useState([]);
  
  // Password protection states (same as Matches.jsx)
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(null);
  const [lockDisplay, setLockDisplay] = useState('');
  const [verifying, setVerifying] = useState(false);
  
  // Config from backend
  const [maxFailedAttempts, setMaxFailedAttempts] = useState(3);
  const [lockoutDurationMinutes, setLockoutDurationMinutes] = useState(30);
  const [lockoutDurationMs, setLockoutDurationMs] = useState(30 * 60 * 1000);
  const [configLoaded, setConfigLoaded] = useState(false);
  
  // Track updated player points and team points
  const [updatedPlayers, setUpdatedPlayers] = useState(initialPlayers);
  const [updatedTeams, setUpdatedTeams] = useState(initialTeams);
  
  // Track which awards have been given (for points)
  const [givenAwards, setGivenAwards] = useState({});
  
  // Track which teams have won awards (for live table - updates immediately when award is shown)
  const [teamAwardIcons, setTeamAwardIcons] = useState({});
  
  // Track awards that have been shown (for live table icons)
  const [shownAwards, setShownAwards] = useState([]);

  // Load config from backend (same as Matches.jsx)
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getAdminConfig();
        setMaxFailedAttempts(config.max_failed_attempts);
        setLockoutDurationMinutes(config.lockout_duration_minutes);
        setLockoutDurationMs(config.lockout_duration_seconds * 1000);
        setConfigLoaded(true);
      } catch (error) {
        console.error('Failed to load admin config:', error);
        setMaxFailedAttempts(3);
        setLockoutDurationMinutes(30);
        setLockoutDurationMs(30 * 60 * 1000);
        setConfigLoaded(true);
      }
    };
    loadConfig();
  }, []);

  // Load lock state from localStorage (same as Matches.jsx)
  useEffect(() => {
    if (!configLoaded) return;
    
    const loadLockState = async () => {
      try {
        const status = await getPasswordStatus();
        
        if (status.is_locked && status.remaining_seconds > 0) {
          setIsLocked(true);
          const remainingMs = status.remaining_seconds * 1000;
          
          if (lockTimer) {
            clearTimeout(lockTimer);
            setLockTimer(null);
          }
          
          const timer = setTimeout(() => {
            clearLock();
            showToast('🔓 Lockout period expired. You can try again.', 'info');
          }, remainingMs);
          setLockTimer(timer);
          
          const minutes = Math.floor(status.remaining_seconds / 60);
          const seconds = status.remaining_seconds % 60;
          setLockDisplay(`${minutes}:${seconds.toString().padStart(2, '0')}`);
          
          localStorage.setItem('dwl_is_locked', 'true');
          localStorage.setItem('dwl_lock_time', (Date.now() - (lockoutDurationMs - remainingMs)).toString());
          localStorage.setItem('dwl_failed_attempts', maxFailedAttempts.toString());
        } else if (status.is_locked && status.remaining_seconds <= 0) {
          clearLock();
        } else {
          const savedLocked = localStorage.getItem('dwl_is_locked');
          const savedLockTime = localStorage.getItem('dwl_lock_time');
          
          if (savedLocked === 'true' && savedLockTime) {
            const lockTime = parseInt(savedLockTime);
            const elapsed = Date.now() - lockTime;
            const remaining = lockoutDurationMs - elapsed;
            
            if (remaining > 0) {
              setIsLocked(true);
              if (lockTimer) {
                clearTimeout(lockTimer);
                setLockTimer(null);
              }
              const timer = setTimeout(() => {
                clearLock();
                showToast('🔓 Lockout period expired. You can try again.', 'info');
              }, remaining);
              setLockTimer(timer);
              const minutes = Math.floor(remaining / 60000);
              const seconds = Math.floor((remaining % 60000) / 1000);
              setLockDisplay(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            } else {
              clearLock();
            }
          }
        }
      } catch (error) {
        console.error('Failed to get lock status from backend:', error);
        const savedLocked = localStorage.getItem('dwl_is_locked');
        const savedLockTime = localStorage.getItem('dwl_lock_time');
        
        if (savedLocked === 'true' && savedLockTime) {
          const lockTime = parseInt(savedLockTime);
          const elapsed = Date.now() - lockTime;
          const remaining = lockoutDurationMs - elapsed;
          
          if (remaining > 0) {
            setIsLocked(true);
            const timer = setTimeout(() => {
              clearLock();
              showToast('🔓 Lockout period expired. You can try again.', 'info');
            }, remaining);
            setLockTimer(timer);
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            setLockDisplay(`${minutes}:${seconds.toString().padStart(2, '0')}`);
          } else {
            clearLock();
          }
        }
      }
    };
    
    loadLockState();
  }, [configLoaded, lockoutDurationMs, maxFailedAttempts]);

  // Update lock display timer (same as Matches.jsx)
  useEffect(() => {
    let interval = null;
    let animationFrame = null;
    
    const updateLockDisplay = () => {
      const lockTime = localStorage.getItem('dwl_lock_time');
      if (!lockTime || !isLocked) {
        if (interval) clearInterval(interval);
        return;
      }
      
      const elapsed = Date.now() - parseInt(lockTime);
      const remaining = lockoutDurationMs - elapsed;
      
      if (remaining <= 0) {
        clearLock();
        if (interval) clearInterval(interval);
      } else {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        setLockDisplay(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };
    
    if (isLocked) {
      updateLockDisplay();
      const tick = () => {
        updateLockDisplay();
        animationFrame = requestAnimationFrame(tick);
      };
      interval = setInterval(updateLockDisplay, 1000);
      animationFrame = requestAnimationFrame(tick);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isLocked, lockoutDurationMs]);

  // Save failed attempts to localStorage (same as Matches.jsx)
  const saveFailedAttempts = (attempts) => {
    localStorage.setItem('dwl_failed_attempts', attempts);
  };

  const clearLock = () => {
    setIsLocked(false);
    setFailedAttempts(0);
    setPassword('');
    setLockDisplay('');
    localStorage.removeItem('dwl_failed_attempts');
    localStorage.removeItem('dwl_is_locked');
    localStorage.removeItem('dwl_lock_time');
    if (lockTimer) {
      clearTimeout(lockTimer);
      setLockTimer(null);
    }
  };

  const showToast = (message, type) => {
    // Simple toast implementation
    const toastDiv = document.createElement('div');
    toastDiv.style.cssText = `
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      padding: 0.75rem 1.5rem;
      border-radius: 10px;
      background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
      color: white;
      font-weight: bold;
      z-index: 1100;
      animation: slideIn 0.3s ease-out;
    `;
    toastDiv.textContent = message;
    document.body.appendChild(toastDiv);
    setTimeout(() => {
      toastDiv.remove();
    }, 3000);
  };

  // Helper function to format lock time (same as Matches.jsx)
  const formatLockTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const verifyPassword = async () => {
    setVerifying(true);
    try {
      const result = await verifyAdminPassword(password);
      
      if (result.success) {
        setFailedAttempts(0);
        saveFailedAttempts(0);
        setShowPasswordModal(false);
        setPassword('');
        setIsPasswordCorrect(true);
        setShowConfirmation(false);
        setShowAwards(true);
        setCurrentAwardIndex(0);
        showToast('✅ Access granted!', 'success');
      } else if (result.is_locked) {
        setIsLocked(true);
        const remainingSeconds = result.remaining_seconds;
        const remainingMs = remainingSeconds * 1000;
        localStorage.setItem('dwl_is_locked', 'true');
        localStorage.setItem('dwl_lock_time', Date.now().toString());
        localStorage.setItem('dwl_failed_attempts', maxFailedAttempts.toString());
        setLockDisplay(formatLockTime(remainingSeconds));
        setShowPasswordModal(false);
        setPassword('');
        showToast(result.message || 'Too many failed attempts. Feature locked.', 'error');
        if (lockTimer) {
          clearTimeout(lockTimer);
          setLockTimer(null);
        }
        const timer = setTimeout(() => {
          clearLock();
          showToast('🔓 Lockout period expired. You can try again.', 'info');
        }, remainingMs);
        setLockTimer(timer);
      } else {
        const remaining = result.remaining_attempts;
        const newFailedAttempts = maxFailedAttempts - remaining;
        setFailedAttempts(newFailedAttempts);
        saveFailedAttempts(newFailedAttempts);
        showToast(`❌ Incorrect password. ${remaining} attempt(s) remaining.`, 'error');
        setPassword('');
      }
    } catch (error) {
      showToast('Error verifying password', 'error');
    } finally {
      setVerifying(false);
    }
  };

  // Helper function to format overs in cricket format (e.g., 6.4 overs)
  const formatOvers = (overs) => {
    if (!overs || overs === 0) return '0';
    const whole = Math.floor(overs);
    const decimal = Math.round((overs - whole) * 10);
    if (decimal === 0) return `${whole}`;
    return `${whole}.${decimal}`;
  };

  // Helper function to get a player's current DWL points (individual points)
  const getPlayerCurrentPoints = (playerName) => {
    const player = updatedPlayers.find(p => p.name === playerName);
    if (player) {
      return player.points || 0;
    }
    const initialPlayer = initialPlayers.find(p => p.name === playerName);
    return initialPlayer ? initialPlayer.points || 0 : 0;
  };

  // Helper function to get a team's current points
  const getTeamCurrentPoints = (teamName) => {
    const team = updatedTeams.find(t => t.name === teamName || t.abbr === teamName);
    return team ? team.totalPoints || 0 : 0;
  };

  // Function to update player and team points immediately
  const applyPointsImmediately = (winner, bonusPoints, awardId) => {
    if (givenAwards[awardId]) return;
    
    setUpdatedPlayers(prev => 
      prev.map(p => {
        if (p.name === winner.name) {
          return { ...p, points: (p.points || 0) + bonusPoints };
        }
        return p;
      })
    );

    setUpdatedTeams(prev => 
      prev.map(t => {
        if (t.name === winner.dwlTeam || t.abbr === winner.dwlTeam) {
          return { ...t, totalPoints: (t.totalPoints || 0) + bonusPoints };
        }
        return t;
      })
    );

    setGivenAwards(prev => ({ ...prev, [awardId]: true }));
  };

  // Function to add award icon to team (called immediately when award is shown)
  const addTeamAwardIcon = (teamName, awardIcon) => {
    setTeamAwardIcons(prev => {
      const currentIcons = prev[teamName] || [];
      if (!currentIcons.includes(awardIcon)) {
        return { ...prev, [teamName]: [...currentIcons, awardIcon] };
      }
      return prev;
    });
  };

  // Function to get top 3 players for a stat
  const getTopThree = (players, statKey, filterFn = null, sortFn = null) => {
    let filtered = players;
    if (filterFn) {
      filtered = players.filter(filterFn);
    }
    
    const sorted = [...filtered].sort((a, b) => {
      if (sortFn) return sortFn(a, b);
      return (b[statKey] || 0) - (a[statKey] || 0);
    });
    
    return sorted.slice(0, 3);
  };

  // Define awards with useMemo
  const awards = useMemo(() => [
    {
      id: 'mostRuns',
      title: '🏏 Most Runs Award',
      icon: '💪🏻',
      color: '#FF6B35',
      getWinner: () => tournamentStats?.mostRuns,
      getTopThree: () => {
        const playerMap = new Map();
        
        matchDetails?.forEach(match => {
          match.players?.forEach(player => {
            if (!playerMap.has(player.name)) {
              playerMap.set(player.name, {
                name: player.name,
                dwlTeam: player.dwl_team || player.dwlTeam || '',
                country: player.country || '',
                runs: 0,
                balls: 0,
                fours: 0,
                sixes: 0,
                matches: 0
              });
            }
            const existing = playerMap.get(player.name);
            existing.runs += player.runs || 0;
            existing.balls += player.balls || 0;
            existing.fours += player.fours || 0;
            existing.sixes += player.sixes || 0;
            existing.matches += 1;
            if (player.country && !existing.country) {
              existing.country = player.country;
            }
          });
        });
        
        const allPlayers = Array.from(playerMap.values());
        return getTopThree(allPlayers, 'runs', p => p.runs > 0, (a, b) => b.runs - a.runs);
      },
      getStats: (player) => ({
        value: player?.runs || 0,
        detail: `${player?.runs || 0} runs • SR: ${((player?.runs / (player?.balls || 1)) * 100).toFixed(2)}`,
        fullStats: `Runs: ${player?.runs || 0}, Balls: ${player?.balls || 0}, Fours: ${player?.fours || 0}, Sixes: ${player?.sixes || 0}`
      }),
      bonus: 500
    },
    {
      id: 'mostWickets',
      title: '🎯 Most Wickets Award',
      icon: '🎯',
      color: '#28a745',
      getWinner: () => {
        const winner = tournamentStats?.mostWickets;
        if (!winner) return null;
        return winner;
      },
      getTopThree: () => {
        const playerMap = new Map();
        
        matchDetails?.forEach(match => {
          match.players?.forEach(player => {
            if (!playerMap.has(player.name)) {
              playerMap.set(player.name, {
                name: player.name,
                dwlTeam: player.dwl_team || player.dwlTeam || '',
                country: player.country || '',
                wickets: 0,
                runsConceded: 0,
                overs: 0,
                maidens: 0
              });
            }
            const existing = playerMap.get(player.name);
            existing.wickets += player.wickets || 0;
            existing.runsConceded += player.runs_conceded || 0;
            existing.overs += player.overs || 0;
            existing.maidens += player.maidens || 0;
            if (player.country && !existing.country) {
              existing.country = player.country;
            }
          });
        });
        
        const allPlayers = Array.from(playerMap.values());
        return getTopThree(allPlayers, 'wickets', 
          p => p.wickets > 0, 
          (a, b) => {
            if (b.wickets !== a.wickets) {
              return b.wickets - a.wickets;
            }
            const econA = a.runsConceded / (a.overs || 1);
            const econB = b.runsConceded / (b.overs || 1);
            return econA - econB;
          }
        );
      },
      getStats: (player) => {
        const oversFormatted = formatOvers(player?.overs || 0);
        const econ = player?.runsConceded / (player?.overs || 1);
        return {
          value: player?.wickets || 0,
          detail: `${player?.wickets || 0} wickets • Econ: ${econ.toFixed(2)}`,
          fullStats: `Wickets: ${player?.wickets || 0}, Runs: ${player?.runsConceded || 0}, Overs: ${oversFormatted}, Maidens: ${player?.maidens || 0}`
        };
      },
      bonus: 500
    },
    {
      id: 'highestStrikeRate',
      title: '⚡ Highest Strike Rate Award',
      icon: '⚡',
      color: '#FFD700',
      getWinner: () => tournamentStats?.highestStrikeRate,
      getTopThree: () => {
        const playerMap = new Map();
        
        matchDetails?.forEach(match => {
          match.players?.forEach(player => {
            if (!playerMap.has(player.name)) {
              playerMap.set(player.name, {
                name: player.name,
                dwlTeam: player.dwl_team || player.dwlTeam || '',
                country: player.country || '',
                runs: 0,
                balls: 0,
                fours: 0,
                sixes: 0
              });
            }
            const existing = playerMap.get(player.name);
            existing.runs += player.runs || 0;
            existing.balls += player.balls || 0;
            existing.fours += player.fours || 0;
            existing.sixes += player.sixes || 0;
            if (player.country && !existing.country) {
              existing.country = player.country;
            }
          });
        });
        
        const allPlayers = Array.from(playerMap.values());
        const withSR = allPlayers
          .filter(p => p.balls >= 50 && p.runs > 0)
          .map(p => ({ ...p, strikeRate: (p.runs / p.balls) * 100 }));
        
        return getTopThree(withSR, 'strikeRate', p => p.strikeRate > 0, (a, b) => b.strikeRate - a.strikeRate);
      },
      getStats: (player) => ({
        value: player?.strikeRate || 0,
        detail: `SR: ${(player?.strikeRate || 0).toFixed(2)} • Runs: ${player?.runs || 0}`,
        fullStats: `Strike Rate: ${(player?.strikeRate || 0).toFixed(2)}, Runs: ${player?.runs || 0}, Balls: ${player?.balls || 0}`
      }),
      bonus: 250,
      minQualification: 'Min 50 balls'
    },
    {
      id: 'bestEconomy',
      title: '🛡️ Best Economy Award',
      icon: '🛡️',
      color: '#2196F3',
      getWinner: () => tournamentStats?.bestEconomy,
      getTopThree: () => {
        const playerMap = new Map();
        
        matchDetails?.forEach(match => {
          match.players?.forEach(player => {
            if (!playerMap.has(player.name)) {
              playerMap.set(player.name, {
                name: player.name,
                dwlTeam: player.dwl_team || player.dwlTeam || '',
                country: player.country || '',
                wickets: 0,
                runsConceded: 0,
                overs: 0,
                maidens: 0
              });
            }
            const existing = playerMap.get(player.name);
            existing.wickets += player.wickets || 0;
            existing.runsConceded += player.runs_conceded || 0;
            existing.overs += player.overs || 0;
            existing.maidens += player.maidens || 0;
            if (player.country && !existing.country) {
              existing.country = player.country;
            }
          });
        });
        
        const allPlayers = Array.from(playerMap.values());
        const withEcon = allPlayers
          .filter(p => p.overs >= 10 && p.wickets > 0)
          .map(p => ({ ...p, economy: p.runsConceded / p.overs }));
        
        return getTopThree(withEcon, 'economy', p => p.economy > 0, (a, b) => a.economy - b.economy);
      },
      getStats: (player) => {
        const oversFormatted = formatOvers(player?.overs || 0);
        return {
          value: player?.economy || 0,
          detail: `Econ: ${(player?.economy || 0).toFixed(2)} • Wickets: ${player?.wickets || 0}`,
          fullStats: `Economy: ${(player?.economy || 0).toFixed(2)}, Wickets: ${player?.wickets || 0}, Runs: ${player?.runsConceded || 0}, Overs: ${oversFormatted}`
        };
      },
      bonus: 250,
      minQualification: 'Min 10 overs'
    },
    {
      id: 'mostPoints',
      title: '🌟 Most DWL Points in a Single Match',
      icon: '🌟',
      color: '#9C27B0',
      getWinner: () => {
        let bestPlayer = null;
        let bestPoints = 0;
        let bestMatch = null;
        let bestMatchDetails = null;

        matchDetails?.forEach(match => {
          match.players?.forEach(player => {
            if (player.points > bestPoints) {
              bestPoints = player.points;
              bestPlayer = {
                ...player,
                dwlTeam: player.dwl_team || player.dwlTeam || '',
                country: player.country || '',
              };
              bestMatch = match.match_num;
              bestMatchDetails = match;
            }
          });
        });

        return bestPlayer ? {
          ...bestPlayer,
          match: bestMatch,
          matchDetails: bestMatchDetails,
          pointsInMatch: bestPoints
        } : null;
      },
      getTopThree: () => {
        const allMatches = matchDetails?.map(match => {
          const playersWithPoints = match.players?.map(player => ({
            ...player,
            match: match.match_num,
            dwlTeam: player.dwl_team || player.dwlTeam || '',
            country: player.country || '',
            pointsInMatch: player.points || 0
          })) || [];
          return playersWithPoints;
        }).flat() || [];
        
        return getTopThree(allMatches, 'pointsInMatch', p => p.pointsInMatch > 0, (a, b) => b.pointsInMatch - a.pointsInMatch);
      },
      getStats: (player) => ({
        value: player?.pointsInMatch || 0,
        detail: `${player?.pointsInMatch || 0} points in M${player?.match || '?'}`,
        fullStats: `Match: M${player?.match || '?'}, Points: ${player?.pointsInMatch || 0}, ${player?.runs ? `Runs: ${player.runs}, ` : ''}${player?.wickets ? `Wickets: ${player.wickets}` : ''}`
      }),
      bonus: 250
    }
  ], [tournamentStats, matchDetails]);

  // Calculate award winners on mount
  useEffect(() => {
    const winners = awards.map(award => {
      const winner = award.getWinner();
      const topThree = award.getTopThree();
      
      if (!winner) return null;
      
      const country = winner.country || '';
      const currentPoints = getPlayerCurrentPoints(winner.name);

      let multiplier = 1;
      let captainVC = '';
      updatedTeams.forEach(team => {
        team.players?.forEach(p => {
          if (p.name === winner.name) {
            captainVC = p.captainVC || '';
            if (captainVC === 'C') multiplier = 2;
            else if (captainVC === 'VC') multiplier = 1.5;
          }
        });
      });

      const bonusPoints = award.bonus * multiplier;
      
      const topThreeWithPoints = topThree.map(player => {
        const pts = getPlayerCurrentPoints(player.name);
        let mult = 1;
        updatedTeams.forEach(team => {
          team.players?.forEach(p => {
            if (p.name === player.name) {
              const cv = p.captainVC || '';
              if (cv === 'C') mult = 2;
              else if (cv === 'VC') mult = 1.5;
            }
          });
        });
        const stats = award.getStats(player);
        return {
          ...player,
          country: player.country || '',
          currentPoints: pts,
          multiplier: mult,
          bonusPoints: award.bonus * mult,
          statDisplay: stats.detail,
          statFull: stats.fullStats
        };
      });
      
      const winnerStats = award.getStats(winner);
      
      return {
        ...winner,
        country: country,
        awardId: award.id,
        awardTitle: award.title,
        awardIcon: award.icon,
        awardColor: award.color,
        bonus: award.bonus,
        multiplier,
        bonusPoints,
        currentPoints,
        updatedPoints: currentPoints + bonusPoints,
        topThree: topThreeWithPoints,
        statValue: winnerStats.value,
        statDetail: winnerStats.detail,
        statFull: winnerStats.fullStats
      };
    }).filter(w => w !== null);

    setAwardWinners(winners);
  }, [awards, updatedTeams, updatedPlayers, initialPlayers]);

  // Effect to handle award presentation - applies points AND adds icon immediately
  useEffect(() => {
    if (currentAwardIndex >= 0 && currentAwardIndex < awardWinners.length) {
      const award = awardWinners[currentAwardIndex];
      if (award && !shownAwards.includes(award.awardId)) {
        // Apply points immediately when award is shown
        applyPointsImmediately(award, award.bonusPoints, award.awardId);
        // Add award icon to team immediately
        addTeamAwardIcon(award.dwlTeam, award.awardIcon);
        setShownAwards(prev => [...prev, award.awardId]);
      }
    }
  }, [currentAwardIndex, awardWinners, shownAwards]);

  const handleNextAward = () => {
    if (currentAwardIndex < awardWinners.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentAwardIndex(currentAwardIndex + 1);
        setIsAnimating(false);
      }, 300);
    } else {
      setShowFinalStandings(true);
    }
  };

  const handleViewFinalResults = async () => {
    // Prepare award data for the backend
    const awardWinnersData = awardWinners.map(award => ({
      name: award.name,
      award_icon: award.awardIcon,
      award_title: award.awardTitle,
      bonus_points: award.bonusPoints,
      dwl_team: award.dwlTeam,
      multiplier: award.multiplier
    }));
    
    // Prepare team awards (unique award icons per team)
    const teamAwards = {};
    awardWinners.forEach(award => {
      const team = award.dwlTeam;
      if (!teamAwards[team]) {
        teamAwards[team] = [];
      }
      if (!teamAwards[team].includes(award.awardIcon)) {
        teamAwards[team].push(award.awardIcon);
      }
    });
    
    try {
      const response = await fetch('/api/apply-awards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          award_winners: awardWinnersData,
          team_awards: teamAwards
        })
      });
      
      if (response.ok) {
        // Pass teamAwards back to parent
        if (onUpdateStandings) {
          onUpdateStandings(updatedTeams, updatedPlayers, teamAwards);
        }
        if (onComplete) onComplete();
      } else {
        const errorData = await response.json();
        console.error('Failed to apply awards:', errorData);
        if (onUpdateStandings) {
          onUpdateStandings(updatedTeams, updatedPlayers, teamAwards);
        }
        if (onComplete) onComplete();
      }
    } catch (error) {
      console.error('Error applying awards:', error);
      if (onUpdateStandings) {
        onUpdateStandings(updatedTeams, updatedPlayers, teamAwards);
      }
      if (onComplete) onComplete();
    }
  };

  // Render live standings table as a separate modal
  const renderLiveStandings = () => {
    const sortedTeams = [...updatedTeams].sort((a, b) => b.totalPoints - a.totalPoints);
    
    return (
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        style={{
          position: 'fixed',
          right: '2rem',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '320px',
          maxHeight: '70vh',
          overflowY: 'auto',
          background: 'rgba(13, 13, 26, 0.95)',
          borderRadius: '16px',
          padding: '1.25rem',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          zIndex: 10000
        }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '0.75rem'
        }}>
          <h4 style={{ color: '#e0e0e0', margin: 0, fontSize: '0.9rem' }}>
            📊 Live Standings
          </h4>
          <span style={{ color: '#999', fontSize: '0.7rem' }}>
            {shownAwards.length} awards given
          </span>
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '30px 1fr 50px 50px',
          gap: '0.5rem',
          padding: '0.5rem',
          background: 'rgba(102, 126, 234, 0.1)',
          borderRadius: '8px',
          fontSize: '0.65rem',
          color: '#999',
          fontWeight: 'bold',
          borderBottom: '1px solid rgba(255,255,255,0.05)'
        }}>
          <span>#</span>
          <span>Team</span>
          <span style={{ textAlign: 'right' }}>Pts</span>
          <span style={{ textAlign: 'center' }}>🏆</span>
        </div>
        
        {sortedTeams.map((team, idx) => {
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`;
          const teamColor = teamColors[team.name] || '#fff';
          const awardIcons = teamAwardIcons[team.name] || [];
          const isTop3 = idx < 3;
          
          return (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              style={{
                display: 'grid',
                gridTemplateColumns: '30px 1fr 50px 50px',
                gap: '0.5rem',
                padding: '0.5rem',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                alignItems: 'center',
                fontSize: '0.8rem',
                background: idx === 0 ? 'rgba(255,215,0,0.08)' : 'transparent',
                borderRadius: '4px',
                transition: 'background 0.3s'
              }}
            >
              <span style={{ fontSize: '0.9rem' }}>{medal}</span>
              <span style={{ 
                color: teamColor, 
                fontWeight: isTop3 ? 'bold' : 'normal',
                fontSize: isTop3 ? '0.85rem' : '0.8rem'
              }}>
                {team.name}
              </span>
              <span style={{ 
                textAlign: 'right', 
                fontWeight: 'bold',
                color: idx === 0 ? '#FFD700' : 'white',
                fontSize: isTop3 ? '0.9rem' : '0.8rem'
              }}>
                {team.totalPoints?.toFixed(1) || 0}
              </span>
              <span style={{ textAlign: 'center', fontSize: '0.8rem' }}>
                {awardIcons.join(' ')}
              </span>
            </motion.div>
          );
        })}
        
        <div style={{
          marginTop: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          fontSize: '0.65rem',
          color: '#666',
          textAlign: 'center'
        }}>
          {currentAwardIndex + 1} / {awardWinners.length} awards presented
        </div>
      </motion.div>
    );
  };

  const winnerTeam = awardWinners[currentAwardIndex]?.dwlTeam;
  const winnerTeamColors = updatedTeams.find(t => t.name === winnerTeam || t.abbr === winnerTeam);
  const bgColor = winnerTeamColors ? teamBgColors[winnerTeamColors.name] || '#0d0d1a' : '#0d0d1a';

  // Password Modal (same as Matches.jsx)
  if (showPasswordModal) {
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
          zIndex: 2000,
          padding: '1rem'
        }}
        onClick={() => setShowPasswordModal(false)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          style={{
            background: '#0d0d1a',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '400px',
            width: '100%',
            border: '1px solid #2a2a3e'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <KeyIcon style={{ width: 48, height: 48, color: '#667eea', margin: '0 auto' }} />
            <h3 style={{ color: 'white', marginTop: '1rem', marginBottom: '0.5rem' }}>Admin Access Required</h3>
            <p style={{ color: '#888', fontSize: '0.8rem' }}>
              Enter password to end tournament and announce winners
            </p>
            {failedAttempts > 0 && failedAttempts < maxFailedAttempts && (
              <p style={{ color: '#FF4444', fontSize: '0.7rem', marginTop: '0.5rem' }}>
                {maxFailedAttempts - failedAttempts} attempt(s) remaining
              </p>
            )}
          </div>
          
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && verifyPassword()}
            autoFocus
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#1a1a2e',
              border: '1px solid #2a2a3e',
              borderRadius: '8px',
              color: 'white',
              fontSize: '1rem',
              marginBottom: '1rem',
              outline: 'none'
            }}
          />
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => {
                setShowPasswordModal(false);
                setPassword('');
              }}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#2a2a3e',
                border: 'none',
                borderRadius: '8px',
                color: '#ccc',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={verifyPassword}
              disabled={verifying}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold',
                opacity: verifying ? 0.6 : 1
              }}
            >
              {verifying ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Confirmation screen - now shows "Enter Admin Password" button instead of direct password input
  if (showConfirmation) {
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
          background: 'rgba(0,0,0,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          style={{
            background: '#0d0d1a',
            borderRadius: '24px',
            padding: '2rem',
            maxWidth: '500px',
            width: '100%',
            border: '2px solid #FFD700'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <TrophyIcon style={{ width: 64, height: 64, color: '#FFD700', margin: '0 auto' }} />
            <h2 style={{ color: 'white', margin: '1rem 0 0.5rem' }}>End Tournament</h2>
            <p style={{ color: '#999' }}>
              Are you sure you want to end the tournament? This will finalize all standings and awards.
            </p>
          </div>

          <button
            onClick={() => {
              if (isLocked) {
                showToast('Access locked. Please wait for the lockout period to expire.', 'error');
                return;
              }
              setShowPasswordModal(true);
              setPassword('');
            }}
            disabled={isLocked}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: 'none',
              background: isLocked ? '#6c757d' : 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              fontWeight: 'bold',
              cursor: isLocked ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              opacity: isLocked ? 0.6 : 1
            }}
          >
            <LockClosedIcon style={{ width: 18, height: 18 }} />
            {isLocked ? `Locked (${lockDisplay})` : 'Enter Admin Password'}
          </button>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              onClick={() => onComplete && onComplete()}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #2a2a3e',
                background: 'transparent',
                color: '#999',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  if (showFinalStandings) {
    const winner = [...updatedTeams].sort((a, b) => b.totalPoints - a.totalPoints)[0];
    const winnerColors = teamBgColors[winner?.name] || '#0d0d1a';
    
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
          background: winnerColors,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
          overflowY: 'auto'
        }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          style={{
            background: 'rgba(13, 13, 26, 0.95)',
            borderRadius: '24px',
            padding: '2rem',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            border: '2px solid #FFD700'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              style={{ fontSize: '4rem', marginBottom: '1rem' }}
            >
              🏆
            </motion.div>
            <motion.h1
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10 }}
              style={{ color: '#FFD700', fontSize: '3rem', margin: 0 }}
            >
              CHAMPIONS!
            </motion.h1>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              style={{ color: 'white', fontSize: '2rem', margin: '0.5rem 0' }}
            >
              🎊 {winner?.name} 🎊
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              style={{ color: '#999' }}
            >
              Total Points: {winner?.totalPoints?.toFixed(1) || 0}
            </motion.p>
          </div>

          <h3 style={{ color: '#e0e0e0', marginBottom: '1rem' }}>Final Standings (Updated with Award Bonuses)</h3>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '60px 1fr 100px',
              padding: '0.75rem',
              background: 'rgba(102, 126, 234, 0.2)',
              color: '#999',
              fontWeight: 'bold',
              fontSize: '0.8rem'
            }}>
              <span>POS</span>
              <span>TEAM</span>
              <span style={{ textAlign: 'right' }}>POINTS</span>
            </div>
            {[...updatedTeams].sort((a, b) => b.totalPoints - a.totalPoints).map((team, idx) => {
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
              const isWinner = idx === 0;
              const teamColor = teamColors[team.name] || '#fff';
              const teamBg = teamBgColors[team.name] || 'rgba(255,255,255,0.05)';
              
              const teamAwards = [];
              awardWinners.forEach(award => {
                if (award.dwlTeam === team.name || award.dwlTeam === team.abbr) {
                  teamAwards.push(award.awardIcon);
                }
              });

              return (
                <div
                  key={team.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr 100px',
                    padding: '0.75rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: isWinner ? 'rgba(255,215,0,0.1)' : teamBg,
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>{medal}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: isWinner ? '#FFD700' : teamColor, fontWeight: isWinner ? 'bold' : 'normal' }}>
                      {team.name}
                    </span>
                    {teamAwards.map((icon, i) => (
                      <span key={i} style={{ fontSize: '1rem' }}>{icon}</span>
                    ))}
                  </div>
                  <span style={{ 
                    textAlign: 'right', 
                    fontWeight: 'bold',
                    color: isWinner ? '#FFD700' : 'white'
                  }}>
                    {team.totalPoints?.toFixed(1) || 0}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleViewFinalResults}
            style={{
              marginTop: '2rem',
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            View Final Results
          </button>
        </motion.div>
      </motion.div>
    );
  }

  if (!showAwards || awardWinners.length === 0 || currentAwardIndex === -1) {
    return null;
  }

  const award = awardWinners[currentAwardIndex];
  if (!award) return null;

  const teamColor = teamColors[award.dwlTeam] || '#fff';
  const teamBg = teamBgColors[award.dwlTeam] || 'rgba(255,255,255,0.05)';

  return (
    <>
      {/* Award Modal - Centered */}
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
          background: `linear-gradient(135deg, ${bgColor}88, #0d0d1a)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
          overflowY: 'auto'
        }}
      >
        <motion.div
          key={currentAwardIndex}
          initial={{ scale: 0.8, opacity: 0, rotateY: 20 }}
          animate={{ scale: 1, opacity: 1, rotateY: 0 }}
          exit={{ scale: 0.8, opacity: 0, rotateY: -20 }}
          transition={{ duration: 0.5 }}
          style={{
            background: 'rgba(13, 13, 26, 0.95)',
            borderRadius: '24px',
            padding: '2rem',
            maxWidth: '550px',
            width: '100%',
            maxHeight: '85vh',
            overflowY: 'auto',
            border: `2px solid ${award.awardColor}`,
            boxShadow: `0 0 40px ${award.awardColor}44`,
            marginRight: '180px'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ fontSize: '3rem' }}
            >
              {award.awardIcon}
            </motion.div>
            <h2 style={{ color: 'white', margin: '0.5rem 0' }}>{award.awardTitle}</h2>
            {award.minQualification && (
              <div style={{ color: '#999', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                {award.minQualification}
              </div>
            )}
            <div style={{ 
              color: award.awardColor,
              fontSize: '0.8rem',
              background: `${award.awardColor}22`,
              padding: '0.25rem 1rem',
              borderRadius: '12px',
              display: 'inline-block'
            }}>
              +{award.bonus} pts {award.multiplier > 1 ? `(×${award.multiplier} multiplier)` : ''}
            </div>
          </div>

          <div style={{
            background: teamBg,
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '1rem',
            border: `2px solid ${teamColor}44`,
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: '-12px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#0d0d1a',
              padding: '0 0.75rem',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              color: '#FFD700'
            }}>
              🥇 Winner
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${teamColor}, ${teamColor}88)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem'
              }}>
                {award.awardIcon}
              </div>
              <div>
                <div style={{ color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>
                  {award.name}
                </div>
                <div style={{ color: teamColor, fontSize: '0.9rem' }}>
                  {award.dwlTeam} • {award.country || 'Unknown'}
                </div>
                <div style={{ color: '#999', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Current Points: <span style={{ color: 'white', fontWeight: 'bold' }}>{award.currentPoints?.toFixed(1) || 0}</span>
                </div>
              </div>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem',
              marginTop: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: `1px solid ${teamColor}33`
            }}>
              <div style={{
                background: 'rgba(0,0,0,0.7)',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                backdropFilter: 'blur(4px)'
              }}>
                <div style={{ color: '#ccc', fontSize: '0.7rem' }}>Stat</div>
                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.95rem' }}>{award.statDetail}</div>
              </div>
              <div style={{
                background: 'rgba(0,0,0,0.7)',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                backdropFilter: 'blur(4px)'
              }}>
                <div style={{ color: '#ccc', fontSize: '0.7rem' }}>Details</div>
                <div style={{ color: '#eee', fontSize: '0.8rem' }}>{award.statFull}</div>
              </div>
            </div>
          </div>

          {award.topThree && award.topThree.length > 1 && (
            <div style={{
              marginBottom: '1rem',
              padding: '1rem',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '0.75rem', textAlign: 'center' }}>
                🏅 Runner-ups
              </div>
              
              {award.topThree
                .filter(player => player.name !== award.name)
                .slice(0, 2)
                .map((player, index) => {
                  const pos = index + 1;
                  const playerColor = teamColors[player.dwlTeam] || '#fff';
                  const playerBg = teamBgColors[player.dwlTeam] || 'rgba(255,255,255,0.03)';
                  const medal = pos === 1 ? '🥈' : '🥉';
                  const medalColor = pos === 1 ? '#C0C0C0' : '#CD7F32';
                  
                  return (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.75rem',
                        marginBottom: index === 0 ? '0.5rem' : 0,
                        background: playerBg,
                        borderRadius: '10px',
                        border: `1px solid ${playerColor}33`
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>{medal}</span>
                        <div>
                          <div style={{ color: 'white', fontWeight: '500', fontSize: '0.95rem' }}>
                            {player.name}
                          </div>
                          <div style={{ color: playerColor, fontSize: '0.75rem' }}>
                            {player.dwlTeam || 'Unknown'} • {player.country || 'Unknown'}
                          </div>
                          <div style={{ color: '#aaa', fontSize: '0.65rem', marginTop: '0.15rem' }}>
                            Current Points: <span style={{ color: 'white', fontWeight: 'bold' }}>{player.currentPoints?.toFixed(1) || 0}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          background: 'rgba(0,0,0,0.7)',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          backdropFilter: 'blur(4px)',
                          marginBottom: '0.2rem'
                        }}>
                          <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.9rem' }}>
                            {player.statDisplay}
                          </div>
                        </div>
                        <div style={{
                          background: 'rgba(0,0,0,0.5)',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '6px',
                          backdropFilter: 'blur(4px)'
                        }}>
                          <div style={{ color: '#ddd', fontSize: '0.7rem' }}>
                            {player.statFull}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#aaa', fontSize: '0.7rem' }}>Current DWL Points</div>
                <div style={{ color: 'white', fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {award.currentPoints?.toFixed(1) || 0}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <motion.div
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 0.5 }}
                  style={{ fontSize: '1.5rem', color: '#4CAF50', fontWeight: 'bold' }}
                >
                  +{award.bonusPoints?.toFixed(1) || 0}
                </motion.div>
                <div style={{ color: '#aaa', fontSize: '0.7rem' }}>
                  ×{award.multiplier} bonus
                </div>
              </div>
              <div>
                <div style={{ color: '#aaa', fontSize: '0.7rem' }}>Updated Points</div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 10 }}
                  style={{
                    color: '#FFD700',
                    fontSize: '1.8rem',
                    fontWeight: 'bold'
                  }}
                >
                  {award.updatedPoints?.toFixed(1) || 0}
                </motion.div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleNextAward}
              style={{
                padding: '0.75rem 2rem',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '1rem'
              }}
            >
              {currentAwardIndex === awardWinners.length - 1 ? 'Finish 🎉' : 'Next Award →'}
            </button>
          </div>

          <div style={{ 
            textAlign: 'center', 
            marginTop: '0.75rem',
            color: '#666',
            fontSize: '0.8rem'
          }}>
            {currentAwardIndex + 1} / {awardWinners.length}
          </div>
        </motion.div>
      </motion.div>

      {/* Live Standings Modal - Beside the award modal */}
      {renderLiveStandings()}
    </>
  );
}

export default EndTournament;