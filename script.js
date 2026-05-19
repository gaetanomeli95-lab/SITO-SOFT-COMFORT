const header = document.querySelector('.site-header');
const menuToggle = document.querySelector('.menu-toggle');
const glow = document.querySelector('.cursor-glow');
const reveals = document.querySelectorAll('.section-reveal');
const tiltCards = document.querySelectorAll('[data-tilt]');
const appointmentForm = document.querySelector('[data-appointment-form]');
const appointmentEmailButton = document.querySelector('[data-appointment-email]');
const locationCards = document.querySelectorAll('.location-card[role="link"]');
const catalogLinks = document.querySelectorAll('[data-catalog-link]');
const siteLoader = document.querySelector('.site-loader');

const revealPage = () => {
  document.body.classList.add('is-loaded');
  if (!siteLoader) return;
  window.setTimeout(() => {
    siteLoader.remove();
  }, 900);
};

window.setTimeout(revealPage, 2600);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.setTimeout(revealPage, 2200);
  }, { once: true });
} else {
  window.setTimeout(revealPage, 2200);
}

menuToggle?.addEventListener('click', () => {
  const isOpen = header.classList.toggle('menu-open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

document.querySelectorAll('.main-nav a').forEach((link) => {
  link.addEventListener('click', () => {
    header.classList.remove('menu-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  });
});

catalogLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const href = link.getAttribute('href');
    if (!href) return;
    window.setTimeout(() => {
      if (!window.location.pathname.endsWith(href)) {
        window.location.href = href;
      }
    }, 80);
  });
});

window.addEventListener('mousemove', (event) => {
  if (!glow) return;
  glow.style.opacity = '1';
  glow.style.left = `${event.clientX}px`;
  glow.style.top = `${event.clientY}px`;
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.14 });

reveals.forEach((element) => revealObserver.observe(element));

tiltCards.forEach((card) => {
  card.addEventListener('mousemove', (event) => {
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateY = ((x / rect.width) - 0.5) * 8;
    const rotateX = ((0.5 - y / rect.height)) * 8;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
  });
});

const getAppointmentData = () => {
  const data = new FormData(appointmentForm);
  return {
    nome: data.get('nome') || 'Non indicato',
    telefono: data.get('telefono') || 'Non indicato',
    email: data.get('email') || 'Non indicata',
    showroom: data.get('showroom') || 'Non indicato',
    ambiente: data.get('ambiente') || 'Non indicato',
    giorno: data.get('giorno') || 'Da concordare',
    fascia: data.get('fascia') || 'Da concordare',
    messaggio: data.get('messaggio') || 'Nessun dettaglio aggiunto'
  };
};

const getAppointmentMessage = () => {
  const data = getAppointmentData();
  return `Nuova richiesta appuntamento Soft Comfort

Nome: ${data.nome}
Telefono: ${data.telefono}
Email: ${data.email}
Showroom preferito: ${data.showroom}
Ambiente da progettare: ${data.ambiente}
Giorno preferito: ${data.giorno}
Fascia oraria: ${data.fascia}

Dettagli progetto:
${data.messaggio}`;
};

const getAppointmentEmail = () => {
  const data = getAppointmentData();
  return String(data.showroom).includes('Bagheria') ? 'softcomfortbagheria@gmail.com' : 'softcomfort.2016@gmail.com';
};

appointmentForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!appointmentForm.reportValidity()) return;
  const message = encodeURIComponent(getAppointmentMessage());
  window.open(`https://wa.me/393929952453?text=${message}`, '_blank', 'noopener');
});

appointmentEmailButton?.addEventListener('click', () => {
  if (!appointmentForm?.reportValidity()) return;
  const subject = encodeURIComponent('Nuova richiesta appuntamento Soft Comfort');
  const body = encodeURIComponent(getAppointmentMessage());
  window.location.href = `mailto:${getAppointmentEmail()}?subject=${subject}&body=${body}`;
});

locationCards.forEach((card) => {
  card.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    card.click();
  });
});
