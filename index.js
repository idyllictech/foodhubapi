const express = require('express');
const app = express();
const cors = require('cors');
const pool = require('./db/db');
const colors = require('colors');
const morgan = require('morgan');
const bodyParser = require("body-parser");
const userprofa =require('./usrprofile/router')

const allowedOrigins = [
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
  'http://localhost:8080',
  'http://localhost:8100',
];

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Origin not allowed by CORS'));
    }
  },
};

//use express static folder
app.use(express.static("./public"));

app.use('/api/v2/talenthubs/static', express.static("./public"));

// const path = require('path'); // this must be define or else path redirect wont work

// This allow us to post json
app.options('*', cors(corsOptions));
//app.use(cors());
app.use(morgan("combined"));
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', parameterLimit: 2000000, extended: true}));
//app.use(bodyParser.urlencoded({ extended: false}));



// Here is used to import Routes
const thubsRoutes = require('./users/routes');


// Here i sused to import profile Routes
//const profileRoutes = require('./usrprofile/router');

// Creating Route Middlewares
app.use('/api/v2/talenthubs/profile/', cors(corsOptions), userprofa);


app.use('/api/v2/talenthubs/', cors(corsOptions), thubsRoutes);


//route for testing to upload Image
app.get('/api/v2/talenthubs/profile/imgupload', cors(corsOptions), (req, res) => {
    res.sendFile(__dirname + '/upload.html');
  });

//route for testing to upload Video
app.get('/api/v2/talenthubs/profile/videoupload', cors(corsOptions), (req, res) => {
  res.sendFile(__dirname + '/videoupload.html');
});

app.get("/", (req, res) =>{
    res.send("<h2 style='color: blueviolet'>Welcome to to Talenthub Backend Running API server, its curently running!</h2>")
});

// app.listen(6500, () => {
//     console.log('Server is running on port 6500');
// })

// PORT
const PORT = process.env.PORT || 5000

//app.listen(3000, () => console.log('Server up and running'));
app.listen(PORT, () => console.log(`Server is running in `.yellow.bold + `${process.env.NODE_ENV} mode`.green.bold + ` on port ` + `${PORT}`.red.bold));