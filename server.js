const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/views/index.html");
});

//parse post request
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//connect to db
mongoose.connect(
    process.env.MONGO_URI,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    },
    (err) => {
        console.log(err || "connected to db");
    }
);
// Define schemas
const userSchema = new mongoose.Schema({
    username: String,
});
const User = mongoose.model("User", userSchema);
const exerciseSchema = new mongoose.Schema({
    username: String,
    userId: String,
    description: String,
    duration: Number,
    date: { type: Date, get: (v) => v.toDateString() },
});
const Exercise = mongoose.model("Exercise", exerciseSchema);

//create user
app.post("/api/users", function (req, res) {
    const user = req.body;
    createUser(user, (err, data) => {
        if (err) console.log(err);
        else res.json(data);
    });
});
function createUser(user, done) {
    User.create(user, (err, data) => {
        if (err) done(err);
        else done(null, data);
    });
}
//get users
app.get("/api/users", function (req, res) {
    console.log("get users");
    User.find({}, (err, data) => {
        if (err) done(err);
        else res.json(data);
    });
});

//create exercise
app.post("/api/users/:id/exercises", function (req, res) {
    console.log("post to exercise:", req.body, req.params.id);
    const exercise = req.body;
    const userId = req.params.id;
    if (!exercise.date) exercise.date = new Date();

    User.findById(userId, (err, user) => {
        if (err) done(err);
        else {
            exercise.username = user.username;
            exercise.userId = user._id.toString();
            Exercise.create(exercise, (err, exercise) => {
                if (err) done(err);
                else {
                    // formation of the response
                    let response = {
                        username: exercise.username,
                        description: exercise.description,
                        duration: exercise.duration,
                        date: exercise.date,
                        _id: exercise.userId,
                    };
                    console.log("exercise: ", response);
                    res.json(response);
                }
            });
        }
    });
});

//get logs
app.get("/api/users/:id/logs", function (req, res) {
    console.log("get logs");
    const userId = req.params.id;
    const from = req.query.from;
    const to = req.query.to;
    const limit = req.query.limit;

    Exercise.find({ userId: userId })
        .select("description duration date")
        .where("date")
        .gte(from || "1900-01-01")
        .lt(to || "3000-01-01")
        .limit(limit || "1000")
        .exec((err, exercises) => {
            if (err) console.log(err);
            else {
                User.findById(userId, (err, user) => {
                    if (err) console.log(err);
                    else {
                        let log = formatLog(exercises, user);
                        console.log("log: ", log);
                        res.json(log);
                    }
                });
            }
        });
});

function formatLog(exercises, user) {
    let log = [];
    exercises.forEach((exercise) => {
        log.push({
            description: exercise.description,
            duration: exercise.duration,
            date: exercise.date,
        });
    });
    return {
        username: user.username,
        _id: user._id.toString(),
        count: exercises.length,
        log: log,
    };
}

//listen
const listener = app.listen(process.env.PORT || 3000, () => {
    console.log("Your app is listening on port " + listener.address().port);
});
