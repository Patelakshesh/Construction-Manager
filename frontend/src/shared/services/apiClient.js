import axios from "axios";

const runtimeBaseUrl =
  typeof window !== "undefined" && window.__APP_CONFIG__?.API_BASE_URL
    ? window.__APP_CONFIG__.API_BASE_URL.trim()
    : "";

const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const shouldUseEnv = import.meta.env.DEV && envBaseUrl;

const apiClient = axios.create({
  baseURL:
    (shouldUseEnv ? envBaseUrl : runtimeBaseUrl) ||
    envBaseUrl ||
    "https://jsonplaceholder.typicode.com",
  timeout: 10000,
});

// ── Request interceptor: attach token from localStorage on every call
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: clear session and redirect to login on 401
apiClient.interceptors.response.use(
  (response) => {
    if (response?.data?.errors?.length) {
      const errorMsg = response.data.errors[0].message;
      const error = new Error(errorMsg);
      error.response = response;
      error.isGraphQL = true;
      return Promise.reject(error);
    }
    return response;
  },
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      localStorage.removeItem("authExpiresOn");
      // Dispatch a storage event so AppRouter reacts immediately
      window.dispatchEvent(new Event("auth:logout"));
    }
    const gqlMessage = error?.response?.data?.errors?.[0]?.message;
    if (gqlMessage) {
      error.message = gqlMessage;
    }
    return Promise.reject(error);
  }
);

export default apiClient;
