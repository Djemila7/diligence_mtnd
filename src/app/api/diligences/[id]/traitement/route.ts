import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3003/api';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const formData = await request.formData();
    
    // Récupérer les données du formulaire
    const commentaire = formData.get('commentaire') as string;
    const progression = parseInt(formData.get('progression') as string);
    const statut = formData.get('statut') as string;
    const fichiers = formData.getAll('fichiers') as File[];
    
    // Récupérer le token d'authentification de l'en-tête
    const authHeader = request.headers.get('Authorization');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (authHeader && authHeader.startsWith('Bearer ')) {
      headers.Authorization = authHeader;
    }

    // 1. Traiter l'upload des fichiers
    const uploadedFiles: string[] = [];
    
    if (fichiers && fichiers.length > 0) {
      // Créer le répertoire de stockage s'il n'existe pas
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'diligences', id);
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      
      // Traiter chaque fichier
      for (const file of fichiers) {
        if (file.size > 10 * 1024 * 1024) { // 10MB max
          return NextResponse.json(
            { error: `Le fichier ${file.name} dépasse la taille maximale de 10MB` },
            { status: 400 }
          );
        }
        
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Générer un nom de fichier unique
        const timestamp = Date.now();
        const originalName = file.name;
        const extension = path.extname(originalName);
        const baseName = path.basename(originalName, extension);
        const uniqueName = `${baseName}_${timestamp}${extension}`;
        const filePath = path.join(uploadDir, uniqueName);
        
        await writeFile(filePath, buffer);
        uploadedFiles.push(`/uploads/diligences/${id}/${uniqueName}`);
      }
    }

    // 2. Utiliser la route de traitement backend au lieu de PUT
    // Créer un FormData pour envoyer au backend
    const backendFormData = new FormData();
    backendFormData.append('commentaire', commentaire);
    backendFormData.append('progression', progression.toString());
    backendFormData.append('statut', statut); // Envoyer le statut exact
    
    // Ajouter les fichiers au FormData backend
    fichiers.forEach((file) => {
      backendFormData.append('fichiers', file);
    });

    const response = await fetch(`${BACKEND_URL}/diligences/${id}/traitement`, {
      method: 'POST',
      headers: {
        'Authorization': headers.Authorization || '',
      },
      body: backendFormData,
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status ${response.status}`);
    }

    const result = await response.json();

    // 3. Envoyer un email de notification à l'émetteur
    try {
      // Récupérer les informations de l'émetteur depuis la diligence
      const diligenceResponse = await fetch(`${BACKEND_URL}/diligences/${id}`, {
        method: 'GET',
        headers,
      });
      
      if (diligenceResponse.ok) {
        const diligenceDetails = await diligenceResponse.json();
        const createdBy = diligenceDetails.created_by;
        
        if (createdBy) {
          // Récupérer l'email de l'émetteur
          const userResponse = await fetch(`${BACKEND_URL}/users`, {
            method: 'GET',
            headers,
          });
          
          if (userResponse.ok) {
            const users = await userResponse.json();
            const emetteur = users.find((u: { id: number; email: string }) => u.id === createdBy);
            
            if (emetteur && emetteur.email) {
              // Envoyer l'email de notification directement via l'API backend
              const emailResponse = await fetch(`${BACKEND_URL}/smtp/send-notification`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...headers,
                },
                body: JSON.stringify({
                  to: emetteur.email,
                  subject: statut === "Terminé"
                    ? `✅ Diligence terminée - ${diligenceDetails.titre} (À valider)`
                    : `📋 Diligence traitée - ${diligenceDetails.titre}`,
                  message: statut === "Terminé"
                    ? `
                      <h2>✅ Diligence terminée - Prête pour validation</h2>
                      <p>Bonjour,</p>
                      <p>La diligence <strong>"${diligenceDetails.titre}"</strong> a été marquée comme terminée par un destinataire et est maintenant en attente de votre validation.</p>
                      
                      <h3>📊 Détails du traitement :</h3>
                      <ul>
                        <li><strong>Progression finale :</strong> ${progression}%</li>
                        <li><strong>Statut :</strong> Terminé (en attente de validation)</li>
                        <li><strong>Commentaire :</strong> ${commentaire || 'Aucun commentaire'}</li>
                        ${uploadedFiles.length > 0 ? `<li><strong>Fichiers joints :</strong> ${uploadedFiles.length} fichier(s)</li>` : ''}
                      </ul>
                      
                      <p><strong>Action requise :</strong> Veuillez valider ou rejeter le travail effectué dans votre tableau de bord.</p>
                      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/diligence/${id}" style="color: #007bff; text-decoration: none;">→ Valider la diligence</a></p>
                      
                      <hr>
                      <p style="color: #666; font-size: 12px;">
                        Ceci est une notification automatique. Merci de ne pas répondre à cet email.
                      </p>
                    `
                    : `
                      <h2>📋 Notification de traitement de diligence</h2>
                      <p>Bonjour,</p>
                      <p>La diligence <strong>"${diligenceDetails.titre}"</strong> a été mise à jour par un destinataire.</p>
                      
                      <h3>📊 Détails du traitement :</h3>
                      <ul>
                        <li><strong>Nouvelle progression :</strong> ${progression}%</li>
                        <li><strong>Nouveau statut :</strong> ${statut}</li>
                        <li><strong>Commentaire :</strong> ${commentaire || 'Aucun commentaire'}</li>
                        ${uploadedFiles.length > 0 ? `<li><strong>Fichiers joints :</strong> ${uploadedFiles.length} fichier(s)</li>` : ''}
                      </ul>
                      
                      <p>Vous pouvez consulter les détails complets dans votre tableau de bord.</p>
                      
                      <hr>
                      <p style="color: #666; font-size: 12px;">
                        Ceci est une notification automatique. Merci de ne pas répondre à cet email.
                      </p>
                    `,
                  type: 'diligence_traitee'
                }),
              });
              
              if (!emailResponse.ok) {
                console.warn('⚠️ Échec de l\'envoi de l\'email de notification');
              } else {
                console.log('✅ Email de notification envoyé à:', emetteur.email);
              }
            }
          }
        }
      }
    } catch (emailError) {
      console.error('❌ Erreur lors de l\'envoi de l\'email de notification:', emailError);
      // Ne pas bloquer le traitement en cas d'erreur d'email
    }
    
    // 4. Enregistrer le commentaire et les fichiers dans une table de traitement
    // (À implémenter selon votre structure de base de données)
    
    return NextResponse.json({
      success: true,
      message: 'Traitement enregistré avec succès. Notification envoyée à l\'émetteur.',
      fichiers: uploadedFiles,
      result
    });

  } catch (error: unknown) {
    console.error('Error processing diligence treatment:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false 
      },
      { status: 500 }
    );
  }
}