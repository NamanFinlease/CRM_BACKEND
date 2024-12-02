// config/otpUtil.js
import axios from "axios";

export const generateAadhaarOtp = async (id, aadhaar) => {
    try {
        const data = { uniqueId: `${id}`, uid: `${aadhaar}` };

        // const config = {
        //     method: "post",
        //     url: "https://svc.digitap.ai/ent/v3/kyc/intiate-kyc-auto",
        //     headers: {
        //         authorization: process.env.DIGITAP_AUTH_KEY,
        //         "Content-Type": "application/json",
        //     },
        //     data,
        // };

        const response = await axios.post(
            "https://svc.digitap.ai/ent/v3/kyc/intiate-kyc-auto",
            data,
            {
                headers: {
                    authorization: process.env.DIGITAP_AUTH_KEY,
                    "Content-Type": "application/json",
                    "User-Agent": "curl/7.68.0",
                },
            }
        );

        if (response.data.code !== "200") {
            return { message: "Please enter a valid Aadhaar" };
        }
        return response.data; // Return the response data
    } catch (error) {
        throw new Error(error); // Handle errors
    }
};

export const verifyAadhaarOtp = async (
    id,
    otp,
    transactionId,
    fwdp,
    codeVerifier
) => {
    try {
        const data = {
            shareCode: "1234",
            otp: otp,
            transactionId: `${transactionId}`,
            fwdp: `${fwdp}`,
            codeVerifier: `${codeVerifier}`,
            validateXml: true,
        };
        console.log(data);
        const response = await axios.post(
            "https://svc.digitap.ai/ent/v3/kyc/submit-otp",
            data,
            {
                headers: {
                    authorization: process.env.DIGITAP_AUTH_KEY,
                    "Content-Type": "application/json",
                },
            }
        );
        return response.data; // Return the response data
    } catch (error) {
        throw new Error(error?.data?.msg || "An error occurred");
    }
};
