# Shawn Packard for State Representative District 64

This repository contains the campaign website. `docs/` is the GitHub Pages build; `dist/` is an older, separate ChatGPT Sites preview. The public Pages site is `https://will292929.github.io/packardfor64/`.

The site includes Home, About Us, Contact Us, Donate, Form Information, Privacy Policy, and Text Message Terms pages. The campaign video from the public [Packard for 64 Facebook post](https://www.facebook.com/PackardFor64/videos/campaign-video/905877975531100/) is hosted locally as an MP4 with a thumbnail, so the site uses a native player without a Facebook embed. The Donate page embeds Stripe Checkout on the GitHub Pages site.

## Donation checkout

The payment form is in [`docs/donate/index.html`](docs/donate/index.html) and initialized by [`docs/donate/donate.js`](docs/donate/donate.js). The public Stripe publishable key is safe for client-side code. The page requests an embedded Checkout Session from [`worker/checkout.js`](worker/checkout.js), deployed as the `packardfor64-donations` Cloudflare Worker. Its restricted Stripe API key exists only as the encrypted Worker secret `STRIPE_SECRET_KEY`; never add it to GitHub, `.dev.vars`, or a browser script. The Worker accepts requests from the published GitHub Pages origin, validates $5–$500 per-session amounts, and returns only Stripe's session client secret. Stripe securely hosts the donor and payment fields inside an iframe on the page. The return page checks Checkout Session status without exposing donor data.

The checkout loads automatically on the Donate page as a one-time $25 USD contribution. It requires full name, billing address, phone number, occupation, and employer or principal place of business. It designates the 2026 general election in Stripe metadata. The campaign treasurer still needs to reconcile prior gifts from each contributor, review eligibility and reporting, and verify an actual payment, receipt, settlement, and refund workflow. This form cannot enforce the aggregate contribution limit across multiple gifts. See the [Maine Ethics Commission's contribution guidance](https://www.maine.gov/ethics/political-activity/contributing-information) and [record-keeping guidance](https://www.maine.gov/ethics/candidates/record-keeping). The methods Stripe displays depend on eligibility and account settings; the campaign should review whether each is appropriate for reporting.

To deploy a Worker code change, run `wrangler deploy` from this repository with the authorized Cloudflare account. The secret is configured separately in Cloudflare Settings and survives a normal code deployment. The GitHub Pages site publishes from `main` / `docs`.

## Contact and updates forms

The GitHub Pages contact and email-updates forms submit to FormSubmit's AJAX endpoint, addressed to `ShawnPackardfor64@gmail.com`. The user reports that FormSubmit activation is complete; receipt in the campaign inbox has not been independently verified. The forms keep visitors on the page and display success only after FormSubmit returns a successful response, or an inline error otherwise. They disable FormSubmit's routine CAPTCHA with `_captcha=false` and include an invisible honeypot, though FormSubmit may still apply anti-spam limitations. The contact form has a separate, optional SMS opt-in checkbox; the email-updates form does not enroll people in texts. This site does not send texts or connect to a messaging provider.

For an end-to-end delivery check, submit clearly marked fictional-data tests through both live forms and confirm the messages arrive in the campaign inbox. A successful FormSubmit response alone does not prove mailbox receipt.

FormSubmit's documentation says it retains submissions for up to 30 days. The campaign should review the form-information notice and decide whether this third-party handling fits its privacy practices before collecting real supporter data. Do not put payment-card information, passwords, or secret keys in this repository or the forms.

The supplied Text Message Terms and Privacy Policy have been adapted to the site's current capabilities and published at `/text-terms/` and `/privacy/` in the GitHub Pages build. The Campaign should review factual data practices and text-program operations before relying on these pages for registration or compliance. The original custom domain is not connected to GitHub Pages. Use the live `https://will292929.github.io/packardfor64/` URLs for now.

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
