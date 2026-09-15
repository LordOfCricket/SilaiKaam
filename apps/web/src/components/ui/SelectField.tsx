import { useId, type SelectHTMLAttributes } from 'react';
import styles from './FormField.module.css';

interface Option {
  value: string;
  label: string;
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Option[];
  placeholder?: string;
  error?: string;
}

export function SelectField({
  label,
  options,
  placeholder,
  error,
  id,
  className,
  ...selectProps
}: SelectFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div className={styles.field}>
      <label htmlFor={fieldId} className={styles.label}>
        {label}
      </label>
      <select
        id={fieldId}
        className={`${styles.input} ${error ? styles.invalid : ''} ${className ?? ''}`.trim()}
        aria-invalid={Boolean(error)}
        {...selectProps}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
