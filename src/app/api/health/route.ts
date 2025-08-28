import { NextResponse } from 'next/server';

const BACKEND_URL = 'http://localhost:3003/api';

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Backend health check failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Health check proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}