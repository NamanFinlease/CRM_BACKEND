import express from "express";
import {
    aadhaarOtp,
    saveAadhaarDetails,
    getPanDetails,
    savePanDetails,
} from "../Controllers/appController";

const router = express.Router();
