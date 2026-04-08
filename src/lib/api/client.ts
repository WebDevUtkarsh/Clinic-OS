import axios from "axios";

export const UNAUTHORIZED_EVENT = "clinicos:unauthorized";

export class ApiClientError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiClientError";
  }
}


import { useUIStore } from "@/lib/store/ui-store";

export const apiClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const facilityId = useUIStore.getState().activeFacilityId;
  
  if (facilityId && !config.headers["x-facility-id"]) {
    config.headers["x-facility-id"] = facilityId;
  }
  
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      }
      return Promise.reject(new ApiClientError("Unauthorized", 401));
    }
    
    const message = error.response?.data?.error || error.message || "An error occurred";
    const status = error.response?.status || 500;
    
    return Promise.reject(new ApiClientError(message, status));
  }
);
