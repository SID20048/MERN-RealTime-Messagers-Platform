import axios from "axios";

// Force Axios to include cookies for all requests
axios.defaults.withCredentials = true;

export const API = axios.create({
  baseURL:
    import.meta.env.MODE === "development"
      ? `${import.meta.env.VITE_API_URL}/api`
      : "/api",
  withCredentials: true,
});
