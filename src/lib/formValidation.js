import React from 'react';

// Centralized form validation utilities
export const validators = {
  email: (value) => {
    if (!value) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format';
    return null;
  },

  required: (value, fieldName = 'This field') => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} is required`;
    }
    return null;
  },

  minLength: (value, min, fieldName = 'Field') => {
    if (value && value.length < min) {
      return `${fieldName} must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (value, max, fieldName = 'Field') => {
    if (value && value.length > max) {
      return `${fieldName} must not exceed ${max} characters`;
    }
    return null;
  },

  number: (value) => {
    if (value === '' || value === null) return null;
    if (isNaN(value)) return 'Must be a number';
    return null;
  },

  positiveNumber: (value) => {
    const numError = validators.number(value);
    if (numError) return numError;
    if (value !== '' && Number(value) < 0) return 'Must be a positive number';
    return null;
  },

  date: (value) => {
    if (!value) return 'Date is required';
    if (isNaN(new Date(value).getTime())) return 'Invalid date format';
    return null;
  },

  futureDate: (value) => {
    const dateError = validators.date(value);
    if (dateError) return dateError;
    if (new Date(value) < new Date()) return 'Date cannot be in the past';
    return null;
  },

  fileSize: (file, maxMB = 5) => {
    if (!file) return null;
    if (file.size > maxMB * 1024 * 1024) {
      return `File must be smaller than ${maxMB}MB`;
    }
    return null;
  },

  fileType: (file, allowedTypes = []) => {
    if (!file) return null;
    if (!allowedTypes.includes(file.type)) {
      return `File type must be one of: ${allowedTypes.join(', ')}`;
    }
    return null;
  },
};

// Validation error state management
export const useFormValidation = (initialState = {}) => {
  const [errors, setErrors] = React.useState(initialState);

  const validate = (fieldName, value, validatorFn) => {
    const error = validatorFn(value);
    setErrors(prev => ({
      ...prev,
      [fieldName]: error,
    }));
    return !error;
  };

  const clearError = (fieldName) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const hasErrors = Object.values(errors).some(error => error !== null);

  return { errors, validate, clearError, hasErrors, setErrors };
};