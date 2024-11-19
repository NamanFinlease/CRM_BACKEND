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
            const lastSanctioned = await mongoose.model("Sanction").aggregate([
                {
                    $match: { loanNo: { $exists: true, $ne: null } },
                },
                {
                    $project: {
                        numericLoanNo: {
                            $toInt: { $substr: ["$loanNo", 6, -1] }, // Extract numeric part
                        },
                    },
                },
                {
                    $sort: { numericLoanNo: -1 }, // Sort in descending order
                },
                { $limit: 1 }, // Get the highest number
            ]);

            console.log(lastSanctioned);

            // increment the numeric loanNo, or start from 1 if no previous record exists
            const lastSequence =
                lastSanctioned.length > 0 ? lastSanctioned[0].numericLoanNo : 0;
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
