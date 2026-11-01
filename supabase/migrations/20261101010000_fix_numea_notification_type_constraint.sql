alter table public.numea_notifications
  drop constraint if exists numea_notifications_type_check;

alter table public.numea_notifications
  add constraint numea_notifications_type_check
  check (char_length(type) between 1 and 40);
