# 🎧 The Love Rewind

A beautiful retro cassette player that plays **your own songs** — completely
**ad-free**. No YouTube, no ads, ever.

Songs come from your own audio files in the `/songs` folder, and cover art is
fetched automatically from the iTunes Store.

## What's in this folder

| File          | What it is                                                     |
| ------------- | -------------------------------------------------------------- |
| `index.html`  | The page itself (don't need to touch this)                     |
| `styles.css`  | The look & feel (don't need to touch this)                     |
| `script.js`   | The player brain (don't need to touch this)                    |
| `songs.js`    | The playlist — artist + title for every song (edit to change)  |
| `songs/`      | Put your audio files here                                      |
| `background.jpg` | The cover artwork — replace this file to change the look     |
| `README.md`   | This guide                                                     |

## The playlist

| #  | Artist            | Song                                    |
| -- | ----------------- | --------------------------------------- |
| 1  | Elvis Presley     | Can't Help Falling in Love              |
| 2  | Elvis Presley     | Can't Help Falling In Love              |
| 3  | Coldplay          | Yellow                                  |
| 4  | Bryan Adams       | (Everything I Do) I Do It for You       |
| 5  | Bruno Mars        | Just the Way You Are                    |
| 6  | Jayanta Nath      | Leire Leire                             |
| 7  | One Direction     | Night Changes                           |
| 8  | Zubeen Garg       | Nirole Khani                            |
| 9  | Ed Sheeran        | Thinking Out Loud                       |
| 10 | Stephen Sanchez   | Until I Found You                       |
| 11 | Eric Clapton      | Wonderful Tonight                       |
| 12 | Zubeen Garg       | Yengejei Nangse                         |

## Adding a song

1. Drop an audio file named **exactly** like the track number into `songs/`
   (e.g. `songs/13.mp3` for the 13th song in the list).
2. Done — the player loads it when you tap play. No code edits needed.

## Cover art

Cover art is fetched from the iTunes Store using `artist + title`. Songs not
found show a golden vinyl record placeholder. To pin a specific cover, add a
`cover` field in `songs.js`:

```js
{ title: "Yellow", artist: "Coldplay", cover: "yellow.jpg" }
```

## Running it locally

Just open `index.html` in a browser — no server needed. iTunes cover art needs
internet. Audio files stream from `/songs`.

Everything is ₹0 — GitHub Pages, SSL, hosting. Forever.
