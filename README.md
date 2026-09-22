# 🎧 SonicFlow

> **A modern browser-based music player built with React + Vite — stream songs, import your own music folder, build playlists, control playback, and shape the sound with a visual equalizer.**

<p align="center">
  <a href="https://sonic-flow.vercel.app/">
    <img src="https://img.shields.io/badge/Live%20Demo-SonicFlow-6366F1?style=for-the-badge" alt="Live Demo" />
  </a>
  <a href="https://github.com/ayushydv1805/SonicFlow/actions">
    <img src="https://img.shields.io/github/actions/workflow/status/ayushydv1805/SonicFlow/ci.yml?style=for-the-badge&label=Build" alt="Build Status" />
  </a>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=111827" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 8" />
</p>

<p align="center">
  <a href="https://sonic-flow.vercel.app/">🌐 Open SonicFlow</a>
  ·
  <a href="https://github.com/ayushydv1805/SonicFlow">💻 Source Code</a>
</p>

---

## ✨ What is SonicFlow?

SonicFlow is a **web music player designed to feel like a real desktop music app** while staying completely in the browser.

It combines:

- 🎵 Built-in demo tracks
- 🔎 Audius music search
- 📁 Local music folder import
- ❤️ Liked songs
- 🎼 My Playlist
- 📂 Playback queue
- 🕘 Recently played
- 🔀 Shuffle + 🔁 Repeat
- ⏩ Playback speed control
- 😴 Sleep timer
- 🎚️ Bass + Treble controls
- 🎛️ 10-band equalizer with presets
- 📊 Real-time audio visualizer
- 💾 Browser-side persistence for user music/preferences

No traditional application server is required for the player itself.

---

## 🧠 Core Idea

SonicFlow keeps the player logic in the browser and combines three main kinds of data:

1. **Bundled / demo tracks** for immediate playback.
2. **Audius tracks** fetched from the Audius API when the user searches.
3. **Local audio files** selected by the user and stored in the browser using IndexedDB.

Persistent preferences and lightweight library metadata are stored with localStorage, while the actual imported local audio data is stored in IndexedDB.

---

## 🏗️ Architecture

```
flowchart TD
    U[User] --> UI[SonicFlow React UI]

    UI --> MP[Music Player]
    UI --> LIB[Library & Navigation]
    UI --> SEARCH[Audius Search]
    UI --> LOCAL[Local Music Import]
    UI --> SETTINGS[Audio Controls]

    SEARCH --> API[Audius API]
    API --> REMOTE[Remote Track Data]

    LOCAL --> IDB[(IndexedDB)]
    IDB --> LOCAL

    LIB --> LS[(localStorage)]
    SETTINGS --> LS

    MP --> WA[Web Audio API]
    WA --> EQ[10-Band EQ]
    WA --> FILTERS[Bass / Treble]
    WA --> VIS[Audio Visualizer]

    MP --> DATA[Current Song / Queue / Playback State]
    DATA --> UI
```

### Data storage model

```
flowchart LR
    A[Player State] --> B{Where is it stored?}

    B -->|Likes| LS[(localStorage)]
    B -->|Playlist IDs + metadata| LS
    B -->|Playback speed / volume / bass / treble| LS
    B -->|Recent playback metadata| LS

    B -->|Imported audio files| IDB[(IndexedDB)]
    B -->|Current queue| MEM[In-memory React state]
    B -->|Audius search results| NET[Audius API]
```

---

## 🔄 Playback Flow

```
flowchart TD
    START[Play selected track] --> AUDIO[HTMLAudioElement]
    AUDIO --> PLAY{Track ended?}

    PLAY -->|No| AUDIO
    PLAY -->|Yes| REPEAT{Repeat enabled?}

    REPEAT -->|Yes| SAME[Restart current track]
    SAME --> AUDIO

    REPEAT -->|No| QUEUE{Queue has a track?}

    QUEUE -->|Yes| NEXTQ[Play next queued track]
    NEXTQ --> AUDIO

    QUEUE -->|No| MODE{Shuffle enabled?}

    MODE -->|Yes| RANDOM[Select shuffled track]
    MODE -->|No| NEXT[Navigate to next track]

    RANDOM --> AUDIO
    NEXT --> AUDIO
```

The player explicitly advances playback when a track ends, so the next track is loaded with autoplay behavior instead of waiting for another manual click.

---

## 🚀 Features

### 🎵 Music Playback

- Play / pause
- Previous / next
- Progress seek
- Volume control
- Current time / duration display
- Automatic next-track playback
- Queue-aware playback
- Shuffle
- Repeat
- Playback speed from **0.25× to 3×**

### 🔎 Audius Search

Search for tracks directly from SonicFlow through the Audius API.

Each result can be:

- ▶️ Played immediately
- 🎼 Added to **My Playlist**

Saved remote tracks can be restored from playlist metadata on a later visit.

### 📁 Local Music

Choose a complete music folder directly from the browser.

SonicFlow can:

- Import multiple audio files
- Display imported tracks in the local library
- Play them like normal tracks
- Remove individual tracks
- Clear the local library
- Restore stored local audio after reopening the site

Local files are stored in **IndexedDB** rather than uploaded to a SonicFlow server.

### ❤️ Liked Songs

Like or unlike songs directly from the music library.

Likes are persisted in browser storage so the library remains available after a page reload.

### 🎼 My Playlist

Create a personal playlist from:

- Built-in tracks
- Audius search results
- Local music

Playlist membership and metadata are persisted locally in the browser.

### 📂 Queue

Build a temporary **Up Next** list without changing your permanent playlist.

Queue supports:

- Add song
- Remove song
- Clear queue
- Close queue panel

### 🕘 Recently Played

SonicFlow keeps track of recently played music so you can quickly return to previous tracks.

### 🎚️ Sound Controls

SonicFlow uses the **Web Audio API** for browser-side audio processing.

Available controls include:

- Volume
- Bass
- Treble
- 10-band equalizer
- Custom EQ adjustment
- Presets:
  - Normal
  - Bass Boost
  - Deep Bass
  - Vocal
  - Rock
  - Pop
  - Classical
  - Electronic

### 📊 Audio Visualizer

Playback is connected to an analyser node and visualized in real time while audio is playing.

### 😴 Sleep Timer

Set a timer that automatically stops playback after the selected duration.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **React 19** | UI and application state |
| **Vite 8** | Development server and production build |
| **JavaScript (ES Modules)** | Application logic |
| **Web Audio API** | Audio processing, filters, EQ and analyser |
| **IndexedDB** | Persistent local audio storage |
| **localStorage** | Likes, playlist metadata and playback preferences |
| **Audius API** | Remote music search and streaming |
| **Vercel** | Production deployment |
| **GitHub Actions** | Lint/build verification |

---

## 📂 Project Structure

```
SonicFlow/
├── public/
├── src/
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   ├── main.jsx
│   ├── NotFound.jsx
│   ├── audiusApi.js
│   ├── localMusicDB.js
│   └── assets/
│
├── .github/
│   └── workflows/
│
├── vercel.json
├── eslint.config.js
├── package.json
├── package-lock.json
└── README.md
```

### Important files

**src/App.jsx**  
Contains the main player UI, playback logic, library interactions, queue, playlist, search UI, EQ controls and visualizer.

**src/audiusApi.js**  
Contains the Audius track search request logic.

**src/localMusicDB.js**  
Handles IndexedDB storage and restoration of imported audio files.

**src/index.css / src/App.css**  
Controls the application layout, library, player, queue, responsive behavior and visual styling.

**vercel.json**  
Provides the SPA rewrite so client-side routes/pages resolve correctly when deployed.

---

## 💾 How Persistence Works

```
sequenceDiagram
    participant User
    participant React as React App
    participant LS as localStorage
    participant IDB as IndexedDB
    participant Audius as Audius API

    User->>React: Like / playlist / playback settings
    React->>LS: Save metadata

    User->>React: Select music folder
    React->>IDB: Save audio Blobs + metadata
    IDB-->>React: Stored local tracks

    User->>React: Search a song
    React->>Audius: GET /tracks/search
    Audius-->>React: Track results

    User->>React: Save Audius track
    React->>LS: Save playlist metadata

    User->>React: Reopen SonicFlow
    React->>LS: Restore preferences/library metadata
    React->>IDB: Restore local audio files
```

---

## 🧪 Run Locally

### 1. Clone the repository

```
git clone https://github.com/ayushydv1805/SonicFlow.git
cd SonicFlow
```

### 2. Install dependencies

```
npm install
```

### 3. Start the development server

```
npm run dev
```

Open the URL shown by Vite, usually:

```
http://localhost:5173
```

### 4. Create a production build

```
npm run build
```

### 5. Run lint checks

```
npm run lint
```

---

## 🌐 Live Demo

**SonicFlow:**  
https://sonic-flow.vercel.app/

**GitHub Repository:**  
https://github.com/ayushydv1805/SonicFlow

---

## 🔐 Privacy & Browser Storage

SonicFlow is designed around browser-side storage.

### Local music

Imported local audio files are stored in the browser's **IndexedDB**. SonicFlow does not provide a backend upload service for those files.

### Preferences

Likes, playlist metadata and playback preferences are stored in **localStorage**.

### External music

Audius search and remote streaming require an internet connection and depend on the Audius API being available.

Browser storage behavior can vary by browser and privacy settings. Persistent storage is requested when the browser supports it, but the browser ultimately controls storage policies.

---

## 📱 Responsive Experience

The interface is designed to adapt to smaller screens as well as desktop layouts, including:

- Responsive library rows
- Mobile-friendly controls
- Adjustable player layout
- Queue drawer
- Compact navigation
- Responsive search and local-file controls

---

## 🧭 User Flow

```
flowchart LR
    HOME[Open SonicFlow] --> CHOOSE{Choose source}

    CHOOSE --> DEMO[Built-in Music]
    CHOOSE --> AUDIOUS[Audius Search]
    CHOOSE --> LOCAL[Local Music Folder]

    DEMO --> PLAY[Play Track]
    AUDIOUS --> SAVE[Save to Playlist]
    AUDIOUS --> PLAY
    LOCAL --> PLAY

    SAVE --> PLAYLIST[My Playlist]
    PLAY --> LIKE[Like]
    PLAY --> QUEUE[Add to Queue]
    PLAY --> RECENT[Recently Played]

    PLAYLIST --> PLAY
    QUEUE --> PLAY
    RECENT --> PLAY
```

---

## 🏁 Development Status

SonicFlow currently includes the main end-to-end music-player experience:

- Functional playback controls
- Automatic next-song playback
- Audius search
- Local music persistence
- Likes
- Playlist
- Queue
- Recently played
- EQ and audio processing
- Visualizer
- Sleep timer
- Responsive UI
- Vercel deployment

---

## 🤝 Contributing

Contributions, UI ideas, bug reports and feature suggestions are welcome.

For larger changes:

```
git checkout -b feature/your-feature-name
```

Make your changes, then verify:

```
npm run lint
npm run build
```

---

## 📄 License

No license file is currently included in this repository.

---

<p align="center">
  <strong>🎧 SonicFlow — Your music. Your browser. Your flow.</strong>
</p>
