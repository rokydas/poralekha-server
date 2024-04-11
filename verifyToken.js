const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
    const tokenWithBearer = req.header('Authorization');
    if (!tokenWithBearer || !tokenWithBearer.startsWith("Bearer")) {
        return res.status(401).send({
            success: false,
            msg: "Unathorized"
        })
    }

    try {
        const token = tokenWithBearer.split("Bearer ")[1]
        const verified = jwt.verify(token, process.env.TOKEN_SECRET)
        req.user = verified
        next()
    } catch (err) {
        res.status(401).send({
            success: false,
            msg: "Invalid Token"
        })
    }
}