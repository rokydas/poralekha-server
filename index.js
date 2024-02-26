const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require("cors");

const app = express();
require("dotenv").config();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = 'mongodb+srv://easy-user:easy-password@cluster0.txrndhh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
app.use(cors());
app.use(express.json());
// MongoDB connection
const client = new MongoClient(MONGODB_URI);

async function connectToMongoDB() {
    try {
        await client.connect();
        console.log('Connected to MongoDB Atlas');
    } catch (error) {
        console.error('Error connecting to MongoDB Atlas:', error);
    }
}

connectToMongoDB();

// API endpoint for fetching data with pagination
app.get('/api/data', async (req, res) => {
    if (req.query.password == "qwerty") {
        try {
            const db = client.db('poralekha-app');
            const collection = db.collection('students');

            const page = parseInt(req.query.page) || 1;
            const perPage = 10;
            const skip = (page - 1) * perPage;

            const totalItems = await collection.countDocuments();
            const totalPages = Math.ceil(totalItems / perPage);

            const data = await collection.find().skip(skip).limit(perPage).toArray();

            res.json({
                page: page,
                perPage: perPage,
                totalItems: totalItems,
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

// error handling
app.use((err, req, res, next) => {
    console.log(err)
    res.status(500).send({ success: false, msg: "There was an error" })
})

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});