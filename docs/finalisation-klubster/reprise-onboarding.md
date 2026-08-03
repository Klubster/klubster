# Reprise — lot onboarding (PR #14)

Branche : `feat/onboarding-frictions`, ouverte depuis `main`. Worktree : `/tmp/klb-onboarding`.

## Livré

Traduction des erreurs d'authentification (repli générique sur l'inconnu), écran
`/sans-club` à la place de la 404 pour un compte connecté sans club, CTA
« VOIR LE CLUB USM BOXE » vers la vraie vitrine sur la page du premier club.
Captures dans `docs/onboarding-captures/`. Tests, build, typecheck, lint verts.

## Blocage à lever avant de reprendre

La première inscription publique n'a pas pu aboutir sur la base de développement :
`signUp` renvoie `over_email_send_rate_limit` (429). Le projet gratuit utilise le SMTP
intégré de Supabase (quelques emails par heure) et la confirmation d'email est active.
Deux issues, au choix :

1. Dashboard Supabase du projet de dev → Authentication → Sign In / Providers → Email →
   décocher « Confirm email », puis rejouer `/{club}/inscription`.
2. Attendre la fin de la fenêtre de quota et rejouer immédiatement (une tentative
   par créneau).

Le reste du parcours (compte → club → cours → créneau → tarif → publication → vitrine)
est exercé et capturé. Reste à prouver : formulaire d'inscription validé, dossier reçu
dans le cockpit, statut cohérent, modification ultérieure des informations.

## Environnement

Voir `docs/finalisation-klubster/reprise.md` sur la branche `fix/roles-attribuables`
(projet Supabase de dev, comptes fictifs, `.env.test.local` non versionné).
