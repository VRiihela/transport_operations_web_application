import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import JobsPage from '../JobsPage';
import { useAuth } from '../../contexts/AuthContext';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockLogout = vi.fn();
const mockUseAuth = useAuth as Mock;

describe('JobsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ logout: mockLogout });
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('Rendering', () => {
    it('renders page title and main elements', () => {
      render(<JobsPage />);
      expect(screen.getByRole('heading', { name: 'Jobs' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create Job' })).toBeInTheDocument();
    });

    it('displays placeholder text', () => {
      render(<JobsPage />);
      expect(
        screen.getByText('Job listings will appear here once the backend integration is complete.')
      ).toBeInTheDocument();
    });
  });

  describe('Logout', () => {
    it('calls logout when logout button is clicked', () => {
      render(<JobsPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('Create Job button', () => {
    it('logs message when create job button is clicked', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      render(<JobsPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Create Job' }));
      expect(consoleSpy).toHaveBeenCalledWith('Create job clicked');
    });
  });
});
