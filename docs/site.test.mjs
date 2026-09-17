import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('./site.js', import.meta.url), 'utf8');

function setup(response) {
  const listeners = {};
  const button = { disabled: false };
  const status = { className: '', textContent: '' };
  const form = {
    action: 'https://formsubmit.co/ShawnPackardfor64@gmail.com',
    dataset: { successMessage: 'Thanks — your message was submitted.' },
    resetCount: 0,
    querySelector(selector) {
      return selector === 'button[type="submit"]' ? button : status;
    },
    addEventListener(type, listener) { listeners[type] = listener; },
    reset() { this.resetCount += 1; }
  };
  const requests = [];
  runInNewContext(source, {
    document: {
      querySelector: () => null,
      querySelectorAll: () => [form]
    },
    URL,
    FormData: class {
      *[Symbol.iterator]() {
        yield ['email', 'test@example.invalid'];
        yield ['_captcha', 'false'];
      }
    },
    fetch: async (url, options) => {
      requests.push({ url: url.toString(), options });
      return { ok: response.ok, json: async () => response.body };
    }
  });
  return { listeners, button, status, form, requests };
}

test('successful submission stays on page and acknowledges FormSubmit acceptance', async () => {
  const page = setup({ ok: true, body: { success: 'true' } });
  let prevented = false;
  await page.listeners.submit({ preventDefault() { prevented = true; } });

  assert.equal(prevented, true);
  assert.equal(page.requests[0].url, 'https://formsubmit.co/ajax/ShawnPackardfor64@gmail.com');
  assert.equal(JSON.parse(page.requests[0].options.body)._captcha, 'false');
  assert.equal(page.form.resetCount, 1);
  assert.equal(page.status.className, 'form-status is-success');
  assert.equal(page.status.textContent, 'Thanks — your message was submitted.');
  assert.equal(page.button.disabled, false);
});

test('unsuccessful response preserves entries and shows an inline error', async () => {
  const page = setup({ ok: true, body: { success: 'false' } });
  await page.listeners.submit({ preventDefault() {} });

  assert.equal(page.form.resetCount, 0);
  assert.equal(page.status.className, 'form-status is-error');
  assert.match(page.status.textContent, /could not submit/);
  assert.equal(page.button.disabled, false);
});

test('donation page keeps the form and restored campaign story together', () => {
  const html = readFileSync(new URL('./donate/index.html', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./donate/donate.css', import.meta.url), 'utf8');
  assert.match(html, /class="donation-story"/);
  assert.match(html, /Support Local Leadership/);
  assert.match(html, /portrait-donate\.jpg/);
  assert.match(html, /Follow on Facebook/);
  assert.match(html, /id="donation-form"/);
  assert.ok(html.indexOf('id="donation-form"') < html.indexOf('class="donation-story"'));
  assert.match(html, /data-amount="100" class="selected"/);
  assert.match(css, /grid-template-areas: "story form"/);
  assert.match(css, /grid-template-areas: "form" "story"/);
});
