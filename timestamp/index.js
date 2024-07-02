// index.js
// where your node app starts

// init project
var express = require('express');
var app = express();

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC 
var cors = require('cors');
app.use(cors({optionsSuccessStatus: 200}));  // some legacy browsers choke on 204

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});


function parseDateFromUser(req, res) {
  let stringDate = req.params.date
  let outputDate;
  
  if (stringDate == null || stringDate.trim().length === 0) {
    outputDate = new Date(Date.now())
  } else if (isNaN(Number(stringDate))) {
    outputDate = new Date(stringDate)
  } else {
    outputDate = new Date(Number(stringDate))
  }

  if(isNaN(outputDate.valueOf())) {
    res.json({
      error:"Invalid Date"
    })
  }
  else {
    res.json({
      unix:outputDate.valueOf(),
      utc:outputDate.toUTCString()
    })
  }
}


app.get("/api/:date?", parseDateFromUser)



// Listen on port set in environment variable or default to 3000
var listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
