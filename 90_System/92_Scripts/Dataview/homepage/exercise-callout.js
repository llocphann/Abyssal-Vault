const settings = dv.page("90_System/93_Configuration/settings.local")
              || dv.page("90_System/93_Configuration/settings.example");

const folderPath = settings?.file?.frontmatter?.["callout_path"]
                ?? settings?.["callout_path"]
                ?? settings?.callout_path;

const targetHeading = settings?.file?.frontmatter?.["exercise_heading"]
                ?? settings?.["exercise_heading"]
                ?? settings?.exercise_heading;

const days = [
    "07_Sunday",
    "01_Monday",
    "02_Tuesday",
    "03_Wednesday",
    "04_Thursday",
    "05_Friday",
    "06_Saturday"
];

function hideJournalSourceAfterSnapshot() {
    const journal = dv.container?.closest?.(".cv-journal");
    const snapshot = journal?.querySelector?.('[data-role="journal-daily-snapshot"]');
    if (!snapshot) return;

    const hide = () => {
        if (snapshot.hidden) return false;
        dv.container.classList.add("cv-journal-source-daily-snapshot");
        dv.container.setAttribute("aria-hidden", "true");
        return true;
    };

    if (hide()) return;

    const view = dv.container.ownerDocument?.defaultView;
    const Observer = view?.MutationObserver;
    if (typeof Observer !== "function") return;

    const observer = new Observer(() => {
        if (hide()) observer.disconnect();
    });
    observer.observe(snapshot, { attributes: true, attributeFilter: ["hidden"] });
    view?.setTimeout?.(() => observer.disconnect(), 12000);
}

const today = new Date().getDay();
const noteName = days[today];

const calloutBody = `![[${folderPath}/${noteName}#${targetHeading}]]`;
dv.paragraph(calloutBody);
hideJournalSourceAfterSnapshot();
