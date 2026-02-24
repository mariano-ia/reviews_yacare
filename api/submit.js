import { kv } from '@vercel/kv';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { name, email, company, comment, rating } = request.body;

        // Basic validation
        if (!name || !email || !company || !comment || !rating) {
            return response.status(400).json({ error: 'Faltan campos obligatorios' });
        }

        const review = {
            id: Date.now().toString(),
            name,
            email,
            company,
            comment,
            rating: parseInt(rating),
            timestamp: Date.now()
        };

        // 1. Save to Vercel KV 
        // We will store all reviews in a single list (key: 'yacare_reviews')
        await kv.lpush('yacare_reviews', review);

        // 2. Send Email Notification via Resend
        if (process.env.RESEND_API_KEY) {
            const dashboardURL = `https://${request.headers.host}/dashboard.html`;
            
            await resend.emails.send({
                from: 'Yacaré Reviews <onboarding@resend.dev>', // Use a verified domain if available, otherwise Resend testing email
                to: 'mariano@yacare.io',
                subject: `⭐ Nueva Review de ${name} (${rating} Estrellas)`,
                html: `
                    <h2>¡Tienes un nuevo feedback!</h2>
                    <p><strong>Cliente:</strong> ${name} (${email})</p>
                    <p><strong>Empresa:</strong> ${company}</p>
                    <p><strong>Calificación:</strong> ${rating} / 5 Estrellas</p>
                    <p><strong>Comentario:</strong><br/>"${comment}"</p>
                    <br/>
                    <a href="${dashboardURL}" style="display:inline-block; padding:10px 20px; background-color:#000; color:#fff; text-decoration:none; border-radius:5px;">Ver en el Dashboard</a>
                `
            });
        } else {
            console.warn('RESEND_API_KEY no configurado, el email no fue enviado.');
        }

        return response.status(200).json({ success: true, message: 'Review guardada exitosamente' });

    } catch (error) {
        console.error('Error saving review:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}
