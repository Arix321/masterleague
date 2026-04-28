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
        ('Estêvão','PTA',50000000::BIGINT,'Chelsea','Inglaterra'),
        ('Endrick','CA',20000000,'Lyon','França'),
        ('Thiago Almada','MAT',27000000,'Atlético de Madrid','Espanha'),
        ('Rayan','PTA',25000000,'Bournemouth','Inglaterra'),
        ('Luiz Henrique','PTA',22000000,'Zenit','Rússia'),
        ('Flaco López','MCT',20000000,'Palmeiras','Brasil'),
        ('Nico de la Cruz','MAT',18000000,'Flamengo','Brasil'),
        ('Raphael Veiga','MAT',17000000,'Club América','México'),
        ('Yan Couto','LAT',15000000,'Girona','Espanha'),
        ('Igor Jesus','CA',15000000,'Bournemouth','Inglaterra'),
        ('Marcos Leonardo','CA',14000000,'Benfica','Portugal'),
        ('Zaracho','VOL',14000000,'Atlético Mineiro','Brasil'),
        ('Arana','LAT',14000000,'Atlético Mineiro','Brasil'),
        ('Vitor Reis','ZAG',14000000,'Sevilla','Espanha'),
        ('Ângelo Gabriel','PTA',13000000,'Al-Nassr','Arábia Saudita'),
        ('Facundo Torres','PTA',13000000,'Fluminense','Brasil'),
        ('Mauricio','MAT',12000000,'Palmeiras','Brasil'),
        ('Renan Lodi','LAT',12000000,'Al-Duhail','Catar'),
        ('Jean Lucas','MCT',12000000,'Bahia','Brasil'),
        ('Gabriel Carvalho','MAT',9000000,'Internacional','Brasil'),
        ('John','GOL',7000000,'Botafogo','Brasil'),
        ('Gregore','VOL',6000000,'Botafogo','Brasil'),
        ('Bernabei','LAT',6000000,'Internacional','Brasil'),
        ('Alexander Barboza','ZAG',5000000,'Botafogo','Brasil'),
        ('Rômulo','VOL',4000000,'Internacional','Brasil'),
        ('Rodrigo Sam','ZAG',350000,'Mirassol','Brasil'),
        ('Ederson Moraes','GOL',30000000,'Manchester City','Inglaterra'),
        ('Jordan Pickford','GOL',25000000,'Everton','Inglaterra'),
        ('David Raya','GOL',22000000,'Arsenal','Inglaterra'),
        ('Mark Travers','GOL',15000000,'AFC Bournemouth','Inglaterra'),
        ('Bento','GOL',10000000,'Athletico Paranaense','Brasil'),
        ('Gabriel Magalhães','ZAG',40000000,'Arsenal','Inglaterra'),
        ('Joachim Andersen','ZAG',30000000,'Fulham','Inglaterra'),
        ('Marc Cucurella','ZAG',25000000,'Chelsea','Inglaterra'),
        ('Nicolás Otamendi','ZAG',8000000,'Manchester City','Inglaterra'),
        ('Myles Lewis-Skelly','LAT',40000000,'Arsenal','Inglaterra'),
        ('Jorrel Hato','LAT',38000000,'Chelsea','Inglaterra'),
        ('Luke Shaw','LAT',35000000,'Manchester United','Inglaterra'),
        ('Declan Rice','VOL',120000000,'Arsenal','Inglaterra'),
        ('Moisés Caicedo','VOL',110000000,'Chelsea','Inglaterra'),
        ('Cole Palmer','MAT',110000000,'Chelsea','Inglaterra'),
        ('Bruno Guimarães','VOL',80000000,'Newcastle','Inglaterra'),
        ('Bruno Fernandes','MAT',80000000,'Manchester United','Inglaterra'),
        ('Douglas Luiz','VOL',45000000,'Aston Villa','Inglaterra'),
        ('João Gomes','VOL',16000000,'Flamengo','Brasil'),
        ('Manuel Akanji','ZAG',35000000,'Manchester City','Inglaterra'),
        ('João Cancelo','LAT',40000000,'Manchester City','Inglaterra'),
        ('Julián Álvarez','CA',70000000,'Manchester City','Inglaterra'),
        ('Andy Robertson','LAT',12000000,'Liverpool','Inglaterra'),
        ('Gullermo Varela','LAT',5000000,'Flamengo','Brasil')
      ) AS t(name, position, market_value_eur, current_club, region)
    LOOP
      IF EXISTS (SELECT 1 FROM public.market_players mp WHERE mp.career_id = c.id AND mp.name = rec.name) THEN CONTINUE; END IF;
      IF EXISTS (SELECT 1 FROM public.squad_players sp WHERE sp.career_id = c.id AND sp.name = rec.name) THEN CONTINUE; END IF;

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
      v_overall := GREATEST(58, LEAST(91, v_overall));
      v_wage := GREATEST(20000, GREATEST((rec.market_value_eur * 12 / 1000)::BIGINT, ((v_overall - 65) * 8000)::BIGINT));

      INSERT INTO public.market_players
        (career_id, user_id, name, position, overall, market_value_eur, expected_wage_eur, region, current_club, age, potential)
      VALUES
        (c.id, c.user_id, rec.name, rec.position, v_overall, rec.market_value_eur, v_wage, rec.region, rec.current_club, 25, v_overall);
    END LOOP;
  END LOOP;
END $$;