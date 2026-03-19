import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import MyJobsPage from '../MyJobsPage';
import { useAuth } from '../../contexts/AuthContext';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockLogout = vi.fn();
const mockUseAuth = useAuth as Mock;

describe('MyJobsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ logout: mockLogout });
  });

  describe('Rendering', () => {
    it('renders page title and logout button', () => {
      render(<MyJobsPage />);
      expect(screen.getByRole('heading', { name: 'My Jobs' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });

    it('displays placeholder text', () => {
      render(<MyJobsPage />);
      expect(
        screen.getByText(
          'Your job assignments will appear here once the backend integration is complete.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Logout', () => {
    it('calls logout when logout button is clicked', () => {
      render(<MyJobsPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });
});
