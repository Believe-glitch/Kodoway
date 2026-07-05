// Script principal de Kodoway

// Permet de savoir si ce fichier s'est bien chargé (utilisé plus bas dans
// chaque page, pour afficher un message si jamais ça plante)
window.scriptCharge = true;

// --- Menu mobile (le bouton à 3 traits en haut à droite) ---
try {
  var boutonMenu = document.getElementById('boutonMenu');
  var menuNav = document.getElementById('menuNav');
  var fondMenu = document.getElementById('fondMenu');

  function fermerMenu() {
    if (menuNav) menuNav.classList.remove('ouvert');
    if (boutonMenu) boutonMenu.classList.remove('actif');
    if (boutonMenu) boutonMenu.setAttribute('aria-expanded', 'false');
    if (fondMenu) fondMenu.classList.remove('ouvert');
  }

  if (boutonMenu && menuNav) {
    boutonMenu.addEventListener('click', function () {
      var estOuvert = menuNav.classList.toggle('ouvert');
      boutonMenu.classList.toggle('actif', estOuvert);
      boutonMenu.setAttribute('aria-expanded', String(estOuvert));
      if (fondMenu) fondMenu.classList.toggle('ouvert', estOuvert);
    });

    if (fondMenu) fondMenu.addEventListener('click', fermerMenu);
    menuNav.querySelectorAll('a').forEach(function (lien) {
      lien.addEventListener('click', fermerMenu);
    });
  }
} catch (e) {
  console.error('Erreur dans le menu mobile :', e);
}

// --- Petite animation d'apparition des cartes/étapes au scroll ---
// Tout est visible par défaut dans le CSS. C'est ici qu'on ajoute la classe
// .cache-au-debut juste avant de surveiller le scroll, pour être sûr que si
// ce script ne tourne pas pour une raison ou une autre, rien ne disparaît.
var elementsAAnimer = document.querySelectorAll('.carte, .etape');

if ('IntersectionObserver' in window && elementsAAnimer.length) {
  elementsAAnimer.forEach(function (el) { el.classList.add('cache-au-debut'); });

  var observateur = new IntersectionObserver(function (entrees) {
    entrees.forEach(function (entree) {
      if (entree.isIntersecting) {
        entree.target.classList.add('visible');
        observateur.unobserve(entree.target);
      }
    });
  }, { threshold: 0.15 });

  elementsAAnimer.forEach(function (el) { observateur.observe(el); });
}

// =====================================================
// Tout ce qui suit sert à construire les aperçus en direct
// (les petites fenêtres qui montrent le résultat du code)
// =====================================================

var styleDeBase = [
  "body { font-family: 'Inter', system-ui, sans-serif; background: #ffffff; color: #15192B; padding: 18px; margin: 0; line-height: 1.5; }",
  "button { font-family: inherit; padding: 8px 16px; border-radius: 8px; border: 1px solid #cbd2e0; background: #f4f6fb; cursor: pointer; font-size: 0.9rem; }",
  "a { color: #2952FF; }",
  "#console-kodoway { margin-top: 14px; font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; color: #344; white-space: pre-wrap; border-top: 1px dashed #ddd; padding-top: 10px; min-height: 1.2em; }"
].join(' ');

// Construit le petit document HTML complet qui va dans l'iframe d'aperçu.
// Le "type" change la façon dont on traite le code : pour du HTML on l'injecte
// tel quel, pour du CSS on l'ajoute dans un <style>, et pour du JS on capture
// les console.log() pour les afficher à l'écran (sinon on ne verrait rien).
function construireApercu(code, options) {
  options = options || {};
  var type = options.type || 'html';
  var demo = options.demoHTML || '';
  var avant = options.avant || '';
  var apres = options.apres || '';
  var codeSur = (code === undefined || code === null) ? '' : code;

  if (type === 'css') {
    return '<!DOCTYPE html><html><head><style>' + styleDeBase + '</style><style>' + codeSur + '</style></head><body>' + demo + '</body></html>';
  }

  if (type === 'js') {
    return '<!DOCTYPE html><html><head><style>' + styleDeBase + '</style></head><body>' +
      demo +
      '<div id="console-kodoway"></div>' +
      '<script>' +
      'var sortie = document.getElementById("console-kodoway");' +
      'console.log = function() {' +
      '  var args = Array.prototype.slice.call(arguments);' +
      '  var ligne = args.map(function(a){ return (typeof a === "object") ? JSON.stringify(a) : String(a); }).join(" ");' +
      '  sortie.textContent += (sortie.textContent ? "\\n" : "") + ligne;' +
      '};' +
      'try {' +
      avant + ';' +
      codeSur + ';' +
      apres + ';' +
      '} catch (e) {' +
      '  sortie.textContent += (sortie.textContent ? "\\n" : "") + "Erreur : " + e.message;' +
      '}' +
      '<\/script>' +
      '</body></html>';
  }

  // par défaut : type html, le code peut lui-même contenir <style> et <script>
  return '<!DOCTYPE html><html><head><style>' + styleDeBase + '</style></head><body>' + codeSur + '</body></html>';
}

function afficherApercu(iframe, code, options) {
  if (!iframe) return;
  try {
    iframe.srcdoc = construireApercu(code, options);
  } catch (e) {
    console.error('Erreur en affichant un aperçu :', e);
  }
}

// Aplatit le code (espaces, tabulations, retours à la ligne) en un seul
// espace, et passe tout en minuscules. Ça rend la correction des exercices
// beaucoup plus souple : peu importe comment chacun indente ou met ses espaces.
function nettoyerCode(code) {
  return code.trim().toLowerCase().replace(/\s+/g, ' ');
}

// =====================================================
// Exercice de la leçon (un seul par page de cours)
// =====================================================

var configExercice = window.exerciceActuel || null;

var configParDefaut = {
  motif: /<h1[^>]*>\s*mon\s+premier\s+titre\s*<\/h1>/,
  succes: 'Bravo, c\'est correct !',
  erreur: 'Pas encore... réessaie.'
};

var apercuExemple = document.getElementById('apercuExemple');
if (apercuExemple && configExercice && configExercice.exemple !== undefined) {
  afficherApercu(apercuExemple, configExercice.exemple, {
    type: configExercice.type,
    demoHTML: configExercice.demoHTML,
    avant: configExercice.exempleAvant,
    apres: configExercice.exempleApres
  });
}

var boutonVerifier = document.getElementById('boutonVerifier');
var zoneCode = document.getElementById('zoneCode');
var resultat = document.getElementById('resultat');
var apercuExercice = document.getElementById('apercuExercice');

function mettreAJourApercu() {
  if (!apercuExercice || !zoneCode) return;
  var config = configExercice || configParDefaut;
  afficherApercu(apercuExercice, zoneCode.value, {
    type: config.type,
    demoHTML: config.demoHTML,
    avant: config.avant,
    apres: config.apres
  });
}

if (boutonVerifier && zoneCode && resultat) {
  // l'aperçu se met à jour pendant qu'on écrit, avec un petit délai pour
  // ne pas reconstruire l'iframe à chaque lettre tapée
  var minuteurApercu = null;
  zoneCode.addEventListener('input', function () {
    if (minuteurApercu) clearTimeout(minuteurApercu);
    minuteurApercu = setTimeout(mettreAJourApercu, 350);
  });

  mettreAJourApercu();

  boutonVerifier.addEventListener('click', function () {
    try {
      var code = nettoyerCode(zoneCode.value);
      var config = configExercice || configParDefaut;

      mettreAJourApercu();

      if (!config.motif || typeof config.motif.test !== 'function') {
        throw new Error('La config de cet exercice n\'a pas de motif valide.');
      }

      var bonneReponse = config.motif.test(code);

      resultat.classList.remove('reussi', 'echec');
      if (bonneReponse) {
        resultat.textContent = config.succes || 'Bravo, c\'est correct !';
        resultat.classList.add('reussi');
      } else {
        resultat.textContent = config.erreur || 'Pas encore... réessaie.';
        resultat.classList.add('echec');
      }
    } catch (e) {
      console.error('Erreur en vérifiant l\'exercice :', e);
      resultat.textContent = 'Une erreur est survenue (regarde la console, touche F12).';
      resultat.classList.remove('reussi', 'echec');
      resultat.classList.add('echec');
    }
  });
} else if (document.querySelector('.bloc-exercice')) {
  console.warn('Un élément manque pour faire fonctionner cet exercice (boutonVerifier / zoneCode / resultat).');
}

// =====================================================
// Les défis de la page Exercices : ici il peut y en avoir
// plusieurs sur la même page, chacun avec sa propre config
// =====================================================

var blocsDefi = document.querySelectorAll('.bloc-defi');

blocsDefi.forEach(function (bloc) {
  var configJSON = bloc.querySelector('.defi-config');
  var champ = bloc.querySelector('.defi-zone-code');
  var bouton = bloc.querySelector('.defi-verifier');
  var zoneResultat = bloc.querySelector('.defi-resultat');
  var apercu = bloc.querySelector('.defi-apercu');

  if (!configJSON || !champ || !bouton || !zoneResultat) {
    console.warn('Un défi est incomplet (il manque un élément).', bloc);
    return;
  }

  var config;
  try {
    config = JSON.parse(configJSON.textContent);
    config.motif = new RegExp(config.motif);
  } catch (e) {
    console.error('La config JSON de ce défi est invalide :', e);
    zoneResultat.textContent = 'Ce défi est mal configuré (regarde la console).';
    zoneResultat.classList.remove('reussi', 'echec');
    zoneResultat.classList.add('echec');
    return;
  }

  function rafraichirApercuDefi() {
    if (apercu) {
      afficherApercu(apercu, champ.value, {
        type: config.type,
        demoHTML: config.demoHTML,
        avant: config.avant,
        apres: config.apres
      });
    }
  }

  var minuteurDefi = null;
  champ.addEventListener('input', function () {
    if (minuteurDefi) clearTimeout(minuteurDefi);
    minuteurDefi = setTimeout(rafraichirApercuDefi, 350);
  });
  rafraichirApercuDefi();

  bouton.addEventListener('click', function () {
    try {
      rafraichirApercuDefi();
      var bonneReponse = config.motif.test(nettoyerCode(champ.value));
      zoneResultat.textContent = bonneReponse ? (config.succes || 'Bravo, c\'est correct !') : (config.erreur || 'Pas encore... réessaie.');
      zoneResultat.classList.remove('reussi', 'echec');
      zoneResultat.classList.add(bonneReponse ? 'reussi' : 'echec');
    } catch (e) {
      console.error('Erreur en vérifiant ce défi :', e);
      zoneResultat.textContent = 'Une erreur est survenue (regarde la console).';
      zoneResultat.classList.remove('reussi', 'echec');
      zoneResultat.classList.add('echec');
    }
  });
});

// =====================================================
// Formulaire de contact -> envoyé via FormSubmit (gratuit,
// pas besoin d'avoir un serveur derrière)
// =====================================================
//
// Important : la 1ère fois que quelqu'un envoie ce formulaire, FormSubmit
// envoie un mail "Activate Form" à l'adresse ci-dessous. Il faut cliquer une
// fois sur le lien dans ce mail, et après ça tous les messages arrivent
// normalement.

var EMAIL_DESTINATAIRE = 'believemukengeshayi1@gmail.com';
var formulaireContact = document.getElementById('formulaireContact');
var resultatContact = document.getElementById('resultatContact');

if (formulaireContact && resultatContact) {
  formulaireContact.addEventListener('submit', function (e) {
    e.preventDefault();

    var boutonEnvoyer = formulaireContact.querySelector('button[type="submit"]');
    var texteBoutonOriginal = boutonEnvoyer ? boutonEnvoyer.textContent : '';
    if (boutonEnvoyer) {
      boutonEnvoyer.disabled = true;
      boutonEnvoyer.textContent = 'Envoi en cours...';
    }
    resultatContact.textContent = '';
    resultatContact.className = 'resultat';

    // Note : les clés "name" et "email" doivent rester exactement comme ça,
    // FormSubmit s'en sert pour savoir à quelle adresse répondre.
    var donnees = {
      name: formulaireContact.querySelector('#nomContact') ? formulaireContact.querySelector('#nomContact').value : '',
      email: formulaireContact.querySelector('#emailContact') ? formulaireContact.querySelector('#emailContact').value : '',
      message: formulaireContact.querySelector('#messageContact') ? formulaireContact.querySelector('#messageContact').value : '',
      _subject: 'Nouveau message depuis Kodoway',
      _captcha: 'false',
      _template: 'table'
    };

    fetch('https://formsubmit.co/ajax/' + EMAIL_DESTINATAIRE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(donnees)
    })
      .then(function (reponse) {
        if (!reponse.ok) throw new Error('Réponse HTTP ' + reponse.status);
        return reponse.json();
      })
      .then(function () {
        resultatContact.textContent = 'Message envoyé ! Tu auras une réponse par email.';
        resultatContact.className = 'resultat reussi';
        formulaireContact.reset();
      })
      .catch(function (e) {
        console.error('Erreur en envoyant le formulaire :', e);
        resultatContact.textContent = 'L\'envoi a échoué. Réessaie, ou écris directement à ' + EMAIL_DESTINATAIRE + '.';
        resultatContact.className = 'resultat echec';
      })
      .finally(function () {
        if (boutonEnvoyer) {
          boutonEnvoyer.disabled = false;
          boutonEnvoyer.textContent = texteBoutonOriginal;
        }
      });
  });
}
