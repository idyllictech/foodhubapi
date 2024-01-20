const util = require("util");
const crypto = require('crypto');
const multer = require('multer'); 
const maxSize = 5 * 1024 * 1024; // Restrict file size with Multer

// Checking video params
const fs = require("fs").promises;
const buff = Buffer.alloc(100);
const header = Buffer.from("mvhd");

const path = require('path')

// File upload settings
const PATHUPLOAD = './public/videos/'; // './public/videos/' directory name where save the file


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

// const i = setInterval(function(video) {
// 	if(video.readyState > 0) {
// 		var minutes = parseInt(video.duration / 60, 10);
// 		var seconds = video.duration % 60;
// 		clearInterval(i);
// 	}
// }, 200);

let uploadVideoFile = multer({
    storage: storage,
    limits: { fileSize: maxSize},
    // fileFilter: async function (req, file, cb){

       
    
    //     // Set the filetypes, it is optional
    //     var filetypes = /mp4|MPEG-4|3gp|mkv/;
    //     var mimetype = filetypes.test(file.mimetype);      
       
    //     var extname = filetypes.test(path.extname(
    //                 file.originalname).toLowerCase());
        
    //     if (mimetype && extname) {
    //         return cb(null, true);
    //     }
      
    //     cb("Error: Video upload only supports the "
    //             + "following filetypes - " + filetypes);

    //         // Video Length        
    //         // let videoslength = getVidsecs(file.originalname);

    //         //     console.log("Video length is " + videoslength);
                
    //         //      if (videoslength > 20 ) {

    //         //         return cb(null, true);
    //         //      }

    //         //      cb("Error: Video duration: "+ videoslength + " is higher than expected "
    //         //      + " value of 20 secs " );

    //   }   
}).single("image");






// async function main() {
//     const file = await fs.open("./public/videos/bde26cf55017cfb70838d848e0242d9658a6_1643289809286.mp4", "r");

//     //const { size } = await fs.stat("./public/videos/bde26cf55017cfb70838d848e0242d9658a6_1643289809286.mp4");

//     const { buffer } = await file.read(buff, 0, 100, 0);

//     await file.close();

//     const start = buffer.indexOf(header) + 17;
//     const timeScale = buffer.readUInt32BE(start);
//     const duration = buffer.readUInt32BE(start + 4);

//     const audioLength = Math.floor((duration / timeScale) * 1000) / 1000;
//     console.log(audioLength);

//     // console.log(buffer, header, start, timeScale, duration, audioLength);
// }

//main();

async function getVidsecs(getsecs) {
    //let duration = 0;

    const file = await fs.open(getsecs, "r");
    const { buffer } = await file.read(buff, 0, 100, 0);
    
    await file.close();
    

    const start = buffer.indexOf(header) + 17;
    const timeScale = buffer.readUInt32BE(start);
    const duration = buffer.readUInt32BE(start + 4);
    const audioLength = Math.floor((duration / timeScale) * 1000) / 1000;

    //return console.log ( "Video length is " +  audioLength);
    return audioLength;
}

// Testing value
// getVidsecs("./public/videos/bde26cf55017cfb70838d848e0242d9658a6_1643289809286.mp4");





let uploadVideoFileMiddleware = util.promisify(uploadVideoFile);

module.exports = uploadVideoFileMiddleware;