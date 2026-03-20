import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchPokemonListWithCache } from "./pokemonDetails";
import { trackUxEvent } from "./analytics";

const Home = ({ notify }) => {
  const [featuredPokemon, setFeaturedPokemon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [activeFactIndex, setActiveFactIndex] = useState(0);
  const funFacts = [
    "Pikachu was not the first Pokemon designed.",
    "Satoshi Tajiri based Pokémon on his childhood hobby of collecting creatures.",
    "The 'Pokémon' name is a blend of 'Pocket Monsters'.",
  ];

  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();

    const fetchFeaturedPokemon = async () => {
      try {
        const { data, source } = await fetchPokemonListWithCache({ signal: controller.signal });
        const randomPokemon = data[Math.floor(Math.random() * data.length)];
        if (!isCancelled) {
          setFeaturedPokemon(randomPokemon);
          setError(null);
          if (source === "cache") {
            notify?.("Using cached Pokémon data", "warn");
            trackUxEvent("cache_fallback_used", { page: "home" });
          }
        }
      } catch (err) {
        if (!isCancelled) {
          setFeaturedPokemon(null);
          setError(err.name === "AbortError" ? "Request timed out. Please retry." : err.message);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchFeaturedPokemon();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [reloadToken]);

  useEffect(() => {
    const factTimer = setInterval(() => {
      setActiveFactIndex((current) => (current + 1) % funFacts.length);
    }, 5000);

    return () => clearInterval(factTimer);
  }, [funFacts.length]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setReloadToken((current) => current + 1);
    notify?.("Retrying featured fetch", "info");
    trackUxEvent("retry_clicked", { page: "home" });
  };

  return (
    <div className="page-shell">
      <h1 className="section-title">Welcome to the Pokédex App</h1>
      <p className="section-subtitle">
        Explore the world of Pokémon with our comprehensive Pokédex.
      </p>
      {loading && (
        <div className="featured-card featured-skeleton" aria-hidden="true">
          <div className="skeleton-line skeleton-title" />
          <div className="skeleton-image" />
        </div>
      )}
      {error && (
        <div className="status-error" role="alert">
          <p>Error: {error}</p>
          <button className="app-button" type="button" onClick={handleRetry}>Retry</button>
        </div>
      )}
      {!loading && !error && featuredPokemon && (
        <Link to={`/pokemon?name=${featuredPokemon.name}`}>
          <div className="featured-card" style={{ cursor: "pointer" }}>
            <h2>Featured Pokémon: {featuredPokemon.name}</h2>
            <img
              src={`https://raw.githubusercontent.com/getmimo/things-api/main/files/pokedex/sprites/master/sprites/pokemon/${featuredPokemon.id}.png`}
              alt={featuredPokemon.name}
            />
          </div>
        </Link>
      )}
      <div className="fact-box">
        <h3>Fun Pokémon Fact:</h3>
        <p key={activeFactIndex} className="fact-text">{funFacts[activeFactIndex]}</p>
      </div>
    </div>
  );
};

export default Home;
