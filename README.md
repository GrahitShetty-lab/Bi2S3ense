# Bi₂S₃ense

Bi₂S₃ense is a responsive web application for industrial workers to monitor hydrogen sulfide (H₂S) exposure via colorimetric (Bi₂S₃) badges. It includes a mobile-first worker interface for scanning and capturing badge photos, and a desktop-optimized Supervisor Dashboard for tracking exposure trends, safety alerts, and reports.

## Technical Approach

The prototype simulates a comprehensive pipeline for analyzing colorimetric badges:
- **Passive Bi₂S₃ colorimetric H₂S strip:** Reacts to H₂S gas by changing color.
- **Traceability:** QR codes link badges to specific workers and calibration profiles.
- **Guided Capture:** In-app smartphone framing, lighting, and shadow correction tips.
- **Analysis Pipeline:**
  1. Detect sensing strip + reference color scale.
  2. RGB Color Extraction.
  3. RGB → LAB conversion.
  4. ΔE color comparison.
  5. Lighting/shadow correction & Temperature/humidity compensation.
  6. Laboratory calibration model to estimate cumulative exposure.
- **Result:** Estimated cumulative H₂S exposure (ppm·h) with confidence scores.

*(Note: Data and analysis are simulated for this prototype).*

## Features

- **Worker Interface:** Mobile-first flow for registering badges, scanning QR codes, capturing strip photos, and viewing exposure history.
- **Supervisor Dashboard:** Responsive layout featuring stat cards, worker tables, real-time alerts, and exposure trends.
- **Cross-Platform:** Works on mobile and desktop without layout overlap (375px, 768px, 1440px).

## Setup & Demo

```bash
# Install dependencies
pnpm install

# Run the development server
pnpm dev
```

Visit `http://localhost:5173` (or the port specified by Vite) to view the application.

## Structure

- `src/App.tsx`: Worker mobile application.
- `src/supervisor.tsx`: Supervisor dashboard.
- `src/main.tsx`: App entry point.
- `src/index.css`: Global styles (Tailwind CSS v4).

## Configuration
See `.env.example` for environment variable templates.
## COSTING
<img width="1024" height="937" alt="image" src="https://github.com/user-attachments/assets/ceb17bbd-6c1a-4ee9-8eb0-33c5f5e64a1e" />


