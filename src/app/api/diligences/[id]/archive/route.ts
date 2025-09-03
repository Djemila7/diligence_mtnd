import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3003';

interface ErrorResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Récupérer le token d'authentification du cookie
    const cookieStore = await cookies();
    const authToken = cookieStore.get('authToken')?.value;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    console.log('🔍 Appel de l\'API route d\'archivage pour la diligence:', id);
    
    const response = await fetch(`${BACKEND_URL}/api/diligences/${id}/archive`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      let errorData: ErrorResponse = { success: false };
      try {
        errorData = await response.json() as ErrorResponse;
      } catch (jsonError) {
        console.error('❌ Failed to parse error response:', jsonError);
        const errorText = await response.text();
        throw new Error(`Backend responded with status ${response.status}: ${errorText}`);
      }
      
      console.error('❌ Erreur backend lors de l\'archivage:', response.status, errorData);
      
      // Si le backend retourne une erreur "déjà archivée", on considère que c'est un succès
      // car l'objectif est que la diligence soit dans les archives
      if (response.status === 400 && errorData.error && errorData.error.includes('déjà archivée')) {
        console.log('✅ Diligence déjà archivée - retour succès conditionnel');
        return NextResponse.json(
          {
            success: true,
            message: 'Diligence déjà archivée'
          }
        );
      }
      
      // Pour les autres erreurs, on propage l'erreur
      throw new Error(errorData.error || errorData.message || `Backend responded with status ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Archivage réussi:', result);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('❌ Erreur lors de l\'archivage de la diligence:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false 
      },
      { status: 500 }
    );
  }
}