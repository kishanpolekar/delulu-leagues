import React, { useState } from 'react';
import { motion } from 'framer-motion';

// Scoring rules data
const SCORING_RULES = [
  {
    category: "Batting",
    rules: [
      { action: "Run scored", pts: "+1" },
      { action: "Four", pts: "+1 (bonus)" },
      { action: "Six", pts: "+2 (bonus)" },
      { action: "50+ runs (50-99)", pts: "+25" },
      { action: "100+ runs (100-149)", pts: "+50" },
      { action: "150+ runs", pts: "+75" },
      { action: "Duck (0 runs, out)", pts: "−15" },
      { action: "Golden duck (0 runs, 1 ball)", pts: "−25" },
      { action: "Diamond duck (0 runs, 0 balls)", pts: "−35" },
      { action: "Strike rate 150-174", pts: "+5" },
      { action: "Strike rate 175-199", pts: "+10" },
      { action: "Strike rate 200-224", pts: "+15" },
      { action: "Strike rate 225-249", pts: "+20" },
      { action: "Strike rate 250-274", pts: "+25" },
      { action: "Strike rate 275-299", pts: "+30" },
      { action: "Strike rate 300-324", pts: "+35" },
      { action: "Strike rate 325-349", pts: "+40" },
      { action: "Strike rate 350-599", pts: "+45" },
      { action: "Strike rate 600+", pts: "+50" },
      { action: "Strike rate below 100 (min 3 balls)", pts: "−15" },
    ]
  },
  {
    category: "Bowling",
    rules: [
      { action: "Wicket", pts: "+30" },
      { action: "3-wicket haul", pts: "+25" },
      { action: "5-wicket haul", pts: "+50" },
      { action: "Hat-trick", pts: "+45" },
      { action: "Maiden over", pts: "+10" },
      { action: "Economy rate 0-5.99", pts: "+25" },
      { action: "Economy rate 6-6.99", pts: "+15" },
      { action: "Economy rate 7-7.99", pts: "+10" },
      { action: "Economy rate 12+", pts: "−10" },
    ]
  },
  {
    category: "Fielding",
    rules: [
      { action: "Catch", pts: "+20" },
      { action: "Run out", pts: "+20" },
      { action: "Stumping", pts: "+20" },
    ]
  },
  {
    category: "Bonuses",
    rules: [
      { action: "Player of the Match", pts: "+25" },
      { action: "Captain (multiplier)", pts: "×2" },
      { action: "Vice-Captain (multiplier)", pts: "×1.5" },
    ]
  },
  {
    category: "Awards",
    rules: [
      { action: "Most Runs", pts: "+500" },
      { action: "Most Wickets", pts: "+500" },
      { action: "Highest Batting Strike Rate (minimum 50 balls in the tournament)", pts: "+250" },
      { action: "Best Bowling Economy (minimum 10 overs in the tournament)", pts: "+250" },
      { action: "Most DWL Points in a Single Match", pts: "+250" },
    ]
  }
];

function Scoring() {
  const [activeCategory, setActiveCategory] = useState("Batting");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ padding: '2rem 1.5rem', maxWidth: 900, margin: '0 auto' }}
    >
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '2rem', color: 'white', marginBottom: '0.5rem' }}>📜 Scoring Rules</h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>DWL Fantasy Points System • WWC 2026</p>
      </div>

      {/* Category Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {SCORING_RULES.map(section => (
          <button
            key={section.category}
            onClick={() => setActiveCategory(section.category)}
            style={{
              background: activeCategory === section.category ? '#FF6B35' : 'rgba(17, 17, 34, 0.8)',
              border: `1px solid ${activeCategory === section.category ? '#FF6B35' : '#333'}`,
              color: activeCategory === section.category ? '#fff' : '#aaa',
              borderRadius: '25px',
              padding: '0.6rem 1.5rem',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: activeCategory === section.category ? 700 : 400,
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(10px)'
            }}
          >
            {section.category}
          </button>
        ))}
      </div>

      {/* Rules Table */}
      {SCORING_RULES.filter(s => s.category === activeCategory).map(section => (
        <div key={section.category} style={{ marginBottom: '1.5rem' }}>
          <div style={{
            background: 'rgba(13, 13, 26, 0.9)',
            border: '1px solid #1A1A2E',
            borderRadius: '16px',
            overflow: 'hidden',
            backdropFilter: 'blur(10px)'
          }}>
            {/* Header */}
            <div style={{
              padding: '0.75rem 1.5rem',
              borderBottom: '1px solid #1A1A2E',
              display: 'grid',
              gridTemplateColumns: '1fr 80px',
              fontSize: '0.7rem',
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: 600
            }}>
              <span style={{ textAlign: 'right' }}>Points</span>
            </div>

            {/* Rules */}
            {section.rules.map((rule, idx) => {
              const isPositive = rule.pts.startsWith('+') || rule.pts.startsWith('×');
              const isNegative = rule.pts.startsWith('−');
              const ptsColor = isPositive ? '#2DC653' : (isNegative ? '#FF4444' : '#FF6B35');
              
              return (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 80px',
                    padding: '0.9rem 1.5rem',
                    borderBottom: idx < section.rules.length - 1 ? '1px solid rgba(15, 15, 26, 0.8)' : 'none',
                    alignItems: 'center',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ color: '#ddd', fontSize: '0.85rem' }}>{rule.action}</span>
                  <span style={{
                    textAlign: 'right',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: ptsColor,
                    fontFamily: 'monospace'
                  }}>
                    {rule.pts}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {activeCategory !== 'Awards' ? (
        <div>
          {/* Super Over Note - shown when Awards is NOT active */}
          <div style={{
            marginTop: '1.5rem',
            background: 'rgba(17, 17, 34, 0.8)',
            border: '1px solid rgba(255, 107, 53, 0.15)',
            borderRadius: '16px',
            padding: '1.25rem',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ color: '#FF6B35', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>⚡</span> Super Over
            </div>
            <p style={{ color: '#999', fontSize: '0.8rem', margin: 0, lineHeight: 1.6 }}>
              Super Over batting/bowling stats contribute to fantasy points, but milestone bonuses (50/100/150) 
              and haul bonuses (3W/5W) do not apply in Super Over. Economy, strike rate, wickets, and fielding 
              points still count.
            </p>
          </div>
        </div>
      ) : (
        /* Awards Tab Note */
        <div style={{
          marginTop: '1.5rem',
          background: 'rgba(17, 17, 34, 0.8)',
          border: '1px solid rgba(255, 107, 53, 0.15)',
          borderRadius: '16px',
          padding: '1.25rem',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ color: '#FF6B35', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Rules
          </div>
          <ul style={{ color: '#999', fontSize: '0.8rem', margin: 0, paddingLeft: '1.5rem', lineHeight: 1.8 }}>
            <li>All awards are given at the end of the tournament.</li>
            <li>Players receiving these awards will have the respective award points appropriately multiplied using the player multiplier.</li>
            <li>If the "Most DWL Points in a Single Match" award points are tied between two teams, the team with less total players in the highest scoring match is given the award.</li>
          </ul>
        </div>
      )}

      <style>{`
        @media (max-width: 600px) {
          .scoring-container {
            padding: 1rem;
          }
          .scoring-container div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr 60px !important;
          }
        }
      `}</style>
    </motion.div>
  );
}

export default Scoring;