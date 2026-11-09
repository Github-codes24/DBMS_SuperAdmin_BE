import VendorFormField from '../SuperadminPanel/VendorDatabase/vendorDatabaseSchema.js';

const isEmptyValue = (value) => {
  return (
    value === undefined ||
    value === null ||
    value === ''
  );
};

const validateEmail = (value) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

export const validateAndPrepareCustomFields = async (
  customFields = []
) => {
  if (!Array.isArray(customFields)) {
    throw new Error('customFields must be an array.');
  }

  const activeFields = await VendorFormField.find({
    isActive: true,
  }).lean();

  const fieldMap = new Map(
    activeFields.map((field) => [
      field._id.toString(),
      field,
    ])
  );

  const submittedFields = new Map();

  // Validate fields submitted by the vendor
  for (const customField of customFields) {
    if (!customField.fieldId) {
      throw new Error(
        'fieldId is required for custom fields.'
      );
    }

    const fieldId = customField.fieldId.toString();

    const fieldDefinition = fieldMap.get(fieldId);

    if (!fieldDefinition) {
      throw new Error(
        `Invalid or inactive custom field: ${fieldId}`
      );
    }

    // Prevent same field from being submitted twice
    if (submittedFields.has(fieldId)) {
      throw new Error(
        `Duplicate custom field: ${fieldDefinition.label}`
      );
    }

    const value = customField.value;

    // Required field
    if (
      fieldDefinition.required &&
      isEmptyValue(value)
    ) {
      throw new Error(
        `${fieldDefinition.label} is required.`
      );
    }

    // Skip type validation for optional empty fields
    if (isEmptyValue(value)) {
      submittedFields.set(fieldId, {
        fieldId: fieldDefinition._id,
        value: null,
      });

      continue;
    }

    switch (fieldDefinition.type) {
      case 'TEXT':
      case 'TEXTAREA':
        if (typeof value !== 'string') {
          throw new Error(
            `${fieldDefinition.label} must be text.`
          );
        }
        break;

      case 'NUMBER':
        if (
          typeof value !== 'number' ||
          Number.isNaN(value)
        ) {
          throw new Error(
            `${fieldDefinition.label} must be a number.`
          );
        }
        break;

      case 'EMAIL':
        if (
          typeof value !== 'string' ||
          !validateEmail(value)
        ) {
          throw new Error(
            `${fieldDefinition.label} must be a valid email.`
          );
        }
        break;

      case 'DATE':
        if (
          typeof value !== 'string' ||
          Number.isNaN(Date.parse(value))
        ) {
          throw new Error(
            `${fieldDefinition.label} must be a valid date.`
          );
        }
        break;

      case 'DROPDOWN':
        if (
          !fieldDefinition.options.includes(value)
        ) {
          throw new Error(
            `${fieldDefinition.label} has an invalid option.`
          );
        }
        break;

      case 'CHECKBOX':
      case 'TOGGLE':
        if (typeof value !== 'boolean') {
          throw new Error(
            `${fieldDefinition.label} must be true or false.`
          );
        }
        break;

      default:
        throw new Error(
          `Unsupported field type: ${fieldDefinition.type}`
        );
    }

    submittedFields.set(fieldId, {
      fieldId: fieldDefinition._id,
      value,
    });
  }

  // Check required fields that were not submitted at all
  for (const fieldDefinition of activeFields) {
    if (!fieldDefinition.required) {
      continue;
    }

    const submitted = submittedFields.get(
      fieldDefinition._id.toString()
    );

    if (
      !submitted ||
      isEmptyValue(submitted.value)
    ) {
      throw new Error(
        `${fieldDefinition.label} is required.`
      );
    }
  }

  return Array.from(submittedFields.values());
};