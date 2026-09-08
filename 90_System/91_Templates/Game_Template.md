<%*
const note = await tp.user.game_metadata(tp);

const prompts = {
  "## Personal Log": [
    "- What made this session stand out?",
    "- What changed in how I feel about the game?",
    "- What do I want to try next?",
  ],
  "## Mechanics": [
    "- What system or mechanic clicked today?",
    "- What felt elegant, awkward, or exploitable?",
    "- What strategy, build, or pattern did I learn?",
  ],
  "## Story & World": [
    "- What character, place, or idea stayed with me?",
    "- What question is the story leaving open?",
    "- What detail made the world feel alive?",
  ],
  "## Memorable Moments": [
    "- Best moment:",
    "- Most unexpected moment:",
    "- Something worth revisiting:",
  ],
};

let seeded = note;
for (const [heading, lines] of Object.entries(prompts)) {
  const marker = `${heading}\n\n`;
  if (seeded.includes(marker)) {
    seeded = seeded.replace(marker, `${heading}\n\n${lines.join("\n")}\n\n`);
  }
}

tR += seeded;
%>
