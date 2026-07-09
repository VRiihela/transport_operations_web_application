export type Lang = 'en' | 'fi';

export interface AppTranslations {
  // Locale meta (used by formatters)
  dateLocale: string;
  dateDayMonth: string;
  dateDayMonthYear: string;
  weekdays: string[]; // Mon–Sun (index 0=Mon)

  // Navigation
  navJobsList: string;
  navDispatcherBoard: string;

  // Auth
  authTitle: string;
  authEmail: string;
  authPassword: string;
  authSignIn: string;
  authSigningIn: string;
  authFillFields: string;
  authBadCredentials: string;

  // Common
  logout: string;
  save: string;
  cancel: string;
  edit: string;
  close: string;
  back: string;
  loading: string;
  tryAgain: string;
  unassigned: string;
  usersLink: string;
  downloadPdf: string;

  // Status labels
  statusDraft: string;
  statusAssigned: string;
  statusInProgress: string;
  statusCompleted: string;

  // Role labels
  roleAdmin: string;
  roleDispatcher: string;
  roleDriver: string;

  // Jobs page
  jobsHeading: string;
  jobsNewJob: string;
  jobsAssignDriver: string;
  jobsAssigning: string;
  jobsUpdating: string;
  jobsFilterActive: string;
  jobsFilterCompleted: string;
  jobsFilterAll: string;
  jobsViewList: string;
  jobsViewWeek: string;
  jobsEmptyActive: string;
  jobsEmptyCompleted: string;
  jobsEmptyAll: string;
  jobsLoading: string;

  // Table columns
  colTitle: string;
  colStatus: string;
  colDriver: string;
  colScheduled: string;
  colActions: string;

  // Week navigation
  prevWeek: string;
  nextWeek: string;
  jumpToWeek: string;
  weekViewClickToCreateJob: string;
  weekViewGridAriaLabel: string;

  // Pagination
  paginationPrev: string;
  paginationNext: string;
  paginationPage: string;
  paginationOf: string;

  // Job detail modal
  detailHeading: string;
  detailJobType: string;
  detailServices: string;
  detailCustomer: string;
  detailDescription: string;
  detailAssignedDriver: string;
  detailScheduled: string;
  detailPickupAddress: string;
  detailDeliveryAddress: string;
  detailDriverNotes: string;
  detailCompletionSection: string;
  detailWorkDone: string;
  detailActualTime: string;
  detailHours: string;
  detailSignature: string;
  detailApproved: string;
  detailPendingApproval: string;

  // My Jobs
  myJobsHeading: string;
  myJobsEmptyDate: string;
  myJobsEmptyHint: string;
  myJobsScheduled: string;
  myJobsNote: string;
  myJobsLocation: string;
  myJobsNotes: string;
  myJobsDriverNotes: string;
  myJobsNotesPlaceholder: string;
  myJobsStartJob: string;
  myJobsStarting: string;
  myJobsCompleteJob: string;
  myJobsMarkCompleted: string;
  myJobsCompleting: string;
  myJobsSave: string;
  myJobsSaving: string;
  myJobsSaved: string;

  // Completion modal
  reportTitle: string;
  reportSignatureTitle: string;
  reportWorkDescription: string;
  reportWorkDescPlaceholder: string;
  reportActualStart: string;
  reportActualEnd: string;
  reportTotalHours: string;
  reportCustomerName: string;
  reportCustomerNamePlaceholder: string;
  reportNextSignature: string;
  reportApproveSign: string;
  reportApproving: string;
  reportLocked: string;
  reportUnlock: string;
  reportUnlocking: string;
  reportSummaryTitle: string;
  reportSummaryJob: string;
  reportSummaryAddress: string;
  reportSummaryWork: string;
  reportSummaryTime: string;
  reportSummaryTotal: string;
  reportApprovedPrefix: string;

  // Users page
  usersHeading: string;
  usersEmail: string;
  usersName: string;
  usersRole: string;
  usersStatus: string;
  usersActiveLabel: string;
  usersInactiveLabel: string;
  usersActions: string;
  usersCreateBtn: string;
  usersCreateTitle: string;
  usersEditTitle: string;
  usersPasswordHint: string;
  usersActiveCheckbox: string;
  usersDeactivate: string;
  usersActivate: string;
  usersResetPassword: string;
  usersResetTitle: string;
  usersResetFor: string;
  usersNewPassword: string;
  usersSaving: string;
  usersCreating: string;
  usersResetting: string;
  usersRoleDriver: string;
  usersRoleDispatcher: string;

  // Dispatcher board
  boardAssignTab: string;
  boardScheduleTab: string;
  boardPrevDay: string;
  boardNextDay: string;
  boardPrevWeek: string;
  boardNextWeek: string;
  boardJumpToWeek: string;
  boardCreateTeam: string;
  boardDriversTeams: string;
  boardUnscheduled: string;

  // Team management modal
  teamCreateTitle: string;
  teamNameLabel: string;
  teamNamePlaceholder: string;
  teamDriversLabel: string;
  teamNoDrivers: string;
  teamInTeam: string;
  teamNameRequired: string;
  teamNameTooLong: string;
  teamCreating: string;
  teamCreate: string;

  // Job create modal
  createTitle: string;
  createJobTitleLabel: string;
  createJobTitlePlaceholder: string;
  createJobTypeLabel: string;
  createCustomerLabel: string;
  createPhoneLabel: string;
  createPhonePlaceholder: string;
  createSearching: string;
  createCustomerName: string;
  createCustomerNamePlaceholder: string;
  createCompanyName: string;
  createCompanyNamePlaceholder: string;
  createPrivate: string;
  createBusiness: string;
  createSaving: string;
  createSaveJob: string;
  createTitleRequired: string;

  // Services section
  servicesTitle: string;
  serviceDelivery: string;
  servicePickup: string;
  serviceInstallation: string;
  serviceRemoval: string;
  serviceAssembly: string;
  serviceOther: string;
  serviceOtherPlaceholder: string;

  // Address section
  addrTitle: string;
  addrPickup: string;
  addrDelivery: string;
  addrService: string;
  addrStreet: string;
  addrPostal: string;
  addrCity: string;
  addrFloorStair: string;
  addrDoorCode: string;
  addrAccessNotes: string;

  // Scheduling section
  schedTitle: string;
  schedExactTime: string;
  schedTimeWindow: string;
  schedTbc: string;
  schedDate: string;
  schedStartTime: string;
  schedWindowStart: string;
  schedWindowEnd: string;
  schedNote: string;
  schedNotePlaceholder: string;

  // Completion report inline (JobsPage)
  crApprovedAt: string;
  crPending: string;
  crWork: string;
  crTime: string;
  crHours: string;
  crCustomer: string;
}

export const en: AppTranslations = {
  dateLocale: 'en-GB',
  dateDayMonth: 'd/M',
  dateDayMonthYear: 'd/M/yyyy',
  weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],

  navJobsList: 'Jobs List',
  navDispatcherBoard: 'Dispatcher Board',

  authTitle: 'Login',
  authEmail: 'Email',
  authPassword: 'Password',
  authSignIn: 'Sign In',
  authSigningIn: 'Signing in...',
  authFillFields: 'Please fill in all fields',
  authBadCredentials: 'Invalid login credentials',

  logout: 'Logout',
  save: 'Save',
  cancel: 'Cancel',
  edit: 'Edit',
  close: 'Close',
  back: 'Back',
  loading: 'Loading...',
  tryAgain: 'Try Again',
  unassigned: 'Unassigned',
  usersLink: 'Users',
  downloadPdf: 'Download PDF',

  statusDraft: 'Draft',
  statusAssigned: 'Assigned',
  statusInProgress: 'In Progress',
  statusCompleted: 'Completed',

  roleAdmin: 'Admin',
  roleDispatcher: 'Dispatcher',
  roleDriver: 'Driver',

  jobsHeading: 'Jobs Management',
  jobsNewJob: 'New Job',
  jobsAssignDriver: 'Assign Driver',
  jobsAssigning: 'Assigning…',
  jobsUpdating: 'Updating…',
  jobsFilterActive: 'Active',
  jobsFilterCompleted: 'Completed',
  jobsFilterAll: 'All',
  jobsViewList: 'List',
  jobsViewWeek: 'Week',
  jobsEmptyActive: 'No active jobs. Create a new job to get started.',
  jobsEmptyCompleted: 'No completed jobs.',
  jobsEmptyAll: 'No jobs found.',
  jobsLoading: 'Loading jobs…',

  colTitle: 'Title',
  colStatus: 'Status',
  colDriver: 'Driver',
  colScheduled: 'Scheduled',
  colActions: 'Actions',

  prevWeek: '←',
  nextWeek: '→',
  jumpToWeek: 'Jump to week',
  weekViewClickToCreateJob: 'Create a new job for',
  weekViewGridAriaLabel: 'Week view',

  paginationPrev: '← Prev',
  paginationNext: 'Next →',
  paginationPage: 'Page',
  paginationOf: 'of',

  detailHeading: 'Job Details',
  detailJobType: 'Job type',
  detailServices: 'Services',
  detailCustomer: 'Customer',
  detailDescription: 'Description',
  detailAssignedDriver: 'Assigned driver',
  detailScheduled: 'Scheduled',
  detailPickupAddress: 'Pickup address',
  detailDeliveryAddress: 'Delivery address',
  detailDriverNotes: 'Driver notes',
  detailCompletionSection: 'Completion report',
  detailWorkDone: 'Work done',
  detailActualTime: 'Actual time',
  detailHours: 'Hours',
  detailSignature: 'Signature',
  detailApproved: 'Approved',
  detailPendingApproval: 'Pending approval',

  myJobsHeading: 'My Jobs',
  myJobsEmptyDate: 'No jobs for the selected date.',
  myJobsEmptyHint: 'Select another date or contact the dispatcher.',
  myJobsScheduled: 'Scheduled',
  myJobsNote: 'Note',
  myJobsLocation: 'Location',
  myJobsNotes: 'Notes',
  myJobsDriverNotes: 'Driver notes',
  myJobsNotesPlaceholder: 'Add notes or deviation info…',
  myJobsStartJob: 'Start Job',
  myJobsStarting: 'Starting...',
  myJobsCompleteJob: 'Complete Job',
  myJobsMarkCompleted: 'Mark Completed',
  myJobsCompleting: 'Completing...',
  myJobsSave: 'Save',
  myJobsSaving: 'Saving…',
  myJobsSaved: 'Saved',

  reportTitle: 'Completion Report',
  reportSignatureTitle: 'Customer Signature',
  reportWorkDescription: 'Work Description',
  reportWorkDescPlaceholder: 'Describe the work performed…',
  reportActualStart: 'Actual Start',
  reportActualEnd: 'Actual End',
  reportTotalHours: 'Total Hours',
  reportCustomerName: 'Customer Name',
  reportCustomerNamePlaceholder: 'Enter customer name',
  reportNextSignature: 'Next: Signature',
  reportApproveSign: 'Approve & Sign',
  reportApproving: 'Approving…',
  reportLocked: 'Approved — locked for editing',
  reportUnlock: 'Unlock for editing',
  reportUnlocking: 'Unlocking…',
  reportSummaryTitle: 'Job Summary',
  reportSummaryJob: 'Job',
  reportSummaryAddress: 'Address',
  reportSummaryWork: 'Work',
  reportSummaryTime: 'Time',
  reportSummaryTotal: 'Total',
  reportApprovedPrefix: 'Approved',

  usersHeading: 'User Management',
  usersEmail: 'Email',
  usersName: 'Name',
  usersRole: 'Role',
  usersStatus: 'Status',
  usersActiveLabel: 'Active',
  usersInactiveLabel: 'Inactive',
  usersActions: 'Actions',
  usersCreateBtn: 'Create User',
  usersCreateTitle: 'Create New User',
  usersEditTitle: 'Edit User',
  usersPasswordHint: 'Password * (min 8 chars)',
  usersActiveCheckbox: 'Active',
  usersDeactivate: 'Deactivate',
  usersActivate: 'Activate',
  usersResetPassword: 'Reset Password',
  usersResetTitle: 'Reset Password',
  usersResetFor: 'Setting new password for',
  usersNewPassword: 'New Password * (min 8 chars)',
  usersSaving: 'Saving...',
  usersCreating: 'Creating...',
  usersResetting: 'Resetting...',
  usersRoleDriver: 'Driver',
  usersRoleDispatcher: 'Dispatcher',

  boardAssignTab: 'Assign',
  boardScheduleTab: 'Schedule',
  boardPrevDay: 'Previous day',
  boardNextDay: 'Next day',
  boardPrevWeek: 'Previous week',
  boardNextWeek: 'Next week',
  boardJumpToWeek: 'Jump to week',
  boardCreateTeam: '+ Create Team',
  boardDriversTeams: 'Drivers & Teams',
  boardUnscheduled: 'Unscheduled',

  teamCreateTitle: 'Create Team',
  teamNameLabel: 'Team name',
  teamNamePlaceholder: 'e.g. Morning Route A',
  teamDriversLabel: 'Drivers',
  teamNoDrivers: 'No drivers available.',
  teamInTeam: 'in team',
  teamNameRequired: 'Team name is required',
  teamNameTooLong: 'Team name must be 100 characters or less',
  teamCreating: 'Creating…',
  teamCreate: 'Create Team',

  createTitle: 'Create New Job',
  createJobTitleLabel: 'Title',
  createJobTitlePlaceholder: 'Job title',
  createJobTypeLabel: 'Job Type',
  createCustomerLabel: 'Customer',
  createPhoneLabel: 'Phone Number',
  createPhonePlaceholder: 'Search by phone number...',
  createSearching: 'Searching...',
  createCustomerName: 'Name',
  createCustomerNamePlaceholder: 'Customer name',
  createCompanyName: 'Company Name',
  createCompanyNamePlaceholder: 'Company name (optional)',
  createPrivate: 'Private',
  createBusiness: 'Business',
  createSaving: 'Saving…',
  createSaveJob: 'Save Job',
  createTitleRequired: 'Title is required',

  servicesTitle: 'Services',
  serviceDelivery: 'Delivery',
  servicePickup: 'Pickup/collection',
  serviceInstallation: 'Installation',
  serviceRemoval: 'Removal/disposal',
  serviceAssembly: 'Assembly',
  serviceOther: 'Other',
  serviceOtherPlaceholder: 'Please specify',

  addrTitle: 'Address Information',
  addrPickup: 'Pickup Address',
  addrDelivery: 'Delivery Address',
  addrService: 'Service Address',
  addrStreet: 'Street Address',
  addrPostal: 'Postal Code',
  addrCity: 'City',
  addrFloorStair: 'Floor/Stair',
  addrDoorCode: 'Door Code',
  addrAccessNotes: 'Access Notes',

  schedTitle: 'Scheduling',
  schedExactTime: 'Exact time',
  schedTimeWindow: 'Time window',
  schedTbc: 'TBC',
  schedDate: 'Date',
  schedStartTime: 'Start Time',
  schedWindowStart: 'Window Start',
  schedWindowEnd: 'Window End',
  schedNote: 'Scheduling Note',
  schedNotePlaceholder: 'Please provide details about timing preferences or constraints',

  crApprovedAt: 'Approved',
  crPending: 'Pending approval',
  crWork: 'Work',
  crTime: 'Time',
  crHours: 'Hours',
  crCustomer: 'Customer',
};

export const fi: AppTranslations = {
  dateLocale: 'fi-FI',
  dateDayMonth: 'd.M.',
  dateDayMonthYear: 'd.M.yyyy',
  weekdays: ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'],

  navJobsList: 'Työ lista',
  navDispatcherBoard: 'Ajojärjestelynäkymä',

  authTitle: 'Kirjaudu sisään',
  authEmail: 'Sähköposti',
  authPassword: 'Salasana',
  authSignIn: 'Kirjaudu',
  authSigningIn: 'Kirjaudutaan...',
  authFillFields: 'Täytä kaikki kentät',
  authBadCredentials: 'Virheelliset kirjautumistiedot',

  logout: 'Kirjaudu ulos',
  save: 'Tallenna',
  cancel: 'Peruuta',
  edit: 'Muokkaa',
  close: 'Sulje',
  back: 'Takaisin',
  loading: 'Ladataan...',
  tryAgain: 'Yritä uudelleen',
  unassigned: 'Ei määritetty',
  usersLink: 'Käyttäjät',
  downloadPdf: 'Lataa PDF',

  statusDraft: 'Luonnos',
  statusAssigned: 'Määritetty',
  statusInProgress: 'Käynnissä',
  statusCompleted: 'Valmis',

  roleAdmin: 'Ylläpitäjä',
  roleDispatcher: 'Ajojärjestelijä',
  roleDriver: 'Kuljettaja',

  jobsHeading: 'Töiden hallinta',
  jobsNewJob: 'Uusi työ',
  jobsAssignDriver: 'Määritä kuljettaja',
  jobsAssigning: 'Määritetään…',
  jobsUpdating: 'Päivitetään…',
  jobsFilterActive: 'Aktiiviset',
  jobsFilterCompleted: 'Valmiit',
  jobsFilterAll: 'Kaikki',
  jobsViewList: 'Lista',
  jobsViewWeek: 'Viikko',
  jobsEmptyActive: 'Ei aktiivisia töitä. Luo uusi työ aloittaaksesi.',
  jobsEmptyCompleted: 'Ei valmiita töitä.',
  jobsEmptyAll: 'Töitä ei löydy.',
  jobsLoading: 'Ladataan töitä…',

  colTitle: 'Otsikko',
  colStatus: 'Tila',
  colDriver: 'Kuljettaja',
  colScheduled: 'Ajastettu',
  colActions: 'Toiminnot',

  prevWeek: '←',
  nextWeek: '→',
  jumpToWeek: 'Siirry viikolle',
  weekViewClickToCreateJob: 'Luo uusi työ päivälle',
  weekViewGridAriaLabel: 'Viikkonäkymä',

  paginationPrev: '← Edell.',
  paginationNext: 'Seur. →',
  paginationPage: 'Sivu',
  paginationOf: '/',

  detailHeading: 'Työn tiedot',
  detailJobType: 'Tyyppi',
  detailServices: 'Palvelut',
  detailCustomer: 'Asiakas',
  detailDescription: 'Kuvaus',
  detailAssignedDriver: 'Määritetty kuljettaja',
  detailScheduled: 'Ajastettu',
  detailPickupAddress: 'Nouto-osoite',
  detailDeliveryAddress: 'Toimitusosoite',
  detailDriverNotes: 'Kuljettajan muistiinpanot',
  detailCompletionSection: 'Loppuraportti',
  detailWorkDone: 'Tehty työ',
  detailActualTime: 'Todellinen aika',
  detailHours: 'Tunnit',
  detailSignature: 'Allekirjoitus',
  detailApproved: 'Hyväksytty',
  detailPendingApproval: 'Odottaa hyväksyntää',

  myJobsHeading: 'Omat työt',
  myJobsEmptyDate: 'Ei töitä valitulle päivälle.',
  myJobsEmptyHint: 'Valitse toinen päivämäärä tai ota yhteyttä lähettäjään.',
  myJobsScheduled: 'Ajastettu',
  myJobsNote: 'Huomio',
  myJobsLocation: 'Sijainti',
  myJobsNotes: 'Muistiinpanot',
  myJobsDriverNotes: 'Kuljettajan muistiinpanot',
  myJobsNotesPlaceholder: 'Lisää muistiinpanoja tai poikkeamatietoja…',
  myJobsStartJob: 'Aloita työ',
  myJobsStarting: 'Aloitetaan...',
  myJobsCompleteJob: 'Merkitse valmiiksi',
  myJobsMarkCompleted: 'Merkitse valmiiksi',
  myJobsCompleting: 'Viimeistellään...',
  myJobsSave: 'Tallenna',
  myJobsSaving: 'Tallennetaan…',
  myJobsSaved: 'Tallennettu',

  reportTitle: 'Loppuraportti',
  reportSignatureTitle: 'Asiakkaan allekirjoitus',
  reportWorkDescription: 'Työn kuvaus',
  reportWorkDescPlaceholder: 'Kuvaa tehty työ…',
  reportActualStart: 'Todellinen aloitus',
  reportActualEnd: 'Todellinen lopetus',
  reportTotalHours: 'Tunnit yhteensä',
  reportCustomerName: 'Asiakkaan nimi',
  reportCustomerNamePlaceholder: 'Syötä asiakkaan nimi',
  reportNextSignature: 'Seuraava: Allekirjoitus',
  reportApproveSign: 'Hyväksy & allekirjoita',
  reportApproving: 'Hyväksytään…',
  reportLocked: 'Hyväksytty — lukittu muokkaukselta',
  reportUnlock: 'Avaa muokkausta varten',
  reportUnlocking: 'Avataan…',
  reportSummaryTitle: 'Yhteenveto',
  reportSummaryJob: 'Työ',
  reportSummaryAddress: 'Osoite',
  reportSummaryWork: 'Työ',
  reportSummaryTime: 'Aika',
  reportSummaryTotal: 'Yhteensä',
  reportApprovedPrefix: 'Hyväksytty',

  usersHeading: 'Käyttäjähallinta',
  usersEmail: 'Sähköposti',
  usersName: 'Nimi',
  usersRole: 'Rooli',
  usersStatus: 'Tila',
  usersActiveLabel: 'Aktiivinen',
  usersInactiveLabel: 'Ei aktiivinen',
  usersActions: 'Toiminnot',
  usersCreateBtn: 'Luo käyttäjä',
  usersCreateTitle: 'Luo uusi käyttäjä',
  usersEditTitle: 'Muokkaa käyttäjää',
  usersPasswordHint: 'Salasana * (vähintään 8 merkkiä)',
  usersActiveCheckbox: 'Aktiivinen',
  usersDeactivate: 'Poista käytöstä',
  usersActivate: 'Aktivoi',
  usersResetPassword: 'Palauta salasana',
  usersResetTitle: 'Palauta salasana',
  usersResetFor: 'Asetetaan uusi salasana käyttäjälle',
  usersNewPassword: 'Uusi salasana * (vähintään 8 merkkiä)',
  usersSaving: 'Tallennetaan...',
  usersCreating: 'Luodaan...',
  usersResetting: 'Palautetaan...',
  usersRoleDriver: 'Kuljettaja',
  usersRoleDispatcher: 'Lähettäjä',

  boardAssignTab: 'Määritä',
  boardScheduleTab: 'Aikataulu',
  boardPrevDay: 'Edellinen päivä',
  boardNextDay: 'Seuraava päivä',
  boardPrevWeek: 'Edellinen viikko',
  boardNextWeek: 'Seuraava viikko',
  boardJumpToWeek: 'Siirry viikolle',
  boardCreateTeam: '+ Luo tiimi',
  boardDriversTeams: 'Kuljettajat & tiimit',
  boardUnscheduled: 'Aikatauluttamattomat',

  teamCreateTitle: 'Luo tiimi',
  teamNameLabel: 'Tiimin nimi',
  teamNamePlaceholder: 'esim. Aamureitti A',
  teamDriversLabel: 'Kuljettajat',
  teamNoDrivers: 'Ei kuljettajia saatavilla.',
  teamInTeam: 'tiimissä',
  teamNameRequired: 'Tiimin nimi on pakollinen',
  teamNameTooLong: 'Tiimin nimi voi olla enintään 100 merkkiä',
  teamCreating: 'Luodaan…',
  teamCreate: 'Luo tiimi',

  createTitle: 'Luo uusi työ',
  createJobTitleLabel: 'Otsikko',
  createJobTitlePlaceholder: 'Työn otsikko',
  createJobTypeLabel: 'Tyyppi',
  createCustomerLabel: 'Asiakas',
  createPhoneLabel: 'Puhelinnumero',
  createPhonePlaceholder: 'Hae puhelinnumerolla...',
  createSearching: 'Haetaan...',
  createCustomerName: 'Nimi',
  createCustomerNamePlaceholder: 'Asiakkaan nimi',
  createCompanyName: 'Yrityksen nimi',
  createCompanyNamePlaceholder: 'Yrityksen nimi (valinnainen)',
  createPrivate: 'Yksityinen',
  createBusiness: 'Yritys',
  createSaving: 'Tallennetaan…',
  createSaveJob: 'Tallenna työ',
  createTitleRequired: 'Otsikko on pakollinen',

  servicesTitle: 'Palvelut',
  serviceDelivery: 'Toimitus',
  servicePickup: 'Nouto/keruu',
  serviceInstallation: 'Asennus',
  serviceRemoval: 'Poisto/hävitys',
  serviceAssembly: 'Kokoaminen',
  serviceOther: 'Muu',
  serviceOtherPlaceholder: 'Tarkenna',

  addrTitle: 'Osoitetiedot',
  addrPickup: 'Nouto-osoite',
  addrDelivery: 'Toimitusosoite',
  addrService: 'Palveluosoite',
  addrStreet: 'Katuosoite',
  addrPostal: 'Postinumero',
  addrCity: 'Kaupunki',
  addrFloorStair: 'Kerros/porras',
  addrDoorCode: 'Ovikoodi',
  addrAccessNotes: 'Kulkuohjeet',

  schedTitle: 'Ajastus',
  schedExactTime: 'Tarkka aika',
  schedTimeWindow: 'Aikaikkuna',
  schedTbc: 'Myöhemmin',
  schedDate: 'Päivämäärä',
  schedStartTime: 'Aloitusaika',
  schedWindowStart: 'Ikkunan alku',
  schedWindowEnd: 'Ikkunan loppu',
  schedNote: 'Ajastushuomio',
  schedNotePlaceholder: 'Anna tietoja ajoitustoiveista tai rajoituksista',

  crApprovedAt: 'Hyväksytty',
  crPending: 'Odottaa hyväksyntää',
  crWork: 'Työ',
  crTime: 'Aika',
  crHours: 'Tunnit',
  crCustomer: 'Asiakas',
};

export const translations: Record<Lang, AppTranslations> = { en, fi };
