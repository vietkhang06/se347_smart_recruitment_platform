import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

const FavoritesContext = createContext();

function read(key) {
  try {
    const list = JSON.parse(
      localStorage.getItem(key) || "[]"
    );

    return Array.isArray(list)
      ? [...new Set(list.map(String))]
      : [];
  } catch {
    return [];
  }
}

function AccountFavorites({ children, account }) {
  const key = `matchajob-favorites:${account}`;
  const { showToast } = useToast();

  const [favorites, setFavorites] = useState(
    () => read(key)
  );

  useEffect(() => {
    const sync = event => {
      if (!event.key || event.key === key) {
        setFavorites(read(key));
      }
    };

    window.addEventListener("storage", sync);

    return () =>
      window.removeEventListener("storage", sync);
  }, [key]);

  const toggleFavorite = jobId => {
    const id = String(jobId);
    const current = read(key);
    const exists = current.includes(id);

    const next = exists
      ? current.filter(value => value !== id)
      : [...current, id];

    try {
      localStorage.setItem(key, JSON.stringify(next));
      setFavorites(next);

      showToast(
        exists
          ? "Đã bỏ lưu việc làm."
          : "Đã lưu việc làm."
      );
    } catch {
      showToast(
        "Không lưu được. Kiểm tra bộ nhớ trình duyệt."
      );
    }
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        toggleFavorite,
        isFavorite: id => favorites.includes(String(id))
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function FavoritesProvider({ children }) {
  const { user } = useAuth();

  const account = user?.email
    ? `${user.role}:${user.email.trim().toLowerCase()}`
    : "guest";

  return (
    <AccountFavorites key={account} account={account}>
      {children}
    </AccountFavorites>
  );
}

export const useFavorites = () =>
  useContext(FavoritesContext);