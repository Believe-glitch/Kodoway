// ===========================================================
// KODOWAY — Script global
// ===========================================================

// Sert au diagnostic inline de chaque page : si cette ligne s'exécute,
// le fichier script.js a bien été trouvé, téléchargé et parsé.
window.KODOWAY_SCRIPT_LOADED = true;

// Menu mobile : ouvre/ferme la navigation sur petit écran
try {
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  const navBackdrop = document.getElementById('navBackdrop');

  function kodowayCloseMenu() {
    if (navLinks) navLinks.classList.remove('is-open');
    if (navToggle) navToggle.classList.remove('is-active');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
    if (navBackdrop) navBackdrop.classList.remove('is-open');
  }

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('is-open');
      navToggle.classList.toggle('is-active', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
      if (navBackdrop) navBackdrop.classList.toggle('is-open', isOpen);
    });

    if (navBackdrop) navBackdrop.addEventListener('click', kodowayCloseMenu);
    navLinks.querySelectorAll('a').forEach((link) => link.addEventListener('click', kodowayCloseMenu));
  }
} catch (e) {
  console.error('Kodoway : erreur dans le menu mobile.', e);
}

// Animation d'apparition légère pour les cartes et les étapes.
// Le contenu est visible par défaut dans le CSS : c'est ce script qui
// ajoute la classe "reveal-init" (invisible) avant d'observer, donc si
// le script ne se charge pas, rien ne disparaît jamais.
try {
  const elementsToReveal = document.querySelectorAll('.card, .step');

  if ('IntersectionObserver' in window && elementsToReveal.length) {
    elementsToReveal.forEach((el) => el.classList.add('reveal-init'));

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    elementsToReveal.forEach((el) => observer.observe(el));
  }
} catch (e) {
  console.error('Kodoway : erreur dans l\'animation d\'apparition.', e);
}

// ===========================================================
// Utilitaires partagés : construction de l'aperçu en direct (iframe)
// ===========================================================

const KODOWAY_BASE_STYLE = [
  "body { font-family: 'Inter', system-ui, sans-serif; background: #ffffff; color: #15192B; padding: 18px; margin: 0; line-height: 1.5; }",
  "button { font-family: inherit; padding: 8px 16px; border-radius: 8px; border: 1px solid #cbd2e0; background: #f4f6fb; cursor: pointer; font-size: 0.9rem; }",
  "a { color: #2952FF; }",
  "#kodoway-console { margin-top: 14px; font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; color: #344; white-space: pre-wrap; border-top: 1px dashed #ddd; padding-top: 10px; min-height: 1.2em; }"
].join(' ');

// Construit le document HTML complet à afficher dans une iframe d'aperçu
function kodowayBuildPreviewDoc(code, opts) {
  const options = opts || {};
  const type = options.type || 'html';
  const demo = options.demoHTML || '';
  const prelude = options.prelude || '';
  const postlude = options.postlude || '';
  const safeCode = (code === undefined || code === null) ? '' : code;

  if (type === 'css') {
    return '<!DOCTYPE html><html><head><style>' + KODOWAY_BASE_STYLE + '</style><style>' + safeCode + '</style></head><body>' + demo + '</body></html>';
  }

  if (type === 'js') {
    return '<!DOCTYPE html><html><head><style>' + KODOWAY_BASE_STYLE + '</style></head><body>' +
      demo +
      '<div id="kodoway-console"></div>' +
      '<script>' +
      'var out = document.getElementById("kodoway-console");' +
      'console.log = function() {' +
      '  var args = Array.prototype.slice.call(arguments);' +
      '  var line = args.map(function(a){ return (typeof a === "object") ? JSON.stringify(a) : String(a); }).join(" ");' +
      '  out.textContent += (out.textContent ? "\\n" : "") + line;' +
      '};' +
      'try {' +
      prelude + ';' +
      safeCode + ';' +
      postlude + ';' +
      '} catch (e) {' +
      '  out.textContent += (out.textContent ? "\\n" : "") + "Erreur : " + e.message;' +
      '}' +
      '<\/script>' +
      '</body></html>';
  }

  // type === 'html' (par défaut) — le code de l'utilisateur peut lui-même
  // contenir <style> et/ou <script>, ça fonctionne normalement.
  return '<!DOCTYPE html><html><head><style>' + KODOWAY_BASE_STYLE + '</style></head><body>' + safeCode + '</body></html>';
}

function kodowayRenderPreview(frame, code, opts) {
  if (!frame) return;
  try {
    frame.srcdoc = kodowayBuildPreviewDoc(code, opts);
  } catch (e) {
    console.error('Kodoway : erreur de rendu de l\'aperçu.', e);
  }
}

// Met tout le code sur une seule "forme" : espaces/tabulations/retours à la
// ligne réduits à un seul espace. Ça rend la vérification beaucoup plus
// tolérante à la façon dont chacun écrit son code (plusieurs lignes,
// indentation, espaces en trop...).
function kodowayNormalize(code) {
  return code.trim().toLowerCase().replace(/\s+/g, ' ');
}

// ===========================================================
// Système d'exercice de leçon (un seul exercice par page, par id)
// ===========================================================

try {

const exerciseConfig = window.KODOWAY_EXERCISE || null;

// --- Aperçu automatique de l'exemple de la leçon ---
const examplePreview = document.getElementById('examplePreview');
if (examplePreview && exerciseConfig && exerciseConfig.example !== undefined) {
  kodowayRenderPreview(examplePreview, exerciseConfig.example, {
    type: exerciseConfig.type,
    demoHTML: exerciseConfig.demoHTML,
    prelude: exerciseConfig.examplePrelude,
    postlude: exerciseConfig.examplePostlude
  });
}

// --- Vérification de l'exercice + aperçu en direct du code de l'utilisateur ---
const checkBtn = document.getElementById('checkBtn');
const exerciseInput = document.getElementById('exerciseInput');
const feedback = document.getElementById('feedback');
const exercisePreview = document.getElementById('exercisePreview');

const DEFAULT_EXERCISE_CONFIG = {
  pattern: /<h1[^>]*>\s*mon\s+premier\s+titre\s*<\/h1>/,
  success: '✅ Bravo, c\'est correct !',
  error: '❌ Pas encore... réessaie.'
};

function kodowayUpdateExercisePreview() {
  if (!exercisePreview || !exerciseInput) return;
  const config = exerciseConfig || DEFAULT_EXERCISE_CONFIG;
  kodowayRenderPreview(exercisePreview, exerciseInput.value, {
    type: config.type,
    demoHTML: config.demoHTML,
    prelude: config.prelude,
    postlude: config.postlude
  });
}

if (checkBtn && exerciseInput && feedback) {
  // Aperçu live : se met à jour pendant la frappe, avec un petit
  // débounce pour ne pas reconstruire l'iframe à chaque caractère.
  let kodowayPreviewTimer = null;
  exerciseInput.addEventListener('input', function () {
    if (kodowayPreviewTimer) clearTimeout(kodowayPreviewTimer);
    kodowayPreviewTimer = setTimeout(kodowayUpdateExercisePreview, 350);
  });

  // Aperçu initial (textarea déjà pré-remplie, ou vide)
  kodowayUpdateExercisePreview();

  checkBtn.addEventListener('click', function () {
    try {
      const rawCode = exerciseInput.value;
      const normalizedCode = kodowayNormalize(rawCode);
      const config = exerciseConfig || DEFAULT_EXERCISE_CONFIG;

      // On force aussi l'aperçu à jour tout de suite au clic
      // (utile si le débounce n'a pas encore eu le temps de passer).
      kodowayUpdateExercisePreview();

      if (!config.pattern || typeof config.pattern.test !== 'function') {
        throw new Error('Configuration d\'exercice invalide (pattern manquant).');
      }

      const isCorrect = config.pattern.test(normalizedCode);

      feedback.classList.remove('is-success', 'is-error');
      if (isCorrect) {
        feedback.textContent = config.success || '✅ Bravo, c\'est correct !';
        feedback.classList.add('is-success');
      } else {
        feedback.textContent = config.error || '❌ Pas encore... réessaie.';
        feedback.classList.add('is-error');
      }
    } catch (err) {
      console.error('Kodoway : erreur dans la vérification de l\'exercice.', err);
      feedback.textContent = '⚠️ Une erreur est survenue (regarde la console F12 pour le détail).';
      feedback.classList.remove('is-success', 'is-error'); feedback.classList.add('is-error');
    }
  });
} else if (document.querySelector('.exercise-box')) {
  console.warn('Kodoway : élément(s) manquant(s) pour l\'exercice (vérifie les id checkBtn / exerciseInput / feedback).', { checkBtn: checkBtn, exerciseInput: exerciseInput, feedback: feedback });
}

} catch (e) {
  console.error('Kodoway : erreur globale dans le système d\'exercice.', e);
}

// ===========================================================
// Défis combinés (page Exercices) : plusieurs par page, chacun
// avec sa propre config en JSON (évite les soucis d'id en double).
// ===========================================================

try {
  const challengeBoxes = document.querySelectorAll('.challenge-box');

  challengeBoxes.forEach(function (box) {
    const configEl = box.querySelector('.challenge-config');
    const input = box.querySelector('.challenge-input');
    const checkBtn = box.querySelector('.challenge-check');
    const feedback = box.querySelector('.challenge-feedback');
    const preview = box.querySelector('.challenge-preview');

    if (!configEl || !input || !checkBtn || !feedback) {
      console.warn('Kodoway : défi incomplet, élément(s) manquant(s).', box);
      return;
    }

    let config;
    try {
      config = JSON.parse(configEl.textContent);
      config.pattern = new RegExp(config.pattern);
    } catch (e) {
      console.error('Kodoway : configuration de défi invalide (JSON ou regex).', e);
      feedback.textContent = '⚠️ Ce défi est mal configuré (voir la console F12).';
      feedback.classList.remove('is-success', 'is-error'); feedback.classList.add('is-error');
      return;
    }

    function updatePreview() {
      if (preview) {
        kodowayRenderPreview(preview, input.value, {
          type: config.type,
          demoHTML: config.demoHTML,
          prelude: config.prelude,
          postlude: config.postlude
        });
      }
    }

    let timer = null;
    input.addEventListener('input', function () {
      if (timer) clearTimeout(timer);
      timer = setTimeout(updatePreview, 350);
    });
    updatePreview();

    checkBtn.addEventListener('click', function () {
      try {
        updatePreview();
        const isCorrect = config.pattern.test(kodowayNormalize(input.value));
        feedback.textContent = isCorrect ? (config.success || '✅ Bravo, c\'est correct !') : (config.error || '❌ Pas encore... réessaie.');
        feedback.classList.remove('is-success', 'is-error');
        feedback.classList.add(isCorrect ? 'is-success' : 'is-error');
      } catch (err) {
        console.error('Kodoway : erreur de vérification du défi.', err);
        feedback.textContent = '⚠️ Une erreur est survenue (regarde la console F12).';
        feedback.classList.remove('is-success', 'is-error'); feedback.classList.add('is-error');
      }
    });
  });
} catch (e) {
  console.error('Kodoway : erreur globale dans les défis de la page Exercices.', e);
}

// --- Formulaire de contact (page Contact, s'il existe) ---
try {
// Envoi réel via FormSubmit (service gratuit, sans backend à héberger).
// ⚠️ Première soumission : FormSubmit envoie un email de confirmation à
// l'adresse de destination ; il faut cliquer une seule fois sur "Activate
// Form" dans cet email avant que les messages suivants arrivent normalement.
const contactForm = document.getElementById('contactForm');
const contactFeedback = document.getElementById('contactFeedback');
const CONTACT_EMAIL_DESTINATION = 'believemukengeshayi1@gmail.com';

if (contactForm && contactFeedback) {
  contactForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Envoi en cours...';
    }
    contactFeedback.textContent = '';
    contactFeedback.className = 'feedback';

    const payload = {
      name: contactForm.querySelector('#contactName') ? contactForm.querySelector('#contactName').value : '',
      email: contactForm.querySelector('#contactEmail') ? contactForm.querySelector('#contactEmail').value : '',
      message: contactForm.querySelector('#contactMessage') ? contactForm.querySelector('#contactMessage').value : '',
      _subject: 'Nouveau message depuis Kodoway',
      _captcha: 'false',
      _template: 'table'
    };

    fetch('https://formsubmit.co/ajax/' + CONTACT_EMAIL_DESTINATION, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Réponse HTTP ' + response.status);
        return response.json();
      })
      .then(function () {
        contactFeedback.textContent = '✅ Message envoyé ! Tu auras une réponse par email.';
        contactFeedback.className = 'feedback is-success';
        contactForm.reset();
      })
      .catch(function (err) {
        console.error('Kodoway : erreur lors de l\'envoi du formulaire.', err);
        contactFeedback.textContent = '❌ L\'envoi a échoué. Réessaie, ou écris directement à ' + CONTACT_EMAIL_DESTINATION + '.';
        contactFeedback.className = 'feedback is-error';
      })
      .finally(function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      });
  });
}

} catch (e) {
  console.error('Kodoway : erreur globale dans le formulaire de contact.', e);
}
