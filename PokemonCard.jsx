// PokemonCard.jsx
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import "./PokemonCard.css";
import { extractPokemonId } from "./pokemonDetails";
import { TYPE_COLORS } from "./TypeEffectiveness";

const PokemonCard = ({ pokemon, details, isFavorite, onToggleFavorite }) => {

  const pokemonId = useMemo(() => extractPokemonId(details || pokemon), [details, pokemon]);

  const typeList = details?.types?.map((t) => t.type.name) ?? [];
  const primaryType = typeList[0];
  const typeColor = primaryType ? (TYPE_COLORS[primaryType] ?? "#aaa") : "#aaa";

  const abilities = details?.abilities
    ?.map((ability) => ability.ability.name)
    .slice(0, 2)
    .join(", ");

  return (
    <div
      className="pokemon-card"
      style={{ "--card-type-color": typeColor }}
    >
      <button
        className={`favorite-chip ${isFavorite ? "favorite-active" : ""}`}
        type="button"
        onClick={() => onToggleFavorite?.(pokemon.name)}
      >
        {isFavorite ? "★ Favorite" : "☆ Favorite"}
      </button>
      <Link to={`/pokemon?name=${pokemon.name}`}>
        <div className="card-sprite-wrap">
          <img
            src={`https://raw.githubusercontent.com/getmimo/things-api/main/files/pokedex/sprites/master/sprites/pokemon/${pokemonId}.png`}
            alt={pokemon.name}
          />
        </div>
        <h2>{pokemon?.name}</h2>
        {pokemonId && (
          <p className="pokemon-number">#{String(pokemonId).padStart(3, "0")}</p>
        )}
        {typeList.length > 0 && (
          <div className="card-types">
            {typeList.slice(0, 2).map((t) => (
              <span key={t} className="type-chip" style={{ background: TYPE_COLORS[t] ?? "#999" }}>{t}</span>
            ))}
          </div>
        )}
        {details?.height && details?.weight && (
          <p className="pokemon-meta">
            H: {details.height} &nbsp;|&nbsp; W: {details.weight}
          </p>
        )}
        {abilities && <p className="pokemon-meta">{abilities}</p>}
      </Link>
    </div>
  );
};

export default PokemonCard;

