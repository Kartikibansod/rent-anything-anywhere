import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
export const APP_BASE_URL = API_BASE_URL.startsWith("http") ? API_BASE_URL.replace(/\/api\/?$/, "") : "";

export const api = axios.create({
  baseURL: API_BASE_URL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  config.headers = config.headers || {};
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function getErrorMessage(error, fallback = "Something went wrong") {
  return error.response?.data?.message || error.message || fallback;
}

export async function markChatAsRead(chatId) {
  const { data } = await api.patch(`/messages/chat/${chatId}/read`);
  return data;
}

export async function getMyBookings() {
  const { data } = await api.get("/bookings/my");
  return data.bookings || data.data || [];
}

export async function createReview(payload) {
  const { data } = await api.post("/reviews", payload);
  return data;
}

export async function checkReviewEligibility(transactionId) {
  try {
    const { data } = await api.get(`/reviews/eligibility/${transactionId}`);
    return data;
  } catch {
    // Fallback for backends without eligibility route
    return { data: { eligible: true, alreadyReviewed: false } };
  }
}

export async function getUserProfile(userId) {
  const { data } = await api.get(`/auth/users/${userId}`);
  return data.user || data.data || data;
}

export async function getSellerReviews(userId, page = 1, limit = 5) {
  const { data } = await api.get(`/reviews/seller/${userId}`, {
    params: { page, limit }
  });
  return data;
}

export async function submitReport(payload) {
  const { data } = await api.post("/reports", payload);
  return data.report || data;
}
