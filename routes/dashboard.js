const express = require('express');
const router = express.Router();
const Event = require('../models/events');
const Registration = require('../models/registration');
const User = require('../models/user');
const wrapAsync = require('../utils/wrapAsync');
const { isLoggedIn, isAdmin, isStudent } = require('../middleware/auth');

// Student Dashboard - Show registered events
router.get('/student', isStudent, wrapAsync(async (req, res) => {
    const studentId = req.session.userId;
    
    // Get all registrations with event details
    const registrations = await Registration.find({ studentId })
        .populate('eventId')
        .sort({ appliedAt: -1 });
    
    res.render('dashboard/student.ejs', { registrations });
}));

// Admin Dashboard - Show analytics and management options
router.get('/admin', isAdmin, wrapAsync(async (req, res) => {
    // Get total counts
    const totalEvents = await Event.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalRegistrations = await Registration.countDocuments();
    
    // Get recent events with registration counts
    const events = await Event.find()
        .sort({ createdAt: -1 })
        .limit(10);
    
    // Get registration count for each event
    const eventsWithCounts = await Promise.all(
        events.map(async (event) => {
            const count = await Registration.countDocuments({ eventId: event._id });
            return { ...event.toObject(), registrationCount: count };
        })
    );
    
    // Get category-wise registration data for chart
    const categoryData = await Registration.aggregate([
        {
            $lookup: {
                from: 'events',
                localField: 'eventId',
                foreignField: '_id',
                as: 'event'
            }
        },
        { $unwind: '$event' },
        {
            $group: {
                _id: '$event.category',
                count: { $sum: 1 }
            }
        }
    ]);
    
    res.render('dashboard/admin.ejs', {
        totalEvents,
        totalStudents,
        totalRegistrations,
        events: eventsWithCounts,
        categoryData
    });
}));

// Admin - View registrations for specific event
router.get('/admin/event/:eventId/registrations', isAdmin, wrapAsync(async (req, res) => {
    const { eventId } = req.params;
    
    const event = await Event.findById(eventId);
    if (!event) {
        throw new ExpressError(404, 'Event not found');
    }
    
    // Get all registrations with student details
    const registrations = await Registration.find({ eventId })
        .populate('studentId')
        .sort({ appliedAt: -1 });
    
    res.render('dashboard/registrations.ejs', { event, registrations });
}));

module.exports = router;