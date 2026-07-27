import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import { LanguageProvider } from '../../i18n/LanguageContext';
import { en } from '../../i18n/translations';
import { JobEditModal, JobUpdatePayload } from '../JobEditModal';

interface TestJob {
  id: string;
  title: string;
  status: string;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  scheduleType: 'FIXED' | 'WINDOW' | 'DURATION';
  schedulingNote?: string | null;
}

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function makeJob(overrides: Partial<TestJob> = {}): TestJob {
  return {
    id: 'job-1',
    title: 'Deliver sofa',
    status: 'ASSIGNED',
    scheduledStart: null,
    scheduledEnd: null,
    scheduleType: 'DURATION',
    schedulingNote: 'Call ahead',
    ...overrides,
  };
}

function renderModal(job: TestJob, onSave: (updates: JobUpdatePayload) => Promise<void> = vi.fn().mockResolvedValue(undefined)) {
  const onClose = vi.fn();
  const utils = render(
    <LanguageProvider>
      <JobEditModal job={job} isOpen onClose={onClose} onSave={onSave} />
    </LanguageProvider>,
  );
  return { ...utils, onClose, onSave };
}

function timeInputs(container: HTMLElement): HTMLInputElement[] {
  return Array.from(container.querySelectorAll('input[type="time"]'));
}

async function clickSave(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Save Changes' }));
}

describe('JobEditModal — schedule type', () => {
  it('pre-selects the segment matching the job scheduleType (WINDOW) and shows both time fields', () => {
    const job = makeJob({
      scheduledStart: '2026-08-01T09:00:00.000Z',
      scheduledEnd: '2026-08-01T11:00:00.000Z',
      scheduleType: 'WINDOW',
    });
    const { container } = renderModal(job);

    expect(screen.getByRole('radio', { name: en.schedArrivalWindow })).toBeChecked();
    expect(timeInputs(container)).toHaveLength(2);
  });

  it('pre-selects Duration for a DURATION job with both times set', () => {
    const job = makeJob({
      scheduledStart: '2026-08-01T09:00:00.000Z',
      scheduledEnd: '2026-08-01T15:00:00.000Z',
      scheduleType: 'DURATION',
    });
    renderModal(job);

    expect(screen.getByRole('radio', { name: en.schedDuration })).toBeChecked();
  });

  it('pre-selects Fixed time for a FIXED job (no scheduledEnd) and shows a single time field', () => {
    const job = makeJob({
      scheduledStart: '2026-08-01T09:00:00.000Z',
      scheduledEnd: null,
      scheduleType: 'FIXED',
    });
    const { container } = renderModal(job);

    expect(screen.getByRole('radio', { name: en.schedExactTime })).toBeChecked();
    expect(timeInputs(container)).toHaveLength(1);
  });

  it('selecting Fixed time clears and removes the end-time field', async () => {
    const user = userEvent.setup();
    const job = makeJob({
      scheduledStart: '2026-08-01T09:00:00.000Z',
      scheduledEnd: '2026-08-01T11:00:00.000Z',
      scheduleType: 'WINDOW',
    });
    const { container } = renderModal(job);
    expect(timeInputs(container)).toHaveLength(2);

    await user.click(screen.getByRole('radio', { name: en.schedExactTime }));

    expect(timeInputs(container)).toHaveLength(1);
  });

  it('selecting Arrival window re-enables the end-time field with the latest-arrival label', async () => {
    const user = userEvent.setup();
    const job = makeJob({
      scheduledStart: '2026-08-01T09:00:00.000Z',
      scheduledEnd: null,
      scheduleType: 'FIXED',
    });
    const { container } = renderModal(job);
    expect(timeInputs(container)).toHaveLength(1);

    await user.click(screen.getByRole('radio', { name: en.schedArrivalWindow }));

    expect(timeInputs(container)).toHaveLength(2);
    expect(screen.getByText(en.schedArrivalWindowEnd)).toBeInTheDocument();
  });

  it('submits scheduleType and ISO-converted datetimes in the PATCH payload for a WINDOW job', async () => {
    const user = userEvent.setup();
    const job = makeJob({
      scheduledStart: '2026-08-01T09:00:00.000Z',
      scheduledEnd: '2026-08-01T11:00:00.000Z',
      scheduleType: 'WINDOW',
    });
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderModal(job, onSave);

    await clickSave(user);

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const payload = onSave.mock.calls[0][0] as JobUpdatePayload;
    expect(payload.scheduleType).toBe('WINDOW');
    expect(payload.scheduledStart).toMatch(ISO_DATETIME);
    expect(payload.scheduledEnd).toMatch(ISO_DATETIME);
  });

  it('submits scheduleType FIXED with a null scheduledEnd for a fixed appointment', async () => {
    const user = userEvent.setup();
    const job = makeJob({
      scheduledStart: '2026-08-01T09:00:00.000Z',
      scheduledEnd: null,
      scheduleType: 'FIXED',
    });
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderModal(job, onSave);

    await clickSave(user);

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const payload = onSave.mock.calls[0][0] as JobUpdatePayload;
    expect(payload.scheduleType).toBe('FIXED');
    expect(payload.scheduledStart).toMatch(ISO_DATETIME);
    expect(payload.scheduledEnd).toBeNull();
  });

  it('selecting Arrival window with an empty end time shows an inline message and does not call onSave', async () => {
    const user = userEvent.setup();
    const job = makeJob({
      scheduledStart: '2026-08-01T09:00:00.000Z',
      scheduledEnd: '2026-08-01T11:00:00.000Z',
      scheduleType: 'WINDOW',
    });
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { container } = renderModal(job, onSave);

    const [, windowEnd] = timeInputs(container);
    await user.clear(windowEnd);

    await clickSave(user);

    expect(await screen.findByText(en.schedArrivalWindowEndRequired)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('leaves the TBC flow untouched: no scheduleType is sent when both times are empty with a note', async () => {
    const user = userEvent.setup();
    const job = makeJob({
      scheduledStart: null,
      scheduledEnd: null,
      scheduleType: 'DURATION',
      schedulingNote: 'Waiting for customer confirmation',
    });
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderModal(job, onSave);

    await clickSave(user);

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const payload = onSave.mock.calls[0][0] as JobUpdatePayload;
    expect(payload.scheduleType).toBeUndefined();
    expect(payload.scheduledStart).toBeNull();
    expect(payload.scheduledEnd).toBeNull();
    expect(payload.schedulingNote).toBe('Waiting for customer confirmation');
  });
});
