import apiService from '../../services/api';
import { Team } from './types';

export const teamsApi = {
  async getTeams(date: string): Promise<Team[]> {
    const res = await apiService.axios.get<{ data: Team[] }>(
      `/api/teams?date=${encodeURIComponent(date)}`,
    );
    return res.data.data;
  },

  async createTeam(name: string, date: string, driverIds: string[]): Promise<Team> {
    const res = await apiService.axios.post<{ data: Team }>('/api/teams', {
      name,
      date,
      driverIds,
    });
    return res.data.data;
  },

  async deleteTeam(teamId: string): Promise<void> {
    await apiService.axios.delete(`/api/teams/${teamId}`);
  },
};
