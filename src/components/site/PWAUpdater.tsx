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

    const surChangement = () => {
      if (rechargement) return;
      rechargement = true;
      // Uniquement s'il y avait déjà une version en place : c'est une mise à jour, pas
      // une première installation.
      if (avaitControle) window.location.reload();
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
      if (intervalle) clearInterval(intervalle);
    };
  }, []);

  return null;
}
