# OSS Browser

A beautiful, modern, fully customizable open-source browser built on Chromium and Electron, featuring side-mounted tabs inspired by Arc.

## Features

- Sleek, modern UI with vertical tabs on the left side
- Full customization (themes, layouts, extensions)
- Performance and compatibility via Chromium
- Open-source ethos with community contributions

## Tech Stack

- **Core Engine**: Chromium (via Electron)
- **Framework**: Electron (for desktop app scaffolding)
- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Node.js (via Electron's main process)
- **Build Tools**: bun, Webpack (for bundling)
- **License**: MIT (open-source)

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- [bun](https://bun.sh/) package manager

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/nworbdier/oss-browser.git
   cd oss-browser
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Start the development server:
   ```bash
   bun dev
   ```

## Building for Production

To build the application for production:

```bash
bun run build
```

This will create distributable packages in the `dist` directory.

## Project Structure

```
oss-browser/
├── src/
│   ├── main/       # Electron main process files
│   │   ├── main.js
│   ├── renderer/   # UI and renderer process files
│   │   ├── index.html
│   │   ├── styles.css
│   │   ├── app.js
├── package.json
├── README.md
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
