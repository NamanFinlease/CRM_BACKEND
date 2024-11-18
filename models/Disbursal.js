import mongoose from "mongoose";

const disbursalSchema = new mongoose.Schema(
    {
        loanNo: {
            type: String,
            unique: true,
        },
        // application: {
        //     type: mongoose.Schema.Types.ObjectId,
        //     ref: "Application",
        // },
        sanction: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Sanction",
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
        payableAccount: {
            type: String,
        },
        paymentMode: {
            type: String,
            enum: ["offline", "online", "Offline", "Online"],
        },
        amount: {
            type: String,
        },
        channel: {
            type: String,
            enum: ["imps", "neft", "IMPS", "NEFT"],
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
        disbursedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
        },
        sanctienedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
        },
        disbursedAt: {
            type: Date,
        },
        isClosed: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const Disbursal = mongoose.model("Disbursal", disbursalSchema);
export default Disbursal;
