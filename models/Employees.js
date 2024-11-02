import mongoose from "mongoose";
import bcrypt from "bcrypt";

const employeeSchema = new mongoose.Schema({
    empId: {
        type: String,
        required: true,
        unique: true,
    },
    fName: {
        type: String,
        required: true,
    },
    lName: {
        type: String,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    gender: {
        type: String,
        required: true,
        enum: ["M", "F"],
    },
    mobile: {
        type: Number,
        required: true,
    },
    empRole: {
        type: [String],
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
});

employeeSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};
employeeSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        next();
    }

    this.password = bcrypt.hashSync(this.password, 10);
    next();
});

const Employee = mongoose.model("Employee", employeeSchema);
export default Employee;
