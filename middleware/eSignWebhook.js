export const eSignWebhook = async (req, res, next) => {
    const data = req.body;

    // Check if the document is signed
    if (data["signers-info"].status !== "SIGNED") {
        return res.status(400).json({ error: "Document not signed!" });
    }

    // Store the transaction ID in the request for further use
    req.transactionId = data["signers-info"].transactionId; // Add relevant data to req

    // Pass control to the next middleware/handler
    next();
};
