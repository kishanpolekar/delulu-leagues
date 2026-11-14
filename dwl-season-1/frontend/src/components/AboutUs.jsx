import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { EnvelopeIcon } from '@heroicons/react/24/outline';

function AboutUs() {
  const [centralLogoError, setCentralLogoError] = useState(false);
  const [imageErrors, setImageErrors] = useState({});

  const handleImageError = (index) => {
    setImageErrors(prev => ({ ...prev, [index]: true }));
  };

  // Dynamic team owner pic function
  const getOwnerPic = (name) => {
    const filename = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')   // Remove non-alphabetic characters (keeps spaces)
    .replace(/\s+/g, '')       // Replace spaces
    const imagePath = `/owners/${filename}.jpeg`;
    return { imagePath, altText: name };
  };

  // About the 7 league owners
  const rows = [
    {
      title: "A.G.",
      description: "Introducing the owner of Singara Singapengal — Asrayram. \
      \n\n \
      Tamil Nadu thala energy, bold cricket pride, and full owner swagger. Singara Singapengal \
      enter DWL Season One with confidence, culture, and the attitude of a team that knows its worth. \
      \n\n \
      Thalai nambi, thaanai nadathu.\n \
      Singara Singapengal are ready to roar.",
      image: getOwnerPic("ag").imagePath,
      alt: "A.G."
    },
    {
      title: "B.V.",
      description: "Introducing the owner of Gully Divas — Barghavi. \
      \n\n \
      Bangalore energy, gully confidence, and founder mindset all in one. \
      Gully Divas are coming into DWL Season One with style, fire, and full control. \
      \n\n \
      BENGALURINA HUDUGI. GULLYGALU RANI.\n \
      The Divas are here. The game better be ready.",
      image: getOwnerPic("bv").imagePath,
      alt: "B.V."
    },
    {
      title: "K.P.",
      description: "Introducing the owner of Sarafa Strikers — Kishan. \
      \n\n \
      Straight from the heart of Indore, Sarafa Strikers bring streetlight energy, \
      fearless cricket, and full auction-table aggression. This team is built to strike first and strike hard. \
      \n\n \
      Runs, wickets, points — everything is on the menu.\nSarafa Strikers are ready.",
      image: getOwnerPic("kp").imagePath,
      alt: "K.P."
    },
    {
      title: "K.U.",
      description: "Introducing the owner of Janaki Royals — Kridish. \
      \n\n \
      Royal mindset. Calm confidence. Big auction energy. Janaki Royals enter \
      DWL Season One with legacy, pride, and a squad-building vision made for the crown. \
      \n\n \
      The Royals don’t just play the game.\nThey rule it.",
      image: getOwnerPic("ku").imagePath,
      alt: "K.U."
    },
    {
      title: "N.S.",
      description: "Introducing the owner of Vanitha Warriors — Nikhil. \
      \n\n \
      Kerala pride, warrior spirit, and calm leadership. Vanitha Warriors step into DWL Season One \
      with strength, discipline, and a squad ready to fight for every run, wicket, and point. \
      \n\n \
      Strength. Grace. Victory.\nThe Warriors are ready for battle.",
      image: getOwnerPic("ns").imagePath,
      alt: "N.S."
    },
    {
      title: "N.B.",
      description: "Introducing the owner of Rajputana Ranis — Nimesh. \
      \n\n \
      Royal style, sharp strategy, and palace-level confidence. Rajputana Ranis enter DWL Season One \
      with grace, power, and a mission to make every match feel like a statement.  \
      \n\n \
      Play with pride. Rule with grace.\nThe Ranis are here.",
      image: getOwnerPic("nb").imagePath,
      alt: "N.B."
    },
    {
      title: "S.D.",
      description: "Introducing the owner of Konkan Queens — Sam. \
      \n\n \
      Coastal pride, calm strategy, and a champion’s mindset. Konkan Queens are stepping into DWL Season One \
      with purpose, power, and that unmistakable Konkan energy. \
      \n\n \
      Rooted in pride. Built for the crown.\n \
      AMCHO KONKAN. AMCHYO RANIYO.",
      image: getOwnerPic("sjd").imagePath,
      alt: "S.J.D."
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
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
                <h1 style={{ fontSize: '2rem', margin: 0, color: 'white' }}>About the Owners of Delulu Women's League</h1>
                <p style={{ margin: '0.25rem 0 0', color: '#aaa' }}>Season 1 • 2026</p>
              </div>
            </div>
            <p style={{ color: '#ccc', maxWidth: '750px', margin: 0 }}>
              Presenting the dashing owners of the 7 DWL teams, who are as passionate about fantasy cricket
              as they are about supporting women's cricket and fostering a vibrant community of fans. These fans come from 
              diverse backgrounds, united by their love for the game. Each owner brings their unique style and strategy
              to the league, making it a thrilling competition for all fantasy cricket enthusiasts.
            </p>
              <br />
            <h6 style={{ fontSize: '1rem', margin: 0, color: 'lightgrey' }}>
              <EnvelopeIcon style={{ 
                width: '20px', 
                height: '20px', 
                display: 'inline-block',
                marginRight: '0.5rem',
                verticalAlign: 'middle'
              }} />
              Contact us at: <a style={{ 
                color: 'rgba(0, 0, 0, 0.9)', 
                textDecoration: 'none'
              }} href="mailto:delululeagues@gmail.com">delululeagues@gmail.com</a>
            </h6>
          </div>
        </div>
      </div>

      {/* Alternating Rows */}
      {rows.map((row, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            flexDirection: index % 2 === 0 ? 'row' : 'row-reverse',
            alignItems: 'center',
            gap: '3rem',
            marginBottom: index === rows.length - 1 ? 0 : '3rem',
            padding: '2rem',
            background: index % 2 === 0 
              ? 'rgba(17, 17, 34, 0.6)' 
              : 'rgba(102, 126, 234, 0.08)',
            borderRadius: '24px',
            flexWrap: 'wrap'
          }}
        >
          {/* Image Section */}
          <div style={{ flex: 1, minWidth: '250px' }}>
            {!imageErrors[index] ? (
              <img
                src={row.image}
                alt={row.alt}
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  height: 'auto',
                  borderRadius: '16px',
                  objectFit: 'cover',
                  display: 'block',
                  margin: '0 auto',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                }}
                onError={() => handleImageError(index)}
              />
            ) : (
              <div style={{
                width: '100%',
                maxWidth: '400px',
                height: '250px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '4rem',
                margin: '0 auto',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
              }}>
                🏏
              </div>
            )}
          </div>

          {/* Text Section */}
          <div style={{ flex: 1, minWidth: '250px' }}>
            <h2 style={{
              fontSize: '3rem',
              color: 'rgba(0, 0, 0, 0.9)',
              marginBottom: '1rem',
              fontWeight: 'bold'
            }}>
              {row.title.toUpperCase()}
            </h2>
            <br />
            <p style={{
              fontSize: '1.5rem',
              lineHeight: '1.6',
              color: '#ccc'
            }}>
              {row.description}
            </p>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

export default AboutUs;