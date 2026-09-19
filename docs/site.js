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
      const fields = Object.fromEntries(new FormData(form));
      fields._url = window.location.href;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(fields)
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

const endorsementCarousel = document.querySelector('[data-endorsement-carousel]');

if (endorsementCarousel) {
  const track = endorsementCarousel.querySelector('[data-endorsement-track]');
  const cards = [...track.querySelectorAll('.endorsement-card')];
  const previousButton = endorsementCarousel.querySelector('[data-endorsement-prev]');
  const nextButton = endorsementCarousel.querySelector('[data-endorsement-next]');
  const status = document.querySelector('[data-endorsement-status]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activeIndex = 0;
  let autoplayTimer;

  const updateStatus = () => {
    if (status) status.textContent = `Endorsement ${activeIndex + 1} of ${cards.length}`;
  };

  const showCard = (index, announce = true) => {
    activeIndex = (index + cards.length) % cards.length;
    track.scrollTo({
      left: cards[activeIndex].offsetLeft - track.offsetLeft,
      behavior: reduceMotion.matches ? 'auto' : 'smooth'
    });
    if (announce) updateStatus();
  };

  const stopAutoplay = () => {
    window.clearInterval(autoplayTimer);
  };

  const startAutoplay = () => {
    stopAutoplay();
    if (!reduceMotion.matches && !document.hidden) {
      autoplayTimer = window.setInterval(() => showCard(activeIndex + 1), 6500);
    }
  };

  previousButton.addEventListener('click', () => {
    showCard(activeIndex - 1);
    startAutoplay();
  });
  nextButton.addEventListener('click', () => {
    showCard(activeIndex + 1);
    startAutoplay();
  });
  endorsementCarousel.addEventListener('mouseenter', stopAutoplay);
  endorsementCarousel.addEventListener('mouseleave', startAutoplay);
  endorsementCarousel.addEventListener('focusin', stopAutoplay);
  endorsementCarousel.addEventListener('focusout', startAutoplay);
  reduceMotion.addEventListener('change', startAutoplay);
  document.addEventListener('visibilitychange', startAutoplay);
  updateStatus();
  startAutoplay();
}
