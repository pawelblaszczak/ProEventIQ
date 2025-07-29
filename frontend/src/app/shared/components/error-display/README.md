# Error Display Component

A reusable Angular component for displaying error messages with a consistent Material Design interface.

## Usage

```html
<app-error-display 
  [error]="errorMessage" 
  title="Custom Error Title" 
  icon="error_outline"
  cssClass="my-custom-class">
</app-error-display>
```

## Inputs

| Input | Type | Default | Required | Description |
|-------|------|---------|----------|-------------|
| `error` | `string` | - | ✅ | The error message to display |
| `title` | `string` | `'Error'` | ❌ | The title to display in the error card |
| `icon` | `string` | `'error_outline'` | ❌ | The Material icon to display |
| `cssClass` | `string` | `''` | ❌ | Additional CSS classes to apply |

## Features

- **Material Design**: Uses Material Card and Icon components
- **Responsive**: Adapts to different screen sizes
- **Customizable**: Configurable title, icon, and styling
- **Animated**: Includes fade-in animation
- **Accessible**: Proper semantic structure and ARIA support

## Examples

### Basic Usage
```html
<app-error-display [error]="'Something went wrong'"></app-error-display>
```

### Custom Title and Icon
```html
<app-error-display 
  [error]="'Network connection failed'" 
  title="Connection Error"
  icon="wifi_off">
</app-error-display>
```

### With Custom Styling
```html
<app-error-display 
  [error]="errorMessage" 
  title="Validation Error"
  cssClass="validation-error">
</app-error-display>
```

## Styling

The component uses CSS custom properties for theming:
- `--mat-sys-on-surface` for text color
- `--mat-sys-on-surface-variant` for secondary text

You can override these or add custom styles using the `cssClass` input.
