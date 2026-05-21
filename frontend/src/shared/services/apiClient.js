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

export default apiClient;
