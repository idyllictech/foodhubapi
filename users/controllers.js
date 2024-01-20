const pool = require('../db/db');
const bcrypt = require('bcryptjs');
const queries = require('./queries');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');
const {encode,decode} = require("../middlewares/crypt");
const nodemailerSendgrid = require('nodemailer-sendgrid');
const smtpTransport = require('nodemailer-smtp-transport');
const handlebars = require('handlebars');
const fs = require("fs")
const path = require("path")

const emailTemplateSource = fs.readFileSync(path.join(__dirname, "/template.hbs"), "utf8")
const emailTemplateSuccess = fs.readFileSync(path.join(__dirname, "/successful.hbs"), "utf8")
const emailTemplatePasswordReset = fs.readFileSync(path.join(__dirname, "/passwordreset.hbs"), "utf8")

const mailgun = require("mailgun-js");

const template = handlebars.compile(emailTemplateSource);
const templateSuccess = handlebars.compile(emailTemplateSuccess);
const templatePasswordReset = handlebars.compile(emailTemplatePasswordReset);
  

  // SENDGRID Mail Template
  const transport = nodemailer.createTransport(
    nodemailerSendgrid({
         apiKey: process.env.SENDGRID_API_KEY
      })
    );


// Sending email with Nodemailer SMTP

// const transporter = nodemailer.createTransport({
//     host: process.env.MAIL_HOST,
//     port: 587,
//     secureConnection: false,
//     secure: false,
//     auth: {
//         type: "login",
//         user: process.env.MAIL_USER,
//         pass: process.env.MAIL_PASS,
//   },
//     tls: {
//       rejectUnauthorized: false
//     },
//     ignoreTLS: true    
// });

const transporter = nodemailer.createTransport(smtpTransport({
    host: process.env.MAIL_HOST,
    port: 25,
    secureConnection: false,
    secure: false,
    auth: {
        type: "login",
        user: process.env.MAIL_SENDER,
        pass: process.env.MAIL_PASS,
  },
    tls: {
      rejectUnauthorized: false
    },
    ignoreTLS: true    
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

//RESET PASSWORD VALIDATION 
const schemaResetPassword = Joi.object({    
    email: Joi.string()
            .min(8)
            .required()
            .email({ minDomainSegments: 2})
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
    "Access-Control-Allow-Credentials" : "true",
    "Access-Control-Max-Age" : "1800",
    "Access-Control-Allow-Headers": "Origin, Content-Type, X-Auth-Token, Accept, Authorization, X-Request-With, Access-Control-Request-Method, Access-Control-Request-Headers",    
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
    if(error) return res.send({ message:  error.details[0].message, success: false});
    //res.send(error.details[0].message);

     //Hash and Salts the password
     const salt = await bcrypt.genSalt(10);
     const hashedPassword = await bcrypt.hash(req.body.password, salt);
    // Check if email exists
    pool.query(queries.checkEmailExists, [email], (error, results) => {
        if(results.length) {

            console.log(results.length);
            //Note Always use return if you want to stop this function if the condition is meet
            return res.json({
                message: 'Email already in use!',
                success: false
        });     
    };
       

        //add student to db
        pool.query(queries.addTalenter,
            [usocialid, email, hashedPassword, emailtoken], 
            (error, results) => {
            if (error) {
                //throw error;
                return res.send({message: 'Something went wrong!', success: false});
            }

            //Generate OTP
            //var otp = Math.random();
            var otp = Math.floor(100000 + Math.random() * 900000);
            // otp = otp * 1000000;
            otp = parseInt(otp);

            //console.log(otp);
            //const otp = otpGenerator.generate(6, { digits: true, alphabets: false, upperCase: false, specialChars: false });
            //const otp = otpGenerator.generate(6, { alphabets: false, upperCase: false, specialChars: false });
            const now = new Date();

          // const now = new Date.UTC(year, month, day, hour + 1, minute, second);

           console.log(`New Generated time`, now);

            const expiration_time = AddMinutesToDate(now,10);

            pool.query(queries.instanceOTP, [otp, expiration_time], async (error, results) => {
                if (error) {
                    return res.send({message: 'Oops! Somehing went wrong!', success: false});
                }                            
                
                const otp_instance = results.insertId;


                console.log('check ' + otp_instance);

        //    const otp_instance = pool.query(queries.instanceOTP, [otp, expiration_time], (error, results) => {
        //         if (error) {
        //             return res.send({message: 'Oops! Somehing went wrong!'});
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

            //console.log(details);

            // Encrypt the details object
         
            const encoded = await encode(JSON.stringify(details));
           
                
            // console.log(encoded);
                
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

            //checking email URL befre but now OTP
            console.log('Checking mailtoken : ' + otp)

                    
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
                   // console.log(`Sending Mail error: ${error}`)
                    return res.json({
                        message: `An OTP has been sent to your email. Continue to Activate:`,
                        success: true,
                        Details: encoded,
                        checkEmail: email
                    });
                    
                } else {
                    console.log('Email sent: ' + response);

                    console.log("User was registered successfully!!")

                    return res.status(201).header('Access-Control-Allow-Headers',
                    'Origin, X-Requested-With, Content-Type, Accept').json({
                        message: `An OTP has been sent to your email. Continue to Activate:`,
                        success: true,
                        Details: encoded,
                        checkEmail: email
                    });
                }
              });        
            });
            
            
        });
    });
};


// RESEND OTP
const resendOTP = async (req, res) => {

    res.header(headers);

    const { email } = req.body;

    if(typeof email !== 'undefined') {       

            //Generate OTP
            //var otp = Math.random();
            var otp = Math.floor(100000 + Math.random() * 900000);
            // otp = otp * 1000000;
            otp = parseInt(otp);

            //console.log(otp);
            //const otp = otpGenerator.generate(6, { digits: true, alphabets: false, upperCase: false, specialChars: false });
            //const otp = otpGenerator.generate(6, { alphabets: false, upperCase: false, specialChars: false });
           const now = new Date();

        //    const now = new Date.UTC(year, month, day, hour + 1, minute, second);
            console.log(`Checking Email: `, req.body.email);

           console.log(`New Generated time: `, now);

            const expiration_time = AddMinutesToDate(now,10);

            pool.query(queries.instanceOTP, [otp, expiration_time], async (error, results) => {
                if (error) {
                    return res.send({message: 'Oops! Somehing went wrong: ' + error, success: false});
                }                            
                
                const otp_instance = results.insertId;


                console.log('check ' + otp_instance);

        
            console.log(`Resent OTP: `, otp);
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

            // Encrypt the details object
         
            const encoded = await encode(JSON.stringify(details));
           
                
            // console.log(encoded);
                
            //1. async email
            const emailToken = jwt.sign(
                {
                    email: email,
                },
                process.env.EMAIL_SECRET,
                {
                    expiresIn: '20m',
                });


            //const url = `${process.env.TALHUBSAPI_URL}/confirmation/${emailToken}`;

            //checking email URL befre but now OTP
            console.log('Checking mailtoken : ' + otp)

                    
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
                   // console.log(`Sending Mail error: ${error}`)
                    return res.json({
                        message: `An OTP has been resent to your email. Continue to Activate:`,
                        success: true,
                        Details: encoded,
                        checkEmail: email
                    });
                    console.log(`After JSON Sending Mail error: ${error}`);
                } else {
                    console.log('Email sent: ' + response);

                    console.log("OTP was Resent successfully!!")

                    res.header('Access-Control-Allow-Headers',
                    'Origin, X-Requested-With, Content-Type, Accept'
                    );

                    return res.status(201).header('Access-Control-Allow-Headers',
                    'Origin, X-Requested-With, Content-Type, Accept').json({
                        message: `An OTP has been resent to your email. Continue to Activate:`,
                        success: true,
                        Details: encoded,
                        checkEmail: email
                    });
                }
              });
                             
            });

        } else {
            // Forbidden
             res.send({
             message: "Unauthorised Error!",
             statusCode: "401",
             success: false,
            });
    } 

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
}

// controller to Verify OTP
const verifyOTP = async (req, res) => {
        
    //try {
        res.header(headers);
                
        var currentdate = new Date();

        const {verification_key, otp, check} = req.body;

        console.log('Checking body details: ', req.body );

        if(!verification_key){
            const response={"message":"Verification Key not provided", success: false}
            return res.json(response) 
          }

        if(!otp) {            
            return res.json({message: 'OTP not Provided', success: false})
          }

        if(!check){
            const response={"message":"Check not Provided", success: false}
            return res.json(response) 
        }

        let decoded;
        //Check if verification key is altered or not and store it in variable decoded after decryption
        try {
            decoded = await decode(verification_key)
        }
        catch(err) {
           // const response={"Status":"Failure", "Details":"Bad Request"}
            return res.json({message: 'Bad Requests', success: false});
        }

        var obj= JSON.parse(decoded)
        const check_obj = obj.check;

        if(check_obj != check) {
            const response={"success":"false", "message": "OTP was not sent to this particular email", success: false};        
            return res.json(response);
        }
        
        console.log('Check Instance decode OTP id: ' + obj.otp_id);

        // const otp_instance= await OTP.findOne({where:{id: obj.otp_id}})
        pool.query(queries.findInstancteOTPID, [obj.otp_id], (error, results) => {
            if (error) {
                //throw error
                return res.json({message: 'Oops! Something went wrong', succes: false});
            }

           // console.log(results);

            //Check if OTP is available in the DB
            if (results !==null) {
                
                //Check if OTP is already used or not --results[0].email  
                if (results[0].verified !== 1) {
                    //return res.send({message: 'Not Yet Used'})

                    console.log('currentdate: ' + currentdate);
                    console.log('Saved expiration date: ' + results[0].expiration_time);
                    //Check if OTP is expired or not
                    if (dates.compare(results[0].expiration_time, currentdate)==1){

                        //return res.send({message: 'Not Yet Expired'})

                       //Check if OTP is equal to the OTP in the DB
                        if(otp === results[0].otp){
                            // Mark OTP as verified or used
                            //results[0].verified == 1

                             // Update The OTP as True and Activate the Account
                              //otp_instance.save()

                            const verifiedid = results[0].id;
                            const verifiedEmail = obj.check;
                            //pool.query(queries.activateOTP, queries.activateUserWithOTP, [verifiedid, verifiedEmail], (error, results) => {
                            pool.query(`
                            UPDATE otp SET verified = 1 WHERE id = ?; 
                            UPDATE thub_users SET status= 1, email_verified_at = now() WHERE email = ? and status =0;
                            INSERT IGNORE INTO hub_profile (firstname, lastname, gender, date_of_birth, email, status) VALUES (' ',' ',' ',' ', ? , 0)`, 
                            [verifiedid, verifiedEmail,verifiedEmail], (error, results) => {
                                if (error) {
                                    return res.json({message: 'All we know is something went wrong', success: false});
                                }



                                //Send Successful OTP Registration email

                                    const url = `${process.env.TALHUBSAPI_URL}/login/`;

                                    //checking email URL
                                    console.log('Checking email URL: ' + url)
                                    
                                    // using handlebars template
                                    const htmlToSend = templateSuccess({message: url});
                        
                                    const mailOptions = {
                                        //from: "itsupport@lakinberg.com",
                                        from: process.env.MAIL_SENDER,
                                        to: verifiedEmail,
                                        subject: 'TalentHub Successful Account Activation!',
                                        html: htmlToSend
                                    }
                                    
                                        //USING SENDGRID MAIL SENDING OPTIONS             
                                                        
                                    // USING nodemailer SMTP Options
                                    transporter.sendMail(mailOptions, function(error, response) {
                                        if (error) {
                                            console.log('User OTP was Activated successfully!! & Mail SMTP sending error' + error);
                                         
                                            const response={success: true, "message":"OTP Activated Successfully, Please Log in."}
                                            return res.status(200).json(response)
                                            //return res.json({error: error.message});
                                        } else {
                                            console.log('Email sent: ' + response);
                        
                                            console.log("User OTP was Activated successfully!!")                        
                                            
                                        }
                                    });                                

                                const response={success: true, "message":"Activated Successfully, Continue Login."}
                                return res.status(200).json(response)

                            });

                            
                        }
                        else{
                            const response={success: false, "message":"OTP NOT Matched"}
                            return res.json(response) 
                        }   

                     } else {
                        const response={success: false, "message":"OTP Expired"}
                        return res.json(response) 
                     }


                } else {

                    const response={success: false, "message":"OTP Already Used"}
                    return res.json(response)

                }

            } else {

                // null in DB response
                const response={success: false, "message":"Bad Request"}
                return res.json(response)
            }


        })

        
    // } catch (error) {
    //     return console.log(error);
    // }
};


// Activate Account and Confirmation of Email

const activateAccount = async (req, res) => {

    res.header(headers);

    const { token } = req.params;

    if (token) {
        // Verify the token
        jwt.verify(token, process.env.EMAIL_SECRET, function(err, decodedToken) {
            if (err) {
                return res.json({message: "Incorrect or Expired Link "});
            }

            const { email } = decodedToken;

            pool.query(queries.checkActivateEmail, [email], (error, resultss) => {
                if(error) {
                    //throw error;
                    return res.send({
                        message: 'Confirmation token error, please contact the administrator',
                        success: false
                    });
                };

                // console.log(resultss);
        
                const noEntityFound = resultss.length < 1;
        
                if(noEntityFound) {
                    return res.send({message: "Invalid / Expired Activation Token"});
                }
        
                pool.query(queries.activateEmail, [email], (error, results) => {
        
                    if(error) {
                        //throw error;
                        return res.send({
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
        return res.json({
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
        res.send({message : 'Session Logged out!' });
        } else {
        res.send({message:'Session Logged out!!'});
    }
    });

     
} 


// Delete Talenter / User by id
const removeTalenter = (req, res) => {
    res.header(headers);

    const id = parseInt(req.params.id);

    pool.query(queries.getTalenterById, [id], (error, results) => {
        if (error) throw error;

        const noStudentFound = results.length < 1;
        if (noStudentFound) {
            return res.send("Talenter does not exist in the database.");
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
            return res.send({ message: "No User Details Found"});
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

    var comparison = '';
    var comparison2 = '';

    const { email } = req.body;    

    console.log(email);

    const {error} = schemaLogin.validate(req.body);
    if(error) return res.send({message: error.details[0].message, success: false});
    
    // Checking if the user email exist
    pool.query(queries.getUserLogin, [email.toLowerCase()], async (error, results) => {
        if(error) {
            throw error;
            return res.send({message: error})
        } 

        //console.log(results);
        console.log(results.length);

        //noUserFound = results[0].email        
        //const noUserFound = !results.length;
        const noUserFound = results.length < 1;
        
        //console.log(noUserFound);
        if(noUserFound) {
            return res.send({
                message: "Email Or Password is Invalid!",
                success: false
            });
        };

        const verifyemail = results[0].email;
        const profileupdate = results[0].profileupdate;
        const status = results[0].status;
        
        // You can also get a field password as follow 
        // results[0]['password']  or results[0].password

        // Comparison of Password & Pasword Reset
        comparison = await bcrypt.compareSync(req.body.password, results[0]['password']);
        comparison2 = await bcrypt.compareSync(req.body.password, results[0]['passwordreset']);
        
        if (comparison) {
                    //Here is for Valid Passowrd
                // CREATE AND ASSIGN A TOKEN JWT IF LOGIN SUCCESSFUL
                const authuser = {
                    email: results[0].email,
                    usocialid: results[0].usocialid
                }
                
                // CREATE AND ASSIGN A TOKEN JWT IF LOGIN SUCCESSFUL
                const accessToken =  generateAccessToken(authuser);
              
                const refreshToken = jwt.sign(authuser, process.env.REFRESH_SECRET);

                refreshTokens.push(refreshToken);

                //UPDATE LAST LOGIN
                pool.query(queries.updateLastLogin, [results[0].usocialid]);

                //console.log(accessToken);
                const setHeadAuth = `Bearer ${refreshToken}`;
                //res.header('access-token',token).send(token); // Here is the identifier we add along

                //Hidding the token in the header
                if (status == 1) {
                    return res.status(200).header({'my-access-token': accessToken, 'my-refresh-token': refreshToken, 'authorization': setHeadAuth }).json({
                        //res.status(201).json({
                            message: "Successful!",
                            accessToken,
                            refreshToken,
                            verifyemail,
                            profileupdate,
                            status,
                            success: true
                        })
                } else if (status == 0) {

                    //return initiate(verifyemail);
                    //Generate OTP            
                    var otp = Math.floor(100000 + Math.random() * 900000);
                    // otp = otp * 1000000;
                    otp = parseInt(otp);           
                    const now = new Date();
        
                    console.log(`New Generated time`, now);
        
                    const expiration_time = AddMinutesToDate(now,10);
        
                    pool.query(queries.instanceOTP, [otp, expiration_time], async (error, results) => {
                        if (error) {
                            return res.send({message: 'Oops! Somehing went wrong!', success: false});
                        }                            
                        
                        const otp_instance = results.insertId;
        
        
                        console.log('check ' + otp_instance);       
        
                    console.log(otp);
                    //Here we send the email two types
                    // Create details object containing the email and otp id
                    var details = {
                        "timestamp": now, 
                        "check": verifyemail,
                        "success": true,
                        "message":"OTP sent to user",
                        "otp_id": otp_instance
                        }
        
                    // Encrypt the details object         
                    const encoded = await encode(JSON.stringify(details));
                    
                        
                    // console.log(encoded);
                        
                    //1. async email
                    const emailToken = jwt.sign(
                        {
                            email: verifyemail,
                        },
                        process.env.EMAIL_SECRET,
                        {
                            expiresIn: '20m',
                        });
        
        
                    const url = `${process.env.TALHUBSAPI_URL}/confirmation/${emailToken}`;
        
                    //checking email URL befre but now OTP
                    console.log('Checking mailtoken : ' + otp)
        
                            
                    // using handlebars template
                    const htmlToSend = template({message: otp});
        
                    const mailOptions = {                
                        from: process.env.MAIL_SENDER,
                        to: verifyemail,
                        //subject: 'Talenthub Registration Email Activation',
                        subject: 'Talenthub OTP - For Email Verification',
                        html: htmlToSend
                    }              
                                    
                    // USING nodemailer SMTP Options
                    transporter.sendMail(mailOptions, function(error, response) {
                        if (error) {
                            // console.log(`Sending Mail error: ${error}`)
                            console.log(`After JSON Sending Mail error: ${error}`);

                            return res.json({
                                message: `An OTP has been sent to your email. Continue to Activate:`,
                                success: true,
                                profileupdate,
                                status,
                                Details: encoded,
                                checkEmail: verifyemail,
                                
                            });
                            
                        } else {
                            console.log('Email sent Successfully: ');
        
                           
        
                            return res.status(201).header('Access-Control-Allow-Headers',
                            'Origin, X-Requested-With, Content-Type, Accept').json({
                                message: `An OTP has been sent to your email. Continue to Activate:`,
                                success: true,
                                Details: encoded,
                                checkEmail: verifyemail,
                                profileupdate,
                                status,
                            });
                        }
                    });
                                    
                    });
                };
         // END COmparson Here for comparison
        } else if (comparison2) {
            // Here is to forced Reset Password
            return res.status(200).json({
                message: 'You are required to change your password.',
                success: true,
                verifyemail,
                status: 3 ,
                profileupdate: 0 
			});

            // END COmparison2 Here for comparison2
        } else {

            return res.json({
                message: 'Password entered is incorrect!',
                success: false
             });
        }

    });

};

//Controller for CHANGE RESET PASSWORD
const changePassword = async (req, res) => {
    
    res.header(headers);
    
    const { email, password } = req.body;

    console.log(`Checking email: `, email);

    //Hash and Salts the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    pool.query(queries.updatepassword, [hashedPassword, req.body.email], (error, result) => {
        if (error) {
            console.log(`Update password error: `, error);
            return res.send({message: 'Oops!, Something happens', succes: false})
        }
        
        console.log(result);

        let resu = result.affectedRows;

        if (resu > 0 ) {

        
        console.log(req.body.email);
        
        //return false;

        const checkemail = req.body.email;

        pool.query(queries.getUserLogin, [checkemail.toLowerCase()], async (error, results) => {

            if (error) {
                console.log(`Login error: `, error);
                return res.send({message: 'Oops!, Something went wrong', succes: false});
            }

            console.log(results);

            const verifyemail = results[0].email;
            const profileupdate = results[0].profileupdate;
            const status = results[0].status;

            const authuser = {
                email: results[0].email,
                usocialid: results[0].usocialid
            }
            
            // CREATE AND ASSIGN A TOKEN JWT IF LOGIN SUCCESSFUL
            const accessToken =  generateAccessToken(authuser);
          
            const refreshToken = jwt.sign(authuser, process.env.REFRESH_SECRET);

            refreshTokens.push(refreshToken);

            //UPDATE LAST LOGIN
            pool.query(queries.updateLastLogin, [results[0].usocialid]);

            //console.log(accessToken);
            const setHeadAuth = `Bearer ${refreshToken}`;


            //Hidding the token in the header
            if (status == 1) {
                return res.status(200).header({'my-access-token': accessToken, 'my-refresh-token': refreshToken, 'authorization': setHeadAuth }).json({
                    //res.status(201).json({
                        message: "Successful!",
                        accessToken,
                        refreshToken,
                        verifyemail,
                        profileupdate,
                        status,
                        success: true
                    })
            } else if (status == 0) {

                //return initiate(verifyemail);
                //Generate OTP            
                var otp = Math.floor(100000 + Math.random() * 900000);
                // otp = otp * 1000000;
                otp = parseInt(otp);           
                const now = new Date();
    
                console.log(`New Generated time`, now);
    
                const expiration_time = AddMinutesToDate(now,10);
    
                pool.query(queries.instanceOTP, [otp, expiration_time], async (error, results) => {
                    if (error) {
                        return res.send({message: 'Oops! Somehing went wrong!'});
                    }                            
                    
                    const otp_instance = results.insertId;
    
    
                    console.log('check ' + otp_instance);       
    
                console.log(otp);
                //Here we send the email two types
                // Create details object containing the email and otp id
                var details = {
                    "timestamp": now, 
                    "check": verifyemail,
                    "success": true,
                    "message":"OTP sent to user",
                    "otp_id": otp_instance
                    }
    
                // Encrypt the details object         
                const encoded = await encode(JSON.stringify(details));
                
                    
                // console.log(encoded);
                    
                //1. async email
                const emailToken = jwt.sign(
                    {
                        email: verifyemail,
                    },
                    process.env.EMAIL_SECRET,
                    {
                        expiresIn: '20m',
                    });
    
    
                const url = `${process.env.TALHUBSAPI_URL}/confirmation/${emailToken}`;
    
                //checking email URL befre but now OTP
                console.log('Checking mailtoken : ' + otp)
    
                        
                // using handlebars template
                const htmlToSend = template({message: otp});
    
                const mailOptions = {                
                    from: process.env.MAIL_SENDER,
                    to: verifyemail,
                    //subject: 'Talenthub Registration Email Activation',
                    subject: 'Talenthub OTP - For Email Verification',
                    html: htmlToSend
                }              
                                
                // USING nodemailer SMTP Options
                transporter.sendMail(mailOptions, function(error, response) {
                    if (error) {
                        // console.log(`Sending Mail error: ${error}`)
                        return res.json({
                            message: `An OTP has been sent to your email. Continue to Activate:`,
                            success: true,
                            profileupdate,
                            status,
                            Details: encoded,
                            checkEmail: verifyemail,
                            
                        });
                        console.log(`After JSON Sending Mail error: ${error}`);
                    } else {
                        console.log('Email sent: ' + response);
    
                        
                        res.header('Access-Control-Allow-Headers',
                        'Origin, X-Requested-With, Content-Type, Accept'
                        );
    
                        return res.status(201).header('Access-Control-Allow-Headers',
                        'Origin, X-Requested-With, Content-Type, Accept').json({
                            message: `An OTP has been sent to your email. Continue to Activate:`,
                            success: true,
                            Details: encoded,
                            checkEmail: verifyemail,
                            profileupdate,
                            status,
                        });
                    }
                });
                                
                });
            };

        });

    } else {

        return res.send({message: 'Oops!, Something happens! Please Try again!', succes: false});
    }
    });


}

// Controller for RESET PASSWORD
const resetPassword = async (req, res) => {

    res.header(headers);

    const { email } = req.body;

    console.log(email);

    const {error} = schemaResetPassword.validate(req.body);

    if(error) return res.send({message: error.details[0].message, succes: false});

    pool.query(queries.getUserLogin, [email.toLowerCase()], async (error, results) => {

        if(error) {
            // throw error; 
            return res.send({message: error, succes: false});
        }

        console.log(results.length);

        //noUserFound = results[0].email        
        //const noUserFound = !results.length;
        const noUserFound = results.length < 1;
        
        //console.log(noUserFound);
        if(noUserFound) {
            return res.send({
                message: "Email address not found in our records.!",
                success: false
            });
        };


        const verifyemail = results[0].email;

        // Temporary Password Generated
        const temppassword = otpGenerator.generate(8, { digits: true, alphabets: false, upperCase: false, specialChars: false });

        // console.log(`Generated Newly Password: `, temppassword);
        //Hash and Salts the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(temppassword, salt);

        pool.query(queries.updateResetPassword, [hashedPassword, verifyemail], (error, resultt) => {

            if (error) {
                // throw error
                console.log(`Update gen error: `,error);
                return res.send({message: 'Oops! Something went wrong', succes: false});                
            }

            //console.log(resultt);


            let updresult = resultt.affectedRows;

            console.log(`Checking affected Rows: `,updresult)

            if (updresult > 0) {

                // using handlebars template
                const htmlToSend = templatePasswordReset({message: temppassword});
                        
                const mailOptions = {
                    //from: "itsupport@lakinberg.com",
                    from: process.env.MAIL_SENDER,
                    to: verifyemail,
                    subject: 'Password Reset - TalentHub Account !',
                    html: htmlToSend
                }
                
                //USING SENDGRID MAIL SENDING OPTIONS             
                                    
                // USING nodemailer SMTP Options
                transporter.sendMail(mailOptions, function(error, response) {
                    if (error) {
                        console.log('Password Reset - TalentHub  & Mail SMTP sending error ' + error);                   
                       
                        return res.status(200).json({
                            success: true, 
                            message: "Password Reset, Please Check your email.",
                            status: 2
                    })
                        //return res.json({error: error.message});
                    }  else {

                        console.log('Email sent Sucessful: ');                      
                     //res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
 
                     return res.json({
                        success: true, 
                        message: "Password Reset, Please Check your email.!!!",
                        status: 2
                        });


                    }
                });                          

                //res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

            return res.status(200).json({
                    success: true, 
                    message: "Password Reset, Please Check your email.!",
                    status: 2
                 });

            } else {

                return res.send({message: 'Email address not found.', succes: false, status: 1}); 
            }

        });




    });


}

// USER SECRET DATA
const userSecretData = async (req, res) => {
    console.log('Loading secret data...');
    res.status(200).json({
        message: 'Loading secret message data',
        success: true
    });
}


// LOAD ALL OTP
const loadOTP = async (req, res) => {
  pool.query(queries.loadALLOTP, (error, results) => {
    // the callback functions
    if(error) throw error;
    
    res.status(200).json(results);
});
}


// LOAD LAST TEN OTP
const loadLastOTP = async (req, res) => {
  pool.query(queries.loadlasttenOTP, (error, results) => {
    // the callback functions
    if(error) throw error;
    
    res.status(200).json(results);
});
}


// Delete DELETE OTP
const deleteOTP = (req, res) => {
    res.header(headers);

    const id = parseInt(req.params.id);

    pool.query(queries.getOTPByID, [id], (error, results) => {
        if (error) throw error;

        const noOTPFound = results.length < 1;
        if (noOTPFound) {
            return res.send("OTP does not exist in the database.");
        };
        
        pool.query(queries.deleteOTP, [id], (error, results) => {
            if (error) throw error;

            res.status(201).json({
                message: "OTP removed Succesfully",
                success: true
            });
        });        
        
    });

};


// MANAGE USER PROFILE

const getPreprofileBYEmail = async (req,res) => {

    res.header(headers);
    const email = req.body.email;
    //const email = 'digimyxt@gmail.com';

    console.log('Profile Here....');

    console.log( req.body.email );
   

    
    //const email = req.params.email;

    pool.query(queries.checkProfile, [email], (error, results) => {

        console.log('Profile Here 2....');
        console.log(email);

        if (error) {
            console.log(`${email}` + error);
            throw error
        }

        console.log(results);
        console.log('Profile Here 3....');

        res.status(200).json({ message: results});
    });

};


function initiate (email) {
            
    //Generate OTP            
            var otp = Math.floor(100000 + Math.random() * 900000);
            // otp = otp * 1000000;
            otp = parseInt(otp);           
            const now = new Date();

            console.log(`New Generated time`, now);

            const expiration_time = AddMinutesToDate(now,10);

            pool.query(queries.instanceOTP, [otp, expiration_time], async (error, results) => {
                if (error) {
                    return res.send({message: 'Oops! Somehing went wrong!'});
                }                            
                
                const otp_instance = results.insertId;


                console.log('check ' + otp_instance);       

            console.log(otp);
            //Here we send the email two types
            // Create details object containing the email and otp id
            var details = {
                "timestamp": now, 
                "check": email,
                "success": true,
                "message":"OTP sent to user",
                "otp_id": otp_instance
                }

            // Encrypt the details object         
            const encoded = await encode(JSON.stringify(details));
           
                
            // console.log(encoded);
                
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

            //checking email URL befre but now OTP
            console.log('Checking mailtoken : ' + otp)

                    
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
                   // console.log(`Sending Mail error: ${error}`)
                    return res.json({
                        message: `An OTP has been sent to your email. Continue to Activate:`,
                        success: true,
                        Details: encoded,
                        checkEmail: email
                    });
                    console.log(`After JSON Sending Mail error: ${error}`);
                } else {
                    console.log('Email sent: ' + response);

                    
                    res.header('Access-Control-Allow-Headers',
                    'Origin, X-Requested-With, Content-Type, Accept'
                    );

                    return res.status(201).header('Access-Control-Allow-Headers',
                    'Origin, X-Requested-With, Content-Type, Accept').json({
                        message: `An OTP has been sent to your email. Continue to Activate:`,
                        success: true,
                        Details: encoded,
                        checkEmail: email
                    });
                }
              });
                             
            });
};

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
    resendOTP,
    verifyOTP,
    loadOTP,
    loadLastOTP,
    deleteOTP,
    getPreprofileBYEmail,
    resetPassword,
    changePassword
};