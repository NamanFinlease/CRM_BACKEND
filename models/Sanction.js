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
        loanNo: {
            type: String,
            unique: true,
        },
    },
    { timestamps: true }
);

sanctionSchema.pre("save", async function (next) {
    try {
        // Only generate loanNo if it's missing
        if (!this.loanNo) {
            const lastSanctioned = await mongoose
                .model("Sanction")
                .findOne({})
                .sort({ loanNo: -1 });

            // Extract the numeric part, increment it, or start from 1 if no previous record exists
            const lastSequence = lastSanctioned
                ? parseInt(lastSanctioned.loanNo.slice(7))
                : 0;
            const newSequence = lastSequence + 1;

            this.loanNo = `NMFSPE${String(newSequence).padStart(11, 0)}`;
        }
        next();
    } catch (error) {
        next(error);
    }
});

const Sanction = mongoose.model("Sanction", sanctionSchema);
export default Sanction;
