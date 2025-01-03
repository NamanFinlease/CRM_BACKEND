import mongoose from "mongoose";

const counterSchema = new mongoose.Schema(
    {
        sequenceName: { type: String, unique: true },
        sequenceValue: { type: Number, required: true },
    },
    { timestamps: true }
);

export const Counter = mongoose.model("Counter", counterSchema);

export async function getNextSequence(sequenceName, prefix, padding) {
    const updatedCounter = await Counter.findOneAndUpdate(
        { sequenceName },
        { $inc: { sequenceValue: 1 } },
        { new: true, upsert: true }
    );
    const sequenceNumber = String(updatedCounter.sequenceValue).padStart(
        padding,
        "0"
    );

    return `${prefix}${sequenceNumber}`;
}
