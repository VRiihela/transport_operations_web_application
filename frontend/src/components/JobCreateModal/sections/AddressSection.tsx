import React from 'react';
import { ServiceType, AddressData } from '../../../types/job';
import styles from './AddressSection.module.css';

interface AddressSectionProps {
  selectedServices: ServiceType[];
  pickupAddress?: AddressData;
  deliveryAddress?: AddressData;
  serviceAddress?: AddressData;
  onPickupChange?: (data: AddressData) => void;
  onDeliveryChange?: (data: AddressData) => void;
  onServiceChange?: (data: AddressData) => void;
}

interface AddressBlockProps {
  title: string;
  data: AddressData;
  onChange: (data: AddressData) => void;
}

const createEmptyAddress = (): AddressData => ({
  street: '',
  postalCode: '',
  city: '',
  floorStair: '',
  doorCode: '',
  accessNotes: '',
});

const AddressBlock: React.FC<AddressBlockProps> = ({ title, data, onChange }) => {
  const handleInputChange =
    (field: keyof AddressData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ ...data, [field]: e.target.value });
    };

  return (
    <div className={styles.addressBlock}>
      <h4 className={styles.blockTitle}>{title}</h4>
      <div className={styles.addressFields}>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              Street Address <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={data.street}
              onChange={handleInputChange('street')}
              className={styles.fieldInput}
              required
            />
          </div>
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              Postal Code <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={data.postalCode}
              onChange={handleInputChange('postalCode')}
              className={styles.fieldInput}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              City <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={data.city}
              onChange={handleInputChange('city')}
              className={styles.fieldInput}
              required
            />
          </div>
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Floor/Stair</label>
            <input
              type="text"
              value={data.floorStair}
              onChange={handleInputChange('floorStair')}
              className={styles.fieldInput}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Door Code</label>
            <input
              type="text"
              value={data.doorCode}
              onChange={handleInputChange('doorCode')}
              className={styles.fieldInput}
            />
          </div>
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Access Notes</label>
            <textarea
              value={data.accessNotes}
              onChange={handleInputChange('accessNotes')}
              className={styles.fieldTextarea}
              rows={2}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const AddressSection: React.FC<AddressSectionProps> = ({
  selectedServices,
  pickupAddress,
  deliveryAddress,
  serviceAddress,
  onPickupChange,
  onDeliveryChange,
  onServiceChange,
}) => {
  const hasPickup = selectedServices.includes(ServiceType.PICKUP_COLLECTION);
  const hasDelivery = selectedServices.includes(ServiceType.DELIVERY);
  const hasNeitherPickupNorDelivery = !hasPickup && !hasDelivery;
  const hasAnyService = selectedServices.length > 0;

  return (
    <div className={styles.addressSection}>
      <h3 className={styles.sectionTitle}>Address Information</h3>
      <div className={styles.addressBlocks}>
        {hasPickup && (
          <AddressBlock
            title="Pickup Address"
            data={pickupAddress ?? createEmptyAddress()}
            onChange={onPickupChange!}
          />
        )}
        {hasDelivery && (
          <AddressBlock
            title="Delivery Address"
            data={deliveryAddress ?? createEmptyAddress()}
            onChange={onDeliveryChange!}
          />
        )}
        {hasNeitherPickupNorDelivery && hasAnyService && (
          <AddressBlock
            title="Service Address"
            data={serviceAddress ?? createEmptyAddress()}
            onChange={onServiceChange!}
          />
        )}
      </div>
    </div>
  );
};
