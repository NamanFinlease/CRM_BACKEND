import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
    {
        bank: [
            {
                bankName: {
                    type: String,
                    required: true,
                },
                bankBranch: {
                    type: String,
                    required: true,
                },
                accountNo: {
                    type: String,
                    required: true,
                },
                accountHolder: {
                    type: String,
                    required: true,
                },
                ifscCode: {
                    type: String,
                    required: true,
                },
            },
        ],
    },
    { timestamps: true }
);

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;
