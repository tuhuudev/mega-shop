-- Du lieu mau (chay sau migration de co san pham hien thi).
-- Anh dung Unsplash CDN, tham so ?fm=webp tra ve WebP cho nhe.
insert into public.categories (name, slug) values
  ('Cà phê', 'ca-phe'), ('Trà', 'tra'), ('Phụ kiện', 'phu-kien')
on conflict (slug) do nothing;

insert into public.products (name, slug, description, price, stock, image_url, category_id)
select v.name, v.slug, v.description, v.price, v.stock, v.image_url,
       (select id from public.categories where slug = v.cat)
from (values
  -- ===== Cà phê =====
  ('Cà phê Arabica Cầu Đất 250g', 'ca-phe-arabica-250g', 'Hạt rang vừa (medium roast) từ vùng Cầu Đất, Lâm Đồng. Hương hoa nhẹ, vị chua thanh, hậu ngọt dịu. Hợp pha máy lẫn pour-over.', 145000, 40, 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&q=80&fm=webp&fit=crop', 'ca-phe'),
  ('Cà phê Robusta Đắk Lắk 500g', 'ca-phe-robusta-500g', 'Robusta nguyên chất Buôn Ma Thuột, rang đậm. Vị mạnh, đắng gắt đặc trưng, crema dày — chuẩn gu pha phin Việt.', 165000, 25, 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&q=80&fm=webp&fit=crop', 'ca-phe'),
  ('Cà phê Blend Espresso 1kg', 'ca-phe-blend-espresso-1kg', 'Tỉ lệ vàng 70% Robusta - 30% Arabica cho máy espresso. Crema dày, body đậm, hậu socola. Đóng gói van 1 chiều giữ hương.', 320000, 12, 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=800&q=80&fm=webp&fit=crop', 'ca-phe'),
  ('Cà phê Moka Cầu Đất 250g', 'ca-phe-moka-cau-dat-250g', 'Dòng Moka quý hiếm, hạt nhỏ, hương rượu vang và trái cây chín. Rang light để giữ trọn tầng hương phức.', 175000, 30, 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&q=80&fm=webp&fit=crop', 'ca-phe'),
  ('Cà phê Culi Robusta 500g', 'ca-phe-culi-robusta-500g', 'Culi (hạt bi) chọn lọc — mỗi quả chỉ một nhân, vị cực đậm và mạnh. Dành cho người mê cà phê nguyên bản.', 155000, 20, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80&fm=webp&fit=crop', 'ca-phe'),
  ('Cà phê Honey Process 250g', 'ca-phe-honey-250g', 'Arabica sơ chế mật ong (honey), giữ lớp nhầy khi phơi. Ngọt sâu như mật, hậu vị kéo dài, chua sáng dễ chịu.', 195000, 18, 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&q=80&fm=webp&fit=crop', 'ca-phe'),
  ('Cà phê hòa tan đen sấy lạnh 100g', 'ca-phe-hoa-tan-den-100g', 'Hòa tan nguyên chất 100%, sấy lạnh freeze-dried giữ hương. Pha nóng/lạnh đều ngon, tiện cho văn phòng và du lịch.', 65000, 50, 'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=800&q=80&fm=webp&fit=crop', 'ca-phe'),
  ('Cà phê túi lọc drip (hộp 15 gói)', 'ca-phe-tui-loc-15', 'Cà phê phin giấy túi lọc tiện lợi — chỉ cần treo lên cốc và rót nước sôi. Mỗi gói 12g, đủ một ly đậm đà.', 89000, 45, 'https://images.unsplash.com/photo-1606791405792-1004f1718d0c?w=800&q=80&fm=webp&fit=crop', 'ca-phe'),
  -- ===== Trà =====
  ('Trà ô long thượng hạng 100g', 'tra-o-long', 'Ô long bán lên men từ vùng cao Lâm Đồng. Hậu ngọt, hương lan tự nhiên, nước vàng óng. Hãm được nhiều lần.', 210000, 15, 'https://images.unsplash.com/photo-1524350876685-274059332603?w=800&q=80&fm=webp&fit=crop', 'tra'),
  ('Trà sen Tây Hồ 80g', 'tra-sen-tay-ho', 'Trà xanh ướp hương sen Bách Diệp Tây Hồ theo lối thủ công truyền thống. Thanh tao, hương sen quyện tinh tế.', 280000, 8, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80&fm=webp&fit=crop', 'tra'),
  ('Trà xanh Thái Nguyên 200g', 'tra-xanh-thai-nguyen-200g', 'Trà nõn tôm Tân Cương, Thái Nguyên. Nước xanh, vị chát dịu rồi ngọt hậu (cam thảo). Hương cốm non đặc trưng.', 120000, 35, 'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=800&q=80&fm=webp&fit=crop', 'tra'),
  ('Trà đen Earl Grey 100g', 'tra-earl-grey-100g', 'Hồng trà ướp tinh dầu cam Bergamot kiểu Anh. Hương cam thơm sang trọng, hợp uống cùng sữa hoặc pha trà chiều.', 135000, 22, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&q=80&fm=webp&fit=crop', 'tra'),
  ('Hồng trà cổ thụ 100g', 'hong-tra-co-thu-100g', 'Hồng trà từ cây chè shan tuyết cổ thụ Hà Giang. Vị đậm đà, ngọt mật, hương khói nhẹ — pha lạnh cũng rất ngon.', 165000, 16, 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800&q=80&fm=webp&fit=crop', 'tra'),
  -- ===== Phụ kiện =====
  ('Phin pha cà phê inox 304', 'phin-inox', 'Inox 304 nguyên khối, giữ nhiệt tốt, không gỉ sét. Lỗ lọc gia công chuẩn cho dòng chảy đều, chiết trọn vị cà phê.', 89000, 60, 'https://images.unsplash.com/photo-1563911892437-1feda0179e1b?w=800&q=80&fm=webp&fit=crop', 'phu-kien'),
  ('Ly sứ thủ công 250ml', 'ly-su-thu-cong-250ml', 'Ly sứ men hỏa biến nung thủ công — mỗi chiếc một vân men độc bản. Dày dặn, giữ nhiệt, cầm chắc tay.', 120000, 33, 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&q=80&fm=webp&fit=crop', 'phu-kien'),
  ('Cân điện tử pha chế 0.1g', 'can-dien-tu-pha-che', 'Cân barista độ chính xác 0.1g, tải tối đa 3kg, có hẹn giờ tích hợp cho pour-over. Mặt kính cường lực chống nước.', 350000, 8, 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800&q=80&fm=webp&fit=crop', 'phu-kien'),
  ('Ấm rót cổ ngỗng 600ml', 'am-rot-co-ngong-600ml', 'Ấm gooseneck inox cổ ngỗng, vòi nhỏ kiểm soát dòng nước chuẩn cho pour-over. Tay cầm chống nóng, đáy từ.', 280000, 14, 'https://images.unsplash.com/photo-1551030173-122aabc4489c?w=800&q=80&fm=webp&fit=crop', 'phu-kien'),
  ('Bình ủ trà thủy tinh 800ml', 'binh-u-tra-800ml', 'Bình thủy tinh borosilicate chịu nhiệt kèm lưới lọc inox rời. Ủ trà tiện lợi, ngắm sắc nước đẹp mắt.', 195000, 19, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80&fm=webp&fit=crop', 'phu-kien')
) as v(name, slug, description, price, stock, image_url, cat)
on conflict (slug) do update set
  name        = excluded.name,
  description = excluded.description,
  price       = excluded.price,
  stock       = excluded.stock,
  image_url   = excluded.image_url,
  category_id = excluded.category_id;
