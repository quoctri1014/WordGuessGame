-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th10 02, 2025 lúc 10:43 AM
-- Phiên bản máy phục vụ: 10.4.32-MariaDB
-- Phiên bản PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `wordgame`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `players`
--

CREATE TABLE `players` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `score` int(11) DEFAULT 0,
  `rank_level` varchar(20) DEFAULT 'Beginner'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `players`
--
ALTER TABLE `players`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `players`
--
ALTER TABLE `players`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- Cấu trúc bảng cho bảng `vocabulary`
--
CREATE TABLE IF NOT EXISTS scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  score INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE `vocabulary` (
  `id` int(11) NOT NULL,
  `word` varchar(255) NOT NULL,
  `meaning` varchar(255) NOT NULL,
  `image` varchar(255) NOT NULL,
  `category` varchar(50) DEFAULT 'general'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `vocabulary`
--

INSERT INTO `vocabulary` (`word`, `meaning`, `image`, `category`) VALUES
-- Từ vựng chung (General)
('hello', 'xin chào', 'https://images.unsplash.com/photo-1465290819891-0f9f11f528bb', 'general'),
('goodbye', 'tạm biệt', 'https://images.unsplash.com/photo-1485359466996-ba9c0ea4c9e1', 'general'),
('thank you', 'cảm ơn', 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634', 'general'),
('yes', 'vâng', 'https://images.unsplash.com/photo-1580847097346-72d80f164702', 'general'),
('no', 'không', 'https://images.unsplash.com/photo-1580847097346-72d80f164702', 'general'),
('please', 'làm ơn', 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634', 'general'),
('sorry', 'xin lỗi', 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634', 'general'),
('water', 'nước', 'https://images.unsplash.com/photo-1562016600-ece13e8ba570', 'general'),
('book', 'sách', 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f', 'general'),
('pen', 'bút', 'https://images.unsplash.com/photo-1585336261022-680e295ce3fe', 'general'),

-- Từ vựng động vật (Animals)
('cat', 'con mèo', 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba', 'animals'),
('dog', 'con chó', 'https://images.unsplash.com/photo-1517849845537-4d257902454a', 'animals'),
('bird', 'con chim', 'https://images.unsplash.com/photo-1444464666168-49d633b86797', 'animals'),
('fish', 'con cá', 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00', 'animals'),
('elephant', 'con voi', 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46', 'animals'),
('tiger', 'con hổ', 'https://images.unsplash.com/photo-1549480017-d76466a4b7e8', 'animals'),
('lion', 'sư tử', 'https://images.unsplash.com/photo-1546182990-dffeafbe841d', 'animals'),
('monkey', 'con khỉ', 'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9', 'animals'),
('rabbit', 'con thỏ', 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308', 'animals'),
('bear', 'con gấu', 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d', 'animals'),

-- Từ vựng về thức ăn (Food)
('rice', 'cơm', 'https://images.unsplash.com/photo-1516684732162-798a0062be99', 'food'),
('bread', 'bánh mì', 'https://images.unsplash.com/photo-1509440159596-0249088772ff', 'food'),
('milk', 'sữa', 'https://images.unsplash.com/photo-1550583724-b2692b85b150', 'food'),
('apple', 'táo', 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6', 'food'),
('banana', 'chuối', 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e', 'food'),
('orange', 'cam', 'https://images.unsplash.com/photo-1557800636-894a64c1696f', 'food'),
('chicken', 'gà', 'https://images.unsplash.com/photo-1587593810167-a84920ea0781', 'food'),
('beef', 'thịt bò', 'https://images.unsplash.com/photo-1588347818036-558601350947', 'food'),
('fish', 'cá', 'https://images.unsplash.com/photo-1583506522440-4341d3e2d805', 'food'),
('egg', 'trứng', 'https://images.unsplash.com/photo-1587486913049-53fc88980cfc', 'food'),

-- Từ vựng về màu sắc (Colors)
('red', 'màu đỏ', 'https://images.unsplash.com/photo-1519638399535-1b036603ac77', 'colors'),
('blue', 'màu xanh dương', 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91', 'colors'),
('green', 'màu xanh lá', 'https://images.unsplash.com/photo-1564419320461-6870880221ad', 'colors'),
('yellow', 'màu vàng', 'https://images.unsplash.com/photo-1521727857535-8c27f802f0ad', 'colors'),
('black', 'màu đen', 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031', 'colors'),
('white', 'màu trắng', 'https://images.unsplash.com/photo-1533628635251-8e12c7489c4c', 'colors'),
('pink', 'màu hồng', 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17', 'colors'),
('purple', 'màu tím', 'https://images.unsplash.com/photo-1576044649696-a9fd0d1b83c2', 'colors'),
('orange', 'màu cam', 'https://images.unsplash.com/photo-1582673937754-8d0cfed5dcc9', 'colors'),
('brown', 'màu nâu', 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55', 'colors'),

-- Từ vựng về gia đình (Family)
('father', 'bố', 'https://images.unsplash.com/photo-1605973029521-8154da591bd7', 'family'),
('mother', 'mẹ', 'https://images.unsplash.com/photo-1623950397066-c54ef4aa7247', 'family'),
('sister', 'chị/em gái', 'https://images.unsplash.com/photo-1511895426328-dc8714191300', 'family'),
('brother', 'anh/em trai', 'https://images.unsplash.com/photo-1511895426328-dc8714191300', 'family'),
('grandmother', 'bà', 'https://images.unsplash.com/photo-1581579438747-9c6a4386a07b', 'family'),
('grandfather', 'ông', 'https://images.unsplash.com/photo-1581579438747-9c6a4386a07b', 'family'),
('aunt', 'cô/dì', 'https://images.unsplash.com/photo-1623950397066-c54ef4aa7247', 'family'),
('uncle', 'chú/bác', 'https://images.unsplash.com/photo-1605973029521-8154da591bd7', 'family'),
('cousin', 'anh/chị/em họ', 'https://images.unsplash.com/photo-1511895426328-dc8714191300', 'family'),
('baby', 'em bé', 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9', 'family'),

-- Từ vựng về nghề nghiệp (Jobs)
('teacher', 'giáo viên', 'https://images.unsplash.com/photo-1577896851231-70ef18881754', 'jobs'),
('doctor', 'bác sĩ', 'https://images.unsplash.com/photo-1582750433449-648ed127bb54', 'jobs'),
('nurse', 'y tá', 'https://images.unsplash.com/photo-1582750433449-648ed127bb54', 'jobs'),
('police', 'cảnh sát', 'https://images.unsplash.com/photo-1596524430615-b46475ddff6e', 'jobs'),
('chef', 'đầu bếp', 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c', 'jobs'),
('driver', 'tài xế', 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d', 'jobs'),
('farmer', 'nông dân', 'https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0', 'jobs'),
('engineer', 'kỹ sư', 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789', 'jobs'),
('artist', 'nghệ sĩ', 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5', 'jobs'),
('pilot', 'phi công', 'https://images.unsplash.com/photo-1507812984078-917a274065be', 'jobs'),

-- Từ vựng về đồ dùng học tập (School Items)
('pencil', 'bút chì', 'https://images.unsplash.com/photo-1596485206311-2da5fafb3606', 'school'),
('ruler', 'thước', 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd', 'school'),
('eraser', 'tẩy', 'https://images.unsplash.com/photo-1600815831561-55a669919098', 'school'),
('notebook', 'vở', 'https://images.unsplash.com/photo-1531346878377-a5be20888e57', 'school'),
('pencil case', 'hộp bút', 'https://images.unsplash.com/photo-1596485206311-2da5fafb3606', 'school'),
('school bag', 'cặp sách', 'https://images.unsplash.com/photo-1595461135849-bf08893fdc2c', 'school'),
('scissors', 'kéo', 'https://images.unsplash.com/photo-1503791774117-08c379dd7f7c', 'school'),
('glue', 'keo', 'https://images.unsplash.com/photo-1587368062478-e804f3c25b43', 'school'),
('calculator', 'máy tính', 'https://images.unsplash.com/photo-1574607383476-f517f260d30b', 'school'),

-- Từ vựng về thời tiết (Weather)
('sunny', 'nắng', 'https://images.unsplash.com/photo-1622396481328-401b66616220', 'weather'),
('rainy', 'mưa', 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0', 'weather'),
('cloudy', 'nhiều mây', 'https://images.unsplash.com/photo-1534088568595-a066f410bcda', 'weather'),
('windy', 'gió', 'https://images.unsplash.com/photo-1505672678657-cc7037095e60', 'weather'),
('hot', 'nóng', 'https://images.unsplash.com/photo-1504370805625-d32c54b16100', 'weather'),
('cold', 'lạnh', 'https://images.unsplash.com/photo-1551582045-6ec9c11d8697', 'weather'),
('snow', 'tuyết', 'https://images.unsplash.com/photo-1547754980-3df97fed72a8', 'weather'),
('storm', 'bão', 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28', 'weather'),
('rainbow', 'cầu vồng', 'https://images.unsplash.com/photo-1591456983933-0c124c21c608', 'weather'),
('thunder', 'sấm', 'https://images.unsplash.com/photo-1461511669078-d46bf351cd6e', 'weather');

--
-- Chỉ mục cho bảng `vocabulary`
--
ALTER TABLE `vocabulary`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT cho bảng `vocabulary`
--
ALTER TABLE `vocabulary`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
