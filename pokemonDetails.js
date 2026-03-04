const pokemonDetailsCache = new Map();
const pendingRequests = new Map();

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

  const request = fetch(`https://pokedex.mimo.dev/api/pokemon/${normalizedName}`)
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
