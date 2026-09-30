# WeatherGPT frontend

Original React + Vite client for the WeatherGPT SIH 2026 project.

- Entry: `src/main.jsx` → `src/App.jsx`
- Styling: Tailwind CSS plus the project's own `src/index.css` design tokens
- Map: Leaflet via `react-leaflet` (loaded in a lazy chunk)
- Chat markdown: `react-markdown` + `remark-gfm`
- Voice: browser Web Speech API wrapper in `src/services/voice.js`

Run with `npm install` then `npm run dev`. Point at a local backend with
`VITE_API_URL=http://127.0.0.1:8000/api` (see the root `.env.example`).
