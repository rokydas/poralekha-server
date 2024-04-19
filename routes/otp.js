const router = require('express').Router()
const { verifyOtpValidation } = require('../validation/authValidation')
const User = require('../model/userSchema')
const OTP = require('../model/otpSchema')
const jwt = require('jsonwebtoken')

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

module.exports = router