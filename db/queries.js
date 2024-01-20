const Pool = require('pg').Pool;
const path = require('path'); // this must be define or else path redirect wont work
const dotenv = require('dotenv');
dotenv.config( {path: '../config/config.env'});

const pool = new Pool({
  user: process.env.DB_USERNAME,
  host: process.env.DB_HOST,
  database: process.env.DB_DBNAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.connect();


// GET all users
const getUsers = (request, response) => {
  pool.query('SELECT * FROM users ORDER BY id ASC', (error, results) => {
    if (error) {
      //throw error
      console.log(error.message);
    }
    else {
      response.status(200).json(results.rows)
    }
    pool.end;
  );
};


// GET a single user by ID
const getUserById = (request, response) => {

  const id = parseInt(request.params.id)

  pool.query('SELECT * FROM users WHERE id = $1', [id], (error, results) => {
    if (error) {
      throw error
    }
    response.status(200).json(results.rows)
  })
};

//POST a new user 
const createUser = (req, res) => {

  const { email, password } = req.body;

  const createDate , lastLogin;
  createDate = lastLogin = new Date();

  pool.query('INSERT INTO users (email, password, created_on, last_login) VALUES ($1, $2, $3, $4)', [email, password, createDate, lastLogin], (error, res) => {
    if (error) {
      throw error
    }
    res.status(201).send(`User added with ID: ${res.insertId}`)
  })
};



module.exports = {
getUsers,
getUserById,
createUser,
//updateUser,
//deleteUser,
}