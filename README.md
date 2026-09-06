# Market Analysis

Kevyt Windows-työpöytäsovellus markkinoiden yleiskuvan, indeksien suhteellisen kehityksen ja normalisoidun suorituskyvyn tarkasteluun.

## Nykyinen MVP

Sovellus käyttää tällä hetkellä determinististä mock-dataa seuraaville instrumenteille:

- SPY
- QQQ
- IWM
- DIA
- RSP

Käyttöliittymä näyttää normalisoidun kehityksen sekä RSP/SPY-suhteen. Suhde lasketaan vain päiviltä, joilta molemmista instrumenteista löytyy havainto.

Mock-data käyttää USA:n osakemarkkinoiden kaupankäyntipäiviä. Viikonloput ja mock-jaksolle osuvat markkinapyhät jätetään pois. Havaintoaika on New Yorkin paikallinen markkina-aika, joka muunnetaan UTC-aikaleimaksi kesäaika huomioiden.

## Vaatimukset

- Node.js ja npm
- Rust
- Tauri 2:n Windows-esivaatimukset

## Kehitys

Asenna riippuvuudet:

```powershell
npm install
```

Käynnistä selainfrontend:

```powershell
npm run dev
```

Käynnistä Tauri-työpöytäsovellus:

```powershell
npm run tauri dev
```

Aja testit:

```powershell
npm test
```

Tee tuotantobuild:

```powershell
npm run build
```

## Hakemistot

- `src/domain`: markkinadatan tyypit ja tuetut instrumentit
- `src/data`: datalähteen rajapinta ja mock-adapteri
- `src/calculations`: puhtaat normalisointi- ja suhdelaskennat
- `src/features/dashboard`: dashboardin komponentit ja chartit
- `src-tauri`: Windows-työpöytäsovelluksen natiivikuori

## Päivittäisen datan sopimus

Datantuottaja toteuttaa `MarketDataProvider.getDailyHistory`-metodin ja palauttaa `MarketSeries`-arvot. Rajapinta pitää datassa mukana seuraavat tiedot:

- `tradingDate`: pörssin paikallinen kaupankäyntipäivä muodossa `YYYY-MM-DD`
- `timestamp`: havainnon ISO 8601 -aikaleima UTC:nä
- `exchangeTimeZone`: pörssin IANA-aikavyöhyke, esimerkiksi `America/New_York`
- `source` ja `provider`: datan alkuperä
- `fetchedAt`: haun ajankohta UTC:nä
- `status`: datan tila, esimerkiksi `mock`, `complete`, `partial`, `stale` tai `error`
- `missingDates`: pyydetyn jakson puuttuvat kaupankäyntipäivät

Historiaa pyydetään valinnaisilla `startDate`- ja `endDate`-arvoilla. Arvot ovat muodossa `YYYY-MM-DD`. Puuttuvia arvoja ei forward-fillata eikä korvata hiljaisesti toisella havainnolla. Kutsuja voi pyytää puuttuvien päivien raportointia arvolla `missingData: "report"`.

Laskennat vertaavat sarjoja `tradingDate`-kentän perusteella. UTC-päivää ei päätellä suoraan aikaleimasta, koska UTC-päivä voi poiketa pörssin paikallisesta kaupankäyntipäivästä.

## Oikeaan market-data API:in valmistautuminen

Mock-lähde ja tuleva API-adapteri toteuttavat saman `MarketDataProvider`-rajapinnan. API-palveluntarjoajan raakavastaus muunnetaan adapterin sisällä `MarketSeries`-muotoon, joten chartit ja laskennat eivät tarvitse provider-kohtaista logiikkaa.

Tuleva adapteri vastaa ainakin seuraavista asioista:

- providerin symbolien muunnos projektin instrumenttisymboleiksi
- aikaleimojen ja pörssin aikavyöhykkeen normalisointi
- puuttuvien kaupankäyntipäivien tunnistaminen
- viiveen, vanhentuneen datan ja virheiden luokittelu
- providerin raakavastausten ja virheiden muuntaminen projektin tyyppeihin

API-avaimia tai muita tunnuksia ei tallenneta lähdekoodiin, `.env`-tiedostoon versionhallintaa varten eikä React/Vite-bundleen. `.env.example` voi dokumentoida tarvittavien asetusten nimet ilman arvoja. Tauri-sovelluksessa suojattu API-kutsu ja salaisuuksien käsittely tehdään myöhemmin natiivipuolella tai erillisessä palvelussa.

## Rajaukset

Nykyinen versio ei tarjoa reaaliaikaista dataa, käyttäjäkohtaista asetustenhallintaa, kaikkien pörssien kalentereita tai automaattista datan paikkaamista. Nämä lisätään vasta, kun käytettävä API-palveluntarjoaja ja sen datan laatuvaatimukset on päätetty.
