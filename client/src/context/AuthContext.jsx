import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE_URL, apiFetch as fetch } from '../api.js';
import { io } from 'socket.io-client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('teamtask_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('teamtask_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [showLaunchScreen, setShowLaunchScreen] = useState(false);

  // Toast Helper
  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch current user details & notifications
  const refreshUser = useCallback(async () => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.sessionTerminated) {
        addToast(data.message || 'Your account was logged in from another device.', 'error');
        logout();
        return;
      }
      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem('teamtask_user', JSON.stringify(data.user));
      } else {
        // Token invalid
        logout();
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadNotificationsCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [token]);

  const markNotificationRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadNotificationsCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadNotificationsCount(0);
      addToast('All notifications marked as read', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  // Socket Connection
  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const newSocket = io(API_BASE_URL || undefined, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Socket connected successfully');
    });

    newSocket.on('new_message', (msg) => {
      addToast(`💬 New message from ${msg.sender_name}`, 'info');
      fetchNotifications();
    });

    newSocket.on('task_created', (data) => {
      addToast(`📋 Task Created: "${data.title}"`, 'info');
      fetchNotifications();
    });

    newSocket.on('task_status_changed', () => {
      fetchNotifications();
    });

    newSocket.on('session_terminated', (data) => {
      addToast(data.message || 'Your account was logged in from another device. Terminating session.', 'error');
      logout();
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, user?.id]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (token) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 20000);
      return () => clearInterval(interval);
    }
  }, [token, fetchNotifications]);

  // Login (supports portalRole = 'user' | 'admin')
  const login = async (email, password, portalRole = null) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, portalRole })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Login failed');
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('teamtask_token', data.token);
      localStorage.setItem('teamtask_user', JSON.stringify(data.user));
      setShowLaunchScreen(true);
      addToast(`Welcome back, ${data.user.name}!`, 'success');
      return data;
    } catch (err) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  // Logout
  const logout = () => {
    setToken(null);
    setUser(null);
    setShowLaunchScreen(false);
    localStorage.removeItem('teamtask_token');
    localStorage.removeItem('teamtask_user');
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    addToast('You have been logged out.', 'info');
  };

  // Check Name Availability
  const checkNameAvailability = async (name) => {
    if (!name || !name.trim()) return { available: true };
    try {
      const res = await fetch('/api/auth/check-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });
      return await res.json();
    } catch {
      return { available: true };
    }
  };

  // Send OTP (validates email and name uniqueness)
  const sendOtp = async (email, name = null) => {
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to send verification code');
      }
      addToast(`Verification code sent to ${email}`, 'success');
      return data;
    } catch (err) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  // Verify OTP
  const verifyOtp = async (email, otp) => {
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Invalid verification code');
      }
      addToast('Email verified successfully!', 'success');
      return data;
    } catch (err) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  // Register
  const register = async ({ name, email, password, otp, department }) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, otp, department })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Registration failed');
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('teamtask_token', data.token);
      localStorage.setItem('teamtask_user', JSON.stringify(data.user));
      setShowLaunchScreen(true);
      addToast(`Account created! Welcome to the team, ${data.user.name}!`, 'success');
      return data;
    } catch (err) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  // Update Profile (Admin or regular User)
  const updateUserProfile = async ({ name, email, avatar, department, newPassword }) => {
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, avatar, department, newPassword })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to update profile');
      }
      setUser(data.user);
      localStorage.setItem('teamtask_user', JSON.stringify(data.user));
      addToast('Profile updated successfully!', 'success');
      return data.user;
    } catch (err) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  // Update Admin Profile (Backward-compatible alias)
  const updateAdminProfile = updateUserProfile;

  // Forgot Password - Step 1: Send OTP
  const forgotPasswordSendOtp = async (email) => {
    try {
      const res = await fetch('/api/auth/forgot-password/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to send reset code');
      addToast(`Password reset code sent to ${email}`, 'success');
      return data;
    } catch (err) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  // Forgot Password - Step 2: Verify OTP
  const forgotPasswordVerifyOtp = async (email, otp) => {
    try {
      const res = await fetch('/api/auth/forgot-password/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Invalid OTP');
      addToast('OTP verified! Set your new password.', 'success');
      return data;
    } catch (err) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  // Forgot Password - Step 3: Reset Password
  const forgotPasswordReset = async (email, otp, newPassword) => {
    try {
      const res = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to reset password');
      addToast('Password reset successfully! You can now log in.', 'success');
      return data;
    } catch (err) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  // Change Password (for authenticated users) - Step 1: Send OTP
  const changePasswordSendOtp = async () => {
    try {
      const res = await fetch('/api/auth/change-password/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to send verification code');
      addToast('Verification code sent to your email!', 'success');
      return data;
    } catch (err) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  // Change Password - Step 2: Reset with OTP
  const changePasswordReset = async (otp, newPassword) => {
    try {
      const res = await fetch('/api/auth/change-password/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ otp, newPassword })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to change password');
      addToast('Password changed successfully!', 'success');
      return data;
    } catch (err) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        socket,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        checkNameAvailability,
        sendOtp,
        verifyOtp,
        register,
        refreshUser,
        updateUserProfile,
        updateAdminProfile,
        forgotPasswordSendOtp,
        forgotPasswordVerifyOtp,
        forgotPasswordReset,
        changePasswordSendOtp,
        changePasswordReset,
        notifications,
        unreadNotificationsCount,
        fetchNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        toasts,
        addToast,
        removeToast,
        showLaunchScreen,
        setShowLaunchScreen,
        dismissLaunchScreen: () => setShowLaunchScreen(false)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
