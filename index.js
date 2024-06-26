const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require("cors");
const authHandler = require("./routes/auth");
const otpHandler = require("./routes/otp");
const app = express();
require("dotenv").config();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.DB_CONNECT;
app.use(cors());
app.use(express.json());
const mongoose = require('mongoose');
// MongoDB connection
const client = new MongoClient(MONGODB_URI);

async function connectToMongoDB() {
    mongoose.connect(MONGODB_URI);
    const connection = mongoose.connection;

    connection.once('open', () => {
        console.log('MongoDB database connection established successfully');
    });

    connection.on('error', (err) => {
        console.error('MongoDB connection error: ', err);
    });
}

connectToMongoDB();

app.use("/auth", authHandler);
app.use("/otp", otpHandler);

// API endpoint for fetching data with pagination
app.get('/api/data', async (req, res) => {
    if (req.query.password == "qwerty") {
        try {
            const db = client.db('poralekha-app');
            const collection = db.collection('users');

            const page = parseInt(req.query.page) || 1;
            const perPage = 10;
            const skip = (page - 1) * perPage;

            const totalItems = await collection.countDocuments();
            const totalPages = Math.ceil(totalItems / perPage);

            const data = await collection.find().skip(skip).limit(perPage).toArray();

            res.json({
                page: page,
                perPageStudents: perPage,
                totalStudents: totalItems,
                totalPages: totalPages,
                students: data
            });
        } catch (error) {
            console.error('Error fetching data:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    else {
        res.status(401).json({ error: 'Authentication error' });
    }
});

app.get('/', async (req, res) => {
    res.json({
        msg: "success"
    });
});

app.get('/delete-account-request', (req, res) => {
    res.sendFile(__dirname + '/static/delete-user.html');
});

app.post('/sendMobileNumber', (req, res) => {
    const { mobileNumber } = req.body;
    console.log(mobileNumber);
    const apiResponse = { success: true };

    res.json(apiResponse); // Send response back to client
});

const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
    });
};

app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});