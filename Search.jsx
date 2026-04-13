// Search.jsx
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import "./Search.css";
import PokemonCard from "./PokemonCard";
import { preloadPokemonDetails } from "./pokemonDetails";
import { trackUxEvent } from "./analytics";
import { usePokemonList } from "./usePokemonList";

const Search = ({ favorites, toggleFavorite, notify }) => {
  const searchInputRef = React.useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filteredPokemons, setFilteredPokemons] = useState([]);
  const [input, setInput] = useState(() => searchParams.get("q") || "");
  const [detailsByName, setDetailsByName] = useState({});
  const [copied, setCopied] = useState(false);

  const { pokemons, loading, error, retry } = usePokemonList({ notify, pageName: "search" });

  // Sync input when URL changes via browser navigation (back/forward buttons).
  useEffect(() => {
    const nextInput = searchParams.get("q") || "";
    setInput((currentInput) => (currentInput === nextInput ? currentInput : nextInput));
  }, [searchParams]);

  // Keep search query in the URL so it can be bookmarked and shared.
  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    if (input.trim()) {
      nextParams.set("q", input.trim());
    } else {
      nextParams.delete("q");
    }

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [input, searchParams, setSearchParams]);

  useEffect(() => {
    const onFocusSearch = () => {
      searchInputRef.current?.focus();
      trackUxEvent("shortcut_used", { action: "focus_search" });
    };
    window.addEventListener("pokedex-focus-search", onFocusSearch);
    return () => window.removeEventListener("pokedex-focus-search", onFocusSearch);
  }, []);

  useEffect(() => {
    if (input === "") {
      setFilteredPokemons([]);
    } else {
      const filtered = pokemons.filter((pokemon) =>
        pokemon.name.toLowerCase().startsWith(input.toLowerCase()),
      );
      setFilteredPokemons(filtered);
    }
  }, [input, pokemons]);

  useEffect(() => {
    if (filteredPokemons.length === 0) return;
    const visibleResultNames = filteredPokemons.slice(0, 20).map((pokemon) => pokemon.name);
    preloadPokemonDetails(visibleResultNames).then((details) => {
      setDetailsByName((currentDetails) => ({ ...currentDetails, ...details }));
    });
  }, [filteredPokemons]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      notify?.("Search link copied", "success");
      trackUxEvent("copy_link", { page: "search" });
      setTimeout(() => setCopied(false), 1600);
    } catch {
      notify?.("Could not copy link", "warn");
      setCopied(false);
    }
  };

  const handleRetry = () => {
    retry("Retrying search fetch");
    trackUxEvent("retry_clicked", { page: "search" });
  };

  const clearSearch = () => {
    setInput("");
    notify?.("Search cleared", "info");
    trackUxEvent("search_cleared");
  };

  return (
    <div className="page-shell">
      <h1 className="section-title">Search a Pokémon</h1>
      <p className="section-subtitle">Start typing to filter Pokémon by name.</p>
      {error && (
        <div className="status-error" role="alert">
          <p>Error: {error}</p>
          <button className="app-button" type="button" onClick={handleRetry}>Retry</button>
        </div>
      )}
      <div className="search-actions">
        <input
          ref={searchInputRef}
          className="search-input"
          placeholder="Enter Pokémon name..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="share-button" type="button" onClick={handleCopyLink}>
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>

      <div className="quick-actions" role="group" aria-label="Search quick actions">
        <button className="status-clear" type="button" onClick={clearSearch}>Clear Search</button>
        <button
          className="status-clear"
          type="button"
          onClick={() => {
            setInput("pi");
            notify?.("Quick search for 'pi'", "info");
          }}
        >
          Try "pi"
        </button>
      </div>

      {!loading && !error && input === "" && (
        <div className="empty-state" role="status">
          <div className="empty-icon">[ ? ]</div>
          <h3>Start with a name</h3>
          <p>Type at least one letter to search the Pokédex instantly.</p>
        </div>
      )}

      {!loading && !error && input !== "" && filteredPokemons.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">[ x ]</div>
          <h3>No match found</h3>
          <p>No Pokémon matches “{input}”. Try fewer letters or clear search.</p>
        </div>
      )}

      {loading ? (
        <ul className="pokemon-grid" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <li className="skeleton-card" key={`search-skeleton-${index}`}>
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
          {filteredPokemons.map((pokemon) => (
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
    </div>
  );
};

export default Search;
