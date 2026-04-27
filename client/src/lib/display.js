import { formatDistanceToNow } from "date-fns";

export function getFirstName(name = "") {
  return String(name).trim().split(/\s+/)[0] || "User";
}

export function getInitials(name = "") {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "U";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function roleLabel(user = {}) {
  if (user?.userType === "student") return "Student";
  if (user?.userType === "local") return "Local";
  return "User";
}

export function postedAgo(dateValue) {
  if (!dateValue) return "";
  return formatDistanceToNow(new Date(dateValue), { addSuffix: true });
}

const fallbackByCategory = {
  books: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800",
  electronics: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800",
  furniture: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800",
  clothes: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800",
  cycles: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800",
  kitchenware: "https://images.unsplash.com/photo-1516594798947-e65505dbb29d?w=800",
  sports: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800"
};

export function getListingFallbackImage(category = "") {
  return fallbackByCategory[String(category).toLowerCase()] || "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800";
}
