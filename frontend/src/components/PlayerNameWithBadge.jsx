import React from 'react';
import { getPlayerLeaderIcons } from '../services/statsService';

function PlayerNameWithBadge({ name, captainVC, showBadge = true, leaderMap }) {
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

  if (!showBadge && leaderIcons.length === 0) {
    return <span>{name}</span>;
  }

  return (
    <span>
      {name}
      {captainVC && (
        <span style={getBadgeStyle(captainVC)}>{captainVC}</span>
      )}
      {leaderIcons.map((leader, idx) => (
        <span
          key={idx}
          title={leader.tooltip}
          style={{
            marginLeft: '0.3rem',
            fontSize: '1.rem',
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