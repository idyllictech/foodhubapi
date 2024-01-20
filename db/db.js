const path = require('path'); // this must be define or else path redirect wont work
const dotenv = require('dotenv');
dotenv.config( {path: './config/config.env'});

const mysql = require('mysql');

const pool = mysql.createConnection({
    multipleStatements: true,
    timezone: 'UTC+0',
    connectionLimit: 1000,
    timeout: 40000,
    host: process.env.MQHOST,
    user: process.env.MQUSER,
    password: process.env.MQPASSWORD,
    database: process.env.MQDATABASE
  });
  
pool.connect((err) => {
    if(err) {
      throw err;
      return res.status(404).send({
        message: err
      })
    } 
    console.log('Connected to MySQL Server!');
});


module.exports = pool;