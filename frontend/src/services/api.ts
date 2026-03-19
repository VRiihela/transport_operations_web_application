import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

class ApiService {
  private instance: AxiosInstance;
  private accessToken: string | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor() {
    this.instance = axios.create({
      baseURL: import.meta.env.VITE_API_URL as string,
      withCredentials: true,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.instance.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    this.instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Skip retry for auth endpoints to prevent infinite loops
        const isAuthEndpoint = original?.url?.includes('/api/auth/');

        if (error.response?.status === 401 && !original?._retry && !isAuthEndpoint) {
          original._retry = true;

          try {
            if (!this.refreshPromise) {
              this.refreshPromise = this.performRefresh().finally(() => {
                this.refreshPromise = null;
              });
            }
            await this.refreshPromise;

            original.headers.Authorization = `Bearer ${this.accessToken}`;
            return this.instance(original);
          } catch {
            this.setAccessToken(null);
            window.location.href = '/login';
            return Promise.reject(error);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async performRefresh(): Promise<void> {
    const response = await this.instance.post<{ accessToken: string }>('/api/auth/refresh');
    this.setAccessToken(response.data.accessToken);
  }

  public setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public get axios(): AxiosInstance {
    return this.instance;
  }
}

export const apiService = new ApiService();
export default apiService;
