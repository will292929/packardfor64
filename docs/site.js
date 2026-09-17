const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-nav');

if (menuButton && nav) {
  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    nav.classList.toggle('open', !isOpen);
  });
}

const smsOptIn = document.querySelector('#sms-opt-in');
const phoneField = document.querySelector('input[name="phone"]');

if (smsOptIn && phoneField) {
  const syncPhoneRequirement = () => {
    phoneField.required = smsOptIn.checked;
  };
  smsOptIn.addEventListener('change', syncPhoneRequirement);
  syncPhoneRequirement();
}

for (const form of document.querySelectorAll('form[data-formsubmit]')) {
  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector('.form-status');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (button.disabled) return;

    button.disabled = true;
    status.className = 'form-status';
    status.textContent = 'Submitting…';

    try {
      const endpoint = new URL(form.action);
      endpoint.pathname = `/ajax${endpoint.pathname}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      const result = await response.json();
      if (!response.ok || (result.success !== true && result.success !== 'true')) {
        throw new Error('FormSubmit did not accept the submission');
      }

      form.reset();
      if (smsOptIn && phoneField && form.contains(smsOptIn)) {
        phoneField.required = false;
      }
      status.className = 'form-status is-success';
      status.textContent = form.dataset.successMessage;
    } catch {
      status.className = 'form-status is-error';
      status.textContent = 'We could not submit the form. Please try again or email ShawnPackardfor64@gmail.com.';
    } finally {
      button.disabled = false;
    }
  });
}
