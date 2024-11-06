import mongoose from "mongoose";

const disbursalSchema = new mongoose.Schema(
    {
        loanNo: {
            type: String,
            required: true,
            unique: true,
        },
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

// Pre-save hook to generate custom auto-incrementing loanNo
disbursalSchema.pre("save", async function (next) {
    if (this.isNew) {
        try {
            // Find the most recent disbursal record
            const lastDisbursal = await mongoose
                .model("Disbursal")
                .findOne({})
                .sort({ loanNo: -1 })
                .exec();

            // Extract the numeric part, increment it, or start from 1 if no previous record exists
            const lastSequence = lastDisbursal
                ? parseInt(lastDisbursal.loanNo.slice(7))
                : 0;
            const newSequence = lastSequence + 1;

            // Set the new loanNo with zero-padded sequence to 11 digits
            this.loanNo = `NMFSPE${String(newSequence).padStart(11, 0)}`;
        } catch (error) {
            return next(error);
        }
    }
    next();
});

const Disbursal = mongoose.model("Disbursal", disbursalSchema);
export default Disbursal;
