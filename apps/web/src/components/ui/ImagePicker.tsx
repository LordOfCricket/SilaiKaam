'use client';

import { useId, useRef, useState } from 'react';
import { ALLOWED_IMAGE_MIME_TYPES, MAX_PHOTO_BYTES } from '@silaikaam/validation';
import styles from './ImagePicker.module.css';

export interface PickedImage {
  id: string;
  file: File;
  previewUrl: string;
}

interface ImagePickerProps {
  label: string;
  images: PickedImage[];
  onChange: (images: PickedImage[]) => void;
  maxFiles?: number;
  error?: string;
  disabled?: boolean;
}

const MAX_MB = Math.round(MAX_PHOTO_BYTES / (1024 * 1024));

export function ImagePicker({
  label,
  images,
  onChange,
  maxFiles = 1,
  error,
  disabled,
}: ImagePickerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setLocalError(null);

    const remainingSlots = maxFiles - images.length;
    const files = Array.from(fileList).slice(0, Math.max(remainingSlots, 0));
    if (files.length === 0) {
      setLocalError(`You can add at most ${maxFiles} photo${maxFiles === 1 ? '' : 's'}.`);
      return;
    }

    const accepted: PickedImage[] = [];
    for (const file of files) {
      if (
        !ALLOWED_IMAGE_MIME_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])
      ) {
        setLocalError('Only JPEG, PNG, or WEBP images are supported.');
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        setLocalError(`Each photo must be at most ${MAX_MB}MB.`);
        continue;
      }
      accepted.push({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (accepted.length > 0) onChange([...images, ...accepted]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeImage = (id: string) => {
    const target = images.find((img) => img.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange(images.filter((img) => img.id !== id));
  };

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <div className={styles.grid}>
        {images.map((img) => (
          <div key={img.id} className={styles.thumb}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not a remote image */}
            <img src={img.previewUrl} alt="" />
            <button
              type="button"
              className={styles.removeButton}
              onClick={() => removeImage(img.id)}
              aria-label="Remove photo"
              disabled={disabled}
            >
              ✕
            </button>
          </div>
        ))}
        {images.length < maxFiles ? (
          <button
            type="button"
            className={styles.addButton}
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            + Add photo
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ALLOWED_IMAGE_MIME_TYPES.join(',')}
        multiple={maxFiles > 1}
        hidden
        onChange={(e) => handleFiles(e.currentTarget.files)}
        disabled={disabled}
      />
      {error || localError ? (
        <p className={styles.error} role="alert">
          {error || localError}
        </p>
      ) : (
        <p className={styles.hint}>JPEG, PNG, or WEBP — up to {MAX_MB}MB each.</p>
      )}
    </div>
  );
}
