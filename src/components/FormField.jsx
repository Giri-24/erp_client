import React from 'react';

/**
 * FormField Component
 * 
 * A unified form field wrapper that combines label + input/select/textarea with proper alignment.
 * Handles label styling, input styling, and error messages.
 * 
 * @param {string} label - Label text
 * @param {boolean} required - Shows required asterisk
 * @param {JSX.Element|React.ReactNode} children - Input element(s)
 * @param {string} error - Error message to display
 * @param {string} className - Additional wrapper classes
 */
const FormField = ({ 
  label, 
  required = false, 
  children, 
  error, 
  className = '',
  helperText 
}) => {
  return (
    <div className={`form-field ${className}`}>
      {label && (
        <label className={`label ${required ? 'required' : ''}`}>
          {label}
        </label>
      )}
      {children}
      {error && (
        <span style={{ 
          fontSize: '12px', 
          color: '#ba1a1a', 
          marginTop: '4px',
          display: 'block',
          fontWeight: 600
        }}>
          {error}
        </span>
      )}
      {helperText && !error && (
        <span style={{ 
          fontSize: '11px', 
          color: '#43474d', 
          marginTop: '4px',
          display: 'block',
          fontWeight: 500
        }}>
          {helperText}
        </span>
      )}
    </div>
  );
};

export default FormField;
