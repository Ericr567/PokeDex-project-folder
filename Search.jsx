// Search.jsx
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import "./Search.css";
import PokemonCard from "./PokemonCard";
import Spinner from "./Spinner";
import { preloadPokemonDetails } from "./pokemonDetails";

const Search = ({ favorites, toggleFavorite }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pokemons, setPokemons] = useState([]);
  const [filteredPokemons, setFilteredPokemons] = useState([]);
  const [input, setInput] = useState(() => searchParams.get("q") || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detailsByName, setDetailsByName] = useState({});
  const [copied, setCopied] = useState(false);

  const fetchPokemons = async () => {
    try {
      const response = await fetch("https://pokedex.mimo.dev/api/pokemon");
      if (!response.ok) {
        throw new Error("Failed to fetch Pokémon list");
      }
      const data = await response.json();
      setPokemons(data);
      setError(null);
    } catch (err) {
      setPokemons([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPokemons();
  }, []);

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
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="page-shell">
      <h1 className="section-title">Search a Pokémon</h1>
      <p className="section-subtitle">Start typing to filter Pokémon by name.</p>
      {loading && <Spinner />}
      {error && <p className="status-error">Error: {error}</p>}
      <div className="search-actions">
        <input
          className="search-input"
          placeholder="Enter Pokémon name..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="share-button" type="button" onClick={handleCopyLink}>
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>

      {!loading && !error && input !== "" && filteredPokemons.length === 0 && (
        <p className="status-empty">No Pokémon matches “{input}”.</p>
      )}

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
    </div>
  );
};

export default Search;
