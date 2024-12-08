// Function to extract Aadhaar ID from the URL
function getIdFromUrl() {
    const urlParts = window.location.pathname.split('/'); // Split the path
    return urlParts[urlParts.length - 1]; // Get the last part of the URL (ID)
}

// Call API on page reload

async function getAadhharOtp () {
    const aadhaarId = getIdFromUrl(); // Get the ID from the URL
    if (!aadhaarId) {
        console.error('Aadhaar ID not found in URL');
        return;
    }

    try {
        const response = await fetch(`/api/verify/aadhaar/${aadhaarId}`); // Use the extracted ID
        if (response.ok) {
            const data = await response.json();
            console.log('API Data:', data);
            // Handle OTP-related logic with `data`
        } else {
            console.error('Failed to fetch API:', response.statusText);
        }
    } catch (error) {
        console.error('Error while calling API:', error);
    }
}
window.addEventListener('load',getAadhharOtp );

// Auto-focus logic for OTP inputs
const inputs = document.querySelectorAll('.otp-input input');
inputs.forEach((input, index) => {
    input.addEventListener('input', () => {
        if (input.value.length === 1 && index < inputs.length - 1) {
            inputs[index + 1].focus();
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && index > 0) {
            inputs[index - 1].focus();
        }
    });
});

// Resend OTP logic with cooldown
const resendBtn = document.getElementById('resendBtn');
async function resendOTP() {
    resendBtn.disabled = true;
    resendBtn.innerText = 'Resending...';

    await getAadhharOtp()
    resendBtn.disabled = false;
    resendBtn.innerText = 'Resend OTP';
}
