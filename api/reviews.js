import { kv } from '@vercel/kv';

export default async function handler(request, response) {
    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // Retrieve all reviews from the KV store list
        // KV lrange returns an array of elements
        // Parameters: key, start, stop (0, -1 gets all elements)
        const reviews = await kv.lrange('yacare_reviews', 0, -1);

        // If no reviews exist, lrange might return null, so we default to []
        return response.status(200).json(reviews || []);
    } catch (error) {
        console.error('Error fetching reviews:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}
