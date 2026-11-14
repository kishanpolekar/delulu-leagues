import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('Response Error:', error.response?.status, error.response?.config?.url);
    return Promise.reject(error);
  }
);


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

// ============ AWARD ENDPOINTS ============

/**
 * Apply award bonuses to players and update Excel with award indicators.
 * @param {Array} awardWinners - List of award winner objects
 * @param {Object} teamAwards - Object mapping team names to award icon arrays
 * @returns {Promise} Response with success status and award data
 */
export async function applyAwards(awardWinners, teamAwards) {
  try {
    const response = await api.post('/apply-awards', {
      award_winners: awardWinners,
      team_awards: teamAwards
    });
    return response.data;
  } catch (error) {
    console.error('Error applying awards:', error);
    throw new Error(error.response?.data?.detail || 'Failed to apply awards');
  }
}

/**
 * Get all award data for display.
 * @returns {Promise} Object containing award_winners and team_awards
 */
export async function fetchAwards() {
  try {
    const response = await api.get('/awards');
    return response.data;
  } catch (error) {
    console.error('Error fetching awards:', error);
    return { award_winners: [], team_awards: {} };
  }
}

/**
 * Get team awards for display in standings.
 * @returns {Promise} Object mapping team names to award icon arrays
 */
export async function fetchTeamAwards() {
  try {
    const response = await api.get('/team-awards');
    return response.data;
  } catch (error) {
    console.error('Error fetching team awards:', error);
    return {};
  }
}

export default api;

export async function downloadExcel() {
  try {
    const response = await api.get('/download-excel', {
      responseType: 'blob',
      // Add this to ensure the request is properly formatted
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    });
    
    // Check if the response is actually a blob
    if (!response.data || response.data.size === 0) {
      throw new Error('Received empty file');
    }
    
    // Create a blob URL and trigger download
    const blob = new Blob([response.data], { 
      type: response.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'DWL_Scores.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL after a short delay
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 100);
    
    return true;
  } catch (error) {
    console.error('Error downloading Excel file:', error);
    // Check if the error response has a JSON body (error message from server)
    if (error.response && error.response.data) {
      // Try to read the error message from the blob response
      try {
        const text = await new Response(error.response.data).text();
        const json = JSON.parse(text);
        throw new Error(json.detail || 'Failed to download Excel file');
      } catch {
        throw new Error('Failed to download Excel file. Please try again.');
      }
    }
    throw new Error(error.message || 'Failed to download Excel file');
  }
}

export const getStorageMode = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/storage-mode`);
    if (!response.ok) throw new Error('Failed to fetch storage mode');
    return await response.json();
  } catch (error) {
    console.error('Error fetching storage mode:', error);
    return { mode: 'unknown', is_local: false, is_production: false };
  }
};

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