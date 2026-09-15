'use client';

import { useState } from 'react';
import type { AddressDto } from '@silaikaam/types';
import { FormBanner } from '@/components/ui/FormBanner';
import { ApiError, NetworkError } from '@/lib/api-client';
import { accountApi } from '../api';
import { AddressCard } from './AddressCard';
import { AddressForm } from './AddressForm';
import styles from './AccountView.module.css';
import cardStyles from './AddressCard.module.css';

type Mode = { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; address: AddressDto };

export function AddressesSection({
  addresses,
  onChange,
}: {
  addresses: AddressDto[];
  onChange: (addresses: AddressDto[]) => void;
}) {
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const handleCreate = async (values: {
    label: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
  }) => {
    const created = await accountApi.createAddress(values);
    const next = values.isDefault ? addresses.map((a) => ({ ...a, isDefault: false })) : addresses;
    onChange([...next, created]);
    setMode({ kind: 'list' });
  };

  const handleUpdate = async (
    id: string,
    values: {
      label: string;
      line1: string;
      line2: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      isDefault: boolean;
    },
  ) => {
    const updated = await accountApi.updateAddress(id, values);
    const next = addresses.map((a) => {
      if (a.id === id) return updated;
      if (values.isDefault) return { ...a, isDefault: false };
      return a;
    });
    onChange(next);
    setMode({ kind: 'list' });
  };

  const handleDelete = async (id: string) => {
    setListError(null);
    setDeletingId(id);
    try {
      await accountApi.deleteAddress(id);
      onChange(addresses.filter((a) => a.id !== id));
    } catch (error) {
      setListError(
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Could not remove this address. Please try again.',
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Addresses</h2>
        {mode.kind === 'list' ? (
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => setMode({ kind: 'create' })}
          >
            Add address
          </button>
        ) : null}
      </div>

      {listError ? (
        <FormBanner variant="error" message={listError} onRetry={() => setListError(null)} />
      ) : null}

      {mode.kind === 'create' ? (
        <AddressForm onSubmit={handleCreate} onCancel={() => setMode({ kind: 'list' })} />
      ) : mode.kind === 'edit' ? (
        <AddressForm
          address={mode.address}
          onSubmit={(values) => handleUpdate(mode.address.id, values)}
          onCancel={() => setMode({ kind: 'list' })}
        />
      ) : addresses.length === 0 ? (
        <p className={cardStyles.emptyState}>No addresses saved yet.</p>
      ) : (
        <div className={cardStyles.list}>
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={() => setMode({ kind: 'edit', address })}
              onDelete={() => void handleDelete(address.id)}
              isDeleting={deletingId === address.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}
