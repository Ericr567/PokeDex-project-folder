// Pokemon.jsx
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Spinner from "./Spinner"; // Import Spinner
import { getPokemonDetailsByName } from "./pokemonDetails";

/**
 * Pokemon component for displaying detailed information of a specific Pokémon.
 */
const Pokemon = ({ favorites, toggleFavorite }) => {
  const [pokemon, setPokemon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const query = new URLSearchParams(useLocation().search);
  const pokemonName = query.get("name");

  useEffect(() => {
    let isCancelled = false;

    const fetchPokemon = async () => {
      setLoading(true);

      if (!pokemonName) {
        setLoading(false);
        setPokemon(null);
        setError("No Pokémon selected");
        return;
      }

      try {
        const data = await getPokemonDetailsByName(pokemonName);
        if (!data) throw new Error("Pokémon not found");
        if (!isCancelled) {
          setPokemon(data);
          setError(null);
        }
      } catch (err) {
        if (!isCancelled) {
          setPokemon(null);
          setError(err.name === "AbortError" ? "Request timed out. Please retry." : err.message);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchPokemon();

    return () => {
      isCancelled = true;
    };
  }, [pokemonName]);

  const typeAccentMap = {
    normal: "#a8a77a",
    fire: "#ee8130",
    water: "#6390f0",
    electric: "#f7d02c",
    grass: "#7ac74c",
    ice: "#96d9d6",
    fighting: "#c22e28",
    poison: "#a33ea1",
    ground: "#e2bf65",
    flying: "#a98ff3",
    psychic: "#f95587",
    bug: "#a6b91a",
    rock: "#b6a136",
    ghost: "#735797",
    dragon: "#6f35fc",
    dark: "#705746",
    steel: "#b7b7ce",
    fairy: "#d685ad",
  };

  const primaryType = pokemon?.types?.[0]?.type?.name || "normal";
  const statAccent = typeAccentMap[primaryType] || "#d13325";

  return (
    <div className="page-shell">
      {loading && <Spinner />}
      {error && <p className="status-error">Error: {error}</p>}
      {pokemon && (
        <div className="detail-card">
          <h1 className="section-title">{pokemon.name}</h1>
          <button
            className={`favorite-chip detail-favorite ${favorites.includes(pokemon.name) ? "favorite-active" : ""}`}
            type="button"
            onClick={() => toggleFavorite?.(pokemon.name)}
          >
            {favorites.includes(pokemon.name) ? "★ Remove Favorite" : "☆ Add Favorite"}
          </button>
          <img src={pokemon.sprites.front_default} alt={pokemon.name} className="detail-sprite" />
          {pokemon.height && <p><strong>Height:</strong> {pokemon.height}</p>}
          {pokemon.weight && <p><strong>Weight:</strong> {pokemon.weight}</p>}
          {pokemon.abilities && (
            <p>
              <strong>Abilities:</strong>{" "}
              {pokemon.abilities
                .map((ability) => ability.ability.name)
                .join(", ")}
            </p>
          )}
          {pokemon.types && (
            <p>
              <strong>Types:</strong>{" "}
              {pokemon.types.map((type) => type.type.name).join(", ")}
            </p>
          )}

          {pokemon.stats && (
            <div className="stats-panel">
              <h3 className="stats-title">Base Stats</h3>
              {pokemon.stats.map((stat) => {
                const statPercent = Math.min(100, Math.round((stat.base_stat / 200) * 100));
                return (
                  <div className="stat-row" key={stat.stat.name}>
                    <span className="stat-label">{stat.stat.name}</span>
                    <div className="stat-track">
                      <div
                        className="stat-fill"
                        style={{ width: `${statPercent}%`, backgroundColor: statAccent }}
                      />
                    </div>
                    <span className="stat-value">{stat.base_stat}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Pokemon;