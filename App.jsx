import React, { useEffect, useRef, useState } from "react";
import { BrowserRouter as Router, NavLink, Route, Routes } from "react-router-dom";
import "./App.css";
import Home from "./Home.jsx";
import Pokedex from "./PokeDex";
import Search from "./Search";
import Pokemon from "./Pokemon";

export default function App() {
  const audioContextRef = useRef(null);
  const [isBooting, setIsBooting] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try {
      const storedFavorites = localStorage.getItem("pokedex-favorites");
      return storedFavorites ? JSON.parse(storedFavorites) : [];
    } catch {
      return [];
    }
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return localStorage.getItem("pokedex-dark-mode") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem("pokedex-favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem("pokedex-dark-mode", String(isDarkMode));
    document.body.classList.toggle("dark-mode", isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    const hasSeenBoot = localStorage.getItem("pokedex-boot-seen") === "true";
    if (hasSeenBoot) return;

    setIsBooting(true);
    localStorage.setItem("pokedex-boot-seen", "true");

    const timer = setTimeout(() => {
      setIsBooting(false);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  const toggleFavorite = (name) => {
    if (!name) return;
    setFavorites((currentFavorites) => {
      const exists = currentFavorites.includes(name);
      if (exists) {
        return currentFavorites.filter((favorite) => favorite !== name);
      }
      return [...currentFavorites, name];
    });
  };

  const playDeviceClick = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new window.AudioContext();
      }

      const context = audioContextRef.current;
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(360, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(180, context.currentTime + 0.05);
      gain.gain.setValueAtTime(0.05, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.06);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.06);
    } catch {
      // Ignore audio errors for browsers that block auto-created audio contexts.
    }
  };

  const replayBootSequence = () => {
    playDeviceClick();
    setIsBooting(true);
    localStorage.setItem("pokedex-boot-seen", "true");
    setTimeout(() => {
      setIsBooting(false);
    }, 1800);
  };

  return (
    <Router>
      <div className="app-frame">
        <div className="pokedex-device">
          <header className="device-top">
            <div className="lens lens-lg" />
            <div className="lens lens-sm lens-red led-pulse" />
            <div className="lens lens-sm lens-yellow led-pulse led-delay" />
            <div className="lens lens-sm lens-green led-pulse led-delay-2" />
          </header>

          <div className="device-hinge" />

          <div className="device-main">
            <section className="screen-panel">
              {isBooting && (
                <div className="boot-overlay" role="status" aria-live="polite">
                  <p className="boot-title">POKéDEX OS</p>
                  <p className="boot-line">Initializing scanner...</p>
                  <p className="boot-line">Loading species database...</p>
                  <p className="boot-line boot-ready">Ready.</p>
                </div>
              )}

              <nav>
                <NavLink to="/" className={({ isActive }) => (isActive ? "active-nav" : "")}>Home</NavLink>
                <NavLink
                  to="/pokedex"
                  className={({ isActive }) => (isActive ? "active-nav" : "")}
                >
                  Pokédex
                </NavLink>
                <NavLink
                  to="/search"
                  className={({ isActive }) => (isActive ? "active-nav" : "")}
                >
                  Search
                </NavLink>
              </nav>

              <div className="content">
                <Routes>
                  <Route path="/" element={<Home favorites={favorites} toggleFavorite={toggleFavorite} />} />
                  <Route
                    path="/pokedex"
                    element={<Pokedex favorites={favorites} toggleFavorite={toggleFavorite} />}
                  />
                  <Route
                    path="/search"
                    element={<Search favorites={favorites} toggleFavorite={toggleFavorite} />}
                  />
                  <Route
                    path="/pokemon"
                    element={<Pokemon favorites={favorites} toggleFavorite={toggleFavorite} />}
                  />
                </Routes>
              </div>
            </section>

            <aside className="control-panel">
              <button
                className="theme-toggle"
                onClick={() => {
                  playDeviceClick();
                  setIsDarkMode((current) => !current);
                }}
                type="button"
              >
                {isDarkMode ? "Light" : "Dark"}
              </button>

              <button
                className="theme-toggle replay-toggle"
                onClick={replayBootSequence}
                type="button"
              >
                Replay Boot
              </button>

              <div className="dpad">
                <span className="dpad-center" />
              </div>

              <div className="ab-buttons">
                <button className="device-button" type="button" onClick={playDeviceClick}>A</button>
                <button className="device-button" type="button" onClick={playDeviceClick}>B</button>
              </div>

              <div className="speaker-grill">
                <span />
                <span />
                <span />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </Router>
  );
}
