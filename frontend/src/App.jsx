import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartIcon } from '@heroicons/react/24/outline';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Standings from './components/Standings';
import Teams from './components/Teams';
import Players from './components/Players';
import Matches from './components/Matches';
import Scoring from './components/Scoring';
import Settings from './components/Settings';
import Stats from './components/Stats';
import { healthCheck, fetchTeams, fetchPlayers, fetchMatches, fetchAllMatchesDetails } from './services/api';
import { calculateTournamentStats } from './services/statsService';
import './styles/App.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState(null);
  const [error, setError] = useState(null);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [tournamentStats, setTournamentStats] = useState({
    mostRuns: null,
    mostWickets: null,
    highestStrikeRate: null,
    bestEconomy: null,
    leaderMap: {}
  });
  const [statsLoading, setStatsLoading] = useState(false);
  
  useEffect(() => {
    checkBackendConnection();
  }, []);
  
  const checkBackendConnection = async () => {
    try {
      const status = await healthCheck();
      setBackendStatus(status);
      if (status.config_loaded) {
        await loadData();
      }
    } catch (err) {
      console.error('Backend not reachable:', err);
      setBackendStatus({ healthy: false });
      setError('Backend server is not running. Please start the API server.');
    } finally {
      setLoading(false);
    }
  };
  
  const loadData = async () => {
    try {
      const [teamsData, playersData, matchesData] = await Promise.all([
        fetchTeams(),
        fetchPlayers(),
        fetchMatches()
      ]);
      setTeams(teamsData);
      setPlayers(playersData);
      setMatches(matchesData);
      // Fetch match details for tournament stats (do this separately to not block main UI)
      if (matchesData && matchesData.length > 0) {
        setStatsLoading(true);
        try {
          const matchDetails = await fetchAllMatchesDetails(matchesData);
          const stats = calculateTournamentStats(matchDetails);
          setTournamentStats(stats);
        } catch (err) {
          console.error('Error loading tournament stats:', err);
        } finally {
          setStatsLoading(false);
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data from backend');
    }
  };
  
  const refreshData = async () => {
    await loadData();
  };
  
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Connecting to DWL Backend...</p>
      </div>
    );
  }
  
  if (error || (backendStatus && !backendStatus.config_loaded)) {
    return (
      <div className="error-screen">
        <div className="error-card">
          <h2>⚠️ Backend Not Ready</h2>
          <p>{error || 'Configuration not loaded. Please upload your WWC_Config.xlsx file.'}</p>
          <div className="error-actions">
            <button onClick={() => window.location.reload()} className="btn btn-primary">
              Retry Connection
            </button>
          </div>
          <div className="error-instructions">
            <h3>Quick Fix:</h3>
            <ol>
              <li>Make sure backend is running: <code>python api_server.py</code></li>
              <li>Upload your <code>WWC_Config.xlsx</code> in the Players tab</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }
  
  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard':
        return <Dashboard 
          teams={teams} 
          players={players} 
          matches={matches} 
          setActiveTab={setActiveTab}
        />;
      case 'standings':
        return <Standings teams={teams} matches={matches} />;
      case 'teams':
        return <Teams teams={teams} players={players} leaderMap={tournamentStats?.leaderMap || {}} />;
      case 'scoring':
        return <Scoring />;
      case 'players':
        return <Players players={players} onRefresh={refreshData} />;
      case 'stats':
        return <Stats teams={teams} players={players} matches={matches} leaderMap={tournamentStats?.leaderMap || {}} tournamentStats={tournamentStats} setActiveTab={setActiveTab} />;
      case 'matches':
        return <Matches matches={matches} onMatchAdded={refreshData} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard 
        teams={teams} 
        players={players} 
        matches={matches} 
        setActiveTab={setActiveTab}
      />
    }
  };

  return (
    <div className="app">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
      <footer style={{
        textAlign: 'center',
        padding: '1.5rem',
        marginTop: '2rem',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        color: '#888',
        fontSize: '0.75rem'
      }}>
        <p>© {new Date().getFullYear()} The Delulu World™. All rights reserved.</p>
        <p style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>
        Made with <HeartIcon style={{ width: '12px', height: '12px', color: '#FF6B6B' }} /> for Delulu Women's League (DWL)
        </p>
      </footer>
    </div>
  );
}

export default App;