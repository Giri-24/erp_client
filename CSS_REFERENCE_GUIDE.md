# Input Alignment - Quick CSS Reference

## Class Selectors

```css
/* Text Input - 44px height, perfectly centered */
.input {
  height: 44px;
  line-height: 44px;
  padding: 0 12px;
  border: 1px solid #d3d3d3;
  border-radius: 8px;
  vertical-align: middle;
}

/* Labels - Uppercase, compact  */
.label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

/* File Uploads - Styled button */
.file {
  height: 44px;
  padding: 0 12px;
  border: 1px solid #d3d3d3;
  border-radius: 8px;
}

/* Icon Wrapper - Flex container */
.input-icon-wrapper {
  display: flex;
  align-items: center;
  height: 44px;
  border: 1px solid #d3d3d3;
  border-radius: 8px;
  padding: 0;
}

/* Icon Inside - Perfectly centered */
.input-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
}

/* Form Field Wrapper */
.form-field {
  display: flex;
  flex-direction: column;
  margin-bottom: 0;
}

/* Focus States - Blue highlight */
.input:focus,
.input-icon-wrapper:focus-within {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  outline: none;
}

/* Hover States - Slight border change */
.input:hover:not(:focus),
.input-icon-wrapper:hover:not(:focus-within) {
  border-color: #999999;
}

/* Disabled States - Gray background */
.input:disabled,
select.input:disabled {
  background: #f5f5f5;
  color: #999999;
  cursor: not-allowed;
}
```

## Properties Breakdown

### Heights & Spacing
- `height`: 44px - Consistent across all input types
- `line-height`: 44px - Centers text vertically
- `padding` (horizontal): 12px - Left/right spacing
- `padding` (with icon): 0 12px 0 40px - Icon + text spacing

### Icon Positioning
- Icon width/height: 20px
- Icon left offset: 12px (matches input padding)
- Icon vertical centering: `top: 50%; transform: translateY(-50%)`
- Icon color: #43474d (on-surface-variant)

### Colors
| State | Border | Background | Text |
|-------|--------|-----------|------|
| Default | #d3d3d3 | white | #171c1f |
| Focus | #2563eb | white | #171c1f |
| Hover | #999999 | white | #171c1f |
| Disabled | #d3d3d3 | #f5f5f5 | #999999 |

### Border Radius
- Input fields: 8px
- Buttons (submit): 8px
- Components: 12px

### Typography
- Input text: 13px, font-weight: 500
- Placeholder: 13px, color: #999999
- Labels: 12px, font-weight: 700, uppercase
- Helper text: 11px, color: #43474d
- Error text: 12px, color: #ba1a1a

## Common Use Cases

### Basic Text Input
```html
<input class="input" type="text" placeholder="Enter name">
```

### Input with Label
```html
<label class="label">First Name</label>
<input class="input" type="text" placeholder="John">
```

### Required Field
```html
<label class="label required">Email Address</label>
<input class="input" type="email">
```

### Input with Icon
```html
<div class="input-icon-wrapper">
  <span class="input-icon">
    <span class="material-symbols-outlined">email</span>
  </span>
  <input class="input" type="email" placeholder="Enter email">
</div>
```

### Select Dropdown
```html
<label class="label">Select Option</label>
<select class="input">
  <option>Choose one</option>
</select>
```

### Date Field
```html
<label class="label">Date of Birth</label>
<input class="input" type="date">
```

### File Upload
```html
<label class="label">Upload File</label>
<input class="file" type="file">
```

### Full Form Field
```html
<div class="form-field">
  <label class="label required">Name</label>
  <div class="input-icon-wrapper">
    <span class="input-icon">
      <span class="material-symbols-outlined">person</span>
    </span>
    <input class="input" type="text" placeholder="Enter full name">
  </div>
</div>
```

## Alignment Mechanics

### Why 44px Height?
- Standard Material Design button height
- Large enough for touch targets (minimum 44px × 44px)
- Consistent with design system
- Works well with most icon sizes

### Why Line-height = Height?
- Single-line text elements (text, date, time, email)
- Vertically centers text without extra padding
- Works across all browsers
- No pseudo-element hacks needed

### Icon Centering Formula
```
Container height: 44px
Icon height: 20px
Top position: 50% = 22px
Transform: translateY(-50%) = -10px
Final vertical center: 22px - 10px = 12px from top ✓
```

### Text to Icon Spacing
```
Icon right edge: left(12px) + width(20px) = 32px
Input padding: 12px (left)
Icon area: 32px + 8px overlap = 40px
Input text starts: at 40px from left ✓
```

## Focus States Visualization

### Before Focus
```
┌─────────────────────────────┐
│ person  [Text input here]    │
└─────────────────────────────┘
```

### After Focus (Blue border + shadow)
```
╔═════════════════════════════╗ ← Blue #2563eb
║ person  [Text input here]    ║
╚═════════════════════════════╝
   (3px rgba(37, 99, 235, 0.1) shadow)
```

## Browser Support
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 12+)
- Mobile browsers: Full support

## Accessibility Features
- ✅ Color contrast meets WCAG AA
- ✅ Focus states clearly visible
- ✅ Labels properly associated
- ✅ Error messages announced
- ✅ Touch targets 44px × 44px minimum
- ✅ Required indicators visible

## Common Issues & Fixes

### Text not centered
❌ `padding: 10px 12px` - Creates extra vertical space
✅ `padding: 0 12px` + `line-height: 44px` - Perfect centering

### Icon misaligned
❌ `position: relative; top: 2px` - Inconsistent
✅ `position: absolute; top: 50%; transform: translateY(-50%)` - Reliable

### Extra vertical spacing
❌ `margin: 8px 0` on inputs - Creates gaps
✅ `margin: 0` + `.form-field` gap - Consistent

### Icon not centered horizontally
❌ `width: 24px; left: 10px` - Off-center
✅ `width: 20px; left: 12px` - Matches design

## Testing Checklist

- [ ] Text vertically centered in input (44px height)
- [ ] Icon vertically centered at 50% in container
- [ ] Icon left offset exactly 12px
- [ ] Input text padding exactly 12px
- [ ] Focus state shows blue border
- [ ] Hover state shows gray border
- [ ] Placeholder text centered
- [ ] Select/dropdown uses same 44px height
- [ ] Date pickers proper alignment
- [ ] File inputs styled correctly
- [ ] Labels 6px above input (margin-bottom: 6px)
- [ ] All fonts and colors match design system
- [ ] Cross-browser consistency (Chrome, Firefox, Safari)
- [ ] Mobile/touch friendly (no hover issues)
- [ ] Icon library (Material Symbols) loads correctly
