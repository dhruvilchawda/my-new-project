# ClearDay ✳

A responsive, dark-themed **productivity dashboard** built with HTML, CSS, and vanilla JavaScript. Track what matters, build a daily habit, and run focused work sessions—without creating an account or installing packages.

![License](https://img.shields.io/badge/license-MIT-lavender) ![Built with](https://img.shields.io/badge/built%20with-HTML%20%2B%20CSS%20%2B%20JavaScript-b5a1ff)

## Features

- **Task manager:** add, complete, and delete tasks with high/medium/low priority and optional due dates.
- **Search and filters:** find tasks instantly, or switch between All, Active, and Done.
- **Live progress:** completion statistics and a visual progress ring update automatically.
- **Pomodoro timer:** 25-minute focus sessions and 5-minute breaks, with start, pause, and reset controls.
- **Persistent data:** tasks are saved in your browser's local storage.
- **Responsive layout:** works on desktop, tablet, and phone.
- **Zero dependencies:** no Node installation, API key, backend, or build step required.

## Run locally

1. Clone this repository (or download it as a ZIP).
2. Open **index.html** in a modern browser.

You can also use any static server, for example:

    python -m http.server 8000

Then visit **http://localhost:8000**.

## Project structure

    .
    ├── index.html       # Page structure, task modal, dashboard
    ├── styles.css       # Responsive design and visual system
    ├── script.js        # Tasks, localStorage, statistics, timer
    ├── favicon.svg      # Custom icon
    ├── .gitignore
    ├── LICENSE
    └── README.md

## How it works

The app starts with three sample tasks to demonstrate the interface. You can delete them and create your own. Task data stays in the current browser and is **not** sent to a server. Clearing site storage resets the data.

The timer counts down using an absolute target timestamp so switching tabs does not cause it to drift. Keeping the page open is required for the session-complete message; this is not a background notification service.

## GitHub Pages (optional)

Because the app is fully static, you can deploy it with GitHub Pages. In the repository, open **Settings → Pages**, choose **Deploy from a branch**, select the default branch and root directory, then save. GitHub will provide your public website URL after deployment.

## Built with

Semantic HTML5, CSS Grid/Flexbox, and modern JavaScript (no framework).

## License

MIT — see [LICENSE](LICENSE).
