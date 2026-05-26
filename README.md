<div align="center">

# Wasll Journey

**Map your political history.**

[![Website](https://img.shields.io/badge/website-journey.wasll.tn-D01020?style=flat-square)](https://journey.wasll.tn)
[![Countries](https://img.shields.io/badge/countries-FR%20%7C%20UK%20%7C%20TN-4A90D9?style=flat-square)](#)

<br/>
</div>

---

## What it is

You click on a logo, it lands on a step. Steps get taller left to right. You add dates, reorder steps, stack multiple logos on one step for coalitions or overlapping memberships, and export a PNG when you're done.

It runs entirely in the browser at [journey.wasll.tn](https://journey.wasll.tn).

## Features

- 🇫🇷 🇬🇧 🇹🇳 &nbsp; Three countries, covering parties, unions, coalitions, and movements
- Multi-logo steps for overlapping affiliations
- Editable dates per step
- Drag-to-reorder + 30-level undo
- Export as PNG (2× resolution)
- Import your own logos

## Contributing logos

Drop the image file into `assets/[COUNTRY_CODE]/` and add the filename to `js/data.js`:

```js
"FR": {
    flag: "fr",
    files: ["yourorg.png", ...]
}
```

SVG and PNG both work. New countries follow the same pattern, four lines in `data.js` plus the logo folder.
