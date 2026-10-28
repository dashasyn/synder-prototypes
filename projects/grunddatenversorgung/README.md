# Grunddatenversorgung - Transit Data Manager

**Live URL:** https://dashasyn.github.io/synder-prototypes/projects/grunddatenversorgung/

## Overview
A prototype for a Transport Information Management System built for Synder's transit data management needs.

## Screens

### 1. Fahrplansuche (Schedule Search) - First Page
- Search filters: vehicle type, date range
- Data table with status badges (Abgeschlossen/Unvollständig/Fehler)
- Click any row → navigates to Export Overview

### 2. Export Overview
- Warning banner for incomplete configurations
- Progress bar showing completion percentage
- Station table with Audio/Display status
- Click any row → navigates to Station Configuration

### 3. Station Configuration
Two tabs with full functionality:

#### Basic Rules Tab
- Left sidebar: Rule groups (Standard, Express, Nighttime)
- Filter row: Direction, Line, Driving window, Vehicle type
- Rules table: Was/When/Timing columns
- Actions: Manage Placeholders, Delete, Save, New Rule

#### Stations Tab
Three-column layout:
- **Announcements**: STATION, NEXT STOP, VIA STATIONS with audio players
- **Special announcements**: GENERALLY with valid dates
- **Display**: IN FRONT, PAGES with placeholder previews

### 4. Route Planner
- Left panel: Route accordion with station list
- Right panel: Station details with weekday toggles
- Actions: Add new route, select stations

## Theme
- White background with blue buttons (#0053CC)
- Clean, modern interface
- All buttons functional (alerts for demo)

## Backup
Current version backed up as: `index-backup-20260505-1239.html`

## Last Updated
2025-05-05