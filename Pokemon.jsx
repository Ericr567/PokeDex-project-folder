// Pokemon.jsx
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Spinner from "./Spinner";
import { getPokemonDetailsByName } from "./pokemonDetails";
import StatsRadar from "./StatsRadar";
import TypeEffectiveness from "./TypeEffectiveness";
import EvolutionChain from "./EvolutionChain";
import { TYPE_COLORS } from "./TypeEffectiveness";

/**
 * Pokemon component for displaying detailed information of a specific Pokémon.
 */
const Pokemon = ({ favorites, toggleFavorite, team, toggleTeam, shinyDexMode = false }) => {
  const [pokemon, setPokemon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showShiny, setShowShiny] = useState(false);
  const [evolutionChain, setEvolutionChain] = useState(null);
  const [showRadar, setShowRadar] = useState(false);
  const query = new URLSearchParams(useLocation().search);
  const pokemonName = query.get("name");

  useEffect(() => {
    let isCancelled = false;

    const fetchPokemon = async () => {
      setLoading(true);
      setShowShiny(Boolean(shinyDexMode));
      setEvolutionChain(null);

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
          // Fetch evolution chain via species URL
          if (data.species?.url) {
            fetch(data.species.url)
              .then((r) => r.json())
              .then((species) => {
                if (species?.evolution_chain?.url && !isCancelled) {
                  return fetch(species.evolution_chain.url).then((r) => r.json());
                }
              })
              .then((chain) => {
                if (chain && !isCancelled) setEvolutionChain(chain);
              })
              .catch(() => {});
          }
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

  useEffect(() => {
    setShowShiny(Boolean(shinyDexMode));
  }, [shinyDexMode, pokemonName]);

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

  const isInTeam = team?.some((m) => m.name === pokemon?.name);
  const teamFull = (team?.length ?? 0) >= 6;
  const spriteUrl = showShiny
    ? (pokemon?.sprites?.front_shiny || pokemon?.sprites?.front_default)
    : pokemon?.sprites?.front_default;

  return (
    <div className="page-shell">
      {loading && <Spinner />}
      {error && <p className="status-error">Error: {error}</p>}
      {pokemon && (
        <div
          className="detail-card"
          style={{
            background: `linear-gradient(160deg, ${statAccent}22 0%, transparent 28%), #fff8df`,
            borderTop: `4px solid ${statAccent}`,
          }}
        >
          <h1 className="section-title" style={{ color: statAccent }}>{pokemon.name}</h1>

          <div className="detail-actions">
            <button
              className={`favorite-chip detail-favorite ${favorites.includes(pokemon.name) ? "favorite-active" : ""}`}
              type="button"
              onClick={() => toggleFavorite?.(pokemon.name)}
            >
              {favorites.includes(pokemon.name) ? "★ Remove Favorite" : "☆ Add Favorite"}
            </button>
            <button
              className={`favorite-chip detail-favorite ${isInTeam ? "favorite-active" : ""}`}
              type="button"
              onClick={() => toggleTeam?.(pokemon)}
              disabled={!isInTeam && teamFull}
              title={!isInTeam && teamFull ? "Team is full (max 6)" : ""}
            >
              {isInTeam ? "✓ In Team" : teamFull ? "Team Full" : "+ Add to Team"}
            </button>
          </div>

          <div className="sprite-controls">
            <div
              className="detail-sprite-bubble"
              style={{ background: `radial-gradient(circle, ${statAccent}30 0%, transparent 70%)` }}
            >
              <img src={spriteUrl} alt={pokemon.name} className="detail-sprite" />
            </div>
            {pokemon.sprites?.front_shiny && (
              <button
                className={`shiny-toggle ${showShiny ? "shiny-active" : ""}`}
                type="button"
                onClick={() => setShowShiny((s) => !s)}
              >
                {showShiny ? "✨ Shiny" : "☆ Shiny"}
              </button>
            )}
          </div>

          {pokemon.height && <p><strong>Height:</strong> {pokemon.height}</p>}
          {pokemon.weight && <p><strong>Weight:</strong> {pokemon.weight}</p>}
          {pokemon.abilities && (
            <p>
              <strong>Abilities:</strong>{" "}
              {pokemon.abilities.map((ability) => ability.ability.name).join(", ")}
            </p>
          )}
          {pokemon.types && (
            <div className="detail-types">
              <strong>Types:</strong>{" "}
              {pokemon.types.map((t) => (
                <span
                  key={t.type.name}
                  className="type-chip"
                  style={{ background: TYPE_COLORS[t.type.name] || "#999" }}
                >
                  {t.type.name}
                </span>
              ))}
            </div>
          )}

          {pokemon.types && <TypeEffectiveness types={pokemon.types} />}

          {pokemon.stats && (
            <div className="stats-panel">
              <div className="stats-header">
                <h3 className="stats-title">Base Stats</h3>
                <button
                  className="status-clear"
                  type="button"
                  onClick={() => setShowRadar((r) => !r)}
                >
                  {showRadar ? "Bar Chart" : "Radar Chart"}
                </button>
              </div>
              {showRadar ? (
                <StatsRadar stats={pokemon.stats} color={statAccent} />
              ) : (
                pokemon.stats.map((stat) => {
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
                })
              )}
            </div>
          )}

          <EvolutionChain chain={evolutionChain} currentName={pokemon.name} />
        </div>
      )}
    </div>
  );
};

export default Pokemon;