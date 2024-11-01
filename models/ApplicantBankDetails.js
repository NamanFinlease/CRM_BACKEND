import mongoose from "mongoose";

const bankSchema = new mongoose.Schema(
    {
        borrowerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ApplicationPersonalDetails",
            unique: true,
        },
        bankName: {
            type: String,
            required: true,
        },
        branchName: {
            type: String,
            required: true,
        },
        bankAccNo: {
            type: String,
            required: true,
            unique: true,
        },
        ifscCode: {
            type: String,
            required: true,
        },
        beneficiaryName: {
            type: String,
            required: true,
        },
        accountType: {
            type: String,
            required: true,
            enum: ["savings", "current", "overdraft"],
        },
    },
    { timestamps: true }
);

const Bank = mongoose.model("Bank", bankSchema);
export default Bank;
