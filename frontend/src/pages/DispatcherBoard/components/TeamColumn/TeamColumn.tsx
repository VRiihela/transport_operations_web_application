import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Team, Job } from '../../types';
import JobCard from '../JobCard/JobCard';
import styles from './TeamColumn.module.css';

interface TeamColumnProps {
  team: Team;
  jobs: Job[];
  onDelete: (teamId: string) => Promise<void>;
  onCardClick?: (job: Job) => void;
}

const TeamColumn: React.FC<TeamColumnProps> = ({ team, jobs, onDelete, onCardClick }) => {
  const { isOver, setNodeRef } = useDroppable({ id: team.id });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const memberNames = team.members
    .map((m) => m.user.name ?? m.user.email)
    .join(', ');

  const handleDelete = async (): Promise<void> => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(team.id);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete team');
      setDeleting(false);
    }
  };

  return (
    <div ref={setNodeRef} className={`${styles.column} ${isOver ? styles.over : ''}`}>
      <div className={styles.header}>
        <div className={styles.info}>
          <h3 className={styles.name}>{team.name}</h3>
          {memberNames && <p className={styles.members}>{memberNames}</p>}
        </div>
        <button
          className={styles.deleteBtn}
          onClick={() => setConfirmDelete(true)}
          aria-label={`Delete team ${team.name}`}
          disabled={deleting}
          title="Delete team"
        >
          ×
        </button>
      </div>

      <div className={styles.jobs}>
        {jobs.length === 0 ? (
          <p className={styles.empty}>No assigned jobs.</p>
        ) : (
          jobs.map((job) => (
            <JobCard key={job.id} job={job} draggable onCardClick={onCardClick} />
          ))
        )}
      </div>

      {confirmDelete && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmBox}>
            <p className={styles.confirmText}>
              Delete &ldquo;{team.name}&rdquo;?
            </p>
            {deleteError && <p className={styles.confirmError}>{deleteError}</p>}
            <div className={styles.confirmActions}>
              <button
                onClick={() => { setConfirmDelete(false); setDeleteError(null); }}
                disabled={deleting}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={styles.confirmDeleteBtn}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamColumn;
