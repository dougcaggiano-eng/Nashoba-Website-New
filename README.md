# Nashoba Power Wash website

Static site: `index.html`, `styles.css`, `script.js`, `assets/`.

- **Hero:** the "dirty to clean" video plays as you scroll. It's drawn on a canvas from
  396 frames in `assets/frames/` (33s at 12fps). The dots on the right jump to each service.
- **Services:** always one click away: the "Services" dropdown in the header, the chip bar under
  the hero, and the bottom bar on phones.
- **Quote form:** checks the fields and shows a thank-you message, but it isn't connected to
  anything yet. Hook it up to a form service (Formspree, Netlify Forms, Wix Forms) in `script.js`.

To preview it locally: `python3 -m http.server` and then open http://localhost:8000
