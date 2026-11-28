# E-Liquid Lab als app op je smartphone

Deze map is een complete PWA (installeerbare web-app). Na installatie start hij schermvullend vanaf je beginscherm, werkt hij zonder internet en blijft alles op je telefoon staan.

## Bestanden
- `index.html`, `style.css`, `app.js`: de app (opmaak en code staan nu in aparte bestanden)
- `manifest.webmanifest`: naam, kleuren en iconen
- `sw.js`: service worker voor offline gebruik
- `icon-*.png`, `apple-touch-icon.png`: app-iconen

Zet alle bestanden in dezelfde map op één plek. Een PWA moet via **https** geladen worden, dus je hebt een gratis hostingplek nodig (stap 1).

## Stap 1 - Zet de map online (kies er één)
- **Netlify Drop**: ga naar app.netlify.com/drop en sleep de map erin. Je krijgt direct een https-link.
- **GitHub Pages**: maak een repository, upload de bestanden, zet onder Settings → Pages de bron op de hoofdmap van je branch. Je link wordt `https://jouwnaam.github.io/reponaam/`.
- **Cloudflare Pages**: kies "Direct Upload" en upload de map.

De pagina is dan publiek bereikbaar via de link, maar bevat geen persoonlijke gegevens: alles wat je invoert blijft in de opslag van je eigen toestel.

## Stap 2 - Installeer op je telefoon
- **Android (Chrome)**: open de link, tik op ⋮ → *App installeren* (of *Toevoegen aan startscherm*). Binnen de app staat ook een knop **📲 Installeer** in de header en in de tab Backup.
- **iPhone (Safari)**: open de link, tik op het deel-icoon → *Zet op beginscherm*. Gebruik Safari, niet Chrome.

Open de app daarna één keer met internet, zodat hij zichzelf offline beschikbaar maakt.

## Je gegevens
- Recepten, voorraad, liquids en instellingen staan in de opslag van je toestel, per app en per telefoon. Een andere telefoon of browser begint leeg.
- **Maak regelmatig een backup** (tab Backup → Exporteer). Wis je browser- of sitegegevens, dan verdwijnt alles. De app herinnert je na 14 dagen.
- Verhuizen naar een nieuwe telefoon: exporteer, stuur het .json-bestand naar jezelf en importeer het.
- Op de telefoon gaan PNG-etiketten en backups via het deelmenu, zodat je ze direct kunt opslaan in Bestanden/Foto's of delen met een printer-app.

## Etiketten printen
- De PNG heeft 300 dpi en de exacte afmetingen in mm. Print hem in je labelprinter-app op **100% / werkelijke grootte**, zonder "aanpassen aan pagina".
- Voor een thermische printer kies je kleurmodus **Zwart-wit**.

## Gemini-achtergronden
In de tab Etiket kun je een API-sleutel van Google AI Studio invullen. De sleutel wordt alleen in je telefoon bewaard. Gebruik bij voorkeur een sleutel met een laag budget of een beperking, en deel hem nooit. Zonder sleutel kun je ook gewoon de instructie kopiëren en in de Gemini-app plakken.

## Updaten
Upload de gewijzigde bestanden (`index.html`, `style.css`, `app.js`) en verhoog de versie in `sw.js` (bijv. `v5.5.4` → `v5.5.5`). De app ververst zichzelf bij het volgende openen (soms pas de tweede keer). Upload altijd de hele map, zodat de bestanden bij elkaar passen.

## Testen op je computer
Open een terminal in deze map en start `python3 -m http.server 8000`, ga naar `http://localhost:8000`. Op je telefoon via het wifi-adres (http) werkt installeren niet: daar is https voor nodig.

## Snelkoppelingen
Na installeren geeft lang drukken op het app-icoon (Android) snelkoppelingen naar Nieuwe mix, Voorraad, Steep-batches en Recepten. Heb je de app al geïnstalleerd, verwijder hem dan en installeer opnieuw om ze te krijgen.
