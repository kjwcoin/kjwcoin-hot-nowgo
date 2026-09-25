-- Keep HOT report coordinates aligned with nationwide address handling.
alter table public.hot_taste_observations
  drop constraint hot_taste_observations_lat_check,
  add constraint hot_taste_observations_lat_check check (lat between 32.5 and 39.0);

alter table public.hot_taste_observations
  drop constraint hot_taste_observations_lng_check,
  add constraint hot_taste_observations_lng_check check (lng between 124.0 and 132.0);
