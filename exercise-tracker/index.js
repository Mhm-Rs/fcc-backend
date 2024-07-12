require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
let bodyParser = require("body-parser")
const mongoose = require("mongoose")



// Basic Configuration
const port = process.env.PORT || 3000;
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

// Schema conf

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  }
}, { versionKey: false })
const User = mongoose.model("User", userSchema)

const exerciseSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  userId : {
    type: String,
    required: true
  },
  date: Date
}
  , { versionKey: false })
const Exercise = mongoose.model("Exercise", exerciseSchema)

// Functions

const addUser = (username) => {
  return new Promise(resolve => {
    const newUser = new User({
      username
    })
    newUser.save((err, data) => {
      if (err) console.error(err)
      console.log(`Successfully saved ${data} to db`)
      return resolve(data)
    })
  })
}

const getAllUsers = () => {
  return new Promise(resolve => {
    User.find((err, data) => {
      if (err) console.error(err)
      return resolve(data)
    })
  })
}

const findUserById = (id) => {
  return new Promise(resolve => {
    User.findById(id, (err, data) => {
      if(err) console.error(err)
        return resolve(data)
    })
  }
  )
}

const addExercise = (user, description, duration, date) => {
  return new Promise(resolve => {
    if (date == null || date.length == 0) {
      date = new Date()
    }
    const newExercise = new Exercise({
      username:user.username,
      userId:user._id,
      description,
      duration,
      date
    })
    newExercise.save((err, data) => {
      if (err) console.error(err)
      console.log(`Successfully saved ${data} to db`)
      return resolve(data)
    })
  })
}

const getExercicesFromUser = (user) => {
    return new Promise(resolve => {
      Exercise.find({userId: user._id}, (err, data) => {
        if (err) console.error(err)
          return resolve(data)
      })
    })
}

const getFilteredLogs = (logs, to, from, limit) => {
  return logs.filter(log => {
    const logDate = new Date(log.date);
    return (!to || logDate <= new Date(to)) &&
           (!from || logDate >= new Date(from));
  }).slice(0, limit);
}


// Route conf

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.route("/api/users")
  .post((req, res) => {
    addUser(req.body.username).then(data => {
      res.json(data)
    })
  })
  .get((req, res) => {
    getAllUsers().then(data => {
      res.json(data)
    })
  })

app.post("/api/users/:_id/exercises", (req, res) => {
  findUserById(req.params._id).then(data => {
    if(data == null) {
      res.json({
        error:"User not found"
      })
    } else {
      addExercise(data, req.body.description, req.body.duration, req.body.date).then(data => {
        res.json({
          _id: data.userId,
          username:data.username,
          description: data.description,
          duration: data.duration,
          date: data.date.toDateString(),
        })
      })
    }
  })
})

app.get("/api/users/:_id/logs", (req, res) => {
  findUserById(req.params._id).then(data => {
    if(data == null) {
      res.json({
        error:"User not found"
      })
    } else {
      const userInfo = {
        _id: data._id,
        username: data.username,
      } 
      getExercicesFromUser(data).then(data => {
        const limit = req.query.limit;
        const from = req.query.from;
        const to = req.query.to;

        const filteredLogs = getFilteredLogs(data, to, from, limit)
        const formattedLogs = filteredLogs.map(log => {
          return {
            description: log.description,
            duration: log.duration,
            date: log.date.toDateString()
          }
        })

        res.json({
          ...userInfo,
          ...(to && {to: new Date(to).toDateString()}),
          ...(from && {from: new Date(from).toDateString()}),
          ...(limit && {limit: Number(limit)}),
          count: formattedLogs.length,
          log: formattedLogs
        })
      })
    }
})
})



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
