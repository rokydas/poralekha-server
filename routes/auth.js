const router = require('express').Router()
const User = require('../model/userSchema')
const OTP = require('../model/otpSchema')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { registerValidation, loginValidation, updateProfileValidation, verifyOtpValidation } = require('../validation/authValidation')
const verify = require('../verifyToken')
const mongoose = require('mongoose')
const { MongoClient } = require('mongodb');
const axios = require('axios')
const verifyAdmin = require('../verifyAdmin')
const MONGODB_URI = "mongodb+srv://easy-user:easy-password@cluster0.txrndhh.mongodb.net/poralekha-app?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(MONGODB_URI);

const generateOtp = () => {
    const otp = Math.floor(100000 + Math.random() * 900000);
    return otp.toString();
};

const sendOtp = async (otp, recipient) => {
    try {
        const response = await axios.post('https://login.esms.com.bd/api/v3/sms/send', {
            recipient: `88${recipient}`,
            sender_id: process.env.SENDER_ID,
            type: 'plain',
            message: `পড়ালেখা এপ এ OTP দিয়ে মোবাইল নাম্বার ভেরিফাই করে নিন। OTP: ${otp}`
        }, {
            headers: {
                Authorization: `Bearer ${process.env.OTP_AUTH_TOKEN}`
            }
        });
        console.log('SMS sent successfully: ', response.data);
        return true;
    } catch (error) {
        console.error('Error sending SMS: ', error.response ? error.response.data : error.message);
        return false;
    }
}

const changeAdminStatus = async (isAdmin, req, res) => {
    try {
        const result = await User.findOneAndUpdate(
            { mobileNumber: req.body.mobileNumber }, 
            { $set: { isAdmin } }
        )
        if (result) {
            res.send({
                success: true,
                msg: `Admin ${isAdmin ? 'added' : 'removed'} successfully`
            })
        } else {
            res.send({
                success: false,
                msg: `Mobile Number not found`
            })
        }
        
    } catch (err) {
        console.log(err)
        res.status(500).send({
            success: false,
            msg: "Something went wrong. Please try again"
        })
    }
}

router.post('/register', async (req, res) => {

    // validation before making user
    const error = registerValidation(req.body)
    if (error) return res.status(400).send({
        success: false,
        msg: error.details[0].message
    })

    // checking if the user's mobile number exists in the db
    const mobileNumberExist = await User.findOne({ mobileNumber: req.body.mobileNumber })
    if (mobileNumberExist) return res.status(409).send({
        success: false,
        msg: "User is already registered"
    })

    // hashing password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(req.body.password, salt)

    // adding user
    const user = new User({ ...req.body, password: hashedPassword })
    try {
        await user.save()
        const otp = generateOtp();
        const otpDoc = new OTP({
            otp,
            mobileNumber: req.body.mobileNumber
        });
        await otpDoc.save();
        const smsResult = await sendOtp(otp, req.body.mobileNumber);
        if (smsResult) {
            res.send({
                success: true,
                msg: "Registration successful",
            })
        } else {
            await User.findOneAndDelete({ mobileNumber: req.body.mobileNumber })
            res.status(500).send({
                success: false,
                msg: "Something went wrong. Please try again."
            })
        }
    } catch (err) {
        console.log(err)
        res.status(500).send({
            success: false,
            msg: "Something went wrong. Please try again."
        })
    }
})

router.post('/login', async (req, res) => {

    // validation before logging in user
    const error = loginValidation(req.body)
    if (error) return res.status(400).send({
        success: false,
        msg: error.details[0].message
    })

    // checking if the user's mobile number exists in the db
    const user = await User.findOne({ mobileNumber: req.body.mobileNumber })
    if (!user) return res.status(409).send({
        success: false,
        msg: "User not found"
    })

    // password checking
    const validPass = await bcrypt.compare(req.body.password, user.password)
    if (!validPass) return res.status(400).send({
        success: false,
        msg: "Incorrect Password"
    })

    // create and assign a token
    const token = jwt.sign({ _id: user._id, mobileNumber: user.mobileNumber }, process.env.TOKEN_SECRET)
    // res.header('auth-token', token).send(user)
    delete user._doc.password
    res.send({
        success: true,
        msg: "Login successful",
        user: user._doc,
        token
    })

    // successful login
    // res.send({msg: 'Logged in'})
})

router.get("/me", verify, async (req, res) => {
    const user = await User.findOne({ _id: req.user._id })
    if (user) {
        res.send({
            success: true,
            user
        })
    } else {
        res.status(400).send({ success: false, msg: "No logged in" })
    }
})

router.get("/all", verify, async (req, res) => {
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
            users: data
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
})

router.put('/update-profile', verify, async (req, res) => {
    try {
        const error = updateProfileValidation(req.body)
        if (error) return res.status(400).send({
            success: false,
            msg: error.details[0].message
        })
        await User.findByIdAndUpdate(req.user._id, { $set: req.body })
        res.send({
            success: true,
            msg: "Profile updated successfully"
        })
    } catch (err) {
        console.log(err)
        res.status(400).send({
            success: false,
            msg: "Something went wrong. Please try again"
        })
    }
})

router.post('/add-admin', verify, verifyAdmin, async (req, res) => {
    changeAdminStatus(true, req, res);
})

router.post('/remove-admin', verify, verifyAdmin, async (req, res) => {
    changeAdminStatus(false, req, res);
})

router.put('/select-class', verify, async (req, res) => {
    try {
        if (!req.body.class) return res.status(400).send({
            success: false,
            msg: "Class not found"
        })
        await User.findByIdAndUpdate(req.user._id, { $set: {class: req.body.class} })
        res.send({
            success: true,
            msg: "Class added successfully"
        })
    } catch (err) {
        console.log(err)
        res.status(400).send({
            success: false,
            msg: "Something went wrong. Please try again"
        })
    }
})

module.exports = router