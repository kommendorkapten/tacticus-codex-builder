# Tacticus Character Database

A static website that displays Warhammer 40,000: Tacticus character data in a sortable, interactive table format.

## Features

- **Dynamic Data Loading**: Character data is loaded from `data/units.json` via JavaScript fetch API
- **Sortable Columns**: Click on column headers to sort by:
  - Name
  - Faction
  - Alliance (Grand Alliance)
- **Rich Data Display**:
  - Character portraits
  - Damage types with color-coded badges
  - Character traits with color-coded badges
  - Stats displayed in a grid format
  - Alliance information with themed styling
- **Responsive Design**: Mobile-friendly layout that adapts to different screen sizes
- **Modern UI**: Gradient backgrounds, smooth animations, and hover effects

## File Structure

```
builder/
├── index.html          # Main HTML file
├── styles.css          # Styling and layout
├── script.js           # JavaScript logic for data loading and sorting
├── data/
│   └── units.json      # Character data source
└── README.md           # This file
```

## How to Use

### Local Development

1. Open the project directory in your terminal
2. Start a local web server (required for fetch API to work):
   ```bash
   # Using Python 3
   python3 -m http.server 8000
   
   # Or using Python 2
   python -m SimpleHTTPServer 8000
   
   # Or using Node.js (if you have http-server installed)
   npx http-server -p 8000
   ```
3. Open your browser and navigate to `http://localhost:8000`

### Sorting

- Click on any column header with an arrow indicator (Name, Faction, Alliance)
- First click sorts ascending (A-Z)
- Second click sorts descending (Z-A)
- Click another column to sort by that column

## Data Structure

The website expects character data in the following JSON format:

```json
{
  "name": "Character Name",
  "portrait_url": "https://...",
  "faction": "Faction Name",
  "damage_types": ["Type1", "Type2"],
  "traits": ["Trait1", "Trait2"],
  "stats": {
    "movement": 3,
    "melee": 2,
    "range": 2,
    "distance": 2
  },
  "grand_alliance": "Imperial"
}
```

## Future Enhancements

As noted in the requirements, this static site is designed to be easily upgraded to a dynamic, data-driven application in future iterations. The current architecture separates:

- Data (JSON file)
- Presentation (HTML/CSS)
- Logic (JavaScript)

This makes it straightforward to replace the static JSON file with API calls to a backend service.

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Uses CSS Grid and Flexbox for layout

## Cache Busting

To ensure users get the latest version after deployments:

1. **Version Query Parameters**: CSS and JS files include `?v=X.X.X` parameters
2. **Update Version Numbers**: When deploying changes, increment the version in `index.html`:
   ```html
   <link rel="stylesheet" href="styles.css?v=1.0.1">
   <script src="script.js?v=1.0.1"></script>
   ```
3. **Meta Tags**: Cache control meta tags force browsers to revalidate

### Quick Version Update

Before deploying, search for `?v=` in `index.html` and increment the version number (e.g., 1.0.0 → 1.0.1).

## License

This project is part of the Tacticus Builder application.
