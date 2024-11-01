// config/otpUtil.js
import axios from "axios";

export const generateAadhaarOtp = async (aadhaar) => {
    console.log(aadhaar);
    const data = { aadhaar_no: aadhaar };

    const config = {
        method: "post",
        url: "https://www.timbleglance.com/api/aadhaar_otp_okyc/",
        headers: {
            "Content-Type": "application/json",
            "api-key": process.env.TIMBLE_APIKEY,
            "app-id": process.env.TIMBLE_APPID,
        },
        data,
    };

    try {
        const response = await axios.request(config);

        if (response.status !== 200) {
            return { message: "Please enter a valid Aadhaar" };
        }
        return response.data; // Return the response data
    } catch (error) {
        throw new Error(error.response?.data?.message || "An error occurred"); // Handle errors
    }
};

export const verifyAadhaarOtp = async (otp, trx_id) => {
    const data = { otp: otp, trx_id: trx_id };
    try {
        const response = await axios.post(
            "https://www.timbleglance.com/api/aadhaar_result_okyc/",
            data,
            {
                headers: {
                    "api-key": process.env.TIMBLE_APIKEY,
                    "app-id": process.env.TIMBLE_APPID,
                    "Content-Type": "application/json",
                },
            }
        );
        return response.data; // Return the response data
    } catch (error) {
        throw new Error(error?.data?.response_message || "An error occurred");
    }
};
