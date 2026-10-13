import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

export function getApiErrorMessage(error, fallback) {
  const data = error?.response?.data;
  if (typeof data === "string") {
    return data;
  }

  if (!data || typeof data !== "object") {
    return fallback;
  }

  const messages = Object.entries(data).flatMap(([field, value]) => {
    const values = Array.isArray(value) ? value : [value];
    return values
      .filter((item) => typeof item === "string")
      .map((item) => field === "detail" || field === "non_field_errors"
        ? item
        : `${field.replaceAll("_", " ")}: ${item}`);
  });

  return messages.length ? messages.join(" ") : fallback;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export function clearAuthTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
  delete api.defaults.headers.common.Authorization;
}

export function redirectToLogin() {
  const currentPath = window.location.pathname;

  if (currentPath !== "/login" && currentPath !== "/register") {
    window.location.assign("/login");
  }
}

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let refreshQueue = [];

const processRefreshQueue = (error, newAccessToken = null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
      return;
    }

    resolve(newAccessToken);
  });

  refreshQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    if (error.response.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem("refresh_token");

      if (!refreshToken) {
        clearAuthTokens();
        redirectToLogin();
        return Promise.reject(error);
      }


      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((newAccessToken) => {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        });
      }


      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
          refresh: refreshToken,
        });

        const nextAccessToken = response.data.access;
        localStorage.setItem("access_token", nextAccessToken);
        api.defaults.headers.common.Authorization = `Bearer ${nextAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;

        processRefreshQueue(null, nextAccessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processRefreshQueue(refreshError);
        clearAuthTokens();
        redirectToLogin();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
