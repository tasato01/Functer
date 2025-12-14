# Functer

A 2D action puzzle game where you control a character by editing mathematical functions.

## Features

- **Math-based Gameplay**: Write functions `f(x)` to control your character and `g(x)` to manipulate the stage.
- **Level Editor**: sophisticated level editor with real-time graph rendering.
  - **Constraints**: Add mathematical constraints (inequalities) to challenge the player.
  - **Shapes**: Add circular and rectangular obstacles/goals.
  - **Waypoints**: Set intermediate targets.
- **Live Preview**: Instantly test your level with the integrated DEMOPLAY mode.

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS

## Getting Started

1. `npm install`
2. `npm run dev`

## Project Structure

- `src/core/math`: Mathematical engine for function parsing and evaluation.
- `src/components/game`: Game canvas and rendering logic.
- `src/pages/EditPage.tsx`: The main level editor interface. (Refactoring in progress)
