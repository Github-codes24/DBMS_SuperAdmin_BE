import dotenv from 'dotenv';

dotenv.config();

export const sendEmail = async ({
  to,
  toName = '',
  subject,
  html,
  text,
  templateId,
  variables = {},
}) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const fromEmail = process.env.MSG91_FROM_EMAIL;
  const fromName = process.env.EMAIL_FROM_NAME || 'Local Trade Street';
  const domain = process.env.MSG91_DOMAIN;

  const recipientEmail = Array.isArray(to) ? to[0] : to;

  if (!recipientEmail || !recipientEmail.trim()) {
    return {
      success: false,
      error: 'Recipient email address is missing or empty.',
    };
  }

  const recipientName = toName || recipientEmail.split('@')[0];
  const finalSubject = subject || 'Notification from Local Trade Street';

  console.log(`[Universal Email Handler] Preparing email to: ${recipientEmail} | Subject: "${finalSubject}"`);

  // Fallback Handling when API Key is missing/unconfigured in .env
  if (!authKey || authKey.includes('YOUR_') || authKey.trim() === '') {
    // In Production: Explicitly return error so missing .env key is immediately noticed
    if (process.env.NODE_ENV === 'production') {
      console.error('[Email Handler Error] MSG91_AUTH_KEY is missing or unconfigured in production environment.');
      return {
        success: false,
        error: 'Email service configuration error: MSG91_AUTH_KEY is missing in server environment (.env).',
      };
    }

    // In Local/Dev Mode: Print Mock Log to console for easy testing
    console.log('================ [UNIVERSAL EMAIL DEV MOCK] ================');
    console.log(`To: ${recipientName} <${recipientEmail}>`);
    console.log(`Subject: ${finalSubject}`);
    if (templateId) {
      console.log(`Template ID: ${templateId}`);
      console.log(`Variables:`, JSON.stringify(variables, null, 2));
    } else {
      console.log(`Body:\n${text || html || 'No body provided'}`);
    }
    console.log('===========================================================');

    return {
      success: true,
      mocked: true,
    };
  }

  // Real MSG91 Email API Dispatch
  try {
    const payload = {
      to: [
        {
          name: recipientName,
          email: recipientEmail.trim(),
        },
      ],
      from: {
        name: fromName,
        email: fromEmail,
      },
      domain: domain,
      ...(templateId
        ? {
          template_id: templateId,
          variables: variables,
        }
        : {
          subject: finalSubject,
          body: html || text || '',
        }),
    };

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
      console.error(`[Email Handler Error] Provider HTTP ${response.status}: ${responseText}`);
      return {
        success: false,
        error: `MSG91 Email API Error (${response.status}): ${responseText}`,
        rawResponse: responseText,
      };
    }

    console.log(`[Universal Email Handler Success] Email dispatched successfully to ${recipientEmail}`);
    return {
      success: true,
      rawResponse: responseText,
    };
  } catch (err) {
    console.error('[Universal Email Handler Exception]', err);
    return {
      success: false,
      error: `Network Exception during email dispatch: ${err.message}`,
    };
  }
};

/**
 * Helper: Send Vendor Welcome Credentials Email (Includes Styled HTML Template)
 */
export const sendVendorCredentialsEmail = async ({ toEmail, vendorName, vendorId, password }) => {
  const loginUrl = process.env.VENDOR_PANEL_LOGIN_URL || 'https://vendor.lts-dbms.com/login';
  const templateId = process.env.MSG91_VENDOR_WELCOME_TEMPLATE_ID;

  // Plain Text Version
  const textBody = `Hello ${vendorName || 'Vendor Partner'},\n\nYour Vendor account has been successfully created on Local Trade Street.\n\nYou can access your Vendor Panel using the credentials below:\n\nVendor ID / Username: ${vendorId}\nPassword: ${password}\n\nVendor Panel:\n${loginUrl}\n\nPlease log in using these credentials and change your password after your first login.\n\nRegards,\nLocal Trade Street Team`;

  // HTML Styled Template Version
  const htmlBody = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; }
      .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
      .header { background: #1e3a8a; color: #ffffff; padding: 22px; text-align: center; }
      .header h2 { margin: 0; font-size: 20px; font-weight: 600; }
      .body { padding: 25px; color: #334155; line-height: 1.6; font-size: 15px; }
      .box { background: #f8fafc; border-left: 4px solid #2563eb; padding: 15px 20px; margin: 20px 0; border-radius: 4px; }
      .item { margin: 6px 0; font-family: 'Courier New', monospace; font-size: 15px; }
      .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 10px 22px; border-radius: 5px; font-weight: bold; margin: 15px 0; }
      .footer { background: #f1f5f9; padding: 14px; text-align: center; font-size: 12px; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <h2>Local Trade Street</h2>
      </div>
      <div class="body">
        <p>Hello <strong>${vendorName || 'Vendor Partner'}</strong>,</p>
        <p>Your Vendor account has been successfully created on Local Trade Street.</p>
        <p>You can access your Vendor Panel using the credentials below:</p>
        
        <div class="box">
          <div class="item"><strong>Vendor ID / Username:</strong> ${vendorId}</div>
          <div class="item"><strong>Password:</strong> ${password}</div>
        </div>

        <p><a href="${loginUrl}" target="_blank" class="btn">Login to Vendor Panel</a></p>
        
        <p>Please log in using these credentials and change your password after your first login.</p>
        <br/>
        <p>Regards,<br/><strong>Local Trade Street Team</strong></p>
      </div>
      <div class="footer">
        © Local Trade Street. All rights reserved.
      </div>
    </div>
  </body>
  </html>
  `;

  return await sendEmail({
    to: toEmail,
    toName: vendorName,
    subject: 'Welcome to Local Trade Street – Vendor Account Created',
    text: textBody,
    html: htmlBody,
    templateId: templateId,
    variables: {
      vendor_name: vendorName,
      vendor_id: vendorId,
      password: password,
      login_url: loginUrl,
    },
  });
};

/**
 * Helper: Send Telecaller Credentials Email (Includes Styled HTML Template)
 */
export const sendTelecallerCredentialsEmail = async ({ toEmail, telecallerName, telecallerId, password }) => {
  const loginUrl = process.env.TELECALLER_LOGIN_URL || 'https://telecaller.lts-dbms.com/login';
  const templateId = process.env.MSG91_TELECALLER_WELCOME_TEMPLATE_ID;

  // Plain Text Version
  const textBody = `Hello ${telecallerName || 'Telecaller'},\n\nYour Telecaller account has been created successfully.\n\nCredentials:\nUsername: ${telecallerId || toEmail}\nPassword: ${password}\nLogin Link: ${loginUrl}\n\nRegards,\nLocal Trade Street Team`;

  // HTML Styled Template Version
  const htmlBody = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; }
      .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
      .header { background: #0f766e; color: #ffffff; padding: 22px; text-align: center; }
      .header h2 { margin: 0; font-size: 20px; font-weight: 600; }
      .body { padding: 25px; color: #334155; line-height: 1.6; font-size: 15px; }
      .box { background: #f0fdf4; border-left: 4px solid #0d9488; padding: 15px 20px; margin: 20px 0; border-radius: 4px; }
      .item { margin: 6px 0; font-family: 'Courier New', monospace; font-size: 15px; }
      .btn { display: inline-block; background-color: #0d9488; color: #ffffff !important; text-decoration: none; padding: 10px 22px; border-radius: 5px; font-weight: bold; margin: 15px 0; }
      .footer { background: #f1f5f9; padding: 14px; text-align: center; font-size: 12px; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <h2>Local Trade Street – Telecaller CRM</h2>
      </div>
      <div class="body">
        <p>Hello <strong>${telecallerName || 'Telecaller'}</strong>,</p>
        <p>Your Telecaller account has been successfully created on Local Trade Street.</p>
        <p>You can access your Telecaller Panel using the credentials below:</p>
        
        <div class="box">
          <div class="item"><strong>Telecaller ID / Username:</strong> ${telecallerId || toEmail}</div>
          <div class="item"><strong>Password:</strong> ${password}</div>
        </div>

        <p><a href="${loginUrl}" target="_blank" class="btn">Login to Telecaller Panel</a></p>
        
        <p>Please log in using these credentials and change your password after your first login.</p>
        <br/>
        <p>Regards,<br/><strong>Local Trade Street Team</strong></p>
      </div>
      <div class="footer">
        © Local Trade Street. All rights reserved.
      </div>
    </div>
  </body>
  </html>
  `;

  return await sendEmail({
    to: toEmail,
    toName: telecallerName,
    subject: 'Welcome to Local Trade Street – Telecaller Account Credentials',
    text: textBody,
    html: htmlBody,
    templateId: templateId,
    variables: {
      name: telecallerName,
      email: toEmail,
      password: password,
      link: loginUrl,
    },
  });
};

/**
 * Helper: Send OTP / Password Reset Email
 */
export const sendPasswordResetEmail = async ({ toEmail, userName, otp }) => {
  const textBody = `Hello ${userName || 'User'},\n\nYour password reset OTP is: ${otp}\n\nThis OTP is valid for 10 minutes. Do not share it with anyone.\n\nRegards,\nLocal Trade Street Team`;

  return await sendEmail({
    to: toEmail,
    toName: userName,
    subject: 'Password Reset Request – Local Trade Street',
    text: textBody,
  });
};

export default {
  sendEmail,
  sendVendorCredentialsEmail,
  sendTelecallerCredentialsEmail,
  sendPasswordResetEmail,
};
