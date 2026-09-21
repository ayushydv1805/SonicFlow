import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { searchAudiusTracks } from "./audiusApi";
import { getLocalSongs, saveLocalSongs } from "./localMusicDB";
import NotFound from "./NotFound";

const SONGS = [
  {
    id: 1,
    title: "SonicFlow Demo",
    artist: "Demo Artist",
    cover: "🎵",
    url: "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
  },
  {
    id: 2,
    title: "Ocean Dreams",
    artist: "SonicFlow",
    cover: "🌊",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  },
  {
    id: 3,
    title: "Night Drive",
    artist: "SonicFlow",
    cover: "🌃",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  },
  {
    id: 4,
    title: "Electric Sky",
    artist: "SonicFlow",
    cover: "⚡",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  },
];

const FREQUENCIES = [60, 120, 250, 500, 1000, 2000, 4000, 8000, 12000, 16000];

const PRESETS = {
  Normal: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "Bass Boost": [5, 5, 4, 2, 0, 0, -1, -1, -1, -1],
  "Deep Bass": [8, 7, 6, 3, 0, -1, -2, -2, -2, -2],
  Vocal: [-2, -1, -1, 2, 4, 4, 3, 2, 1, 0],
  Rock: [4, 3, 2, -1, -2, 1, 3, 4, 3, 2],
  Pop: [-1, 1, 3, 4, 2, 0, 1, 2, 3, 3],
  Classical: [3, 2, 1, 0, -1, -1, 1, 2, 3, 4],
  Electronic: [5, 4, 2, 0, -2, 2, 4, 5, 4, 3],
};

const readStoredArray = (key) => {
  try {
    const saved = localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to read " + key + ":", error);
    return [];
  }
};

const readRecentIds = () =>
  readStoredArray("sonicflow-recent")
    .map((item) => (typeof item === "object" ? item?.id : item))
    .filter(Boolean);

function SonicFlowPlayer() {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const gainRef = useRef(null);
  const bassRef = useRef(null);
  const trebleRef = useRef(null);
  const eqRefs = useRef([]);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const sleepTimerRef = useRef(null);

  const songsRef = useRef(SONGS);
  const currentSongIndexRef = useRef(0);
  const queueRef = useRef([]);
  const repeatRef = useRef(false);
  const shuffleRef = useRef(false);
  const autoPlayRef = useRef(false);
  const playbackSpeedRef = useRef(1);
  const localSongsRef = useRef([]);

  const [songs, setSongs] = useState(SONGS);
  const [localSongs, setLocalSongs] = useState([]);
  const [likedSongs, setLikedSongs] = useState(() =>
    readStoredArray("sonicflow-liked")
  );
  const [recentSongs, setRecentSongs] = useState(readRecentIds);
  const [queue, setQueue] = useState([]);
  const [search, setSearch] = useState("");
  const [viewFilter, setViewFilter] = useState("all");
  const [audiusSongs, setAudiusSongs] = useState([]);
  const [audiusLoading, setAudiusLoading] = useState(false);
  const [audiusError, setAudiusError] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [bass, setBass] = useState(100);
  const [treble, setTreble] = useState(100);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [sleepTimer, setSleepTimer] = useState(0);
  const [showQueue, setShowQueue] = useState(false);
  const [eqValues, setEqValues] = useState(PRESETS.Normal);
  const [eqPreset, setEqPreset] = useState("Normal");

  const searchInputRef = useRef(null);
  const libraryRef = useRef(null);

  useEffect(() => {
    songsRef.current = songs;
    currentSongIndexRef.current = currentSongIndex;
    queueRef.current = queue;
    repeatRef.current = repeat;
    shuffleRef.current = shuffle;
    playbackSpeedRef.current = playbackSpeed;
    localSongsRef.current = localSongs;
  }, [
    currentSongIndex,
    localSongs,
    playbackSpeed,
    queue,
    repeat,
    shuffle,
    songs,
  ]);

  const currentSong = songs[currentSongIndex] || songs[0];

  const addToRecent = useCallback((song) => {
    if (!song) return;

    setRecentSongs((prev) => {
      const updated = [song.id, ...prev.filter((id) => id !== song.id)].slice(
        0,
        20
      );
      localStorage.setItem("sonicflow-recent", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const stopVisualizer = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const drawVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;

    if (!canvas || !analyser) return;

    stopVisualizer();

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!analyserRef.current || !audioRef.current) {
        animationRef.current = null;
        return;
      }

      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / bufferLength;

      for (let index = 0; index < bufferLength; index += 1) {
        const value = dataArray[index];
        const barHeight = (value / 255) * canvas.height;
        const x = index * barWidth;
        const y = canvas.height - barHeight;

        ctx.fillStyle = "white";
        ctx.fillRect(x, y, Math.max(barWidth - 2, 1), barHeight);
      }
    };

    draw();
  }, [stopVisualizer]);

  const setupAudioEngine = useCallback(() => {
    if (audioContextRef.current) return true;

    const audio = audioRef.current;
    const AudioContext =
      window.AudioContext || window.webkitAudioContext;

    if (!audio || !AudioContext) {
      return false;
    }

    try {
      const context = new AudioContext();
      const source = context.createMediaElementSource(audio);
      const gainNode = context.createGain();

      const bassFilter = context.createBiquadFilter();
      bassFilter.type = "lowshelf";
      bassFilter.frequency.value = 200;

      const trebleFilter = context.createBiquadFilter();
      trebleFilter.type = "highshelf";
      trebleFilter.frequency.value = 3000;

      const eqFilters = FREQUENCIES.map((frequency) => {
        const filter = context.createBiquadFilter();
        filter.type = "peaking";
        filter.frequency.value = frequency;
        filter.Q.value = 1;
        filter.gain.value = 0;
        return filter;
      });

      const analyser = context.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;

      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -2;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.1;

      gainNode.gain.value = volume / 100;
      bassFilter.gain.value = (bass - 100) * 0.06;
      trebleFilter.gain.value = (treble - 100) * 0.06;

      let chain = source.connect(bassFilter).connect(trebleFilter);

      eqFilters.forEach((filter) => {
        chain = chain.connect(filter);
      });

      chain
        .connect(gainNode)
        .connect(limiter)
        .connect(analyser)
        .connect(context.destination);

      audioContextRef.current = context;
      gainRef.current = gainNode;
      bassRef.current = bassFilter;
      trebleRef.current = trebleFilter;
      eqRefs.current = eqFilters;
      analyserRef.current = analyser;

      return true;
    } catch (error) {
      console.error("Audio engine setup failed:", error);
      return false;
    }
  }, [bass, treble, volume]);

  const changeSong = useCallback(
    (index, shouldPlay = false) => {
      const song = songsRef.current[index];
      const audio = audioRef.current;

      if (!song) return;

      audio?.pause();
      autoPlayRef.current = shouldPlay;
      setCurrentSongIndex(index);
      currentSongIndexRef.current = index;
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(shouldPlay);
      addToRecent(song);
    },
    [addToRecent]
  );

  const nextSong = useCallback(() => {
    const availableSongs = songsRef.current;

    if (!availableSongs.length) return;

    const shouldPlay = audioRef.current
      ? !audioRef.current.paused
      : false;

    const queuedSong = queueRef.current[0];

    if (queuedSong) {
      const queuedIndex = availableSongs.findIndex(
        (song) => song.id === queuedSong.id
      );

      if (queuedIndex !== -1) {
        setQueue((prev) => prev.slice(1));
        changeSong(queuedIndex, shouldPlay);
        return;
      }

      setQueue((prev) => prev.slice(1));
    }

    let nextIndex;

    if (shuffleRef.current && availableSongs.length > 1) {
      do {
        nextIndex = Math.floor(Math.random() * availableSongs.length);
      } while (nextIndex === currentSongIndexRef.current);
    } else {
      nextIndex =
        currentSongIndexRef.current === availableSongs.length - 1
          ? 0
          : currentSongIndexRef.current + 1;
    }

    changeSong(nextIndex, shouldPlay);
  }, [changeSong]);

  const previousSong = useCallback(() => {
    const availableSongs = songsRef.current;
    if (!availableSongs.length) return;

    const previousIndex =
      currentSongIndexRef.current === 0
        ? availableSongs.length - 1
        : currentSongIndexRef.current - 1;

    const shouldPlay = audioRef.current
      ? !audioRef.current.paused
      : false;

    changeSong(previousIndex, shouldPlay);
  }, [changeSong]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;

    if (!audio) return;

    try {
      if (!setupAudioEngine()) {
        await audio.play();
      } else {
        if (audioContextRef.current?.state === "suspended") {
          await audioContextRef.current.resume();
        }

        await audio.play();
      }

      setIsPlaying(true);
      drawVisualizer();
    } catch (error) {
      console.error("Audio play failed:", error);
      setIsPlaying(false);
      stopVisualizer();
    }
  }, [drawVisualizer, setupAudioEngine, stopVisualizer]);

  const togglePlayPause = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      await togglePlay();
    } else {
      audio.pause();
      autoPlayRef.current = false;
      setIsPlaying(false);
      stopVisualizer();
    }
  }, [stopVisualizer, togglePlay]);

  const handleSongSelect = useCallback(
    (songIndex) => {
      if (songIndex === currentSongIndexRef.current) {
        togglePlayPause();
        return;
      }

      changeSong(songIndex, true);
    },
    [changeSong, togglePlayPause]
  );

  const handleLocalMusic = async (event) => {
    const files = Array.from(event.target.files || []);
    const supportedExtensions = [
      ".mp3",
      ".wav",
      ".m4a",
      ".aac",
      ".ogg",
      ".flac",
      ".webm",
    ];

    const audioFiles = files.filter((file) => {
      const name = file.name.toLowerCase();
      return (
        file.type.startsWith("audio/") ||
        supportedExtensions.some((extension) => name.endsWith(extension))
      );
    });

    if (!audioFiles.length) {
      event.target.value = "";
      return;
    }

    const newLocalSongs = audioFiles.map((file) => ({
      id: "local-" + file.name + "-" + file.size + "-" + file.lastModified,
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Local Music",
      cover: "🎵",
      url: URL.createObjectURL(file),
      file,
      isLocal: true,
      fileName: file.name,
    }));

    try {
      await saveLocalSongs(newLocalSongs);

      setLocalSongs((prev) => {
        const existingIds = new Set(prev.map((song) => song.id));
        return [
          ...prev,
          ...newLocalSongs.filter((song) => !existingIds.has(song.id)),
        ];
      });

      setSongs((prev) => {
        const existingIds = new Set(prev.map((song) => song.id));
        return [
          ...prev,
          ...newLocalSongs.filter((song) => !existingIds.has(song.id)),
        ];
      });
    } catch (error) {
      newLocalSongs.forEach((song) => URL.revokeObjectURL(song.url));
      console.error("Failed to save local music:", error);
    } finally {
      event.target.value = "";
    }
  };

  const searchAudius = async () => {
    const query = search.trim();

    if (!query) {
      setAudiusSongs([]);
      setAudiusError("");
      return;
    }

    try {
      setAudiusLoading(true);
      setAudiusError("");

      const results = await searchAudiusTracks(query);
      setAudiusSongs(Array.isArray(results) ? results : []);
    } catch (error) {
      console.error("Audius search error:", error);
      setAudiusSongs([]);
      setAudiusError("Unable to load songs from Audius. Try again.");
    } finally {
      setAudiusLoading(false);
    }
  };

  const playAudiusSong = (track) => {
    if (!track?.id) return;

    const audiusSong = {
      id: "audius-" + track.id,
      title: track.title || "Untitled Track",
      artist: track.user?.name || "Unknown Artist",
      cover:
        track.artwork?._480x480 ||
        track.artwork?._150x150 ||
        "",
      url: "https://api.audius.co/v1/tracks/" + track.id + "/stream",
      audiusId: track.id,
      isAudius: true,
    };

    const existingIndex = songsRef.current.findIndex(
      (song) => song.id === audiusSong.id
    );

    if (existingIndex !== -1) {
      changeSong(existingIndex, true);
      return;
    }

    const nextSongs = [...songsRef.current, audiusSong];
    songsRef.current = nextSongs;
    setSongs(nextSongs);

    const nextIndex = nextSongs.length - 1;
    currentSongIndexRef.current = nextIndex;
    autoPlayRef.current = true;
    setCurrentSongIndex(nextIndex);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(true);
    addToRecent(audiusSong);
  };

  const handleVolume = (event) => {
    const value = Number(event.target.value);
    setVolume(value);

    if (gainRef.current) {
      gainRef.current.gain.value = value / 100;
    }
  };

  const handleBass = (event) => {
    const value = Number(event.target.value);
    setBass(value);

    if (bassRef.current) {
      bassRef.current.gain.value = (value - 100) * 0.06;
    }
  };

  const handleTreble = (event) => {
    const value = Number(event.target.value);
    setTreble(value);

    if (trebleRef.current) {
      trebleRef.current.gain.value = (value - 100) * 0.06;
    }
  };

  const handleEQ = (index, value) => {
    const nextValues = [...eqValues];
    nextValues[index] = Number(value);
    setEqValues(nextValues);
    setEqPreset("Custom");

    if (eqRefs.current[index]) {
      eqRefs.current[index].gain.value = Number(value);
    }
  };

  const applyPreset = (name) => {
    const values = PRESETS[name];
    if (!values) return;

    setEqPreset(name);
    setEqValues(values);

    values.forEach((value, index) => {
      if (eqRefs.current[index]) {
        eqRefs.current[index].gain.value = value;
      }
    });
  };

  const handlePlaybackSpeed = (event) => {
    const speed = Number(event.target.value);
    setPlaybackSpeed(speed);
    playbackSpeedRef.current = speed;

    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const startSleepTimer = (minutes) => {
    clearTimeout(sleepTimerRef.current);
    setSleepTimer(minutes);

    if (minutes === 0) return;

    sleepTimerRef.current = window.setTimeout(() => {
      audioRef.current?.pause();
      autoPlayRef.current = false;
      stopVisualizer();
      setIsPlaying(false);
      setSleepTimer(0);
    }, minutes * 60 * 1000);
  };

  const handleSeek = (event) => {
    const newTime = Number(event.target.value);

    if (!audioRef.current || !Number.isFinite(newTime)) return;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleLike = (song) => {
    if (!song) return;

    setLikedSongs((prev) => {
      const updated = prev.includes(song.id)
        ? prev.filter((id) => id !== song.id)
        : [...prev, song.id];

      localStorage.setItem("sonicflow-liked", JSON.stringify(updated));
      return updated;
    });
  };

  const addToQueue = (song) => {
    if (!song) return;

    setQueue((prev) =>
      prev.some((item) => item.id === song.id)
        ? prev
        : [...prev, song]
    );
  };

  const removeFromQueue = (songId) => {
    setQueue((prev) => prev.filter((song) => song.id !== songId));
  };

  const clearQueue = () => {
    setQueue([]);
  };

  const filteredSongs = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = songs;

    if (term) {
      result = result.filter(
        (song) =>
          song.title.toLowerCase().includes(term) ||
          song.artist.toLowerCase().includes(term)
      );
    }

    if (viewFilter === "liked") {
      result = result.filter((song) => likedSongs.includes(song.id));
    }

    if (viewFilter === "recent") {
      const recentSet = new Set(recentSongs);
      result = result.filter((song) => recentSet.has(song.id));
    }

    return result;
  }, [likedSongs, recentSongs, search, songs, viewFilter]);

  const scrollToLibrary = (filter) => {
    setViewFilter(filter);
    libraryRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    let cancelled = false;

    async function loadLocalMusic() {
      try {
        const savedSongs = await getLocalSongs();

        if (cancelled || !Array.isArray(savedSongs) || !savedSongs.length) {
          return;
        }

        const songsWithUrls = savedSongs.map((song) => ({
          ...song,
          url: URL.createObjectURL(song.file),
          isLocal: true,
        }));

        if (cancelled) {
          songsWithUrls.forEach((song) => URL.revokeObjectURL(song.url));
          return;
        }

        setLocalSongs(songsWithUrls);

        setSongs((prev) => {
          const existingIds = new Set(prev.map((song) => song.id));
          return [
            ...prev,
            ...songsWithUrls.filter((song) => !existingIds.has(song.id)),
          ];
        });
      } catch (error) {
        console.error("Failed to load local music:", error);
      }
    }

    loadLocalMusic();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong?.url) return;

    audio.src = currentSong.url;
    audio.playbackRate = playbackSpeedRef.current;
    audio.load();

    setCurrentTime(0);
    setDuration(0);

    if (!autoPlayRef.current) return;

    autoPlayRef.current = false;

    audio
      .play()
      .then(() => {
        setIsPlaying(true);
        drawVisualizer();
      })
      .catch((error) => {
        console.error("Auto play failed:", error);
        setIsPlaying(false);
      });
  }, [currentSong?.id, currentSong?.url, drawVisualizer]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const loaded = () => {
      setDuration(
        Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : 0
      );
    };

    const ended = () => {
      if (repeatRef.current) {
        audio.currentTime = 0;
        audio
          .play()
          .then(() => {
            setIsPlaying(true);
            drawVisualizer();
          })
          .catch((error) => {
            console.error("Repeat play failed:", error);
            setIsPlaying(false);
          });
        return;
      }

      nextSong();
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", loaded);
    audio.addEventListener("ended", ended);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", loaded);
      audio.removeEventListener("ended", ended);
    };
  }, [drawVisualizer, nextSong]);

  useEffect(() => {
    return () => {
      stopVisualizer();
      clearTimeout(sleepTimerRef.current);

      localSongsRef.current.forEach((song) => {
        if (song.url?.startsWith("blob:")) {
          URL.revokeObjectURL(song.url);
        }
      });

      audioContextRef.current?.close().catch(() => {});
    };
  }, [stopVisualizer]);

  return (
    <div className="app">
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        src={currentSong?.url || ""}
        preload="metadata"
      />

      <aside className="sidebar">
        <div className="logo">
          🎧 <span>SonicFlow</span>
        </div>

        <nav>
          <p className="menu-title">MENU</p>

          <button
            type="button"
            className={viewFilter === "all" ? "nav-item active" : "nav-item"}
            onClick={() => scrollToLibrary("all")}
          >
            🏠 <span>Home</span>
          </button>

          <button
            type="button"
            className="nav-item"
            onClick={() => searchInputRef.current?.focus()}
          >
            🔍 <span>Search</span>
          </button>

          <button
            type="button"
            className={
              viewFilter === "liked" ? "nav-item active" : "nav-item"
            }
            onClick={() => scrollToLibrary("liked")}
          >
            ❤️ <span>Liked Songs</span>
          </button>

          <p className="menu-title">YOUR LIBRARY</p>

          <button
            type="button"
            className={
              viewFilter === "recent" ? "nav-item active" : "nav-item"
            }
            onClick={() => scrollToLibrary("recent")}
          >
            🎵 <span>Recently Played</span>
          </button>

          <button
            type="button"
            className="nav-item"
            onClick={() => setShowQueue(true)}
          >
            📂 <span>Queue</span>
          </button>
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="greeting">WELCOME BACK</p>
            <h1>Good evening, Ayush 👋</h1>
          </div>

          <div className="search-box">
            <span aria-hidden="true">🔍</span>
            <input
              ref={searchInputRef}
              type="search"
              placeholder="Search songs or artists..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") searchAudius();
              }}
              aria-label="Search songs or artists"
            />

            <button type="button" onClick={searchAudius}>
              Search Audius
            </button>

            <label className="local-music-btn">
              📁 Select Music Folder
              <input
                type="file"
                accept="audio/*"
                multiple
                webkitdirectory=""
                onChange={handleLocalMusic}
                hidden
              />
            </label>
          </div>

          <div className="profile-avatar" aria-label="Profile">
            A
          </div>
        </header>

        {audiusLoading && (
          <div className="audius-loading">Loading songs...</div>
        )}

        {audiusError && (
          <div className="audius-error" role="alert">
            {audiusError}
          </div>
        )}

        {audiusSongs.length > 0 && (
          <section className="audius-results">
            <div className="audius-results-header">
              <h2>Search Results</h2>
              <span>{audiusSongs.length} tracks</span>
            </div>

            <div className="audius-grid">
              {audiusSongs.map((song) => (
                <article className="audius-card" key={song.id}>
                  <div className="audius-cover">
                    {song.artwork?._480x480 ? (
                      <img
                        src={song.artwork._480x480}
                        alt={song.title || "Track"}
                        loading="lazy"
                      />
                    ) : (
                      <div className="audius-cover-placeholder">🎵</div>
                    )}
                  </div>

                  <div className="audius-info">
                    <h3>{song.title || "Untitled Track"}</h3>
                    <p>{song.user?.name || "Unknown Artist"}</p>
                  </div>

                  <button
                    type="button"
                    className="audius-play-btn"
                    onClick={() => playAudiusSong(song)}
                    aria-label={"Play " + (song.title || "track")}
                  >
                    ▶
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="hero">
          <div>
            <p className="hero-label">YOUR MUSIC EXPERIENCE</p>

            <h2>
              Music without
              <br />
              <span>limits.</span>
            </h2>

            <p className="hero-text">
              High quality music with powerful controls, personalized playlists
              and an immersive experience.
            </p>

            <button
              type="button"
              className="start-btn"
              onClick={togglePlayPause}
            >
              {isPlaying ? "⏸ Pause Music" : "▶ Start Listening"}
            </button>
          </div>

          <div className="hero-art">
            <div className="disc">{currentSong?.cover || "🎵"}</div>
          </div>
        </section>

        <section className="library-section" ref={libraryRef}>
          <div className="section-header">
            <div>
              <h2>
                {viewFilter === "liked"
                  ? "Liked Songs"
                  : viewFilter === "recent"
                    ? "Recently Played"
                    : "Music Library"}
              </h2>

              <p>
                {viewFilter === "liked"
                  ? "Your favorite tracks"
                  : viewFilter === "recent"
                    ? "Your listening history"
                    : "Discover your favorite tracks"}
              </p>
            </div>

            <button
              type="button"
              className="section-header-reset"
              onClick={() => setViewFilter("all")}
            >
              {filteredSongs.length} songs · See all
            </button>
          </div>

          <div className="song-list">
            {filteredSongs.length > 0 ? (
              filteredSongs.map((song) => {
                const songIndex = songs.findIndex(
                  (item) => item.id === song.id
                );

                return (
                  <article
                    className={
                      "song-card " +
                      (song.id === currentSong?.id ? "active-song" : "")
                    }
                    key={song.id}
                  >
                    <button
                      type="button"
                      className="song-card-main"
                      onClick={() => handleSongSelect(songIndex)}
                      aria-label={
                        (song.id === currentSong?.id && isPlaying
                          ? "Pause "
                          : "Play ") + song.title
                      }
                    >
                      <span className="song-cover">{song.cover}</span>

                      <span className="song-info">
                        <strong>{song.title}</strong>
                        <span>{song.artist}</span>
                      </span>
                    </button>

                    <button
                      type="button"
                      className="queue-add-btn"
                      onClick={() => addToQueue(song)}
                      title="Add to Queue"
                      aria-label={"Add " + song.title + " to queue"}
                    >
                      ＋
                    </button>

                    <button
                      type="button"
                      className="song-play"
                      onClick={() => handleSongSelect(songIndex)}
                      aria-label={
                        (song.id === currentSong?.id && isPlaying
                          ? "Pause "
                          : "Play ") + song.title
                      }
                    >
                      {song.id === currentSong?.id && isPlaying ? "⏸" : "▶"}
                    </button>
                  </article>
                );
              })
            ) : (
              <div className="no-results">
                <div>🔎</div>
                <h3>No songs found</h3>
                <p>
                  {viewFilter === "liked"
                    ? "You have not liked any songs yet."
                    : viewFilter === "recent"
                      ? "Play a song to build your listening history."
                      : "Try another search or artist name."}
                </p>
              </div>
            )}
          </div>
        </section>

        {localSongs.length > 0 && (
          <section className="local-music-section">
            <div className="local-music-header">
              <h2>🎵 Local Music</h2>
              <span>{localSongs.length} songs</span>
            </div>

            <div className="local-music-list">
              {localSongs.map((song) => (
                <article className="local-song-card" key={song.id}>
                  <div className="local-song-cover">🎵</div>

                  <div className="local-song-info">
                    <h3>{song.title}</h3>
                    <p>{song.artist}</p>
                  </div>

                  <button
                    type="button"
                    className="local-play-btn"
                    onClick={() =>
                      handleSongSelect(
                        songs.findIndex((item) => item.id === song.id)
                      )
                    }
                    aria-label={"Play " + song.title}
                  >
                    ▶
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="now-playing-page">
          <div className="now-playing-art">
            <div className="album-art">{currentSong?.cover || "🎵"}</div>
            <div className="art-glow"></div>
          </div>

          <div className="now-playing-info">
            <p className="now-playing-label">NOW PLAYING</p>

            <h2>{currentSong?.title || "Nothing playing"}</h2>

            <p className="now-playing-artist">
              {currentSong?.artist || "Choose a track to begin"}
            </p>

            <div className="now-playing-actions">
              <button
                type="button"
                className={
                  "like-button " +
                  (currentSong && likedSongs.includes(currentSong.id)
                    ? "liked"
                    : "")
                }
                onClick={() => toggleLike(currentSong)}
                aria-label="Like current song"
              >
                {currentSong && likedSongs.includes(currentSong.id)
                  ? "♥"
                  : "♡"}
              </button>

              <button
                type="button"
                className="add-button"
                onClick={() => addToQueue(currentSong)}
              >
                ＋ Add to Queue
              </button>
            </div>
          </div>
        </section>

        <section className="visualizer-section">
          <div className="visualizer-header">
            <div>
              <p>LIVE AUDIO</p>
              <h2>Visualizer</h2>
            </div>
            <span>{isPlaying ? "● PLAYING" : "○ PAUSED"}</span>
          </div>

          <canvas
            ref={canvasRef}
            className="visualizer"
            width="1000"
            height="220"
            aria-label="Audio visualizer"
          />
        </section>

        <section className="audio-controls">
          <div className="control-header">
            <h2>Audio Controls</h2>
            <span>POWERFUL SOUND</span>
          </div>

          <div className="control-grid">
            <div className="control-box">
              <div className="control-title">
                <span>🔊 Volume</span>
                <strong>{volume}%</strong>
              </div>
              <input
                type="range"
                min="0"
                max="300"
                value={volume}
                onChange={handleVolume}
                aria-label="Volume"
              />
              <div className="range-labels">
                <span>0%</span>
                <span>100%</span>
                <span>300%</span>
              </div>
            </div>

            <div className="control-box">
              <div className="control-title">
                <span>🔊 Bass</span>
                <strong>{bass}%</strong>
              </div>
              <input
                type="range"
                min="0"
                max="300"
                value={bass}
                onChange={handleBass}
                aria-label="Bass"
              />
              <div className="range-labels">
                <span>0%</span>
                <span>100%</span>
                <span>300%</span>
              </div>
            </div>

            <div className="control-box">
              <div className="control-title">
                <span>✨ Treble</span>
                <strong>{treble}%</strong>
              </div>
              <input
                type="range"
                min="0"
                max="300"
                value={treble}
                onChange={handleTreble}
                aria-label="Treble"
              />
              <div className="range-labels">
                <span>0%</span>
                <span>100%</span>
                <span>300%</span>
              </div>
            </div>
          </div>
        </section>

        <section className="premium-controls">
          <div className="premium-box">
            <div className="premium-icon">⚡</div>
            <div className="premium-info">
              <p>PLAYBACK</p>
              <h3>Playback Speed</h3>
              <span>{playbackSpeed}x</span>
            </div>

            <select
              value={playbackSpeed}
              onChange={handlePlaybackSpeed}
              aria-label="Playback speed"
            >
              <option value="0.25">0.25x</option>
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x Normal</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="1.75">1.75x</option>
              <option value="2">2x</option>
              <option value="2.5">2.5x</option>
              <option value="3">3x</option>
            </select>
          </div>

          <div className="premium-box">
            <div className="premium-icon">🌙</div>
            <div className="premium-info">
              <p>SLEEP MODE</p>
              <h3>Sleep Timer</h3>
              <span>
                {sleepTimer === 0 ? "Off" : sleepTimer + " minutes"}
              </span>
            </div>

            <select
              value={sleepTimer}
              onChange={(event) =>
                startSleepTimer(Number(event.target.value))
              }
              aria-label="Sleep timer"
            >
              <option value="0">Off</option>
              <option value="5">5 minutes</option>
              <option value="10">10 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
              <option value="90">90 minutes</option>
            </select>
          </div>
        </section>

        <section className="equalizer-section">
          <div className="eq-header">
            <div>
              <p className="eq-label">PROFESSIONAL AUDIO</p>
              <h2>10-Band Equalizer</h2>
            </div>

            <div className="preset-buttons">
              {Object.keys(PRESETS).map((preset) => (
                <button
                  type="button"
                  key={preset}
                  className={eqPreset === preset ? "preset active" : "preset"}
                  onClick={() => applyPreset(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="equalizer">
            {FREQUENCIES.map((frequency, index) => (
              <div className="eq-band" key={frequency}>
                <div className="eq-value">
                  {eqValues[index] > 0 ? "+" : ""}
                  {eqValues[index]} dB
                </div>

                <input
                  className="eq-slider"
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={eqValues[index]}
                  onChange={(event) =>
                    handleEQ(index, event.target.value)
                  }
                  aria-label={frequency + " Hz equalizer band"}
                />

                <span className="eq-frequency">
                  {frequency >= 1000 ? frequency / 1000 + "k" : frequency}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <div>
              <h2>Quick Access</h2>
              <p>Jump into your music tools</p>
            </div>
          </div>

          <div className="cards">
            <button
              type="button"
              className="music-card"
              onClick={() => scrollToLibrary("liked")}
            >
              <div className="cover">🎧</div>
              <h3>Liked Songs</h3>
              <p>Your favorite tracks</p>
            </button>

            <button
              type="button"
              className="music-card"
              onClick={() => scrollToLibrary("recent")}
            >
              <div className="cover">🔥</div>
              <h3>Recently Played</h3>
              <p>Continue listening</p>
            </button>

            <button
              type="button"
              className="music-card"
              onClick={() => scrollToLibrary("all")}
            >
              <div className="cover">🎹</div>
              <h3>Focus Mode</h3>
              <p>Return to the full library</p>
            </button>

            <button
              type="button"
              className="music-card"
              onClick={() => startSleepTimer(sleepTimer || 30)}
            >
              <div className="cover">🌙</div>
              <h3>Sleep</h3>
              <p>{sleepTimer ? sleepTimer + " min timer" : "30 min timer"}</p>
            </button>
          </div>
        </section>

        <div className="player">
          <div className="now-playing">
            <div className="mini-cover">{currentSong?.cover || "🎵"}</div>
            <div>
              <h4>{currentSong?.title || "Nothing playing"}</h4>
              <p>{currentSong?.artist || "SonicFlow"}</p>
            </div>
          </div>

          <div className="player-center">
            <div className="controls">
              <button
                type="button"
                className={shuffle ? "active-control" : ""}
                onClick={() => setShuffle((value) => !value)}
                title="Shuffle"
                aria-label="Toggle shuffle"
              >
                🔀
              </button>

              <button
                type="button"
                onClick={previousSong}
                title="Previous"
                aria-label="Previous song"
              >
                ⏮
              </button>

              <button
                type="button"
                className="play"
                onClick={togglePlayPause}
                title={isPlaying ? "Pause" : "Play"}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? "⏸" : "▶"}
              </button>

              <button
                type="button"
                onClick={nextSong}
                title="Next"
                aria-label="Next song"
              >
                ⏭
              </button>

              <button
                type="button"
                className={repeat ? "active-control" : ""}
                onClick={() => setRepeat((value) => !value)}
                title="Repeat"
                aria-label="Toggle repeat"
              >
                🔁
              </button>

              <button
                type="button"
                className={showQueue ? "active-control" : ""}
                onClick={() => setShowQueue((value) => !value)}
                title="Queue"
                aria-label="Toggle queue"
              >
                ☰
              </button>
            </div>

            <div className="progress-area">
              <span>{formatTime(currentTime)}</span>

              <input
                type="range"
                min="0"
                max={duration || 0}
                value={Math.min(currentTime, duration || 0)}
                onChange={handleSeek}
                disabled={!duration}
                aria-label="Track progress"
              />

              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="volume">
            <span>🔊</span>
            <input
              type="range"
              min="0"
              max="300"
              value={volume}
              onChange={handleVolume}
              aria-label="Volume"
            />
            <span>{volume}%</span>
          </div>
        </div>
      </main>

      {showQueue && (
        <aside className="queue-panel" role="dialog" aria-label="Queue">
          <div className="queue-header">
            <h2>Queue</h2>
            <button type="button" onClick={clearQueue}>
              Clear
            </button>
          </div>

          {queue.length === 0 ? (
            <p className="empty-queue">Your queue is empty</p>
          ) : (
            <div className="queue-list">
              {queue.map((song) => (
                <div className="queue-item" key={song.id}>
                  <div className="queue-song-info">
                    <div className="queue-cover">{song.cover}</div>
                    <div>
                      <strong>{song.title}</strong>
                      <span>{song.artist}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromQueue(song.id)}
                    title="Remove"
                    aria-label={"Remove " + song.title + " from queue"}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}

function formatTime(time) {
  if (!Number.isFinite(time) || time <= 0) return "0:00";

  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);

  return minutes + ":" + seconds.toString().padStart(2, "0");
}

function App() {
  const path = window.location.pathname;

  if (path !== "/" && path !== "" && path !== "/index.html") {
    return <NotFound />;
  }

  return <SonicFlowPlayer />;
}

export default App;
