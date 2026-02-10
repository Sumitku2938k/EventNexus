const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const registrationSchema = new Schema({
    eventId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Event',
        required: true
    },
    studentId: { 
        type: Schema.Types.ObjectId, 
        ref: 'User',
        required: true
    },
    appliedAt: { 
        type: Date, 
        default: Date.now 
    }
}, { timestamps: true });

// Compound index to prevent duplicate registrations
registrationSchema.index({ eventId: 1, studentId: 1 }, { unique: true });

const Registration = mongoose.model('Registration', registrationSchema);
module.exports = Registration;