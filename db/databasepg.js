require('dotenv').config();
const { Client } = require('pg');

const client =  new Client({
    host: process.env.PGHOST,
    user: process.env.PGUSER,
    port: process.env.PGPORT,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE  
});

//   {    
      
//   user: "postgres",
//   host: "localhost",
//   database: "new_apidb",  
//   password: "12345",  
//   port: 5432
// }
// );

client.connect();


module.exports = client;