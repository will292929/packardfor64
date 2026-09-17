# Shawn Packard for State Representative District 64

This repository contains the campaign website. `docs/` is the GitHub Pages build; `dist/` is an older, separate ChatGPT Sites preview. The public Pages site is `https://will292929.github.io/packardfor64/`.

The site includes Home, About Us, Contact Us, Donate, Form Information, Privacy Policy, and Text Message Terms pages. The campaign video from the public [Packard for 64 Facebook post](https://www.facebook.com/PackardFor64/videos/campaign-video/905877975531100/) is hosted locally as an MP4 with a thumbnail, so the site uses a native player without a Facebook embed. The Donate page displays the campaign donor form and Stripe's secure payment fields on the GitHub Pages site.

## Donation checkout

The payment form is in [`docs/donate/index.html`](docs/donate/index.html) and initialized by [`docs/donate/donate.js`](docs/donate/donate.js). It selects $100 by default, offers $5, $25, $50, $100, $250, $500, and a custom $5–$500 amount, and only supports one-time donations. The public Stripe publishable key is safe for client-side code. The page requests a custom Checkout Session from [`worker/checkout.js`](worker/checkout.js), deployed as the `packardfor64-donations` Cloudflare Worker. Its restricted Stripe API key exists only as the encrypted Worker secret `STRIPE_SECRET_KEY`; never add it to GitHub, `.dev.vars`, or a browser script. The Worker accepts requests from the published GitHub Pages origin, validates $5–$500 per-session amounts and required donor fields, stores donor records in the private Cloudflare D1 database, and returns Stripe's session client secret and ID. Stripe's Payment Element securely hosts card and eligible wallet fields on the page. The return page checks Checkout Session status without exposing donor data.

On desktop, the page also shows the campaign story, portrait, and Facebook link beside the form. On mobile, the full form comes first and the supporting content follows it. The optimized donation-page portrait is [`docs/assets/portrait-donate.jpg`](docs/assets/portrait-donate.jpg); the original full-resolution portrait is preserved separately.

The site-controlled full name, street address, city, state, ZIP, occupation, employer, phone, and email fields must be valid before Stripe payment entry loads. Those fields are stored in D1 against the Checkout Session ID; card information never reaches the Worker or D1. Name, address, phone, and email are passed to Stripe when confirming payment. Occupation and employer are in D1, **not** Stripe metadata, and must be joined to the Stripe transaction by Checkout Session ID for campaign reporting. The session designates the 2026 general election in Stripe metadata. The campaign treasurer still needs to reconcile prior gifts from each contributor, review eligibility and reporting, and verify an actual payment, receipt, settlement, and refund workflow. This form cannot enforce the aggregate contribution limit across multiple gifts. See the [Maine Ethics Commission's contribution guidance](https://www.maine.gov/ethics/political-activity/contributing-information) and [record-keeping guidance](https://www.maine.gov/ethics/candidates/record-keeping). The methods Stripe displays depend on eligibility and account settings; the campaign should review whether each is appropriate for reporting.

The Worker checks unnotified Checkout Sessions with Stripe every five minutes. Only when Stripe confirms a paid session matching the stored amount and campaign election does it send the donor's amount, name, address, occupation, employer, phone, email, and Stripe session reference to `ShawnPackardfor64@gmail.com` through FormSubmit. Card data is never emailed. The email subject contains the unique session ID to aid deduplication; D1 records when FormSubmit accepts a notice and retries a failed send. A provider acceptance is not a guarantee of inbox delivery, and the campaign must still reconcile against Stripe. The live database was upgraded with [`worker/migrations/2026-09-17-donation-email.sql`](worker/migrations/2026-09-17-donation-email.sql); new databases use [`worker/schema.sql`](worker/schema.sql). The [Privacy Policy](docs/privacy/index.html) discloses this routing and FormSubmit's stated retention.

To deploy a Worker code change, run `wrangler deploy` from this repository with the authorized Cloudflare account. The D1 binding is configured in [`wrangler.jsonc`](wrangler.jsonc), and the database schema is in [`worker/schema.sql`](worker/schema.sql). The secret is configured separately in Cloudflare Settings and survives a normal code deployment. The GitHub Pages site publishes from `main` / `docs`.

## Contact and updates forms

The GitHub Pages contact and email-updates forms submit to FormSubmit's AJAX endpoint, addressed to `ShawnPackardfor64@gmail.com`. The forms keep visitors on the page and display success only after FormSubmit returns a successful response, or an inline error otherwise. They disable FormSubmit's routine CAPTCHA with `_captcha=false` and include an invisible honeypot, though FormSubmit may still apply anti-spam limitations. The contact form has a separate, optional SMS opt-in checkbox; the email-updates form does not enroll people in texts. This site does not send texts or connect to a messaging provider.

On September 17, 2026, one clearly marked fictional-data test through each live form returned inline success without a challenge or navigation, and both messages were found in the campaign Gmail inbox. That verifies the test journey, not a guarantee that every future message will be delivered.

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
