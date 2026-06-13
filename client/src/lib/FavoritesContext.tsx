import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_FAVORITES, readFavorites, writeFavorites } from "@/lib/tools";

interface FavoritesContextValue {
  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggle: (id: string) => void;
  reset: () => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>(() => readFavorites());

  useEffect(() => { writeFavorites(favorites); }, [favorites]);

  const toggle = useCallback((id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const value: FavoritesContextValue = {
    favorites,
    isFavorite: id => favorites.includes(id),
    toggle,
    reset: () => setFavorites(DEFAULT_FAVORITES),
  };
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
