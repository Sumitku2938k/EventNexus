if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
}

const mongoose = require('mongoose');
const initData = require('./data');
const Event = require('../models/events');
const connectDB = require('../utils/db');

const initDB = async () => {
    // Production safety check: Prevent accidental data wipe
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
        console.error('❌ Refusing to run destructive event seed script in production!');
        console.error('To force seeding in production, set ALLOW_SEED=true in environment variables.');
        process.exit(1);
    }

    try {
        await connectDB();
        console.log('Clearing existing events...');
        const deleteResult = await Event.deleteMany({});
        console.log(`Cleared ${deleteResult.deletedCount} existing events.`);

        const insertResult = await Event.insertMany(initData.data);
        console.log(`✅ Successfully initialized database with ${insertResult.length} events.`);
    } catch (err) {
        console.error('Error during database initialization:', err.message);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed.');
    }
};

initDB();