import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import JobsPage from '../JobsPage';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../api/axios';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockLogout = vi.fn();
const mockUseAuth = useAuth as Mock;
const mockAxios = axiosInstance as unknown as { get: Mock; post: Mock; patch: Mock };

const emptyJobsResponse = { data: { data: { jobs: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } } } };

describe('JobsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ logout: mockLogout });
    mockAxios.get.mockResolvedValue(emptyJobsResponse);
  });

  describe('Rendering', () => {
    it('renders heading, Create Job and Logout buttons after loading', async () => {
      render(<JobsPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Jobs Management' })).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create Job' })).toBeInTheDocument();
    });

    it('displays loading state initially', () => {
      mockAxios.get.mockImplementation(() => new Promise(() => {})); // never resolves
      render(<JobsPage />);
      expect(screen.getByText('Loading jobs…')).toBeInTheDocument();
    });

    it('displays empty state when no jobs returned', async () => {
      render(<JobsPage />);
      await waitFor(() => {
        expect(
          screen.getByText('No jobs yet. Create your first job to get started.')
        ).toBeInTheDocument();
      });
    });

    it('displays job rows when jobs are returned', async () => {
      mockAxios.get.mockResolvedValue({
        data: {
          data: {
            jobs: [
              {
                id: 'job-1',
                title: 'Deliver cargo',
                description: null,
                status: 'DRAFT',
                assignedDriverId: null,
                assignedDriver: null,
                scheduledAt: null,
                location: null,
                createdAt: '2026-03-19T00:00:00Z',
                updatedAt: '2026-03-19T00:00:00Z',
              },
            ],
            pagination: { page: 1, limit: 10, total: 1, pages: 1 },
          },
        },
      });

      render(<JobsPage />);
      await waitFor(() => {
        expect(screen.getByText('Deliver cargo')).toBeInTheDocument();
      });
      expect(screen.getByText('DRAFT')).toBeInTheDocument();
    });
  });

  describe('Logout', () => {
    it('calls logout when Logout button is clicked', async () => {
      render(<JobsPage />);
      await waitFor(() => screen.getByRole('button', { name: 'Logout' }));
      fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('Create Job modal', () => {
    it('opens modal when Create Job is clicked', async () => {
      render(<JobsPage />);
      await waitFor(() => screen.getByRole('button', { name: 'Create Job' }));
      fireEvent.click(screen.getByRole('button', { name: 'Create Job' }));
      expect(screen.getByRole('heading', { name: 'Create New Job' })).toBeInTheDocument();
    });

    it('shows title validation error if form submitted with empty title', async () => {
      render(<JobsPage />);
      await waitFor(() => screen.getByRole('button', { name: 'Create Job' }));
      fireEvent.click(screen.getByRole('button', { name: 'Create Job' }));

      // Modal is open — submit the form without filling in title
      const form = document.querySelector('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
      });
    });
  });

  describe('Error handling', () => {
    it('shows error banner when job fetch fails', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network error'));
      render(<JobsPage />);
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });
});
