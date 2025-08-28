import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes protégées par authentification

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Récupère le token JWT du cookie (si présent)
  const authToken = request.cookies.get('authToken')?.value

  if (!authToken) {
    // Autorise les assets statiques et les pages publiques
    if (!request.nextUrl.pathname.startsWith('/login') &&
        !request.nextUrl.pathname.startsWith('/auth') &&
        !request.nextUrl.pathname.startsWith('/api') &&
        !request.nextUrl.pathname.startsWith('/_next')) {
      // Pour App Router, rediriger simplement vers /login sans paramètres
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }
  
  // Token présent, autorisation accordée
  return NextResponse.next()
}