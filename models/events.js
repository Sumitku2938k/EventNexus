const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const eventSchema = new Schema({
    name: { type: String, required: true },
    description : { type: String, required: true },
    date: { type: Date, required: true },
    registrationFee: { type: Number, required: true },
    venue: { type: String, required: true },
    category: { type: String, enum: ["Technical", "Cultural", "Sports"], required: true },
    poster: { 
        type: String,
        default: "https://d12m9erqbesehq.cloudfront.net/wp-content/uploads/sites/2/2023/12/10195608/Blog-Banner-Fun-events-for-college-fest.jpg",
        set: (v) => v === "" ? "https://d12m9erqbesehq.cloudfront.net/wp-content/uploads/sites/2/2023/12/10195608/Blog-Banner-Fun-events-for-college-fest.jpg" : v,
    },   // path or URL of uploaded image
}, { timestamps: true });

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;