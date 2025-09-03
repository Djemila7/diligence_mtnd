// Client API pour communiquer avec le backend Node.js

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3003';

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
    let url = `${this.baseUrl}${endpoint}`;
    const token = this.token || this.getToken();
    
    // Ajouter un timestamp pour éviter le cache uniquement pour les requêtes GET
    if (options.method === undefined || options.method === 'GET') {
      const separator = endpoint.includes('?') ? '&' : '?';
      url += `${separator}_t=${Date.now()}`;
    }
    
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
      console.log('🔍 Token présent:', !!token);
      console.log('🔍 Token value:', token ? token.substring(0, 20) + '...' : 'null');
      
      console.log('🔍 Starting fetch request...');
      
      // Configuration simplifiée sans timeout pour éviter les AbortError
      const response = await fetch(url, config);
      
      console.log('✅ API Response status:', response.status, response.statusText);
      console.log('✅ API Response headers:', Object.fromEntries(response.headers.entries()));
      console.log('✅ API Response URL:', response.url); // Ajouter l'URL finale après redirections
      
      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (jsonError) {
          console.error('❌ Failed to parse error response:', jsonError);
        }
        
        // Log détaillé pour comprendre la structure de l'erreur
        console.log('🔍 Error response status:', response.status);
        console.log('🔍 Error response headers:', Object.fromEntries(response.headers.entries()));
        console.log('🔍 Error data structure:', errorData);
        console.log('🔍 Error data type:', typeof errorData);
        
        const errorMessage = errorData.message || errorData.error || `HTTP error! status: ${response.status}`;
        console.error('❌ API Error:', errorMessage, errorData);
        throw new Error(errorMessage);
      }

      const responseText = await response.text();
      console.log('📄 API Response text:', responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('🎉 API Success:', responseData);
      } catch (parseError) {
        console.error('❌ Erreur de parsing JSON:', parseError);
        console.error('❌ Contenu qui a échoué:', responseText);
        throw new Error('Réponse JSON invalide du serveur');
      }
      
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
    const response = await this.request('/api/auth/login', {
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
    return this.request('/api/users');
  }

  // Diligences
  async getDiligences() {
    return this.request('/api/diligences');
  }

  async getDiligence(id) {
    return this.request(`/api/diligences/${id}`);
  }

  async createDiligence(diligenceData) {
    return this.request('/api/diligences', {
      method: 'POST',
      body: JSON.stringify(diligenceData),
    });
  }

  async updateDiligence(id, diligenceData) {
    return this.request(`/api/diligences/${id}`, {
      method: 'PUT',
      body: JSON.stringify(diligenceData),
    });
  }

  async deleteDiligence(id) {
    return this.request(`/api/diligences/${id}`, {
      method: 'DELETE',
    });
  }

  async markDiligenceAsViewed(diligenceId, userId) {
    return this.request(`/api/diligences/${diligenceId}/mark-viewed`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/api/health');
  }

  // Vérifier si l'utilisateur est connecté
  isAuthenticated() {
    return !!this.getToken();
  }

  // Récupérer les informations de l'utilisateur connecté
  async getCurrentUser() {
    return this.request('/api/auth/me');
  }

  // Mettre à jour le profil utilisateur
  async updateProfile(profileData) {
    return this.request('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // Traiter une diligence avec upload de fichiers
  async traiterDiligence(diligenceId, formData) {
    const url = `${this.baseUrl}/api/diligences/${diligenceId}/traitement`;
    const token = this.token || this.getToken();
    
    const config = {
      method: 'POST',
      headers: {},
      body: formData,
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      console.log('🔍 Traitement diligence URL:', url);
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (jsonError) {
          console.error('❌ Failed to parse error response:', jsonError);
        }
        const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
        console.error('❌ Traitement diligence error:', errorMessage, errorData);
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log('🎉 Traitement diligence success:', responseData);
      return responseData;
    } catch (error) {
      console.error('💥 Traitement diligence failed:', error);
      throw error;
    }
  }

  // Valider ou rejeter une diligence
  async validateDiligence(diligenceId, validationStatus, comment = '') {
    return this.request(`/api/diligences/${diligenceId}/validate`, {
      method: 'POST',
      body: JSON.stringify({ validation_status: validationStatus, comment }),
    });
  }

  // Récupérer les données de traitement d'une diligence
  async getDiligenceTraitements(diligenceId) {
    return this.request(`/api/diligences/${diligenceId}/traitements`);
  }

  // Récupérer les diligences archivées via l'API route Next.js
  async getArchivedDiligences() {
    console.log('🔍 Appel de getArchivedDiligences() via API route Next.js');
    try {
      const token = this.token || this.getToken();
      const headers = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Utiliser fetch directement pour appeler l'API route Next.js (même domaine)
      const response = await fetch('/api/diligences/archives', {
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur API route:', response.status, errorText);
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Réponse de getArchivedDiligences:', result);
      return result;
    } catch (error) {
      console.error('❌ Erreur dans getArchivedDiligences:', error);
      console.error('❌ Stack:', error.stack);
      throw error;
    }
  }

  // Archiver manuellement une diligence via l'API route Next.js
  async archiveDiligence(diligenceId) {
    console.log('🔍 Appel de archiveDiligence() via API route Next.js');
    try {
      const token = this.token || this.getToken();
      const headers = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Utiliser fetch directement pour appeler l'API route Next.js (même domaine)
      const response = await fetch(`/api/diligences/${diligenceId}/archive`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (jsonError) {
          console.error('❌ Failed to parse error response:', jsonError);
          const errorText = await response.text();
          throw new Error(`Erreur ${response.status}: ${errorText}`);
        }
        
        console.error('❌ Erreur API route d\'archivage:', response.status, errorData);
        
        // Extraire le message d'erreur de la réponse JSON
        const errorMessage = errorData.error || errorData.message || `Erreur ${response.status}`;
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Réponse de archiveDiligence:', result);
      return result;
    } catch (error) {
      console.error('❌ Erreur dans archiveDiligence:', error);
      console.error('❌ Stack:', error.stack);
      throw error;
    }
  }

  // Récupérer tous les fichiers d'une diligence (pièces jointes + fichiers des traitements)
  async getDiligenceFiles(diligenceId) {
    return this.request(`/api/diligences/${diligenceId}/files`);
  }
}

// Instance singleton
export const apiClient = new ApiClient();

// Hook pour utiliser le client API (à utiliser dans les composants React)
export const useApi = () => {
  return apiClient;
};

export default apiClient;