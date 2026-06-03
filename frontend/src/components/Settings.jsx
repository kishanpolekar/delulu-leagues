import React from 'react';
import { motion } from 'framer-motion';
import ChangePassword from './ChangePassword';

function Settings() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="card">
        <h2 className="card-title">⚙️ SETTINGS</h2>
        <p style={{ color: '#aaa', marginBottom: '1.5rem' }}>
          Manage DWL fantasy league settings
        </p>
        
        {/* Password Change Section */}
        <ChangePassword />
        
        {/* Add more settings here in the future */}
      </div>
    </motion.div>
  );
}

export default Settings;