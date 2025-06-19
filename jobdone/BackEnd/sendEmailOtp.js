const axios = require("axios");

async function sendEmailOtp(email, otp) {
  try {
    const response = await axios.post("https://api.brevo.com/v3/smtp/email", {
      sender: { name: "Job Done", email: "noreply.jobdone@gmail.com" },
      to: [{ email }],
      subject: "Your OTP Code",
      htmlContent: `<p>Your OTP is <strong>${otp}</strong>. It is valid for 15 minutes.</p>`
    }, {
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json"
      }
    });
    console.log("Brevo response:", response.data);
    return true;
  } catch (err) {
    console.error("Brevo OTP send failed:", err.response?.data || err.message);
    throw new Error("EMAIL_OTP_SEND_FAILED");
  }
}

module.exports = sendEmailOtp;
