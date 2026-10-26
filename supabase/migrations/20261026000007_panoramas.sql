-- 360-degree room panoramas and sample photography for showcase listings.
alter table app.assets drop constraint assets_kind_check;
alter table app.assets add constraint assets_kind_check check (kind in ('photo','model','floor_plan','texture','render','panorama'));
alter table app.assets drop constraint assets_trust_label_check;
alter table app.assets add constraint assets_trust_label_check
  check (trust_label in ('actual_photo','verified_model','illustrative_model','illustrative_render','owner_floor_plan','sample_photo'));
