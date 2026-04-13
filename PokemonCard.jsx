// PokemonCard.jsx
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import "./PokemonCard.css";
import { extractPokemonId } from "./pokemonDetails";
import { TYPE_COLORS } from "./TypeEffectiveness";

const PokemonCard = ({ pokemon, details, isFavorite, onToggleFavorite, showShiny = false }) => {

  const pokemonId = useMemo(() => extractPokemonId(details || pokemon), [details, pokemon]);
  const hasPokemonId = Number.isFinite(pokemonId) && pokemonId > 0;

  const typeList = details?.types?.map((t) => t.type.name) ?? [];
  const primaryType = typeList[0];
  const typeColor = primaryType ? (TYPE_COLORS[primaryType] ?? "#aaa") : "#aaa";

  const abilities = details?.abilities
    ?.map((ability) => ability.ability.name)
    .slice(0, 2)
    .join(", ");

  const spriteSrc = hasPokemonId
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${showShiny ? "shiny/" : ""}${pokemonId}.png`
    : "";

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
          {hasPokemonId ? (
            <img
              src={spriteSrc}
              alt={pokemon.name}
              onError={(event) => {
                const img = event.currentTarget;
                if (showShiny && !img.dataset.fallbackNormal) {
                  img.dataset.fallbackNormal = "1";
                  img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
                  return;
                }
                if (!img.dataset.fallbackMimo) {
                  img.dataset.fallbackMimo = "1";
                  img.src = `https://raw.githubusercontent.com/getmimo/things-api/main/files/pokedex/sprites/master/sprites/pokemon/${pokemonId}.png`;
                }
              }}
            />
          ) : null}
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

