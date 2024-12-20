import mongoose from "mongoose";

const socialMediaSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        phoneNumber: {
            type: String,
            required: true,
        },
        gender: {
            type: String,
            required: true,
            enum: ["M", "F", "O"],
        },
        dob: {
            type: Date,
        },
        aadhaar: {
            type: String,
            // unique: true,
        },
        pan: {
            type: String,
            // unique: true,
        },
        mobile: {
            type: String,
        },
        alternateMobile: {
            type: String,
        },
        personalEmail: {
            type: String,
        },
        officeEmail: {
            type: String,
        },
        loanAmount: {
            type: Number,
        },
        salary: {
            type: Number,
        },
        pinCode: {
            type: Number,
            required: true,
        },
        state: {
            type: String,
            required: true,
        },
        city: {
            type: String,
            required: true,
        },
        screenerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
        },
        isRejected: {
            type: Boolean,
            default: false,
        },
        rejectedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
        },
        source: {
            type: String,
            required: true,
            enum: ["facebook", "instagram", "twitter", "whatsapp", "linkedin"],
        },
    },
    { timestamps: true }
);

const SocialMedia = mongoose.model("SocialMedia", socialMediaSchema);
export default SocialMedia;
