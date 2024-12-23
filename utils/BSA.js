import axios from "axios";

export const BSA = async (formData) => {
    try {
        // console.log(formData);
        const response = await axios.post(
            "https://sm-bsa.scoreme.in/bsa/external/uploadBankStatementFiles",
            formData,
            {
                headers: {
                    ClientId: "1ab3c5a472c5270e990db15ab29e848d",
                    ClientSecret:
                        "81283b1dfb54e96cf17da8c62d4005699bc3b44730e99c62ec9f1a9c8b8cb3fa",
                    ...formData.getHeaders(), // Proper headers for FormData
                },
            }
        );
        console.log(response.data);

        if (response.data.responseCode === "SRS016") {
            return { success: true, message: response.data.responseMessage };
        }
        return {
            success: false,
            message: response.data.responseMessage,
        };
    } catch (error) {
        return { success: false, message: error.message };
    }
};
