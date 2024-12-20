import axios from "axios";

export const BSA = async (formData) => {
    try {
        const response = await axios.post(
            "https://sm-bsa-sandbox.scoreme.in/bsa/external/uploadBankStatementFiles",
            formData,
            {
                headers: {
                    ClientId: "ecc2c3d648be4c906d9fb69cf4d74e96",
                    ClientSecret:
                        "ac9e3a9e437c52144fc5fe27e76c44027d1dc2cde2eb7fceb8cee6bc198f905a",
                    ...formData.getHeaders(), // Proper headers for FormData
                },
            }
        );
        if (response.data.responseCode === "SRS016") {
            return { success: true, message: "Bank statements are original" };
        }
        return {
            success: false,
            message: "The uploaded files seems to be modified or unreadable.",
        };
    } catch (error) {
        return { success: false, message: error.message };
    }
};
