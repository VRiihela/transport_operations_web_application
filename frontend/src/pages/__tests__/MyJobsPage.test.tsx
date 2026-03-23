import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import MyJobsPage from '../MyJobsPage';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../api/axios';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), patch: vi.fn(), post: vi.fn() },
}));

const mockLogout = vi.fn();
const mockUseAuth = useAuth as Mock;
const mockAxios = axiosInstance as unknown as { get: Mock; patch: Mock; post: Mock };

const jobsResponse = (jobs: object[]) => ({
  data: { data: { jobs, pagination: { page: 1, limit: 10, total: jobs.length, pages: 1 } } },
});

const mockJobs = [
  { id: '1', title: 'Delivery Job 1', status: 'ASSIGNED',    scheduledAt: '2024-01-15T10:00:00Z', location: '123 Main St',  notes: 'Handle with care' },
  { id: '2', title: 'Pickup Job 2',   status: 'IN_PROGRESS', scheduledAt: '2024-01-15T14:00:00Z', location: '456 Oak Ave',  notes: '' },
  { id: '3', title: 'Completed Job 3',status: 'COMPLETED',   scheduledAt: '2024-01-15T08:00:00Z', location: '789 Pine Rd',  notes: 'Customer satisfied' },
];

describe('MyJobsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ logout: mockLogout });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('renders loading state initially', () => {
    mockAxios.get.mockImplementation(() => new Promise(() => {}));
    render(<MyJobsPage />);
    expect(screen.getByText('My Jobs')).toBeInTheDocument();
    expect(screen.getByText('Loading your jobs...')).toBeInTheDocument();
  });

  it('fetches and displays jobs on mount', async () => {
    mockAxios.get.mockResolvedValueOnce(jobsResponse(mockJobs));
    render(<MyJobsPage />);
    await waitFor(() => {
      expect(screen.getByText('Delivery Job 1')).toBeInTheDocument();
      expect(screen.getByText('Pickup Job 2')).toBeInTheDocument();
      expect(screen.getByText('Completed Job 3')).toBeInTheDocument();
    });
    expect(mockAxios.get).toHaveBeenCalledWith('/api/jobs');
  });

  it('displays empty state when no jobs returned', async () => {
    mockAxios.get.mockResolvedValueOnce(jobsResponse([]));
    render(<MyJobsPage />);
    await waitFor(() => {
      expect(screen.getByText('No jobs assigned to you at the moment.')).toBeInTheDocument();
    });
  });

  it('displays error state on API failure', async () => {
    mockAxios.get.mockRejectedValueOnce(new Error('Network error'));
    render(<MyJobsPage />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load jobs')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('displays fallback error message when no specific error provided', async () => {
    mockAxios.get.mockRejectedValueOnce(new Error('Network error'));
    render(<MyJobsPage />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load jobs')).toBeInTheDocument();
    });
  });

  it('retries fetching jobs when retry button clicked', async () => {
    mockAxios.get
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(jobsResponse(mockJobs));
    render(<MyJobsPage />);
    await waitFor(() => screen.getByText('Try Again'));
    fireEvent.click(screen.getByText('Try Again'));
    await waitFor(() => {
      expect(screen.getByText('Delivery Job 1')).toBeInTheDocument();
    });
    expect(mockAxios.get).toHaveBeenCalledTimes(2);
  });

  describe('Job Card Rendering', () => {
    beforeEach(async () => {
      mockAxios.get.mockResolvedValueOnce(jobsResponse(mockJobs));
      render(<MyJobsPage />);
      await waitFor(() => screen.getByText('Delivery Job 1'));
    });

    it('displays all job information correctly', () => {
      expect(screen.getByText('Delivery Job 1')).toBeInTheDocument();
      expect(screen.getByText('Pickup Job 2')).toBeInTheDocument();
      expect(screen.getByText('Completed Job 3')).toBeInTheDocument();
      expect(screen.getByText('123 Main St')).toBeInTheDocument();
      expect(screen.getByText('456 Oak Ave')).toBeInTheDocument();
      expect(screen.getByText('789 Pine Rd')).toBeInTheDocument();
      expect(screen.getByText('Handle with care')).toBeInTheDocument();
      expect(screen.getByText('Customer satisfied')).toBeInTheDocument();
    });

    it('displays correct status badges', () => {
      expect(screen.getByText('ASSIGNED')).toBeInTheDocument();
      expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument();
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    });

    it('shows Start Job button only for ASSIGNED jobs', () => {
      expect(screen.getAllByText('Start Job')).toHaveLength(1);
    });

    it('shows Complete Job button only for IN_PROGRESS jobs', () => {
      expect(screen.getAllByText('Complete Job')).toHaveLength(1);
    });

    it('hides action buttons for COMPLETED jobs', () => {
      expect(screen.queryByTestId('job-actions-3')).not.toBeInTheDocument();
    });
  });

  describe('Status Updates', () => {
    beforeEach(async () => {
      mockAxios.get.mockResolvedValueOnce(jobsResponse(mockJobs));
      render(<MyJobsPage />);
      await waitFor(() => screen.getByText('Delivery Job 1'));
    });

    it('updates job status from ASSIGNED to IN_PROGRESS', async () => {
      mockAxios.patch.mockResolvedValueOnce({});
      fireEvent.click(screen.getByText('Start Job'));
      expect(screen.getByText('Starting...')).toBeInTheDocument();
      await waitFor(() => {
        expect(mockAxios.patch).toHaveBeenCalledWith('/api/jobs/1/status', { status: 'IN_PROGRESS' });
      });
      await waitFor(() => {
        expect(screen.queryByText('Starting...')).not.toBeInTheDocument();
        expect(screen.getAllByText('IN_PROGRESS')).toHaveLength(2);
      });
    });

    it('shows Mark Completed button when completion report is approved', async () => {
      const jobsWithApprovedReport = mockJobs.map((j) =>
        j.id === '2'
          ? { ...j, completionReport: { id: 'r1', jobId: '2', workDescription: 'Done', actualStart: '2024-01-15T14:00:00Z', actualEnd: '2024-01-15T16:00:00Z', totalHours: 2, customerName: 'Test', approvedAt: '2024-01-15T16:05:00Z' } }
          : j
      );
      mockAxios.get.mockReset();
      mockAxios.get.mockResolvedValueOnce(jobsResponse(jobsWithApprovedReport));
      const { unmount } = render(<MyJobsPage />);
      await waitFor(() => screen.getByText('Mark Completed'));
      expect(screen.getByText('Mark Completed')).toBeInTheDocument();
      unmount();
    });

    it('marks job as COMPLETED when Mark Completed is clicked', async () => {
      const jobsWithApprovedReport = mockJobs.map((j) =>
        j.id === '2'
          ? { ...j, completionReport: { id: 'r1', jobId: '2', workDescription: 'Done', actualStart: '2024-01-15T14:00:00Z', actualEnd: '2024-01-15T16:00:00Z', totalHours: 2, customerName: 'Test', approvedAt: '2024-01-15T16:05:00Z' } }
          : j
      );
      mockAxios.get.mockReset();
      mockAxios.get.mockResolvedValueOnce({ data: { data: { jobs: jobsWithApprovedReport, pagination: { page: 1, limit: 10, total: 3, pages: 1 } } } });
      const { unmount } = render(<MyJobsPage />);
      await waitFor(() => screen.getByText('Mark Completed'));
      mockAxios.patch.mockResolvedValueOnce({});
      mockAxios.get.mockResolvedValueOnce(jobsResponse(mockJobs));
      fireEvent.click(screen.getByText('Mark Completed'));
      await waitFor(() => {
        expect(mockAxios.patch).toHaveBeenCalledWith('/api/jobs/2/status', { status: 'COMPLETED' });
      });
      unmount();
    });

    it('shows error and re-enables button on status update failure', async () => {
      mockAxios.patch.mockRejectedValueOnce(new Error('Network error'));
      fireEvent.click(screen.getByText('Start Job'));
      await waitFor(() => {
        expect(screen.getByText('Failed to update job status')).toBeInTheDocument();
      });
      expect(screen.getByText('Start Job')).not.toBeDisabled();
    });

    it('disables button during status update', async () => {
      mockAxios.patch.mockImplementation(() => new Promise(() => {}));
      fireEvent.click(screen.getByText('Start Job'));
      expect(screen.getByText('Starting...')).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('handles job with empty notes field', async () => {
      mockAxios.get.mockResolvedValueOnce(
        jobsResponse([{ id: '1', title: 'Test Job', status: 'ASSIGNED', scheduledAt: '2024-01-15T10:00:00Z', location: 'Test Location', notes: '' }])
      );
      render(<MyJobsPage />);
      await waitFor(() => screen.getByText('Test Job'));
      expect(screen.queryByText('Notes:')).not.toBeInTheDocument();
    });

    it('handles job with invalid date gracefully', async () => {
      mockAxios.get.mockResolvedValueOnce(
        jobsResponse([{ id: '1', title: 'Test Job', status: 'ASSIGNED', scheduledAt: 'invalid-date', location: 'Test Location', notes: '' }])
      );
      render(<MyJobsPage />);
      await waitFor(() => {
        expect(screen.getByText('Test Job')).toBeInTheDocument();
        expect(screen.getAllByText('Scheduled:').length).toBeGreaterThan(0);
      });
    });

    it('handles concurrent status updates on two jobs', async () => {
      const twoJobs = [
        { id: '1', title: 'Job 1', status: 'ASSIGNED', scheduledAt: null, location: null, notes: null },
        { id: '2', title: 'Job 2', status: 'ASSIGNED', scheduledAt: null, location: null, notes: null },
      ];
      mockAxios.get.mockResolvedValueOnce(jobsResponse(twoJobs));
      mockAxios.patch.mockResolvedValue({});
      render(<MyJobsPage />);
      await waitFor(() => expect(screen.getAllByText('Start Job')).toHaveLength(2));

      const [btn1, btn2] = screen.getAllByText('Start Job');
      fireEvent.click(btn1);
      fireEvent.click(btn2);

      await waitFor(() => expect(screen.getAllByText('Starting...')).toHaveLength(2));
      await waitFor(() => expect(mockAxios.patch).toHaveBeenCalledTimes(2));
    });
  });
});
