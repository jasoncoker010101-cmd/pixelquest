# PixelQuest

A small, retro-inspired pixel adventure that runs in your browser. Explore the countryside, visit your house, watch the world change from day to night, and encounter wildlife.

**Play online:** https://jasoncoker010101-cmd.github.io/pixelquest/

## Frostglass and the Cinder Seam

In Chapter 2, stop at Wren’s Lookout. Vi’s forge is west of the fire, and a
Cinderback work order is posted just to the east. Follow that notice into
Cinder Deep to find a hidden mine, its checkpoint, and a guarded ore cache.
The regular hunt boards still offer repeatable bounties.

A new encounter on the Ashen Pass opens a frost trail to an optional duel.
Bring the resulting boss trophy and Seam Ore to either blacksmith to craft
the Frostglass Edge. Look for people with speech markers to hear stories
and earn journal entries; lore already unlocked in older saves stays unlocked.

## Salt Coast expansion

In Chapter 4, look for the Brinewick path east of Wren at Lantern Quay.
Brinewick has a campfire, pier, smith, kitchen, stable, and three-wave arena.
Cast at the pier, watch the float, and interact again when it dips. Give your
first Saltfin to Mara to learn how to find the hidden vault.

Rest at a campfire to unlock it. Once you have two campfires, resting opens the
fast-travel map. You can also open it with **M** or **Pause → Map / Fast Travel**.
Pick a destination while standing at an unlocked campfire. Travel is free, and
you arrive close enough to travel again without taking another step.

Orrin works on the blade you have equipped. Tempered blades and reinforced
coats wear in combat and can be repaired; base gear never breaks. Equip both
Brineguard pieces for a defense bonus. Land hits with a blade to unlock
Undertow, then hold down and press Attack while grounded. The Tideglass Blade
learns it faster.

After talking to the Pale Court gallery keeper, enter the east door to descend to the
Lower Well. Saga I ends there. Optional lore unlocks a second ending with its
own epilogue. Existing Chapter 4 saves keep their original ledger progress.

## Earlier Pale Court update

- **Chapter 4 opens the coast:** after Vael's final scene, take the east road out of Gloamhold to Lantern Quay. Learn the night-ferry signal, visit the Court's outer gallery, and look for a fresh trace of Seren.
- **New art:** Skarn wields a two-handed axe with chierit's Minotaur animations. His second form wears a tracked bone mask and charges Mirebreaker, a ground slam that sends rocks and mud in both directions. Mourn and Tidemaw have extra costume detail. The house armor is a steel suit on a wooden rack that empties when equipped.
- **Readability and input:** dialogue paginates instead of cutting off long lines. The touch controls sit below the screen on phones. The CRT effect, sound and music can be switched off from Settings; Blood Effects also has a pause-menu switch.
- **Release checks:** `node tools/verify-build.mjs` validates scripts, lore IDs, spawn locations, boss configuration, sprite-sheet frame bounds and runtime asset references. GitHub Pages checks the staged game before uploading it and excludes editable/source packs from the website.

## Combat and accounts

- Bosses, including Nick, the Salt Stag and Ione, reveal a second form at half health. Each boss gets its own visual reveal and sound cue. Skip with the same controls as the first entrance; combat resumes in phase two with a brief grace period.
- Leveling takes more XP, and each level restores some health and stamina instead of refilling both. Existing saves keep their earned levels and stats. Armor still softens boss hits, but direct attacks and hazards cannot be reduced to one damage, and phase-two hits are stronger.
- Skarn, Mourn and Tidemaw use their own pixel art. Both opening moon shots show the fracture, and each outdoor region has its own set of scenery and lighting accents. See `assets/ASSET-CREDITS.txt` for the scenery source.
- Hits on living enemies and the player leave short-lived pixel blood sprays and splashes. Shield blocks and enemies like skeletons and ghosts don't bleed. Switch Blood Effects off in either the title settings or the in-game pause menu.
- Choose **Account → Create Account**, enter an email, password and player name, then follow the email confirmation link before signing in. If an old link failed, try signing in first, then use **Resend confirmation** if your email is still unconfirmed. Guest saves are separate from account saves. Existing cloud saves are read from the same Supabase project.
- If the cloud service cannot load a slot, retry or sign out to play as a guest. The game does not silently replace a cloud slot with a guest save.
- Deployment setup: in the Supabase project's **Authentication → URL Configuration**, set the Site URL and allowed redirect URL to `https://clever.is-local.org/`. The default confirmation email should link to `{{ .ConfirmationURL }}`. Previously sent links retain their original settings.

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
- **Story:** four playable chapters so far.
  - Chapter 1, The Hollow King: follow Dad's trail through the forest to Bram's camp and into the Hollow, talk to witnesses, defeat Grukk, and find Dad.
  - Chapter 2, The Ashen Pass: Dad tells you about the Pale Court and Morwen. Cross the burning mountain road with Wren and face Ashmane, the Pale Mare.
  - Chapter 3, The Moon-Eater: reach Gloamhold, a drowned city in the rain, and fight Vael in the castle quarter.
  - Chapter 4, The Pale Court: convince the night ferryman to answer, cross the eastern sea, and search the outer gallery with Wren.
- **Lore:** talk to witnesses across the game, then reread their stories in the LORE tab. The story follows one timeline:
  - Twenty winters ago, the moon-mage Morwen lost her daughter Lys in the Long Winter. She tried to pull the moon down to make one that never wanes, and the moon cracked. The biggest shard fell in the Hollow (the Moonfall), and Aldric's Silver Watch sealed it away.
  - Twelve winters ago, in the fever winter, the Black Tide drowned Gloamhold. The Pale Court took the city's moon-readers alive, including Rowan's mother Seren.
  - A week before the game starts, goblins led by Grukk dug up the Hollow shard and sold it to the Pale Court's riders. Without the barrow bell to quiet the shard, the wolves in the hills began to walk upright.
- **Side areas (Depths):** four optional areas, each with its own champion boss, intro cinematic, lore, and weapon reward.
  - The Witchmire, off the Woodland: Skarn, the Mire Chief.
  - The Watch Barrows, off the Hollow: Mourn, the Barrow Warden.
  - Cinder Deep, off the Ashen Pass: Ignaroth, the Cinder Wyrm.
  - The Sunken Archive, off Gloamhold: Tidemaw, the Drowned Bell.
- **Things to do along the road:**
  - **Moon shrines:** pray for a random two-minute blessing (speed, damage, defense, luck, or healing). Sometimes the moon sends a trial of elites instead. Shrines rekindle when you rest.
  - **Hunt boards:** find them at the earlier roadside campfires. Take a random bounty and come back to claim coins and a prize.
  - **Moon moths:** 24 to find, with rewards at 6, 12, 18, and 24.
  - **Tess the peddler:** sometimes found on the road, selling relics, tonics, charms, and mystery bundles.
  - **Ambushes:** sometimes spring on the road and leave a chest behind when you win.
- **Areas:** the house, the Woodland and Bram's camp, the Hollow, the Ashen Pass, Gloamhold, Lantern Quay and the Pale Court. Regions have distinct lighting and sound; not every area has a fight.
- **Boss entrances:** each boss gets a cinematic. Letterbox bars slide in and the camera swings to the boss. Grukk smashes the ground and roars, Ashmane gallops in on a trail of blue fire and rears up in a ring of flame, and Vael drops out of the sky and breathes moonfire. Then the boss's name and title burn in above its head. Press E / ✕ to skip.
- **Boss music:** a dramatic entrance theme plays during the cinematic, and each boss has its own battle theme.
- **World map and fast travel:** the MAP tab shows every region and your position. While resting at a campfire, you can pick another fire you have visited to travel there.
- **Enemies:** goblins, goblin brutes and cutthroats, rot shrooms (they leave spore clouds), and flying eyes in the forest. Pale acolytes cast moonfire and barrow shades blink around the Hollow. Ember fiends breathe fire in the pass. Drowned and gazers haunt Gloamhold. Skeletons (they block with a shield) and ghosts in the Hollow. A two-phase ogre boss that sends out shockwaves and calls ghosts when below half HP.
- **Inventory:** full-screen bag with ITEMS / GEAR / STATS / QUEST / LORE / MAP tabs. Each item has an action menu (use, set as quick item, inspect, equip, drop), plus rarity colors, NEW tags, and a rotating inspect view with item lore. Mouse/touch clicks work too.
- **Quick item:** set food or a tonic as the quick item and use it mid-fight without opening the bag.
- **Combat:** tap attack for a 3-hit combo (slash, slash, heavy finisher), attack while sprinting for a dash thrust, or attack in the air for a plunge that slams to the ground with a shockwave. Hold down and attack in the air for a down slash: hitting an enemy or a fireball below you bounces you back up (a Hollow Knight-style pogo), and you can chain bounces. The plunge only triggers when you are well above the ground. Hold attack to charge the Moonblade, a blue power slash that sends out a crescent wave. Use the upper slash to hit enemies above you, and the dodge roll to pass through attacks. A roll timed just before a hit is a perfect dodge. Weapons (Ember Edge, Moonsilver) can be equipped from the bag. Hits have hit-pause, knockback, sparks, damage numbers, and XP/level-ups.
- **Sound and music:** sampled sword, footstep, monster, and UI sound effects, plus music for each area that crossfades between scenes, with a boss theme.
- **Saving:** browser save slots; optional account sign-in enables cloud saves.
- **Device support:** keyboard controls and on-screen touch controls for phones and tablets.

## Controls

On phones and tablets, slide one thumb across the direction pad and use the other to jump or attack. The touch controls hide when you use a keyboard or mouse or connect a controller. After disconnecting the controller, tap the game to return to touch controls.

| Action | Keyboard | PS5 controller | Touch button |
|---|---|---|---|
| Move | WASD or Arrow keys | Left stick or D-pad | Direction pad |
| Jump (outdoors) | Space / W / Up | ✕ Cross | JUMP |
| Attack | J / F | □ Square (or R2) | ATK |
| Moonblade (blue power slash) | Hold J / F, then release | Hold □, then release | Hold ATK, then release |
| Upper slash | U (or Up + J) | Up + □ | — |
| Down slash / pogo (in the air) | Down + J | Down + □ | — |
| Dodge roll | K / L | ○ Circle | ROLL |
| Plunge attack | J while in the air | □ while in the air | — |
| Quick item (outdoors) | H | Touchpad | ITEM |
| Talk / read / rest / shop | E | ✕ Cross | USE |
| Interact / confirm | E / Enter | ✕ Cross | USE |
| Back / close | Escape | ○ Circle | — |
| Run | Hold Shift | Hold L1, R1, or L2 | RUN |
| Inventory | I | △ Triangle | BAG |
| Inventory: select / actions / switch tab | Arrows / E / Q, R, Tab | D-pad / ✕ / L1, R1 | tap |
| Inventory: back out of a menu | Escape / X / Backspace | ○ Circle | — |
| Stats | C | Touchpad (indoors) or Create | BAG → STATS |
| Pause | Escape / P | Options | PAUSE |
| Skip opening cinematic | Any key | Any button | Tap |

In the forest, ✕ interacts when a prompt is shown (for example, returning home) and jumps otherwise. On-screen prompts switch to PlayStation buttons while a controller is in use, and the controller rumbles on hits. Both the standard browser layout and Firefox's raw DualSense layout are supported.

## Play and run locally

No build step is required.

1. Download or clone this repository.
2. Open `index.html` in a modern browser, or serve the folder with a simple local web server.
3. Start a new save slot to see the intro. Existing saves continue from their saved location.

Some browser features, audio playback, and account/cloud functions may behave differently when opening the file directly; using a local web server is recommended for development.

On ChromeOS and other browsers, guest mode loads the game from the same site without contacting the GitHub API or the account server. If your browser disallows website storage, guest saves last only until you close or reload the page. The pre-alpha access code is separate. If a device or network policy blocks the game site itself, ask the administrator whether it can be approved.

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
