import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
    {
        lead: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Lead",
            required: true,
            unique: true,
        },
        applicant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Applicant",
        },
        creditManagerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
        },
        sanctionDate: {
            type: String,
        },
        onHold: {
            type: Boolean,
            default: false,
        },
        heldBy: {
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
        isRecommended: { type: Boolean, default: false },
        recommendedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
        },
        isApproved: {
            type: Boolean,
            default: false,
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
        },
    },
    { timestamps: true }
);

const Application = mongoose.model("Application", applicationSchema);
export default Application;
