/**
 * SMS OTP Handler Utility
 * Supports real-time SMS delivery via Brevo (Sendinblue) Transactional SMS API
 * with safe development fallback logging when API Key is not configured.
 */

export const sendSmsOtp = async (phone, otp) => {
  const apiKey = process.env.SMS_API_KEY;
  const senderName = process.env.SMS_SENDER_NAME || 'LTSDBMS';

  // Format phone number to include country code (+91 by default for India if not specified)
  const cleanPhone = String(phone).trim();
  const formattedPhone = cleanPhone.startsWith('+')
    ? cleanPhone
    : `+91${cleanPhone.replace(/^0+/, '')}`;

  // Safe fallback if Brevo API Key is missing or placeholder
  if (!apiKey || apiKey.includes('YOUR_') || apiKey.trim() === '') {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[SMS DEV MOCK] Sent to: ${formattedPhone}`);
      console.log(`[SMS DEV MOCK] OTP: ${otp}`);
    }
    return { success: true, mode: 'mock', phone: formattedPhone, otp };
  }

  // Real Brevo Transactional SMS API Call
  try {
    const payload = {
      sender: senderName,
      recipient: formattedPhone,
      content: `Your LTS DBMS Login OTP is: ${otp}. Valid for 10 minutes. Do not share this OTP with anyone.`,
      type: 'transactional',
    };

    const response = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(' Brevo SMS Delivery Failed:', data);
      return { success: false, error: data };
    }

    console.log(`[BREVO SMS] Real SMS delivered to ${formattedPhone} (Message ID: ${data.messageId || 'N/A'})`);
    return { success: true, mode: 'brevo', data };
  } catch (error) {
    console.error('Error sending SMS via Brevo:', error.message);
    // Don't crash auth flow, return fallback status
    return { success: false, error: error.message };
  }
};

export default sendSmsOtp;
