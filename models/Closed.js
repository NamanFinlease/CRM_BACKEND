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
                utr: { type: String, unique: true },
                partialPaid: [
                    {
                        date: { type: Date },
                        amount: { type: Number, default: 0 },
                        utr: { type: String, unique: true },
                        isPartlyPaid: { type: Boolean, default: false },
                        requestedStatus: {
                            type: String,
                            enum: ["partialPaid"],
                        },
                    },
                ],
                requestedStatus: {
                    type: String,
                    enum: ["closed", "settled", "writeOff"],
                },
                isActive: { type: Boolean, default: true },
                isClosed: { type: Boolean, default: false },
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

const Closed = mongoose.model("Closed", closedSchema);
export default Closed;
