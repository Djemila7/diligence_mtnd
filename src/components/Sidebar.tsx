"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { useDiligenceNotifications } from "@/hooks/useDiligenceNotifications";
import { DiligenceNotificationsModal } from "./DiligenceNotificationsModal";

type User = {
  id: number;
  email: string;
  name: string;
  role: string;
};

// Icônes SVG custom
const HomeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const ClipboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const NotificationIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 5a2 2 0 114 0c0 7.5 8 4.5 8 11H2c0-6.5 8-3.5 8-11z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const { notificationCount, resetNotificationCount } = useDiligenceNotifications();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Récupérer les informations de l'utilisateur connecté depuis l'API
        const response = await apiClient.getCurrentUser();
        if (response) {
          setUser(response);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des informations utilisateur:', error);
        // En cas d'erreur, on peut rediriger vers la page de login
        window.location.href = '/login';
      }
    };

    fetchUser();
  }, []);

  const isActive = (path: string) => pathname === path;

  // Vérifier si l'utilisateur est un administrateur
  const isAdmin = () => {
    const userRole = user?.role || '';
    const normalizedRole = userRole.toString().trim().toLowerCase();
    return normalizedRole.includes('admin') || normalizedRole.includes('administrateur');
  };

  return (
    <div className="fixed left-0 top-0 w-56 h-screen bg-white flex flex-col shadow-lg border-r border-gray-200 z-40">
      {/* Header avec profil utilisateur amélioré */}
      <div className="p-4 border-b border-gray-200 bg-orange-50 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-orange-100 border-2 border-orange-200 rounded-full flex items-center justify-center">
            <UserIcon />
          </div>
          <div className="flex-1 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">
                {user?.name || user?.email || 'Utilisateur'}
              </h3>
              <p className="text-xs text-orange-600 font-medium">
                ({user?.role || (user ? (user.email?.includes('admin') ? 'Administrateur' : 'Connecté') : 'Invité')})
              </p>
            </div>
            <button
              className="relative p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-white/50 transition-all duration-200 group"
              onClick={() => {
                setShowNotificationsModal(true);
                resetNotificationCount();
              }}
            >
              <NotificationIcon />
              {/* Badge de notification */}
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{notificationCount}</span>
                </span>
              )}
              {/* Tooltip */}
              <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                <div className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap">
                  {notificationCount > 0 ?
                    `${notificationCount} nouvelle${notificationCount > 1 ? 's' : ''} diligence${notificationCount > 1 ? 's' : ''}` :
                    'Aucune nouvelle diligence'}
                  <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-800"></div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation principale */}
      <div className="flex-1 px-3 py-4 overflow-y-auto">
        <nav className="space-y-1">
          <Link
            href="/"
            className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
              isActive('/')
                ? 'bg-orange-100 text-orange-700 border-l-4 border-orange-500'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            <div>
              <HomeIcon />
            </div>
            <span className="font-medium text-sm">
              Tableau de bord
            </span>
          </Link>

          {!isAdmin() && (
            <Link
              href="/diligence"
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive('/diligence')
                  ? 'bg-orange-100 text-orange-700 border-l-4 border-orange-500'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
              }`}
            >
              <div>
                <ClipboardIcon />
              </div>
              <span className="font-medium text-sm">
                Diligence
              </span>
            </Link>
          )}
        </nav>
      </div>

      {/* Bouton de déconnexion */}
      <div className="px-3 py-2 flex-shrink-0">
        <button
          onClick={async () => {
            await apiClient.logout();
            window.location.href = '/login';
          }}
          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-all duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="font-medium text-sm">Déconnexion</span>
        </button>
      </div>

      {/* Trait de séparation subtil */}
      <div className="px-4 mb-3 flex-shrink-0">
        <div className="h-px bg-gray-200"></div>
      </div>

      {/* Section paramètres */}
      <div className="p-3 flex-shrink-0">
        <Link
          href="/parametres"
          className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
            isActive('/parametres')
              ? 'bg-orange-100 text-orange-700 border-l-4 border-orange-500'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
          }`}
        >
          <div>
            <SettingsIcon />
          </div>
          <span className="font-medium text-sm">
            Paramètres
          </span>
        </Link>
      </div>

      {/* Modal des notifications de diligences */}
      <DiligenceNotificationsModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        onDiligenceClick={(diligenceId) => {
          setShowNotificationsModal(false);
          router.push(`/diligence/${diligenceId}`);
        }}
      />
    </div>
  );
}