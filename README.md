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
- **Animated main menu:** title letters drop in, a cracked moon sheds glowing shards, shooting stars cross the sky, and Rowan waits by a campfire. Menu options are rune stones with a sword cursor, and the save screen shows each slot's chapter, area, and level.
- **Story:** three chapters so far.
  - Chapter 1, The Hollow King: follow Dad's trail through the forest to Bram's camp and into the Hollow, collect journal pages and lore stones, defeat Grukk, and find Dad.
  - Chapter 2, The Ashen Pass: Dad tells you about the Pale Court and Morwen. Cross the burning mountain road with Wren and face Ashmane, the Pale Mare.
  - Chapter 3, The Moon-Eater: reach Gloamhold, a drowned city in the rain, and fight Vael in the castle quarter. The chapter ends with a tease for Chapter 4, The Pale Court.
- **Lore:** about 19 lore entries on stones, letters, and logs across every area, all readable in the LORE tab.
- **Areas:** the house, the forest, Bram's camp (campfire rest point and shop), the Hollow, the Ashen Pass, and Gloamhold. Each area has its own music, weather and particles (fireflies, embers, rain), and boss arena.
- **Boss entrances:** each boss gets a cinematic. Letterbox bars slide in and the camera swings to the boss. Grukk smashes the ground and roars, Ashmane gallops in on a trail of blue fire and rears up in a ring of flame, and Vael drops out of the sky and breathes moonfire. Then the boss's name and title burn in above its head. Press E / ✕ to skip.
- **Boss music:** a dramatic entrance theme plays during the cinematic, and each boss has its own battle theme.
- **World map and fast travel:** the MAP tab shows every region and your position. While resting at a campfire, you can pick another fire you have visited to travel there.
- **Enemies:** goblins, mushrooms, and flying eyes in the forest. Skeletons (they block with a shield) and ghosts in the Hollow. A two-phase ogre boss that sends out shockwaves and calls ghosts when below half HP.
- **Inventory:** full-screen bag with ITEMS / GEAR / STATS / QUEST / LORE / MAP tabs. Each item has an action menu (use, set as quick item, inspect, equip, drop), plus rarity colors, NEW tags, and a rotating inspect view with item lore. Mouse/touch clicks work too.
- **Quick item:** set food or a tonic as the quick item and use it mid-fight without opening the bag.
- **Combat:** tap attack for a 3-hit combo (slash, slash, heavy finisher), attack while sprinting for a dash thrust, or attack in the air for a plunge that slams to the ground with a shockwave. The plunge only triggers when you are well above the ground. Hold attack to charge the Moonblade, a blue power slash that sends out a crescent wave. Use the upper slash to hit enemies above you, and the dodge roll to pass through attacks. A roll timed just before a hit is a perfect dodge. Weapons (Ember Edge, Moonsilver) can be equipped from the bag. Hits have hit-pause, knockback, sparks, damage numbers, and XP/level-ups.
- **Sound and music:** sampled sword, footstep, monster, and UI sound effects, plus music for each area that crossfades between scenes, with a boss theme.
- **Saving:** browser save slots; optional account sign-in enables cloud saves.
- **Device support:** keyboard controls and on-screen touch controls for phones and tablets.

## Controls

| Action | Keyboard | PS5 controller | Touch button |
|---|---|---|---|
| Move | WASD or Arrow keys | Left stick or D-pad | Direction pad |
| Jump (forest) | Space / W / Up | ✕ Cross | — |
| Attack (forest) | J / F | □ Square (or R2) | — |
| Moonblade (blue power slash) | Hold J / F, then release | Hold □, then release | — |
| Upper slash | U (or Up + J) | Up + □ | — |
| Dodge roll | K / L | ○ Circle | — |
| Plunge attack | J while in the air | □ while in the air | — |
| Quick item (forest/Hollow) | H | Touchpad | — |
| Talk / read / rest / shop | E | ✕ Cross | E |
| Interact / confirm | E / Enter | ✕ Cross | E |
| Back / close | Escape | ○ Circle | — |
| Run | Hold Shift | Hold L1, R1, or L2 | RUN |
| Inventory | I | △ Triangle | BAG |
| Inventory: select / actions / switch tab | Arrows / E / Q, R, Tab | D-pad / ✕ / L1, R1 | tap |
| Inventory: back out of a menu | Escape / X / Backspace | ○ Circle | — |
| Stats | C | Touchpad (indoors) or Create | STATS |
| Pause | Escape / P | Options | — |
| Fight / escape encounter | 1 / 2 | ✕ or □ / ○ | FIGHT / RUN |
| Skip opening cinematic | Any key | Any button | Tap |

In the forest, ✕ interacts when a prompt is shown (for example, returning home) and jumps otherwise. On-screen prompts switch to PlayStation buttons while a controller is in use, and the controller rumbles on hits. Both the standard browser layout and Firefox's raw DualSense layout are supported.

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
