import mongoose from "mongoose";

const personalDetailsSchema = new mongoose.Schema(
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
        gender: { type: String, required: true, enum: ["M", "F"] },
        dob: {
            type: Date,
            required: true,
        },
        mobile: { type: String, required: true, unique: true },
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
        screenedBy: {
            type: String,
            required: true,
        },
        pan: {
            type: String,
            required: true,
            unique: true,
        },
        aadhaar: {
            type: String,
            required: true,
            unique: true,
        },
    },
    { _id: false }
);

const residenceSchema = new mongoose.Schema({
    address: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    state: {
        type: String,
        required: true,
    },
    pincode: {
        type: String,
        required: true,
    },
    residingSince: {
        type: String,
        required: true,
    },
});

const employmentDetailsSchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: true,
    },
    companyAddress: {
        type: String,
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
    pincode: {
        type: String,
        required: true,
    },
    department: {
        type: String,
        required: true,
    },
    designation: {
        type: String,
        required: true,
    },
    employedSince: {
        type: String,
        required: true,
    },
});

const referenceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    relation: {
        type: String,
        required: true,
    },
    mobile: {
        type: String,
        required: true,
    },
});

const applicantSchema = new mongoose.Schema(
    {
        personalDetails: {
            type: personalDetailsSchema,
            required: true,
        },
        residence: {
            type: residenceSchema,
        },
        employment: {
            type: employmentDetailsSchema,
        },
        reference: {
            type: [referenceSchema],
        },
    },
    { timestamps: true }
);

const Applicant = mongoose.model("Applicant", applicantSchema);
export default Applicant;
