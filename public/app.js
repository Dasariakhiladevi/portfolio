document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // MOBILE MENU TOGGLE
  // ==========================================
  const menuToggle = document.getElementById('menuToggle');
  const navMenu = document.getElementById('navMenu');

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      const icon = menuToggle.querySelector('i');
      if (navMenu.classList.contains('active')) {
        icon.className = 'fa-solid fa-xmark';
      } else {
        icon.className = 'fa-solid fa-bars';
      }
    });

    // Close menu when clicking a link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        const icon = menuToggle.querySelector('i');
        icon.className = 'fa-solid fa-bars';
      });
    });
  }

  // ==========================================
  // SCROLL ACTIVE SECTION SPY
  // ==========================================
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('.nav-link');

  const onScroll = () => {
    let current = '';
    const scrollPos = window.scrollY + 100; // Offset for navbar

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });

    // Handle navbar styling on scroll
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
      navbar.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
      navbar.style.padding = '0.5rem 0';
    } else {
      navbar.style.boxShadow = 'none';
      navbar.style.padding = '0';
    }
  };

  window.addEventListener('scroll', onScroll);
  onScroll(); // Run once initially

  // ==========================================
  // CONTACT FORM SUBMISSION
  // ==========================================
  const contactForm = document.getElementById('contactForm');
  const submitBtn = document.getElementById('submitBtn');
  const formFeedback = document.getElementById('formFeedback');

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Reset feedback
      formFeedback.style.display = 'none';
      formFeedback.className = 'form-feedback';
      formFeedback.innerHTML = '';

      // Get values
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const subject = document.getElementById('subject').value.trim();
      const message = document.getElementById('message').value.trim();

      // Client validation
      if (!name || !email || !message) {
        showFeedback('Please fill out all required fields.', 'error');
        return;
      }

      // Show loading state
      const originalBtnHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Sending...</span> <i class="fa-solid fa-spinner fa-spin"></i>';

      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, email, subject, message }),
        });

        const data = await response.json();

        if (response.ok) {
          showFeedback('Thank you! Your message has been sent successfully.', 'success');
          contactForm.reset();
          // Automatically refresh messages list if the modal is loaded
          fetchMessages();
        } else {
          showFeedback(data.error || 'Something went wrong. Please try again.', 'error');
        }
      } catch (error) {
        console.error('Submission error:', error);
        showFeedback('Server connection error. Please ensure the backend is running.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    });
  }

  function showFeedback(text, type) {
    formFeedback.innerHTML = text;
    formFeedback.classList.add(type);
    formFeedback.style.display = 'block';
  }

  // ==========================================
  // ADMIN MESSAGES MODAL & DASHBOARD
  // ==========================================
  const adminLoginBtn = document.getElementById('adminLoginBtn');
  const viewMessagesBtn = document.getElementById('viewMessagesBtn');
  const messageCountEl = document.getElementById('messageCount');
  const messagesModal = document.getElementById('messagesModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const messagesList = document.getElementById('messagesList');
  const adminModal = document.getElementById('adminModal');
  const closeAdminModalBtn = document.getElementById('closeAdminModalBtn');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const adminUsernameInput = document.getElementById('adminUsernameInput');
  const adminPasswordInput = document.getElementById('adminPasswordInput');
  const adminLoginError = document.getElementById('adminLoginError');

  let adminAuthenticated = false;

  const getStoredAdminUsername = () => sessionStorage.getItem('adminUsername');
  const getStoredAdminPassword = () => sessionStorage.getItem('adminPassword');

  const setAdminCredentials = (username, password) => {
    sessionStorage.setItem('adminUsername', username);
    sessionStorage.setItem('adminPassword', password);
  };

  const clearAdminCredentials = () => {
    sessionStorage.removeItem('adminUsername');
    sessionStorage.removeItem('adminPassword');
  };

  const setAdminState = (authenticated) => {
    adminAuthenticated = authenticated;
    if (viewMessagesBtn) {
      viewMessagesBtn.style.display = authenticated ? 'inline-flex' : 'none';
    }
    if (adminLoginBtn) {
      adminLoginBtn.textContent = authenticated ? 'Admin Logout' : 'Admin Login';
    }
    if (!authenticated && messageCountEl) {
      messageCountEl.textContent = '';
    }
  };

  const openAdminModal = () => {
    if (!adminModal) return;
    adminModal.classList.add('active');
    if (adminUsernameInput) {
      adminUsernameInput.value = '';
      adminUsernameInput.focus();
    }
    if (adminPasswordInput) {
      adminPasswordInput.value = '';
    }
    if (adminLoginError) {
      adminLoginError.textContent = '';
      adminLoginError.classList.remove('active');
    }
  };

  const closeAdminModal = () => {
    if (!adminModal) return;
    adminModal.classList.remove('active');
    if (adminLoginError) {
      adminLoginError.textContent = '';
      adminLoginError.classList.remove('active');
    }
  };

  const showAdminLoginError = (message) => {
    if (!adminLoginError) return;
    adminLoginError.textContent = message;
    adminLoginError.classList.add('active');
  };

  const setMessageCount = (label) => {
    if (!messageCountEl) return;
    messageCountEl.textContent = label;
    messageCountEl.style.color = label.includes('offline') ? '#f97316' : '';
  };

  const getAdminHeaders = () => {
    const username = getStoredAdminUsername();
    const password = getStoredAdminPassword();
    return username && password ? {
      'x-admin-username': username,
      'x-admin-password': password
    } : {};
  };

  const verifyAdmin = async ({ username, password } = {}) => {
    if (!username || !password) return false;
    try {
      const response = await fetch('/api/admin/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      return response.ok;
    } catch (error) {
      console.error('Admin validation error:', error);
      return false;
    }
  };

  const confirmAdmin = async () => {
    const username = getStoredAdminUsername();
    const password = getStoredAdminPassword();
    if (!username || !password) return false;

    const valid = await verifyAdmin({ username, password });
    if (!valid) {
      clearAdminCredentials();
    }

    return valid;
  };

  const handleAdminLogin = async () => {
    if (adminAuthenticated) {
      clearAdminCredentials();
      setAdminState(false);
      closeAdminModal();
      if (messagesModal) {
        messagesModal.classList.remove('active');
      }
      return;
    }

    openAdminModal();
  };

  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!adminUsernameInput || !adminPasswordInput) return;

      const username = adminUsernameInput.value.trim();
      const password = adminPasswordInput.value.trim();
      if (!username || !password) {
        showAdminLoginError('Both username and password are required.');
        return;
      }

      const valid = await verifyAdmin({ username, password });
      if (valid) {
        setAdminCredentials(username, password);
        setAdminState(true);
        closeAdminModal();
        fetchMessageCount();
      } else {
        showAdminLoginError('Invalid admin username or password.');
      }
    });
  }

  confirmAdmin().then((authenticated) => {
    setAdminState(authenticated);
    if (authenticated) {
      fetchMessageCount();
    }
  });

  const fetchMessageCount = async () => {
    if (!messageCountEl) return;
    try {
      const response = await fetch('/api/messages', {
        headers: getAdminHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const messages = await response.json();
      setMessageCount(`(${messages.length})`);
    } catch (error) {
      console.error('Message count fetch error:', error);
      setMessageCount('(offline)');
    }
  };

  if (adminLoginBtn) {
    adminLoginBtn.addEventListener('click', handleAdminLogin);
  }

  if (closeAdminModalBtn) {
    closeAdminModalBtn.addEventListener('click', closeAdminModal);
  }

  if (adminModal) {
    adminModal.addEventListener('click', (e) => {
      if (e.target === adminModal) {
        closeAdminModal();
      }
    });
  }

  if (viewMessagesBtn && messagesModal && closeModalBtn) {
    viewMessagesBtn.addEventListener('click', () => {
      if (!adminAuthenticated) {
        openAdminModal();
        return;
      }
      messagesModal.classList.add('active');
      fetchMessages();
    });

    closeModalBtn.addEventListener('click', () => {
      messagesModal.classList.remove('active');
    });

    // Close on click outside card
    messagesModal.addEventListener('click', (e) => {
      if (e.target === messagesModal) {
        messagesModal.classList.remove('active');
      }
    });
  }

  // Fetch messages from node server
  async function fetchMessages() {
    if (!messagesList) return;

    try {
      messagesList.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading messages...</p></div>';

      const response = await fetch('/api/messages', {
        headers: getAdminHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch');

      const messages = await response.json();
      renderMessages(messages);
    } catch (error) {
      console.error('Fetch messages error:', error);
      setMessageCount('(offline)');
      messagesList.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;"></i>
          <p>Failed to connect to the server to load messages.</p>
        </div>`;
    }
  }

  // Render messages list in modal
  function renderMessages(messages) {
    if (!messagesList) return;

    if (!messages || messages.length === 0) {
      messagesList.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-folder-open"></i>
          <p>No messages received yet. Submit a message through the contact form to see it display here!</p>
        </div>`;
      return;
    }

    // Sort by timestamp descending (newest first)
    messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    messagesList.innerHTML = '';
    messages.forEach(msg => {
      const dateStr = new Date(msg.timestamp).toLocaleString();
      const msgBox = document.createElement('div');
      msgBox.className = 'message-box';
      msgBox.innerHTML = `
        <div class="message-box-header">
          <div class="msg-sender-info">
            <h4>${escapeHtml(msg.name)}</h4>
            <p>
              <span><i class="fa-solid fa-envelope"></i> ${escapeHtml(msg.email)}</span>
            </p>
          </div>
          <span class="msg-time">${dateStr}</span>
        </div>
        <div class="msg-subject">Subject: ${escapeHtml(msg.subject)}</div>
        <div class="msg-text">${escapeHtml(msg.message)}</div>
        <div class="msg-actions">
          <button class="btn-delete-msg" data-id="${msg.id}">
            <i class="fa-solid fa-trash-can"></i> Delete message
          </button>
        </div>
      `;

      // Attach delete listener
      const deleteBtn = msgBox.querySelector('.btn-delete-msg');
      deleteBtn.addEventListener('click', () => deleteMessage(msg.id));

      messagesList.appendChild(msgBox);
    });
  }

  // Delete message
  async function deleteMessage(id) {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      const response = await fetch(`/api/messages/${id}`, {
        method: 'DELETE',
        headers: getAdminHeaders()
      });

      if (response.ok) {
        fetchMessages(); // Reload list
      } else {
        alert('Failed to delete message.');
      }
    } catch (error) {
      console.error('Delete message error:', error);
      alert('Connection error occurred while deleting.');
    }
  }

  // HTML escaping helper
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
