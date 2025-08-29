"use client";
import { useState, useEffect } from "react";

export default function SMTPTab() {
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean; message: string} | null>(null);
  const [smtpConfig, setSmtpConfig] = useState<{
    host?: string;
    port?: string;
    secure?: boolean;
    username?: string;
    from_email?: string;
    from_name?: string;
  } | null>(null);

  // Charger la configuration SMTP existante au montage du composant
  useEffect(() => {
    const loadSmtpConfig = async () => {
      try {
        const response = await fetch('http://localhost:3003/api/smtp/config');
        if (response.ok) {
          const config = await response.json();
          setSmtpConfig(config);
          
          // Pré-remplir le formulaire si une configuration existe
          if (config) {
            const form = document.getElementById('smtp-form') as HTMLFormElement;
            if (form) {
              (form.elements.namedItem('host') as HTMLInputElement).value = config.host || '';
              (form.elements.namedItem('port') as HTMLInputElement).value = config.port || '';
              (form.elements.namedItem('username') as HTMLInputElement).value = config.username || '';
              (form.elements.namedItem('from_email') as HTMLInputElement).value = config.from_email || '';
              (form.elements.namedItem('from_name') as HTMLInputElement).value = config.from_name || '';
              
              // Définir la valeur du select secure
              const secureSelect = form.elements.namedItem('secure') as HTMLSelectElement;
              if (secureSelect) {
                secureSelect.value = config.secure ? 'TLS' : 'false';
              }
            }
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la configuration SMTP:', error);
      }
    };

    loadSmtpConfig();
  }, []);

  const handleTestConnection = async () => {
    setLoading(true);
    setTestResult(null);

    // Récupérer les valeurs des champs du formulaire
    const form = document.getElementById('smtp-form') as HTMLFormElement;
    const formData = new FormData(form);
    
    const smtpConfig = {
      host: formData.get('host') as string,
      port: formData.get('port') as string,
      secure: formData.get('secure') as string,
      username: formData.get('username') as string,
      password: formData.get('password') as string
    };

    try {
      const response = await fetch('http://localhost:3003/api/smtp/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(smtpConfig),
      });

      const result = await response.json();
      setTestResult(result);

      if (!response.ok) {
        throw new Error(result.message || 'Erreur de connexion');
      }

    } catch (error: unknown) {
      if (error instanceof Error) {
        setTestResult({
          success: false,
          message: error.message || 'Erreur lors du test de connexion'
        });
      } else {
        setTestResult({
          success: false,
          message: 'Erreur lors du test de connexion'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfiguration = async () => {
    setLoading(true);
    setTestResult(null);

    // Récupérer les valeurs des champs du formulaire
    const form = document.getElementById('smtp-form') as HTMLFormElement;
    const formData = new FormData(form);
    
    const smtpConfig = {
      host: formData.get('host') as string,
      port: formData.get('port') as string,
      secure: formData.get('secure') as string,
      username: formData.get('username') as string,
      password: formData.get('password') as string,
      from_email: formData.get('from_email') as string,
      from_name: formData.get('from_name') as string
    };

    try {
      const response = await fetch('http://localhost:3003/api/smtp/save-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(smtpConfig),
      });

      const result = await response.json();
      setTestResult(result);

      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de la sauvegarde');
      }

    } catch (error: unknown) {
      if (error instanceof Error) {
        setTestResult({
          success: false,
          message: error.message || 'Erreur lors de la sauvegarde'
        });
      } else {
        setTestResult({
          success: false,
          message: 'Erreur lors de la sauvegarde'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <h2 className="text-xl font-semibold mb-6 text-gray-800">📧 Configuration SMTP</h2>
      
      {/* Résultat du test */}
      {testResult && (
        <div className={`mb-6 p-4 rounded-lg ${
          testResult.success
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <div className="flex items-center">
            <span className="text-lg mr-2">{testResult.success ? '✅' : '❌'}</span>
            <span className="font-medium">{testResult.message}</span>
          </div>
        </div>
      )}

      <form id="smtp-form" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Serveur SMTP</label>
            <input
              name="host"
              type="text"
              placeholder="smtp.gmail.com"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
            <input
              name="port"
              type="number"
              placeholder="587"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nom d&apos;utilisateur</label>
            <input
              name="username"
              type="email"
              placeholder="noreply@gouv.ci"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
            <input
              name="password"
              type="password"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-colors"
            />
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chiffrement</label>
            <select
              name="secure"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-colors"
            >
              <option value="TLS">TLS</option>
              <option value="SSL">SSL</option>
              <option value="false">Aucun</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email expéditeur</label>
            <input
              name="from_email"
              type="email"
              placeholder="system@gouv.ci"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nom expéditeur</label>
            <input
              name="from_name"
              type="text"
              placeholder="Système Gouvernemental"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-colors"
            />
          </div>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={loading}
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white px-4 py-3 rounded-lg font-medium transition-colors duration-200"
            >
              {loading ? 'Test en cours...' : 'Tester la connexion'}
            </button>
            <button
              type="button"
              onClick={handleSaveConfiguration}
              disabled={loading}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white px-4 py-3 rounded-lg font-medium transition-colors duration-200"
            >
              {loading ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}