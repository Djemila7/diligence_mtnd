import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3003/api';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Récupérer le token d'authentification de l'en-tête
    const authHeader = request.headers.get('Authorization');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (authHeader && authHeader.startsWith('Bearer ')) {
      headers.Authorization = authHeader;
    }

    // Appeler le backend pour récupérer les traitements
    const response = await fetch(`${BACKEND_URL}/api/diligences/${id}/traitements`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status ${response.status}`);
    }

    const traitements = await response.json();

    return NextResponse.json(traitements);

  } catch (error: unknown) {
    console.error('Error fetching diligence traitements:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false 
      },
      { status: 500 }
    );
  }
}