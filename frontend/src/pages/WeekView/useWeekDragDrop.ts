import { useState, useCallback, useRef } from 'react';
import { isAxiosError } from 'axios';
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import type { AxiosInstance } from 'axios';
import type { Job } from '../../types/jobApi';
import type { DraggableJobData, WeekDragError } from './WeekView.types';
import { extractHelsinkiHHMM, buildUtcIsoForHelsinki } from '../../utils/helsinkiTime';

interface UseWeekDragDropParams {
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  axiosInstance: AxiosInstance;
}

interface UseWeekDragDropReturn {
  activeJob: Job | null;
  overId: string | null;
  dragError: WeekDragError | null;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  clearError: (jobId: string) => void;
}

export function useWeekDragDrop({
  jobs,
  setJobs,
  axiosInstance,
}: UseWeekDragDropParams): UseWeekDragDropReturn {
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dragError, setDragError] = useState<WeekDragError | null>(null);

  // Keep a ref to latest jobs to read inside callbacks without stale closure
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DraggableJobData | undefined;
    if (data?.job) {
      setActiveJob(data.job);
      setDragError(null);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId(event.over?.id ? String(event.over.id) : null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveJob(null);
      setOverId(null);

      if (!over) return;

      const data = active.data.current as DraggableJobData | undefined;
      if (!data?.job) return;

      const job = data.job;
      const targetDateISO = String(over.id);

      const sourceHHMM = extractHelsinkiHHMM(job.scheduledStart);

      // Determine the source date in Helsinki timezone for same-column detection
      let sourceDateISO: string | null = null;
      if (job.scheduledStart) {
        const sourceDate = new Date(job.scheduledStart);
        if (!isNaN(sourceDate.getTime())) {
          const formatter = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Europe/Helsinki',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
          const parts = formatter.formatToParts(sourceDate);
          const y = parts.find((p) => p.type === 'year')?.value;
          const m = parts.find((p) => p.type === 'month')?.value;
          const d = parts.find((p) => p.type === 'day')?.value;
          if (y && m && d) sourceDateISO = `${y}-${m}-${d}`;
        }
      }

      if (sourceDateISO === targetDateISO) return;

      let newScheduledStart: string;
      try {
        newScheduledStart = buildUtcIsoForHelsinki(targetDateISO, sourceHHMM);
      } catch (err) {
        console.error('[useWeekDragDrop] Failed to build new scheduledStart:', err);
        setDragError({ jobId: job.id, message: 'Invalid date calculation. Please try again.' });
        return;
      }

      // FIX #6: Capture snapshot inside the functional updater — no stale closure
      let snapshot: Job[] = [];
      setJobs((current) => {
        snapshot = current;
        return current.map((j) =>
          j.id === job.id ? { ...j, scheduledStart: newScheduledStart } : j
        );
      });

      try {
        await axiosInstance.patch(`/api/jobs/${job.id}/schedule`, {
          scheduledStart: newScheduledStart,
        });
      } catch (err) {
        setJobs(snapshot);

        // FIX #7: Use axios.isAxiosError instead of manual type narrowing
        let message = 'Failed to reschedule job. Please try again.';
        if (isAxiosError(err)) {
          const apiError = (err.response?.data as { error?: string } | undefined)?.error;
          if (typeof apiError === 'string') message = apiError;
        }

        setDragError({ jobId: job.id, message });
      }
    },
    // FIX #6: 'jobs' removed from deps — snapshot captured inside setJobs functional updater
    [setJobs, axiosInstance]
  );

  const clearError = useCallback((jobId: string) => {
    setDragError((prev) => (prev?.jobId === jobId ? null : prev));
  }, []);

  return {
    activeJob,
    overId,
    dragError,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    clearError,
  };
}
