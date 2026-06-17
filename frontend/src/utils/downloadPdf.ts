import axiosInstance from '../api/axios';

export async function downloadCompletionReportPdf(jobId: string): Promise<void> {
  const response = await axiosInstance.get(`/api/jobs/${jobId}/completion-report/pdf`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `completion-report-${jobId}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
