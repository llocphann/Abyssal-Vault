<%*
const tFiles = app.vault.getFiles().filter(f => f.extension === "pdf");
const displayPaths = tFiles.map(f => f.path);
let chosenIndex = await tp.system.suggester(displayPaths, Array.from(displayPaths.keys()), false, "Search source file...");
let source = "";
if (chosenIndex !== null) {
    const selectedFile = tFiles[chosenIndex];
    source = selectedFile.extension === "md" ? selectedFile.basename : selectedFile.name;
}
let date = tp.file.creation_date("YYYY-MM-DD");
tR += "---\n";
tR += "Type: literature\n";
tR += `Source: "[[${source}]]"\n`;
tR += `Unit: "[[${tp.file.title}]]"\n`;
tR += `DateCreated: ${date}\n`;
tR += "tags:\n";
tR += "  - flashcards/english/vocabulary\n";
tR += "  - review/english/vocabulary\n";
tR += "---\n";
tR += `📝 Vocabulary List: [[${tp.file.title}]]\n`;
-%>
ℹ️ Entry format:
	Write directly inside the example sentence using this structure:
		Sentence beginning **____** (Part of speech — Short meaning) sentence ending.
		(question mark separator)
		**Vocabulary item** (Level) (Pronunciation)
		- **Meaning:** Full or detailed meaning
		- **Collocations:**
		  - Collocation 1 - Meaning
		  - Collocation 2 - Meaning

📥 New Vocabulary Entries

Ex: ... ==... (/.../);;... — Word meaning== ...

Ex: ... ==... (/.../);;... — Word meaning== ...

Ex: ... ==... (/.../);;... — Word meaning== ...

Ex: ... ==... (/.../);;... — Word meaning== ...

Ex: ... ==... (/.../);;... — Word meaning== ...

Ex: ... ==... (/.../);;... — Word meaning== ...

Ex: ... ==... (/.../);;... — Word meaning== ...

Ex: ... ==... (/.../);;... — Word meaning== ...

Ex: ... ==... (/.../);;... — Word meaning== ...

Ex: ... ==... (/.../);;... — Word meaning== ...

Exercise 1
1. .    2. .    3. .    4. .    5. .    6. .    7. .    8. .    9. .    10. .

Exercise 2
1. .    2. .    3. .    4. .    5. .

Exercise 3
1. .    2. .    3. .    4. .    5. .

Exercise 4
1. .    2. .    3. .    4. .    5. .    6. .    7. .    8. .    9. .    10. .

**Reading Comprehension**

Part A
1.
2.
3.
4.
5.

Part B
1.
2.
3.
4.
5.
