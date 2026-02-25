import { Redis } from 'ioredis';
import { Resend } from 'resend';

// Helper function to safely parse Redis URL
function getRedisClient() {
    if (!process.env.REDIS_URL) {
        return null;
    }
    try {
        return new Redis(process.env.REDIS_URL);
    } catch (e) {
        console.error("Error connecting to Redis:", e);
        return null;
    }
}

const redis = getRedisClient();
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { name, company, email, comment, rating } = request.body;

        if (!name || !email || !comment || !rating) {
            return response.status(400).json({ error: 'Missing required fields' });
        }

        const reviewData = {
            id: Date.now().toString(),
            name,
            company: company || 'N/A',
            email,
            comment,
            rating: parseInt(rating, 10),
            createdAt: new Date().toISOString()
        };

        // 1. Save to Redis (if configured)
        if (redis) {
            try {
                await redis.lpush('yacare_reviews', JSON.stringify(reviewData));
            } catch (redisError) {
                console.error("Redis save error:", redisError);
                // We don't fail the whole request if Redis fails, since email is more important
            }
        } else {
            console.warn("REDIS_URL not configured. Skipping database save.");
        }

        // 2. Send email via Resend
        if (process.env.RESEND_API_KEY) {
            const dashboardUrl = `https://${request.headers.host || 'reviewsyacare.vercel.app'}/dashboard.html`;
            
            try {
                await resend.emails.send({
                    from: 'Yacaré Reviews <onboarding@resend.dev>',
                    to: 'mariano@yacare.io',
                    subject: `⭐ Nueva Review: ${rating} Estrellas de ${name}`,
                    html: `
                        <h2>¡Yacaré ha recibido una nueva review!</h2>
                        <ul style="font-size: 16px;">
                            <li><strong>Nombre:</strong> ${name}</li>
                            <li><strong>Empresa:</strong> ${company || 'N/A'}</li>
                            <li><strong>Email:</strong> ${email}</li>
                            <li><strong>Calificación:</strong> ${rating} / 5 Estrellas</li>
                        </ul>
                        <h3>Comentario:</h3>
                        <p style="font-size: 16px; background: #f4f4f5; padding: 15px; border-radius: 8px;">
                            ${comment}
                        </p>
                        <p style="margin-top: 30px;">
                            <a href="${dashboardUrl}" style="background-color: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                                Ver todas las reviews
                            </a>
                        </p>
                    `
                });
            } catch (emailError) {
                console.error("Resend delivery error:", emailError);
            }
        } else {
            console.warn("RESEND_API_KEY not configured. Skipping email send.");
        }

        return response.status(200).json({ success: true, message: 'Review procesada correctamente.' });

    } catch (error) {
        console.error("Serverless error:", error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}
