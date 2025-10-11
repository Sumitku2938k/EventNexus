const mongoose = require('mongoose');
const initData = require('./data')
const Event = require('../models/events');

const MONGO_URI = 'mongodb://127.0.0.1:27017/collegeEvent'

main()
    .then(() => {
        console.log('MongoDB connected');
    }).catch((err) => {
        console.error('MongoDB connection error:', err);
    });

async function main() {
    await mongoose.connect(MONGO_URI);
}

const initDB = async () => {
    await Event.deleteMany({});
    await Event.insertMany(initData.data);
    console.log("Data was initialized");
};

initDB();