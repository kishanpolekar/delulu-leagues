import React from 'react';
import { getPlayerLeaderIcons } from '../services/statsService';

function PlayerNameWithBadge({ name, captainVC, showBadge = true, leaderMap, status = '' }) {
  const getBadgeStyle = (type) => {
    if (type === 'C') {
      return {
        background: '#FFD700',
        color: '#333',
        padding: '0.15rem 0.4rem',
        borderRadius: '12px',
        fontSize: '0.65rem',
        fontWeight: 'bold',
        marginLeft: '0.5rem',
        display: 'inline-block'
      };
    } else if (type === 'VC') {
      return {
        background: '#C0C0C0',
        color: '#333',
        padding: '0.15rem 0.4rem',
        borderRadius: '12px',
        fontSize: '0.65rem',
        fontWeight: 'bold',
        marginLeft: '0.5rem',
        display: 'inline-block'
      };
    }
    return {};
  };

  // Get leader icons for this player
  const leaderIcons = getPlayerLeaderIcons(name, leaderMap);

  // Get player name styles based on status
  const getPlayerNameStyle = () => {
    if (status === 'Injured') {
      return {
        textDecoration: 'line-through',
        textDecorationColor: '#ff4444',
        textDecorationThickness: '2px',
        filter: 'drop-shadow(0 0 4px rgba(128, 128, 128, 0.6))',
        opacity: 0.85
      };
    } else if (status === 'Replacement') {
      return {
        textDecoration: 'underline',
        fontStyle: 'italic',
        filter: 'drop-shadow(0 0 4px rgba(66, 133, 244, 0.6))'
      };
    }
    return {};
  };

  // Get status icon
  const getStatusIcon = () => {
    if (status === 'Injured') {
      return {
        icon: '🏥',
        tooltip: 'Injured Player',
        style: {
          marginLeft: '0.3rem',
          fontSize: '0.9rem',
          cursor: 'help',
          display: 'inline-block',
          filter: 'drop-shadow(0 0 8px rgba(128, 128, 128, 0.8)) drop-shadow(0 0 4px rgba(128, 128, 128, 0.6))',
        }
      };
    } else if (status === 'Replacement') {
      return {
        icon: '🔄',
        tooltip: 'Replacement Player',
        style: {
          marginLeft: '0.3rem',
          fontSize: '0.9rem',
          cursor: 'help',
          display: 'inline-block',
          filter: 'drop-shadow(0 0 8px rgba(66, 133, 244, 0.8)) drop-shadow(0 0 4px rgba(66, 133, 244, 0.6))'
        }
      };
    }
    return null;
  };

  const statusIcon = getStatusIcon();

  if (!showBadge && leaderIcons.length === 0 && !statusIcon) {
    return <span style={getPlayerNameStyle()}>{name}</span>;
  }

  return (
    <span>
      <span style={getPlayerNameStyle()}>{name}</span>
      {captainVC && (
        <span style={getBadgeStyle(captainVC)}>{captainVC}</span>
      )}
      {statusIcon && (
        <span
          title={statusIcon.tooltip}
          style={statusIcon.style}
        >
          {statusIcon.icon}
        </span>
      )}
      {leaderIcons.map((leader, idx) => (
        <span
          key={idx}
          title={leader.tooltip}
          style={{
            marginLeft: '0.3rem',
            fontSize: '0.9rem',
            cursor: 'help',
            display: 'inline-block'
          }}
        >
          <span style={{ color: leader.color }}>{leader.icon}</span>
        </span>
      ))}
    </span>
  );
}

export default PlayerNameWithBadge;