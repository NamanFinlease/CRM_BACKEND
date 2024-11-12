import express from "express";
import {
    getNewDisbursal,
    getDisbursal,
    allocateDisbursal,
    allocatedDisbursal,
    recommendDisbursal,
    disbursalPending,
    disbursed,
    approveDisbursal,
} from "../Controllers/disbursal.js";
// import { onHold, unHold, getHold } from "../Controllers/holdUnhold.js";
// import { rejected, getRejected } from "../Controllers/rejected.js";
// import { sentBack } from "../Controllers/sentBack.js";
import { totalRecords } from "../Controllers/totalRecords.js";
import { protect } from "../middleware/authMiddleware.js";
import { getHold, onHold } from "../Controllers/holdUnhold.js";

const router = express.Router();

router.route("/").get(protect, getNewDisbursal);
router.route("/allocated").get(protect, allocatedDisbursal);
router.route("/pending").get(protect, disbursalPending);
router.route("/disbursed").get(protect, disbursed);
router.route("/hold").get(protect, getHold);
router.route("/hold/:id").patch(protect, onHold);
router.route("/reject/:id").get(protect, disbursed);
router.route("/rejected").get(protect, disbursed);
router.route("/send-back/:id").patch(protect, disbursed);
// router.route("/rejected").get(protect, disbursed);
router
    .route("/:id")
    .get(protect, getDisbursal)
    .patch(protect, allocateDisbursal);
router.route("/recommend/:id").patch(protect, recommendDisbursal);
router.route("/approve/:id").patch(protect, approveDisbursal);

export default router;
