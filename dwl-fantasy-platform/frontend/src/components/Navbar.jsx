import React from 'react';
import {
  HomeIcon,
  TrophyIcon,
  UsersIcon,
  UserGroupIcon,
  InformationCircleIcon,
  CalendarIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CogIcon
} from '@heroicons/react/24/outline';

const navItems = [
  { id: 'dashboard', label: '', icon: HomeIcon },
  { id: 'standings', label: 'Standings', icon: TrophyIcon },
  { id: 'teams', label: 'Teams', icon: UsersIcon },
  { id: 'scoring', label: 'Scoring', icon: DocumentTextIcon },
  { id: 'players', label: 'Players', icon: UserGroupIcon },
  { id: 'stats', label: 'Stats', icon: ChartBarIcon },
  { id: 'matches', label: 'Matches', icon: CalendarIcon },
  { id: 'about', label: 'About Us', icon: InformationCircleIcon },
  { id: 'settings', label: '', icon: CogIcon },
];

function Navbar({ activeTab, setActiveTab }) {
  const [imageError, setImageError] = React.useState(false);

  return (
    <nav style={{
      background: 'rgba(0, 0, 0, 0.9)',
      backdropFilter: 'blur(10px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '1rem 2rem',
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Clickable Logo */}
        <div 
          onClick={() => setActiveTab('dashboard')} 
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          {!imageError ? (
            <img 
              src="/delulu-womens-league.jpeg" 
              alt="DWL Logo"
              style={{ 
                height: '50px',
                width: 'auto',
                objectFit: 'contain'
              }}
              onError={() => setImageError(true)}
            />
          ) : (
            <span style={{ 
              fontSize: '1.8rem', 
              background: 'linear-gradient(135deg, #667eea, #764ba2)', 
              WebkitBackgroundClip: 'text', 
              backgroundClip: 'text', 
              color: 'transparent' 
            }}>🏏 DWL</span>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.2rem',
                  background: isActive ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '25px',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  fontSize: '1rem',
                }}
              >
                <Icon style={{ width: '20px', height: '20px' }} />
                {item.label && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;