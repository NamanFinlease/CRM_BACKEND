import puppeteer from "puppeteer";
import { uploadDocs } from "./docsUploadAndFetch.js";

export async function htmlToPdf(lead, htmlResponse, fieldName) {
    let browser;
    try {
        // Launch a new browser instance
        browser = await puppeteer.launch();
        const page = await browser.newPage();

        // Set the HTML content for the page
        await page.setContent(htmlResponse[0]);

        // Generate a PDF from the HTML content
        const pdfBuffer = await page.pdf({
            format: "A4", // Page format
        });

        //   close the browser
        await browser.close();

        // Use the utility function to upload the PDF buffer
        const result = await uploadDocs(lead, null, {
            isBuffer: true,
            buffer: pdfBuffer,
            fieldName: fieldName,
        });

        if (!result) {
            return { success: false, message: "Failed to upload PDF." };
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        // Ensure the browser is closed
        if (browser) {
            await browser.close();
        }
    }
}
