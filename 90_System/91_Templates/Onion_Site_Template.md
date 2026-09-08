---
Title: Name or Service
URL_Onion: exampleaddress.onion
URL_Mirror: ""
PGP_Key: ""
Category: Empty
Danger_Rating: 4
Status: Active
Date_Discovered: <% tp.date.now("YYYY-MM-DD") %>
Last_Checked: <% tp.date.now("YYYY-MM-DD") %>
tags:
  - OnionSite
---

```dataviewjs
dv.container.empty();
const page = dv.current();
let linkContent = `> [!info] ${page.Title || "Unknown"}
> **Primary URL:** ${page.URL_Onion || "N/A"}`;
if (page.URL_Mirror) linkContent += `\n> **Mirror / Backup:** ${page.URL_Mirror}`;
if (page.PGP_Key) linkContent += `\n> **PGP Key / Verification:** ${page.PGP_Key}`;
dv.paragraph(linkContent);
```

## Notes & Analysis

```dataviewjs
dv.view("90_System/92_Scripts/Dataview/onion-site/category")
```

### Additional Notes
-

### Reference Legend (Metadata Guide)

**Category Abbreviations:**
- **SEC**   : Security, Hacking, Exploits, Pentesting
- **FIN**   : Financial, Crypto, Tumblers, Carding
- **FOR**   : Forum, Community, Social, Discussion
- **MKT**   : General Marketplace, Vendors, Storefronts
- **INFO**  : Directory, Wiki, Library, Archives
- **DEV**   : Development, Coding, Tools
- **COM**   : Encrypted Email, Chat, Messaging, Jabber
- **HOST**  : Bulletproof Hosting, VPS, Domain Services
- **LEAK**  : Data Leaks, Breached Databases, Dumps
- **PRIV**  : Anonymity, Privacy Tools, VPN, Proxies
- **MAL**   : Malware, Ransomware, Botnets, C2 Servers
- **DOC**   : Counterfeit Documents, Passports, Fake IDs
- **DRUG**  : Narcotics, Pharmaceuticals, Chemicals
- **WEAP**  : Firearms, Ammunition, Defense
- **INT**   : Threat Intelligence, OSINT, Monitoring
- **SRCH**  : Darkweb Search Engines, Crawlers, Indexers
- **ESC**   : Standalone Escrow Services, Dispute Resolution
- **MEDIA** : Image Hosting, Video Streaming, File Sharing
- **GOV**   : Whistleblowing, Leaks, Political Activism
- **GAM**   : Gambling, Casinos, Betting, Prediction Markets
- **OTH**   : Other / Unclassified

**Danger Level Scale (1-10 Skulls):**
- `💀☆☆☆☆☆☆☆☆☆` (1/10): Low risk (Directories, Public Libraries, News mirrors)
- `💀💀💀☆☆☆☆☆☆☆` (3/10): Medium risk (Unverified Forums, Software tools)
- `💀💀💀💀💀☆☆☆☆☆` (5/10): High risk (Marketplaces, Financial services)
- `💀💀💀💀💀💀💀☆☆☆` (7/10): Dangerous (Malware distribution, Hacking services)
- `💀💀💀💀💀💀💀💀💀💀` (10/10): Extreme Danger (Illegal content, Severe exploits, Phishing traps)