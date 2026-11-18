# PixelQuest

A small, retro-inspired pixel adventure that runs in your browser. Explore the countryside, visit your house, watch the world change from day to night, and encounter wildlife.

**Play online:** https://jasoncoker010101-cmd.github.io/pixelquest/

## Features

- **Retro presentation:** pixel art, a CRT-style frame, scanline effect, and a 320 × 240 game canvas.
- **Opening cinematic:** a first-time intro that pans across the world, approaches the house, and ends inside the bedroom. Existing save slots skip the intro.
- **Exploration:** walk around the outdoor map, paths, fields, and the house.
- **House interior:** enter and explore the home, with furniture and wall collision.
- **Day and night:** the world has a time cycle. Press **Z** to set the world to night.
- **Wildlife:** fish jump in the water, rabbits run away when approached, and wolves appear at night.
- **Wolf encounters:** wolves can trigger a battle when you get close. Choose to fight or attempt to run.
- **Player stats:** health, stamina, level, strength, defense, steps, and play time.
- **Inventory:** view your current berries, wood, and fish counts.
- **Saving:** browser save slots; optional account sign-in enables cloud saves.
- **Device support:** keyboard controls and on-screen touch controls for phones and tablets.

## Controls

| Action | Keyboard | Touch button |
|---|---|---|
| Move | WASD or Arrow keys | Direction pad |
| Interact / enter or exit house | E | E |
| Run | Hold Shift | RUN |
| Inventory | I | BAG |
| Stats | C | STATS |
| Set night | Z | NIGHT |
| Fight in encounter | 1 / Enter / Space | FIGHT |
| Attempt to escape encounter | 2 / Escape | RUN |
| Exit / return | Escape | — |
| Skip opening cinematic | Any key or controller action | Tap / controller action |

## Play and run locally

No build step is required.

1. Download or clone this repository.
2. Open `index.html` in a modern browser, or serve the folder with a simple local web server.
3. Start a new save slot to see the intro. Existing saves continue from their saved location.

Some browser features, audio playback, and account/cloud functions may behave differently when opening the file directly; using a local web server is recommended for development.

## Save data

- Local saves are stored in your browser's local storage.
- Signing in enables cloud save syncing for your save slots.
- Clearing browser storage can remove local saves. Keep cloud sync enabled if you want a remote copy.
- Cloud services are provided by the project's configured backend and may be unavailable.

## Project files

- `index.html` — game page, styling, canvas, and mobile controls.
- `world.js` — world generation, rendering, player movement, interactions, intro, wildlife, encounters, and save data.
- `assets/` — game art and audio files.
- `assets/ASSET-CREDITS.txt` — credits and notices for third-party assets.

## Assets and credits

PixelQuest includes original project assets and third-party materials. Check [assets/ASSET-CREDITS.txt](assets/ASSET-CREDITS.txt) for asset-specific attribution and license information.

The project's LICENSE applies only to materials that the project author has the rights to license. Third-party materials remain governed by their own licenses and notices.

## Contributing

This repository is currently maintained as a personal project. Please open an issue to report bugs or suggest improvements. Do not submit, publish, or reuse project assets or code in another project without permission from the rights holder(s).

## License

PixelQuest's original project materials are **All Rights Reserved** and are covered by the [LICENSE](LICENSE). Public visibility of this repository does not grant permission to redistribute, modify, or reuse its code or assets. Third-party materials are excluded and retain their own terms.
