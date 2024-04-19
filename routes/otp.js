const router = require('express').Router()
const { verifyOtpValidation } = require('../validation/authValidation')
const User = require('../model/userSchema')
const OTP = require('../model/otpSchema')
const jwt = require('jsonwebtoken')
const axios = require('axios')

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

router.post('/verify-otp', async (req, res) => {

    try {
        // validation before checking otp
        const error = verifyOtpValidation(req.body)
        if (error) return res.status(400).send({
            success: false,
            msg: error.details[0].message
        })

        const otpDocs = await OTP.find({ mobileNumber: req.body.mobileNumber }).exec();
        if (!otpDocs.length == 0) {
            let otpMatched = false;
            for (const otpDoc of otpDocs) {
                if (otpDoc.otp === req.body.otp) {
                    await User.findOneAndUpdate(
                        { mobileNumber: req.body.mobileNumber },
                        { isVerified: true },
                        {
                            new: true, // Return the updated document
                            upsert: false, // Do not create a new document if no match is found
                        }
                    );
                    otpMatched = true;
                    break;
                }
            }
            if (otpMatched) {
                const user = await User.findOne({ mobileNumber: req.body.mobileNumber })
                if (!user) return res.status(409).send({
                    success: false,
                    msg: "OTP matched. But user not found"
                })

                // create and assign a token
                const token = jwt.sign({ _id: user._id, mobileNumber: user.mobileNumber }, process.env.TOKEN_SECRET)
                delete user._doc.password

                res.send({
                    success: true,
                    msg: "OTP Matched",
                    user: user._doc,
                    token
                })
            } else {
                res.status(400).json({
                    success: false,
                    msg: "Wrong OTP",
                })
            }
        } else {
            res.status(409).json({
                success: false,
                msg: "Time Error",
            })
        }
    } catch(err) {
        console.log(err)
        res.status(500).json({
            success: false,
            msg: "Something went wrong",
        })
    }
})

router.post('/resend-otp', async (req, res) => {
    try {
        if (req.body.security != "qwerty") {
            return res.status(404).json({
                success: false,
                msg: "Security key not found",
            })
        }
        if (!req.body.mobileNumber) {
            return res.status(404).json({
                success: false,
                msg: "Mobile number not found",
            })
        }
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
                msg: "OTP sent"
            })
        } else {
            res.status(500).json({
                success: false,
                msg: "Something went wrong. Resend again",
            })
        }
    } catch(err) {
        console.log(err)
        res.status(500).json({
            success: false,
            msg: "Something went wrong",
        })
    }
})

module.exports = router