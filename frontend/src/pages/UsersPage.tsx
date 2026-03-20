import React, { useState, useEffect, useCallback } from 'react';
import { isAxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../api/axios';
import styles from './UsersPage.module.css';

type UserRole = 'Admin' | 'Dispatcher' | 'Driver';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

interface UsersApiResponse {
  data: User[];
}

interface SingleUserApiResponse {
  data: User;
}

interface CreateForm {
  email: string;
  password: string;
  role: 'Driver' | 'Dispatcher';
}

function getApiError(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const msg = (err.response?.data as { error?: string } | undefined)?.error;
    if (msg) return msg;
  }
  return fallback;
}

const UsersPage: React.FC = () => {
  const { user: currentUser, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>({ email: '', password: '', role: 'Driver' });
  const [creating, setCreating] = useState(false);

  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const fetchUsers = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const res = await axiosInstance.get<UsersApiResponse>('/api/users');
      setUsers(res.data.data);
    } catch (err) {
      setError(getApiError(err, 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await axiosInstance.post<SingleUserApiResponse>('/api/users', createForm);
      setUsers((prev) => [...prev, res.data.data]);
      setCreateForm({ email: '', password: '', role: 'Driver' });
      setShowCreateModal(false);
      setSuccess('User created successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setError('Email already in use');
      } else {
        setError(getApiError(err, 'Failed to create user'));
      }
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (targetUser: User): Promise<void> => {
    setTogglingIds((prev) => new Set([...prev, targetUser.id]));
    setError(null);
    try {
      await axiosInstance.patch<SingleUserApiResponse>(`/api/users/${targetUser.id}`, {
        isActive: !targetUser.isActive,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, isActive: !targetUser.isActive } : u))
      );
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 403) {
        setError('Cannot deactivate your own account');
      } else {
        setError(getApiError(err, 'Failed to update user'));
      }
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetUser.id);
        return next;
      });
    }
  };

  const handleResetPassword = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!resetUser) return;
    setResetting(true);
    setError(null);
    try {
      await axiosInstance.post(`/api/users/${resetUser.id}/reset-password`, { newPassword });
      setResetUser(null);
      setNewPassword('');
      setSuccess(`Password reset for ${resetUser.email}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(getApiError(err, 'Failed to reset password'));
    } finally {
      setResetting(false);
    }
  };

  const getRoleBadgeClass = (role: UserRole): string => {
    switch (role) {
      case 'Admin':      return styles.roleAdmin;
      case 'Dispatcher': return styles.roleDispatcher;
      case 'Driver':     return styles.roleDriver;
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1>User Management</h1>
        </div>
        <div className={styles.loading}>Loading users...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1>User Management</h1>
          <Link to="/jobs" className={styles.navLink}>← Jobs</Link>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.createButton} onClick={() => setShowCreateModal(true)}>
            Create User
          </button>
          <button className={styles.logoutButton} onClick={() => void logout()}>
            Logout
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner} role="alert">
          {error}
          <button className={styles.errorDismiss} onClick={() => setError(null)}>×</button>
        </div>
      )}
      {success && <div className={styles.successBanner}>{success}</div>}

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={!u.isActive ? styles.inactiveRow : ''}>
                <td className={!u.isActive ? styles.strikethrough : ''}>{u.email}</td>
                <td>{u.name ?? '—'}</td>
                <td>
                  <span className={`${styles.roleBadge} ${getRoleBadgeClass(u.role)}`}>
                    {u.role}
                  </span>
                </td>
                <td>
                  <span className={u.isActive ? styles.activeStatus : styles.inactiveStatus}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    {u.id !== currentUser?.id && (
                      <button
                        className={u.isActive ? styles.deactivateButton : styles.activateButton}
                        onClick={() => void handleToggleActive(u)}
                        disabled={togglingIds.has(u.id)}
                      >
                        {togglingIds.has(u.id)
                          ? '...'
                          : u.isActive
                          ? 'Deactivate'
                          : 'Activate'}
                      </button>
                    )}
                    <button
                      className={styles.resetButton}
                      onClick={() => { setResetUser(u); setError(null); }}
                    >
                      Reset Password
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>Create New User</h2>
            <form onSubmit={(e) => void handleCreateUser(e)} noValidate>
              <div className={styles.formGroup}>
                <label htmlFor="cu-email">Email *</label>
                <input
                  id="cu-email"
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="cu-password">Password * (min 8 chars)</label>
                <input
                  id="cu-password"
                  type="password"
                  required
                  minLength={8}
                  value={createForm.password}
                  onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="cu-role">Role *</label>
                <select
                  id="cu-role"
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, role: e.target.value as 'Driver' | 'Dispatcher' }))
                  }
                >
                  <option value="Driver">Driver</option>
                  <option value="Dispatcher">Dispatcher</option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateForm({ email: '', password: '', role: 'Driver' });
                    setError(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.submitButton} disabled={creating}>
                  {creating ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetUser && (
        <div className={styles.modalOverlay} onClick={() => setResetUser(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>Reset Password</h2>
            <p className={styles.modalSubtitle}>
              Setting new password for <strong>{resetUser.email}</strong>
            </p>
            <form onSubmit={(e) => void handleResetPassword(e)} noValidate>
              <div className={styles.formGroup}>
                <label htmlFor="rp-password">New Password * (min 8 chars)</label>
                <input
                  id="rp-password"
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => { setResetUser(null); setNewPassword(''); setError(null); }}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.submitButton} disabled={resetting}>
                  {resetting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
