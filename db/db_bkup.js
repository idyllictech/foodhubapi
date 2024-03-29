const mongoose = require('mongoose');


const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useCreateIndex: true,
            useUnifiedTopology: true })
            console.log(`MongoDb connected to: ${conn.connection.host}`.cyan.bold);
                    
    } catch (err) {
        console.log(`Database Connection error: ${err.message}`.red);
        process.exit(1);        
    }
}

module.exports = connectDB;
