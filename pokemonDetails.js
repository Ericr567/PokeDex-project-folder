const pokemonDetailsCache = new Map();
const pendingRequests = new Map();
const DEFAULT_FETCH_TIMEOUT_MS = 10000;
const LIST_CACHE_KEY = "pokedex-list-cache";

export const fetchJsonWithTimeout = async (url, options = {}) => {
  const { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, signal } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const relayAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", relayAbort, { once: true });
    }
  }

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener("abort", relayAbort);
    }
  }
};

export const extractPokemonId = (pokemon) => {
  if (pokemon?.id) return Number(pokemon.id);
  if (!pokemon?.url) return null;
  return Number(pokemon.url.split("/").filter(Boolean).pop());
};

export const getPokemonDetailsByName = async (name) => {
  if (!name) return null;

  const normalizedName = String(name).toLowerCase();

  if (pokemonDetailsCache.has(normalizedName)) {
    return pokemonDetailsCache.get(normalizedName);
  }

  if (pendingRequests.has(normalizedName)) {
    return pendingRequests.get(normalizedName);
  }

  const request = fetchJsonWithTimeout(`https://pokedex.mimo.dev/api/pokemon/${normalizedName}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Pokémon details request failed");
      }
      return response.json();
    })
    .then((data) => {
      pokemonDetailsCache.set(normalizedName, data);
      pendingRequests.delete(normalizedName);
      return data;
    })
    .catch((error) => {
      pendingRequests.delete(normalizedName);
      throw error;
    });

  pendingRequests.set(normalizedName, request);
  return request;
};

export const preloadPokemonDetails = async (names) => {
  const uniqueNames = [...new Set((names || []).filter(Boolean).map((name) => name.toLowerCase()))];
  const details = await Promise.all(
    uniqueNames.map(async (name) => {
      try {
        const data = await getPokemonDetailsByName(name);
        return [name, data];
      } catch {
        return [name, null];
      }
    }),
  );

  return Object.fromEntries(details);
};

export const fetchPokemonListWithCache = async (options = {}) => {
  const { signal, timeoutMs } = options;

  try {
    const response = await fetchJsonWithTimeout("https://pokedex.mimo.dev/api/pokemon", {
      signal,
      timeoutMs,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch Pokémon list");
    }

    const data = await response.json();

    try {
      localStorage.setItem(LIST_CACHE_KEY, JSON.stringify({
        ts: Date.now(),
        data,
      }));
    } catch {
      // Ignore storage failures.
    }

    return { data, source: "network" };
  } catch (error) {
    try {
      const rawCache = localStorage.getItem(LIST_CACHE_KEY);
      if (rawCache) {
        const parsed = JSON.parse(rawCache);
        if (Array.isArray(parsed?.data) && parsed.data.length > 0) {
          return { data: parsed.data, source: "cache" };
        }
      }
    } catch {
      // Ignore cache parsing failures.
    }

    throw error;
  }
};
