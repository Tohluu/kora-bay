# Kora Bay

A browser life simulation set in an original fictional coastal city. Built with HTML, CSS, and JavaScript. The optional player-phone server uses Node.js built-ins; no npm installation or build step is needed.

## Play locally

Open `dist/index.html`, or run `python -m http.server 4173 --directory dist` from this folder and visit http://localhost:4173.

For real player contacts, text messages, and voice-call setup, double-click **Play Online.cmd**, or run `npm start`. Use the address printed by the server. Keep the server window open while playing. This launcher runs a local server; it does not publish the game on the internet.

## First chapter

Select a location on the isometric map or use the location cards, then choose **Walk here**. Work at the market or café, learn skills at the library, buy meals, rest at home, and meet people at the waterfront. Save 5,000 fictional koras (₭) to move into a studio. Rent comes due on day 8, then every seven days. Time advances only with actions.

Progress saves in this browser using localStorage. The optional Bayline phone adds player accounts, contacts, messages, and voice calls; the single-player city and apartment are still local to your browser, without shared world simulation or server-side game saves. There is no real-money currency. The name button customizes your character name; the journal records milestones. Map supports keyboard left/right selection and Enter to travel. Reduced-motion preferences skip walking animations.

This is an early playable prototype with six venues, one housing upgrade, and five skill levels. The artwork is drawn in canvas and the city is fictional.

## Furnish your home

Choose **My apartment** in the sidebar to enter your home, then **Arrange furniture** to decorate. **Furnish my place** at your current home and the Little Home phone app also open the furniture editor. You can decorate your shared room immediately; the studio has a larger floor plan. Buy a bed, sofa, desk, chair, plant, lamp, bookcase, or coffee table from the shop, then click an empty floor square. Select a placed item to move it, rotate it, or put it in storage. Furniture cannot overlap, extend outside the room, or block the front door. Choose a floor colour using the swatches. Purchases use game money; moving, rotating, and storing are free. Furniture, storage, and colour save automatically and carry over when you move to the studio. A starter bed is included for new and existing saves.

## Activities you can see

Choose **My apartment** or **Enter my home** to walk inside. The home scene shows your placed furniture, with a window bench, kitchenette, and shower. At Driftwood Walk, choose **Explore the waterfront** or **Go swimming**. At the market, café, or library, choose **Go inside**. Existing sleep, food, study, and work buttons now open the corresponding animated activity scene too.

- **At home:** sit on a bench, chair, or sofa; lie down and sleep or nap; cook, eat bread and tea, shower, read, tidy, or dance.
- **At the waterfront:** swim with strokes and ripples, cast a fishing line, relax on a lounger, jog, stretch, walk, or sit on a bench.
- **At the café:** sit down for a meal, read, rest, or make coffees during a paid shift.
- **At the library:** read, sit, or study to improve your skills.
- **At the market:** carry crates and stock the stall during a paid shift, or sit down for a meal.

Click the floor to move or an object to use it. Arrow keys or WASD move; **E** uses something nearby; **Space** stands up or stops. Touch movement buttons and zoom controls are provided. Furniture blocks walking routes, and your character walks over before using an object. The camera follows your character when zoomed in. A communal bench is available immediately, even before you buy seating.

An activity animation plays for about six seconds after arrival, then applies its game time, costs, and needs effects exactly once. The character can keep resting, swimming, or enjoying the completed pose without repeatedly receiving rewards. **Skip animation** finishes immediately; **Stand up / stop** cancels an unfinished activity without its cost or reward. Stopping in the water swims back to shore. Leaving a scene or importing a story cancels unfinished activity sessions. Completed activity counts save with your story.

Cooking costs ₭60 and restores fullness. Bread and tea remain free. Swimming requires 15 energy and 10 fullness; work shifts and studying keep their existing requirements and pay. Reduced-motion preferences use still activity poses while movement and controls remain available. The animation scenes are an illustrated 2D prototype, not a 3D world or a shared multiplayer interior.

## Meet the neighbours

Ada, Tobi, Nia, and Sami walk between venues, pause at their destinations, and change their plans as game time advances. They wave and greet you when you get close. Click a resident on the map or choose their card below the map to walk over and talk. Ask about the city, work, or home. They remember meeting you and become more familiar as your friendship grows. Conversations take ten game minutes; friendship and mood rewards are available once per hour of game time for each resident. These are authored characters with scripted dialogue.

Reduced-motion settings disable continuous ambient walking but preserve conversations, greetings, and reactions to changes in game time. Relationships and furniture extend the original save format, so existing stories keep their balance, day, skills, and home.

## Checks

Run `npm test` to check the game rules, furniture, save migration, NPC movement, two-user phone API, persistent messaging, call signalling, simulated browser-phone interaction, and activity scenes. Scene tests cover movement, furniture, swimming and shore return, home/work/study activities, costs, cancellation, and single completion. Tests use disposable accounts and do not contact real players. Game and client tests use DOM/canvas/media stubs; real microphone audio and visual layout still need browser testing.

## Bayline: your player phone

1. Start **Play Online.cmd**. In the browser, choose **My phone → Contacts**.
2. Create a phone account with a username, display name, and password. No email or real telephone number is used. There is no password recovery in this prototype.
3. Test with a second player in a private/incognito browser window at the same server address. Separate ordinary tabs share the same phone sign-in cookie.
4. Share the contact code shown on each phone. Enter your friend’s code and send a request. They must accept it.
5. Open the accepted contact to send text messages. When they are online, tap the phone icon to call. The other player chooses **Answer** or **Decline**.
6. Allow microphone access when making or answering a call. You can mute, hang up, or put the phone away and continue playing. End the call to release the microphone.

Only accepted contacts can message and call. A player can block a contact from their conversation. The last 100 messages per conversation persist on the server, along with phone accounts and contacts. Call media travels through WebRTC and is not recorded by this application. Call signalling is temporary and disappears on restart. Browser/OS microphone permissions, HTTPS or localhost, and a viable network route are required for real audio.

Phone users are real accounts on the same server. The four authored city residents remain separate and are not listed in the player phone. This version does not sync players’ physical movement into a shared city.

### Phone applications

**My phone** now opens a home screen with ten app icons and a wallet shortcut. The **Home** button at the bottom returns to the app grid.

- **Bay Maps:** See your location and walk to any of the six city venues.
- **Bay Bank:** Check your game balance, weekly rent, next rent day, studio savings, and money milestones from your journal.
- **Daywork:** Pick up a market or café shift using the existing energy, fullness, time, and pay rules. If you are elsewhere, the app takes you to work using your selected transport before starting the shift. Visit the library to improve your pay.
- **Bay Rides:** Buy a bicycle, motorbike, or car, choose your transport, and refuel your motor vehicles.
- **Little Home:** Buy furniture with game money into your apartment storage, then open the room editor to place it.
- **Notes:** Write up to 4,000 characters, saved automatically with your browser story and included in story export/import.
- **Messages:** Browse conversations with accepted player contacts and open a message thread.
- **Calls, Contacts, Settings:** Reach the existing voice-call controls, contact requests, account settings, and story transfer tools.

Maps, banking, jobs, vehicles, furniture shopping, notes, and story settings work in the file-based game without a phone account. Player messages, contacts, and calls still require the phone server and sign-in. Existing game saves remain compatible.

### Cars and bikes

Open **My phone → Bay Rides**, or click the transport badge on the city map. Buying a ride selects it immediately. Choose a destination on the city map or in Bay Maps to use it; travel is animated along a road route, with a short walk to and from the parked vehicle. You can switch between owned rides or walking at any stop. This is destination-based travel, rather than manual steering.

| Transport | Purchase price | Game minutes per trip | Energy used | Fuel used |
| --- | ---: | ---: | ---: | ---: |
| On foot | Free | 15 | 2 | None |
| Coastline Bicycle | ₭900 | 8 | 4 | None |
| Sunbird Motorbike | ₭3,200 | 5 | 1 | 4% |
| Kora Compact car | ₭8,500 | 4 | 0 | 6% |

Motor vehicles start with a full tank. In Bay Rides, add up to 25% fuel per top-up: ₭2 per percentage point for the motorbike and ₭3 for the car. A nearly full tank only charges for the missing fuel. If there is not enough fuel for a trip, the player walks that trip without consuming fuel. The selected vehicle stays in your garage ready to refuel.

Bay Maps shows your actual selected transport’s trip time, and Daywork uses the same commute time and energy costs before a shift. Ownership, selection, and fuel save with the browser story and transfer through story export/import. Existing saves start on foot with an empty garage; no previous progress is removed. New-game reset also clears the garage.

### Keep your existing story

`file://` and `http://localhost` use different browser saves. In the original file-based game, open **My phone → Move my saved story → Download saved story**. Start the server version, open **My phone → Settings**, and import that JSON file. This transfers the apartment, furniture, money, and NPC friendships without uploading your game save to the phone server. You can export/import in the other direction too.

### Online hosting

See [DEPLOYMENT.md](DEPLOYMENT.md). The Node server must be deployed as a running service with persistent storage; uploading only `dist/` to static hosting does not enable player connections. Internet voice calls need HTTPS and may need a TURN relay for players on different networks. This is an invite-only prototype, with one Node process and file-based storage, not a production-scale multiplayer service.
