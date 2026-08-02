-- FAILLE 1 : le trigger tirait le rôle des métadonnées contrôlées par le client.
-- Un appel direct à l'API signUp (clé anon publique) pouvait injecter role='super_admin'.
-- On force 'adherent' à la création. Les présidents légitimes sont promus 'admin_asso'
-- par create_club (SECURITY DEFINER) au moment de créer leur club.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, prenom, nom, role)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'prenom', ''),
    nullif(new.raw_user_meta_data->>'nom', ''),
    'adherent'  -- jamais tiré des métadonnées client
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- FAILLE 2 : authenticated avait UPDATE sur toutes les colonnes de profiles, dont role
-- et organisation_id. La politique RLS ne restreint que la ligne, pas les colonnes.
-- Un utilisateur pouvait donc s'auto-promouvoir super_admin ou changer d'organisation.
-- On retire toute écriture directe, et on ne rend modifiables que prenom et nom.
revoke insert, update, delete on public.profiles from authenticated;
revoke insert, update, delete, select on public.profiles from anon;
grant update (prenom, nom) on public.profiles to authenticated;