import React, { useEffect, useRef, useState } from "react";
import { BrowserRouter as Router, NavLink, Route, Routes } from "react-router-dom";
import "./App.css";
import Home from "./Home.jsx";
import Pokedex from "./PokeDex";
import Search from "./Search";
import Pokemon from "./Pokemon";
import TeamBuilder from "./TeamBuilder";
import ShinyTracker from "./ShinyTracker";
import BattleMode from "./BattleMode";
import { fetchPokemonListWithCache } from "./pokemonDetails";
import { trackUxEvent } from "./analytics";

export default function App() {
  const audioContextRef = useRef(null);
  const toastTimerRef = useRef(null);
  const [isBooting, setIsBooting] = useState(() => {
    try {
      return localStorage.getItem("pokedex-boot-seen") !== "true";
    } catch {
      return true;
    }
  });
  const [favorites, setFavorites] = useState(() => {
    try {
      const storedFavorites = localStorage.getItem("pokedex-favorites");
      return storedFavorites ? JSON.parse(storedFavorites) : [];
    } catch {
      return [];
    }
  });

  const [team, setTeam] = useState(() => {
    try {
      const stored = localStorage.getItem("pokedex-team");
      return stored ? JSON.parse(stored) : [];
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
  const [isShinyDexMode, setIsShinyDexMode] = useState(() => {
    try {
      return localStorage.getItem("pokedex-shiny-mode") === "true";
    } catch {
      return false;
    }
  });
  const [shinyCollection, setShinyCollection] = useState(() => {
    try {
      const stored = localStorage.getItem("pokedex-shiny-collection");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [toast, setToast] = useState(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return localStorage.getItem("pokedex-onboarding-dismissed") !== "true";
    } catch {
      return true;
    }
  });

  const showToast = (message, tone = "info") => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast({ message, tone });
    trackUxEvent("toast_shown", { tone, message });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 1800);
  };

  useEffect(() => () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pokedex-favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem("pokedex-team", JSON.stringify(team));
  }, [team]);

  useEffect(() => {
    localStorage.setItem("pokedex-dark-mode", String(isDarkMode));
    document.body.classList.toggle("dark-mode", isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem("pokedex-shiny-mode", String(isShinyDexMode));
  }, [isShinyDexMode]);

  useEffect(() => {
    localStorage.setItem("pokedex-shiny-collection", JSON.stringify(shinyCollection));
  }, [shinyCollection]);

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPromptEvent(event);
    };

    const onInstalled = () => {
      setInstallPromptEvent(null);
      showToast("Pokedex installed", "success");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!isBooting) return;

    try {
      localStorage.setItem("pokedex-boot-seen", "true");
    } catch {
      // Ignore storage errors (private browsing / restricted storage).
    }

    const timer = setTimeout(() => {
      setIsBooting(false);
    }, 1800);

    return () => clearTimeout(timer);
  }, [isBooting]);

  const toggleFavorite = (name) => {
    if (!name) return;
    setFavorites((currentFavorites) => {
      const exists = currentFavorites.includes(name);
      if (exists) {
        showToast(`${name} removed from favorites`, "warn");
        trackUxEvent("favorite_removed", { name });
        return currentFavorites.filter((favorite) => favorite !== name);
      }
      showToast(`${name} added to favorites`, "success");
      trackUxEvent("favorite_added", { name });
      return [...currentFavorites, name];
    });
  };

  const toggleTeam = (pokemon) => {
    if (!pokemon?.name) return;
    setTeam((current) => {
      const exists = current.some((m) => m.name === pokemon.name);
      if (exists) {
        showToast(`${pokemon.name} removed from team`, "warn");
        trackUxEvent("team_removed", { name: pokemon.name });
        return current.filter((m) => m.name !== pokemon.name);
      }
      if (current.length >= 6) {
        showToast("Team is full (max 6)", "warn");
        return current;
      }
      showToast(`${pokemon.name} added to team`, "success");
      trackUxEvent("team_added", { name: pokemon.name });
      return [...current, { name: pokemon.name, id: pokemon.id }];
    });
  };

  const updateShinyEntry = (name, update) => {
    if (!name || !update) return;
    setShinyCollection((current) => {
      const previous = current[name] || {};
      const next = {
        ...previous,
        ...update,
      };
      return { ...current, [name]: next };
    });
  };

  const clearShinyCollection = () => {
    setShinyCollection({});
    showToast("Shiny tracker cleared", "info");
  };

  const handleInstallApp = async () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    try {
      await installPromptEvent.userChoice;
    } catch {
      // Ignore install prompt errors and keep app usable.
    }
    setInstallPromptEvent(null);
  };

  const handleRandomPokemon = async (navigate) => {
    try {
      const { data } = await fetchPokemonListWithCache({});
      const random = data[Math.floor(Math.random() * data.length)];
      navigate(`/pokemon?name=${random.name}`);
      trackUxEvent("random_pokemon_navigated", { name: random.name });
    } catch {
      showToast("Could not load Pokémon list", "warn");
    }
  };

  useEffect(() => {
    const navigateTo = (path) => {
      if (window.location.pathname === path) return;
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    };

    const onKeyDown = (event) => {
      const tagName = event.target?.tagName?.toLowerCase();
      const isTypingTarget = tagName === "input" || tagName === "textarea" || event.target?.isContentEditable;

      if (isTypingTarget) return;

      if (event.key === "?") {
        event.preventDefault();
        setIsHelpOpen(true);
        trackUxEvent("shortcut_used", { key: "?" });
        return;
      }

      if (event.key === "Escape" && isHelpOpen) {
        setIsHelpOpen(false);
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        navigateTo("/search");
        window.dispatchEvent(new Event("pokedex-focus-search"));
        showToast("Search focused", "info");
        trackUxEvent("shortcut_used", { key: "/" });
        return;
      }

      if (event.key.toLowerCase() === "h") {
        navigateTo("/");
        trackUxEvent("shortcut_used", { key: "h" });
        return;
      }

      if (event.key.toLowerCase() === "p") {
        navigateTo("/pokedex");
        trackUxEvent("shortcut_used", { key: "p" });
        return;
      }

      if (event.key.toLowerCase() === "s") {
        navigateTo("/search");
        trackUxEvent("shortcut_used", { key: "s" });
        return;
      }

      if (event.key.toLowerCase() === "t") {
        navigateTo("/team");
        trackUxEvent("shortcut_used", { key: "t" });
      }

      if (event.key.toLowerCase() === "b") {
        navigateTo("/battle");
        trackUxEvent("shortcut_used", { key: "b" });
      }

      if (event.key.toLowerCase() === "y") {
        navigateTo("/shinydex");
        trackUxEvent("shortcut_used", { key: "y" });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isHelpOpen]);

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    try {
      localStorage.setItem("pokedex-onboarding-dismissed", "true");
    } catch {
      // Ignore storage failures.
    }
    trackUxEvent("onboarding_dismissed");
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
            <span className="device-title">POKéDEX</span>
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
                <NavLink
                  to="/team"
                  className={({ isActive }) => (isActive ? "active-nav" : "")}
                >
                  Team {team.length > 0 ? `(${team.length}/6)` : ""}
                </NavLink>
                <NavLink
                  to="/battle"
                  className={({ isActive }) => (isActive ? "active-nav" : "")}
                >
                  Battle
                </NavLink>
                <NavLink
                  to="/shinydex"
                  className={({ isActive }) => (isActive ? "active-nav" : "")}
                >
                  Shiny
                </NavLink>
              </nav>

              <div className="content">
                {showOnboarding && (
                  <div className="onboarding-hint" role="note" aria-live="polite">
                    <div>
                      <strong>Quick start:</strong> press <kbd>/</kbd> to focus search, <kbd>p</kbd> for Pokédex,
                      and <kbd>?</kbd> to open shortcut help.
                    </div>
                    <button className="status-clear" type="button" onClick={dismissOnboarding}>Dismiss</button>
                  </div>
                )}
                <Routes>
                  <Route
                    path="/"
                    element={<Home favorites={favorites} toggleFavorite={toggleFavorite} notify={showToast} shinyDexMode={isShinyDexMode} />}
                  />
                  <Route
                    path="/pokedex"
                    element={<Pokedex favorites={favorites} toggleFavorite={toggleFavorite} notify={showToast} shinyDexMode={isShinyDexMode} />}
                  />
                  <Route
                    path="/search"
                    element={<Search favorites={favorites} toggleFavorite={toggleFavorite} notify={showToast} shinyDexMode={isShinyDexMode} />}
                  />
                  <Route
                    path="/pokemon"
                    element={<Pokemon favorites={favorites} toggleFavorite={toggleFavorite} team={team} toggleTeam={toggleTeam} notify={showToast} shinyDexMode={isShinyDexMode} shinyCollection={shinyCollection} updateShinyEntry={updateShinyEntry} />}
                  />
                  <Route
                    path="/team"
                    element={<TeamBuilder team={team} onRemove={(name) => setTeam((t) => t.filter((m) => m.name !== name))} />}
                  />
                  <Route
                    path="/battle"
                    element={<BattleMode team={team} notify={showToast} shinyDexMode={isShinyDexMode} />}
                  />
                  <Route
                    path="/shinydex"
                    element={<ShinyTracker shinyCollection={shinyCollection} updateShinyEntry={updateShinyEntry} clearShinyCollection={clearShinyCollection} notify={showToast} />}
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

              <button
                className={`theme-toggle shiny-mode-toggle ${isShinyDexMode ? "shiny-mode-active" : ""}`}
                onClick={() => {
                  playDeviceClick();
                  setIsShinyDexMode((current) => !current);
                  showToast(!isShinyDexMode ? "Shiny Dex enabled" : "Shiny Dex disabled", "info");
                }}
                type="button"
              >
                {isShinyDexMode ? "Shiny: ON" : "Shiny: OFF"}
              </button>

              {installPromptEvent && (
                <button
                  className="theme-toggle install-app-toggle"
                  onClick={handleInstallApp}
                  type="button"
                >
                  Install App
                </button>
              )}

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
      {toast && (
        <div className="toast-stack" aria-live="polite" aria-atomic="true">
          <div className={`toast-item toast-${toast.tone}`} role="status">
            {toast.message}
          </div>
        </div>
      )}
      {isHelpOpen && (
        <div className="help-overlay" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
          <div className="help-modal">
            <h2>Keyboard Shortcuts</h2>
            <p><kbd>/</kbd> Focus Search</p>
            <p><kbd>h</kbd> Go Home</p>
            <p><kbd>p</kbd> Go Pokédex</p>
            <p><kbd>s</kbd> Go Search</p>
            <p><kbd>t</kbd> Go Team</p>
            <p><kbd>b</kbd> Go Battle Mode</p>
            <p><kbd>y</kbd> Go Shiny Tracker</p>
            <p><kbd>?</kbd> Open this help</p>
            <p><kbd>Esc</kbd> Close help</p>
            <button className="app-button" type="button" onClick={() => setIsHelpOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </Router>
  );
}
