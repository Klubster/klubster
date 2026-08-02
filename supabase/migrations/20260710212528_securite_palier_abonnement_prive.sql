-- palier_abonnement(p_org) n'était protégée par aucun contrôle d'organisation : un
-- utilisateur pouvait deviner la tranche d'effectif de n'importe quel club. La fonction
-- n'est appelée nulle part côté application (le palier est calculé en TypeScript).
-- On la retire du rôle authenticated ; seul le serveur (service_role) peut l'appeler.
revoke execute on function public.palier_abonnement(uuid) from authenticated, public, anon;