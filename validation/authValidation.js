// validation
const Joi = require('@hapi/joi')

// registerValidation 
const registerValidation = (body) => {
    const schema = Joi.object(
        {
            name: Joi.string().required(),
            mobileNumber: Joi.string().required(),
            password: Joi.string().required(),
            isAdmin: Joi.boolean().required(),
            address: Joi.string().required(),
            age: Joi.number().required(),
            class: Joi.string().required().allow(""),
            gender: Joi.string().required(),
            img: Joi.string().required().allow(""),
            role: Joi.string().required(),
            isVerified: Joi.boolean().required()
        }
    )
    const {error} = schema.validate(body);
    return error
} 

const loginValidation = (body) => {
    const schema = Joi.object(
        {
            mobileNumber: Joi.string().required(),
            password: Joi.string().required()
        }
    )
    const {error} = schema.validate(body);
    return error
}

const verifyOtpValidation = (body) => {
    const schema = Joi.object(
        {
            otp: Joi.string().required(),
            mobileNumber: Joi.string().required()
        }
    )
    const {error} = schema.validate(body);
    return error
}

const updateProfileValidation = (body) => {
    const schema = Joi.object(
        {
            name: Joi.string().required(),
            address: Joi.string().required(),
            age: Joi.number().required(),
            gender: Joi.string().required(),
            img: Joi.string().required().allow(""),
        }
    )
    const {error} = schema.validate(body);
    return error
}

module.exports.registerValidation = registerValidation
module.exports.loginValidation = loginValidation
module.exports.updateProfileValidation = updateProfileValidation
module.exports.verifyOtpValidation = verifyOtpValidation