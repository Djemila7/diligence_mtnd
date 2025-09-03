import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3003/api';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const { validation_status, comment } = await request.json();
    
    // Récupérer le token d'authentification de l'en-tête
    const authHeader = request.headers.get('Authorization');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (authHeader && authHeader.startsWith('Bearer ')) {
      headers.Authorization = authHeader;
    }

    // Utiliser l'endpoint de validation dédié du backend
    const response = await fetch(`${BACKEND_URL}/api/diligences/${id}/validate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ validation_status, comment }),
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status ${response.status}`);
    }

    const result = await response.json();
    
    // Déterminer le nouveau statut basé sur la validation
    const newStatus = validation_status === 'approved' ? 'Terminé' : 'En cours';

    // Envoyer une notification au destinataire si la diligence est rejetée
    if (validation_status === 'rejected') {
      try {
        // Récupérer les informations de la diligence
        const diligenceResponse = await fetch(`${BACKEND_URL}/api/diligences/${id}`, {
          method: 'GET',
          headers,
        });
        
        if (diligenceResponse.ok) {
          const diligenceDetails = await diligenceResponse.json();
          
          // Récupérer les informations des destinataires
          if (diligenceDetails.destinataire) {
            let destinataireIds: string[] = [];
            
            if (typeof diligenceDetails.destinataire === 'string') {
              try {
                const parsed = JSON.parse(diligenceDetails.destinataire);
                destinataireIds = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
              } catch {
                destinataireIds = [diligenceDetails.destinataire];
              }
            } else if (Array.isArray(diligenceDetails.destinataire)) {
              destinataireIds = diligenceDetails.destinataire.map(String);
            }
            
            // Récupérer les emails des destinataires
            const usersResponse = await fetch(`${BACKEND_URL}/api/users`, {
              method: 'GET',
              headers,
            });
            
            if (usersResponse.ok) {
              const users = await usersResponse.json();
              
              // Trouver les destinataires
              const destinataires = users.filter((user: { id: number; email: string }) => 
                destinataireIds.includes(String(user.id))
              );
              
              // Envoyer des notifications aux destinataires
              for (const destinataire of destinataires) {
                if (destinataire.email) {
                  const emailResponse = await fetch(`${BACKEND_URL}/api/smtp/send-notification`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...headers,
                    },
                    body: JSON.stringify({
                      to: destinataire.email,
                      subject: `❌ Diligence rejetée: ${diligenceDetails.titre}`,
                      message: `
                        <h2>❌ Notification de rejet de diligence</h2>
                        <p>Bonjour,</p>
                        <p>La diligence <strong>"${diligenceDetails.titre}"</strong> a été rejetée par l'émetteur.</p>
                        
                        <h3>📋 Détails du rejet :</h3>
                        <ul>
                          <li><strong>Raison :</strong> ${comment || 'Aucun commentaire spécifié'}</li>
                          <li><strong>Nouveau statut :</strong> ${newStatus}</li>
                        </ul>
                        
                        <p>Veuillez consulter la diligence pour apporter les corrections nécessaires.</p>
                        
                        <hr>
                        <p style="color: #666; font-size: 12px;">
                          Ceci est une notification automatique. Merci de ne pas répondre à cet email.
                        </p>
                      `,
                      type: 'diligence_rejetee'
                    }),
                  });
                  
                  if (!emailResponse.ok) {
                    console.warn('⚠️ Échec de l\'envoi de l\'email de notification de rejet à:', destinataire.email);
                  } else {
                    console.log('✅ Email de notification de rejet envoyé à:', destinataire.email);
                  }
                }
              }
            }
          }
        }
      } catch (emailError) {
        console.error('❌ Erreur lors de l\'envoi des notifications de rejet:', emailError);
        // Ne pas bloquer le traitement en cas d'erreur d'email
      }
    }

    return NextResponse.json({
      success: true,
      message: validation_status === 'approved' 
        ? 'Diligence validée avec succès' 
        : 'Diligence rejetée avec succès',
      new_status: newStatus,
      result
    });

  } catch (error: unknown) {
    console.error('Error processing diligence validation:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false 
      },
      { status: 500 }
    );
  }
}