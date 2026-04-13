import { useState, useEffect } from "react";
import { fetchPokemonListWithCache } from "./pokemonDetails";
import { trackUxEvent } from "./analytics";

export const usePokemonList = ({ notify, pageName } = {}) => {
  const [pokemons, setPokemons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();

    const doFetch = async () => {
      setLoading(true);
      try {
        const { data, source } = await fetchPokemonListWithCache({ signal: controller.signal });
        if (!isCancelled) {
          setPokemons(data);
          setError(null);
          if (source === "cache") {
            notify?.("Using cached Pokémon data", "warn");
            trackUxEvent("cache_fallback_used", { page: pageName });
          }
        }
      } catch (err) {
        if (!isCancelled) {
          setPokemons([]);
          setError(err.name === "AbortError" ? "Request timed out. Please retry." : err.message);
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    doFetch();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [reloadToken]);

  const retry = (msg) => {
    setError(null);
    setReloadToken((t) => t + 1);
    if (msg) notify?.(msg, "info");
  };

  return { pokemons, loading, error, retry };
};
