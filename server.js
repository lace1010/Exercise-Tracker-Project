const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

const mongoose = require("mongoose");
// app.Post does not work unless we use body-parser middleware function here and call on the following two app.use
const bodyParser = require("body-parser"); // Must add bodyParser middleware to get info from body in html for .post()

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json()); // In order to parse JSON data sent in the POST request,

app.use(cors());
app.use(express.static("public"));

// Connect to mongoDB
mongoose.connect(process.env.EXERCISE_USER_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const Schema = mongoose.Schema; // So when creating model we can just use Schema

// Use the next four lines to see if you are conneted to mongoose correctly
var db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Connection Successful!");
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// First we need to create our model for user
// Create model for exercises to add
const workoutSchema = new Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String,
});
const Workout = mongoose.model("Workout", workoutSchema);

// Create user model that logs exercise array
const userSchema = new Schema({
  username: String,
  workout_log: Array,
});
const User = mongoose.model("User", userSchema);

// Create new user with post() from form in html
app.post("/api/exercise/new-user", (req, res) => {
  let userName = req.body.username;

  // Create a newUser with a new username
  let newUser = new User({
    username: userName,
  });

  // Save newUswer to database and return json object of its' username and id
  newUser.save((error, newuser) => {
    if (error) return console.log(error);
    res.json({
      username: newuser.username,
      _id: newuser._id,
      // id is automatically given to every object put in mongoDB
    });
  });
});

// Get an array of all of users in database returning object with username and _id
app.get("/api/exercise/users", async (req, res) => {
  // We could use __v:0 because in mongoDB every object is autmatically assigned that key:value pair
  // Can also just find every object in data base by using curly brackets as they represent an object and we can have a n array with all objects in mongoDB this way
  let array = await User.find({}); // Want to be all types

  // Only want  each objects username and _id key:pair values so we exclude __v
  let cutArray = array.map((i) => {
    return {
      username: i.username,
      _id: i._id,
    };
  });

  // Return the array we desire with res.json
  res.json(cutArray);
});

/* POST to /api/exercise/add with form data userId=_id, description, duration, and optionally date.
If no date is supplied, the current date will be used. The response returned will be the user object with the exercise fields added. */
app.post("/api/exercise/add", async (req, res) => {
  let date = new Date(req.body.date).toDateString();
  let userId = req.body.userId;
  if (date == "Invalid Date") {
    date = new Date().toDateString();
  }

  // Create new exercise to push into exercise_log
  let newWorkout = new Workout({
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date: date,
  });

  // Syntax => A.findByIdAndUpdate(id, update, options, callback) // executes
  User.findByIdAndUpdate(
    userId,
    // in Update paramater we use $push to push an object into User's exercise_log array for the object in mongoDB
    { $push: { workout_log: newWorkout } },
    { new: true }, // We need new, true to return the updated version and not the original. (Default is false)

    // Callback function to execute the update
    (error, updatedUser) => {
      if (error) return res.json({ error: "userId does not exist" });
      let responseObject = {
        username: updatedUser.username,
        _id: userId,
        description: newWorkout.description,
        duration: newWorkout.duration,
        date: date,
      };
      res.json(responseObject);
    }
  );
});

// Retrienve a full exercise log of any user.
app.get("/api/exercise/log", (req, res) => {
  // query works when url following log has a question mark and has userid=. For example, /api/exercise/log?userId=6037404f42b62600155bf1ae

  let respondObject = {};
  // Example after userId=...&from=2020-02-20&to=2021-01-03&limit=3
  let fromDate = new Date(req.query.from).toDateString(); // Converts to readable string
  let toDate = new Date(req.query.to).toDateString(); // Converts to readable string
  let limit = parseInt(req.query.limit);

  User.findById(req.query.userId, (error, foundUser) => {
    if (error) return res.json({ error: "userId does not exist" });

    //Delete the automatically generated id of workout_log in foundUser so we only display description duration and date for workout
    foundUser.workout_log.forEach((i) => delete i._id); // workout_log is the array we want to loop through

    respondObject["username"] = foundUser.username; // add username to object that goes in res.json()
    respondObject["description"] = foundUser.workout_log.description;
    respondObject["duration"] = foundUser.workout_log.duration;
    respondObject["date"] = foundUser.workout_log.date;

    // Handle from to and limit paramters here before passing to respondObject for rest of app.get()
    // If there is a from= or to= paramater
    if (req.query.from || req.query.to) {
      if (fromDate == "Invalid Date") {
        fromDate = new Date(0); // If fromDate gives invalid date we must set variable to original computer time(0) so filteredArray still has a date to pass in to make logic work instead of undefined which would filteredArray
      } else {
        respondObject["from"] = fromDate; // If fromDate gives a valid date then add to responseObject
      }

      if (toDate == "Invalid Date") {
        toDate = new Date(); // If toDate gives invalid date we must set variable to current time so filteredArray still has a date to pass in to make logic work instead of undefined which would filteredArray
      } else {
        respondObject["to"] = toDate; // If to= gives a valid date then add to responseObject
      }

      if (limit) respondObject["limit"] = limit; // If limit is a number (we use parseInt() in the limit variable above)

      console.log(foundUser.workout_log);
      // Filter array so we only return workouts that are within from and to paramters and have a limit to how many workouts can return as well.
      let filteredArray = foundUser.workout_log.filter((element, index) => {
        if (
          // To see if a date is older than another we must convert it back from string to a real js Date()
          new Date(fromDate) < new Date(element.date) &&
          new Date(element.date) < new Date(toDate)
        ) {
          return element;
        }
      });

      if (filteredArray.length > 0) {
        respondObject["count"] = filteredArray.length;
        respondObject["log"] = filteredArray;
      }
    } else {
      respondObject["count"] = foundUser.workout_log.length;
      respondObject["log"] = foundUser.workout_log;
    }

    // If there is a limit then slice the array in the respondObject.log value to only include a certain amount of workouts
    if (limit) {
      respondObject.log = respondObject.log.slice(0, limit);
    }
    res.json(respondObject); // Call res.json() for our response object based on paramters given
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

// Test this id
// 6037404f42b62600155bf1ae
