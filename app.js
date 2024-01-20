const express = require('express');
const path = require('path'); // this must be define or else path redirect wont work
const colors = require('colors');
const morgan = require('morgan');

const jwt = require('jsonwebtoken');



const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config( {path: './config/config.env'});

// Import Routes
const auth = require('./auth');

const app = express();

//Middleware
app.use(cors());
app.use(express.json());


//Using MORGAN package to monitor activies
if(process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

//Route Middlewares
app.use('/api/v0.1/nodepsql', auth);


//error handler
app.use(function(err, req, res, next) {
     // render the error page  
    // set locals, only providing error in development
    // res.locals.message = err.message;    
    // res.locals.error = req.app.get('env') === 'development' ? err : {};
    // //res.locals.error = process.env.NODE_ENV === 'development' ? err : {};
    // res.render('error');


     
    

    //Rendering the error as json
    res.status(err.status || 500);
    res.json({
        message: err.message,
        error: req.app.get('env') === 'development' ? err : {}
    });
});

app.listen(7000, () =>{ 
    console.log(`Server is running on port 7000`);
});

// PORT
const PORT = process.env.PORT || 5000

// app.listen(PORT, () => console.log(`Server is running in `.yellow.bold + `${process.env.NODE_ENV} mode`.green.bold + ` on port ` + `${PORT}`.red.bold));