import { useEffect, useRef, useState } from "react";
import { searchAudiusTracks } from "./audiusApi";
import {
  saveLocalSongs,
  getLocalSongs,
} from "./localMusicDB";
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

const readStoredArray = (key) => {
  try {
    const saved = localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn(\`Failed to read \${key}:\`, error);
    return [];
  }
};

function App() {
  const audioRef = useRef(null);
const autoPlayRef = useRef(false);
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const gainRef = useRef(null);
  const bassRef = useRef(null);
  const trebleRef = useRef(null);
  const limiterRef = useRef(null);
const eqRefs = useRef([]);
const analyserRef = useRef(null);
const animationRef = useRef(null);
const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

const [currentSongIndex, setCurrentSongIndex] = useState(0);
const [songs, setSongs] = useState(SONGS);
const [localSongs, setLocalSongs] = useState([]);
const [search, setSearch] = useState("");

const [likedSongs, setLikedSongs] = useState(() =>
  readStoredArray("sonicflow-liked")
);

const [recentSongs, setRecentSongs] = useState(() =>
  readStoredArray("sonicflow-recent")
);
const addToRecent = (song) => {
  setRecentSongs((prev) => {
    const filtered = prev.filter((item) => item.id !== song.id);

    const updated = [song, ...filtered].slice(0, 20);

    localStorage.setItem(
      "sonicflow-recent",
      JSON.stringify(updated)
    );

    return updated;
  });
};
const [audiusSongs, setAudiusSongs] = useState([]);
const [audiusLoading, setAudiusLoading] = useState(false);
const [audiusError, setAudiusError] = useState("");
const convertAudiusTrack = (track) => ({
  id: `audius-${track.id}`,
  title: track.title,
  artist: track.user?.name || "Unknown Artist",
  cover:
    track.artwork?._480x480 ||
    track.artwork?._150x150 ||
    "",
  url: `https://api.audius.co/v1/tracks/${track.id}/stream`,
  audiusId: track.id,
  isAudius: true,
});
const playAudiusSong = (track) => {
  const audiusSong = convertAudiusTrack(track);

  const existingIndex = songs.findIndex(
    (song) => song.id === audiusSong.id
  );

  if (existingIndex !== -1) {
    changeSong(existingIndex, true);
    return;
  }

  setSongs((prev) => [...prev, audiusSong]);

  autoPlayRef.current = true;
  setCurrentSongIndex(songs.length);
  setCurrentTime(0);
  setIsPlaying(true);

  addToRecent(audiusSong);
};
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
      supportedExtensions.some((extension) =>
        name.endsWith(extension)
      )
    );
  });

const searchAudius = async () => {
  if (!search.trim()) {
    setAudiusSongs([]);
    return;
  }

  try {
    setAudiusLoading(true);
    setAudiusError("");

    const results = await searchAudiusTracks(search);

    setAudiusSongs(results);
  } catch (error) {
    console.error("Audius search error:", error);
    setAudiusError("Unable to load songs from Audius.");
  } finally {
    setAudiusLoading(false);
  }
};
const [volume, setVolume] = useState(100);
const [bass, setBass] = useState(100);
const [treble, setTreble] = useState(100);
const [playbackSpeed, setPlaybackSpeed] = useState(1);

const [shuffle, setShuffle] = useState(false);
const [repeat, setRepeat] = useState(false);
const shuffleRef = useRef(false);
const repeatRef = useRef(false);

useEffect(() => {
  shuffleRef.current = shuffle;
}, [shuffle]);
useEffect(() => {
  const loadLocalMusic = async () => {
    try {
      const savedSongs = await getLocalSongs();

      if (savedSongs.length > 0) {
        const songsWithUrls = savedSongs.map((song) => ({
          ...song,
          url: URL.createObjectURL(song.file),
        }));

        setLocalSongs(songsWithUrls);

        setSongs((prev) => {
          const onlineSongs = prev.filter((song) => !song.isLocal);

          return [...onlineSongs, ...songsWithUrls];
        });
      }
    } catch (error) {
      console.error("Failed to load local music:", error);
    }
  };

  loadLocalMusic();
}, []);
useEffect(() => {
  repeatRef.current = repeat;
}, [repeat]);
const [sleepTimer, setSleepTimer] = useState(0);
const [queue, setQueue] = useState([]);
const [showQueue, setShowQueue] = useState(false);
const currentSong = songs[currentSongIndex];

const filteredSongs = songs.filter(
  (song) =>
    song.title.toLowerCase().includes(search.toLowerCase()) ||
    song.artist.toLowerCase().includes(search.toLowerCase())
);
const sleepTimerRef = useRef(null);
const frequencies = [
  60,
  120,
  250,
  500,
  1000,
  2000,
  4000,
  8000,
  12000,
  16000,
];

const [eqValues, setEqValues] = useState(
  Array(10).fill(0)
);

const [eqPreset, setEqPreset] = useState("Normal");
  // -----------------------------
  // CREATE AUDIO ENGINE
  // -----------------------------

  const setupAudioEngine = () => {
    if (audioContextRef.current) {
      return;
    }

    const audio = audioRef.current;

    const AudioContext =
      window.AudioContext || window.webkitAudioContext;

    const context = new AudioContext();

    const source = context.createMediaElementSource(audio);

    // Main volume
    const gainNode = context.createGain();

    // Bass filter
    const bassFilter = context.createBiquadFilter();
    bassFilter.type = "lowshelf";
    bassFilter.frequency.value = 200;

    // Treble filter
    const trebleFilter = context.createBiquadFilter();
    trebleFilter.type = "highshelf";
    trebleFilter.frequency.value = 3000;

    // 10 Band Equalizer
const eqFilters = frequencies.map((frequency) => {
  const filter = context.createBiquadFilter();

  filter.type = "peaking";
  filter.frequency.value = frequency;
  filter.Q.value = 1;
  filter.gain.value = 0;

  return filter;
});

eqRefs.current = eqFilters;
const analyser = context.createAnalyser();

analyser.fftSize = 128;
analyser.smoothingTimeConstant = 0.8;
    // Limiter / compressor
    const limiter = context.createDynamicsCompressor();

    limiter.threshold.value = -2;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.1;

    // Audio chain
    let chain = source
  .connect(bassFilter)
  .connect(trebleFilter);

eqFilters.forEach((filter) => {
  chain = chain.connect(filter);
});

chain
  .connect(gainNode)
  .connect(limiter)
  .connect(analyser)
  .connect(context.destination);

    audioContextRef.current = context;
    sourceRef.current = source;
    gainRef.current = gainNode;
    bassRef.current = bassFilter;
    trebleRef.current = trebleFilter;
    limiterRef.current = limiter;
analyserRef.current = analyser;
    updateAudioSettings(
      volume,
      bass,
      treble,
      gainNode,
      bassFilter,
      trebleFilter
    );
  };

  // -----------------------------
  // UPDATE AUDIO SETTINGS
  // -----------------------------

  const updateAudioSettings = (
    newVolume,
    newBass,
    newTreble,
    gainNode = gainRef.current,
    bassFilter = bassRef.current,
    trebleFilter = trebleRef.current
  ) => {
    if (!gainNode || !bassFilter || !trebleFilter) {
      return;
    }

    // 100% = normal
    // 200% = 2x
    // 300% = 3x
    gainNode.gain.value = newVolume / 100;

    // 100% = 0 dB
    // 200% = +6 dB
    // 300% = +12 dB
    const bassBoost = (newBass - 100) * 0.06;
    const trebleBoost = (newTreble - 100) * 0.06;

    bassFilter.gain.value = bassBoost;
    trebleFilter.gain.value = trebleBoost;
  };

  // -----------------------------
  // PLAY / PAUSE
  // -----------------------------

  const togglePlay = async () => {
    const audio = audioRef.current;

    try {
      setupAudioEngine();

      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      if (audio.paused) {
  await audio.play();

  setIsPlaying(true);

  drawVisualizer();
} else {
        audio.pause();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error("Audio play failed:", error);
    }
  };

  // -----------------------------
  // AUDIO EVENTS
  // -----------------------------

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
    };

    const loaded = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };

    const ended = () => {
      if (repeatRef.current) {
        audio.currentTime = 0;

        audio.play()
          .then(() => {
            setIsPlaying(true);
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
  }, [nextSong]);

  // -----------------------------
  // VOLUME
  // -----------------------------

  const handleVolume = (e) => {
    const value = Number(e.target.value);

    setVolume(value);

    if (gainRef.current) {
      gainRef.current.gain.value = value / 100;
    }
  };

  // -----------------------------
  // BASS
  // -----------------------------

  const handleBass = (e) => {
    const value = Number(e.target.value);

    setBass(value);

    if (bassRef.current) {
      bassRef.current.gain.value = (value - 100) * 0.06;
    }
  };

  // -----------------------------
  // TREBLE
  // -----------------------------

  const handleTreble = (e) => {
    const value = Number(e.target.value);

    setTreble(value);

    if (trebleRef.current) {
      trebleRef.current.gain.value = (value - 100) * 0.06;
    }
  };
const handleEQ = (index, value) => {
  const newValues = [...eqValues];

  newValues[index] = Number(value);

  setEqValues(newValues);

  if (eqRefs.current[index]) {
    eqRefs.current[index].gain.value = Number(value);
  }

  setEqPreset("Custom");
};
const presets = {
  Normal: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],

  "Bass Boost": [
    5, 5, 4, 2, 0, 0, -1, -1, -1, -1
  ],

  "Deep Bass": [
    8, 7, 6, 3, 0, -1, -2, -2, -2, -2
  ],

  Vocal: [
    -2, -1, -1, 2, 4, 4, 3, 2, 1, 0
  ],

  Rock: [
    4, 3, 2, -1, -2, 1, 3, 4, 3, 2
  ],

  Pop: [
    -1, 1, 3, 4, 2, 0, 1, 2, 3, 3
  ],

  Classical: [
    3, 2, 1, 0, -1, -1, 1, 2, 3, 4
  ],

  Electronic: [
    5, 4, 2, 0, -2, 2, 4, 5, 4, 3
  ],
};
const handlePlaybackSpeed = (e) => {
  const speed = Number(e.target.value);

  setPlaybackSpeed(speed);

  if (audioRef.current) {
    audioRef.current.playbackRate = speed;
  }
};
const startSleepTimer = (minutes) => {
  clearTimeout(sleepTimerRef.current);

  setSleepTimer(minutes);

  if (minutes === 0) {
    return;
  }

  sleepTimerRef.current = setTimeout(() => {
    audioRef.current.pause();
    setIsPlaying(false);
    setSleepTimer(0);
  }, minutes * 60 * 1000);
};
const applyPreset = (name) => {
  const values = presets[name];

  setEqPreset(name);
  setEqValues(values);

  values.forEach((value, index) => {
    if (eqRefs.current[index]) {
      eqRefs.current[index].gain.value = value;
    }
  });
};
  // -----------------------------
  // SEEK
  // -----------------------------

  const handleSeek = (e) => {
    const newTime = Number(e.target.value);

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

const changeSong = (index, shouldPlay = false) => {
  const song = songs[index];
  const audio = audioRef.current;

  if (!song) return;

  if (audio) {
    audio.pause();
  }

  autoPlayRef.current = shouldPlay;
  setCurrentSongIndex(index);
  setCurrentTime(0);
  setIsPlaying(shouldPlay);
  addToRecent(song);
};

const addToQueue = (song) => {
  if (!song) return;

  setQueue((prev) => {
    if (prev.some((item) => item.id === song.id)) {
      return prev;
    }

    return [...prev, song];
  });
};

const removeFromQueue = (songId) => {
  setQueue((prev) => prev.filter((song) => song.id !== songId));
};

const clearQueue = () => {
  setQueue([]);
};

const nextSong = () => {
  if (!songs.length) return;

  const shouldPlay = audioRef.current
    ? !audioRef.current.paused
    : false;

  if (queue.length > 0) {
    const queuedSong = queue[0];
    const queuedIndex = songs.findIndex(
      (song) => song.id === queuedSong.id
    );

    if (queuedIndex !== -1) {
      setQueue((prev) => prev.slice(1));
      changeSong(queuedIndex, shouldPlay);
      return;
    }
  }

  let nextIndex;

  if (shuffleRef.current && songs.length > 1) {
    do {
      nextIndex = Math.floor(Math.random() * songs.length);
    } while (nextIndex === currentSongIndex);
  } else {
    nextIndex =
      currentSongIndex === songs.length - 1
        ? 0
        : currentSongIndex + 1;
  }

  changeSong(nextIndex, shouldPlay);
};

const previousSong = () => {
  if (!songs.length) return;

  const previousIndex =
    currentSongIndex === 0
      ? songs.length - 1
      : currentSongIndex - 1;

  const shouldPlay = audioRef.current
    ? !audioRef.current.paused
    : false;

  changeSong(previousIndex, shouldPlay);
};

useEffect(() => {
  const audio = audioRef.current;

  if (!audio || !currentSong?.url) {
    return;
  }

  audio.src = currentSong.url;
  audio.playbackRate = playbackSpeed;
  audio.load();

  setCurrentTime(0);
  setDuration(0);

  if (autoPlayRef.current) {
    audio.play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch((error) => {
        console.error("Auto play failed:", error);
        setIsPlaying(false);
      });
  }
}, [currentSong, playbackSpeed]);

const toggleLike = (song) => {
  setLikedSongs((prev) => {
    const alreadyLiked = prev.includes(song.id);

    const updated = alreadyLiked
      ? prev.filter((id) => id !== song.id)
      : [...prev, song.id];

    localStorage.setItem(
      "sonicflow-liked",
      JSON.stringify(updated)
    );

    return updated;
  });
};


  // -----------------------------
  // FORMAT TIME
  // -----------------------------

  const formatTime = (time) => {
    if (!time || isNaN(time)) {
      return "0:00";
    }

    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);

    return `${minutes}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };
const stopVisualizer = () => {
  if (animationRef.current) {
    cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
  }
};

const drawVisualizer = () => {
  const canvas = canvasRef.current;
  const analyser = analyserRef.current;

  if (!canvas || !analyser) return;

  stopVisualizer();

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const draw = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    animationRef.current = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = canvas.width / bufferLength;

    for (let i = 0; i < bufferLength; i += 1) {
      const value = dataArray[i];
      const barHeight = (value / 255) * canvas.height;
      const x = i * barWidth;
      const y = canvas.height - barHeight;

      ctx.fillStyle = "white";
      ctx.fillRect(x, y, Math.max(barWidth - 2, 1), barHeight);
    }
  };

  draw();
};

useEffect(() => {
  return () => {
    stopVisualizer();
    clearTimeout(sleepTimerRef.current);
  };
}, []);

  return (
    <div className="app">

   <audio
  ref={audioRef}
  crossOrigin="anonymous"
  src={currentSong.url}
  preload="metadata"
/>

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="logo">
          🎧 <span>SonicFlow</span>
        </div>

        <nav>

          <p className="menu-title">MENU</p>

          <button className="nav-item active">
            🏠 <span>Home</span>
          </button>

          <button className="nav-item">
            🔍 <span>Search</span>
          </button>

          <button className="nav-item">
            ❤️ <span>Liked Songs</span>
          </button>

          <p className="menu-title">
            YOUR LIBRARY
          </p>

          <button className="nav-item">
            🎵 <span>Recently Played</span>
          </button>

          <button className="nav-item">
            📂 <span>Playlists</span>
          </button>

        </nav>

      </aside>

      {/* MAIN */}

      <main className="main">

        <header className="topbar">
          <div>
            <p className="greeting">WELCOME BACK</p>
            <h1>Good evening, Ayush 👋</h1>
          </div>

          <div className="search-box">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Search songs or artists..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
          <div className="audius-loading">
            Loading songs...
          </div>
        )}

        {audiusError && (
          <div className="audius-error">
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
                <div className="audius-card" key={song.id}>
                  <div className="audius-cover">
                    {song.artwork?._480x480 ? (
                      <img
                        src={song.artwork._480x480}
                        alt={song.title}
                      />
                    ) : (
                      <div className="audius-cover-placeholder">
                        🎵
                      </div>
                    )}
                  </div>

                  <div className="audius-info">
                    <h3>{song.title}</h3>
                    <p>{song.user?.name || "Unknown Artist"}</p>
                  </div>

                  <button
                    type="button"
                    className="audius-play-btn"
                    title="Play"
                    onClick={() => playAudiusSong(song)}
                  >
                    ▶
                  </button>
                </div>
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
            <button type="button" className="start-btn" onClick={togglePlay}>
              {isPlaying ? "⏸ Pause Music" : "▶ Start Listening"}
            </button>
          </div>

          <div className="hero-art">
            <div className="disc">🎵</div>
          </div>
        </section>

        <section className="library-section">
          <div className="section-header">
            <div>
              <h2>Music Library</h2>
              <p>Discover your favorite tracks</p>
            </div>
            <span>{filteredSongs.length} songs</span>
          </div>

          <div className="song-list">
            {filteredSongs.length > 0 ? (
              filteredSongs.map((song) => {
                const songIndex = songs.findIndex(
                  (item) => item.id === song.id
                );

                return (
                  <div
                    className={\`song-card \${song.id === currentSong?.id ? "active-song" : ""}\`}
                    key={song.id}
                    onClick={() => changeSong(songIndex, true)}
                  >
                    <div className="song-cover">{song.cover}</div>

                    <div className="song-info">
                      <h3>{song.title}</h3>
                      <p>{song.artist}</p>
                    </div>

                    <button
                      type="button"
                      className="queue-add-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToQueue(song);
                      }}
                      title="Add to Queue"
                      aria-label={\`Add \${song.title} to queue\`}
                    >
                      ＋
                    </button>

                    <button
                      type="button"
                      className="song-play"
                      onClick={(e) => {
                        e.stopPropagation();
                        changeSong(songIndex, true);
                      }}
                      aria-label={\`Play \${song.title}\`}
                    >
                      {song.id === currentSong?.id && isPlaying ? "⏸" : "▶"}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="no-results">
                <div>🔎</div>
                <h3>No songs found</h3>
                <p>Try searching for another song or artist.</p>
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
              {localSongs.map((song) => {
                const songIndex = songs.findIndex(
                  (item) => item.id === song.id
                );

                return (
                  <div className="local-song-card" key={song.id}>
                    <div className="local-song-cover">🎵</div>

                    <div className="local-song-info">
                      <h3>{song.title}</h3>
                      <p>{song.artist}</p>
                    </div>

                    <button
                      type="button"
                      className="local-play-btn"
                      onClick={() => {
                        if (songIndex !== -1) {
                          changeSong(songIndex, true);
                        }
                      }}
                      aria-label={\`Play \${song.title}\`}
                    >
                      ▶
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

{/* NOW PLAYING */}

<section className="now-playing-page">

  <div className="now-playing-art">

    <div className="album-art">
      🎵
    </div>

    <div className="art-glow"></div>

  </div>

  <div className="now-playing-info">

    <p className="now-playing-label">
      NOW PLAYING
    </p>

    <h2>
      {currentSong.title}
    </h2>

    <p className="now-playing-artist">
      {currentSong.artist}
    </p>

    <div className="now-playing-actions">

     <button
  className={`like-button ${
    likedSongs.includes(currentSong.id) ? "liked" : ""
  }`}
  onClick={() => toggleLike(currentSong)}
>
  {likedSongs.includes(currentSong.id) ? "♥" : "♡"}
</button>

      <button className="add-button">
        ＋ Add to Playlist
      </button>

    </div>

  </div>

</section>

{/* VISUALIZER */}

<section className="visualizer-section">

  <div className="visualizer-header">

    <div>
      <p>LIVE AUDIO</p>
      <h2>Visualizer</h2>
    </div>

    <span>
      {isPlaying ? "● PLAYING" : "○ PAUSED"}
    </span>

  </div>

  <canvas
    ref={canvasRef}
    className="visualizer"
    width="1000"
    height="220"
  />

</section>
        {/* AUDIO CONTROLS */}

        <section className="audio-controls">

          <div className="control-header">
            <h2>Audio Controls</h2>
            <span>POWERFUL SOUND</span>
          </div>

          <div className="control-grid">

            {/* VOLUME */}

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
              />

              <div className="range-labels">
                <span>0%</span>
                <span>100%</span>
                <span>300%</span>
              </div>

            </div>

            {/* BASS */}

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
              />

              <div className="range-labels">
                <span>0%</span>
                <span>100%</span>
                <span>300%</span>
              </div>

            </div>

            {/* TREBLE */}

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
              />

              <div className="range-labels">
                <span>0%</span>
                <span>100%</span>
                <span>300%</span>
              </div>

            </div>

          </div>

        </section>
        {/* PLAYBACK & SLEEP */}

<section className="premium-controls">

  {/* Playback Speed */}

  <div className="premium-box">

    <div className="premium-icon">
      ⚡
    </div>

    <div className="premium-info">

      <p>PLAYBACK</p>

      <h3>Playback Speed</h3>

      <span>
        {playbackSpeed}x
      </span>

    </div>

    <select
      value={playbackSpeed}
      onChange={handlePlaybackSpeed}
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


  {/* Sleep Timer */}

  <div className="premium-box">

    <div className="premium-icon">
      🌙
    </div>

    <div className="premium-info">

      <p>SLEEP MODE</p>

      <h3>Sleep Timer</h3>

      <span>
        {sleepTimer === 0
          ? "Off"
          : `${sleepTimer} minutes`}
      </span>

    </div>

    <select
      value={sleepTimer}
      onChange={(e) =>
        startSleepTimer(Number(e.target.value))
      }
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
{/* EQUALIZER */}

<section className="equalizer-section">

  <div className="eq-header">

    <div>
      <p className="eq-label">
        PROFESSIONAL AUDIO
      </p>

      <h2>10-Band Equalizer</h2>
    </div>

    <div className="preset-buttons">

      {Object.keys(presets).map((preset) => (
        <button
          key={preset}
          className={
            eqPreset === preset
              ? "preset active"
              : "preset"
          }
          onClick={() => applyPreset(preset)}
        >
          {preset}
        </button>
      ))}

    </div>

  </div>

  <div className="equalizer">

    {frequencies.map((frequency, index) => (

      <div
        className="eq-band"
        key={frequency}
      >

        <div className="eq-value">
          {eqValues[index] > 0
            ? `+${eqValues[index]}`
            : eqValues[index]}
          dB
        </div>

        <input
          className="eq-slider"
          type="range"
          min="-12"
          max="12"
          step="1"
          value={eqValues[index]}
          onChange={(e) =>
            handleEQ(index, e.target.value)
          }
        />

        <span className="eq-frequency">
          {frequency >= 1000
            ? `${frequency / 1000}k`
            : frequency}
        </span>

      </div>

    ))}

  </div>

</section>
        {/* QUICK ACCESS */}

        <section className="section">

          <div className="section-header">
            <h2>Quick Access</h2>
            <span>See all</span>
          </div>

          <div className="cards">

            <div
              className="music-card"
              onClick={togglePlay}
            >
              <div className="cover">
                🎧
              </div>

              <h3>
                Liked Songs
              </h3>

              <p>
                Your favorite tracks
              </p>

            </div>

            <div className="music-card">

              <div className="cover">
                🔥
              </div>

              <h3>
                Recently Played
              </h3>

              <p>
                Continue listening
              </p>

            </div>

            <div className="music-card">

              <div className="cover">
                🎹
              </div>

              <h3>
                Focus Mode
              </h3>

              <p>
                Music for concentration
              </p>

            </div>

            <div className="music-card">

              <div className="cover">
                🌙
              </div>

              <h3>
                Sleep
              </h3>

              <p>
                Relax and fall asleep
              </p>

            </div>

          </div>

        </section>

        {/* PLAYER */}

        <div className="player">

          <div className="now-playing">

            <div className="mini-cover">
              {currentSong.cover}
            </div>

            <div>

              <h4>
               {currentSong.title}
              </h4>

              <p>
               {currentSong.artist}
              </p>

            </div>

          </div>

          <div className="player-center">

            <div className="controls">

             <button
  className={shuffle ? "active-control" : ""}
  onClick={() => setShuffle(!shuffle)}
  title="Shuffle"
>
  🔀
</button>

              <button onClick={previousSong}>⏮</button>

              <button
                className="play"
                onClick={togglePlay}
              >
                {isPlaying ? "⏸" : "▶"}
              </button>

              <button onClick={nextSong}>⏭</button>

             <button
  className={repeat ? "active-control" : ""}
  onClick={() => setRepeat(!repeat)}
  title="Repeat"
>
  🔁
</button>
<button
  className={showQueue ? "active-control" : ""}
  onClick={() => setShowQueue(!showQueue)}
  title="Queue"
>
  ☰
</button>

            </div>

            <div className="progress-area">

              <span>
                {formatTime(currentTime)}
              </span>

              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
              />

              <span>
                {formatTime(duration)}
              </span>

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
            />

            <span>
              {volume}%
            </span>

          </div>

        </div>

      </main>
{showQueue && (
  <div className="queue-panel">
    <div className="queue-header">
      <h2>Queue</h2>

      <button onClick={clearQueue}>
        Clear
      </button>
    </div>

    {queue.length === 0 ? (
      <p className="empty-queue">
        Your queue is empty
      </p>
    ) : (
      <div className="queue-list">
        {queue.map((song) => (
          <div className="queue-item" key={song.id}>
            <div className="queue-song-info">
              <div className="queue-cover">
                {song.cover}
              </div>

              <div>
                <strong>{song.title}</strong>
                <span>{song.artist}</span>
              </div>
            </div>

            <button
              onClick={() => removeFromQueue(song.id)}
              title="Remove"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
)}
    </div>
  );

}
export default App;