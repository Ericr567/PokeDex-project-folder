import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import PokemonCard from "./PokemonCard";
import Spinner from "./Spinner";
import { extractPokemonId, preloadPokemonDetails } from "./pokemonDetails";

const Pokedex = ({ favorites, toggleFavorite }) => {
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
  const [currentPage, setCurrentPage] = useState(getInitialPage);
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("q") || "");
  const [sortMode, setSortMode] = useState(getInitialSortMode);
  const [favoritesOnly, setFavoritesOnly] = useState(() => searchParams.get("fav") === "1");
  const [detailsByName, setDetailsByName] = useState({});
  const [copied, setCopied] = useState(false);
  const pokemonsPerPage = 10;

  const fetchPokemons = async () => {
    try {
      const response = await fetch("https://pokedex.mimo.dev/api/pokemon");
      if (!response.ok) {
        throw new Error("Failed to fetch Pokémon list");
      }
      const data = await response.json();
      setPokemons(data);
      setError(null);
    } catch (error) {
      setPokemons([]);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPokemons();
  }, []);

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
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="page-shell">
      <h1 className="section-title">All Pokémon</h1>
      {loading && <Spinner />}
      {error && <p className="status-error">Error: {error}</p>}
      {!loading && !error && currentPokemons.length === 0 && (
        <p className="status-empty">No Pokémon available right now.</p>
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

