import { createContext, useContext } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import { useCandidateData } from "../hooks/useCandidateData";
import { getSaved, saveFavorites } from "../services/candidateService";
const FavoritesContext = createContext();
export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const favorites = useCandidateData(() =>
    user?.role === "candidate" ? getSaved(user) : [],
  );
  function toggleFavorite(id) {
    if (user?.role !== "candidate") {
      showToast("Hãy đăng nhập vai trò ứng viên để lưu việc làm.");
      return;
    }
    const current = getSaved(user);
    const exists = current.includes(id);
    try {
      saveFavorites(
        user,
        exists ? current.filter((x) => x !== id) : [...current, id],
      );
      showToast(exists ? "Đã bỏ lưu công việc." : "Đã lưu công việc.");
    } catch (e) {
      showToast(e.message);
    }
  }
  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        toggleFavorite,
        isFavorite: (id) => favorites.includes(id),
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}
export const useFavorites = () => useContext(FavoritesContext);
