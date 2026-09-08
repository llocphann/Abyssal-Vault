<%*
const examplePath = "90_System/93_Configuration/settings.example.md";
const localPath = "90_System/93_Configuration/settings.local.md";
const compatibilityPath = "90_System/93_Configuration/settings.md";
const adapter = app.vault.adapter;

function localizeExample(text) {
  return String(text || "").replace(
    /^(\s*[A-Za-z0-9_-]+:\s*)["']?fill in your [^\r\n"']+["']?\s*$/gmi,
    '$1""'
  );
}

try {
  if (!(await adapter.exists(examplePath))) {
    console.warn("[Abyssal] settings.example.md is missing; settings bootstrap skipped.");
    return;
  }

  if (!(await adapter.exists(localPath))) {
    const example = await adapter.read(examplePath);
    await adapter.write(localPath, localizeExample(example));
    console.info("[Abyssal] Created private settings.local.md from the public example.");
  }

  const local = await adapter.read(localPath);
  const currentCompatibility = await adapter.exists(compatibilityPath)
    ? await adapter.read(compatibilityPath)
    : "";

  if (currentCompatibility !== local) {
    await adapter.write(compatibilityPath, local);
  }
} catch (error) {
  console.warn("[Abyssal] Could not bootstrap local settings:", error);
}
%>
