import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import PokemonCard from "./PokemonCard";
import { extractPokemonId, fetchPokemonListWithCache, preloadPokemonDetails } from "./pokemonDetails";
import { trackUxEvent } from "./analytics";

const Pokedex = ({ favorites, toggleFavorite, notify }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const getInitialSortMode = () => {
    const value = searchParams.get("sort");
    const allowedModes = ["id-asc", "id-desc", "name-asc", "name-desc"];
    return allowedModes.includes(value) ? value : "id-asc";
  };

  const getInitialPage = () => {
    const pageValue = Number(searchParams.get("page"));
    return Number.isFinite(pageValue) && pageValue > 0 ? Math.floor(pageValue) : 1;
  };

  const [pokemons, setPokemons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [currentPage, setCurrentPage] = useState(getInitialPage);
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("q") || "");
  const [sortMode, setSortMode] = useState(getInitialSortMode);
  const [favoritesOnly, setFavoritesOnly] = useState(() => searchParams.get("fav") === "1");
  const [detailsByName, setDetailsByName] = useState({});
  const [copied, setCopied] = useState(false);
  const pokemonsPerPage = 10;

  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();

    const fetchPokemons = async () => {
      try {
        const { data, source } = await fetchPokemonListWithCache({ signal: controller.signal });
        if (!isCancelled) {
          setPokemons(data);
          setError(null);
          if (source === "cache") {
            notify?.("Using cached Pokémon data", "warn");
            trackUxEvent("cache_fallback_used", { page: "pokedex" });
          }
        }
      } catch (error) {
        if (!isCancelled) {
          setPokemons([]);
          setError(error.name === "AbortError" ? "Request timed out. Please retry." : error.message);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchPokemons();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [reloadToken]);

  // Keep component state in sync when user navigates browser history (back/forward).
  useEffect(() => {
    const nextSearchTerm = searchParams.get("q") || "";
    const nextSortMode = getInitialSortMode();
    const nextFavoritesOnly = searchParams.get("fav") === "1";
    const nextPage = getInitialPage();

    setSearchTerm((current) => (current === nextSearchTerm ? current : nextSearchTerm));
    setSortMode((current) => (current === nextSortMode ? current : nextSortMode));
    setFavoritesOnly((current) => (current === nextFavoritesOnly ? current : nextFavoritesOnly));
    setCurrentPage((current) => (current === nextPage ? current : nextPage));
  }, [searchParams]);

  // Persist filter/sort/page state into the URL so links are shareable and restorable.
  useEffect(() => {
    const nextParams = new URLSearchParams();

    if (searchTerm.trim()) {
      nextParams.set("q", searchTerm.trim());
    }
    if (sortMode !== "id-asc") {
      nextParams.set("sort", sortMode);
    }
    if (favoritesOnly) {
      nextParams.set("fav", "1");
    }
    if (currentPage > 1) {
      nextParams.set("page", String(currentPage));
    }

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchTerm, sortMode, favoritesOnly, currentPage, searchParams, setSearchParams]);

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const filteredPokemons = pokemons
    .filter((pokemon) => pokemon.name.toLowerCase().includes(normalizedSearchTerm))
    .filter((pokemon) => (favoritesOnly ? favorites.includes(pokemon.name) : true));

  const sortedPokemons = [...filteredPokemons].sort((a, b) => {
    if (sortMode === "name-asc") {
      return a.name.localeCompare(b.name);
    }
    if (sortMode === "name-desc") {
      return b.name.localeCompare(a.name);
    }
    if (sortMode === "id-desc") {
      return extractPokemonId(b) - extractPokemonId(a);
    }
    return extractPokemonId(a) - extractPokemonId(b);
  });

  const indexOfLastPokemon = currentPage * pokemonsPerPage;
  const indexOfFirstPokemon = indexOfLastPokemon - pokemonsPerPage;
  const currentPokemons = sortedPokemons.slice(
    indexOfFirstPokemon,
    indexOfLastPokemon,
  );

  useEffect(() => {
    if (currentPokemons.length === 0) return;
    preloadPokemonDetails(currentPokemons.map((pokemon) => pokemon.name)).then((details) => {
      setDetailsByName((currentDetails) => ({ ...currentDetails, ...details }));
    });
  }, [currentPokemons]);

  const totalPages = Math.ceil(sortedPokemons.length / pokemonsPerPage);
  const rangeMax = Math.max(totalPages, 1);

  useEffect(() => {
    if (currentPage > rangeMax) {
      setCurrentPage(rangeMax);
    }
  }, [currentPage, rangeMax]);

  const handleSearchTermChange = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handleSortModeChange = (event) => {
    setSortMode(event.target.value);
    setCurrentPage(1);
  };

  const handleFavoritesOnlyChange = (event) => {
    setFavoritesOnly(event.target.checked);
    setCurrentPage(1);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      notify?.("Pokédex link copied", "success");
      trackUxEvent("copy_link", { page: "pokedex" });
      setTimeout(() => setCopied(false), 1600);
    } catch {
      notify?.("Could not copy link", "warn");
      setCopied(false);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setReloadToken((current) => current + 1);
    notify?.("Retrying Pokédex fetch", "info");
    trackUxEvent("retry_clicked", { page: "pokedex" });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSortMode("id-asc");
    setFavoritesOnly(false);
    setCurrentPage(1);
    notify?.("Filters reset", "info");
    trackUxEvent("filters_cleared", { page: "pokedex" });
  };

  const activeFilterLabels = [];
  if (normalizedSearchTerm) activeFilterLabels.push(`Search: ${searchTerm.trim()}`);
  if (sortMode !== "id-asc") activeFilterLabels.push(`Sort: ${sortMode}`);
  if (favoritesOnly) activeFilterLabels.push("Favorites only");

  return (
    <div className="page-shell">
      <h1 className="section-title">All Pokémon</h1>
      <div className="status-bar" role="status" aria-live="polite">
        <span>Favorites: {favorites.length}</span>
        <span>
          Filters: {activeFilterLabels.length > 0 ? activeFilterLabels.join(" • ") : "None"}
        </span>
        <button className="status-clear" type="button" onClick={clearFilters}>
          Clear Filters
        </button>
      </div>

      {error && (
        <div className="status-error" role="alert">
          <p>Error: {error}</p>
          <button className="app-button" type="button" onClick={handleRetry}>Retry</button>
        </div>
      )}
      {!loading && !error && currentPokemons.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">[ ! ]</div>
          <h3>No Pokémon in this view</h3>
          <p>Adjust filters or clear them to repopulate the list.</p>
        </div>
      )}

      <div className="controls-row">
        <input
          className="search-input"
          placeholder="Filter by name..."
          value={searchTerm}
          onChange={handleSearchTermChange}
        />

        <select
          className="sort-select"
          value={sortMode}
          onChange={handleSortModeChange}
        >
          <option value="id-asc">Sort: Number (Low to High)</option>
          <option value="id-desc">Sort: Number (High to Low)</option>
          <option value="name-asc">Sort: Name (A to Z)</option>
          <option value="name-desc">Sort: Name (Z to A)</option>
        </select>

        <label className="favorite-filter">
          <input
            type="checkbox"
            checked={favoritesOnly}
            onChange={handleFavoritesOnlyChange}
          />
          Favorites only
        </label>

        <button className="share-button" type="button" onClick={handleCopyLink}>
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>

      <div className="quick-actions" role="group" aria-label="Pokedex quick actions">
        <button className="status-clear" type="button" onClick={() => setFavoritesOnly((current) => !current)}>
          {favoritesOnly ? "Show All" : "Favorites Only"}
        </button>
        <button className="status-clear" type="button" onClick={() => setSortMode("name-asc")}>Sort A-Z</button>
        <button className="status-clear" type="button" onClick={() => setSortMode("id-asc")}>Sort by Number</button>
      </div>

      {loading ? (
        <ul className="pokemon-grid" aria-hidden="true">
          {Array.from({ length: pokemonsPerPage }).map((_, index) => (
            <li className="skeleton-card" key={`pokedex-skeleton-${index}`}>
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
          {currentPokemons.map((pokemon) => (
            <PokemonCard
              key={pokemon.name}
              pokemon={pokemon}
              details={detailsByName[pokemon.name]}
              isFavorite={favorites.includes(pokemon.name)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </ul>
      )}

      <p className="page-indicator">
        Page {Math.min(currentPage, rangeMax)} of {rangeMax}
      </p>
      <input
        className="page-slider"
        type="range"
        min="1"
        max={rangeMax}
        value={currentPage}
        disabled={loading || totalPages === 0}
        onChange={(e) => setCurrentPage(Number(e.target.value))}
      />

      <div className="pager-controls">
        <button
          className="app-button"
          disabled={currentPage <= 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          Previous
        </button>
        <button
          className="app-button"
          disabled={currentPage >= totalPages}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Pokedex;

