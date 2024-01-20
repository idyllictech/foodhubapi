const pool = require('../db/db');
const bcrypt = require('bcryptjs');
const queries = require('./queries');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const nodemailerSendgrid = require('nodemailer-sendgrid');
const handlebars = require('handlebars');
const fs = require("fs")
const path = require("path")

const emailTemplateSource = fs.readFileSync(path.join(__dirname, "/template.hbs"), "utf8")

const mailgun = require("mailgun-js");



  
  const template = handlebars.compile(emailTemplateSource)
  
  // SENDGRID Mail Template

  const transport = nodemailer.createTransport(
    nodemailerSendgrid({
         apiKey: process.env.SENDGRID_API_KEY
      })
    );


const { 
    v1: uuidv1,
    v4: uuidv4,
  } = require('uuid');

//
  const guid = uuidv4();

//REGISTRATION VALIDATION
const Joi = require('joi');

const schemaRegister = Joi.object({
    email: Joi.string()
            .min(8)
            .required()
            .email({ minDomainSegments: 2}),
    password: Joi.string()
            .min(8)
            .required()    
});


//LOGIN VALIDATION 
const schemaLogin = Joi.object({    
    email: Joi.string()
            .min(8)
            .required()
            .email({ minDomainSegments: 2}),    
    password: Joi.string()
            .min(8)
            .required()
});


//ACTIVATION VALIDATION 
const schemaActivate = Joi.object({    
    verifytoken: Joi.string()
            .min(8)
            .required()
});




// Contrller to get ALL Talent
const getTalenters = (req, res) => {
    pool.query(queries.getTalenters, (error, results) => {
        // the callback functions
        if(error) throw error;

        res.header('Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept'
        );
        res.status(200).json(results);
    });
    //console.log("geting talents list");
};

// Controller to Save New User and Hash password
const addTalenter = async (req, res) => {
    const {email, password } = req.body;
    
    //Generate UnIQUEID
   
    const usocialid = uuidv4();
    const emailtoken = uuidv1();
    
    // HERE WE VALIDATE THE DATA BEFORE WE MAKE A USER
    //New method of using joi validation    
    const {error} = schemaRegister.validate(req.body);
    if(error) return res.status(400).send(error.details[0].message);
    //res.send(error.details[0].message);

     //Hash and Salts the password
     const salt = await bcrypt.genSalt(10);
     const hashedPassword = await bcrypt.hash(req.body.password, salt);
    // Check if email exists
    pool.query(queries.checkEmailExists, [email], (error, results) => {
        if(results.length) {

            console.log(results.length);
            //Note Always use return if you want to stop this function if the condition is meet
            return res.status(409).json({
                message: 'Email already in use!',
                success: false
        });     
    };
       

        //add student to db
        pool.query(queries.addTalenter,
            [usocialid, email, hashedPassword, emailtoken], 
            (error, results) => {
            if (error) {
                throw error;
                return res.status(404).send({
                    message: error
                });
            }

            //Here we send the email two types

            //1. async email
            const emailToken = jwt.sign(
                {
                    email: email,
                },
                process.env.EMAIL_SECRET,
                {
                    expiresIn: '20m',
                });


            const url = `${process.env.TALHUBSAPI_URL}/confirmation/${emailToken}`;

            //checking email URL
            console.log('Checking mailtoken: ' + url)
            
            // using handlebars template
            const htmlToSend = template({message: url});

            const mailOptions = {
                //from: "itsupport@lakinberg.com",
                from:"no-reply@lakinberg.com",
                to: email,
                subject: 'Talenthub Registration Email Activation',
                html: htmlToSend
              }
              
               //USING SENDGRID MAIL SENDING OPTIONS
             
              transport.sendMail(mailOptions, function(error, response) {
                if (error) {
                    console.log(error);
                    return res.json({
                        error: error.message
                    });
                } else {
                    console.log('Email sent: ' + response);

                    console.log("User was registered successfully!!")

                    return res.status(201).json({
                        message: `Email has been sent,kindly ativate your account!:`,
                        success: true
                    });
                }
              })


            //2. sync email

            // try {

            //     const emailToken = jwt.sign(
            //         {
            //             email: email,
            //         },
            //         process.env.EMAIL_SECRET,
            //         {
            //             expiresIn: '1d',
            //         },
            //     );

                // const url = `${process.env.TALHUBSAPI_URL}/confirmation/${emailToken}`;

                // const mailOptions = {
                //     from:"no-reply@talenthubs.com",
                //     to: email,
                //     subject: 'Email Activation',
                //     html: `Please click this email to activate your email: <a> href="${url}"${url}</a>`
                //   };

                // await  transporter.sendMail(mailOptions, function(error, info){
                //     if (error) {
                //       console.log(error);
                //     } else {
                //       console.log('Email sent: ' + info.response);
                //     }
                //   });

                
            // } catch (e) {
            //     console.log(e);
            // }
            
        });
    });
};



// Confirmation of Email

const confirmationEmail = async (req, res) => {
    try {
        const { email: { email } } = jwt.verify(req.params.token, process.env.EMAIL_SECRET);


        pool.query(queries.checkActivateEmail, [email], (error, resultss) => {
            if(error) {
                throw error;
                return res.status(404).send({
                    message: 'Confirmation token error: '+ error,
                    success: false
                });
            };
            console.log(resultss);
    
            const noEntityFound = resultss.length < 1;
    
            if(noEntityFound) {
                return res.status(404).send("Invalid / Expired Activation Token");
            }
    
            pool.query(queries.activateEmail, [verifytoken], (error, results) => {
    
                if(error) {
                    throw error;
                    return res.status(404).send({
                        message: 'Activation error: '+ error,
                        success: false
                    });
                };
                res.status(201).json({
                    message: "Activated Successfully, Please Log in.",                
                    success: true
                });
            });    
        });

        return res.redirect(201, `${process.env.TALHUBSAPI_URL}/login`);
        
    } catch (e) {
        res.send('error');
    }
};





// API FOR ACTIVATE SIGNUP
const activateSignup = async (req, res) => {

    const verifytoken = req.params.verifytoken;

    //New method of using joi validation    
    // const {error} = schemaActivate.validate(req.params.verifytoken);
    // if(error) return res.status(400).send(error.details[0].message);
    //res.send(error.details[0].message);

    pool.query(queries.checkActivateStatus, [verifytoken], (error, resultss) => {
        if(error) {
            throw error;
            return res.status(404).send({
                message: 'Confirmation token error: '+ error,
                success: false
            });
        };
        console.log(resultss);

        const noEntityFound = resultss.length < 1;

        if(noEntityFound) {
            return res.status(404).send("Invalid / Expired Activation Token");
        }

        pool.query(queries.activateSignup, [verifytoken], (error, results) => {

            if(error) {
                throw error;
                return res.status(404).send({
                    message: 'Activation error: '+ error,
                    success: false
                });
            };
            res.status(201).json({
                message: "Activated Successfully, Please Log in.",                
                success: true
            });
        });

    });

};


// Here controller for get Talenter by id
const getTalenterById = (req, res) => {
    const id = parseInt(req.params.id);
    // Here we have the SQL Query, Parameters and Callback functions
    pool.query(queries.getTalenterById, [id], (error, results) => { 
        console.log('Test Checking here');             
        if(error) throw error;
        res.status(200).json(results);
    });
};


// Delete Talenter / User by id
const removeTalenter = (req, res) => {

    const id = parseInt(req.params.id);

    pool.query(queries.getTalenterById, [id], (error, results) => {
        if (error) throw error;

        const noStudentFound = results.length < 1;
        if (noStudentFound) {
            return res.status(404).send("Talenter does not exist in the database.");
        };
        
        pool.query(queries.removeTalenter, [id], (error, results) => {
            if (error) throw error;

            res.status(201).json({
                message: "Talenter / User removed Succesfully",
                success: true
            });
        });        
        
    });

};





// Update Student / User Name by id
const updateTalenterName = (req, res) => {
    const id = parseInt(req.params.id);
    const { fullname } = req.body;

    //Firstly, to update a Student/User fullname, that student must exist, so find entities by id then update
    pool.query(queries.getTalenterById, [id], (error, results) => {
        if (error) throw error;

        const noEntityFound = results.length < 1;
        if(noEntityFound) {
            return res.status(404).send("No User Details Found");
        }

        pool.query(queries.updateTalenterName, [req.body.fullname, id], (error, results) => {
            if(error) throw error;
            res.status(201).json({
                    message: "User Fullname Updated Successfully",
                    data: req.body.fullname,
                    success: true
            });
        })

    });

};

//API FOR LOGIN
const userLogin = async (req,res) => {

    const { email } = req.body;    

    const {error} = schemaLogin.validate(req.body);
    if(error) return res.status(400).send(error.details[0].message);
    
    // Checking if the user email exist
    pool.query(queries.getUserLogin, [email.toLowerCase()], (error, results) => {
        if(error) {
            throw error;
            return res.status(404).send({
                message: error
            })
        } 

        console.log(results);
        console.log(results.length);
        
        //noUserFound = results[0].email        
        //const noUserFound = !results.length;
        const noUserFound = results.length < 1;
        
        //console.log(noUserFound);
        if(noUserFound) {
            return res.status(404).json({
                message: "Email Or Password is incorrect!",
                success: false
            });
        };

        //console.log(results[0].password);

        
        // If User Exist here, we validate the password
        // You can also get a field password as follow 
        // results[0]['password'] 
        // or results[0].password

        // Checking if the password is correct exist
        const validPassword = bcrypt.compareSync(req.body.password, results[0]['password']);
        if (!validPassword) return res.status(400).json({
            message: 'Email Or Password is incorrect!',
            success: false
         });


         // CREATE AND ASSIGN A TOKEN JWT IF LOGIN SUCCESSFUL

         const token = jwt.sign({
             email: results[0].password,
             usocialid: results[0].usocialid
         }, 
         process.env.TOKEN_SECRET, {expiresIn: '1h'}
         );

         //UPDATE LAST LOGIN
         pool.query(queries.updateLastLogin, [results[0].usocialid]);

        //res.header('access-token',token).send(token); // Here is the identifier we add along
        res.status(201).header('access-token',token).json({
            message: "Successful login. Loading reroute...: ",
            token,
            success: true,
            email: results[0].email            
        })

    });

};




//exporting module as Object
module.exports = {
    getTalenters,
    getTalenterById,
    addTalenter,
    removeTalenter,
    updateTalenterName,
    userLogin,
    activateSignup,
    confirmationEmail,    
};