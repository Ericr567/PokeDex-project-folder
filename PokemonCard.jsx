// PokemonCard.jsx
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import "./PokemonCard.css";
import { extractPokemonId } from "./pokemonDetails";

const PokemonCard = ({ pokemon, details, isFavorite, onToggleFavorite }) => {

  const pokemonId = useMemo(() => extractPokemonId(details || pokemon), [details, pokemon]);

  const types = details?.types?.map((type) => type.type.name).join(", ");
  const abilities = details?.abilities
    ?.map((ability) => ability.ability.name)
    .slice(0, 2)
    .join(", ");

  return (
    <div className="pokemon-card">
      <button
        className={`favorite-chip ${isFavorite ? "favorite-active" : ""}`}
        type="button"
        onClick={() => onToggleFavorite?.(pokemon.name)}
      >
        {isFavorite ? "★ Favorite" : "☆ Favorite"}
      </button>
      <Link to={`/pokemon?name=${pokemon.name}`}>
        <img
          src={`https://raw.githubusercontent.com/getmimo/things-api/main/files/pokedex/sprites/master/sprites/pokemon/${pokemonId}.png`}
          alt={pokemon.name}
        />
        <h2>{pokemon?.name}</h2>
        {pokemonId && (
          <p className="pokemon-number">#{String(pokemonId).padStart(3, "0")}</p>
        )}
        {types && <p className="pokemon-meta">Type: {types}</p>}
        {details?.height && details?.weight && (
          <p className="pokemon-meta">
            Height: {details.height} | Weight: {details.weight}
          </p>
        )}
        {abilities && <p className="pokemon-meta">Abilities: {abilities}</p>}
      </Link>
    </div>
  );
};

export default PokemonCard;
