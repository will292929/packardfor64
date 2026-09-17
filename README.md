# Shawn Packard for State Representative District 64

This repository contains the campaign website. `docs/` is the GitHub Pages build; `dist/` is an older, separate ChatGPT Sites preview. The public Pages site is `https://will292929.github.io/packardfor64/`.

The site includes Home, About Us, Contact Us, Form Information, Privacy Policy, and Text Message Terms pages. The campaign video from the public [Packard for 64 Facebook post](https://www.facebook.com/PackardFor64/videos/campaign-video/905877975531100/) is hosted locally as an MP4 with a thumbnail, so the site uses a native player without a Facebook embed. Donation processing is not implemented, and no donation controls appear on the public site.

## Contact and updates forms

The GitHub Pages contact and email-updates forms submit to FormSubmit, addressed to `ShawnPackardfor64@gmail.com`. That destination is user-supplied and has **not** been verified by receipt. FormSubmit requires a one-time activation from the recipient inbox before delivery is confirmed. The forms disclose this pending state and provide a direct email fallback. The contact form has a separate, optional SMS opt-in checkbox; the email-updates form does not enroll people in texts. This site does not send texts or connect to a messaging provider.

To finish activation:

1. Ask the holder of `ShawnPackardfor64@gmail.com` to find FormSubmit's activation email (including Spam) and click its confirmation link.
2. Submit a clearly marked, fictional-data test through each live form.
3. Confirm both messages actually arrive in the campaign inbox. Only then remove the delivery warning from the forms, `docs/form-information/`, and the Privacy Policy.

FormSubmit's documentation says it retains submissions for up to 30 days. The campaign should review the form-information notice and decide whether this third-party handling fits its privacy practices before collecting real supporter data. Do not put payment-card information, passwords, or secret keys in this repository or the forms.

The supplied Text Message Terms and Privacy Policy have been adapted to the site's current capabilities and published at `/text-terms/` and `/privacy/` in the GitHub Pages build. The Campaign should review factual data practices and text-program operations before relying on these pages for registration or compliance. The requested `https://www.packardfor64.com/privacy` and `/text-terms` URLs still return 404 because the original domain is not connected to GitHub Pages. Use the live `https://will292929.github.io/packardfor64/` URLs for now. Donation processing is not implemented.

## Publishing

GitHub Pages is configured to publish from `main` / `docs`. All site files are in this repository; there is no build step. For local review, serve the repository root with a static HTTP server and open `/docs/`.

## Source references

- Home: https://packardfor64.com/
- About: https://packardfor64.com/About-us
- Contact: https://packardfor64.com/contact-us
- Original media: `https://assets.cdn.filesafe.space/foZrtJl9hKtqbg3hTua6/media/`

| Local asset | Original media filename | Role |
| --- | --- | --- |
| logo.png | 690132b38a87f33c55e904cc.png | Campaign mark |
| hero.png | 69014d27782e266e62d25323.png | Hero cutout |
| portrait.jpeg | 69015753f63ac87fbe6fd365.jpeg | About portrait |
| service.png | 69015b3d8c192c859633016d.png | Discover Waterville emblem |
| discover.jpeg | 690159698a87f3116bfa50c8.jpeg | AYCC photograph |
| aycc.webp | 69015e0cff3e444f9ff059f1.webp | MMTC emblem |
