const pool = require('../db/db');
const bcrypt = require('bcryptjs');
const queries = require('./queries');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
var otpGenerator = require('otp-generator');
const {encode,decode} = require("../middlewares/crypt");
const nodemailerSendgrid = require('nodemailer-sendgrid');
const smtpTransport = require('nodemailer-smtp-transport');
const handlebars = require('handlebars');
const fs = require("fs")
const path = require("path")

const emailTemplateSource = fs.readFileSync(path.join(__dirname, "/template.hbs"), "utf8")
const emailTemplateSuccess = fs.readFileSync(path.join(__dirname, "/successful.hbs"), "utf8")

const mailgun = require("mailgun-js");

const template = handlebars.compile(emailTemplateSource);
const templateSuccess = handlebars.compile(emailTemplateSuccess);
  

  // SENDGRID Mail Template
  const transport = nodemailer.createTransport(
    nodemailerSendgrid({
         apiKey: process.env.SENDGRID_API_KEY
      })
    );

// Sending email with Nodemailer SMTP

const transporter = nodemailer.createTransport(smtpTransport({
    host: process.env.MAIL_HOST,
    secureConnection: false,
    tls: {
      rejectUnauthorized: false
    },
    port: 587,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
  }
}));


// To add minutes to the current time
function AddMinutesToDate(date, minutes) {
    return new Date(date.getTime() + minutes*60000);
  }

// GUID generators
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

//The VALID REFRESHTOKEN IS USED TO REFRESH MY-ACEESS-TOKEN THAT HAS BEEN LOGGED OUT AFTER SOME TIME
let refreshTokens = []  // used to initialize the RefreshTokens in an array

const headers = {
    "Content-Type": "application/json; charset=utf-8", 
    'Accept': 'application/json, text/plain',
    "cache-control": "no-cache", 
    "Access-Control-Allow-Origin": "*", 
    "Access-Control-Allow-Headers": "Origin, Content-Type, X-Auth-Token, Accept, Authorization, X-Request-With, Access-Control-Request-Method, Access-Control-Request-Headers",
    "Access-Control-Allow-Credentials" : "true",
    "Access-Control-Allow-Methods" : "GET, POST, DELETE, PUT, OPTIONS, TRACE, PATCH, CONNECT",  
    };

// Controller to get ALL Talent
const getTalenters = (req, res) => {    
        res.header(headers);
    // res.header('Access-Control-Allow-Headers',
    //     'Origin, X-Requested-With, Content-Type, Accept'
    //     );

    pool.query(queries.getTalenters, (error, results) => {
        // the callback functions
        if(error) throw error;

        
        res.status(200).json(results);
    });
    //console.log("geting talents list");
};

// Controller to Save New User and Hash password
const addTalenter = async (req, res) => {

    res.header(headers);

    const {email, password } = req.body;
    
    //Generate UnIQUEID
   
    const usocialid = uuidv4();
    const emailtoken = uuidv1();
    
    // HERE WE VALIDATE THE DATA BEFORE WE MAKE A USER
    //New method of using joi validation    
    const {error} = schemaRegister.validate(req.body);
    if(error) return res.status(400).send({ message:  error.details[0].message});
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
                return res.status(404).send({message: error});
            }

            //Generate OTP
            var otp = Math.random();
            otp = otp * 1000000;
            otp = parseInt(otp);

            //console.log(otp);
            //const otp = otpGenerator.generate(6, { digits: true, alphabets: false, upperCase: false, specialChars: false });
            //const otp = otpGenerator.generate(6, { alphabets: false, upperCase: false, specialChars: false });
            const now = new Date();
            const expiration_time = AddMinutesToDate(now,10);

            pool.query(queries.instanceOTP, [otp, expiration_time], (error, results) => {
                if (error) {
                    return res.status(404).send({message: 'Oops! Somehing went wrong!'});
                }                            
                
                const otp_instance = results.insertId;


                console.log('check' + otp_instance);

        //    const otp_instance = pool.query(queries.instanceOTP, [otp, expiration_time], (error, results) => {
        //         if (error) {
        //             return res.status(404).send({message: 'Oops! Somehing went wrong!'});
        //         }                            
        //         console.log(results.insertId);
        //         return id = results.insertId;                
        //     });

            console.log(otp);
            //Here we send the email two types
            //console.log(otp_instance);

            // Create details object containing the email and otp id
            var details = {
                "timestamp": now, 
                "check": email,
                "success": true,
                "message":"OTP sent to user",
                "otp_id": otp_instance
                }

            console.log(details);

            // Encrypt the details object
            const encoded = encode(JSON.stringify(details))

            console.log(encoded);

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
            console.log('Checking mailtoken : ' + otp)

            // return res.status(201).header('Access-Control-Allow-Headers',
            // 'Origin, X-Requested-With, Content-Type, Accept').json({
            //     message: `Check your email to activate your account:`,
            //     success: true
            // });
            
            // using handlebars template
            const htmlToSend = template({message: otp});

            const mailOptions = {                
                from: process.env.MAIL_SENDER,
                to: email,
                //subject: 'Talenthub Registration Email Activation',
                subject: 'Talenthub OTP - For Email Verification',
                html: htmlToSend
              }
              
                            
              // USING nodemailer SMTP Options
            transporter.sendMail(mailOptions, function(error, response) {
                if (error) {
                    console.log(`Sending Mail error: ${error}`)
                    return res.json({
                        message: `Check your inbox email to activate your account:`,
                        success: true //message: error.message
                    });
                } else {
                    console.log('Email sent: ' + response);

                    console.log("User was registered successfully!!")

                    res.header('Access-Control-Allow-Headers',
                    'Origin, X-Requested-With, Content-Type, Accept'
                    );

                    return res.status(201).header('Access-Control-Allow-Headers',
                    'Origin, X-Requested-With, Content-Type, Accept').json({
                        message: `Check your email to activate your account:`,
                        success: true,
                        Details: encoded
                    });
                }
              });


                             
            });
            
            
        });
    });
};


// Function to Compares dates (expiration time and current time in our case)
var dates = {
    convert:function(d) {
        // Converts the date in d to a date-object. The input can be:
        //   a date object: returned without modification
        //  an array      : Interpreted as [year,month,day]. NOTE: month is 0-11.
        //   a number     : Interpreted as number of milliseconds
        //                  since 1 Jan 1970 (a timestamp) 
        //   a string     : Any format supported by the javascript engine, like
        //                  "YYYY/MM/DD", "MM/DD/YYYY", "Jan 31 2009" etc.
        //  an object     : Interpreted as an object with year, month and date
        //                  attributes.  **NOTE** month is 0-11.
        return (
            d.constructor === Date ? d :
            d.constructor === Array ? new Date(d[0],d[1],d[2]) :
            d.constructor === Number ? new Date(d) :
            d.constructor === String ? new Date(d) :
            typeof d === "object" ? new Date(d.year,d.month,d.date) :
            NaN
        );
    },
    compare:function(a,b) {
        // Compare two dates (could be of any type supported by the convert
        // function above) and returns:
        //  -1 : if a < b
        //   0 : if a = b
        //   1 : if a > b
        // NaN : if a or b is an illegal date
        return (
            isFinite(a=this.convert(a).valueOf()) &&
            isFinite(b=this.convert(b).valueOf()) ?
            (a>b)-(a<b) :
            NaN
        );
    },
    inRange:function(d,start,end) {
        // Checks if date in d is between dates in start and end.
        // Returns a boolean or NaN:
        //    true  : if d is between start and end (inclusive)
        //    false : if d is before start or after end
        //    NaN   : if one or more of the dates is illegal.
       return (
            isFinite(d=this.convert(d).valueOf()) &&
            isFinite(start=this.convert(start).valueOf()) &&
            isFinite(end=this.convert(end).valueOf()) ?
            start <= d && d <= end :
            NaN
        );
    }
};


// controller to Verify OTP

const verifyOTP = async (req, res) => {
    try {
        
        var currentdate = new Date();

        const {verification_key, otp, check} = req.body;

        if(!otp){            
            return res.status(400).send({message: 'OTP not Provided', success: false})
          }

        let decoded;
        //Check if verification key is altered or not and store it in variable decoded after decryption
        try{
            decoded = await decode(verification_key)
        }
        catch(err) {
           // const response={"Status":"Failure", "Details":"Bad Request"}
            return res.status(400).send({message: 'Bad Request', success: false});
        }

        var obj= JSON.parse(decoded)
        const check_obj = obj.check;

        if(check_obj != check) {
            const response={"Status":"Failure", "message": "OTP was not sent to this particular email", success: false};        
            return res.status(400).send(response);
        }
        
    } catch (error) {
        return console.log(error);
    }
};


// Activate Account and Confirmation of Email

const activateAccount = async (req, res) => {

    res.header(headers);

    const { token } = req.params;

    if (token) {
        // Verify the token
        jwt.verify(token, process.env.EMAIL_SECRET, function(err, decodedToken) {
            if (err) {
                return res.status(400).json({message: "Incorrect or Expired Link "});
            }

            const { email } = decodedToken;

            pool.query(queries.checkActivateEmail, [email], (error, resultss) => {
                if(error) {
                    //throw error;
                    return res.status(404).send({
                        message: 'Confirmation token error, please contact the administrator',
                        success: false
                    });
                };

                // console.log(resultss);
        
                const noEntityFound = resultss.length < 1;
        
                if(noEntityFound) {
                    return res.status(404).send({message: "Invalid / Expired Activation Token"});
                }
        
                pool.query(queries.activateEmail, [email], (error, results) => {
        
                    if(error) {
                        //throw error;
                        return res.status(404).send({
                            message: 'Activation error, please contact the administrator',
                            success: false
                        });
                    };
                    res.status(201).json({
                        message: "Activated Successfully, Please Log in.",                
                        success: true
                    });

                    //Send successful Registration email

                    const url = `${process.env.TALHUBSAPI_URL}/login/`;

                    //checking email URL
                    console.log('Checking email URL: ' + url)
                    
                    // using handlebars template
                    const htmlToSend = templateSuccess({message: url});
        
                    const mailOptions = {
                        //from: "itsupport@lakinberg.com",
                        from: process.env.MAIL_SENDER,
                        to: email,
                        subject: 'Talenthub Successful Registration!',
                        html: htmlToSend
                      }
                      
                        //USING SENDGRID MAIL SENDING OPTIONS             
                                        
                      // USING nodemailer SMTP Options
                    transporter.sendMail(mailOptions, function(error, response) {
                        if (error) {
                            console.log(error);
                            return res.json({
                                error: error.message
                            });
                        } else {
                            console.log('Email sent: ' + response);
        
                            console.log("User was Activated successfully!!")
        
                            // return res.status(201).json({
                            //     message: `Email has been sent,kindly activate your account!:`,
                            //     success: true
                            // });
                        }
                      });
                });    
            });

        });


    } else {
        return res.status(404).json({
            message: "Something went wrong"
        })
    }

};


// Here controller for get Talenter by id
const getTalenterById = (req, res) => {
    res.header(headers);

    const id = parseInt(req.params.id);
    // Here we have the SQL Query, Parameters and Callback functions
    pool.query(queries.getTalenterById, [id], (error, results) => { 
        console.log('Test Checking here');             
        if(error) throw error;
        res.status(200).json(results);
    });
};


//Refresh User Token
const userRefresh = (req, res) => {
    // Reading token Value from header
    const authHeader = req.headers['authorization'];

    //console.log('Checking Header ' + authHeader);
    // this is to check null value token
    if(typeof authHeader !== 'undefined') {

      const bearer = authHeader.split(' ');
      const refreshToken = bearer[1];
        
      console.log(refreshToken);
  
      if(refreshToken == null) return res.sendStatus(401);
  
      if(!refreshTokens.includes(refreshToken)) return res.status(403).json({
          message: 'Your Session is not validd!',
          statusCode: '403'
      });
      
      jwt.verify(refreshToken, process.env.REFRESH_SECRET, (err, authuser) => {
  
          //if (err) return res.sendStatus(403);
          if (err) return res.send(err);
          
          const accessToken = generateAccessToken({            
              email: authuser.email,
              usocialid: authuser.usocialid
          })
          res.json({token: accessToken})
      });

    } else {
       // Forbidden
        res.status(401).send({
        message: "Unauthorised",
        statusCode: "401"
        });
    }   
}

// LOGOUT & DE-AUTHENTICATE OUR REFRESHTOKEN
const userLogout = (req, res) => {
    // Reading token Value from header
    const authHeader = req.headers['authorization'];

    jwt.sign(authHeader, "", { maxAge: 1 } , (logout, err) => {
        if (logout) {
        res.send({msg : 'You have been Logged Out' });
        } else {
        res.send({msg:'Error'});
    }
    });

    // if(typeof authHeader !== 'undefined') {
    //     const bearer = authHeader.split(' ');
    //     const tokenlogout = bearer[1];

    //     refreshTokens = refreshTokens.filter(token => token !== tokenlogout )
    //     //refreshTokens = refreshTokens.filter(token => token !== req.body.token )    
    //     return res.status(204).json({
    //         message: 'Session Logout!',
    //         statusCode: '204'
    //     });

    // } else {
    //     refreshTokens = refreshTokens.filter(token => token !== null )
    //     return res.status(201).json({
    //         message: 'Session Logout!',
    //         statusCode: '401'
    //     });

    // }    
} 
// const userLogout = (req, res) => {    
//     refreshTokens = refreshTokens.filter(token => token !== req.body.token )
//     return res.status(204).json({
//         message: 'Session Logout!',
//         statusCode: '204'
//     });
// } 

// Delete Talenter / User by id
const removeTalenter = (req, res) => {
    res.header(headers);

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
    res.header(headers);

    const id = parseInt(req.params.id);
    const { fullname } = req.body;

    //Firstly, to update a Student/User fullname, that student must exist, so find entities by id then update
    pool.query(queries.getTalenterById, [id], (error, results) => {
        if (error) throw error;

        const noEntityFound = results.length < 1;
        if(noEntityFound) {
            return res.status(404).send({ message: "No User Details Found"});
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
    res.header(headers);

    const { email } = req.body;    

    const {error} = schemaLogin.validate(req.body);
    if(error) return res.status(400).send({message: error.details[0].message});
    
    // Checking if the user email exist
    pool.query(queries.getUserLogin, [email.toLowerCase()], (error, results) => {
        if(error) {
            throw error;
            return res.status(404).send({message: error})
        } 

        //console.log(results);
        console.log(results.length);

        //noUserFound = results[0].email        
        //const noUserFound = !results.length;
        const noUserFound = results.length < 1;
        
        //console.log(noUserFound);
        if(noUserFound) {
            return res.status(404).send({
                message: "Invaild ==>> Email Or Password!",
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
            message: 'Email or Password is Invalid!',
            success: false
         });

         // CREATE AND ASSIGN A TOKEN JWT IF LOGIN SUCCESSFUL
        const authuser = {
            email: results[0].email,
            usocialid: results[0].usocialid
         }
        
         // CREATE AND ASSIGN A TOKEN JWT IF LOGIN SUCCESSFUL
         const accessToken =  generateAccessToken(authuser);
        //  const token = jwt.sign(authuser, 
        //  process.env.TOKEN_SECRET, {expiresIn: '1h'}
        //  );

         const refreshToken = jwt.sign(authuser, process.env.REFRESH_SECRET);

         refreshTokens.push(refreshToken);

         //UPDATE LAST LOGIN
         pool.query(queries.updateLastLogin, [results[0].usocialid]);

         //console.log(accessToken);
         const setHeadAuth = `Bearer ${refreshToken}`;
        //res.header('access-token',token).send(token); // Here is the identifier we add along
        //Hidding the token in the header
        res.status(201).header({'my-access-token': accessToken, 'my-refresh-token': refreshToken, 'authorization': setHeadAuth }).json({
        //res.status(201).json({
            message: "Login Successful Loading dashboard... ",
            accessToken,
            refreshToken,
            success: true           
        })

    });

};

const userSecretData = async (req, res) => {
    console.log('Loading secret data...');
    res.status(200).json({
        message: 'Loading secret message data',
        success: true
    });
}

// Function generateAccess Token
function generateAccessToken (authuser) {

    return jwt.sign(authuser, process.env.TOKEN_SECRET, {expiresIn: '15m'});

}


//exporting module as Object
module.exports = {
    getTalenters,
    getTalenterById,
    addTalenter,
    removeTalenter,
    updateTalenterName,
    userLogin,    
    activateAccount,
    userLogout,
    userRefresh,
    userSecretData,
    verifyOTP
};