import React, { useState, useEffect, useCallback } from "react";
import "./WhosThatPokemon.css";

const WhosThatPokemon = ({ pokemons }) => {
  const [current, setCurrent] = useState(null);
  const [guess, setGuess] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState(null);
  const [streak, setStreak] = useState(0);

  const pickRandom = useCallback(() => {
    if (!pokemons.length) return;
    const pick = pokemons[Math.floor(Math.random() * pokemons.length)];
    setCurrent(pick);
    setGuess("");
    setRevealed(false);
    setResult(null);
  }, [pokemons]);

  useEffect(() => {
    if (pokemons.length > 0 && !current) pickRandom();
  }, [pokemons, current, pickRandom]);

  if (!current) return null;

  const id = current.url?.split("/").filter(Boolean).pop() || current.id;
  const spriteUrl = `https://raw.githubusercontent.com/getmimo/things-api/main/files/pokedex/sprites/master/sprites/pokemon/${id}.png`;

  const handleGuess = (e) => {
    e.preventDefault();
    if (revealed) return;
    const correct = guess.trim().toLowerCase() === current.name.toLowerCase();
    setRevealed(true);
    setResult(correct ? "correct" : "wrong");
    setStreak((s) => (correct ? s + 1 : 0));
  };

  const handleGiveUp = () => {
    setRevealed(true);
    setResult("wrong");
    setStreak(0);
  };

  return (
    <div className="whos-container">
      <h2 className="stats-title">Who's That Pokémon?</h2>
      {streak > 0 && <p className="whos-streak">Streak: {streak}</p>}
      <div className={`whos-sprite-wrap ${revealed ? "whos-revealed" : ""}`}>
        <img src={spriteUrl} alt="mystery Pokémon" className="whos-sprite" />
      </div>
      {!revealed ? (
        <form onSubmit={handleGuess} className="whos-form">
          <input
            className="search-input whos-input"
            placeholder="Enter Pokémon name..."
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            autoComplete="off"
          />
          <div className="whos-buttons">
            <button className="app-button" type="submit">Guess</button>
            <button className="status-clear" type="button" onClick={handleGiveUp}>Give Up</button>
          </div>
        </form>
      ) : (
        <div className="whos-result">
          {result === "correct" ? (
            <p className="whos-correct">Correct! It's {current.name}!</p>
          ) : (
            <p className="whos-wrong">It was {current.name}.</p>
          )}
          <button className="app-button" type="button" onClick={pickRandom}>
            Next Pokémon
          </button>
        </div>
      )}
    </div>
  );
};

export default WhosThatPokemon;
