import React, { forwardRef } from 'react';

/**
 * InputWithIcon Component
 * 
 * Renders an input field with a perfectly centered icon inside the input container.
 * Ensures vertical and horizontal centering of both icon and text.
 * 
 * @param {string} icon - Material Symbols icon name (e.g., 'person', 'email')
 * @param {boolean} iconFilled - Whether to use filled variant of icon (default: false)
 * @param {string} className - Additional classes to apply to input
 * @param {object} props - All other input props (placeholder, type, onChange, etc.)
 */
const InputWithIcon = forwardRef(({ 
  icon, 
  iconFilled = false,
  className = '',
  ...props 
}, ref) => {
  return (
    <div className={`input-icon-wrapper ${iconFilled ? 'icon-filled' : ''}`}>
      <span className="input-icon">
        <span className="material-symbols-outlined">
          {icon}
        </span>
      </span>
      <input
        ref={ref}
        className={`input ${className}`}
        {...props}
      />
    </div>
  );
});

InputWithIcon.displayName = 'InputWithIcon';

export default InputWithIcon;
