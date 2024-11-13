import mongoose from "mongoose";

const sanctionSchema = new mongoose.Schema(
    {
        application: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Application",
            required: true,
            unique: true,
        },
        recommendedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
        },
        sanctionDate: {
            type: String,
        },
        eSigned: {
            type: Boolean,
            default: false,
        },
        isDibursed: {
            type: Boolean,
            default: false,
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
        isApproved: {
            type: Boolean,
            default: false,
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
        },
        isChanged: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const Sanction = mongoose.model("Sanction", sanctionSchema);
export default Sanction;
