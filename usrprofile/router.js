const router = require('express').Router();
const controller = require('./controllerp');
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({limit: '50mb', extended: true});


//Router GET INDIVIDUAL ACtivity
router.get('/getnotification/:email', controller.getnotification);

//Router GET INDIVIDUAL ACtivity
//router.post('/getnotification', urlencodedParser, controller.getnotification);


//Route Post Comment and Image
router.post('/postnewcomment', urlencodedParser, controller.postnewcomment);

//Route Post Comment and Image
router.post('/postcomments', controller.postcommentimages);

// Route to Upload Image
router.post('/imgupload', urlencodedParser, controller.uploadController);


router.post('/videoupload',  urlencodedParser, controller.videouploadController);


// GET PROFILE BY EMAIL

//router.post('/:email', controller.getPreprofileBYEmail);
router.post('/viewpro', controller.getPreprofileBYEmail);


// UPDATE PROFILE STATUS
router.post('/updateprofile', controller.updateProfilee);




module.exports = router;