import { createContext, useContext, useState, useEffect } from "react";
import { storage } from "../services/storage";
import { useToast } from "./ToastContext";

const FavoritesContext = createContext();

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(() => storage.getFavorites());
  const { showToast } = useToast();

  useEffect(() => {
    storage.setFavorites(favorites);
  }, [favorites]);

  const toggleFavorite = (jobId) => {
    setFavorites(prev => {
      const exists = prev.includes(jobId);
      if (exists) {
        showToast("Đã xóa khỏi danh sách yêu thích");
        return prev.filter(id => id !== jobId);
      } else {
        showToast("Đã lưu vào danh sách việc làm yêu thích");
        return [...prev, jobId];
      }
    });
  };

  const isFavorite = (jobId) => favorites.includes(jobId);

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => useContext(FavoritesContext);
