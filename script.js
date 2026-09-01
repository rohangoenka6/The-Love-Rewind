var COVER_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">' +
      '<rect width="600" height="600" fill="#151a3d"/>' +
      '<circle cx="300" cy="300" r="220" fill="none" stroke="#3a2f5c" stroke-width="46"/>' +
      '<circle cx="300" cy="300" r="160" fill="#241436"/>' +
      '<circle cx="300" cy="300" r="34" fill="#ffd98a"/>' +
    "</svg>"
  );

var els = {
  songTitle: document.getElementById("songTitle"),
  songArtist: document.getElementById("songArtist"),
  songNote: document.getElementById("songNote"),
  songCover: document.getElementById("songCover"),
  playBtn: document.getElementById("playBtn"),
  playIco: document.getElementById("playIco"),
  pauseIco: document.getElementById("pauseIco"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  back10Btn: document.getElementById("back10Btn"),
  fwd10Btn: document.getElementById("fwd10Btn"),
  progressBar: document.getElementById("progressBar"),
  curTime: document.getElementById("curTime"),
  durTime: document.getElementById("durTime"),
  volBtn: document.getElementById("volBtn"),
  volLabel: document.getElementById("volLabel"),
  volumePopover: document.getElementById("volumePopover"),
  volumeSlider: document.getElementById("volumeSlider"),
  listBtn: document.getElementById("listBtn"),
  listCount: document.getElementById("listCount"),
  listPanel: document.getElementById("listPanel"),
  listCloseBtn: document.getElementById("listCloseBtn"),
  listItems: document.getElementById("listItems"),
  listEmpty: document.getElementById("listEmpty"),
  audio: document.getElementById("audioPlayer"),
};

var currentIndex = -1;
var isPlaying = false;
var isDraggingProgress = false;
var coverCache = [];
var srcCache = [];

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sourceCandidates(i) {
  if (srcCache[i]) return srcCache[i];
  var song = SONGS[i] || {};
  var n = i + 1;
  var pad = String(n).padStart(2, "0");
  var cands = [];
  if (song.file) cands.push(song.file);
  cands.push("songs/" + pad + ".mp3");
  cands.push("songs/" + n + ".mp3");
  if (song.title) cands.push("songs/" + slugify(song.title) + ".mp3");
  srcCache[i] = cands.filter(function (v, k) {
    return cands.indexOf(v) === k;
  });
  return srcCache[i];
}

function setPlayBtn(playing) {
  if (els.playIco) els.playIco.hidden = playing;
  if (els.pauseIco) els.pauseIco.hidden = !playing;
}

function setTitle(title, artist) {
  els.songTitle.textContent = title;
  els.songArtist.textContent = artist || "";
}

function setNote(text) {
  els.songNote.textContent = text;
}

function updateCover(i) {
  var song = SONGS[i];
  if (!song) return;
  setCover(song.cover || COVER_PLACEHOLDER);
  if (song.cover || coverCache[i]) return;
  fetch(
    "https://itunes.apple.com/search?term=" +
      encodeURIComponent(song.artist + " " + song.title) +
      "&media=music&entity=musicTrack&limit=1"
  )
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (data) {
      var res = (data && data.results && data.results[0]) || null;
      var art = res && res.artworkUrl100 ? res.artworkUrl100 : null;
      if (art) {
        art = art.replace(/100x100bb/, "600x600bb");
        coverCache[i] = art;
        if (i === currentIndex) setCover(art);
      }
    })
    .catch(function () {});
}

function setCover(src) {
  els.songCover.src = src;
  els.songCover.alt = "Song cover";
}

function playIndex(i) {
  if (i < 0 || i >= SONGS.length) return;
  currentIndex = i;
  var song = SONGS[i];
  var cands = sourceCandidates(i);
  if (!cands.length) {
    setNote("No audio file found. Drop songs/" + (i + 1) + ".mp3 into /songs");
    setPlayBtn(false);
    isPlaying = false;
    return;
  }
  setTitle(song.title, song.artist);
  setNote("Loading\u2026");
  playSource(i, cands, 0);
  highlightActiveListItem();
  updateCover(i);
}

function playSource(i, cands, k) {
  var audio = els.audio;
  audio.src = cands[k];
  audio.dataset.cands = JSON.stringify(cands);
  audio.dataset.k = String(k);
  var p = audio.play();
  if (p && p.catch) {
    p.catch(function () {
      audio.load();
    });
  }
}

els.playBtn.addEventListener("click", function () {
  if (currentIndex < 0) {
    playIndex(0);
    return;
  }
  if (isPlaying) els.audio.pause();
  else {
    if (!els.audio.currentSrc && !els.audio.getAttribute("src")) {
      playIndex(currentIndex);
    } else {
      var p = els.audio.play();
      if (p && p.catch) p.catch(function () {});
    }
  }
});

els.prevBtn.addEventListener("click", function () {
  var i = currentIndex <= 0 ? SONGS.length - 1 : currentIndex - 1;
  playIndex(i);
});

els.nextBtn.addEventListener("click", function () {
  playIndex(currentIndex < 0 ? 0 : (currentIndex + 1) % SONGS.length);
});

els.back10Btn.addEventListener("click", function () {
  if (isFinite(els.audio.currentTime)) els.audio.currentTime -= 10;
});

els.fwd10Btn.addEventListener("click", function () {
  if (isFinite(els.audio.duration)) els.audio.currentTime += 10;
});

els.audio.addEventListener("play", function () {
  isPlaying = true;
  setPlayBtn(true);
  els.songNote.textContent = "Love vibes, always \uD83C\uDFA7";
  highlightActiveListItem();
});

els.audio.addEventListener("pause", function () {
  isPlaying = false;
  setPlayBtn(false);
});

els.audio.addEventListener("ended", function () {
  playIndex(currentIndex < 0 ? 0 : (currentIndex + 1) % SONGS.length);
});

els.audio.addEventListener("waiting", function () {
  if (!isPlaying) return;
  els.songNote.textContent = "Buffering\u2026";
});

els.audio.addEventListener("error", function () {
  var cands = [];
  try {
    cands = JSON.parse(els.audio.dataset.cands || "[]");
  } catch (err) {}
  var k = Number(els.audio.dataset.k || 0);
  if (cands.length && k < cands.length - 1) {
    playSource(currentIndex, cands, k + 1);
    return;
  }
  setNote(
    "No audio file yet \u2014 drop songs/" +
      (currentIndex + 1) +
      ".mp3 into /songs to enable this song"
  );
  setPlayBtn(false);
  isPlaying = false;
});

function highlightActiveListItem() {
  var items = els.listItems.querySelectorAll(".list-item");
  items.forEach(function (item) {
    var active = Number(item.dataset.index) === currentIndex;
    item.classList.toggle("active", active);
    var mark = item.querySelector(".list-item-playing");
    if (mark) mark.style.display = active ? "inline" : "none";
  });
}

function buildListPanel() {
  els.listItems.innerHTML = "";
  if (els.listCount) els.listCount.textContent = String(SONGS.length);
  if (!SONGS.length) {
    els.listEmpty.textContent = "No songs yet.";
    els.listItems.appendChild(els.listEmpty);
    return;
  }
  SONGS.forEach(function (song, index) {
    var item = document.createElement("button");
    item.className = "list-item";
    item.dataset.index = String(index);

    var idxEl = document.createElement("span");
    idxEl.className = "list-item-index";
    idxEl.textContent = String(index + 1);

    var thumb = document.createElement("img");
    thumb.className = "list-item-thumb";
    thumb.src = COVER_PLACEHOLDER;
    thumb.alt = "";
    thumb.loading = "lazy";

    var text = document.createElement("div");
    text.className = "list-item-text";

    var titleEl = document.createElement("div");
    titleEl.className = "list-item-title";
    titleEl.textContent = song.title;

    var artistEl = document.createElement("div");
    artistEl.className = "list-item-artist";
    artistEl.textContent = song.artist;

    text.append(titleEl, artistEl);

    var playingMark = document.createElement("span");
    playingMark.className = "list-item-playing";
    playingMark.textContent = "\u266a";
    playingMark.style.display = "none";

    item.append(idxEl, thumb, text, playingMark);

    item.addEventListener("click", function () {
      playIndex(index);
      closeListPanel();
    });

    els.listItems.appendChild(item);

    loadListCover(index, thumb);
  });
}

function loadListCover(i, img) {
  var song = SONGS[i];
  if (song.cover) {
    img.src = song.cover;
    return;
  }
  fetch(
    "https://itunes.apple.com/search?term=" +
      encodeURIComponent(song.artist + " " + song.title) +
      "&media=music&limit=1"
  )
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (data) {
      var res = (data && data.results && data.results[0]) || null;
      var art = res && res.artworkUrl100 ? res.artworkUrl100 : null;
      if (art) {
        art = art.replace(/100x100bb/, "600x600bb");
        img.src = art;
        coverCache[i] = art;
      }
    })
    .catch(function () {});
}

function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  seconds = Math.floor(seconds);
  var m = Math.floor(seconds / 60);
  var s = String(seconds % 60).padStart(2, "0");
  return m + ":" + s;
}

els.progressBar.addEventListener("pointerdown", function () {
  isDraggingProgress = true;
});

els.progressBar.addEventListener("input", function () {
  var v = Number(els.progressBar.value);
  var max = Number(els.progressBar.max) || 100;
  els.curTime.textContent = formatTime(v);
  els.progressBar.style.setProperty(
    "--range-pct",
    (max > 0 ? (v / max) * 100 : 0) + "%"
  );
});

els.progressBar.addEventListener("change", function () {
  if (isFinite(els.audio.duration)) {
    els.audio.currentTime = Number(els.progressBar.value);
  }
  isDraggingProgress = false;
});

function pollProgress() {
  if (!isFinite(els.audio.duration) || isNaN(els.audio.currentTime)) return;
  if (isDraggingProgress) return;
  var duration = els.audio.duration;
  var current = els.audio.currentTime;
  els.progressBar.max = duration;
  els.progressBar.value = current;
  els.progressBar.style.setProperty(
    "--range-pct",
    (current / duration) * 100 + "%"
  );
  els.curTime.textContent = formatTime(current);
  els.durTime.textContent = formatTime(duration);
}

// Keep the play/pause icon in sync with the audio element's real state,
// no matter what. This self-corrects even if an event is missed.
function syncPlayBtnFromAudio() {
  if (!els.audio || !els.playIco || !els.pauseIco) return;
  var playing = !els.audio.paused && !els.audio.ended;
  if (els.playIco.hidden === playing && els.pauseIco.hidden === !playing) return;
  isPlaying = playing;
  setPlayBtn(playing);
}
setInterval(function () {
  syncPlayBtnFromAudio();
}, 250);
setInterval(pollProgress, 250);

els.volBtn.addEventListener("click", function (ev) {
  ev.stopPropagation();
  els.volumePopover.hidden = !els.volumePopover.hidden;
});

document.addEventListener("click", function (ev) {
  if (
    !els.volumePopover.hidden &&
    !els.volumePopover.contains(ev.target) &&
    ev.target !== els.volBtn
  ) {
    els.volumePopover.hidden = true;
  }
});

els.volumeSlider.addEventListener("input", function () {
  var v = Number(els.volumeSlider.value);
  if (els.volLabel) els.volLabel.textContent = String(v);
  els.audio.volume = v / 100;
});

function openListPanel() {
  els.listPanel.hidden = false;
  highlightActiveListItem();
}

function closeListPanel() {
  els.listPanel.hidden = true;
}

els.listBtn.addEventListener("click", function (ev) {
  ev.stopPropagation();
  if (els.listPanel.hidden) openListPanel();
  else closeListPanel();
});
els.listCloseBtn.addEventListener("click", closeListPanel);

document.addEventListener("click", function (ev) {
  if (els.listPanel.hidden) return;
  if (!els.listPanel.contains(ev.target) && ev.target !== els.listBtn) {
    closeListPanel();
  }
});

document.addEventListener("keydown", function (ev) {
  var tag = (ev.target.tagName || "").toLowerCase();
  if (
    tag === "input" ||
    tag === "button" ||
    tag === "textarea" ||
    tag === "select"
  ) {
    return;
  }
  if (ev.code === "Space") {
    ev.preventDefault();
    els.playBtn.click();
  } else if (ev.code === "ArrowLeft") {
    els.back10Btn.click();
  } else if (ev.code === "ArrowRight") {
    els.fwd10Btn.click();
  }
});

function startClock() {
  var timeEl = document.getElementById("clockTime");
  var ampmEl = document.getElementById("clockAmPm");
  var dateEl = document.getElementById("clockDate");
  var tick = function () {
    var now = new Date();
    var h = now.getHours();
    var ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    var mm = String(now.getMinutes()).padStart(2, "0");
    timeEl.textContent = h + ":" + mm;
    ampmEl.textContent = ampm;
    dateEl.textContent = now.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };
  tick();
  setInterval(tick, 1000);
}

function wmoEmoji(code) {
  if (code === 0) return "\u2600\ufe0f";
  if (code <= 2) return "\u26c5";
  if (code === 3 || code === 45 || code === 48) return "\u2601\ufe0f";
  if (code <= 67) return "\ud83c\udf27\ufe0f";
  if (code <= 77) return "\ud83c\udf28\ufe0f";
  if (code <= 82) return "\ud83c\udf26\ufe0f";
  if (code <= 86) return "\ud83c\udf28\ufe0f";
  return "\u26c8\ufe0f";
}

function weatherCondition(code) {
  if (code === 0) return "sunny";
  if (code === 1 || code === 2) return "partly";
  if (code >= 95) return "storm";
  if (code >= 80 && code <= 82) return "rain";
  if (code >= 71 && code <= 86) return "snow";
  if (code >= 51 && code <= 67) return "rain";
  if (code === 3 || code === 45 || code === 48) return "cloudy";
  return "cloudy";
}

// Crisp, high-contrast emoji shown for each condition (much clearer than
// tiny CSS-drawn shapes), with the animated effects layered on top.
function conditionEmoji(cond) {
  if (cond === "sunny") return "\u2600\ufe0f";
  if (cond === "partly") return "\u26c5";
  if (cond === "cloudy") return "\u2601\ufe0f";
  if (cond === "rain") return "\ud83c\udf27\ufe0f";
  if (cond === "snow") return "\ud83c\udf28\ufe0f";
  if (cond === "storm") return "\u26c8\ufe0f";
  return "\ud83c\udf19";
}

async function fetchWeather(lat, lon, el) {
  try {
    var wRes = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=" +
        lat +
        "&longitude=" +
        lon +
        "&current=temperature_2m,weather_code"
    );
    if (!wRes.ok) throw new Error("weather request failed");
    var data = await wRes.json();
    var temp = Math.round(data.current.temperature_2m);
    var code = data.current.weather_code;
    var cond = weatherCondition(code);
    var box = document.getElementById("weatherBox");
    var icon = document.getElementById("weatherIcon");
    el.textContent = temp + "\u00b0";
    if (icon) icon.textContent = conditionEmoji(cond);
    if (box) box.setAttribute("data-weather", cond);
  } catch (err) {
    el.textContent = "";
    var ic = document.getElementById("weatherIcon");
    if (ic) ic.textContent = "\ud83c\udf19";
  }
}

function initWeather() {
  var el = document.getElementById("weatherTxt");
  fetchWeather(18.5204, 73.8567, el);
}

function checkBackground() {
  var candidates = ["background.jpg", "background.png"];
  var i = 0;
  var tryNext = function () {
    if (i >= candidates.length) return;
    var img = new Image();
    img.onload = function () {
      document.body.classList.add("has-bg");
    };
    img.onerror = tryNext;
    img.src = candidates[i++];
  };
  tryNext();
}

setTitle("Tap \u25b6 to play", "The Love Rewind");
setNote("Drop your songs into the /songs folder to unlock them");
els.audio.volume = Number(els.volumeSlider.value) / 100;

buildListPanel();
checkBackground();
startClock();
initWeather();