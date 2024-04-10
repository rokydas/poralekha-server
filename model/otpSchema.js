const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const otpSchema = new Schema({
  otp: {
    type: String,
    required: true
  },
  mobileNumber: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300 // expires after 300 seconds (5 minutes)
  }
});

module.exports = mongoose.model('OTP', otpSchema);