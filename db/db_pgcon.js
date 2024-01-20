const path = require('path'); // this must be define or else path redirect wont work
const dotenv = require('dotenv');
dotenv.config( {path: './config/config.env'});

const Pool = require('pg').Pool;

const pool = new Pool();

//   {    
      
//   user: "postgres",
//   host: "localhost",
//   database: "new_apidb",  
//   password: "12345",  
//   port: 5432
// }
// );

// it contains if a backend error or network partition happens
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err)
    process.exit(-1)
});

pool.connect();


module.exports = pool;