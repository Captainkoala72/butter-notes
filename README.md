# Butter Notes

A small, sunny notebook for quick thoughts. Built with plain HTML, CSS, and JavaScript: no framework, build step, account, or backend required.

## Features

- Separate pages with titles and instant search
- Bold, italic, underline, four font sizes, five ink colors, and bullet lists
- Automatic saving, a manual save button, and word count
- Download formatted notes as standalone HTML files
- Delete confirmation and a 12-second undo window
- Focus mode, mobile layout, keyboard shortcuts, and reduced-motion support
- Dark mode toggle in the top bar, with a remembered browser preference

Notes are stored in **localStorage in the current browser and origin**. They are not synced across devices, sent to GitHub, or backed up to a server. Clearing browser/site data removes them; use Download note for copies. Private-browsing storage may be temporary. Storage failures show an error and preserve the current draft in memory so it can be downloaded.

## Run

Serve this folder using any static server, for example `npx serve .`. There is no build command. Google Fonts are optional; system font fallbacks work when unavailable. Rich text uses the browser's native contenteditable editing and execCommand for native selection and undo behavior. Pasted content is plain text; restored and exported markup is allowlisted.

## Shortcuts

| Action | Shortcut |
| --- | --- |
| Save | Ctrl/Cmd + S |
| New note | Alt + N |
| Find a note (outside an editor) | / |
| Bold / italic / underline | Ctrl/Cmd + B / I / U |
| Undo typing | Ctrl/Cmd + Z |
| Leave focus mode / close sidebar | Escape |

## GitHub Pages

In repository **Settings → Pages**, choose **Deploy from a branch**, select **main** and **/(root)**, then save. The site is served directly from these static files. `.nojekyll` disables Jekyll processing.
