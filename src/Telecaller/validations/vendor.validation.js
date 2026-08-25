/**
 * Telecaller CRM — Vendor Validations
 * Pure validation functions — return { valid: boolean, message: string }.
 * No external libraries required; keeps the validation layer thin and portable.
 */

// ─── Regex patterns ───────────────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// ─── Personal Info Validation ─────────────────────────────────────────────────
export const validatePersonalUpdate = (body) => {
  const { vendorName, email, gst, address } = body;

  if (email && !EMAIL_REGEX.test(email)) {
    return { valid: false, message: 'Invalid email address format.' };
  }

  if (gst && !GST_REGEX.test(gst.trim().toUpperCase())) {
    return { valid: false, message: 'Invalid GST number format. Expected format: 22AAAAA0000A1Z5' };
  }

  if (address && address.trim().length > 500) {
    return { valid: false, message: 'Address must not exceed 500 characters.' };
  }

  return { valid: true };
};

// ─── Contact & Payment Validation ────────────────────────────────────────────
export const validateContactPayment = (body) => {
  const { whatsapp, alternateContact, email } = body;

  if (whatsapp && !PHONE_REGEX.test(whatsapp.trim())) {
    return { valid: false, message: 'WhatsApp number must be exactly 10 digits.' };
  }

  if (alternateContact && !PHONE_REGEX.test(alternateContact.trim())) {
    return { valid: false, message: 'Alternate contact must be exactly 10 digits.' };
  }

  if (email && !EMAIL_REGEX.test(email)) {
    return { valid: false, message: 'Invalid email address format.' };
  }

  return { valid: true };
};

// ─── Followup Validation ──────────────────────────────────────────────────────
export const validateFollowup = (body) => {
  const { followupType, status } = body;

  const validTypes = ['CALL', 'MEETING', 'VISIT', 'PAYMENT', 'RENEWAL'];
  const validStatuses = ['PENDING', 'DONE', 'MISSED'];

  if (!followupType || !validTypes.includes(followupType)) {
    return {
      valid: false,
      message: `followupType must be one of: ${validTypes.join(', ')}.`,
    };
  }

  if (status && !validStatuses.includes(status)) {
    return {
      valid: false,
      message: `status must be one of: ${validStatuses.join(', ')}.`,
    };
  }

  return { valid: true };
};

// ─── Discount Validation ──────────────────────────────────────────────────────
export const validateDiscount = (discount) => {
  const val = Number(discount);
  if (isNaN(val) || val < 0 || val > 100) {
    return { valid: false, message: 'Discount must be a number between 0 and 100.' };
  }
  return { valid: true };
};


// ─── Profile Validation ───────────────────────────────────────────────────────
export const validateProfileUpdate = (body) => {
  const { phone, email } = body;

  if (phone && !PHONE_REGEX.test(phone.trim())) {
    return { valid: false, message: 'Phone number must be exactly 10 digits.' };
  }

  if (email && !EMAIL_REGEX.test(email)) {
    return { valid: false, message: 'Invalid email address format.' };
  }

  return { valid: true };
};
