# Multiplayer phone deployment

The current Sites project has never been published. Its `.openai/hosting.json` describes static files only. Static Sites publication alone cannot run the Node phone API; do not claim the phone is online after a static upload.

The application is ready to run as a single Node.js 20+ service. `package.json` provides `npm start`, and no package installation is required. A hosting integration is still needed to deploy and verify an online version. Railway was offered in the current conversation but has not been confirmed connected. No billable hosting resources have been provisioned.

## Service requirements

- Serve this checkout using `node server.cjs` behind HTTPS. It serves both `dist/` and `/api/*` on the same origin.
- Set the host-provided `PORT`. A configured `PORT` binds the process on `0.0.0.0`; local launches otherwise bind only `127.0.0.1`.
- Set `KORA_SECURE_COOKIE=1` behind HTTPS and `KORA_ORIGIN` to the exact public origin, for example `https://your-game.example`.
- Mount a persistent volume and set `KORA_DATA_DIR` to its path. Accounts, contacts, password hashes, session hashes, and recent messages are stored in `phone.json` inside this directory. This directory is runtime data, not a source artifact. `.data/` is ignored by Git and excluded from the downloadable package.
- Use one process and one replica. This prototype uses an in-memory call registry and atomic local JSON replacement, so it is not designed for several replicas or serverless restarts. Back up persistent data using the hosting service.
- Use `/api/health` for health checks.
- Configure `KORA_ICE_SERVERS` as a JSON array of RTC ICE servers. The default uses the STUN server shown in the WebRTC getting-started guide. A TURN service is needed where direct peer connections fail. Keep provider management credentials out of this file. The ICE credentials required by clients are returned only after phone sign-in; use scoped/short-lived relay credentials for a production service.

The current phone is for private testing: no account recovery, public matchmaking, global moderation, shared city simulation, or production account administration is implemented. These are separate follow-up work before a public launch.

## Verification after deployment

1. Verify the public HTTPS address and health check.
2. Open two isolated browser sessions on two devices, create test accounts, and exchange contact codes.
3. Check request acceptance, messages in both directions, online/offline presence, blocking, and session sign-out.
4. On different networks, make and answer a voice call. Check audio in both directions, mute, hang-up, denied microphone permission, and dropped connections. Confirm microphone indicators stop after hang-up.
5. Restart the service and confirm accounts, contacts, and recent messages persist.

Automated tests passed locally, using real HTTP APIs and simulated browser media. There is no verified internet deployment or real-device audio test yet.

Technical references: [WebRTC peer connections and signalling](https://webrtc.org/getting-started/peer-connections), [browser microphone permissions and secure contexts](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).
