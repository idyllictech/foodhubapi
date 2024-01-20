const routes = require('express').Router();
const controller = require('./controllers');
const jwt = require('jsonwebtoken');


//Default Route using controller
routes.post("/", controller.getTalenters);

// LOGGED OUT
routes.post('/auth/logout', controller.userLogout);

//Refresh UserToken 
routes.get('/auth/refresh', controller.userRefresh);

//Add New Talent / User to the list
routes.post('/users', controller.addTalenter);

//GEt Single user by id
routes.get('/:id', controller.getTalenterById);

//POST To LOGIN USER
routes.post('/auth', controller.userLogin);

// UPDATE PASSWORD
routes.post('/updatepassword', controller.changePassword);

// RESET PASSWORD
routes.post('/resetpassword', controller.resetPassword);

//GET SECRET DATA
routes.get('/users/secret', controller.userSecretData);


// Email Verification & Activation
routes.get('/confirmation/:token', controller.activateAccount);

//RESEND OTP
routes.post('/resend/otp', controller.resendOTP);

// Verify OTP
routes.post('/verify/otp', controller.verifyOTP);

//Remove Talenter User
routes.delete('/users/:id', controller.removeTalenter);

//Routes to Check Security
routes.post('/secret-routes', verifyToken, (req, res) =>{
    jwt.verify(req.token, process.env.TOKEN_SECRET, (err, authData) => {
            if(err) {
                res.status(400).send({
                    message: "Your Session is not valid!"
                });            
            } else {
            // MOCK USER
            console.log(authData);
            res.status(200).json({
            success: true,
            message: 'Welcome to TalentHub API Directory',
            authData       
            }); 
        }
    });    

});


// Load LAst ten OTP
routes.post('/otp/loadlastotp', controller.loadLastOTP);

// Load  ALL OTP
routes.post('/otp/loadallotp', controller.loadOTP);

//Remove Talenter User
routes.delete('/otp/:id', controller.deleteOTP);

// MANAGE USER PROFILE ROUTE
routes.post('/viewprofile', controller.getPreprofileBYEmail);




//Verify Token
function verifyToken(req, res, next) {

    //Get Auth Header Value
    const bearerHeader = req.headers['authorization'];
    // Check if bearer is undefined 
    if(typeof bearerHeader !== 'undefined') {
        // Split at the space
        const bearer = bearerHeader.split(' ');

        //Get token from array
        const bearerToken = bearer[1];

        // Set the token
        req.token = bearerToken;

        // Call the Next Middleware
        next();

    } else {
        // Forbidden
        res.status(403).send({
            message: "Your Session is invalid!",
            status: "forbidden"
        });
    }

}

module.exports = routes;