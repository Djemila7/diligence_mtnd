import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3003';

export async function GET(request: Request) {
  try {
    // Récupérer le token d'authentification du cookie
    const cookieStore = await cookies();
    const authToken = cookieStore.get('authToken')?.value;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(`${BACKEND_URL}/api/diligences/archives`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      // Si le backend retourne 404, cela signifie qu'il n'y a pas de données archivées
      // mais que l'endpoint fonctionne - on retourne un tableau vide
      if (response.status === 404) {
        return NextResponse.json([]);
      }
      
      // Pour les autres erreurs, on propage l'erreur
      const errorText = await response.text();
      console.error('Backend error response:', errorText);
      throw new Error(`Backend responded with status ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error fetching archived diligences:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false 
      },
      { status: 500 }
    );
  }
}