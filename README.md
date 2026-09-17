# Packard for 64 site recovery

This is a private-preview reconstruction of the former campaign site. It includes Home, About Us, and Contact Us. The original logo and five recovered images are served locally from `public/assets/`.

The original host returned HTTP 403 during extraction. Search-indexed page content was available for `/`, `/About-us`, `/contact-us`, and `/donate`. The donation page, payment handling, privacy/terms pages, and the original campaign video are not implemented. The old forms are display-only and explicitly collect no data. This is not a pixel-certified copy; the full HTML/CSS and video asset were not recoverable.

The archived site contained links to `example.com` for Privacy Policy and Terms of Service. Those links have not been reproduced. Longer biography and contact text has been adapted from the indexed content, while the key page structure, labels, public campaign links, and images are retained. Statistical figures are marked as unverified.

## Source references

- Home: https://packardfor64.com/
- About: https://packardfor64.com/About-us
- Contact: https://packardfor64.com/contact-us
- Original media: `https://assets.cdn.filesafe.space/foZrtJl9hKtqbg3hTua6/media/` (the source filenames are recorded below)

| Local asset | Original media filename | Role |
| --- | --- | --- |
| logo.png | 690132b38a87f33c55e904cc.png | Campaign mark |
| hero.png | 69014d27782e266e62d25323.png | Hero cutout |
| portrait.jpeg | 69015753f63ac87fbe6fd365.jpeg | About portrait |
| service.png | 69015b3d8c192c859633016d.png | Discover Waterville emblem |
| discover.jpeg | 690159698a87f3116bfa50c8.jpeg | AYCC photograph |
| aycc.webp | 69015e0cff3e444f9ff059f1.webp | MMTC emblem |

Run locally with any static server pointed at `public/`, e.g. `python -m http.server 4173 -d public`. Do not make this site public until the campaign has reviewed the content, assets, legal disclosures, forms, and missing video/donation destinations.
