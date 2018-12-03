const express = require('express')
const app = express()
const bodyParser = require('body-parser')





const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )

const exerciseSchema = ({
  userId : {
    type: String,
    required: true,
  },
  description : {
    type: String,
    required: true,
  },
  duration : {
    type: Number,
    required: true,
  },
  date : {
    type: Date,
    required: false,
    default: Date.now,
  },
});
const Exercise = mongoose.model('Exercise',exerciseSchema);

const userSchema = mongoose.Schema({
  username : String,
});
const User = mongoose.model('User',userSchema);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// /api/exercise/new-user 
function api_user_post(req,res) {
  const newUser = new User({username : req.body.username});
  newUser.save( (err,savedUser) => {
    if(err){
      res.send({"Error Saving New User":err});
    } else {
      res.send({
        "_id" : savedUser._id,
        "username": savedUser.username
      });
    }
  } );
}
app.post('/api/exercise/new-user',api_user_post);

// api/exercise/users
function api_user_get(req,res){
  User.find(null,(err,users) => {
    if(err){
      res.send({"error" : err});
    }else{
      res.send(users);
    }
  })
};
app.get('/api/exercise/users',api_user_get);

const dateRegex = /^((19|20)\d{2})-((0|1)\d{1})-((0|1|2)\d{1})/g;
// /api.exercise/add
function api_exercise_add(req,res){
  const { userId, description, duration } = req.body;
  const date  = dateRegex.test(req.body.date) ? Date.parse(req.body.date) : Date.now();
  const exercise = Exercise({
    userId      : userId,
    description : description,
    duration    : duration,
    date        : date,
  }); 
  exercise.save( (err,savedExercise) => {
    if(err){
      res.send({"error" : err})
    }else {
      User.findOne({_id : userId}, (err,foundUser) => {
        if(err){
          res.send({"error":err})
        }else{
          const user = {
            "_id"         : foundUser.id,
            "username"    : foundUser.username,
            "description" : savedExercise.description,
            "duration"    : savedExercise.duration,
            "date"        : savedExercise.date,
          };
          res.send(user);
        }
      } )
    }
  } );
}
app.post('/api/exercise/add',api_exercise_add);


// /api/exercise/log
function api_exercise_log(req,res){
  const { userId, from, to, limit } = req.query;
  const conditions = {userId: userId};
  Exercise.find(conditions).sort('date').exec( (err,exercises) => {
    if(from)  exercises = exercises.filter(e => e.date >= Date.parse(from));
    if(to)    exercises = exercises.filter(e => e.date >= Date.parse(to));
    if(limit) exercises = exercises.slice(0,limit);
    res.send(JSON.stringify({
      from: from,
      LOG : exercises,
    },null, '\n'));
  } );
};
app.get('/api/exercise/log',api_exercise_log);


// // Not found middleware
// app.use((req, res, next) => {
//   return next({status: 404, message: 'not found'})
// })

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})





const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
