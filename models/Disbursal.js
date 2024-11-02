import mongoose from "mongoose";

const disbursalSchema = new mongoose.Schema(
    {
        application: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Application",
            required: true,
            unique: true,
        },
        channel: {
            type: String,
        },
        mop: {
            type: String,
        },
        disbursalManagerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
        },
        // onHold:{
        //     type: Boolean,
        //     default: false,
        // },
        // heldBy:{
        //     type: mongoose.Schema.Types.ObjectId,
        //     ref: "Employee",
        // },
        // isRejected:{
        //     type: Boolean,
        //     default: false,
        // },
        // rejectedBy:{
        //     type: mongoose.Schema.Types.ObjectId,
        //     ref: "Employee",
        // },
        isRecommended: {
            type: Boolean,
            default: false,
        },
        recommendedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
        },
        isDisbursed: {
            type: Boolean,
            default: false,
        },
        disbursedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
        },
        disbursedAt: {
            type: Date,
        },
    },
    { timestamps: true }
);

const Disbursal = mongoose.model("Disbursal", disbursalSchema);
export default Disbursal;
