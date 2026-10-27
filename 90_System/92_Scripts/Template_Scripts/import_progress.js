/**
 * Shared 5-step, non-blocking progress notice for Templater importers.
 * In Obsidian the bar represents workflow steps, not downloaded bytes.
 * No changes to vault notes, settings, or metadata.
 */
module.exports = function importProgress(tp, options = {}) {
  const total = Number.isInteger(options.totalSteps) && options.totalSteps > 0
    ? Math.min(options.totalSteps, 20) : 5;
  const title = String(options.title || "Import Progress");
  const started = Date.now();
  let step = 0;
  let state = "Preparing import...";
  let closed = false;
  let timer = null;
  let notice = null;
  let heading = null;
  let description = null;
  let counter = null;
  let bar = null;

  const elapsed = () => {
    const seconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
    return seconds < 60 ? seconds + "s" : Math.floor(seconds / 60) +
      "m " + String(seconds % 60).padStart(2, "0") + "s";
  };
  const redraw = () => {
    if (closed) return;
    const subtitle = "Step " + step + " of " + total + " · " + elapsed() + " elapsed";
    try {
      if (heading?.setText) heading.setText(title);
      if (description?.setText) description.setText(state);
      if (counter?.setText) counter.setText(subtitle);
      if (bar) bar.value = step;
      if (!description && typeof notice?.setMessage === "function")
        notice.setMessage(title + ": " + state + " — " + subtitle);
    } catch (_) { /* A broken theme/notice must not stop importing. */ }
  };
  try {
    if (typeof tp?.obsidian?.Notice === "function") {
      notice = new tp.obsidian.Notice(title + ": " + state, 0);
      const host = notice.noticeEl;
      if (typeof host?.createDiv === "function") {
        if (typeof host.empty === "function") host.empty();
        const root = host.createDiv({cls:"abyssal-import-progress"});
        heading = root.createDiv({text:title});
        description = root.createDiv({text:state});
        bar = root.createEl("progress");
        bar.max = total;
        bar.value = 0;
        bar.style.width = "100%";
        bar.style.display = "block";
        bar.setAttribute("aria-label", title + " workflow progress");
        counter = root.createDiv({text:"Step 0 of " + total + " · 0s elapsed"});
        counter.style.color = "var(--text-muted)";
        counter.style.fontSize = "var(--font-smaller)";
      }
    }
  } catch (_) { /* User scripts can still import without the Notice UI. */ }

  redraw();
  if (notice && typeof setInterval === "function") {
    timer = setInterval(redraw, 1000);
    timer?.unref?.(); // Node tests must exit; ignored in Obsidian.
  }
  return {
    update(next, message) {
      if (closed) return;
      const number = Number(next);
      if (Number.isFinite(number)) step = Math.max(step, Math.min(total, Math.max(0, Math.floor(number))));
      if (message != null) state = String(message);
      redraw();
    },
    close() {
      if (closed) return;
      closed = true;
      if (timer != null && typeof clearInterval === "function") clearInterval(timer);
      timer = null;
      try { notice?.hide?.(); } catch (_) {}
    }
  };
};
