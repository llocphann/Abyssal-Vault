dv.container.empty();

const VAULT = "Obsidian-Vault";
const F = { daily: "00_Capture/01_Journal" };
const MON = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const pad = n => String(n).padStart(2, "0");
const fileExists = (path) => !!dv.app.vault.getAbstractFileByPath(path);

const ensureFolder = async (folderPath) => {
    if (!dv.app.vault.getAbstractFileByPath(folderPath)) {
        try {
            await dv.app.vault.createFolder(folderPath);
        } catch (e) {
        }
    }
};

const root = dv.container.createDiv();
root.style.cssText = "background:linear-gradient(135deg,var(--cc-p06),var(--cc-p01));border-radius:20px;padding:16px;text-align:center;font-family:var(--font-text);color:var(--text-normal);width:100%;box-sizing:border-box;";

const now = new Date();
let off = 0;

const render = () => {
    root.empty();
    const firstDay = new Date(now.getFullYear(), now.getMonth() + off, 1);
    const currentYear = firstDay.getFullYear();
    const currentMonth = firstDay.getMonth();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const startDayOfWeek = (firstDay.getDay() + 6) % 7;

    const header = root.createDiv();
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;color:var(--text-accent);";

    const prev = header.createSpan({ text: "‹" });
    prev.style.cssText = "cursor:pointer;font-size:18px;padding:0 10px;";
    prev.onclick = () => { off--; render(); };
    header.createSpan({ text: `${MON[currentMonth]} ${currentYear}`, attr: { style: "font-size:16px;font-weight:bold;" } });
    const next = header.createSpan({ text: "›" });
    next.style.cssText = "cursor:pointer;font-size:18px;padding:0 10px;";
    next.onclick = () => { off++; render(); };

    const daysHeader = root.createDiv();
    daysHeader.style.cssText = "display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;margin-bottom:8px;width:100%;box-sizing:border-box;";
    ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].forEach(day => {
        daysHeader.createDiv({ text: day, attr: { style: "text-align:center;font-weight:bold;color:var(--text-accent);font-size:10px;" } });
    });

    const grid = root.createDiv();
    grid.style.cssText = "display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:10px;width:100%;box-sizing:border-box;";
    for (let i = 0; i < startDayOfWeek; i++) {
        grid.createDiv({ attr: { style: "visibility:hidden;" } });
    }

    for (let d = 1; d <= totalDays; d++) {
        const dateObj = new Date(currentYear, currentMonth, d);
        const dayName = DOW[dateObj.getDay()];
        const monthName = MON[currentMonth];

        const yearFolder = `${F.daily}/${currentYear}`;
        const monthFolder = `${yearFolder}/${monthName}`;
        const p = `${monthFolder}/${pad(d)}-${pad(currentMonth + 1)}-${currentYear}-${dayName}.md`;

        const exists = fileExists(p);
        const isToday = (off === 0 && d === now.getDate());
        const bg = isToday ? "var(--cc-p07)" : "var(--cc-p01)";
        const color = isToday ? "var(--cc-p13)" : "var(--text-normal)";
        const fw = isToday ? "bold" : "normal";
        const cell = grid.createEl("a", { text: String(d) });
        cell.style.cssText = `text-decoration:none;color:${color};font-weight:${fw};text-align:center;padding:0;aspect-ratio:1;box-sizing:border-box;border-radius:8px;font-size:10px;background-color:${bg};display:flex;flex-direction:column;justify-content:center;align-items:center;position:relative;`;

        cell.onclick = async (e) => {
            e.preventDefault();
            await ensureFolder(yearFolder);
            await ensureFolder(monthFolder);
            const url = `obsidian://${exists ? "open" : "new"}?vault=${encodeURIComponent(VAULT)}&file=${encodeURIComponent(p)}`;
            window.open(url);
        };

        if (exists) {
            const dot = cell.createDiv();
            dot.style.cssText = "width:4px;height:4px;background-color:var(--text-accent);border-radius:50%;position:absolute;bottom:3px;";
        }
    }
};
render();
