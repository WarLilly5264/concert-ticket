import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import EventPage from './pages/Home/EventPage';
import Admin from './pages/Admin/Admin';
import styles from './pages/Home/Home.module.css';

import posterImg1 from './assets/image_899a45.jpg';
import posterImg2 from './assets/indie-kids-3.png';

const EVENT_1 = {
  dbId: 'cf6e40ed-b5fb-4c06-84bc-070b24e3c11e',
  title: 'INDIE KIDS X BAANNAA',
  date: '27 NOVEMBER 2026 @ BAANNAA',
  poster: posterImg1,
  schedule: [
    '19:00 Doors Open',
    '20:00 SVCKNID',
    '20:45 SECRET DOOR',
    '21:30 IDIN'
  ],
  onlinePrice: 150,
  doorPrice: 250
};

const EVENT_2 = {
  dbId: 'cbea4e42-b6a6-41df-852a-377137ce9fa3',
  title: 'อินดี้คิดส์ปาร์ตี้ 3',
  date: '26 DECEMBER 2026',
  poster: posterImg2,
  schedule: [
    'Lineup:',
    'PADMI',
    'Solitaryn',
    'Moontage Daydream',
    'FongFord',
    'UBG.4US x FKCREW',
    'IDIN',
    'SvckNid',
    'L4wW x AkMiller',
    'Secret Door'
  ],
  onlinePrice: 150,
  doorPrice: 250
};

// หน้าเลือกงาน (กรณีคนเข้าลิงก์หลัก /)
function Landing() {
  return (
    <div className={styles.container}>
      <div className={styles.detailsSection} style={{ marginTop: '24px' }}>
        <h1 className={styles.title} style={{ textAlign: 'center', marginBottom: '24px' }}>
          CONCERT TICKETS
        </h1>

        <Link to="/INDIE_KIDS_X_BAANNAA" style={{ textDecoration: 'none', display: 'block', marginBottom: '20px' }}>
          <div className={styles.schedule} style={{ marginBottom: 0 }}>
            <img src={posterImg1} alt={EVENT_1.title} className={styles.poster} style={{ marginBottom: '14px' }} />
            <h3 style={{ color: '#fff', margin: '0 0 6px' }}>{EVENT_1.title}</h3>
            <p style={{ color: '#aaa', margin: '0 0 14px', fontSize: '0.9rem' }}>{EVENT_1.date}</p>
            <div className={styles.bookButton} style={{ textAlign: 'center', boxSizing: 'border-box' }}>
              เข้าสู่หน้าจองบัตร
            </div>
          </div>
        </Link>

        <Link to="/INDIE_KIDS_3" style={{ textDecoration: 'none', display: 'block' }}>
          <div className={styles.schedule} style={{ marginBottom: 0 }}>
            <img src={posterImg2} alt={EVENT_2.title} className={styles.poster} style={{ marginBottom: '14px' }} />
            <h3 style={{ color: '#fff', margin: '0 0 6px' }}>{EVENT_2.title}</h3>
            <p style={{ color: '#aaa', margin: '0 0 14px', fontSize: '0.9rem' }}>{EVENT_2.date}</p>
            <div className={styles.bookButton} style={{ textAlign: 'center', boxSizing: 'border-box' }}>
              เข้าสู่หน้าจองบัตร
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/INDIE_KIDS_X_BAANNAA" element={<EventPage event={EVENT_1} />} />
        <Route path="/INDIE_KIDS_3" element={<EventPage event={EVENT_2} />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;