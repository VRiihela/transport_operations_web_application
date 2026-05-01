import { useState, useEffect, useCallback } from 'react';
import { Team } from '../types';
import { teamsApi } from '../teamsApi';

export function useTeams(selectedDate: string) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await teamsApi.getTeams(selectedDate);
      setTeams(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch teams');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void fetchTeams();
  }, [fetchTeams]);

  const createTeam = async (name: string, driverIds: string[]): Promise<Team> => {
    const team = await teamsApi.createTeam(name, selectedDate, driverIds);
    await fetchTeams();
    return team;
  };

  const deleteTeam = async (teamId: string): Promise<void> => {
    await teamsApi.deleteTeam(teamId);
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
  };

  return { teams, loading, error, createTeam, deleteTeam, refetch: fetchTeams };
}
