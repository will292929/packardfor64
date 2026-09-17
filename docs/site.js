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
