-- Inserir estrelas internacionais (Real Madrid, Manchester City, Liverpool, Santos/Neymar)
-- em todas as carreiras existentes, sem duplicar e sem conflitar com o elenco do jogador.
DO $$
DECLARE
  c RECORD;
  rec RECORD;
  v_overall INT;
  v_wage BIGINT;
BEGIN
  FOR c IN SELECT id, user_id FROM public.careers LOOP
    FOR rec IN
      SELECT * FROM (VALUES
        ('Thibaut Courtois','GOL',15000000::BIGINT,'Real Madrid',33,'Europa'),
        ('Dani Carvajal','LAT',12000000,'Real Madrid',34,'Europa'),
        ('Antonio Rüdiger','ZAG',18000000,'Real Madrid',32,'Europa'),
        ('Éder Militão','ZAG',45000000,'Real Madrid',27,'Europa'),
        ('David Alaba','ZAG',10000000,'Real Madrid',33,'Europa'),
        ('Ferland Mendy','LAT',18000000,'Real Madrid',30,'Europa'),
        ('Aurélien Tchouaméni','VOL',75000000,'Real Madrid',25,'Europa'),
        ('Eduardo Camavinga','VOL',70000000,'Real Madrid',23,'Europa'),
        ('Federico Valverde','MCT',100000000,'Real Madrid',27,'Europa'),
        ('Jude Bellingham','MAT',180000000,'Real Madrid',22,'Europa'),
        ('Arda Güler','MAT',60000000,'Real Madrid',21,'Europa'),
        ('Vinícius Júnior','PTA',200000000,'Real Madrid',25,'Europa'),
        ('Rodrygo','PTA',90000000,'Real Madrid',25,'Europa'),
        ('Kylian Mbappé','CA',180000000,'Real Madrid',27,'Europa'),
        ('Ederson','GOL',35000000,'Manchester City',32,'Europa'),
        ('Rúben Dias','ZAG',75000000,'Manchester City',28,'Europa'),
        ('John Stones','ZAG',35000000,'Manchester City',31,'Europa'),
        ('Joško Gvardiol','ZAG',80000000,'Manchester City',24,'Europa'),
        ('Kyle Walker','LAT',12000000,'Manchester City',35,'Europa'),
        ('Rodri','VOL',130000000,'Manchester City',29,'Europa'),
        ('Mateo Kovačić','MCT',30000000,'Manchester City',31,'Europa'),
        ('Bernardo Silva','MAT',70000000,'Manchester City',31,'Europa'),
        ('Phil Foden','MAT',130000000,'Manchester City',25,'Europa'),
        ('Kevin De Bruyne','MAT',40000000,'Manchester City',34,'Europa'),
        ('Jérémy Doku','PTA',60000000,'Manchester City',23,'Europa'),
        ('Erling Haaland','CA',180000000,'Manchester City',25,'Europa'),
        ('Alisson Becker','GOL',35000000,'Liverpool',33,'Europa'),
        ('Virgil van Dijk','ZAG',25000000,'Liverpool',34,'Europa'),
        ('Ibrahima Konaté','ZAG',50000000,'Liverpool',26,'Europa'),
        ('Trent Alexander-Arnold','LAT',70000000,'Liverpool',27,'Europa'),
        ('Andrew Robertson','LAT',25000000,'Liverpool',31,'Europa'),
        ('Alexis Mac Allister','MCT',80000000,'Liverpool',26,'Europa'),
        ('Dominik Szoboszlai','MCT',70000000,'Liverpool',25,'Europa'),
        ('Curtis Jones','MCT',35000000,'Liverpool',24,'Europa'),
        ('Mohamed Salah','PTA',55000000,'Liverpool',33,'Europa'),
        ('Luis Díaz','PTA',70000000,'Liverpool',28,'Europa'),
        ('Cody Gakpo','PTA',55000000,'Liverpool',26,'Europa'),
        ('Darwin Núñez','CA',60000000,'Liverpool',26,'Europa'),
        ('Neymar','MAT',15500000,'Santos',34,'Brasil')
      ) AS t(name, position, market_value_eur, current_club, age, region)
    LOOP
      -- skip if already exists in this career's market
      IF EXISTS (
        SELECT 1 FROM public.market_players mp
        WHERE mp.career_id = c.id AND mp.name = rec.name
      ) THEN CONTINUE; END IF;
      -- skip if user already owns the player
      IF EXISTS (
        SELECT 1 FROM public.squad_players sp
        WHERE sp.career_id = c.id AND sp.name = rec.name
      ) THEN CONTINUE; END IF;

      -- compute overall (mirrors ovrFromValue)
      v_overall := CASE
        WHEN rec.market_value_eur >= 30000000 THEN 85
        WHEN rec.market_value_eur >= 18000000 THEN 83
        WHEN rec.market_value_eur >= 12000000 THEN 81
        WHEN rec.market_value_eur >= 7000000 THEN 78
        WHEN rec.market_value_eur >= 4000000 THEN 76
        WHEN rec.market_value_eur >= 2000000 THEN 74
        WHEN rec.market_value_eur >= 1000000 THEN 72
        WHEN rec.market_value_eur >= 500000 THEN 70
        WHEN rec.market_value_eur >= 200000 THEN 67
        ELSE 64
      END;
      IF rec.age <= 20 THEN v_overall := v_overall - 2;
      ELSIF rec.age >= 35 THEN v_overall := v_overall - 2;
      END IF;
      v_overall := GREATEST(58, LEAST(91, v_overall));

      v_wage := GREATEST(20000, GREATEST((rec.market_value_eur * 12 / 1000)::BIGINT, ((v_overall - 65) * 8000)::BIGINT));

      INSERT INTO public.market_players
        (career_id, user_id, name, position, overall, market_value_eur, expected_wage_eur, region, current_club, age, potential)
      VALUES
        (c.id, c.user_id, rec.name, rec.position, v_overall, rec.market_value_eur, v_wage, rec.region, rec.current_club, rec.age, v_overall);
    END LOOP;
  END LOOP;
END $$;