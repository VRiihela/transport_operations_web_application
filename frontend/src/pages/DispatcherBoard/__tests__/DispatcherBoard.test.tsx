import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { addDays, format, startOfWeek } from 'date-fns';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import DispatcherBoard from '../DispatcherBoard';
import { useAuth } from '../../../contexts/AuthContext';
import apiService from '../../../services/api';
import { LanguageProvider } from '../../../i18n/LanguageContext';
import { en } from '../../../i18n/translations';

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../services/api', () => ({
  default: {
    axios: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const mockUseAuth = useAuth as Mock;
const mockAxios = apiService.axios as unknown as {
  get: Mock;
  post: Mock;
  patch: Mock;
  delete: Mock;
};

const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
const wednesday = addDays(weekStart, 2);
const wednesdayISO = format(wednesday, 'yyyy-MM-dd');

const jobOnWednesday = {
  id: 'job-wed-1',
  title: 'Deliver sofa',
  status: 'ASSIGNED' as const,
  assignedDriverId: null,
  scheduledStart: `${wednesdayISO}T09:00:00`,
};

function mockJobsResponse(jobs: object[]): void {
  mockAxios.get.mockImplementation((url: string) => {
    if (url.startsWith('/api/jobs?status=ASSIGNED')) {
      return Promise.resolve({ data: { data: { jobs } } });
    }
    if (url.startsWith('/api/jobs?status=DRAFT') || url.startsWith('/api/jobs?status=IN_PROGRESS')) {
      return Promise.resolve({ data: { data: { jobs: [] } } });
    }
    if (url.startsWith('/api/users?role=Driver')) {
      return Promise.resolve({ data: { data: [] } });
    }
    if (url.startsWith('/api/teams')) {
      return Promise.resolve({ data: { data: [] } });
    }
    return Promise.resolve({ data: { data: [] } });
  });
}

async function renderBoard(): Promise<ReturnType<typeof render>> {
  const result = render(
    <MemoryRouter>
      <LanguageProvider>
        <DispatcherBoard />
      </LanguageProvider>
    </MemoryRouter>,
  );
  await screen.findByRole('button', { name: en.boardScheduleTab });
  return result;
}

async function switchToScheduleView(): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: en.boardScheduleTab }));
  await waitFor(() => {
    expect(screen.getByRole('button', { name: en.boardNextWeek })).toBeInTheDocument();
  });
}

describe('DispatcherBoard — Schedule view day header click', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'u1', email: 'd@example.com', role: 'Dispatcher' }, logout: vi.fn() });
    mockJobsResponse([jobOnWednesday]);
  });

  it('switches to Assign view with the clicked day selected', async () => {
    await renderBoard();
    await switchToScheduleView();

    const wednesdayLabel = `${en.weekdays[2]} ${format(wednesday, en.dateDayMonth)}`;
    const header = screen.getByRole('button', {
      name: `${en.boardOpenAssignView} ${wednesdayLabel}`,
    });

    const user = userEvent.setup();
    await user.click(header);

    const dateInput = await screen.findByLabelText(en.schedDate);
    expect(dateInput).toHaveValue(wednesdayISO);
    expect(screen.getByRole('button', { name: en.boardCreateTeam })).toBeInTheDocument();
  });

  it('renders an accessible aria-label using the active i18n language', async () => {
    await renderBoard();
    await switchToScheduleView();

    const wednesdayLabel = `${en.weekdays[2]} ${format(wednesday, en.dateDayMonth)}`;
    expect(
      screen.getByRole('button', { name: `${en.boardOpenAssignView} ${wednesdayLabel}` }),
    ).toBeInTheDocument();
  });

  it('activates via keyboard (Enter) on a focused day header', async () => {
    await renderBoard();
    await switchToScheduleView();

    const wednesdayLabel = `${en.weekdays[2]} ${format(wednesday, en.dateDayMonth)}`;
    const header = screen.getByRole('button', {
      name: `${en.boardOpenAssignView} ${wednesdayLabel}`,
    });
    header.focus();

    const user = userEvent.setup();
    await user.keyboard('{Enter}');

    const dateInput = await screen.findByLabelText(en.schedDate);
    expect(dateInput).toHaveValue(wednesdayISO);
  });

  it('is clickable for a day column with no jobs', async () => {
    await renderBoard();
    await switchToScheduleView();

    const thursday = addDays(weekStart, 3);
    const thursdayISO = format(thursday, 'yyyy-MM-dd');
    const thursdayLabel = `${en.weekdays[3]} ${format(thursday, en.dateDayMonth)}`;

    const header = screen.getByRole('button', {
      name: `${en.boardOpenAssignView} ${thursdayLabel}`,
    });

    const user = userEvent.setup();
    await user.click(header);

    const dateInput = await screen.findByLabelText(en.schedDate);
    expect(dateInput).toHaveValue(thursdayISO);
  });

  it('does not switch views when clicking a job card inside the day column', async () => {
    await renderBoard();
    await switchToScheduleView();

    const user = userEvent.setup();
    await user.click(screen.getByText(jobOnWednesday.title));

    // Still in Schedule view — week navigation remains, Assign-only controls absent
    expect(screen.getByRole('button', { name: en.boardNextWeek })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: en.boardCreateTeam })).not.toBeInTheDocument();
  });

  it('does not switch views when clicking the empty column body', async () => {
    await renderBoard();
    await switchToScheduleView();

    const emptyMarkers = screen.getAllByText('—');
    const user = userEvent.setup();
    await user.click(emptyMarkers[0]);

    expect(screen.getByRole('button', { name: en.boardNextWeek })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: en.boardCreateTeam })).not.toBeInTheDocument();
  });

  it('preserves the currently viewed week when switching back from Assign view', async () => {
    await renderBoard();
    await switchToScheduleView();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: en.boardNextWeek }));

    const nextWeekStart = addDays(weekStart, 7);
    const nextWeekEnd = addDays(weekStart, 13);
    const expectedLabel = `${format(nextWeekStart, en.dateDayMonth)} – ${format(nextWeekEnd, en.dateDayMonthYear)}`;
    expect(screen.getByText(expectedLabel)).toBeInTheDocument();

    // Jump to Assign view via a day header, then back to Schedule
    const wednesdayNext = addDays(nextWeekStart, 2);
    const wednesdayNextLabel = `${en.weekdays[2]} ${format(wednesdayNext, en.dateDayMonth)}`;
    await user.click(
      screen.getByRole('button', { name: `${en.boardOpenAssignView} ${wednesdayNextLabel}` }),
    );
    await user.click(screen.getByRole('button', { name: en.boardScheduleTab }));

    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
  });

  it('keeps the Assign/Schedule toggle working as before', async () => {
    await renderBoard();
    const user = userEvent.setup();

    // Starts on Assign view
    expect(screen.getByRole('button', { name: en.boardCreateTeam })).toBeInTheDocument();

    await switchToScheduleView();
    expect(screen.queryByRole('button', { name: en.boardCreateTeam })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: en.boardAssignTab }));
    expect(await screen.findByRole('button', { name: en.boardCreateTeam })).toBeInTheDocument();
  });
});
