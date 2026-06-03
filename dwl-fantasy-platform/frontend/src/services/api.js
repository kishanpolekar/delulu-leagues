import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function fetchTeams() {
  const response = await api.get('/teams');
  return response.data;
}

export async function fetchPlayers() {
  const response = await api.get('/players');
  return response.data;
}

export async function fetchMatches() {
  const response = await api.get('/matches');
  return response.data;
}

export async function fetchMatchDetails(matchNum) {
  const response = await api.get(`/match-details/${matchNum}`);
  return response.data;
}

export async function fetchAllMatchesDetails(matches) {
  if (!matches || matches.length === 0) return [];
  
  const matchDetailsPromises = matches.map(match => 
    fetchMatchDetails(match.matchNum).catch(err => {
      console.error(`Failed to fetch match ${match.matchNum}:`, err);
      return null;
    })
  );
  
  const results = await Promise.all(matchDetailsPromises);
  return results.filter(detail => detail !== null);
}

export async function fetchStandings() {
  const response = await api.get('/standings');
  return response.data;
}

export async function fetchMatchFromESPN(matchId, matchNum) {
  try {
    const response = await api.post('/fetch-match', {
      match_id: matchId,
      match_num: matchNum
    });
    return response.data;
  } catch (error) {
    // Handle 204 No Content - Match not started
    if (error.response?.status === 204) {
      throw new Error(error.response?.data?.detail || 'Match has not started yet. Please check back later.');
    }
    // Handle 503 - Config not loaded
    if (error.response?.status === 503) {
      throw new Error(error.response?.data?.detail || 'Configuration not loaded. Please upload config file.');
    }
    // Handle other errors
    throw new Error(error.response?.data?.detail || 'Failed to fetch match data');
  }
}

export async function downloadExcel() {
  try {
    const response = await api.get('/download-excel', {
      responseType: 'blob' // Important: This tells axios to treat the response as a blob
    });
    
    // Create a blob URL and trigger download
    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'DWL_Scores.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading Excel file:', error);
    throw new Error(error.response?.data?.detail || 'Failed to download Excel file');
  }
}

export async function getAdminConfig() {
  const response = await api.get('/admin-config');
  return response.data;
}

export async function verifyAdminPassword(password) {
  const response = await api.post('/verify-password', { password });
  return response.data;
}

export async function changeAdminPassword(currentPassword, newPassword) {
  const response = await api.post('/change-password', {
    current_password: currentPassword,
    new_password: newPassword
  });
  return response.data;
}

export async function getPasswordStatus() {
  const response = await api.get('/password-status');
  return response.data;
}

export async function healthCheck() {
  const response = await api.get('/health');
  return response.data;
}