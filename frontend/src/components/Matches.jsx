import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon, XMarkIcon, CloudArrowUpIcon, EyeIcon, LockClosedIcon, KeyIcon } from '@heroicons/react/24/outline';
import { fetchMatchFromESPN, fetchMatchDetails, verifyAdminPassword, getPasswordStatus, getAdminConfig } from '../services/api';
import MatchDetailsModal from './MatchDetailsModal';
import { countryAbbrToFullNames } from '../data/countryInfo';

// Country abbreviation to full name mapping
const countryNames = countryAbbrToFullNames

function Matches({ matches, onMatchAdded }) {
  const [showForm, setShowForm] = useState(false);
  const [matchNum, setMatchNum] = useState('');
  const [matchId, setMatchId] = useState('');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchDetails, setMatchDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [fetchingModal, setFetchingModal] = useState(false);
  
  // Password protection states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
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

  // Load config from backend
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
        // Use default values if config fails to load
        setMaxFailedAttempts(3);
        setLockoutDurationMinutes(30);
        setLockoutDurationMs(30 * 60 * 1000);
        setConfigLoaded(true);
      }
    };
    loadConfig();
  }, []);

  // Load failed attempts from localStorage on mount
  useEffect(() => {
    if (!configLoaded) return;
    
    const loadLockState = async () => {
      try {
        // First check with backend for authoritative lock status
        const status = await getPasswordStatus();
        
        if (status.is_locked && status.remaining_seconds > 0) {
          // Backend says we're locked
          setIsLocked(true);
          const remainingMs = status.remaining_seconds * 1000;
          
          // Clear any existing timer
          if (lockTimer) {
            clearTimeout(lockTimer);
            setLockTimer(null);
          }
          
          // Start new timer
          const timer = setTimeout(() => {
            clearLock();
            showToast('🔓 Lockout period expired. You can try again.', 'info');
          }, remainingMs);
          setLockTimer(timer);
          
          // Set display
          const minutes = Math.floor(status.remaining_seconds / 60);
          const seconds = status.remaining_seconds % 60;
          setLockDisplay(`${minutes}:${seconds.toString().padStart(2, '0')}`);
          
          // Update localStorage to match backend
          localStorage.setItem('dwl_is_locked', 'true');
          localStorage.setItem('dwl_lock_time', (Date.now() - (lockoutDurationMs - remainingMs)).toString());
          localStorage.setItem('dwl_failed_attempts', maxFailedAttempts.toString());
        } else if (status.is_locked && status.remaining_seconds <= 0) {
          // Backend lock expired, clear everything
          clearLock();
        } else {
          // Not locked, check localStorage as fallback
          const savedLocked = localStorage.getItem('dwl_is_locked');
          const savedLockTime = localStorage.getItem('dwl_lock_time');
          
          if (savedLocked === 'true' && savedLockTime) {
            const lockTime = parseInt(savedLockTime);
            const elapsed = Date.now() - lockTime;
            const remaining = lockoutDurationMs - elapsed;
            
            if (remaining > 0) {
              // Still locked
              setIsLocked(true);
              
              // Clear any existing timer
              if (lockTimer) {
                clearTimeout(lockTimer);
                setLockTimer(null);
              }
              
              // Start timer with remaining time
              const timer = setTimeout(() => {
                clearLock();
                showToast('🔓 Lockout period expired. You can try again.', 'info');
              }, remaining);
              setLockTimer(timer);
              
              // Set display immediately
              const minutes = Math.floor(remaining / 60000);
              const seconds = Math.floor((remaining % 60000) / 1000);
              setLockDisplay(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            } else {
              // Lock expired, clear it
              clearLock();
            }
          }
        }
      } catch (error) {
        console.error('Failed to get lock status from backend:', error);
        // Fallback to localStorage only
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

  // Update lock display timer
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
        // Lock expired
        clearLock();
        if (interval) clearInterval(interval);
      } else {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        setLockDisplay(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };
    
    if (isLocked) {
      // Immediate update
      updateLockDisplay();
      
      // Use requestAnimationFrame for better performance with tab switching
      const tick = () => {
        updateLockDisplay();
        animationFrame = requestAnimationFrame(tick);
      };
      
      // Also keep interval as backup for when tab is inactive
      interval = setInterval(updateLockDisplay, 1000);
      animationFrame = requestAnimationFrame(tick);
    }
    
    // Cleanup
    return () => {
      if (interval) {
        clearInterval(interval);
      }
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isLocked, lockoutDurationMs]);

  // Save failed attempts to localStorage
  const saveFailedAttempts = (attempts) => {
    localStorage.setItem('dwl_failed_attempts', attempts);
  };

  const clearLock = () => {
    setIsLocked(false);
    setFailedAttempts(0);
    setPassword('');
    setLockDisplay('');
    
    // Clear localStorage
    localStorage.removeItem('dwl_failed_attempts');
    localStorage.removeItem('dwl_is_locked');
    localStorage.removeItem('dwl_lock_time');
    
    // Clear timer
    if (lockTimer) {
      clearTimeout(lockTimer);
      setLockTimer(null);
    }
    
    // Note: Backend will auto-clear after lockout duration
    // No need to call backend API as it manages its own timer
  };

  const startLockTimer = (duration) => {
    // Clear any existing timer first
    if (lockTimer) {
      clearTimeout(lockTimer);
      setLockTimer(null);
    }
    
    const timer = setTimeout(() => {
      clearLock();
      showToast('🔓 Lockout period expired. You can try again.', 'info');
    }, duration);
    setLockTimer(timer);
    
    // Also store the lock time in localStorage if not already there
    if (!localStorage.getItem('dwl_lock_time')) {
      localStorage.setItem('dwl_lock_time', Date.now().toString());
    }
  };

  const handleAddMatchClick = () => {
    if (isLocked) {
      showToast('Access locked. Please wait for the lockout period to expire.', 'error');
      return;
    }
    if (!showForm) {
      setShowPasswordModal(true);
      setPassword('');
    }
    setShowForm(false);
  };

  const verifyPassword = async () => {
    setVerifying(true);
    try {
      const result = await verifyAdminPassword(password);
      
      if (result.success) {
        // Password correct - reset attempts and open form
        setFailedAttempts(0);
        saveFailedAttempts(0);
        setShowPasswordModal(false);
        setPassword('');
        setShowForm(true);
        showToast('✅ Access granted!', 'success');
      } else if (result.is_locked) {
        // Account is locked
        setIsLocked(true);
        const remainingSeconds = result.remaining_seconds;
        const remainingMs = remainingSeconds * 1000;
        
        // Store in localStorage
        localStorage.setItem('dwl_is_locked', 'true');
        localStorage.setItem('dwl_lock_time', Date.now().toString());
        localStorage.setItem('dwl_failed_attempts', maxFailedAttempts.toString());
        
        setLockDisplay(formatLockTime(remainingSeconds));
        setShowPasswordModal(false);
        setPassword('');
        showToast(result.message || 'Too many failed attempts. Feature locked.', 'error');
        
        // Clear any existing timer
        if (lockTimer) {
          clearTimeout(lockTimer);
          setLockTimer(null);
        }
        
        // Start lock timer
        const timer = setTimeout(() => {
          clearLock();
          showToast('🔓 Lockout period expired. You can try again.', 'info');
        }, remainingMs);
        setLockTimer(timer);
      } else {
        // Incorrect password
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

  // Add this useEffect to periodically verify lock status
  useEffect(() => {
    if (!isLocked) return;
    
    const checkLockPeriodically = () => {
      const lockTime = localStorage.getItem('dwl_lock_time');
      if (!lockTime) {
        clearLock();
        return;
      }
      
      const elapsed = Date.now() - parseInt(lockTime);
      const remaining = lockoutDurationMs - elapsed;
      
      if (remaining <= 0) {
        clearLock();
      }
    };
    
    // Check every 5 seconds as a backup
    const interval = setInterval(checkLockPeriodically, 5000);
    
    return () => clearInterval(interval);
  }, [isLocked, lockoutDurationMs]);
  
  // Helper function to format lock time
  const formatLockTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Add a function to check lock status on mount
  const checkLockStatus = async () => {
    try {
      const status = await getPasswordStatus();
      if (status.is_locked && status.remaining_seconds > 0) {
        setIsLocked(true);
        const remainingMs = status.remaining_seconds * 1000;
        startLockTimer(remainingMs);
        setLockDisplay(formatLockTime(status.remaining_seconds));
        // Also save to localStorage for persistence
        localStorage.setItem('dwl_is_locked', 'true');
        localStorage.setItem('dwl_lock_time', Date.now().toString());
      }
    } catch (error) {
      console.error('Failed to check lock status:', error);
    }
  };

  // Add this useEffect to periodically sync with backend
  useEffect(() => {
    if (!isLocked) return;
    
    const syncWithBackend = async () => {
      try {
        const status = await getPasswordStatus();
        
        if (!status.is_locked) {
          // Backend says we're not locked, clear local lock
          clearLock();
          showToast('🔓 Lockout period expired. You can try again.', 'info');
        } else if (status.remaining_seconds <= 0) {
          // Backend lock expired
          clearLock();
          showToast('🔓 Lockout period expired. You can try again.', 'info');
        } else {
          // Update display with accurate remaining time from backend
          const remainingSeconds = status.remaining_seconds;
          const minutes = Math.floor(remainingSeconds / 60);
          const seconds = remainingSeconds % 60;
          setLockDisplay(`${minutes}:${seconds.toString().padStart(2, '0')}`);
          
          // Update localStorage lock time to match backend
          const lockTime = Date.now() - (lockoutDurationMs - (remainingSeconds * 1000));
          localStorage.setItem('dwl_lock_time', lockTime.toString());
        }
      } catch (error) {
        console.error('Failed to sync with backend:', error);
      }
    };
    
    // Sync immediately
    syncWithBackend();
    
    // Then sync every 30 seconds to ensure consistency
    const interval = setInterval(syncWithBackend, 30000);
    
    return () => clearInterval(interval);
  }, [isLocked, lockoutDurationMs]);

  useEffect(() => {
    // checkLockStatus is now handled in the main loading useEffect
    // Remove the separate checkLockStatus call to avoid conflicts
  }, []);

  // Add this new useEffect after the checkLockStatus useEffect:
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isLocked) {
        // Tab became visible again, check actual lock status
        const lockTime = localStorage.getItem('dwl_lock_time');
        if (lockTime) {
          const elapsed = Date.now() - parseInt(lockTime);
          const remaining = lockoutDurationMs - elapsed;
          
          if (remaining <= 0) {
            // Lock should be expired
            clearLock();
          } else {
            // Update display immediately
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            setLockDisplay(`${minutes}:${seconds.toString().padStart(2, '0')}`);
          }
        }
      }
    };
    
    // Also check when page becomes visible after being hidden
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Check when window gains focus
    window.addEventListener('focus', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [isLocked, lockoutDurationMs]);

  useEffect(() => {
    if (showForm && matches.length > 0) {
      const maxMatchNum = Math.max(...matches.map(m => m.matchNum));
      setMatchNum((maxMatchNum + 1).toString());
    } else if (showForm && matches.length === 0) {
      setMatchNum('1');
    }
  }, [showForm, matches]);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFetchFromESPN = async () => {
    if (!matchId || !matchNum) {
      showToast('Please enter both Match ID and Match Number', 'error');
      return;
    }
    setLoading(true);
    setFetchingModal(true);
    
    try {
      const result = await fetchMatchFromESPN(parseInt(matchId), parseInt(matchNum));
      setFetchingModal(false);
      
      if (result.success) {
        showToast(`✅ Match ${matchNum} fetched successfully!`, 'success');
        if (onMatchAdded) onMatchAdded();
        setShowForm(false);
        setMatchNum('');
        setMatchId('');
      }
    } catch (error) {
      setFetchingModal(false);
      showToast(error.message || '❌ Failed to fetch match data', 'error');
    } finally {
      setLoading(false);
    }
  };

  function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  }

  const getMatchDate = (matchTitle) => {
    if (!matchTitle) return  "";
    const parts = matchTitle.split(" | ");
    return formatDate(parts[1]?.trim() || "");
  };

  const handleViewMatchDetails = async (match) => {
    setSelectedMatch(match);
    setDetailsLoading(true);
    try {
      const details = await fetchMatchDetails(match.matchNum);
      setMatchDetails(details);
    } catch (error) {
      showToast('Failed to load match details', 'error');
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeMatchDetails = () => {
    setSelectedMatch(null);
    setMatchDetails(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '2rem', color: 'white' }}>🎮 Match Center</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleAddMatchClick}
            disabled={isLocked}
            style={{
              opacity: isLocked ? 0.6 : 1,
              cursor: isLocked ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <LockClosedIcon style={{ width: 18, height: 18 }} />
            {showForm ? 'Cancel' : 'Add Match'}
            {isLocked && <span style={{ fontSize: '0.7rem', marginLeft: '0.5rem' }}>(Locked) {lockDisplay}</span>}
          </button>
        </div>
      </div>

      {/* Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
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
                  Enter password to add new matches
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
                  onClick={() => setShowPasswordModal(false)}
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
        )}
      </AnimatePresence>

      {/* Rest of your component remains the same */}
      <AnimatePresence>
        {showForm && (
          <motion.div className="card" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <h3 className="card-title">Add New Match</h3>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '1rem', fontWeight: 'bold', color: '#666' }}>Match Number</label>
                <input 
                  type="number" 
                  placeholder="e.g., 1" 
                  value={matchNum} 
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (e.target.value === '' || value >= 1) {
                      setMatchNum(e.target.value);
                    }
                  }} 
                  min="1"
                  onKeyDown={(e) => {
                    // Prevent '-' key from being typed
                    if (e.key === '-' || e.key === 'e') {
                      e.preventDefault();
                    }
                  }}
                  style={{ 
                    padding: '0.5rem 0.75rem', 
                    width: '120px',
                    border: '2px solid #e0e0e0', 
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }} 
                  disabled={loading}
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '1rem', fontWeight: 'bold', color: '#666' }}>ESPN Match ID</label>
                <input 
                  type="text" 
                  placeholder="e.g., 1432422" 
                  value={matchId} 
                  onChange={(e) => setMatchId(e.target.value)} 
                  style={{ 
                    padding: '0.5rem 0.75rem', 
                    width: '140px',
                    border: '2px solid #e0e0e0', 
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }} 
                  disabled={loading}
                />
              </div>
              
              <button 
                onClick={handleFetchFromESPN} 
                disabled={loading} 
                style={{ 
                  padding: '0.5rem 1rem',
                  background: loading ? '#6c757d' : '#28a745',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  color: 'white',
                  fontWeight: '500',
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                  marginBottom: '0px'
                }}
              >
                {loading ? 'Fetching...' : 'Add Match'}
              </button>
            </div>
            
            {loading && (
              <div style={{ marginTop: '1rem', textAlign: 'center', color: '#17a2b8', fontSize: '0.8rem' }}>
                ⏳ Fetching match data from ESPN...
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="card">
        <h3 className="card-title">Match History</h3>
        {matches.length === 0 ? <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>No matches recorded yet</p> :
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {matches.map((m, i) => {
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
                  onClick={() => handleViewMatchDetails(m)}
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
                      handleViewMatchDetails(m);
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

      {/* Fetching Modal */}
      <AnimatePresence>
        {fetchingModal && (
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
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '2rem',
                textAlign: 'center',
                minWidth: '300px'
              }}
            >
              <div style={{
                width: '50px',
                height: '50px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #17a2b8',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem auto'
              }} />
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Fetching Match Data</h3>
              <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>
                Fetching match #{matchNum} from ESPNcricinfo...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Match Details Modal */}
      <AnimatePresence>
        {selectedMatch && matchDetails && (
          <MatchDetailsModal match={matchDetails} onClose={closeMatchDetails} />
        )}
      </AnimatePresence>

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          padding: '0.75rem 1.5rem',
          borderRadius: '10px',
          background: toast.type === 'success' ? '#28a745' : toast.type === 'error' ? '#dc3545' : '#17a2b8',
          color: 'white',
          fontWeight: 'bold',
          zIndex: 1100,
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

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

export default Matches;