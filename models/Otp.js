import mongoose from "mongoose";

// Define the schema
const otpSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
      unique: true,
    //   match: /^[0-9]{10}$/, // Assuming mobile numbers are 10 digits
    },
    otp: {
      type: String,
      required: true,
    },
    fName: {
      type: String,
    //   required: true,
    },
    lName: {
      type: String,
    //   required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600, // OTP expires after 5 minutes (300 seconds)
    },
  },
  { timestamps: true }
);

// Compile the model
const Otp = mongoose.model("Otp", otpSchema);

export default Otp;
