import crypto from 'crypto';

export const generateReferCode = () => {
  const random = crypto
    .randomBytes(4)
    .toString('hex')
    .toUpperCase();

  return `AGT-${random}`;
};