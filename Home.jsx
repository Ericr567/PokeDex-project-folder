import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePokemonList } from "./usePokemonList";
import { trackUxEvent } from "./analytics";
import WhosThatPokemon from "./WhosThatPokemon";

const Home = ({ notify }) => {
  const navigate = useNavigate();
  const [featuredPokemon, setFeaturedPokemon] = useState(null);
  const [activeFactIndex, setActiveFactIndex] = useState(0);
  const funFacts = [
    "Pikachu was not the first Pokemon designed.",
    "Satoshi Tajiri based Pokémon on his childhood hobby of collecting creatures.",
    "The 'Pokémon' name is a blend of 'Pocket Monsters'.",
  ];

  const { pokemons, loading, error, retry } = usePokemonList({ notify, pageName: "home" });

  useEffect(() => {
    if (pokemons.length > 0 && !featuredPokemon) {
      setFeaturedPokemon(pokemons[Math.floor(Math.random() * pokemons.length)]);
    }
  }, [pokemons, featuredPokemon]);

  useEffect(() => {
    const factTimer = setInterval(() => {
      setActiveFactIndex((current) => (current + 1) % funFacts.length);
    }, 5000);

    return () => clearInterval(factTimer);
  }, [funFacts.length]);

  const handleRetry = () => {
    setFeaturedPokemon(null);
    retry("Retrying featured fetch");
    trackUxEvent("retry_clicked", { page: "home" });
  };

  const handleRandomPokemon = () => {
    if (!pokemons.length) return;
    const random = pokemons[Math.floor(Math.random() * pokemons.length)];
    trackUxEvent("random_pokemon_navigated", { name: random.name });
    navigate(`/pokemon?name=${random.name}`);
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
      <button
        className="app-button"
        type="button"
        onClick={handleRandomPokemon}
        disabled={!pokemons.length}
        style={{ marginBottom: "16px" }}
      >
        Random Pokémon
      </button>
      <WhosThatPokemon pokemons={pokemons} />
      <div className="fact-box">
        <h3>Fun Pokémon Fact:</h3>
        <p key={activeFactIndex} className="fact-text">{funFacts[activeFactIndex]}</p>
      </div>
    </div>
  );
};

export default Home;
