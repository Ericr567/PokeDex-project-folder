import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PokemonCard from "./PokemonCard";
import { extractPokemonId, preloadPokemonDetails } from "./pokemonDetails";
import { trackUxEvent } from "./analytics";
import { usePokemonList } from "./usePokemonList";
import { TYPE_COLORS } from "./TypeEffectiveness";

const POKEMON_TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy",
];

const GENERATION_RANGES = [
  { label: "All", min: 0, max: Infinity },
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

const Pokedex = ({ favorites, toggleFavorite, notify }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTypeDetailsRef = useRef(new Set());

  const getInitialSortMode = () => {
    const value = searchParams.get("sort");
    const allowedModes = ["id-asc", "id-desc", "name-asc", "name-desc"];
    return allowedModes.includes(value) ? value : "id-asc";
  };

  const getInitialPage = () => {
    const pageValue = Number(searchParams.get("page"));
    return Number.isFinite(pageValue) && pageValue > 0 ? Math.floor(pageValue) : 1;
  };

  const [currentPage, setCurrentPage] = useState(getInitialPage);
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("q") || "");
  const [sortMode, setSortMode] = useState(getInitialSortMode);
  const [favoritesOnly, setFavoritesOnly] = useState(() => searchParams.get("fav") === "1");
  const [typeFilter, setTypeFilter] = useState(() => searchParams.get("type") || "");
  const [genFilter, setGenFilter] = useState(() => Number(searchParams.get("gen")) || 0);
  const [detailsByName, setDetailsByName] = useState({});
  const [copied, setCopied] = useState(false);
  const pokemonsPerPage = 10;

  const { pokemons, loading, error, retry } = usePokemonList({ notify, pageName: "pokedex" });

  // Keep component state in sync when user navigates browser history (back/forward).
  useEffect(() => {
    const nextSearchTerm = searchParams.get("q") || "";
    const nextSortMode = getInitialSortMode();
    const nextFavoritesOnly = searchParams.get("fav") === "1";
    const nextPage = getInitialPage();
    const nextTypeFilter = searchParams.get("type") || "";
    const nextGenFilter = Number(searchParams.get("gen")) || 0;

    setSearchTerm((current) => (current === nextSearchTerm ? current : nextSearchTerm));
    setSortMode((current) => (current === nextSortMode ? current : nextSortMode));
    setFavoritesOnly((current) => (current === nextFavoritesOnly ? current : nextFavoritesOnly));
    setCurrentPage((current) => (current === nextPage ? current : nextPage));
    setTypeFilter((current) => (current === nextTypeFilter ? current : nextTypeFilter));
    setGenFilter((current) => (current === nextGenFilter ? current : nextGenFilter));
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
    if (typeFilter) {
      nextParams.set("type", typeFilter);
    }
    if (genFilter) {
      nextParams.set("gen", String(genFilter));
    }

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchTerm, sortMode, favoritesOnly, currentPage, typeFilter, genFilter, searchParams, setSearchParams]);

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const genRange = GENERATION_RANGES[genFilter] ?? GENERATION_RANGES[0];

  const baseFilteredPokemons = useMemo(
    () => pokemons
      .filter((pokemon) => pokemon.name.toLowerCase().includes(normalizedSearchTerm))
      .filter((pokemon) => (favoritesOnly ? favorites.includes(pokemon.name) : true))
      .filter((pokemon) => {
        if (!genFilter) return true;
        const id = extractPokemonId(pokemon);
        return id >= genRange.min && id <= genRange.max;
      }),
    [pokemons, normalizedSearchTerm, favoritesOnly, favorites, genFilter, genRange.min, genRange.max],
  );

  // Preload type-filter candidates in small batches to keep mobile responsive.
  useEffect(() => {
    if (!typeFilter) return;

    const candidates = baseFilteredPokemons
      .map((pokemon) => pokemon.name)
      .filter((name) => !detailsByName[name] && !requestedTypeDetailsRef.current.has(name));

    if (candidates.length === 0) return;

    const isMobile = window.matchMedia?.("(max-width: 768px)")?.matches ?? false;
    const batchSize = isMobile ? 8 : 16;
    const maxToQueue = isMobile ? 64 : 220;
    const queue = candidates.slice(0, maxToQueue);

    queue.forEach((name) => requestedTypeDetailsRef.current.add(name));

    let isCancelled = false;

    const preloadInBatches = async () => {
      for (let index = 0; index < queue.length; index += batchSize) {
        if (isCancelled) return;
        const batch = queue.slice(index, index + batchSize);
        const details = await preloadPokemonDetails(batch);
        if (isCancelled) return;
        setDetailsByName((current) => ({ ...current, ...details }));
        // Yield between batches so touch/scroll stays responsive.
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    };

    preloadInBatches();

    return () => {
      isCancelled = true;
    };
  }, [typeFilter, baseFilteredPokemons, detailsByName]);

  const filteredPokemons = useMemo(
    () => baseFilteredPokemons.filter((pokemon) => {
      if (!typeFilter) return true;
      const details = detailsByName[pokemon.name];
      if (!details) return false;
      return details.types?.some((t) => t.type.name === typeFilter);
    }),
    [baseFilteredPokemons, typeFilter, detailsByName],
  );

  const sortedPokemons = useMemo(() => [...filteredPokemons].sort((a, b) => {
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
  }), [filteredPokemons, sortMode]);

  const indexOfLastPokemon = currentPage * pokemonsPerPage;
  const indexOfFirstPokemon = indexOfLastPokemon - pokemonsPerPage;
  const currentPokemons = useMemo(
    () => sortedPokemons.slice(indexOfFirstPokemon, indexOfLastPokemon),
    [sortedPokemons, indexOfFirstPokemon, indexOfLastPokemon],
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
    retry("Retrying Pokédex fetch");
    trackUxEvent("retry_clicked", { page: "pokedex" });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSortMode("id-asc");
    setFavoritesOnly(false);
    setCurrentPage(1);
    setTypeFilter("");
    setGenFilter(0);
    notify?.("Filters reset", "info");
    trackUxEvent("filters_cleared", { page: "pokedex" });
  };

  const activeFilterLabels = [];
  if (normalizedSearchTerm) activeFilterLabels.push(`Search: ${searchTerm.trim()}`);
  if (sortMode !== "id-asc") activeFilterLabels.push(`Sort: ${sortMode}`);
  if (favoritesOnly) activeFilterLabels.push("Favorites only");
  if (typeFilter) activeFilterLabels.push(`Type: ${typeFilter}`);
  if (genFilter) activeFilterLabels.push(GENERATION_RANGES[genFilter]?.label ?? "");

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

      <div className="gen-filter-row" role="group" aria-label="Filter by generation">
        {GENERATION_RANGES.map((gen, i) => (
          <button
            key={gen.label}
            className={`gen-btn ${genFilter === i ? "gen-btn-active" : ""}`}
            type="button"
            onClick={() => { setGenFilter(i); setCurrentPage(1); }}
          >
            {gen.label}
          </button>
        ))}
      </div>

      <div className="type-filter-row" role="group" aria-label="Filter by type">
        <button
          className={`type-filter-btn type-filter-btn-all ${!typeFilter ? "type-filter-btn-active" : ""}`}
          type="button"
          onClick={() => { setTypeFilter(""); setCurrentPage(1); }}
        >
          All Types
        </button>
        {POKEMON_TYPES.map((type) => (
          <button
            key={type}
            className={`type-filter-btn ${typeFilter === type ? "type-filter-btn-active" : ""}`}
            style={{ background: TYPE_COLORS[type] }}
            type="button"
            onClick={() => { setTypeFilter(typeFilter === type ? "" : type); setCurrentPage(1); }}
          >
            {type}
          </button>
        ))}
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

