# Vault Structure

Abyssal Vault separates frequently captured information, structured personal databases, long-term knowledge areas, system logic, and archives.

```text
Abyssal-Vault/
├── 00_Capture/
│   ├── 01_Journal/
│   ├── 02_Cornell/
│   ├── 03_Zettelkasten/
│   └── 09_Clippings/
├── 10_Projects/
├── 20_Personal_Life/
│   ├── 22_Finance/
│   ├── 23_Places/
│   ├── 24_Book_Tracker/
│   ├── 25_Media_Tracker/
│   ├── 26_Food_&_Drinks/
│   ├── 27_Game_Tracker/
│   └── 33_Bodybuilding/
├── 40_Academics/
├── 60_Digital_Library/
├── 70_Interests_&_Research/
├── 90_System/
│   ├── 91_Templates/
│   ├── 92_Scripts/
│   ├── 93_Configuration/
│   ├── 95_Media_Assets/
│   ├── 96_Auto_Attachments/
│   ├── 97_Daily_Schedule/
│   └── 98_Homepage/
└── 99_Archives/
```

## Top-level directories

| Directory | Role |
|---|---|
| `00_Capture` | High-frequency entry point for journals, Cornell notes, Zettelkasten notes, and clippings. |
| `10_Projects` | Workspace for project-specific notes and material. |
| `20_Personal_Life` | Structured personal databases and trackers. |
| `40_Academics` | Long-term academic material. |
| `60_Digital_Library` | Digital resources and reference material. |
| `70_Interests_&_Research` | Focused research and personal interests. |
| `90_System` | Templates, scripts, configuration, local media, recurring schedules, and Homepage logic. |
| `99_Archives` | Inactive material separated from active systems. |

## Operational center

Most automation is concentrated in three areas:

- `00_Capture` — note-generation workflows.
- `20_Personal_Life` — structured record systems.
- `90_System` — the runtime and configuration layer.

The remaining top-level directories are intentionally extensible content areas and do not need their own automation to remain useful.