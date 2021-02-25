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

// First we need to create our model
const userSchema = new Schema({
  username: String,
});

const User = mongoose.model("User", userSchema);

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

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
