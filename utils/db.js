const mongoose = require('mongoose');

// Cache connection globally to support Vercel serverless container reuse
let cached = global._mongoose;

if (!cached) {
    cached = global._mongoose = { conn: null, promise: null };
}

/**
 * Connect to MongoDB with connection pooling and caching.
 * Reuses active connection across serverless invocations and avoids multiple pools.
 * @returns {Promise<typeof mongoose>}
 */
async function connectDB() {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
        throw new Error('MONGO_URI is not defined in environment variables');
    }

    // Reuse existing connection if ready
    if (cached.conn && mongoose.connection.readyState === 1) {
        return cached.conn;
    }

    // If a connection is already in progress, wait for it
    if (!cached.promise) {
        const opts = {
            bufferCommands: false, // Prevent hanging requests if connection is lost
            maxPoolSize: 10,       // Keep pool size modest for serverless instances
            serverSelectionTimeoutMS: 5000, // Timeout fast if cluster is unreachable
        };

        cached.promise = mongoose.connect(mongoUri, opts)
            .then((mongooseInstance) => {
                const host = mongooseInstance.connection.host || 'cluster';
                const dbName = mongooseInstance.connection.name || 'collegeEvent';
                console.log(`Connected to MongoDB: host=${host}, db=${dbName}`);
                return mongooseInstance;
            })
            .catch((err) => {
                cached.promise = null; // Clear so subsequent requests can retry
                console.error('Failed to connect to MongoDB:', err.message);
                throw err;
            });
    }

    try {
        cached.conn = await cached.promise;
        return cached.conn;
    } catch (err) {
        cached.promise = null;
        throw err;
    }
}

module.exports = connectDB;
