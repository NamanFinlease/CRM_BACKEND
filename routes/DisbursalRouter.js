import express from "express";
import { getNewDisbursal } from "../Controllers/disbursal.js";
import { onHold, unHold, getHold } from "../Controllers/holdUnhold.js";
import { rejected, getRejected } from "../Controllers/rejected.js";
import { sentBack } from "../Controllers/sentBack.js";
import { totalRecords } from "../Controllers/totalRecords.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").get(protect, getNewDisbursal);

export default router;
