import api from './api';

export const pushAPI = {
  registerToken: (token: string) => api.put('/auth/push-token', { token })
};
