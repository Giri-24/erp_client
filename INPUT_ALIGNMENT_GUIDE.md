# Input Field Alignment - Implementation Guide

## Overview
A complete vertical alignment system for input fields with proper centering of text, placeholders, and icons.

## CSS Classes Available

### `.input` - Basic Input/Select/Date Fields
For text inputs, dates, selects. 44px fixed height, vertically centered.

```jsx
<input type="text" placeholder="Full Name" className="input" />
<input type="date" className="input" />
<select className="input">
  <option>Select Option</option>
</select>
```

### `.label` - Form Labels
Properly styled labels with consistent sizing and spacing.

```jsx
<label className="label">Student Name</label>
<input className="input" />
```

### `.label.required` - Required Field Indicator
Automatically adds red asterisk for required fields.

```jsx
<label className="label required">Email Address</label>
<input className="input" type="email" />
```

### `.file` - File Upload Inputs
Styled file inputs with custom upload button.

```jsx
<label className="label">Upload Document</label>
<input type="file" className="file" />
```

### `.form-field` - Complete Field Wrapper
Combines label + input with proper spacing and alignment.

```jsx
<div className="form-field">
  <label className="label required">Email</label>
  <input className="input" type="email" />
</div>
```

## React Components

### InputWithIcon - Icon-based Input
Render an input with a centered Material Symbols icon inside.

```jsx
import InputWithIcon from './components/InputWithIcon';

// Basic usage
<InputWithIcon 
  icon="person" 
  placeholder="Full Name" 
/>

// With filled icon variant
<InputWithIcon 
  icon="email" 
  iconFilled={true}
  placeholder="Email Address" 
/>

// With additional classes and all input props
<InputWithIcon 
  icon="lock" 
  type="password"
  placeholder="Password"
  onChange={(e) => setPassword(e.target.value)}
  disabled={false}
/>
```

### FormField - Wrapper Component
Unified wrapper for label + input + error handling.

```jsx
import FormField from './components/FormField';
import InputWithIcon from './components/InputWithIcon';

<FormField 
  label="Email Address" 
  required={true}
  error={errors.email?.message}
  helperText="We'll never share your email"
>
  <InputWithIcon 
    icon="email" 
    type="email" 
    placeholder="Enter email"
    {...register('email')}
  />
</FormField>

<FormField 
  label="Password" 
  required={true}
  error={errors.password?.message}
>
  <InputWithIcon 
    icon="lock" 
    type="password" 
    placeholder="Create secure password"
    {...register('password')}
  />
</FormField>
```

## Manual HTML Usage (Without React)
If using plain HTML or vanilla JS:

```html
<!-- Basic input field -->
<div class="form-field">
  <label class="label">Student Name</label>
  <input class="input" type="text" placeholder="Full Name" />
</div>

<!-- Input with icon -->
<div class="form-field">
  <label class="label required">Email Address</label>
  <div class="input-icon-wrapper">
    <span class="input-icon">
      <span class="material-symbols-outlined">email</span>
    </span>
    <input class="input" type="email" placeholder="Enter email" />
  </div>
</div>

<!-- File upload -->
<div class="form-field">
  <label class="label required">Upload Photo</label>
  <input class="file" type="file" accept="image/*" />
</div>

<!-- Date field -->
<div class="form-field">
  <label class="label">Date of Birth</label>
  <input class="input" type="date" />
</div>

<!-- Select dropdown -->
<div class="form-field">
  <label class="label required">Gender</label>
  <select class="input">
    <option value="">Select Gender</option>
    <option value="MALE">Male</option>
    <option value="FEMALE">Female</option>
  </select>
</div>

<!-- Textarea -->
<div class="form-field">
  <label class="label">Additional Comments</label>
  <textarea class="input" placeholder="Enter your comments..."></textarea>
</div>
```

## Key Properties Explained

### Height & Line-Height
- **Height**: 44px - Consistent across all input types
- **Line-height**: 44px - Ensures text is perfectly vertically centered
- **Padding**: 0 12px (horizontal only)

### Icons
- **Position**: Absolute, inside `.input-icon-wrapper`
- **Left offset**: 12px (matches input padding)
- **Vertical centering**: `top: 50%; transform: translateY(-50%)`
- **Size**: 20px × 20px
- **Color**: #43474d (on-surface-variant)

### Focus/Hover States
- **Focus**: Border #2563eb + 3px blue shadow
- **Hover**: Border #999999 (light gray)
- **Disabled**: Gray background #f5f5f5

### Label Styling
- **Font size**: 12px
- **Font weight**: 700
- **Color**: #171c1f (primary text)
- **Transform**: UPPERCASE
- **Letter spacing**: 0.5px
- **Required indicator**: Red asterisk (#ba1a1a)

## Best Practices

1. **Always use `.label` with inputs** - Maintains consistency
2. **Use `InputWithIcon` for common patterns** - Person, email, lock, phone, etc.
3. **Wrap complex fields with `.form-field`** - Better spacing and error handling
4. **For date inputs** - Use type="date" with `.input` class
5. **For file uploads** - Use `.file` class instead of `.input`
6. **Icons with inputs** - Always use `.input-icon-wrapper` parent div
7. **Remove inline styles** - Use classes instead for consistency

## Common Patterns

### Search Field
```jsx
<InputWithIcon 
  icon="search" 
  type="text"
  placeholder="Search students..."
/>
```

### Email Field
```jsx
<FormField label="Email Address" required={true}>
  <InputWithIcon 
    icon="email" 
    type="email"
    placeholder="your.email@school.edu"
  />
</FormField>
```

### Phone Field
```jsx
<InputWithIcon 
  icon="phone" 
  type="tel"
  placeholder="Enter phone number"
  maxLength={10}
/>
```

### Login Form
```jsx
<FormField label="Email">
  <InputWithIcon icon="person" type="email" placeholder="Enter email" />
</FormField>

<FormField label="Password">
  <InputWithIcon icon="lock" type="password" placeholder="Enter password" />
</FormField>
```

## Customization

### Add Custom Classes
```jsx
<input 
  className="input custom-border-blue" 
  placeholder="Custom styled input"
/>
```

### Styling with Tailwind (Fallback)
If needed, add Tailwind classes to wrapper:
```jsx
<div className="form-field mb-4">
  <label className="label">Name</label>
  <input className="input w-full" />
</div>
```

### Dark Mode Ready
All colors use CSS variables and are dark-mode compatible (when needed):
```css
@media (prefers-color-scheme: dark) {
  .input { ... }
  .label { ... }
}
```

## Changes Made

The following files were created/modified:

1. **`src/index.css`** - Added ~180 lines of form styling
2. **`src/components/InputWithIcon.jsx`** - New reusable component
3. **`src/components/FormField.jsx`** - New wrapper component

## Migration

To migrate existing forms:

1. Replace `className="input"` usage - Already done ✅
2. Wrap inputs with `InputWithIcon` for better UX
3. Use `FormField` wrapper for complex forms
4. Test all form pages for proper alignment
5. Check icons display correctly with `material-symbols-outlined`
