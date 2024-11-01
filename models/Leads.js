import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
    {
        fName: {
            type: String,
            required: true,
        },
        mName: {
            type: String,
        },
        lName: {
            type: String,
        },
        gender: {
            type: String,
            required: true,
            enum: ["M", "F"],
        },
        dob: {
            type: Date,
            required: true,
        },
        aadhaar: {
            type: String,
            required: true,
            // unique: true,
        },
        pan: {
            type: String,
            required: true,
            // unique: true,
        },
        cibilScore: {
            type: String,
        },
        mobile: {
            type: String,
            required: true,
        },
        alternateMobile: {
            type: String,
        },
        personalEmail: {
            type: String,
            required: true,
        },
        officeEmail: {
            type: String,
            required: true,
        },
        loanAmount: {
            type: Number,
            required: true,
        },
        salary: {
            type: Number,
            required: true,
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
        onHold: {
            type: Boolean,
            default: false,
        },
        heldBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
        },
        isMobileVerified: {
            type: Boolean,
            default: false,
        },
        emailOtp: Number,
        emailOtpExpiredAt: { type: Date },
        isAadhaarVerified: { type: Boolean, default: false },
        isPanVerified: { type: Boolean, default: false },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        isRejected: {
            type: Boolean,
            default: false,
        },
        rejectedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
        },

        document: {
            singleDocuments: [
                {
                    name: {
                        type: String,
                        required: true,
                    },
                    type: {
                        type: String,
                        enum: [
                            "aadhaarFront",
                            "aadhaarBack",
                            "eAadhaar",
                            "panCard",
                            "cibilReport",
                            "sanctionLetter",
                            // Add more document types as needed
                        ],
                    },
                    url: {
                        type: String,
                        required: true,
                    },
                    remarks: {
                        type: String,
                    },
                },
            ],
            multipleDocuments: {
                bankStatement: [
                    {
                        name: {
                            type: String,
                            required: true,
                        },
                        url: {
                            type: String,
                            required: true,
                        },
                        remarks: {
                            type: String,
                        },
                    },
                ],
                salarySlip: [
                    {
                        name: {
                            type: String,
                            required: true,
                        },
                        url: {
                            type: String,
                            required: true,
                        },
                        remarks: {
                            type: String,
                        },
                    },
                ],
                others: [
                    {
                        name: {
                            type: String,
                            required: true,
                        },
                        url: {
                            type: String,
                            required: true,
                        },
                        remarks: {
                            type: String,
                        },
                    },
                ],
            },
        },
        isRecommended: {
            type: Boolean,
            default: false,
        },
        recommendedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
        },
        source: {
            type: String,
            required: true,
            enum: ["website", "bulk", "landingPage"],
            default: "website",
        },
    },
    { timestamps: true }
);

const Lead = mongoose.model("Lead", leadSchema);
export default Lead;
