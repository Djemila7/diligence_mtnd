"use client";

import { useState, useEffect, useRef } from "react";
import { apiClient } from "@/lib/api/client";

interface DiligenceData {
  statut: string;
  created_at?: string;
  updated_at?: string;
}

interface StatsEvolution {
  diligencesEnCours: number;
  diligencesTerminees: number;
  evolutionEnCours: number;
  evolutionTerminees: number;
}

export function useStatsEvolution() {
  const [stats, setStats] = useState<StatsEvolution>({
    diligencesEnCours: 0,
    diligencesTerminees: 0,
    evolutionEnCours: 0,
    evolutionTerminees: 0
  });
  
  const [previousStats, setPreviousStats] = useState<StatsEvolution | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const calculateStats = (diligences: DiligenceData[]): StatsEvolution => {
    const enCours = diligences.filter(d => d.statut === 'En cours').length;
    const terminees = diligences.filter(d => d.statut === 'Terminé').length;

    let evolutionEnCours = 0;
    let evolutionTerminees = 0;

    if (previousStats) {
      evolutionEnCours = previousStats.diligencesEnCours > 0 ? 
        Math.round(((enCours - previousStats.diligencesEnCours) / previousStats.diligencesEnCours) * 100) : 0;
      
      evolutionTerminees = previousStats.diligencesTerminees > 0 ? 
        Math.round(((terminees - previousStats.diligencesTerminees) / previousStats.diligencesTerminees) * 100) : 0;
    }

    return {
      diligencesEnCours: enCours,
      diligencesTerminees: terminees,
      evolutionEnCours,
      evolutionTerminees
    };
  };

  const fetchAndUpdateStats = async () => {
    try {
      const diligences = await apiClient.getDiligences();
      if (Array.isArray(diligences)) {
        const newStats = calculateStats(diligences);
        setStats(newStats);
        setPreviousStats(newStats);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error);
    }
  };

  const startPolling = () => {
    if (pollingRef.current) return;
    
    pollingRef.current = setInterval(() => {
      fetchAndUpdateStats();
    }, 60000); // Mettre à jour toutes les minutes
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  useEffect(() => {
    fetchAndUpdateStats();
    startPolling();
    
    return () => {
      stopPolling();
    };
  }, []); // Tableau de dépendances vide pour éviter les boucles

  return {
    stats,
    refreshStats: fetchAndUpdateStats
  };
}