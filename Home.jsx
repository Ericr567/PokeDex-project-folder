import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Spinner from "./Spinner";

const Home = () => {
  const [featuredPokemon, setFeaturedPokemon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const funFacts = [
    "Pikachu was originally was not the first design.",
    "Satoshi Tajiri based Pokémon on his childhood hobby of collecting creatures.",
    "The 'Pokémon' name is a blend of 'Pocket Monsters'.",
  ];

  useEffect(() => {
    const fetchFeaturedPokemon = async () => {
      try {
        const response = await fetch("https://pokedex.mimo.dev/api/pokemon");
        if (!response.ok) {
          throw new Error("Unable to load featured Pokémon");
        }
        const data = await response.json();
        const randomPokemon = data[Math.floor(Math.random() * data.length)];
        setFeaturedPokemon(randomPokemon);
        setError(null);
      } catch (err) {
        setFeaturedPokemon(null);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedPokemon();
  }, []);

  return (
    <div className="page-shell">
      <h1 className="section-title">Welcome to the Pokédex App</h1>
      <p className="section-subtitle">
        Explore the world of Pokémon with our comprehensive Pokédex.
      </p>
      {loading && <Spinner />}
      {error && <p className="status-error">Error: {error}</p>}
      {featuredPokemon && (
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
        <p>{funFacts[0]}</p>
      </div>
    </div>
  );
};

export default Home;
