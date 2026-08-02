-- Ancienne RPC d'inscription, remplacee par register_adherent_full et plus referencee
-- nulle part dans le code. Elle restait SECURITY DEFINER et appelable par `anon` :
-- n'importe qui pouvait creer des adherents dans n'importe quel club publie.
-- On revoque plutot que de supprimer : aucun risque de casser un appel oublie,
-- et la fonction reste inspectable.
revoke execute on function public.register_adherent(text, text, text, text, text, uuid) from public, anon, authenticated;