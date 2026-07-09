# Klubster — corrections à valider

**9 juillet 2026.** Liste établie après l'audit complet et une journée de correctifs.
Coche ce que tu valides ; je m'en occupe à ton retour. Rien ne sera fait sans ton accord.

---

## Ce qui bloque encore, à décider en premier

**1. Autoriser les URL de redirection dans Supabase.**
Ajouter `https://klubster.fr/**` dans Authentication → URL Configuration → Redirect URLs, et vérifier que Site URL vaut `https://klubster.fr`.
*Pourquoi c'est le plus urgent :* sans ce réglage, **aucun lien d'email ne ramène où il devrait**. La réinitialisation de mot de passe renvoie à l'accueil — je l'ai constaté sur ton propre compte. La confirmation d'inscription de tes adhérents est probablement cassée de la même façon, et personne ne s'en est aperçu.
Seul toi peux le faire (droits propriétaire). Deux minutes.

**2. L'USM Boxe n'a aucun administrateur.**
Aucun profil n'est rattaché à ton vrai club, ses 312 adhérents. Personne ne peut éditer sa vitrine ni ouvrir son cockpit.
→ Je rattache un compte existant, ou tu me dis lequel.

**3. Neuf associations en base, toutes publiées.**
`sdqsd`, `testclub`, `testassociation`, `testmathieulatelierdufinancementfr`, `test`, `clubdemoklubster` sont en ligne et dans ton `sitemap.xml`, donc offertes à Google.
→ Je dépublie ? Je supprime ? Lesquelles garder ?

**4. Trois adhérents et deux chapitres de test créés par moi.**
Je les efface dès que tu me le dis.

---

## Sécurité (à finir)

**5. Réglages d'authentification Supabase** — bloqués par tes droits, pas par la technique.
Authentication → Sign In / Providers → Email :
« Secure password change », « Require current password when updating », et longueur minimale à 8.
*Note :* la protection anti-mots de passe compromis n'est **pas** disponible en plan gratuit — l'avertissement de sécurité de Supabase ne le précisait pas.
Si tu passes la longueur à 8, il faudra corriger le texte « 6 caractères minimum » du formulaire d'inscription. Je m'en charge.

**6. Galerie photos : la limite de 4 Mo sera dépassée.**
Huit images acceptées, 3 Mo chacune : le total crèvera le plafond des Server Actions et l'ajout échouera silencieusement — le même défaut que celui corrigé aujourd'hui, à un autre endroit.
→ Correctif propre : envoyer les fichiers directement vers Supabase depuis le navigateur.

---

## Produit — bugs confirmés

**7. `?chapitre=photo-gauche` affiche la bibliothèque au lieu du formulaire.**
Le lien direct ne reconnaît pas ce type. Sans gravité, vite corrigé.

**8. Le questionnaire de santé n'a jamais été testé.**
Trois questionnaires en base pour 315 adhérents. C'est le chemin le plus sensible du produit : donnée de santé, signature, mineur, responsable légal.
→ À dérouler à la main, une fois, sérieusement.

**9. Le paiement Stripe n'a jamais été testé de bout en bout.**
En particulier `invoice.payment_succeeded` : si le webhook n'est pas écouté, **les échéances 2 et 3 du paiement en 3 fois ne sont jamais enregistrées**. Un club croirait avoir été payé.
→ Test en mode test Stripe, carte 4242.

---

## Marque et conversion

**10. Preuve sociale : il n'y en a aucune.**
Un seul club réel, le tien. Pas de témoignage, pas de logo, rien. Ne rien inventer — mais DreamBoxe et Le triangle sont inscrites : une phrase d'elles vaudrait plus que dix arguments.

**11. Pas d'essai gratuit, pas de démonstration atteignable sur mobile.**
Le lien « Un club » est maintenant dans le menu mobile, mais rien ne dit au visiteur qu'il peut regarder avant de payer.

**12. Le curseur `_` clignote sans fin.** Tu as dit de le garder. Noté, je n'y touche pas.

---

## Performance (optionnel, ta décision de DA)

**13. Recompresser les six photos de la home.**
Elles font ~400 Ko chacune ; on descendrait sous 150 Ko. Le chargement est déjà passé de 4 168 ms à 1 596 ms grâce à `next/image`, mais le gain par image plafonne à 26 % parce que les sources sont déjà compressées.
→ Je te montre une photo avant/après avant de toucher aux autres. **Rien sans ton œil.**

---

## Ce qui est déjà fait aujourd'hui, pour mémoire

Sécurité : trois failles critiques fermées (fausses cotisations payées, garde d'autorisation contournée par la logique NULL de SQL, destruction anonyme des questionnaires de santé) ; **zéro RPC exécutable par `anon`** ; webhook Stripe idempotent et anti-rejeu ; `/admin` en 404 ; Turnstile actif sur l'inscription.

Produit : ajout de chapitre avec photo **réparé** (limite de 1 Mo des Server Actions — aucune photo n'avait jamais atteint le serveur depuis la création de Klubster) ; mot de passe oublié **créé** (il n'existait pas) ; export CSV des adhérents **créé** (il n'existait pas, alors que les CGV le promettaient) ; confirmations explicites en mode édition ; zones éditables mises en valeur ; champs inutiles grisés.

Front : menu mobile ; contrastes WCAG AA ; OpenGraph, canonical, favicon, robots, sitemap, JSON-LD ; polices auto-hébergées.

Légal : CGV alignées sur les tarifs ; Resend et Cloudflare déclarés sous-traitants ; discours « hébergé dans l'UE » corrigé.

---

## Une erreur de méthode, pour être honnête

J'ai diagnostiqué trois fois de suite la mauvaise cause sur l'ajout de chapitre — RLS, puis tes droits, puis la taille des photos — avant de comprendre que tu testais dans une autre fenêtre que celle que je pilote. J'aurais dû te demander d'ouvrir ta session chez moi dès le premier « ça ne marche pas ». Tes trois signalements étaient exacts ; c'est ma méthode qui était lente.

J'ai aussi affirmé qu'un bug `Reveal` était reproduit alors que ma reproduction était un artefact de mon outil, et j'ai recopié une clé Cloudflare depuis une capture d'écran en confondant un `O` et un zéro. Les deux sont corrigés et documentés dans le rapport d'audit.
