<%*
let noteTitle=await tp.system.prompt("Enter Note Title / Topic:");
if(noteTitle){await tp.file.rename(noteTitle);}else{noteTitle=tp.file.title;}
let courseName=await tp.system.prompt("Enter Course / Subject:");
if(!courseName)courseName="General";
let noteContext=await tp.system.suggester(
["1. Lecture","2. Reading","3. Research","4. Meeting"],
["Lecture","Reading","Research","Meeting"]
);
if(!noteContext)noteContext="Lecture";
let cid=tp.date.now("YYYYMMDDHHmmss");
-%>
---
id: <% cid %>
date: <% tp.date.now("YYYY-MM-DD") %>
type: cornell-note
context: <% noteContext %>
course: "<% courseName %>"
status: draft
tags:
  - cornell-notes
  - <% noteContext.toLowerCase() %>
aliases: []
---

# <% noteTitle %>

## Session Metadata

### ! Session Metadata

- **Course:** [[<% courseName %>]]
- **Context:** <% noteContext %>
- **Date:** <% tp.date.now("YYYY-MM-DD (dddd)") %>
- **Instructor / Author:**
- **Source:**

## Learning Objectives

### . Learning Goals

- What should I understand after this session?
- Which concepts are most important?

## Main Notes

### ? Guiding Question

Write the main explanation here.

- Supporting point
- Supporting point
- Formula / Example

### ! Key Concept

Definition, theorem, important statement or mechanism.

- Key idea
- Why it matters

### E- Example

Worked example, diagram explanation, case study or application.

### V- Verified

Facts confirmed from textbook, paper or instructor.

### X- Common Mistake

Misconception, exception or incorrect reasoning to avoid.

### R- Related

Related notes, prerequisite concepts or follow-up topics.

- [[ ]]
- [[ ]]

## Summary

### * Feynman Summary

Explain this topic in your own words using 3–5 sentences.

## Active Recall

### ? Self-Test

- Question 1
- Question 2
- Question 3

## Next Review

### V- Review Schedule

- [ ] Today
- [ ] +1 day
- [ ] +3 days
- [ ] +7 days
- [ ] +14 days
- [ ] +30 days
