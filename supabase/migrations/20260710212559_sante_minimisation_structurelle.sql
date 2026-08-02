-- Défense en profondeur : l'application passe déjà p_reponses = {}, mais la RPC
-- stockait ce qu'on lui donnait. On force '{}' au niveau de la base : le détail des
-- réponses au questionnaire de santé (donnée art. 9 RGPD) ne peut plus être conservé,
-- quel que soit l'appelant. Seuls le résultat, la signature et la date subsistent.
create or replace function public.enregistrer_questionnaire_sante(p_adhesion_id uuid, p_type text, p_date_naissance date, p_reponses jsonb, p_resultat text, p_signataire_nom text, p_signataire_qualite text, p_signature text)
 returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare v_org uuid; v_adherent uuid; v_id uuid;
begin
  select organisation_id, adherent_id into v_org, v_adherent from public.adhesions where id = p_adhesion_id;
  if v_org is null then raise exception 'adhesion introuvable'; end if;

  insert into public.questionnaires_sante(organisation_id, adherent_id, adhesion_id, type, date_naissance, reponses, resultat, signataire_nom, signataire_qualite, signature)
  values (v_org, v_adherent, p_adhesion_id, p_type, p_date_naissance,
          '{}'::jsonb,  -- jamais le détail des réponses, même si l'appelant en fournit
          p_resultat, p_signataire_nom, coalesce(nullif(p_signataire_qualite,''),'adherent'), p_signature)
  returning id into v_id;

  if p_resultat = 'certificat_requis' and v_adherent is not null then
    insert into public.pieces_adherent(organisation_id, adherent_id, cle, label, statut)
    select v_org, v_adherent, 'certificat_medical', 'Certificat médical', 'manquante'
    where not exists (select 1 from public.pieces_adherent pa where pa.adherent_id = v_adherent and pa.cle = 'certificat_medical');
  end if;

  return v_id;
end;
$function$;