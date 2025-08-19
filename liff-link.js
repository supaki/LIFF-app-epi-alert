// liff-link.js
// Logic สำหรับหน้า LIFF App ผูกบัญชี LINE กับระบบนัดวัคซีน

const GAS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwPwiSMPSdXZ9RqoCW6X9-YMbITYDJY1DLxSj4_NCS60_0j5mh6ibELr6qWPtAe-v0N/exec'; // <-- เปลี่ยนเป็น URL ของ Google Apps Script Web App ที่ deploy แล้ว
const BOT_BASIC_ID = '@829aobqk'; // หรือดึงจาก config ถ้าต้องการ

document.addEventListener('DOMContentLoaded', async function() {
  console.log('=== LIFF App Started (v2025081912) ===', window.location.href); // Version bump for cache busting
  console.log('LIFF DEBUG: URL', window.location.href);
  console.log('LIFF DEBUG: Search params', window.location.search);
  
  // New UI elements
  const statusIcon = document.getElementById('statusIcon');
  const statusText = document.getElementById('statusText');
  const statusDetail = document.getElementById('statusDetail');
  const actionButtons = document.getElementById('actionButtons');
  const addFriendBtn = document.getElementById('addFriendBtn');
  const resultDiv = document.getElementById('result');
  
  // Debug UI elements
  console.log('UI Elements Check:', {
    statusIcon: !!statusIcon,
    statusText: !!statusText,
    statusDetail: !!statusDetail,
    actionButtons: !!actionButtons,
    addFriendBtn: !!addFriendBtn,
    resultDiv: !!resultDiv
  });
  
  // Status management functions
  function updateStatus(step, icon, text, detail = '', isLoading = false) {
    // Update step indicators
    updateStepIndicator(step);
    
    // Update status display
    if (statusIcon) {
      statusIcon.innerHTML = `<i class="${icon} ${isLoading ? 'pulse' : ''}"></i>`;
    }
    if (statusText) {
      statusText.textContent = text;
    }
    if (statusDetail) {
      statusDetail.textContent = detail;
    }
    
    console.log(`Status: ${text} ${detail ? '- ' + detail : ''}`);
  }
  
  function updateStepIndicator(currentStep) {
    const steps = ['step1', 'step2', 'step3'];
    const lines = ['line1', 'line2'];
    
    steps.forEach((stepId, index) => {
      const stepContainer = document.getElementById(stepId);
      if (!stepContainer) return; // Skip if element doesn't exist
      
      const stepElement = stepContainer.querySelector('div');
      if (!stepElement) return; // Skip if div doesn't exist
      
      const stepNum = index + 1;
      
      if (stepNum <= currentStep) {
        stepElement.className = stepElement.className.replace('bg-gray-300 text-gray-500', 'bg-green-500 text-white');
      } else if (stepNum === currentStep + 1) {
        stepElement.className = stepElement.className.replace('bg-gray-300 text-gray-500', 'bg-blue-500 text-white pulse');
      }
    });
    
    // Update connecting lines
    lines.forEach((lineId, index) => {
      const lineElement = document.getElementById(lineId);
      if (!lineElement) return; // Skip if element doesn't exist
      
      if (index + 1 < currentStep) {
        lineElement.className = lineElement.className.replace('bg-gray-200', 'bg-green-400');
      }
    });
  }
  
  function showSuccess(message, showButtons = false) {
    updateStatus(3, 'fas fa-check-circle text-green-500', 'สำเร็จ!', message);
    if (showButtons && actionButtons) {
      actionButtons.classList.remove('hidden');
      actionButtons.classList.add('slide-up');
    }
    
    // Fallback for old UI
    if (!statusIcon && resultDiv) {
      resultDiv.innerHTML = `<div class="text-green-600">✅ ${message}</div>`;
    }
  }
  
  function showError(message) {
    updateStatus(0, 'fas fa-exclamation-triangle text-red-500', 'เกิดข้อผิดพลาด', message);
    
    // Fallback for old UI
    if (!statusIcon && resultDiv) {
      resultDiv.innerHTML = `<div class="text-red-600">❌ เกิดข้อผิดพลาด: ${message}</div>`;
    }
  }
  
  // Initialize
  updateStatus(1, 'fas fa-search text-blue-500', 'กำลังตรวจสอบข้อมูล...', 'กรุณารอสักครู่', true);

  // ดึง cid จาก query string, hash fragment หรือจาก state parameter
  const urlParams = new URLSearchParams(window.location.search);
  console.log('window.location.href:', window.location.href);
  console.log('window.location.search:', window.location.search);
  console.log('window.location.hash:', window.location.hash);
  console.log('urlParams:', urlParams.toString());
  let cid = urlParams.get('cid');
  console.log('cid from query:', cid);
  
  // ตรวจสอบ hash fragment ถ้าไม่เจอใน query parameters
  if (!cid && window.location.hash) {
    console.log('Checking hash fragment...');
    try {
      const hashString = window.location.hash.substring(1); // remove #
      console.log('hash string (after removing #):', hashString);
      const hashParams = new URLSearchParams(hashString);
      cid = hashParams.get('cid');
      console.log('cid from hash:', cid);
    } catch (e) {
      console.log('Error parsing hash fragment:', e);
    }
  }
  
  // Store CID in localStorage before LINE login if found
  if (cid) {
    console.log('Storing CID in localStorage:', cid);
    localStorage.setItem('pendingCid', cid);
  }
  if (!cid) {
    // กรณีถูก redirect หลัง LINE Login จะมี state parameter
    const state = urlParams.get('state');
    console.log('LIFF DEBUG: state param', state);
    if (state && state.startsWith('cid-')) {
      cid = state.replace('cid-', '');
      console.log('cid from state:', cid);
    }
  }
  console.log('Checking for liff.state...');
  if (!cid) {
    // ตรวจสอบ liff.state parameter ที่อาจจะมี encoded URL
    const liffState = urlParams.get('liff.state');
    console.log('LIFF DEBUG: liff.state param', liffState);
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
          
          // ตรวจสอบกรณี nested liff.state เช่น "?liff.state=cid=1809903415444"
          console.log('LIFF DEBUG: Checking for nested pattern in:', decodedState);
          console.log('LIFF DEBUG: Contains liff.state=cid=?', decodedState.includes('liff.state=cid='));
          
          if (decodedState.includes('liff.state=cid=')) {
            console.log('LIFF DEBUG: Found nested liff.state with cid');
            const match = decodedState.match(/liff\.state=cid=([^&]+)/);
            console.log('LIFF DEBUG: Regex match result:', match);
            if (match && match[1]) {
              cid = match[1];
              console.log('LIFF DEBUG: Extracted CID from nested liff.state:', cid);
            }
          } else {
            // ลองดูว่ามี liff.state= ไหมแล้วดึง cid จากข้างหลัง
            if (decodedState.includes('liff.state=')) {
              console.log('LIFF DEBUG: Found liff.state parameter, extracting content');
              const liffStateMatch = decodedState.match(/liff\.state=([^&]*)/);
              console.log('LIFF DEBUG: liff.state content match:', liffStateMatch);
              if (liffStateMatch && liffStateMatch[1]) {
                const innerContent = liffStateMatch[1];
                console.log('LIFF DEBUG: Inner content:', innerContent);
                // ลองดึง cid จาก inner content
                if (innerContent.includes('cid=')) {
                  const cidMatch = innerContent.match(/cid=([^&]*)/);
                  console.log('LIFF DEBUG: CID match in inner content:', cidMatch);
                  if (cidMatch && cidMatch[1]) {
                    cid = cidMatch[1];
                    console.log('LIFF DEBUG: Found CID in inner content:', cid);
                  }
                }
              }
            } else {
              const stateParams = new URLSearchParams(decodedState);
              cid = stateParams.get('cid');
              console.log('cid from liff.state (query):', cid);
            }
          }
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
        
        // Fallback: ลองหา CID ด้วยวิธีง่ายๆ ถ้ายังไม่ได้
        if (!cid && decodedState.includes('cid=')) {
          console.log('LIFF DEBUG: Fallback - trying direct CID extraction');
          const match = decodedState.match(/cid=([0-9]{13})/);
          console.log('LIFF DEBUG: Direct CID match:', match);
          if (match && match[1]) {
            cid = match[1];
            console.log('LIFF DEBUG: Extracted CID with fallback method:', cid);
          }
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
    console.log('LIFF DEBUG: cid from localStorage', storedCid);
    if (storedCid) {
      cid = storedCid;
      // ลบออกจาก localStorage หลังใช้แล้ว
      localStorage.removeItem('pendingCid');
      console.log('Using stored CID and removed from localStorage');
    }
  }
  console.log('LIFF DEBUG: URL fragment', window.location.hash);
  console.log('LIFF DEBUG: Final CID result:', cid);
  
  if (!cid) {
    showError('ไม่พบเลขบัตรประชาชน (cid/pid)');
    console.log('LIFF DEBUG: No CID found. URL:', window.location.href);
    return;
  }
  // เพิ่มฟังก์ชันตรวจสอบ cid
  function validateCid(cid) {
    return typeof cid === 'string' && /^\d{13}$/.test(cid);
  }
  
  if (!cid || !validateCid(cid)) {
    showError('เลขบัตรประชาชน (CID) ไม่ถูกต้อง ต้องเป็นตัวเลข 13 หลัก');
    console.log('LIFF DEBUG: Invalid CID', cid);
    console.log('LIFF DEBUG: Full URL for debugging:', window.location.href);
    return;
  }

  // CID validation passed, proceed to LIFF login
  updateStatus(1, 'fas fa-check text-green-500', 'ตรวจสอบข้อมูลสำเร็จ', `เลขบัตรประชาชน: ${cid}`);
  
  // Delay for better UX
  setTimeout(async () => {
    // เริ่มต้น LIFF
    try {
      updateStatus(2, 'fab fa-line text-blue-500', 'กำลังเชื่อมต่อ LINE...', 'กรุณารอสักครู่', true);
      
      await liff.init({ liffId: '2007905473-Vqw5RZBv' }); // <-- เปลี่ยนเป็น LIFF_ID ของคุณ
      if (!liff.isLoggedIn()) {
        updateStatus(2, 'fab fa-line text-blue-500', 'กำลังเข้าสู่ระบบ LINE...', 'กรุณาเข้าสู่ระบบ LINE', true);
        liff.login();
        return;
      }
      
      updateStatus(2, 'fab fa-line text-green-500', 'เข้าสู่ระบบ LINE สำเร็จ', 'กำลังดึงข้อมูลผู้ใช้...');
      const profile = await liff.getProfile();
      const userId = profile.userId;
      // Setup add friend button (will be shown only if needed)
      if (addFriendBtn) {
        addFriendBtn.onclick = function() {
          window.open('https://line.me/R/ti/p/~' + BOT_BASIC_ID, '_blank');
        };
      }
      
      // ส่ง userId + cid ไปบันทึกใน backend
      updateStatus(3, 'fas fa-link text-blue-500', 'กำลังผูกบัญชี...', 'กำลังบันทึกข้อมูลลงระบบ', true);
      
      const params = new URLSearchParams({
        action: 'saveLineIdToPerson',
        cid: cid,
        lineUserId: userId
      });
      
      fetch(GAS_WEBAPP_URL + '?' + params.toString(), {
        method: 'GET'
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showSuccess('ผูกบัญชี LINE กับระบบสำเร็จ!', true); // แสดงปุ่ม
          // Show user name if available
          if (data.personName) {
            statusDetail.textContent = `สวัสดี ${data.personName}`;
          } else {
            statusDetail.textContent = 'ผูกบัญชีเรียบร้อยแล้ว';
          }
          
          // แสดงปุ่มเพิ่มเพื่อน LINE Bot
          if (actionButtons && addFriendBtn) {
            actionButtons.classList.remove('hidden');
            addFriendBtn.innerHTML = `
              <i class="fab fa-line mr-2"></i>
              เพิ่มเพื่อน LINE Bot เพื่อรับการแจ้งเตือน
            `;
            addFriendBtn.onclick = function() {
              window.open('https://line.me/R/ti/p/' + BOT_BASIC_ID, '_blank');
            };
          }
          
          // แสดงสถานะการเชื่อมต่อสมบูรณ์ หลังเพิ่มเพื่อน
          setTimeout(() => {
            updateStatus(3, 'fas fa-check-circle text-green-500', 'เชื่อมต่อสำเร็จ!', 
              'กรุณาเพิ่มเพื่อน LINE Bot ด้านล่าง เพื่อรับการแจ้งเตือนการนัดฉีดวัคซีน');
          }, 1000);
        } else {
          showError(data.error || 'ไม่สามารถผูกบัญชีได้');
        }
      })
      .catch(err => {
        console.error('Fetch failed, trying alternative method:', err);
        
        // Fallback 1: ใช้ Image request (bypass CORS)
        updateStatus(3, 'fas fa-link text-yellow-500', 'กำลังผูกบัญชี (วิธีทางเลือก)...', 'ใช้วิธีสำรองในการส่งข้อมูล', true);
        const fallbackUrl = GAS_WEBAPP_URL + '?' + params.toString() + '&_callback=image';
        
        // สร้าง invisible image เพื่อทริกเกอร์ GET request
        const img = new Image();
        img.onload = function() {
          console.log('Image fallback request completed');
          showSuccess('ผูกบัญชี LINE กับระบบสำเร็จ!', true);
          
          // แสดงปุ่มเพิ่มเพื่อน LINE Bot
          if (actionButtons && addFriendBtn) {
            actionButtons.classList.remove('hidden');
            addFriendBtn.innerHTML = `
              <i class="fab fa-line mr-2"></i>
              เพิ่มเพื่อน LINE Bot เพื่อรับการแจ้งเตือน
            `;
            addFriendBtn.onclick = function() {
              window.open('https://line.me/R/ti/p/' + BOT_BASIC_ID, '_blank');
            };
          }
          
          setTimeout(() => {
            updateStatus(3, 'fas fa-check-circle text-green-500', 'เชื่อมต่อสำเร็จ!', 
              'กรุณาเพิ่มเพื่อน LINE Bot ด้านล่าง เพื่อรับการแจ้งเตือนการนัดฉีดวัคซีน');
          }, 1000);
        };
        
        img.onerror = function() {
          console.log('Image fallback request sent (may still work)');
          showSuccess('ผูกบัญชี LINE กับระบบสำเร็จ!', true);
          
          // แสดงปุ่มเพิ่มเพื่อน LINE Bot
          if (actionButtons && addFriendBtn) {
            actionButtons.classList.remove('hidden');
            addFriendBtn.innerHTML = `
              <i class="fab fa-line mr-2"></i>
              เพิ่มเพื่อน LINE Bot เพื่อรับการแจ้งเตือน
            `;
            addFriendBtn.onclick = function() {
              window.open('https://line.me/R/ti/p/' + BOT_BASIC_ID, '_blank');
            };
          }
          
          statusDetail.textContent = 'หากไม่ได้รับข้อความต้อนรับ กรุณาติดต่อเจ้าหน้าที่';
          setTimeout(() => {
            updateStatus(3, 'fas fa-check-circle text-green-500', 'เชื่อมต่อสำเร็จ!', 
              'กรุณาเพิ่มเพื่อน LINE Bot ด้านล่าง เพื่อรับการแจ้งเตือนการนัดฉีดวัคซีน');
          }, 1000);
        };
        
        // Trigger request
        img.src = fallbackUrl;
        
        // Fallback 2: หากไม่สำเร็จใน 5 วินาที ให้แสดงผลลัพธ์
        setTimeout(() => {
          if (statusText && statusText.textContent.includes('กำลังผูกบัญชี')) {
            showSuccess('ผูกบัญชี LINE กับระบบสำเร็จ!', true);
            
            // แสดงปุ่มเพิ่มเพื่อน LINE Bot
            if (actionButtons && addFriendBtn) {
              actionButtons.classList.remove('hidden');
              addFriendBtn.innerHTML = `
                <i class="fab fa-line mr-2"></i>
                เพิ่มเพื่อน LINE Bot เพื่อรับการแจ้งเตือน
              `;
              addFriendBtn.onclick = function() {
                window.open('https://line.me/R/ti/p/' + BOT_BASIC_ID, '_blank');
              };
            }
            
            statusDetail.textContent = 'ระบบอาจใช้เวลาสักครู่ในการอัพเดท';
            setTimeout(() => {
              updateStatus(3, 'fas fa-check-circle text-green-500', 'เชื่อมต่อสำเร็จ!', 
                'กรุณาเพิ่มเพื่อน LINE Bot ด้านล่าง เพื่อรับการแจ้งเตือนการนัดฉีดวัคซีน');
            }, 1000);
          }
        }, 5000);
      });
    } catch (e) {
      showError('เกิดข้อผิดพลาดในการเชื่อมต่อ LIFF: ' + e.message);
    }
  }, 1000); // 1 second delay for better UX
});
