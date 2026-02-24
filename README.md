# SounnyPDF Editor

A clean, modern, and privacy-first in-browser PDF editor. 

SounnyPDF runs 100% locally in your web browser. No backend servers, no file uploads to third parties, and no data tracking. It simply leverages the power of HTML5 and modern JavaScript (via Mozilla's `pdf.js` and `pdf-lib`) to securely parse, render, and manipulate PDFs right on your machine.

## Features

- **Privacy First**: Everything stays on your machine.
- **Type Over PDFs**: Add text blocks anywhere on a document. Easily set your own font size using the A- and A+ toolbar options.
- **Form Flattening**: Allows you to type natively over interactive fillable forms by flattening existing fields so nothing blocks your edits.
- **Symbols**: Need to fill out checkboxes or multiple choice bubbles? Add Checks (✔), X's (✗), and Circles (⬤) with one click.
- **Signatures**: A built-in modal provides an electronic signature canvas. Draw your signature, save it, and scale/drag it anywhere onto the document.
- **Multi-page Support**: The editor dynamically detects which page you are looking at and automatically attaches your text or signatures to the correct page when exporting.

## Tech Stack

SounnyPDF is intentionally built without heavy Node frameworks or bundlers.
- **HTML/CSS/JS** - Pure Web Standards.
- **Hosted seamlessly on GitHub Pages.**

### Dependencies
Dependencies are safely pulled from reliable global CDNs to ensure 100% serverless operation.
- **[pdf.js](https://mozilla.github.io/pdf.js/)** (v3.11.174 via cdnjs) - Handles rendering the PDF to canvas blocks.
- **[pdf-lib](https://pdf-lib.js.org/)** (v1.17.1 via unpkg) - Handles mutating the PDF, rendering your updated coordinates, embedding base64 image data for signatures, and triggering the final binary download.

## Local Development
Since there are no build steps, just clone the repository and open `index.html` in your favorite web browser!
