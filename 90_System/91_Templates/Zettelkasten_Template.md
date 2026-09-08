<%*
let zid = tp.date.now("YYYYMMDDHHmmss");
let noteTitle = await tp.system.prompt("Enter Note Title:");

if (noteTitle) {
    await tp.file.rename(`${zid} - ${noteTitle}`);
} else {
    await tp.file.rename(`${zid} - ${tp.file.title}`);
}
let noteType = await tp.system.suggester(
    ["1. Permanent Note (Synthesized, standalone atomic idea)",
    "2. Literature Note (Summary or thought from a source)",
    "3. Fleeting Note (Raw, temporary scratchpad idea)"],
    ["Permanent", "Literature", "Fleeting"]
);
if (!noteType) noteType = "Fleeting";
-%>
---
id: <% zid %>
date: <% tp.date.now("YYYY-MM-DD") %>
type: <% noteType %>
tags:
  - zettelkasten
aliases: []
---

# <% noteTitle %>

## Core Idea
Abstract
A single, self-contained sentence describing the main essence of this note.

## Content
> [!info] Explanation
> Elaborate the atomic concept in your own words with clarity and conciseness. Keep focus strictly on a single idea to preserve atomicity.

## Context & Connections
*Link to existing notes using [[]] with explicit context on how they relate:*
- **Parent / Overview:** [[ ]]
- **Supporting / Extension:** [[ ]]
- **Contradiction / Alternative:** [[ ]]

## Sources & References
- **Author / Source:**
- **Link / Reference:**
