import React from 'react';
import { JobType, ServiceType, ServicesData } from '../../../types/job';
import styles from './ServicesSection.module.css';

interface ServicesSectionProps {
  jobType: JobType;
  data: ServicesData;
  onChange: (data: ServicesData) => void;
}

const getDefaultServices = (jobType: JobType): ServiceType[] => {
  switch (jobType) {
    case JobType.DELIVERY:
      return [ServiceType.DELIVERY];
    case JobType.PICKUP:
      return [ServiceType.PICKUP_COLLECTION];
    case JobType.DELIVERY_AND_PICKUP:
      return [ServiceType.DELIVERY, ServiceType.PICKUP_COLLECTION];
    case JobType.INSTALLATION:
      return [ServiceType.INSTALLATION];
    default:
      return [];
  }
};

export const ServicesSection: React.FC<ServicesSectionProps> = ({ jobType, data, onChange }) => {
  const defaultServices = getDefaultServices(jobType);

  const handleServiceToggle = (service: ServiceType) => {
    const isSelected = data.selectedServices.includes(service);
    const updatedServices = isSelected
      ? data.selectedServices.filter((s) => s !== service)
      : [...data.selectedServices, service];

    onChange({
      ...data,
      selectedServices: updatedServices,
      otherServiceText: service === ServiceType.OTHER && !isSelected ? data.otherServiceText : '',
    });
  };

  const handleOtherTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...data, otherServiceText: e.target.value });
  };

  const serviceLabels: Record<ServiceType, string> = {
    [ServiceType.DELIVERY]: 'Delivery',
    [ServiceType.PICKUP_COLLECTION]: 'Pickup/collection',
    [ServiceType.INSTALLATION]: 'Installation',
    [ServiceType.REMOVAL_DISPOSAL]: 'Removal/disposal',
    [ServiceType.ASSEMBLY]: 'Assembly',
    [ServiceType.OTHER]: 'Other',
  };

  return (
    <div className={styles.servicesSection}>
      <h3 className={styles.sectionTitle}>Services</h3>
      <div className={styles.servicesGrid}>
        {Object.values(ServiceType).map((service) => {
          const isSelected = data.selectedServices.includes(service);
          const isDefault = defaultServices.includes(service);

          return (
            <div key={service} className={styles.serviceItem}>
              <label className={styles.serviceLabel}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleServiceToggle(service)}
                  className={styles.serviceCheckbox}
                />
                <span className={`${styles.serviceName} ${isDefault ? styles.defaultService : ''}`}>
                  {serviceLabels[service]}
                </span>
              </label>
              {service === ServiceType.OTHER && isSelected && (
                <input
                  type="text"
                  value={data.otherServiceText}
                  onChange={handleOtherTextChange}
                  placeholder="Please specify"
                  className={styles.otherInput}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
