import React from 'react';
import Home from './pages/Home/Home';
import Admin from './pages/Admin/Admin';
import './App.css'; // หรือไฟล์ CSS หลักของคุณ

function App() {
  // ดึงที่อยู่ URL ปัจจุบัน
  const currentPath = window.location.pathname;

  // ถ้า URL ต่อท้ายด้วย /admin ให้แสดงหน้าหลังบ้าน
  if (currentPath === '/admin') {
    return <Admin />;
  }

  // นอกนั้นให้แสดงหน้า Home จองตั๋วปกติ
  return <Home />;
}

export default App;