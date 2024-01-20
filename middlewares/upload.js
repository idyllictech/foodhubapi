const util = require("util");
const crypto = require('crypto');
const multer = require('multer'); 
const maxSize = 2 * 1024 * 1024; // Restrict file size with Multer

const path = require('path')

// File upload settings
const PATHUPLOAD = './public/images/'; // './public/images/' directory name where save the file


let storage = multer.diskStorage({
    destination: (req, file, callBack) =>  {
        callBack(null, PATHUPLOAD);
    },
    filename: (req, file, callBack) => {
        let customFileName = crypto.randomBytes(18).toString('hex')
        //callBack(null, file.originalname + '_' + Date.now() + path.extname(file.originalname)) 
        callBack(null, customFileName + '_' + Date.now() + path.extname(file.originalname)) 
    }
});

let uploadFile = multer({
    storage: storage,
    limits: { fileSize: maxSize},
    // fileFilter:  function (req, file, cb){
    
    //     console.log('Cheching Original File:', file.mimetype);
    //     // Set the filetypes, it is optional
    //     var filetypes = /image|jpeg|jpg|gif|png/;
    //     var mimetype = filetypes.test(file.mimetype);
  
    //     var extname = filetypes.test(path.extname(
    //                 file.originalname).toLowerCase());
        
    //     if (mimetype && extname) {
    //         return cb(null, true);
    //     }
      
    //     cb("Error: File upload only supports the "
    //             + "following filetypes - " + filetypes);
    //   }    
}).single("image");


let uploadFileMiddleware = util.promisify(uploadFile);

module.exports = uploadFileMiddleware;