import { create } from 'zustand';
import { AuthAPI } from '../api';

const useAuth = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  setTokenAndUser: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
  },
  login: async (email, password) => {
    const res = await AuthAPI.login(email, password);
    if (res && res.token && res.user) {
      get().setTokenAndUser(res.token, res.user);
      return true;
    }
    return false;
  },
  requestAccount: async (name, email, role) => {
    return AuthAPI.requestAccount(name, email, role);
  },
  isAuthenticated: () => !!get().token,
}));

export default useAuth;
