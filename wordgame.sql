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
('hello', 'xin chào', 'hello.jpg', 'general'),
('goodbye', 'tạm biệt', 'goodbye.jpg', 'general'),
('thank you', 'cảm ơn', 'thank_you.jpg', 'general'),
('yes', 'vâng', 'yes.jpg', 'general'),
('no', 'không', 'no.jpg', 'general'),
('please', 'làm ơn', 'please.jpg', 'general'),
('sorry', 'xin lỗi', 'sorry.jpg', 'general'),
('water', 'nước', 'water.jpg', 'general'),
('book', 'sách', 'book.jpg', 'general'),
('pen', 'bút', 'pen.jpg', 'general'),

-- Từ vựng động vật (Animals)
('cat', 'con mèo', 'cat.jpg', 'animals'),
('dog', 'con chó', 'dog.jpg', 'animals'),
('bird', 'con chim', 'bird.jpg', 'animals'),
('fish', 'con cá', 'fish.jpg', 'animals'),
('elephant', 'con voi', 'elephant.jpg', 'animals'),
('tiger', 'con hổ', 'tiger.jpg', 'animals'),
('lion', 'sư tử', 'lion.jpg', 'animals'),
('monkey', 'con khỉ', 'monkey.jpg', 'animals'),
('rabbit', 'con thỏ', 'rabbit.jpg', 'animals'),
('bear', 'con gấu', 'bear.jpg', 'animals'),

-- Từ vựng về thức ăn (Food)
('rice', 'cơm', 'rice.jpg', 'food'),
('bread', 'bánh mì', 'bread.jpg', 'food'),
('milk', 'sữa', 'milk.jpg', 'food'),
('apple', 'táo', 'apple.jpg', 'food'),
('banana', 'chuối', 'banana.jpg', 'food'),
('orange', 'cam', 'orange.jpg', 'food'),
('chicken', 'gà', 'chicken.jpg', 'food'),
('beef', 'thịt bò', 'beef.jpg', 'food'),
('fish', 'cá', 'fish_food.jpg', 'food'),
('egg', 'trứng', 'egg.jpg', 'food'),

-- Từ vựng về màu sắc (Colors)
('red', 'màu đỏ', 'red.jpg', 'colors'),
('blue', 'màu xanh dương', 'blue.jpg', 'colors'),
('green', 'màu xanh lá', 'green.jpg', 'colors'),
('yellow', 'màu vàng', 'yellow.jpg', 'colors'),
('black', 'màu đen', 'black.jpg', 'colors'),
('white', 'màu trắng', 'white.jpg', 'colors'),
('pink', 'màu hồng', 'pink.jpg', 'colors'),
('purple', 'màu tím', 'purple.jpg', 'colors'),
('orange', 'màu cam', 'orange_color.jpg', 'colors'),
('brown', 'màu nâu', 'brown.jpg', 'colors'),

-- Từ vựng về gia đình (Family)
('father', 'bố', 'father.jpg', 'family'),
('mother', 'mẹ', 'mother.jpg', 'family'),
('sister', 'chị/em gái', 'sister.jpg', 'family'),
('brother', 'anh/em trai', 'brother.jpg', 'family'),
('grandmother', 'bà', 'grandmother.jpg', 'family'),
('grandfather', 'ông', 'grandfather.jpg', 'family'),
('aunt', 'cô/dì', 'aunt.jpg', 'family'),
('uncle', 'chú/bác', 'uncle.jpg', 'family'),
('cousin', 'anh/chị/em họ', 'cousin.jpg', 'family'),
('baby', 'em bé', 'baby.jpg', 'family'),

-- Từ vựng về nghề nghiệp (Jobs)
('teacher', 'giáo viên', 'teacher.jpg', 'jobs'),
('doctor', 'bác sĩ', 'doctor.jpg', 'jobs'),
('nurse', 'y tá', 'nurse.jpg', 'jobs'),
('police', 'cảnh sát', 'police.jpg', 'jobs'),
('chef', 'đầu bếp', 'chef.jpg', 'jobs'),
('driver', 'tài xế', 'driver.jpg', 'jobs'),
('farmer', 'nông dân', 'farmer.jpg', 'jobs'),
('engineer', 'kỹ sư', 'engineer.jpg', 'jobs'),
('artist', 'nghệ sĩ', 'artist.jpg', 'jobs'),
('pilot', 'phi công', 'pilot.jpg', 'jobs'),

-- Từ vựng về đồ dùng học tập (School Items)
('pencil', 'bút chì', 'pencil.jpg', 'school'),
('ruler', 'thước', 'ruler.jpg', 'school'),
('eraser', 'tẩy', 'eraser.jpg', 'school'),
('notebook', 'vở', 'notebook.jpg', 'school'),
('pencil case', 'hộp bút', 'pencil_case.jpg', 'school'),
('school bag', 'cặp sách', 'school_bag.jpg', 'school'),
('scissors', 'kéo', 'scissors.jpg', 'school'),
('glue', 'keo', 'glue.jpg', 'school'),
('calculator', 'máy tính', 'calculator.jpg', 'school'),

-- Từ vựng về thời tiết (Weather)
('sunny', 'nắng', 'sunny.jpg', 'weather'),
('rainy', 'mưa', 'rainy.jpg', 'weather'),
('cloudy', 'nhiều mây', 'cloudy.jpg', 'weather'),
('windy', 'gió', 'windy.jpg', 'weather'),
('hot', 'nóng', 'hot.jpg', 'weather'),
('cold', 'lạnh', 'cold.jpg', 'weather'),
('snow', 'tuyết', 'snow.jpg', 'weather'),
('storm', 'bão', 'storm.jpg', 'weather'),
('rainbow', 'cầu vồng', 'rainbow.jpg', 'weather'),
('thunder', 'sấm', 'thunder.jpg', 'weather');

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
