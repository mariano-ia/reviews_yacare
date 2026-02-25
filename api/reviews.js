import { Redis } from 'ioredis';

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

export default async function handler(request, response) {
    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    if (!redis) {
        return response.status(200).json([]);
    }

    try {
        const reviewsStrings = await redis.lrange('yacare_reviews', 0, -1);
        const reviews = reviewsStrings.map(str => {
            try {
                return JSON.parse(str);
            } catch (e) {
                return null;
            }
        }).filter(r => r !== null);

        // Send back parsed JSON
        return response.status(200).json(reviews);
    } catch (error) {
        console.error("Redis fetch error:", error);
        return response.status(500).json({ error: 'Internal Server Error fetching reviews' });
    }
}
