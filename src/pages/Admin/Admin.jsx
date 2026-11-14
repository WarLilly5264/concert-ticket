import React, { useState } from 'react';
import styles from './Admin.module.css';
import { supabase } from '../../lib/supabase';

const EVENT_NAMES = {
  'cf6e40ed-b5fb-4c06-84bc-070b24e3c11e': 'INDIE KIDS X BAANNAA',
  'cbea4e42-b6a6-41df-852a-377137ce9fa3': 'อินดี้คิดส์ปาร์ตี้ 3'
};

function Admin() {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [eventsList, setEventsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const ADMIN_PASSWORD = 'baannaa_admin';

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthorized(true);
      fetchBookings();
      fetchEventData();
    } else {
      alert('รหัสผ่านไม่ถูกต้อง!');
      setPassword('');
    }
  };

  const fetchEventData = async () => {
    const { data, error } = await supabase.from('events').select('*');
    if (!error && data) {
      setEventsList(data);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookings:', error.message);
    } else {
      setBookings(data);
    }
    setLoading(false);
  };

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'pending' ? 'confirmed' : 'pending';
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert('อัปเดตสถานะไม่สำเร็จ: ' + error.message);
    } else {
      fetchBookings();
    }
  };

  const deleteBooking = async (id, quantity, eventId) => {
    const confirmDelete = window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้? (ระบบจะคืนโควต้าบัตรให้คนอื่นซื้อต่อได้)');
    if (!confirmDelete) return;

    try {
      const { error: deleteError } = await supabase.from('bookings').delete().eq('id', id);
      if (deleteError) throw deleteError;

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('tickets_sold')
        .eq('id', eventId)
        .single();
      if (eventError) throw eventError;

      const { error: updateError } = await supabase
        .from('events')
        .update({ tickets_sold: Math.max(0, eventData.tickets_sold - quantity) })
        .eq('id', eventId);
      if (updateError) throw updateError;

      alert('ลบข้อมูลและคืนโควต้าสำเร็จ!');
      fetchBookings();
      fetchEventData();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบ: ' + err.message);
    }
  };

  const filteredBookings = bookings.filter((booking) =>
    booking.phone.includes(searchTerm)
  );

  if (!isAuthorized) {
    return (
      <div className={styles.loginContainer}>
        <form className={styles.loginBox} onSubmit={handleLogin}>
          <h2>Admin Login</h2>
          <input
            type="password"
            placeholder="ใส่รหัสผ่าน..."
            className={styles.loginInput}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className={styles.loginButton}>เข้าสู่ระบบ</button>
        </form>
      </div>
    );
  }

  return (
    <div className={styles.adminPage}>
      <div className={styles.container}>
        <h2 className={styles.pageTitle}>ระบบจัดการหลังบ้าน</h2>

        {/* สรุปยอดบัตรคงเหลือแยกตามงาน */}
        <div className={styles.summaryBox}>
          {eventsList.length === 0 ? (
            <h3>กำลังโหลดยอดบัตร...</h3>
          ) : (
            eventsList.map((ev) => (
              <h3 key={ev.id} style={{ margin: '6px 0', fontSize: '1.05rem' }}>
                {EVENT_NAMES[ev.id] || ev.title}:{' '}
                <span className={styles.stockHighlight}>
                  {ev.total_tickets - ev.tickets_sold} / {ev.total_tickets} ใบ
                </span>
              </h3>
            ))
          )}
        </div>

        <div className={styles.searchBox}>
          <input
            type="tel"
            placeholder="🔍 ค้นหาด้วยเบอร์โทรศัพท์..."
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <p className={styles.loadingText}>กำลังโหลดข้อมูล...</p>
        ) : (
          <div className={styles.cardContainer}>
            {filteredBookings.map((booking) => (
              <div key={booking.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <small style={{ color: '#e50914', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                      {EVENT_NAMES[booking.event_id] || 'ไม่ระบุงาน'}
                    </small>
                    <h3>{booking.customer_name}</h3>
                  </div>
                  <span className={booking.status === 'confirmed' ? styles.badgeConfirmed : styles.badgePending}>
                    {booking.status === 'confirmed' ? 'ยืนยันแล้ว' : 'รอตรวจสอบ'}
                  </span>
                </div>

                <div className={styles.cardBody}>
                  <p><strong>เบอร์โทร:</strong> {booking.phone}</p>
                  <p><strong>จำนวน:</strong> {booking.quantity} ใบ</p>
                  <p><strong>วันที่:</strong> {new Date(booking.created_at).toLocaleString('th-TH')}</p>
                </div>

                <div className={styles.cardFooter}>
                  <a href={booking.slip_url} target="_blank" rel="noreferrer" className={styles.btnSlip}>
                    ดูสลิป
                  </a>
                  <button
                    className={booking.status === 'pending' ? styles.btnApprove : styles.btnRevoke}
                    onClick={() => toggleStatus(booking.id, booking.status)}
                  >
                    {booking.status === 'pending' ? '✅ อนุมัติ' : '❌ ยกเลิก'}
                  </button>
                  <button
                    className={styles.btnDelete}
                    onClick={() => deleteBooking(booking.id, booking.quantity, booking.event_id)}
                  >
                    🗑️ ลบ
                  </button>
                </div>
              </div>
            ))}

            {filteredBookings.length === 0 && (
              <p className={styles.emptyText}>
                {searchTerm ? 'ไม่พบข้อมูลการจองสำหรับเบอร์นี้' : 'ยังไม่มีรายการจอง'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;