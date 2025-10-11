const express = require('express');
const app = express();
const port = 3000;
const mongoose = require('mongoose');
const Event = require('./models/events');
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");                                                             

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

//Index Route
app.get('/events', async (req, res) => {
    const allEvents = await Event.find({})
    res.render("events/index.ejs", {allEvents});
});

//New Route
app.get('/events/new', (req, res) => {
    res.render("events/new.ejs");
});

//Show Route
app.get('/events/:id', async (req, res) => {
    const event = await Event.findById(req.params.id);
    res.render("events/show.ejs", { event });
});

//Create Route
app.post('/events', async (req, res) => {
    const newEvent = new Event(req.body.event);
    await newEvent.save();
    res.redirect("/events");
});

//Edit Route
app.get("/events/:id/edit", async (req, res) => {
    let {id} = req.params;
    const event = await Event.findById(id);
    res.render("events/edit.ejs", {event});
});

//Update Route
app.put("/events/:id", async (req, res) => {
    let {id} = req.params;
    await Event.findByIdAndUpdate(id, {...req.body.event}, { runValidators: true, new: true });
    res.redirect(`/events/${id}`);
});

//Delete Route
app.delete("/events/:id", async (req, res) => {
    let {id} = req.params;
    await Event.findByIdAndDelete(id);
    res.redirect("/events");
});

//404 Error Route
app.use((req, res) => {
    res.status(404).send('404 Not Found');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
