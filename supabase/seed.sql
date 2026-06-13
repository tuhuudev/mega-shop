-- Du lieu mau (chay sau migration de co san pham hien thi).
insert into public.categories (name, slug) values
  ('Cà phê', 'ca-phe'), ('Trà', 'tra'), ('Phụ kiện', 'phu-kien')
on conflict (slug) do nothing;

insert into public.products (name, slug, description, price, stock, category_id)
select v.name, v.slug, v.description, v.price, v.stock,
       (select id from public.categories where slug = v.cat)
from (values
  ('Cà phê Arabica 250g', 'ca-phe-arabica-250g', 'Hạt rang vừa, hương hoa.', 145000, 40, 'ca-phe'),
  ('Cà phê Robusta 500g', 'ca-phe-robusta-500g', 'Đậm, mạnh, phù hợp phin.', 165000, 25, 'ca-phe'),
  ('Trà ô long thượng hạng', 'tra-o-long', 'Hậu ngọt, hương lan.', 210000, 15, 'tra'),
  ('Phin pha cà phê inox', 'phin-inox', 'Inox 304, giữ nhiệt tốt.', 89000, 60, 'phu-kien')
) as v(name, slug, description, price, stock, cat)
on conflict (slug) do nothing;
