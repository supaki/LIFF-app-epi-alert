// liff-link.js
// Logic สำหรับหน้า LIFF App ผูกบัญชี LINE กับระบบนัดวัคซีน

const GAS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwPwiSMPSdXZ9RqoCW6X9-YMbITYDJY1DLxSj4_NCS60_0j5mh6ibELr6qWPtAe-v0N/exec'; // <-- เปลี่ยนเป็น URL ของ Google Apps Script Web App ที่ deploy แล้ว
const BOT_BASIC_ID = '@829aobqk'; // หรือดึงจาก config ถ้าต้องการ

document.addEventListener('DOMContentLoaded', async function() {
  const statusDiv = document.getElementById('status');
  const resultDiv = document.getElementById('result');
  const addFriendBtn = document.getElementById('addFriendBtn');

  // ดึง cid จาก query string หรือจาก state parameter
  const urlParams = new URLSearchParams(window.location.search);
  console.log('window.location.href:', window.location.href);
  console.log('window.location.search:', window.location.search);
  console.log('urlParams:', urlParams.toString());
  let cid = urlParams.get('cid');
  console.log('cid from query:', cid);
  if (!cid) {
    // กรณีถูก redirect หลัง LINE Login จะมี state parameter
    const state = urlParams.get('state');
    console.log('state param:', state);
    if (state && state.startsWith('cid-')) {
      cid = state.replace('cid-', '');
      console.log('cid from state:', cid);
    }
  }
  console.log('Checking for liff.state...');
  if (!cid) {
    // ตรวจสอบ liff.state parameter ที่อาจจะมี encoded URL
    const liffState = urlParams.get('liff.state');
    console.log('liff.state param:', liffState);
    if (liffState) {
      try {
        // decode ค่า liff.state
        const decodedState = decodeURIComponent(liffState);
        console.log('decoded liff.state:', decodedState);
        console.log('decodedState type:', typeof decodedState);
        console.log('decodedState length:', decodedState.length);
        console.log('decodedState startsWith #:', decodedState.startsWith('#'));
        
        // ตรวจสอบว่า decoded state เป็น query string หรือ hash fragment
        if (decodedState.startsWith('?')) {
          console.log('Processing as query string');
          const stateParams = new URLSearchParams(decodedState);
          cid = stateParams.get('cid');
          console.log('cid from liff.state (query):', cid);
        } else if (decodedState.startsWith('#')) {
          console.log('Processing as hash fragment');
          // สำหรับ hash fragment เช่น #cid=3800600588871
          const hashString = decodedState.substring(1);
          console.log('hashString after removing #:', hashString);
          const hashParams = new URLSearchParams(hashString);
          cid = hashParams.get('cid');
          console.log('cid from liff.state (hash):', cid);
        } else {
          console.log('Processing as plain string');
          // ลองแปลง string ธรรมดาเป็น URLSearchParams
          const stateParams = new URLSearchParams('?' + decodedState);
          cid = stateParams.get('cid');
          console.log('cid from liff.state (plain):', cid);
        }
      } catch (e) {
        console.log('Error decoding liff.state:', e);
      }
    }
  }
  if (!cid) {
    cid = urlParams.get('pid');
    console.log('cid from pid:', cid);
  }
  if (!cid) {
    // ตรวจสอบจาก localStorage (สำหรับ redirect flow)
    const storedCid = localStorage.getItem('pendingCid');
    console.log('cid from localStorage:', storedCid);
    if (storedCid) {
      cid = storedCid;
      // ลบออกจาก localStorage หลังใช้แล้ว
      localStorage.removeItem('pendingCid');
      console.log('Using stored CID and removed from localStorage');
    }
  }
  if (!cid) {
    statusDiv.textContent = 'ไม่พบเลขบัตรประชาชน (cid/pid)';
    console.log('window.location.search:', window.location.search);
    console.log('cid:', cid);
    return;
  }
  // เพิ่มฟังก์ชันตรวจสอบ cid
  function validateCid(cid) {
    return typeof cid === 'string' && /^\d{13}$/.test(cid);
  }
  if (!cid || !validateCid(cid)) {
    statusDiv.textContent = 'เลขบัตรประชาชน (cid) ไม่ถูกต้อง ต้องเป็นตัวเลข 13 หลัก';
    return;
    console.log('(cid) ไม่ถูกต้อง:', cid);
  }

  // เริ่มต้น LIFF
  try {
    await liff.init({ liffId: '2007905473-Vqw5RZBv' }); // <-- เปลี่ยนเป็น LIFF_ID ของคุณ
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }
    statusDiv.textContent = 'กำลังดึงข้อมูลบัญชี LINE...';
    const profile = await liff.getProfile();
    const userId = profile.userId;
    // แสดงปุ่มเพิ่มเพื่อน
    addFriendBtn.classList.remove('hidden');
    addFriendBtn.onclick = function() {
      window.open('https://line.me/R/ti/p/~' + BOT_BASIC_ID, '_blank');
    };
    // ส่ง userId + cid ไปบันทึกใน backend
    statusDiv.textContent = 'กำลังผูกบัญชี...';
    fetch(GAS_WEBAPP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveLineIdToPerson', cid: cid, lineUserId: userId }),
      headers: { 'Content-Type': 'application/json' }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        statusDiv.textContent = '';
        resultDiv.textContent = 'ผูกบัญชี LINE กับระบบสำเร็จ!';
      } else {
        statusDiv.textContent = '';
        resultDiv.textContent = 'เกิดข้อผิดพลาด: ' + (data.error || 'ไม่สามารถผูกบัญชีได้');
      }
    })
    .catch(err => {
      statusDiv.textContent = '';
      resultDiv.textContent = 'เกิดข้อผิดพลาด: ' + err.message;
    });
  } catch (e) {
    statusDiv.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อ LIFF: ' + e.message;
  }
});
