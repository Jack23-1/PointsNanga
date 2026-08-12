DO $$
DECLARE
  titular RECORD;
  alphabet CONSTANT TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  generated_code TEXT;
  index_position INTEGER;
BEGIN
  FOR titular IN SELECT id_titulaire FROM titulaires ORDER BY id_titulaire
  LOOP
    LOOP
      generated_code := 'TIT-';

      FOR index_position IN 1..6
      LOOP
        generated_code := generated_code || substr(
          alphabet,
          floor(random() * length(alphabet))::INTEGER + 1,
          1
        );
      END LOOP;

      EXIT WHEN NOT EXISTS (
        SELECT 1
        FROM titulaires
        WHERE code_connexion = generated_code
          AND id_titulaire <> titular.id_titulaire
      );
    END LOOP;

    UPDATE titulaires
    SET
      code_connexion = generated_code,
      date_mise_a_jour = CURRENT_TIMESTAMP
    WHERE id_titulaire = titular.id_titulaire;
  END LOOP;
END $$;
