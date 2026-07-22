"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker et rend ses mises à jour invisibles.
 *
 * Le service worker s'active immédiatement (skipWaiting) ; côté page, on écoute la prise
 * de contrôle par une nouvelle version et on recharge en silence. Le garde `avaitControle`
 * évite un rechargement à la toute première installation (il n'y a alors rien à
 * remplacer) : on ne recharge que lorsqu'une version PRÉCÉDENTE cède la place à une
 * nouvelle. L'utilisateur ne voit jamais de bandeau « mettre à jour ».
 */
export default function PWAUpdater() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const avaitControle = !!navigator.serviceWorker.controller;
    let rechargement = false;

    // Une mise à jour ne doit jamais recharger la page alors que quelqu'un remplit un
    // formulaire (inscription, message, règlement, édition du site) : il perdrait sa
    // saisie. On repère une saisie en cours, et dans ce cas on diffère le rechargement à
    // la fermeture/navigation suivante plutôt que de l'imposer.
    const saisieEnCours = () => {
      const a = document.activeElement as HTMLElement | null;
      if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT" || a.isContentEditable)) {
        return true;
      }
      // Un champ modifié mais plus focalisé compte aussi comme travail en cours.
      return document.querySelector<HTMLInputElement>("input[data-modifie], textarea[data-modifie]") != null;
    };
    const marquerModifie = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) t.setAttribute("data-modifie", "1");
    };
    document.addEventListener("input", marquerModifie, true);

    const recharger = () => {
      if (rechargement) return;
      rechargement = true;
      window.location.reload();
    };
    const surChangement = () => {
      // Uniquement s'il y avait déjà une version en place : c'est une mise à jour, pas
      // une première installation.
      if (!avaitControle) return;
      if (saisieEnCours()) {
        // On attend que la personne quitte la page (ou change d'onglet) pour appliquer.
        window.addEventListener("pagehide", recharger, { once: true });
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "hidden") recharger();
        }, { once: true });
        return;
      }
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
      if (intervalle) clearInterval(intervalle);
    };
  }, []);

  return null;
}
