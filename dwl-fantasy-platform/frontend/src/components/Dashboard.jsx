import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HomeIcon, 
  TrophyIcon, 
  UsersIcon, 
  UserGroupIcon, 
  DocumentTextIcon, 
  ChartBarIcon, 
  CalendarIcon,
  ArrowRightIcon,
  FireIcon,
  StarIcon,
  BoltIcon,
  ClockIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { teamPrimaryColors, teamSecondaryColors, teamEmojis } from '../data/teamColors';

// Dynamic logo function
const getTeamLogo = (teamName) => {
  const filename = teamName.toLowerCase().replace(/ /g, '-');
  const imagePath = `/logos/${filename}.png`;
  return { imagePath, emoji: teamEmojis[teamName] || '🏏' };
};

function Dashboard({ teams, players, matches, setActiveTab }) {
  const [showAnimation, setShowAnimation] = useState(true);
  const [imageErrors, setImageErrors] = useState({});
  const [centralLogoError, setCentralLogoError] = useState(false);
  
  // Run animation on mount
  useEffect(() => {
    // Prevent body scroll during animation
    document.body.style.overflow = 'hidden';
    
    const timer = setTimeout(() => {
      setShowAnimation(false);
      document.body.style.overflow = 'auto';
    }, 2800);
    
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handleImageError = (teamName) => {
    setImageErrors(prev => ({ ...prev, [teamName]: true }));
  };

  const getTeamPlayers = (teamName) => players.filter(p => p.team === teamName);

  const totalPoints = teams.reduce((sum, t) => sum + (t.totalPoints || 0), 0);
  const matchesPlayed = matches.length;
  const TOTAL_MATCHES = 33;

  // Find top team
  const topTeam = teams.length > 0 ? [...teams].sort((a, b) => b.totalPoints - a.totalPoints)[0] : null;
  
  // Find top player
  const topPlayer = players.length > 0 ? [...players].sort((a, b) => b.points - a.points)[0] : null;

  // Calculate average points per player
  const avgPointsPerPlayer = players.length > 0 ? (totalPoints / players.length).toFixed(1) : 0;

  // Calculate highest scoring match by summing all team points
  const highestScoringMatch = matches.length > 0 ? 
    [...matches].sort((a, b) => {
      const totalPointsA = a.teamPoints ? Object.values(a.teamPoints).reduce((sum, points) => sum + points, 0) : 0;
      const totalPointsB = b.teamPoints ? Object.values(b.teamPoints).reduce((sum, points) => sum + points, 0) : 0;
      return totalPointsB - totalPointsA;
    })[0] : null;

  const highestMatchTotalPoints = highestScoringMatch ? 
    Object.values(highestScoringMatch.teamPoints || {}).reduce((sum, points) => sum + points, 0) : 0;

  // Navigation links
  const navLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: HomeIcon, color: '#667eea', description: 'Overview & stats' },
    { id: 'standings', label: 'Standings', icon: TrophyIcon, color: '#FFD700', description: 'League rankings' },
    { id: 'teams', label: 'Teams', icon: UsersIcon, color: '#FF69B4', description: 'Team rosters' },
    { id: 'players', label: 'Players', icon: UserGroupIcon, color: '#4CAF50', description: 'Player directory' },
    { id: 'scoring', label: 'Scoring Rules', icon: DocumentTextIcon, color: '#FF6B35', description: 'Points system' },
    { id: 'stats', label: 'Stats', icon: ChartBarIcon, color: '#2196F3', description: 'Match stats' },
    { id: 'matches', label: 'Matches', icon: CalendarIcon, color: '#9C27B0', description: 'Match center' },
    { id: 'about', label: 'About Us', icon: InformationCircleIcon, color: '#E07519', description: 'About Us' },
  ];

  // Quick Stats
  const quickStats = [
    { label: 'Teams', value: teams.length, icon: UsersIcon, color: '#FFD700' },
    { label: 'Players', value: players.length, icon: UserGroupIcon, color: '#4CAF50' },
    { label: 'Avg Points/Player', value: avgPointsPerPlayer, icon: StarIcon, color: '#FF6B35' },
    { label: 'Total Points', value: Math.round(totalPoints).toLocaleString(), icon: FireIcon, color: '#FF5722' },
  ];

  // Animation sequence
  if (showAnimation) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#0a0a0f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '500px',
            height: '500px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Central Logo */}
          <motion.div
            style={{
              width: '160px',
              height: '160px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 20,
              position: 'relative',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {!centralLogoError ? (
              <img 
                src="/delulu-womens-league.jpeg" 
                alt="DWL Logo"
                style={{ 
                  width: '160px',
                  height: '160px',
                  objectFit: 'contain',
                  borderRadius: '50%',
                }}
                onError={() => setCentralLogoError(true)}
              />
            ) : (
              <div
                style={{
                  width: '160px',
                  height: '160px',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  borderRadius: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '5rem',
                  boxShadow: '0 0 40px rgba(102,126,234,0.6)',
                }}
              >
                🏏
              </div>
            )}
          </motion.div>

          {/* Stemming Out Team Logos with Actual Images */}
          {teams.map((team, idx) => {
            const angle = (idx / teams.length) * Math.PI * 2;
            const radius = 180;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const { imagePath, emoji } = getTeamLogo(team.name);
            const hasError = imageErrors[team.name];
            
            return (
              <motion.div
                key={team.id}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  marginLeft: -35,
                  marginTop: -35,
                  width: '70px',
                  height: '70px',
                  background: teamPrimaryColors[team.name] || '#667eea',
                  borderRadius: '35px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  zIndex: 10,
                  overflow: 'hidden',
                }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                animate={{ 
                  x: x, 
                  y: y, 
                  opacity: 1, 
                  scale: 1,
                }}
                transition={{ 
                  delay: 0.5 + (idx * 0.08),
                  duration: 0.6,
                  type: 'spring',
                  stiffness: 120,
                  damping: 15,
                }}
              >
                {!hasError ? (
                  <img 
                    src={imagePath}
                    alt={team.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      padding: '8px',
                    }}
                    onError={() => handleImageError(team.name)}
                  />
                ) : (
                  <span style={{ fontSize: '2rem' }}>{emoji}</span>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Loading Text */}
        <motion.div
          style={{
            position: 'absolute',
            bottom: '15%',
            color: '#667eea',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            letterSpacing: '3px',
            textTransform: 'uppercase',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Delulu Women's League
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          style={{
            position: 'absolute',
            bottom: '12%',
            width: '200px',
            height: '2px',
            background: 'rgba(102,126,234,0.2)',
            borderRadius: '1px',
            overflow: 'hidden',
          }}
        >
          <motion.div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, #667eea, #764ba2)',
              borderRadius: '1px',
            }}
            initial={{ x: '-100%' }}
            animate={{ x: '0%' }}
            transition={{ duration: 2.5, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background Image - Only for Home (Dashboard) Page */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'url("/group-ai.jpeg")',
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
        opacity: 0.6,
        zIndex: -1,
      }} />

      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(102,126,234,0.15), rgba(118,75,162,0.15))',
        borderRadius: '24px',
        padding: '2rem',
        marginBottom: '2rem',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              {!centralLogoError ? (
                <img 
                  src="/delulu-womens-league.jpeg" 
                  alt="DWL Logo"
                  style={{ 
                    width: '60px',
                    height: '60px',
                    objectFit: 'contain',
                    borderRadius: '50%',
                  }}
                  onError={() => setCentralLogoError(true)}
                />
              ) : (
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem'
                }}>
                  🏏
                </div>
              )}
              <div>
                <h1 style={{ fontSize: '2rem', margin: 0, color: 'white' }}>Welcome to Delulu Women's League</h1>
                <p style={{ margin: '0.25rem 0 0', color: '#aaa' }}>Season 1 • 2026</p>
              </div>
            </div>
            <p style={{ color: '#ccc', maxWidth: '750px', margin: 0 }}>
              The Delulu World™ is proud to present its new Delulu Women's League (DWL) featuring {teams.length} teams.
              It is a fantasy league based on the ICC Women's T20 World Cup 2026 edition. Explore some of the most exciting 
              action from the league as it progresses. 
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {quickStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              style={{
                background: 'rgba(17, 17, 34, 0.8)',
                borderRadius: '16px',
                padding: '1rem',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                background: `${stat.color}20`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon style={{ width: '24px', height: '24px', color: stat.color }} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>{stat.value}</div>
                <div style={{ fontSize: '0.75rem', color: '#888' }}>{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Cards */}
      <h3 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.2rem' }}>Quick Navigation</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {navLinks.map((link, idx) => {
          const Icon = link.icon;
          return (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setActiveTab(link.id)}
              style={{
                background: 'rgba(17, 17, 34, 0.8)',
                borderRadius: '16px',
                padding: '1rem',
                cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.08)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = link.color;
                e.currentTarget.style.background = `rgba(17, 17, 34, 0.95)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.background = 'rgba(17, 17, 34, 0.8)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  background: `${link.color}20`,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon style={{ width: '22px', height: '22px', color: link.color }} />
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', color: 'white' }}>{link.label}</div>
                  <div style={{ fontSize: '0.7rem', color: '#888' }}>{link.description}</div>
                </div>
              </div>
              <ArrowRightIcon style={{ width: '16px', height: '16px', color: '#666' }} />
            </motion.div>
          );
        })}
      </div>

      {/* League Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Top Team Card */}
        <div style={{
          background: 'rgba(17, 17, 34, 0.8)',
          borderRadius: '16px',
          padding: '1.25rem',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <TrophyIcon style={{ width: '20px', height: '20px', color: '#FFD700' }} />
            <span style={{ color: '#aaa', fontSize: '0.8rem' }}>LEADER</span>
          </div>
          {topTeam ? (
            <>
              <div style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                color: teamSecondaryColors[topTeam.name] || '#fff',
                marginBottom: '0.25rem'
              }}>
                {topTeam.name}
              </div>
              <div style={{ color: '#888', fontSize: '0.8rem' }}>
                {Math.round(topTeam.totalPoints).toLocaleString()} points • {getTeamPlayers(topTeam.name).length} players
              </div>
            </>
          ) : (
            <div style={{ color: '#666' }}>No data available yet</div>
          )}
        </div>

        {/* Top Player Card */}
        <div style={{
          background: 'rgba(17, 17, 34, 0.8)',
          borderRadius: '16px',
          padding: '1.25rem',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <StarIcon style={{ width: '20px', height: '20px', color: '#FFD700' }} />
            <span style={{ color: '#aaa', fontSize: '0.8rem' }}>TOP PERFORMER</span>
          </div>
          {topPlayer ? (
            <>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>
                {topPlayer.name}
              </div>
              <div style={{ color: '#888', fontSize: '0.8rem' }}>
                {topPlayer.points} points • {topPlayer.team}
              </div>
            </>
          ) : (
            <div style={{ color: '#666' }}>No data available yet</div>
          )}
        </div>

        {/* Highest Scoring Match Card */}
        <div style={{
          background: 'rgba(17, 17, 34, 0.8)',
          borderRadius: '16px',
          padding: '1.25rem',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <BoltIcon style={{ width: '20px', height: '20px', color: '#FF8C00' }} />
            <span style={{ color: '#aaa', fontSize: '0.8rem' }}>HIGHEST SCORING</span>
          </div>
          {highestScoringMatch ? (
            <>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#FF8C00', marginBottom: '0.25rem' }}>
                Match #{highestScoringMatch.matchNum}
              </div>
              <div style={{ color: '#888', fontSize: '0.8rem' }}>
                {Math.round(highestMatchTotalPoints).toLocaleString()} total points
              </div>
            </>
          ) : (
            <div style={{ color: '#666' }}>No matches yet</div>
          )}
        </div>

        {/* League Progress Card */}
        <div style={{
          background: 'rgba(17, 17, 34, 0.8)',
          borderRadius: '16px',
          padding: '1.25rem',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <ClockIcon style={{ width: '20px', height: '20px', color: '#2196F3' }} />
            <span style={{ color: '#aaa', fontSize: '0.8rem' }}>PROGRESS</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>
            {matchesPlayed}/{TOTAL_MATCHES} Matches
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            background: '#2a2a3e',
            borderRadius: '3px',
            marginTop: '0.75rem',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${(matchesPlayed / TOTAL_MATCHES) * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #667eea, #764ba2)',
              borderRadius: '3px'
            }} />
          </div>
          <div style={{ color: '#888', fontSize: '0.7rem', marginTop: '0.5rem' }}>
            {Math.round((matchesPlayed / TOTAL_MATCHES) * 100)}% Complete
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default Dashboard;