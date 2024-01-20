const pool = require('../db/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const filesyste = require("fs");
const queries = require('./queries');
const uploadFile = require('../middlewares/upload');
const uploadVideoFile = require('../middlewares/videoupload');
const path1 = require('path')
const mime = require('mime');
const base64Img = require('base64-img');




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

// CONTROLLER GET NOTIFICATION
const getnotification = async (req, res) => {
    res.header(headers);

    console.log('Check Paramesters: ', req.params.email);

    const email = req.params.email;

   // let email = req.body.email;

    // const { email } = req.body;

    console.log('Check console result: ', req.params.email);

    let message ='';

    try {

        pool.query(queries.getInfoActivity, [email], (error, results) => {
            if (error) {
                console.log('Loading query error', error)

                return message = { message: 'Somehing went wrong. Server error! . ',
                success: false                  
                };
            }

            console.log('Check console result: ', results);
            console.log(results.length);
            const noactivityFond = results.length < 1;

            if(noactivityFond) {
                return res.send({
                    message: "You are yet to Post Your First Activity",
                    success: false
                });
            };

           // console.log(result);

            return res.send({
                    results  
               });
        })
    }

    catch (e) {
        message = { message: 'Oops, something went wrong!. ',       
        success: false  
        
           };
      }
    
    
     return message;
}




const postnewcomment = async (req, res) => {
    res.header(headers);

    //console.log('check basestring: ', req.body.imagedata);
    //console.log('Checking email: ', req.body.email);

    let usocialid = req.body.email;
    let comments = req.body.comments;
    let imagename = req.body.imagename;
    let imagetype = req.body.imagetype;
    let imagebase64 = req.body.imagedata

    
    let message ='';
    var matches = req.body.imagedata.match(/^data:([A-Za-z-+/]+);base64,(.+)$/),

    response = {};

    if (matches.length !== 3) {
        return new Error('Invalid input string');
        message = {message: 'Invalid input string. ',
        status: 0,
        sucess: false      
        };
    }

    response.type = matches[1];
    response.data = new Buffer.from(matches[2], 'base64');
    let decodedImg = response;
    let imageBuffer = decodedImg.data;
    let type = decodedImg.type;
    let extension = mime.extension(type);
    let customFileName = crypto.randomBytes(18).toString('hex');
    //let fileName = customFileName + '_' + Date.now()+"image." + extension;
    //let fileName = customFileName + '_' + Date.now();
    let fileName = imagename + '.' + extension;

   console.log('Checking email: ', usocialid, ' ', comments, '-', imagetype, '', fileName);

    try {
        base64Img.img(imagebase64, "./public/images/", imagename,  function(err, filepath) {
            if (err) {
                return console.log('checking uploading error: ', err);
               }
            const pathArr = filepath.split('/');
            const newFileName = pathArr[pathArr.length - 1];
    
    
            pool.query(queries.uploadActivity, [usocialid, comments, fileName, req.body.imagetype ], (error, result) => {
                
                if (error) {
                    console.log(`${usocialid}: ` + error);

                    return message = { message: 'Somehing went wrong. Server error! . ',
                            status: 0,
                            success: false  
                            
                            };
                } 
    
                res.status(200).send({
                    message: 'Post Uploaded Successfully: ', //+ req.file.filename,
                    status: 1,
                    success: true  
                })
    
            });    
        });

        message = {
            message: 'Post Uploaded Successfully: ', //+ req.file.filename,
            status: 1,
            success: true  
        };

    }
    catch (e) {
        message = { message: 'Invalid input string. ',
        status: 0,
        success: false  
        
           };
      }
    
    
     return message;
};




const postcommentimages = async (req, res) => {

    console.log('check basestring: ', req.body.imagedata);
    console.log('Checking email: ', req.body.email);

    let usocialid = req.body.email;
    let comments = req.body.comments;
    let imagename = req.body.imagename;
    let imagetype = req.body.imagetype;
    let isphoto = req.body.isphoto;

    
    let message ='';
    var matches = req.body.imagedata.match(/^data:([A-Za-z-+/]+);base64,(.+)$/),
    response = {};

    if (matches.length !== 3) {
        return new Error('Invalid input string');
        message = {message: 'Invalid input string. ',
        status: 0,
        sucess: false      
        };
    }

    response.type = matches[1];
    response.data = new Buffer.from(matches[2], 'base64');
    let decodedImg = response;
    let imageBuffer = decodedImg.data;
    let type = decodedImg.type;
    let extension = mime.extension(type);
    let customFileName = crypto.randomBytes(18).toString('hex');
    let fileName = customFileName + '_' + Date.now()+"image." + extension;

    console.log('Checking email: ', usocialid, ' ', comments, '-', imagetype, '', imagename);


    try {
           filesyste.writeFileSync("./public/images/" + imagename, imageBuffer, 'base64', function(err) {
               if (err) {
                return console.log('checking uploading error: ', err);
               }
               console.log('file saved as the:  ', imagename);
            }        
          );

          
           //filesyste.writeFileSync("./public/image/" + fileName, imageBuffer, 'base64');
         //filesyste.writeFileSync("./public/images/" + req.body.imagename, imageBuffer, 'utf8');
         
    //   let   repss = await db.query('INSERT INTO postactivities (email,comments,imagetype,imagename, isphoto) VALUES(?,?,?,?,?)', [req.email,req.comments,req.imagetype,req.imagename,req.isphoto], function (error, results, fields) {
    //        if (error) throw error;
    //        //con.release;
    //        // console.log(results.insertId);
    //      });

         pool.query(queries.uploadActivity, [usocialid, comments, imagename, req.body.imagetype, isphoto ], (error, result) => {
            
            if (error) {
                console.log(`${usocialid}` + error);
                throw error
            } 

            // res.status(200).send({
            //     message: 'Post Uploaded Successfully: ', //+ req.file.filename,
            //     status: 1,
            //     success: true  
            // })

        });
     
       message = {
                message: 'Post Uploaded Successfully: ', //+ req.file.filename,
                status: 1,
                success: true  
            };

       } catch (e) {
         message = { message: 'Invalid input string. ',
         status: 0,
         success: false  
         
            };
       }
     
     
      return message;

}


const uploadController = async (req, res) => {
    //console.log('Start Uploading Checking here 1: ', req);
    try {
        
        await uploadFile (req, res);

        //console.log('Start Uploading Checking here 2: ', req);

        if (req.file == undefined ) {
            console.log('Please upload a file!')
            return res.json({ 
              message: "Please upload a file!", 
              success: false })
        }

        console.log(`Check file Name: ` + req.file.filename);

        //var imgsrc = '' + req.file.filename
        var imgsrc = req.file.filename
        var { usociald, imgtype, comments, isphoto } = req.body;

        //var imgsrc = req.file.filename + '_' + Date.now() + path1.extname(file.filename)
        // var usociald = 'digimyxt@gmail.com'
        // var imgtype = 'photos'

        pool.query(queries.uploadActivity, [usociald, comments, imgsrc, imgtype, isphoto  ], (error, result) => {
            
            if (error) {
                console.log(`${usociald}` + error);
                throw error
            } 

            res.send({
                message: 'Post Uploaded Successfully: ', //+ req.file.filename,
                success: true 
            })

        });
        
       

    } catch (error) {
        if (error.code == 'LIMIT_FILE_SIZE') {
            return res.send({
                message: 'File size cannot be larger than 2MB!',
                success: false 
            });
        }

        console.log(`Catch error log: ` + error);

        res.send({
            message: `Could not upload the file:. ${error}`,
            success: false 
        });
        
    }
};


const videouploadController = async (req, res) => {
    try {

        await uploadVideoFile (req, res);

        if (req.file == undefined ) {
            console.log('Please upload a Video file!')
            return res.status(400).json({ message: "Please upload a Video file!"})
        }

        console.log(`Check file Name: ` + req.file.filename);

        //var imgsrc = '' + req.file.filename
        var imgsrc = req.file.filename
        //var imgsrc = req.file.filename + '_' + Date.now() + path1.extname(file.filename)
        var usociald = 'digimyxt@gmail.com'
        var imgtype = 'videos'

        pool.query(queries.uploadActivity, [usociald, imgsrc, imgtype ], (error, result) => {
            
            if (error) {
                console.log(`${usociald}` + error);
                throw error
            } 

            res.status(200).send({
                message: 'Video Uploaded successfully: ' + req.file.filename,
            })

        });
        
       

    } catch (error) {
        if (error.code == 'LIMIT_FILE_SIZE') {
            return res.status(500).send({
                message: 'Video File size cannot be larger than 5MB!'
            });
        }

        console.log(`Catch error log: ` + error);

        res.status(500).send({
            message: `Could not upload the video file:. ${error}`,
        });
        
    }
};

// GET List Upload Files
const getListFiles = (req, res) => {
    const directoryPath = _basedir + './public/images/';

    fs.readdir(directoryPath, function (err, files) {
        if (err) {
            res.status(500).send({
                message: 'Unable to scan files!',
            });
        }

        let fileInfos = [];

        files.forEach((file))
    })
}


    
const getPreprofileBYEmail = async (req,res,next) => {

    res.header(headers);
    const email = req.body.email;
    
    console.log( req.body.email );
       
    //const email = req.params.email;

    pool.query(queries.checkProfile, [email], (error, results) => {

        // console.log('Profile Here 2....');
        // console.log(email);

        if (error) {
            console.log(`${email}` + error);
            throw error
        }

        // console.log(results);
        // console.log('Profile Here 3....');

        res.status(200).json({ message: results});
    });

};


const updateProfilee = async (req, res) => {
    res.header(headers);

    console.log('Profile check log here');

    const { firstname, 
        lastname,
        mobile,
        gender, 
        date_of_birth,        
        skillset, 
        height, 
        bodytype, 
        complexion,        
        state, 
        city, 
        state_of_origin,
        privacy,
        email } = req.body;  

        console.log(email);
        
    pool.query(queries.updateProfile, 
        [firstname, lastname, mobile, gender, date_of_birth, skillset, height, bodytype, complexion, state, city, state_of_origin, privacy, email ], 
        (error, results) => {
            if (error) {
                //throw error
                console.log(error);
                return res.status(400).json({message: 'Oops! Something went wrong', success: false});
            }
            console.log(results);

            pool.query(queries.updateProfileStatus, [email], (error, resultts) => {
              if (error) {
                //throw error
                console.log(error);
                return res.status(400).json({message: 'Ouch! Something went wrong', success: false});
            }

            console.log(resultts);
            console.log('confirm affected row: = ' + resultts.affectedRows);

            const noOfAffectedRow =  resultts.affectedRows;

            if (noOfAffectedRow < 1) {
                
              return res.status(200).json({ 
                message: "Try again Profile update!",            
                success: false});                
            } 

            return res.status(200).json({ 
              message: "Profile Update Successful!",            
              success: true});  
              
          });

            // console.log(results);
            // return res.status(200).json({ 
            // message: `Profile Update Successful!`,            
            // success: true});

    });

}



module.exports = {
    getnotification,
    postnewcomment,
    postcommentimages,
    getPreprofileBYEmail,
    updateProfilee,
    uploadController,
    videouploadController,
    getListFiles
}