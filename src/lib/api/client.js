// Client API pour communiquer avec le backend Node.js

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.token = null;
    console.log('API Base URL:', this.baseUrl);
  }

  setToken(token) {
    this.token = token;
    if (typeof window !== 'undefined') {
      // Stocker dans localStorage pour le client
      localStorage.setItem('authToken', token);
      // Stocker dans un cookie pour le middleware
      document.cookie = `authToken=${token}; path=/; max-age=86400; samesite=lax`;
    }
  }

  getToken() {
    if (typeof window !== 'undefined') {
      // Essayer de récupérer du cookie d'abord, puis de localStorage
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('authToken='))
        ?.split('=')[1];
      
      return cookieValue || localStorage.getItem('authToken');
    }
    return null;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.token || this.getToken();
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      // Vérifier si nous sommes dans un environnement navigateur
      if (typeof window === 'undefined') {
        throw new Error('API Client ne peut être utilisé que côté client (navigateur)');
      }

      console.log('🔍 API Request URL:', url);
      console.log('🔍 API Request Config:', JSON.stringify(config, null, 2));
      
      // Ajouter un timeout pour éviter les blocages
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondes timeout
      
      console.log('🔍 Starting fetch request...');
      
      // Test avec une requête fetch simple pour isoler le problème
      try {
        // Test de connectivité de base via proxy
        const testResponse = await fetch('/api/health', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        console.log('✅ Health check response:', await testResponse.text());
      } catch (testError) {
        console.error('❌ Health check failed:', testError);
        throw new Error('Impossible de se connecter au serveur backend: ' + testError.message);
      }
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('✅ API Response status:', response.status, response.statusText);
      console.log('✅ API Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (jsonError) {
          console.error('❌ Failed to parse error response:', jsonError);
        }
        const errorMessage = errorData.message || `HTTP error! status: ${response.status}`;
        console.error('❌ API Error:', errorMessage, errorData);
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log('🎉 API Success:', responseData);
      return responseData;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('⏰ API Request timeout:', error);
        throw new Error('La requête a expiré (timeout)');
      }
      console.error('💥 API Request failed:', error);
      console.error('💥 Error details:', error.stack);
      console.error('💥 Error name:', error.name);
      console.error('💥 Error message:', error.message);
      throw error;
    }
  }

  // Authentication
  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async logout() {
    this.clearToken();
    return { success: true, message: 'Déconnexion réussie' };
  }

  // Users
  async getUsers() {
    return this.request('/users');
  }

  // Diligences
  async getDiligences() {
    return this.request('/diligences');
  }

  async getDiligence(id) {
    return this.request(`/diligences/${id}`);
  }

  async createDiligence(diligenceData) {
    return this.request('/diligences', {
      method: 'POST',
      body: JSON.stringify(diligenceData),
    });
  }

  async updateDiligence(id, diligenceData) {
    return this.request(`/diligences/${id}`, {
      method: 'PUT',
      body: JSON.stringify(diligenceData),
    });
  }

  async deleteDiligence(id) {
    return this.request(`/diligences/${id}`, {
      method: 'DELETE',
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }

  // Vérifier si l'utilisateur est connecté
  isAuthenticated() {
    return !!this.getToken();
  }

  // Récupérer les informations de l'utilisateur connecté
  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // Mettre à jour le profil utilisateur
  async updateProfile(profileData) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }
}

// Instance singleton
export const apiClient = new ApiClient();

// Hook pour utiliser le client API (à utiliser dans les composants React)
export const useApi = () => {
  return apiClient;
};

export default apiClient;