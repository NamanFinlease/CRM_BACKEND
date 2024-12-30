import { chromium } from "playwright";
import { uploadDocs } from "./docsUploadAndFetch.js";

export async function htmlToPdf(docs, htmlResponse, fieldName) {
    let browser;
    let pdfBuffer;
    try {
        // Launch a new browser instance
        browser = await chromium.launch();
        const page = await browser.newPage();
        if (fieldName === "cibilReport") {
            // Set the HTML content for the page
            await page.setContent(htmlResponse[0]);

            // Generate a PDF from the HTML content
            pdfBuffer = await page.pdf({
                format: "A4", // Page format
            });
        }
        // Set the HTML content for the page
        await page.setContent(htmlResponse);

        // Generate a PDF from the HTML content
        pdfBuffer = await page.pdf({
            width: "8.5in", // Double the standard width
            height: "14in", // Double the standard height
            margin: {
                top: "0.2in",
                bottom: "0.2in",
                left: "0.2in",
                right: "0.2in",
            },
        });

        // Use the utility function to upload the PDF buffer
        const result = await uploadDocs(docs, null, null, {
            isBuffer: true,
            buffer: pdfBuffer,
            fieldName: fieldName,
        });
        if (!result) {
            return { success: false, message: "Failed to upload PDF." };
        }
        return {
            success: true,
            pdfBuffer: pdfBuffer,
            message: "File uploaded.",
        };

        // Return the PDF buffer
        // return pdfBuffer;

        // Use the utility function to upload the PDF buffer
        // const result = await uploadDocs(lead, null, {
        //     isBuffer: true,
        //     buffer: pdfBuffer,
        //     fieldName: fieldName,
        // });

        // if (!result) {
        //     return { success: false, message: "Failed to upload PDF." };
        // }
    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        // Ensure the browser is closed
        if (browser) {
            await browser.close();
        }
    }
}
