// src/components/ChangePassword.jsx
import React, { useState } from 'react';
import { KeyIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { changeAdminPassword } from '../services/api';

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    setMessage(null);
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }
    
    if (currentPassword === newPassword) {
      setMessage({ type: 'error', text: 'New password must be different from current password' });
      return;
    }
    
    setLoading(true);
    try {
      const result = await changeAdminPassword(currentPassword, newPassword);
      setMessage({ type: 'success', text: result.message || 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Failed to change password' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h3 className="card-title">
        <KeyIcon style={{ width: 20, height: 20, marginRight: '0.5rem', display: 'inline' }} />
        Change Admin Password
      </h3>
      
      {message && (
        <div style={{
          padding: '0.75rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          background: message.type === 'success' ? '#28a74520' : '#dc354520',
          border: `1px solid ${message.type === 'success' ? '#28a745' : '#dc3545'}`,
          color: message.type === 'success' ? '#28a745' : '#dc3545'
        }}>
          {message.text}
        </div>
      )}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Current Password */}
        <div>
          <label style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.25rem', display: 'block' }}>
            Current Password
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type={showCurrent ? 'text' : 'password'}
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#1a1a2e',
                border: '1px solid #2a2a3e',
                borderRadius: '8px',
                color: 'white'
              }}
            />
            <button
              onClick={() => setShowCurrent(!showCurrent)}
              style={{
                padding: '0.75rem',
                background: '#2a2a3e',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              {showCurrent ? <EyeSlashIcon style={{ width: 20, color: '#888' }} /> : <EyeIcon style={{ width: 20, color: '#888' }} />}
            </button>
          </div>
        </div>
        
        {/* New Password */}
        <div>
          <label style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.25rem', display: 'block' }}>
            New Password (min 6 characters)
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type={showNew ? 'text' : 'password'}
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#1a1a2e',
                border: '1px solid #2a2a3e',
                borderRadius: '8px',
                color: 'white'
              }}
            />
            <button
              onClick={() => setShowNew(!showNew)}
              style={{
                padding: '0.75rem',
                background: '#2a2a3e',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              {showNew ? <EyeSlashIcon style={{ width: 20, color: '#888' }} /> : <EyeIcon style={{ width: 20, color: '#888' }} />}
            </button>
          </div>
        </div>
        
        {/* Confirm Password */}
        <div>
          <label style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.25rem', display: 'block' }}>
            Confirm New Password
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#1a1a2e',
                border: '1px solid #2a2a3e',
                borderRadius: '8px',
                color: 'white'
              }}
            />
            <button
              onClick={() => setShowConfirm(!showConfirm)}
              style={{
                padding: '0.75rem',
                background: '#2a2a3e',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              {showConfirm ? <EyeSlashIcon style={{ width: 20, color: '#888' }} /> : <EyeIcon style={{ width: 20, color: '#888' }} />}
            </button>
          </div>
        </div>
        
        <button
          onClick={handleChangePassword}
          disabled={loading}
          style={{
            padding: '0.75rem',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 'bold',
            opacity: loading ? 0.6 : 1,
            marginTop: '0.5rem'
          }}
        >
          {loading ? 'Changing...' : 'Change Password'}
        </button>
        
        <p style={{ color: '#666', fontSize: '0.7rem', textAlign: 'center', marginTop: '0.5rem' }}>
          After changing password, the backend will automatically update the .env file.
        </p>
      </div>
    </div>
  );
}

export default ChangePassword;