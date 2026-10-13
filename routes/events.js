const express = require('express');
const router = express.Router();
const Event = require('../models/events');
const Registration = require('../models/registration');
const wrapAsync = require('../utils/wrapAsync');
const ExpressError = require('../utils/ExpressError');
const { isLoggedIn, isAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const eventSchema = require('../schema');
const { uploadToCloudinary, deleteFromCloudinary, isValidImageBuffer } = require('../utils/cloudinary');

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
    let uploadedAsset = null;

    try {
        if (req.file) {
            // Validate magic bytes
            if (!isValidImageBuffer(req.file.buffer)) {
                throw new ExpressError(400, 'Invalid image file format. Supported formats are JPG, PNG, GIF, and WEBP.');
            }
            uploadedAsset = await uploadToCloudinary(req.file.buffer);
        }

        const eventData = { ...req.body.event };
        if (uploadedAsset) {
            eventData.poster = uploadedAsset.secure_url;
            eventData.posterPublicId = uploadedAsset.public_id;
        }

        const newEvent = new Event(eventData);
        await newEvent.save();
        res.redirect("/events");
    } catch (err) {
        // Clean up newly uploaded asset if DB save or any subsequent step fails
        if (uploadedAsset && uploadedAsset.public_id) {
            await deleteFromCloudinary(uploadedAsset.public_id);
        }
        throw err;
    }
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

    let uploadedAsset = null;
    const oldPublicId = event.posterPublicId;

    try {
        if (req.file) {
            // Validate magic bytes
            if (!isValidImageBuffer(req.file.buffer)) {
                throw new ExpressError(400, 'Invalid image file format. Supported formats are JPG, PNG, GIF, and WEBP.');
            }
            uploadedAsset = await uploadToCloudinary(req.file.buffer);
        }

        // Update event fields
        Object.assign(event, req.body.event);

        // If new image was uploaded, update poster URL and public ID
        if (uploadedAsset) {
            event.poster = uploadedAsset.secure_url;
            event.posterPublicId = uploadedAsset.public_id;
        }

        await event.save();

        // Delete old Cloudinary asset only after successful database save
        if (uploadedAsset && oldPublicId) {
            await deleteFromCloudinary(oldPublicId);
        }

        res.redirect(`/events/${id}`);
    } catch (err) {
        // Clean up new upload if update fails
        if (uploadedAsset && uploadedAsset.public_id) {
            await deleteFromCloudinary(uploadedAsset.public_id);
        }
        throw err;
    }
}));

// Delete Route (Admin Only)
router.delete("/:id", isAdmin, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const event = await Event.findById(id);

    if (!event) {
        throw new ExpressError(404, 'Event not found');
    }
    
    // Delete all registrations for this event
    await Registration.deleteMany({ eventId: id });
    
    // Delete Cloudinary asset if known
    if (event.posterPublicId) {
        await deleteFromCloudinary(event.posterPublicId);
    }

    // Delete the event
    await Event.findByIdAndDelete(id);
    res.redirect("/events");
}));

module.exports = router;