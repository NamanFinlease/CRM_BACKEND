import asyncHandler from "../middleware/asyncHandler.js";
import axios from "axios";

export const initiate = async (fName, lName, email, mobile) => {
    // Step-1: Initiate E-sign
    const eSignStepOne = await axios.post(
        "https://api.digitap.ai/clickwrap/v1/intiate",
        {
            docClassId: "EI358OTPESIG24561",
            reason: "Loan Agreement",
            signersInfo: [
                {
                    fname: `${fName}`,
                    lname: `${lName}`,
                    email: `${email}`,
                    mobile: `${mobile}`,
                    signerType: "signer1",
                },
            ],
        },
        {
            headers: {
                ent_authorization: process.env.DIGITAP_AUTH_KEY,
                "Content-Type": "application/json",
            },
        }
    );
    return eSignStepOne;
};

export const sendLinkToCustomer = async (eSignStepOne, formData) => {
    if (eSignStepOne.data.code === "200") {
        const eSignStepTwo = await axios.put(
            `${eSignStepOne.data.model.uploadUrl}`,
            formData,
            {
                headers: {
                    ...formData.getHeaders(), // Required to set proper Content-Type boundary
                },
            }
        );

        const eSignStepThree = await axios.post(
            "https://api.digitap.ai/clickwrap/v1/send/sign-in-link",
            {
                docTransactionId: `${eSignStepOne.data.model.docTransactionId}`,
                sendNotification: true,
            },
            {
                headers: {
                    ent_authorization: process.env.DIGITAP_AUTH_KEY,
                    "Content-Type": "application/json",
                },
            }
        );
        return eSignStepThree.data;
    }
};

// @desc Esign webhook for Digitap to send us a response if doc is esigned
// @route POST /api/sanction/esign/success
// @access Public
export const eSignWebhook = asyncHandler(async (req, res) => {
    const data = req.body;
    console.log(data);
    if (data["signers-info"][0].status !== "SIGNED") {
        console.log("Document not signed!!");
        res.status(400);
        throw new Error("Document not signed!!");
    }
    const response = await getDoc(data.entTransactionId);
    console.log(response);
});

export const getDoc = async (transactionId) => {
    console.log(transactionId);
    try {
        const eSignStepfour = await axios.post(
            "https://api.digitap.ai/clickwrap/v1/get-doc-url",
            {
                transactionId: `${transactionId}`,
            },
            {
                headers: {
                    ent_authorization: process.env.DIGITAP_AUTH_KEY,
                    "Content-Type": "application/json",
                },
            }
        );

        const eSignStepfive = await axios.get(
            eSignStepfour.data.model.previewUrl
        );

        const buffer = Buffer.from(eSignStepfive.data);
        return buffer;
    } catch (error) {
        console.log(error.data.message);
    }
};
