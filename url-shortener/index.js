require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
let bodyParser = require("body-parser")
const dns = require("dns")
const mongoose = require("mongoose")


// Basic Configuration
const port = process.env.PORT || 3000;
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

// Schema conf

const urlSchema = new mongoose.Schema({
  longUrl: {
      type:String,
      required:true
  },
  shortUrl: {
    type:Number,
    required:true
},
})

// Setting options for dns.lookup() method 
const options = { 
  // Setting family as 6 i.e. IPv6 
  family: 6, 
  hints: dns.ADDRCONFIG | dns.V4MAPPED, 
}; 

const Url = mongoose.model("Url", urlSchema)

const test = () => {
  const firstUrl = new Url({
    longUrl: "https://www.google.com",
    shortUrl:1
  })
  firstUrl.save((err, data) => {
    if(err) console.log(err)
      console.log(`Successfully saved ${data} to db`)
  })
}

const getDomainFromUrl = (url) => {
  try {
    const urlObj = new URL(url);
    let domain = urlObj.hostname;
    if (domain.startsWith('www.')) {
        domain = domain.substring(4);
    }
    return domain;
} catch (error) {
    console.error('Invalid URL:', error);
    return 'notGood';
}
}

const isDomainValid = (domain) => {
  return new Promise((resolve) => {
    dns.lookup(domain, (error, address, family) => {
        if (error) {
            resolve(false);
        } else {
            resolve(true);
        }
    });
});
}

const getNextIdFromDb = () => {
  return new Promise((resolve) => {
    Url.find({}).sort({shortUrl : 'desc'}).limit(1).exec((err, data) => {
      if(err) console.log(err)
        return resolve(data[0].shortUrl + 1)
    })
  })
}
const createAndSaveUrlToDb = (userUrl) => {
  return new Promise((resolve) => {
    getNextIdFromDb().then(nextId => {
      const newUrl = new Url({
        longUrl: userUrl,
        shortUrl:nextId
      })
      newUrl.save((err, data) => {
        if(err) console.log(err)
          return resolve(data)
      })
    })
  })
}

const getLongUrlFromShortUrl = (number) => {
  return new Promise((resolve) => {
    Url.find({shortUrl: Number(number)}).limit(1).exec((err, data) => {
      if (err) console.error(err)
        if(data[0]) return resolve(data[0].longUrl)
          return resolve(undefined)
    })
  })
}

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.use(bodyParser.urlencoded({extended: false}))

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.post("/api/shorturl", (req,res) => {
  let userUrl = req.body.url
  let domain = getDomainFromUrl(userUrl)

  isDomainValid(domain).then(isValid => {
    if(!isValid) {
      res.json({
        error:"invalid url"
      })
    } else {
      createAndSaveUrlToDb(userUrl).then(savedUser => {
        res.json({
          original_url:savedUser.longUrl,
          short_url:savedUser.shortUrl
        })
      })
    }
  })
})
app.get("/api/shorturl/:number", (req, res) => {
  const number = req.params.number
  getLongUrlFromShortUrl(number).then(longUrl => {
    if(longUrl) res.redirect(longUrl)
  })
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
