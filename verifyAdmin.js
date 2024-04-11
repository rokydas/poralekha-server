const jwt = require('jsonwebtoken')
const User = require('./model/userSchema')

module.exports = async (req, res, next) => {
    try {
        const user = await User.findOne({ _id: req.user._id })
        if (!user.isAdmin) {
            return res.status(401).send({
                success: false,
                msg: "Access Denied"
            })
        }
        next()
    } catch (err) {
        res.status(401).send({
            success: false,
            msg: "Invalid Token"
        })
    }
}