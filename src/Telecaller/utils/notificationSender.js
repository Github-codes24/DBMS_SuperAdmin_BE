/**
 * Telecaller CRM — Notification Sender Utility
 * Handles delivery of notifications via SMS, Email, and WhatsApp.
 * Creates a VendorNotification log entry for every send attempt.
 */
import VendorNotification from '../models/VendorNotification.js';
/**
 * Send a notification through a given channel and persist the log.
 *
 * @param {object} opts
 * @param {string} opts.vendorId        - Vendor ObjectId (string)
 * @param {string} opts.customerName    - Display name of the recipient
 * @param {'SMS'|'EMAIL'|'WHATSAPP'} opts.channel - Delivery channel
 * @param {string} opts.message         - Notification message body
 * @param {string} opts.sentBy          - Telecaller ObjectId (string)
 * @returns {Promise<object>} Saved VendorNotification document
 */
export const sendNotification = async ({ vendorId, customerName, channel, message, sentBy }) => {
  let deliveryStatus = 'Pending';

  try {
    // ─── Channel-specific delivery stubs ───────────────────────────────────
    // Replace these stubs with real provider SDK calls (Twilio, SendGrid, etc.)
    if (channel === 'SMS') {
      // TODO: Integrate Twilio / SMS provider
      console.log(`[SMS] Sending to vendor ${vendorId}: ${message}`);
      deliveryStatus = 'Delivered';
    } else if (channel === 'EMAIL') {
      // TODO: Integrate SendGrid / Nodemailer
      console.log(`[EMAIL] Sending to vendor ${vendorId}: ${message}`);
      deliveryStatus = 'Delivered';
    } else if (channel === 'WHATSAPP') {
      // TODO: Integrate WhatsApp Business API / Twilio WhatsApp
      console.log(`[WHATSAPP] Sending to vendor ${vendorId}: ${message}`);
      deliveryStatus = 'Delivered';
    }
  } catch (err) {
    console.error(`[Notification Error] Channel ${channel}:`, err.message);
    deliveryStatus = 'Failed';
  }

  // Persist notification log regardless of delivery outcome
  const notification = await VendorNotification.create({
    vendorId,
    customerName,
    channel,
    message,
    deliveryStatus,
    sentBy,
    sentAt: new Date(),
  });

  return notification;
};
