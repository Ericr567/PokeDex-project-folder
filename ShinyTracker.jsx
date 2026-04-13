import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePokemonList } from "./usePokemonList";
import { extractPokemonId } from "./pokemonDetails";

const GEN_BUCKETS = [
  { label: "Gen I", min: 1, max: 151 },
  { label: "Gen II", min: 152, max: 251 },
  { label: "Gen III", min: 252, max: 386 },
  { label: "Gen IV", min: 387, max: 493 },
  { label: "Gen V", min: 494, max: 649 },
  { label: "Gen VI", min: 650, max: 721 },
  { label: "Gen VII", min: 722, max: 809 },
  { label: "Gen VIII", min: 810, max: 905 },
  { label: "Gen IX", min: 906, max: Infinity },
];

const ShinyTracker = ({ shinyCollection, updateShinyEntry, clearShinyCollection, notify }) => {
  const [query, setQuery] = useState("");
  const { pokemons, loading, error, retry } = usePokemonList({ notify, pageName: "shinydex" });

  const entries = useMemo(
    () => Object.entries(shinyCollection || {}).map(([name, value]) => ({
      name,
      id: value?.id ?? null,
      seen: Boolean(value?.seen),
      caught: Boolean(value?.caught),
    })),
    [shinyCollection],
  );

  const normalizedQuery = query.trim().toLowerCase();

  const filteredEntries = useMemo(() => entries
    .filter((entry) => entry.seen || entry.caught)
    .filter((entry) => (normalizedQuery ? entry.name.toLowerCase().includes(normalizedQuery) : true))
    .sort((a, b) => {
      const aId = Number(a.id || Number.MAX_SAFE_INTEGER);
      const bId = Number(b.id || Number.MAX_SAFE_INTEGER);
      return aId - bId || a.name.localeCompare(b.name);
    }), [entries, normalizedQuery]);

  const seenCount = entries.filter((entry) => entry.seen).length;
  const caughtCount = entries.filter((entry) => entry.caught).length;
  const dexTotal = pokemons.length || 0;

  const generationProgress = useMemo(() => {
    if (!pokemons.length) return [];

    return GEN_BUCKETS.map((gen) => {
      const members = pokemons.filter((pokemon) => {
        const id = extractPokemonId(pokemon);
        return id >= gen.min && id <= gen.max;
      });

      const seen = members.filter((pokemon) => shinyCollection?.[pokemon.name]?.seen).length;
      const caught = members.filter((pokemon) => shinyCollection?.[pokemon.name]?.caught).length;

      return {
        ...gen,
        total: members.length,
        seen,
        caught,
      };
    });
  }, [pokemons, shinyCollection]);

  const handleRetry = () => {
    retry("Retrying shiny dex list");
  };

  return (
    <div className="page-shell">
      <h1 className="section-title">Shiny Tracker</h1>
      <p className="section-subtitle">Track shiny sightings and catches across your Pokedex.</p>

      <div className="status-bar" role="status" aria-live="polite">
        <span>Seen: {seenCount}/{dexTotal || "?"}</span>
        <span>Caught: {caughtCount}/{dexTotal || "?"}</span>
        <button className="status-clear" type="button" onClick={clearShinyCollection} disabled={entries.length === 0}>
          Clear Tracker
        </button>
      </div>

      {error && (
        <div className="status-error" role="alert">
          <p>Error: {error}</p>
          <button className="app-button" type="button" onClick={handleRetry}>Retry</button>
        </div>
      )}

      <div className="search-actions">
        <input
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter tracked shinies..."
        />
      </div>

      {!loading && generationProgress.length > 0 && (
        <div className="shiny-gen-grid">
          {generationProgress.map((gen) => (
            <div key={gen.label} className="shiny-gen-card">
              <h3>{gen.label}</h3>
              <p>Seen: {gen.seen}/{gen.total}</p>
              <p>Caught: {gen.caught}/{gen.total}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <ul className="pokemon-grid" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <li className="skeleton-card" key={`shiny-skeleton-${index}`}>
              <div className="skeleton-chip" />
              <div className="skeleton-image" />
              <div className="skeleton-line skeleton-title" />
              <div className="skeleton-line" />
              <div className="skeleton-line skeleton-short" />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="pokemon-grid">
          {filteredEntries.map((entry) => {
            const id = Number(entry.id);
            const hasId = Number.isFinite(id) && id > 0;
            return (
              <li key={entry.name} className="pokemon-card">
                <Link to={`/pokemon?name=${entry.name}`}>
                  <div className="card-sprite-wrap">
                    {hasId ? (
                      <img
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`}
                        alt={entry.name}
                        onError={(event) => {
                          event.currentTarget.src = `https://raw.githubusercontent.com/getmimo/things-api/main/files/pokedex/sprites/master/sprites/pokemon/${id}.png`;
                        }}
                      />
                    ) : null}
                  </div>
                  <h2>{entry.name}</h2>
                  {hasId && <p className="pokemon-number">#{String(id).padStart(3, "0")}</p>}
                </Link>
                <div className="detail-actions">
                  <button
                    className={`status-clear ${entry.seen ? "favorite-active" : ""}`}
                    type="button"
                    onClick={() => updateShinyEntry(entry.name, { seen: !entry.seen })}
                  >
                    {entry.seen ? "Seen" : "Mark Seen"}
                  </button>
                  <button
                    className={`status-clear ${entry.caught ? "favorite-active" : ""}`}
                    type="button"
                    onClick={() => updateShinyEntry(entry.name, { seen: true, caught: !entry.caught })}
                  >
                    {entry.caught ? "Caught" : "Mark Caught"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && filteredEntries.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">[ * ]</div>
          <h3>No tracked shinies yet</h3>
          <p>Open a Pokemon detail page and mark shiny seen/caught to populate this tracker.</p>
        </div>
      )}
    </div>
  );
};

export default ShinyTracker;
