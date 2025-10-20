const express = require('express');
const app = express();
const port = 3000;
const mongoose = require('mongoose');
const Event = require('./models/events');
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");   
const wrapAsync = require('./utils/wrapAsync');    
const ExpressError = require('./utils/ExpressError');   
const eventSchema = require('./schema');                                                   

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

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "public")));

//Home Route    
app.get('/', (req, res) => {
  res.render("home.ejs");
});

//Validation Middleware
const validateEvent = (req, res, next) => {
    const { error } = eventSchema.validate(req.body);
    if (error) {
        throw new ExpressError(400, error.details[0].message);
    }
    next();
};

//Index Route
app.get('/events', wrapAsync(async (req, res) => {
    const allEvents = await Event.find({})
    res.render("events/index.ejs", {allEvents});
}));

//New Route
app.get('/events/new', wrapAsync(async (req, res) => {
    res.render("events/new.ejs");
}));

//Show Route
app.get('/events/:id', wrapAsync(async (req, res) => {
    const event = await Event.findById(req.params.id);
    res.render("events/show.ejs", { event });
}));

//Create Route
app.post('/events', validateEvent, wrapAsync(async (req, res) => {
    const newEvent = new Event(req.body.event);
    await newEvent.save();
    res.redirect("/events");
}));

//Edit Route
app.get("/events/:id/edit", wrapAsync(async (req, res) => {
    let {id} = req.params;
    const event = await Event.findById(id);
    res.render("events/edit.ejs", {event});
}));

//Update Route
app.put("/events/:id", validateEvent, wrapAsync(async (req, res) => {
    let {id} = req.params;
    await Event.findByIdAndUpdate(id, {...req.body.event}, { runValidators: true, new: true });
    res.redirect(`/events/${id}`);
}));

//Delete Route
app.delete("/events/:id", wrapAsync(async (req, res) => {
    let {id} = req.params;
    await Event.findByIdAndDelete(id);
    res.redirect("/events");
}));

app.use( (req, res, next) => {
    next(new ExpressError(404, 'Page Not Found'));
});

//Error Handling Middleware
app.use((err, req, res, next) => {
    let { statusCode = 500, message = 'Something went wrong' } = err;
    res.status(statusCode).render("error.ejs", { message });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
