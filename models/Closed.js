import mongoose from "mongoose";

const closedSchema = new mongoose.Schema(
    {
        pan: {
            type: String,
            required: true,
            unique: true,
        },
        data: [
            {
                disbursal: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Disbursal",
                },
                loanNo: { type: String, required: true },
                isDisbursed: { type: Boolean, default: false },
                date: { type: Date },
                amount: { type: Number, default: 0 },
                discount: { type: Number, default: 0 },
                utr: { type: String },
                partialPaid: [
                    {
                        date: { type: Date },
                        amount: { type: Number, default: 0 },
                    },
                ],
                requestedStatus: {
                    type: String,
                    enum: ["closed", "partialPaid", "settled", "writeOff"],
                },
                isActive: { type: Boolean, default: true },
                isClosed: { type: Boolean, default: false },
                isPartlyPaid: { type: Boolean, default: false },
                isSettled: { type: Boolean, default: false },
                isWriteOff: { type: Boolean, default: false },
                defaulted: { type: Boolean, default: false },
                isVerified: { type: Boolean, default: false },
                dpd: { type: Number, default: 0 },
            },
        ],
    },
    { timestamps: true }
);

// Custom setter for flags to make sure only the correct one is true
closedSchema.methods.setStatusFlags = function (loanEntry, status) {
    // Reset all status-related flags first
    loanEntry.isClosed = false;
    loanEntry.isPartlyPaid = false;
    loanEntry.isSettled = false;
    loanEntry.isWriteOff = false;
    loanEntry.defaulted = false;
    loanEntry.isVerified = false; // Reset isVerified flag as well
    loanEntry.isActive = true; // Reset isActive flag as well

    // Handle other status-based flags
    switch (status) {
        case "closed":
            loanEntry.isClosed = true;
            loanEntry.isVerified = true;
            loanEntry.isActive = false;
            break;
        case "settled":
            loanEntry.isSettled = true;
            loanEntry.isVerified = true;
            loanEntry.isActive = false;
            break;
        case "writeOff":
            loanEntry.isWriteOff = true;
            loanEntry.defaulted = true; // Set defaulted to true when it's written off
            loanEntry.isVerified = true;
            loanEntry.isActive = false;
            break;
        case "partialPaid":
            loanEntry.isPartlyPaid = true;
            loanEntry.isVerified = true;
            break;
        default:
            // Optional: If no valid status is provided, we can reset flags or handle errors
            break;
    }
};

const Closed = mongoose.model("Closed", closedSchema);
export default Closed;
