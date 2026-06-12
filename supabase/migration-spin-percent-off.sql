-- Run after migration-spin.sql
-- Percentage-off spin prizes (any category or product)

alter type gift_kind add value if not exists 'percent_off';

alter table public.spin_prizes
  add column if not exists percent_value int
    check (percent_value is null or (percent_value > 0 and percent_value <= 100));

alter table public.spin_prizes
  add column if not exists category_id uuid
    references public.categories(id) on delete set null;

create or replace function public.build_gift_config(p public.spin_prizes)
returns jsonb
language plpgsql
stable
as $$
declare
  v_category_name text;
begin
  if p.category_id is not null then
    select name into v_category_name from public.categories where id = p.category_id;
  end if;

  if p.gift_kind = 'free_product' then
    return jsonb_build_object(
      'kind', 'free_product',
      'product_id', p.product_id,
      'covers', case when p.covers_base_only then 'base_only' else 'base_and_listed_options' end,
      'label', p.label
    );
  elsif p.gift_kind = 'free_option' then
    return jsonb_build_object(
      'kind', 'free_option',
      'group_template_id', p.group_template_id,
      'template_option_id', p.template_option_id,
      'customization_group_id', p.customization_group_id,
      'customization_option_id', p.customization_option_id,
      'max_option_price_kr', p.max_option_price_kr,
      'label', p.label
    );
  elsif p.gift_kind = 'credit' then
    return jsonb_build_object(
      'kind', 'credit',
      'amount_kr', p.credit_amount_kr,
      'label', p.label
    );
  elsif p.gift_kind = 'percent_off' then
    return jsonb_build_object(
      'kind', 'percent_off',
      'percent', p.percent_value,
      'product_id', p.product_id,
      'category_id', p.category_id,
      'category_name', v_category_name,
      'label', p.label
    );
  end if;
  return jsonb_build_object('kind', 'unknown', 'label', p.label);
end;
$$;
