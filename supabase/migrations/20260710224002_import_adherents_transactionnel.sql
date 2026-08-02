-- Import atomique : l'ancien code insérait les adhérents puis les adhésions en deux
-- requêtes ; un échec de la seconde laissait des adhérents orphelins. Une fonction
-- plpgsql s'exécute dans une seule transaction : tout est créé, ou rien ne l'est.
-- La déduplication reste côté serveur (déjà testée) ; la RPC ne fait que l'écriture.
create or replace function public.inserer_adherents_adhesions(p_org uuid, p_rows jsonb)
 returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare r jsonb; v_adh uuid; v_count int := 0; v_cours uuid; v_montant int;
begin
  if not (coalesce(p_org = current_org_id(), false) or coalesce(is_super_admin(), false)) then
    raise exception 'Non autorisé.';
  end if;

  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    insert into adherents (organisation_id, prenom, nom, email, telephone)
    values (p_org,
            left(trim(r->>'prenom'), 80), left(trim(r->>'nom'), 80),
            nullif(trim(coalesce(r->>'email','')), ''),
            nullif(trim(coalesce(r->>'telephone','')), ''))
    returning id into v_adh;
    v_count := v_count + 1;

    v_cours := nullif(r->>'cours_id','')::uuid;
    if v_cours is not null then
      -- le tarif vient de la base, jamais du client ; cours filtré par organisation
      select tarif_centimes into v_montant from cours where id = v_cours and organisation_id = p_org;
      if v_montant is not null then
        insert into adhesions (organisation_id, adherent_id, cours_id, saison, montant_centimes, statut)
        values (p_org, v_adh, v_cours, '2025-2026', v_montant, 'en_attente');
      end if;
    end if;
  end loop;

  return v_count;
end;
$function$;

revoke all on function public.inserer_adherents_adhesions(uuid, jsonb) from public, anon;
grant execute on function public.inserer_adherents_adhesions(uuid, jsonb) to authenticated, service_role;