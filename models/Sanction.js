import mongoose from "mongoose";

const sanctionSchema = new mongoose.Schema(
    {
        application: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Application",
            required: true,
            unique: true,
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
    },
    { timestamps: true }
);

const Sanction = mongoose.model("Sanction", sanctionSchema);
export default Sanction;
