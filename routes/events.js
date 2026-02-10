const express = require('express');
const router = express.Router();
const Event = require('../models/events');
const Registration = require('../models/registration');
const wrapAsync = require('../utils/wrapAsync');
const ExpressError = require('../utils/ExpressError');
const { isLoggedIn, isAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const eventSchema = require('../schema');

// Validation Middleware
const validateEvent = (req, res, next) => {
    const { error } = eventSchema.validate(req.body);
    if (error) {
        throw new ExpressError(400, error.details[0].message);
    }
    next();
};

// Index Route - All Events (Public)
router.get('/', wrapAsync(async (req, res) => {
    const allEvents = await Event.find({});
    res.render("events/index.ejs", { allEvents });
}));

// New Route - Create Event Form (Admin Only)
router.get('/new', isAdmin, wrapAsync(async (req, res) => {
    res.render("events/new.ejs");
}));

// Show Route - Event Details (Public, but actions restricted)
router.get('/:id', wrapAsync(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) {
        throw new ExpressError(404, 'Event not found');
    }
    
    // Check if current user is registered (if logged in as student)
    let isRegistered = false;
    if (req.session.userId && req.session.userRole === 'student') {
        const registration = await Registration.findOne({
            eventId: req.params.id,
            studentId: req.session.userId
        });
        isRegistered = !!registration;
    }
    
    res.render("events/show.ejs", { event, isRegistered });
}));

// Create Route - With Image Upload (Admin Only)
router.post('/', isAdmin, upload.single('poster'), validateEvent, wrapAsync(async (req, res) => {
    const newEvent = new Event(req.body.event);
    
    // If image uploaded, save the path
    if (req.file) {
        newEvent.poster = '/uploads/' + req.file.filename;
    }
    
    await newEvent.save();
    res.redirect("/events");
}));

// Edit Route - Edit Form (Admin Only)
router.get("/:id/edit", isAdmin, wrapAsync(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) {
        throw new ExpressError(404, 'Event not found');
    }
    res.render("events/edit.ejs", { event });
}));

// Update Route - With Optional Image Upload (Admin Only)
router.put("/:id", isAdmin, upload.single('poster'), validateEvent, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const event = await Event.findById(id);
    
    if (!event) {
        throw new ExpressError(404, 'Event not found');
    }
    
    // Update event data
    Object.assign(event, req.body.event);
    
    // If new image uploaded, update poster path
    if (req.file) {
        event.poster = '/uploads/' + req.file.filename;
    }
    
    await event.save();
    res.redirect(`/events/${id}`);
}));

// Delete Route (Admin Only)
router.delete("/:id", isAdmin, wrapAsync(async (req, res) => {
    const { id } = req.params;
    
    // Delete all registrations for this event
    await Registration.deleteMany({ eventId: id });
    
    // Delete the event
    await Event.findByIdAndDelete(id);
    res.redirect("/events");
}));

module.exports = router;