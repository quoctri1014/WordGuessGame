import mysql from "mysql2";

const db = mysql.createConnection({
  host: "localhost",
  user: "root",     // user mặc định của XAMPP
  password: "",     // mật khẩu trống nếu bạn chưa đặt
  database: "wordgame"
});

db.connect(err => {
  if (err) console.error("❌ Database connection failed:", err);
  else console.log("✅ Connected to MySQL database!");
});

export default db;


cd D:\LAPTRINHMANG\WordGuessGame