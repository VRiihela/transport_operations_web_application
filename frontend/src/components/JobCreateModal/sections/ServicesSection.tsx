import React from 'react';
import { JobType, ServiceType, ServicesData } from '../../../types/job';
import { useLanguage } from '../../../i18n/LanguageContext';
import styles from './ServicesSection.module.css';
import forms from '../../../styles/forms.module.css';

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
  const { t } = useLanguage();
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
    [ServiceType.DELIVERY]: t.serviceDelivery,
    [ServiceType.PICKUP_COLLECTION]: t.servicePickup,
    [ServiceType.INSTALLATION]: t.serviceInstallation,
    [ServiceType.REMOVAL_DISPOSAL]: t.serviceRemoval,
    [ServiceType.ASSEMBLY]: t.serviceAssembly,
    [ServiceType.OTHER]: t.serviceOther,
  };

  return (
    <div className={styles.servicesSection}>
      <h3 className={styles.sectionTitle}>{t.servicesTitle}</h3>
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
                  placeholder={t.serviceOtherPlaceholder}
                  className={`${forms.input} ${styles.otherInput}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
