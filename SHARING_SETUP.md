## Localhost mode

Use this for your own machine:

```powershell
cd d:\loadshedding\loadshedding-tracker\backend
npm run dev
```

```powershell
cd d:\loadshedding\loadshedding-tracker\Frontend
npm run dev
```

- Frontend runs in `localhost` mode.
- It reads [Frontend/.env.localhost](/d:/loadshedding/loadshedding-tracker/Frontend/.env.localhost).
- API target is `http://localhost:5000`.

## Share mode

Use this when you want to send the app to a friend:

1. Start backend locally.

```powershell
cd d:\loadshedding\loadshedding-tracker\backend
npm run dev
```

2. Expose backend with your tunnel tool and copy the HTTPS URL.

Examples:

```powershell
lt --port 5000
```

```powershell
ssh -p 443 -R0:localhost:5000 a.pinggy.io
```

3. Put that backend HTTPS URL in [Frontend/.env.share](/d:/loadshedding/loadshedding-tracker/Frontend/.env.share) as `VITE_API_URL`.

Example:

```env
VITE_API_URL=https://your-backend-tunnel.example
```

4. Start the frontend in share mode.

```powershell
cd d:\loadshedding\loadshedding-tracker\Frontend
npm run dev:share
```

5. Expose the frontend with ngrok.

```powershell
ngrok http 8081
```

6. Share the ngrok frontend URL with your friend.

## Important

- Restart the backend after changing [backend/server.js](/d:/loadshedding/loadshedding-tracker/backend/server.js).
- Restart the frontend after changing [Frontend/.env.share](/d:/loadshedding/loadshedding-tracker/Frontend/.env.share).
- Keep localhost use on `npm run dev`.
- Keep shared use on `npm run dev:share`.
