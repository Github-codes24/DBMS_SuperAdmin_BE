import dotenv from 'dotenv';

dotenv.config();

/**
 * Dispatch a welcome email to a newly created telecaller via MSG91 Email API.
 * Bypasses network request gracefully if MSG91 is not fully configured (for local testing).
 * 
 * @param {string} toEmail - Recipient email address
 * @param {string} name - Recipient's full name
 * @param {string} password - The initial temporary password
 */
export const sendTelecallerWelcomeEmail = async (toEmail, name, password) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const fromEmail = process.env.MSG91_FROM_EMAIL;
  const domain = process.env.MSG91_DOMAIN;
  const templateId = process.env.MSG91_EMAIL_TEMPLATE_ID;
  const loginUrl = process.env.TELECALLER_LOGIN_URL || 'https://telecaller.lts-dbms.com/login';

  console.log(`[Email Dispatch Log] Dispatching welcome email to ${toEmail}...`);
  console.log(`[Email Details] URL: ${loginUrl} | Temp Password: ${password}`);

  // Check if MSG91 is fully configured
  if (!authKey || !fromEmail || !domain || !templateId) {
    console.warn('[MSG91 Warning] MSG91 is not fully configured in .env. Skipping real network dispatch.');
    return { success: true, mocked: true };
  }

  const payload = {
    to: [
      {
        name: name,
        email: toEmail,
      },
    ],
    from: {
      name: 'LTS DBMS Support',
      email: fromEmail,
    },
    domain: domain,
    template_id: templateId,
    variables: {
      link: loginUrl,
      email: toEmail,
      password: password,
    },
  };

  try {
    const response = await fetch('https://control.msg91.com/api/v5/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authkey': authKey,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`[MSG91 Error] API responded with status ${response.status}: ${responseText}`);
      return { success: false, error: responseText };
    }

    console.log('[MSG91 Success] Welcome email dispatched successfully.');
    return { success: true, response: responseText };
  } catch (error) {
    console.error('[MSG91 Dispatch Exception]', error);
    return { success: false, error: error.message };
  }
};
