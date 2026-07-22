"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker et applique ses mises à jour sans jamais faire perdre une
 * saisie.
 *
 * Le service worker s'active immédiatement (skipWaiting). Quand une nouvelle version prend
 * le contrôle :
 *   — page inactive (aucune saisie en cours) → on recharge en silence, la mise à jour est
 *     invisible ;
 *   — saisie en cours → on NE recharge PAS. On laisse la version actuelle terminer la
 *     session ; le nouveau service worker étant déjà actif, la PROCHAINE navigation
 *     (envoi du formulaire, clic sur un lien, ouverture d'une autre page) chargera d'
 *     elle-même la nouvelle version.
 *
 * On ne recharge jamais sur un changement de visibilité ou un `pagehide` : changer d'
 * onglet pendant un formulaire cachait la page et déclenchait le rechargement, effaçant
 * la saisie au retour (4e audit). Le garde `avaitControle` évite tout rechargement à la
 * première installation (rien à remplacer).
 */
export default function PWAUpdater() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const avaitControle = !!navigator.serviceWorker.controller;
    let rechargement = false;

    // Repère une saisie en cours : champ focalisé (input/textarea/select/contenteditable)
    // ou champ modifié même s'il n'a plus le focus. `select` et `contenteditable` sont
    // désormais couverts (ils échappaient à la détection — 4e audit).
    const saisieEnCours = () => {
      const a = document.activeElement as HTMLElement | null;
      if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT" || a.isContentEditable)) {
        return true;
      }
      return document.querySelector("[data-modifie]") != null;
    };
    const marquerModifie = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      // `input` couvre input/textarea/contenteditable ; `change` couvre les <select>.
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable) {
        t.setAttribute("data-modifie", "1");
      }
    };
    document.addEventListener("input", marquerModifie, true);
    document.addEventListener("change", marquerModifie, true);

    const recharger = () => {
      if (rechargement) return;
      rechargement = true;
      window.location.reload();
    };
    const surChangement = () => {
      // Uniquement s'il y avait déjà une version en place : c'est une mise à jour, pas
      // une première installation.
      if (!avaitControle) return;
      // Saisie en cours : on ne force RIEN. La nouvelle version s'appliquera à la
      // prochaine navigation, sans perte de données.
      if (saisieEnCours()) return;
      recharger();
    };
    navigator.serviceWorker.addEventListener("controllerchange", surChangement);

    let intervalle: ReturnType<typeof setInterval> | undefined;
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // On demande une vérification de version au chargement, puis chaque heure : dès
        // qu'un nouveau déploiement existe, il est récupéré et activé sans intervention.
        reg.update();
        intervalle = setInterval(() => reg.update(), 60 * 60 * 1000);
      })
      .catch(() => {
        /* enregistrement impossible (navigation privée, etc.) : l'app fonctionne sans. */
      });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", surChangement);
      document.removeEventListener("input", marquerModifie, true);
      document.removeEventListener("change", marquerModifie, true);
      if (intervalle) clearInterval(intervalle);
    };
  }, []);

  return null;
}
