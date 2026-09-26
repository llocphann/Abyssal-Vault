<%*
let activeFile = app.workspace.getActiveFile();
let fileName = activeFile ? activeFile.basename : tp.file.title;
let match = fileName.match(/\d{4}[-.\/]\d{2}[-.\/]\d{2}/) || fileName.match(/\d{2}[-.\/]\d{2}[-.\/]\d{4}/);
let fileDate;
if (match) {
    fileDate = moment(match[0], ["YYYY-MM-DD", "YYYY.MM.DD", "DD-MM-YYYY"]).format("YYYY-MM-DD");
} else {
    fileDate = await tp.system.prompt("The file name does not contain a date. Enter the note date (YYYY-MM-DD):", tp.date.now("YYYY-MM-DD"));
    if (!fileDate) fileDate = tp.date.now("YYYY-MM-DD");
}

const dayName = moment(fileDate, "YYYY-MM-DD").format("dddd");
const quoteRaw = String(tp.user.quotes() || "");
const quoteLines = quoteRaw.split(/\r?\n/);
let quoteText = "";
let quoteAuthor = "";
for (let index = 0; index < quoteLines.length; index += 1) {
    const quoteMatch = quoteLines[index].match(/^>\s*\[!quote\][+-]?\s*(.*)$/i);
    if (!quoteMatch) continue;
    quoteText = String(quoteMatch[1] || "").trim();
    const following = [];
    for (let cursor = index + 1; cursor < quoteLines.length; cursor += 1) {
        const continuation = quoteLines[cursor].match(/^>\s?(.*)$/);
        if (!continuation) break;
        const value = String(continuation[1] || "").trim();
        if (value) following.push(value);
    }
    if (following.length) {
        quoteAuthor = following.pop();
        if (following.length) quoteText = [quoteText, ...following].filter(Boolean).join(" ");
    }
    break;
}

const quoteYaml = JSON.stringify(quoteText);
const quoteAuthorYaml = JSON.stringify(quoteAuthor);
tR += `---\nDay: ${dayName}\njournal: Daily Notes\nmood:\nenergy:\nweight:\nreflection:\nquote: ${quoteYaml}\nquote_author: ${quoteAuthorYaml}\ntags:\n  - Daily-notes\n---\n`;
-%>
## Day Planner

---

## Daily Log

---

Body Pic:
