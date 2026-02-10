const express = require('express');
const router = express.Router();
const Registration = require('../models/registration');
const Event = require('../models/events');
const wrapAsync = require('../utils/wrapAsync');
const ExpressError = require('../utils/ExpressError');
const { isStudent } = require('../middleware/auth');

// POST - Register for an event (Student Only)
router.post('/:eventId', isStudent, wrapAsync(async (req, res) => {
    const { eventId } = req.params;
    const studentId = req.session.userId;
    
    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
        throw new ExpressError(404, 'Event not found');
    }
    
    // Check if already registered
    const existingRegistration = await Registration.findOne({ eventId, studentId });
    if (existingRegistration) {
        return res.redirect(`/events/${eventId}?error=already_registered`);
    }
    
    // Create new registration
    const registration = new Registration({ eventId, studentId });
    await registration.save();
    
    res.redirect(`/events/${eventId}?success=registered`);
}));

// DELETE - Unregister from an event (Student Only)
router.delete('/:eventId', isStudent, wrapAsync(async (req, res) => {
    const { eventId } = req.params;
    const studentId = req.session.userId;
    
    await Registration.findOneAndDelete({ eventId, studentId });
    res.redirect(`/events/${eventId}?success=unregistered`);
}));

module.exports = router;