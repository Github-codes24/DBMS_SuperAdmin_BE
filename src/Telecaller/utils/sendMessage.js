
import mongoose from 'mongoose';
import VendorNotification from '../models/VendorNotification.js';
import customers from '../../SuperadminPanel/CustomerDatabase/customerSchema.js';
import SuperAdminVendor from '../../SuperadminPanel/VendorDatabase/vendorDatabaseSchema.js';
import SuperAdminCustomer from "../../SuperadminPanel/CustomerDatabase/customerSchema.js"
import { sendEmail } from '../../utils/emailHandler.js';
import  sendSmsMessage  from "../../utils/sendSms.js"
import Customer from "../../SuperadminPanel/CustomerDatabase/customerSchema.js"


// find customer 
const findVendor = async (vendorId) => {
  const id = String(vendorId).trim();

  const identifiers = [
    { vendorId: id },
    { customerId: id },
  ];

  if (mongoose.Types.ObjectId.isValid(id)) {
    identifiers.push({
      _id: new mongoose.Types.ObjectId(id),
    });
  }

  // First: search the regular customers collection
  let customer = await Customer.findOne({
    $or: identifiers,
  }).lean();

  if (customer) return customer;

  // Second: search the actual SuperAdmin customer collection
  const superAdminCustomers =
    mongoose.connection.db.collection("superadmincustomers");

  customer = await superAdminCustomers.findOne({
    $or: identifiers,
  });

  return customer;
};
// send the message through email,sms,whatApp.
export const sendMessage = async ({
  vendorId,
  customerName,
  channel,
  message,
  sentBy,
}) => {
  let deliveryStatus = 'Failed';
  let errorMessage = '';

  try {
    const vendor = await findVendor(vendorId);

    if (!vendor) {
      throw new Error(`Vendor not found: ${vendorId}`);
    }

    const recipientName =
      customerName ||
      vendor.vendorName ||
      vendor.fullName ||
      vendor.ownerName ||
      vendor.companyName ||
      'Vendor';

    if (channel === 'EMAIL') {
      const email = vendor.email?.trim();

      if (!email) throw new Error('Vendor email address is missing');

      const result = await sendEmail({
        to: email,
        toName: recipientName,
        subject: 'Available Subscription Plans - Local Trade Street',
        text: message,
      });

      if (!result?.success) {
        throw new Error(result?.error || 'Email provider failed to accept the message');
      }

      // Provider acceptance is not the same as confirmed delivery.
      deliveryStatus = 'Pending';
    } else if (channel === 'SMS') {
      const phone = (
        vendor.mobileNumber ||
        vendor.registeredPhoneNo ||
        vendor.contactNo ||
        vendor.whatsappNo ||
        vendor.whatsapp
      )?.trim();

      if (!phone) throw new Error('Vendor phone number is missing');

      const result = await sendSmsMessage(phone, message);

      if (!result?.success) {
        throw new Error(result?.error || 'SMS provider failed to accept the message');
      }

      deliveryStatus = 'Pending';
    } else if (channel === 'WHATSAPP') {
      throw new Error('WhatsApp provider is not configured');
    } else {
      throw new Error(`Unsupported notification channel: ${channel}`);
    }
  } catch (err) {

    errorMessage = err.message;
    deliveryStatus = 'Failed';
  
    console.error('[Notification Error]', {
      channel,
      vendorId,
      error: err.message,
      stack: err.stack,
    });
  }
  // Keep the attempt in the database, including failures.
  return VendorNotification.create({
    vendorId,
    customerName: customerName || '',
    channel,
    message,
    deliveryStatus,
    sentBy,
    sentAt: new Date(),
    ...(errorMessage ? { errorMessage } : {}),
  });
};
