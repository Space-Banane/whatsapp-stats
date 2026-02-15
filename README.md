# WhatsApp Stats 📊

Analyze your WhatsApp chat statistics by uploading a Chat Export. Ever wondered who sends the most messages or what your "Yap Level" is? This tool crunches the numbers and gives you the insights you never knew you needed.

![Preview](https://shx.reversed.dev/u/KGVH6l.png)

## ✨ Features

- **Chat Analysis**: Detailed breakdown of message counts, word counts, and media usage.
- **Top Yappers**: See who dominates the conversation.
- **Visual Charts**: Interactive graphs powered by [ApexCharts](https://apexcharts.com/).
- **Yap Level Evaluation**: Are you a "Social Butterfly" or an "Ultimate Message Maven"?
- **Privacy Focused**: Processing happens locally (via your own hosted instance).
- **Smooth UI**: Modern interface built with [Tailwind CSS](https://tailwindcss.com/) and [particles.js](https://vincentgarreau.com/particles.js/).

## 🚀 Getting Started

### Prerequisites

- [Docker](https://www.docker.com/)

### Running with Docker

The easiest way to get started is using Docker Compose:

```bash
docker compose up -d
```

The application will be available at `http://localhost:6767`.

### Local Development

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start the development server:**
   ```bash
   pnpm dev
   ```

The server will start on port `4545` by default (as configured in [src/index.ts](src/index.ts)).

## 📁 Project Structure

- `content/`: Static frontend files (HTML, JS, CSS, assets).
- `src/`: Backend source code (TypeScript).
- `docker-compose.yml`: Docker configuration.
- `tailwind.config.js`: Tailwind CSS configuration.

## 📝 Usage

1. Open WhatsApp on your Android device.
2. Go to the chat you want to analyze.
3. Tap the three dots (Menu) -> More -> Export chat.
4. Select **Without Media**.
5. Upload the resulting `.zip` file to the app.
6. Click **Crunch it 😋** and enjoy your stats!

> NOTE:
> Currently, only English chat exports from Android devices are supported. Feature availability may vary depending on your OS and WhatsApp version. (i don't have an iPhone, nor would i be able to test other languages other than german, which worked fine.)

## ⚖️ License

MIT - No Attribution (MIT-0)
