/**
 * ============================================================================
 * TaskFlow – Student Task Planning & Productivity System
 * Core Application Engine & Controllers
 * ============================================================================
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. DATE & TIME UTILITY HELPERS
  // --------------------------------------------------------------------------
  const DateUtils = {
    // Format a Date object to YYYY-MM-DD
    toISODateString(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },

    // Get today's ISO date string
    todayISO() {
      return this.toISODateString(new Date());
    },

    // Get tomorrow's ISO date string
    tomorrowISO() {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return this.toISODateString(d);
    },

    // Add days to date
    addDays(date, days) {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    },

    // Parse date and time into a Date object
    parseDateTime(dateStr, timeStr = '23:59') {
      if (!dateStr) return new Date();
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hours, minutes] = (timeStr || '23:59').split(':').map(Number);
      return new Date(year, month - 1, day, hours, minutes, 0);
    },

    // Check if date string is today
    isToday(dateStr) {
      return dateStr === this.todayISO();
    },

    // Check if date string is tomorrow
    isTomorrow(dateStr) {
      return dateStr === this.tomorrowISO();
    },

    // Check if task is overdue
    isOverdue(task) {
      if (task.completed) return false;
      const target = this.parseDateTime(task.dueDate, task.dueTime);
      return target.getTime() < Date.now();
    },

    // Check if task is upcoming (strictly after tomorrow)
    isUpcoming(task) {
      if (task.completed) return false;
      const today = this.todayISO();
      const tomorrow = this.tomorrowISO();
      return task.dueDate > tomorrow;
    },

    // Human-readable formatted date
    formatFriendly(dateStr, timeStr) {
      if (!dateStr) return 'No deadline';
      const isTod = this.isToday(dateStr);
      const isTom = this.isTomorrow(dateStr);
      const d = this.parseDateTime(dateStr, timeStr);

      const timeFormatted = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (isTod) return `Today at ${timeFormatted}`;
      if (isTom) return `Tomorrow at ${timeFormatted}`;

      const options = { month: 'short', day: 'numeric' };
      if (d.getFullYear() !== new Date().getFullYear()) {
        options.year = 'numeric';
      }
      return `${d.toLocaleDateString(undefined, options)} at ${timeFormatted}`;
    },

    // Countdown / status badge text
    getDeadlineBadge(task) {
      if (task.completed) {
        return { text: 'Completed', className: 'badge-success', icon: 'fa-check' };
      }

      const now = Date.now();
      const target = this.parseDateTime(task.dueDate, task.dueTime).getTime();
      const diffMs = target - now;

      if (diffMs < 0) {
        const diffDays = Math.abs(Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        const text = diffDays === 0 ? 'Overdue today' : `Overdue by ${diffDays}d`;
        return { text, className: 'badge-danger', icon: 'fa-triangle-exclamation', isOverdue: true };
      }

      if (this.isToday(task.dueDate)) {
        const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
        const text = diffHours <= 1 ? 'Due very soon!' : `Due in ${diffHours}h`;
        return { text, className: 'badge-warning', icon: 'fa-clock', isToday: true };
      }

      if (this.isTomorrow(task.dueDate)) {
        return { text: 'Due tomorrow', className: 'badge-warning', icon: 'fa-calendar-day', isTomorrow: true };
      }

      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return { text: `Due in ${days} days`, className: 'badge-info', icon: 'fa-calendar' };
    }
  };

  // --------------------------------------------------------------------------
  // 2. WEB AUDIO SYNTHESIZER (NO EXTERNAL ASSETS NEEDED)
  // --------------------------------------------------------------------------
  const SoundFX = {
    audioCtx: null,

    init() {
      if (!this.audioCtx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioCtxClass();
      }
    },

    play(type) {
      if (!Store.settings.soundEnabled) return;
      try {
        this.init();
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
        if (!this.audioCtx) return;

        const ctx = this.audioCtx;
        const now = ctx.currentTime;

        if (type === 'complete') {
          // Pleasant high-pitched double chime
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(587.33, now); // D5
          osc1.frequency.exponentialRampToValueAtTime(880.0, now + 0.12); // A5

          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(880.0, now + 0.12);
          osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.28); // D6

          gainNode.gain.setValueAtTime(0.18, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

          osc1.connect(gainNode);
          osc2.connect(gainNode);
          gainNode.connect(ctx.destination);

          osc1.start(now);
          osc2.start(now + 0.12);
          osc1.stop(now + 0.12);
          osc2.stop(now + 0.45);
        } else if (type === 'click') {
          // Subtle soft pop
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(320, now);
          gainNode.gain.setValueAtTime(0.06, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.05);
        } else if (type === 'delete') {
          // Low gentle drop
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(260, now);
          osc.frequency.exponentialRampToValueAtTime(130, now + 0.15);
          gainNode.gain.setValueAtTime(0.1, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.2);
        } else if (type === 'alarm') {
          // Timer finished bell
          for (let i = 0; i < 3; i++) {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(659.25, now + i * 0.2); // E5
            gainNode.gain.setValueAtTime(0.2, now + i * 0.2);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.35);
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.start(now + i * 0.2);
            osc.stop(now + i * 0.2 + 0.35);
          }
        }
      } catch (err) {
        console.warn('Audio sound fx error:', err);
      }
    }
  };

  // --------------------------------------------------------------------------
  // 3. CONFETTI CELEBRATION SYSTEM
  // --------------------------------------------------------------------------
  const Confetti = {
    canvas: null,
    ctx: null,
    particles: [],
    animationId: null,

    init() {
      this.canvas = document.getElementById('confettiCanvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
    },

    resize() {
      if (!this.canvas) return;
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    },

    burst(x = window.innerWidth / 2, y = window.innerHeight / 2) {
      if (!Store.settings.confettiEnabled || !this.canvas) return;
      this.resize();

      const colors = ['#64242E', '#D9536C', '#E8A3AC', '#E9D4C3', '#FAF6F1', '#852839', '#F0C2C8', '#D4A373'];
      const count = 75;

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 12 + 4;
        this.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 8 + 4,
          tilt: Math.random() * 10,
          tiltSpeed: Math.random() * 0.2 + 0.05,
          gravity: 0.35,
          friction: 0.96,
          life: 1,
          decay: Math.random() * 0.02 + 0.012
        });
      }

      if (!this.animationId) {
        this.loop();
      }
    },

    loop() {
      if (!this.ctx) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.vx *= p.friction;
        p.vy = p.vy * p.friction + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.tilt += p.tiltSpeed;
        p.life -= p.decay;

        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }

        this.ctx.save();
        this.ctx.globalAlpha = p.life;
        this.ctx.fillStyle = p.color;
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.tilt);
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        this.ctx.restore();
      }

      if (this.particles.length > 0) {
        this.animationId = requestAnimationFrame(() => this.loop());
      } else {
        this.animationId = null;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  };

  // --------------------------------------------------------------------------
  // 4. STORAGE & DEFAULT SAMPLE STUDENT DATA
  // --------------------------------------------------------------------------
  const STORAGE_KEYS = {
    TASKS: 'taskflow_student_tasks_v1',
    SETTINGS: 'taskflow_student_settings_v1',
    PROFILE: 'taskflow_student_profile_v1',
    TIMER_STATS: 'taskflow_timer_stats_v1'
  };

  const Store = {
    tasks: [],
    settings: {
      theme: 'light',
      soundEnabled: true,
      confettiEnabled: true
    },
    profile: {
      name: 'Alex Morgan',
      major: 'Computer Science • 3rd Year',
      dailyGoal: 4
    },
    timerStats: {
      completedSessionsToday: 0,
      totalMinutesToday: 0,
      lastDate: DateUtils.todayISO()
    },

    init() {
      this.loadSettings();
      this.loadProfile();
      this.loadTimerStats();
      this.loadTasks();
    },

    loadSettings() {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        try {
          this.settings = { ...this.settings, ...JSON.parse(saved) };
        } catch (e) {
          console.error('Error parsing settings:', e);
        }
      }
    },

    saveSettings() {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    },

    loadProfile() {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (saved) {
        try {
          this.profile = { ...this.profile, ...JSON.parse(saved) };
        } catch (e) {
          console.error('Error parsing profile:', e);
        }
      }
    },

    saveProfile() {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(this.profile));
    },

    loadTimerStats() {
      const saved = localStorage.getItem(STORAGE_KEYS.TIMER_STATS);
      if (saved) {
        try {
          const stats = JSON.parse(saved);
          if (stats.lastDate === DateUtils.todayISO()) {
            this.timerStats = stats;
          } else {
            // New day reset
            this.timerStats = {
              completedSessionsToday: 0,
              totalMinutesToday: 0,
              lastDate: DateUtils.todayISO()
            };
            this.saveTimerStats();
          }
        } catch (e) {
          console.error('Error parsing timer stats:', e);
        }
      }
    },

    saveTimerStats() {
      localStorage.setItem(STORAGE_KEYS.TIMER_STATS, JSON.stringify(this.timerStats));
    },

    loadTasks() {
      const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (saved) {
        try {
          this.tasks = JSON.parse(saved);
        } catch (e) {
          console.error('Error loading tasks:', e);
          this.seedDemoData();
        }
      } else {
        // First visit: Seed realistic sample student tasks
        this.seedDemoData();
      }
    },

    saveTasks() {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(this.tasks));
    },

    seedDemoData() {
      const now = new Date();
      const today = DateUtils.todayISO();
      const tomorrow = DateUtils.tomorrowISO();
      const yesterday = DateUtils.toISODateString(DateUtils.addDays(now, -1));
      const in2Days = DateUtils.toISODateString(DateUtils.addDays(now, 2));
      const in4Days = DateUtils.toISODateString(DateUtils.addDays(now, 4));
      const in7Days = DateUtils.toISODateString(DateUtils.addDays(now, 7));

      this.tasks = [
        {
          id: 'task-1',
          title: 'CS301: Data Structures Lab 4 (AVL & Red-Black Trees)',
          category: 'Assignment',
          priority: 'High',
          dueDate: today,
          dueTime: '23:59',
          description: 'Implement insertion and rotation operations. Verify tree balances with unit test assertions before submission to Gradescope.',
          completed: false,
          subtasks: [
            { id: 'st-1', text: 'Write left & right rotation helper methods', done: true },
            { id: 'st-2', text: 'Implement rebalance() method', done: true },
            { id: 'st-3', text: 'Run edge case unit tests & benchmark', done: false },
            { id: 'st-4', text: 'Export code and submit zip on portal', done: false }
          ],
          createdAt: Date.now() - 86400000 * 2
        },
        {
          id: 'task-2',
          title: 'Operating Systems: Midterm Exam Preparation',
          category: 'Study',
          priority: 'High',
          dueDate: in2Days,
          dueTime: '10:00',
          description: 'Review CPU scheduling algorithms (SJF, Round Robin, Multilevel feedback queues), Deadlock detection algorithms and Banker\'s algorithm.',
          completed: false,
          subtasks: [
            { id: 'st-5', text: 'Review Chapter 5 lecture slides', done: true },
            { id: 'st-6', text: 'Solve 2025 Midterm sample paper', done: false },
            { id: 'st-7', text: 'Summarize Banker\'s algorithm formula sheet', done: false }
          ],
          createdAt: Date.now() - 86400000
        },
        {
          id: 'task-3',
          title: 'Software Engineering Capstone: User Story Map & Prototype',
          category: 'Project',
          priority: 'High',
          dueDate: in4Days,
          dueTime: '18:00',
          description: 'Collaborate with frontend group on Figma wireframes. Prepare 5-minute lightning demo for professor milestone check-in.',
          completed: false,
          subtasks: [
            { id: 'st-8', text: 'Finalize core user journey mapping', done: true },
            { id: 'st-9', text: 'Design interactive navigation flows in Figma', done: false },
            { id: 'st-10', text: 'Record 2-minute demo video screen recording', done: false }
          ],
          createdAt: Date.now() - 86400000 * 3
        },
        {
          id: 'task-4',
          title: 'Calculus III: Problem Set 5 (Surface Integrals)',
          category: 'Assignment',
          priority: 'Medium',
          dueDate: tomorrow,
          dueTime: '17:00',
          description: 'Questions 14 through 28 from Stewart Calculus textbook Chapter 16. Scan handwritten steps neatly into PDF format.',
          completed: false,
          subtasks: [
            { id: 'st-11', text: 'Solve divergence theorem questions', done: false },
            { id: 'st-12', text: 'Verify answers with study partner', done: false }
          ],
          createdAt: Date.now() - 40000000
        },
        {
          id: 'task-5',
          title: 'Computer Architecture: Read Pipelining & Branch Prediction',
          category: 'Study',
          priority: 'Low',
          dueDate: in7Days,
          dueTime: '21:00',
          description: 'Patterson & Hennessy Chapter 4: Hardware hazards (data, structural, control) and dynamic branch prediction buffers.',
          completed: false,
          subtasks: [],
          createdAt: Date.now() - 50000000
        },
        {
          id: 'task-6',
          title: 'Physics Lab 2: Simple Pendulum Error Analysis Report',
          category: 'Assignment',
          priority: 'Medium',
          dueDate: yesterday,
          dueTime: '23:59',
          description: 'Compute percent uncertainty, standard deviation, and plot T^2 vs length on OriginPro.',
          completed: true,
          subtasks: [
            { id: 'st-13', text: 'Calculate mean period and standard error', done: true },
            { id: 'st-14', text: 'Submit PDF report to Canvas', done: true }
          ],
          createdAt: Date.now() - 86400000 * 4,
          completedAt: Date.now() - 3600000 * 8
        },
        {
          id: 'task-7',
          title: 'Renew University Campus Library Card & Return Textbooks',
          category: 'Personal',
          priority: 'Low',
          dueDate: yesterday,
          dueTime: '16:00',
          description: 'Visit student services desk on 1st floor to renew borrowing privileges before late fee penalty kicks in.',
          completed: true,
          subtasks: [],
          createdAt: Date.now() - 86400000 * 5,
          completedAt: Date.now() - 3600000 * 20
        },
        {
          id: 'task-8',
          title: 'Submit Spring Semester On-Campus Housing Application',
          category: 'Personal',
          priority: 'High',
          dueDate: yesterday,
          dueTime: '12:00',
          description: 'Select roommate preference and submit $50 room deposit via student bursar portal.',
          completed: false, // Overdue by intent for student demonstration!
          subtasks: [
            { id: 'st-15', text: 'Log into residence portal', done: true },
            { id: 'st-16', text: 'Complete dorm preference rankings', done: false }
          ],
          createdAt: Date.now() - 86400000 * 6
        }
      ];

      this.saveTasks();
    },

    // CRUD Methods
    addTask(taskData) {
      const newTask = {
        id: 'task-' + Date.now(),
        title: taskData.title.trim(),
        category: taskData.category,
        priority: taskData.priority,
        dueDate: taskData.dueDate,
        dueTime: taskData.dueTime || '23:59',
        description: taskData.description ? taskData.description.trim() : '',
        subtasks: taskData.subtasks || [],
        completed: false,
        createdAt: Date.now()
      };
      this.tasks.unshift(newTask);
      this.saveTasks();
      return newTask;
    },

    updateTask(id, updatedFields) {
      const idx = this.tasks.findIndex(t => t.id === id);
      if (idx !== -1) {
        this.tasks[idx] = { ...this.tasks[idx], ...updatedFields };
        this.saveTasks();
        return this.tasks[idx];
      }
      return null;
    },

    toggleTaskCompletion(id) {
      const task = this.tasks.find(t => t.id === id);
      if (task) {
        task.completed = !task.completed;
        task.completedAt = task.completed ? Date.now() : null;
        this.saveTasks();
        return task;
      }
      return null;
    },

    deleteTask(id) {
      const initialLen = this.tasks.length;
      this.tasks = this.tasks.filter(t => t.id !== id);
      if (this.tasks.length !== initialLen) {
        this.saveTasks();
        return true;
      }
      return false;
    },

    clearCompleted() {
      const initialLen = this.tasks.length;
      this.tasks = this.tasks.filter(t => !t.completed);
      this.saveTasks();
      return initialLen - this.tasks.length;
    },

    resetAll() {
      this.tasks = [];
      this.saveTasks();
    }
  };

  // --------------------------------------------------------------------------
  // 5. TOAST NOTIFICATION CONTROLLER
  // --------------------------------------------------------------------------
  const Toast = {
    container: null,

    init() {
      this.container = document.getElementById('toastContainer');
    },

    show(message, type = 'info', duration = 3200) {
      if (!this.container) return;

      const icons = {
        success: 'fa-circle-check',
        error: 'fa-circle-exclamation',
        warning: 'fa-triangle-exclamation',
        info: 'fa-circle-info'
      };

      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.innerHTML = `
        <div class="toast-icon">
          <i class="fa-solid ${icons[type] || 'fa-circle-info'}"></i>
        </div>
        <div class="toast-message">${message}</div>
      `;

      this.container.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }
  };

  // --------------------------------------------------------------------------
  // 6. UI VIEW CONTROLLER & NAVIGATION
  // --------------------------------------------------------------------------
  const UI = {
    currentView: 'dashboard',
    activeFilterCategory: 'all',
    activeFilterPriority: 'all',
    activeFilterStatus: 'all',
    searchQuery: '',
    sortOption: 'deadline-asc',
    layoutMode: 'grid', // 'grid' | 'list'
    activeSubtasksDraft: [],
    editingTaskId: null,
    deletingTaskId: null,

    init() {
      this.bindNavigation();
      this.bindThemeToggle();
      this.bindSidebarMobile();
      this.bindFilterEvents();
      this.bindTaskModal();
      this.bindDetailModal();
      this.bindDeleteModal();
      this.bindTimerControls();
      this.bindSettingsForm();
      this.bindKeyboardShortcuts();
      this.renderAll();
    },

    // Navigation Switching
    bindNavigation() {
      const navLinks = document.querySelectorAll('.nav-link[data-view]');
      navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetView = link.getAttribute('data-view');
          this.switchView(targetView);
          SoundFX.play('click');
        });
      });

      // Stat cards on dashboard click-to-filter
      document.querySelectorAll('.stat-card[data-filter]').forEach(card => {
        card.addEventListener('click', () => {
          const filter = card.getAttribute('data-filter');
          this.switchView('tasks');
          const statusSelect = document.getElementById('statusFilter');
          if (statusSelect) {
            statusSelect.value = filter;
            this.activeFilterStatus = filter;
            this.renderFilteredTasks();
          }
        });
      });

      // Quick "View All" buttons on dashboard
      const viewAllToday = document.getElementById('viewAllTodayBtn');
      if (viewAllToday) {
        viewAllToday.addEventListener('click', () => this.switchView('today'));
      }

      const viewAllUpcoming = document.getElementById('viewAllUpcomingBtn');
      if (viewAllUpcoming) {
        viewAllUpcoming.addEventListener('click', () => this.switchView('upcoming'));
      }

      // Review overdue alert button
      const viewOverdueBtn = document.getElementById('viewOverdueBtn');
      if (viewOverdueBtn) {
        viewOverdueBtn.addEventListener('click', () => this.switchView('overdue'));
      }
    },

    switchView(viewName) {
      this.currentView = viewName;

      // Update Navigation links active state
      document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('data-view') === viewName) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });

      // Update View panels
      document.querySelectorAll('.view-panel').forEach(panel => {
        panel.classList.remove('active');
      });

      const activePanel = document.getElementById(`view${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`);
      if (activePanel) {
        activePanel.classList.add('active');
      }

      // Update page title
      const pageTitle = document.getElementById('pageTitle');
      const titles = {
        dashboard: 'Dashboard',
        tasks: 'My Tasks',
        today: 'Today’s Tasks',
        upcoming: 'Upcoming Deadlines',
        overdue: 'Overdue Assignments',
        completed: 'Completed Archive',
        categories: 'Categories & Courses',
        timer: 'Study Focus Timer',
        settings: 'Settings & Data'
      };
      if (pageTitle) {
        pageTitle.textContent = titles[viewName] || 'Dashboard';
      }

      // Close mobile sidebar if open
      this.closeMobileSidebar();

      // Refresh corresponding content
      this.renderCurrentView();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // Theme Toggle
    bindThemeToggle() {
      const themeBtn = document.getElementById('themeToggleBtn');
      const themeIcon = document.getElementById('themeIcon');
      const themeBtnLight = document.getElementById('themeBtnLight');
      const themeBtnDark = document.getElementById('themeBtnDark');

      const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        Store.settings.theme = theme;
        Store.saveSettings();

        if (themeIcon) {
          themeIcon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        }

        if (themeBtnLight && themeBtnDark) {
          if (theme === 'dark') {
            themeBtnDark.classList.add('active');
            themeBtnLight.classList.remove('active');
          } else {
            themeBtnLight.classList.add('active');
            themeBtnDark.classList.remove('active');
          }
        }
      };

      // Set initial theme
      applyTheme(Store.settings.theme || 'light');

      if (themeBtn) {
        themeBtn.addEventListener('click', () => {
          const next = Store.settings.theme === 'dark' ? 'light' : 'dark';
          applyTheme(next);
          SoundFX.play('click');
          Toast.show(`Switched to ${next === 'dark' ? 'Cabernet Velvet Dark' : 'Mother of Pearl Light'} mode`, 'info', 1800);
        });
      }

      if (themeBtnLight) {
        themeBtnLight.addEventListener('click', () => applyTheme('light'));
      }
      if (themeBtnDark) {
        themeBtnDark.addEventListener('click', () => applyTheme('dark'));
      }

      // Sound toggle
      const soundBtn = document.getElementById('soundToggleBtn');
      const soundIcon = document.getElementById('soundIcon');
      const soundCheckbox = document.getElementById('soundSettingCheckbox');

      const updateSoundUI = () => {
        if (soundIcon) {
          soundIcon.className = Store.settings.soundEnabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
        }
        if (soundCheckbox) {
          soundCheckbox.checked = Store.settings.soundEnabled;
        }
      };
      updateSoundUI();

      if (soundBtn) {
        soundBtn.addEventListener('click', () => {
          Store.settings.soundEnabled = !Store.settings.soundEnabled;
          Store.saveSettings();
          updateSoundUI();
          if (Store.settings.soundEnabled) SoundFX.play('click');
          Toast.show(Store.settings.soundEnabled ? 'Sound enabled' : 'Sound muted', 'info', 1500);
        });
      }

      if (soundCheckbox) {
        soundCheckbox.addEventListener('change', (e) => {
          Store.settings.soundEnabled = e.target.checked;
          Store.saveSettings();
          updateSoundUI();
        });
      }

      // Confetti toggle in settings
      const confettiCheckbox = document.getElementById('confettiSettingCheckbox');
      if (confettiCheckbox) {
        confettiCheckbox.checked = Store.settings.confettiEnabled;
        confettiCheckbox.addEventListener('change', (e) => {
          Store.settings.confettiEnabled = e.target.checked;
          Store.saveSettings();
        });
      }
    },

    // Mobile Sidebar Drawer
    bindSidebarMobile() {
      const toggleBtn = document.getElementById('menuToggleBtn');
      const closeBtn = document.getElementById('sidebarCloseBtn');
      const sidebar = document.getElementById('sidebar');
      const backdrop = document.getElementById('sidebarBackdrop');

      if (toggleBtn && sidebar && backdrop) {
        toggleBtn.addEventListener('click', () => {
          sidebar.classList.add('open');
          backdrop.classList.add('open');
        });
      }

      const closeHandler = () => this.closeMobileSidebar();
      if (closeBtn) closeBtn.addEventListener('click', closeHandler);
      if (backdrop) backdrop.addEventListener('click', closeHandler);
    },

    closeMobileSidebar() {
      const sidebar = document.getElementById('sidebar');
      const backdrop = document.getElementById('sidebarBackdrop');
      if (sidebar) sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('open');
    },

    // Keyboard Shortcuts
    bindKeyboardShortcuts() {
      window.addEventListener('keydown', (e) => {
        // Ignore if user is inside an input/textarea
        const tag = e.target.tagName.toLowerCase();
        const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';

        if (e.key === 'Escape') {
          this.closeAllModals();
        }

        if (!isInput) {
          if (e.key === 'n' || e.key === 'N') {
            e.preventDefault();
            this.openTaskModal();
          } else if (e.key === '/' || (e.ctrlKey && e.key === 'k')) {
            e.preventDefault();
            const search = document.getElementById('globalSearchInput');
            if (search) search.focus();
          }
        }
      });
    },

    closeAllModals() {
      document.querySelectorAll('.modal-backdrop').forEach(modal => {
        modal.classList.remove('open');
      });
    },

    // ------------------------------------------------------------------------
    // FILTER, SEARCH & SORT CONTROLLERS
    // ------------------------------------------------------------------------
    bindFilterEvents() {
      const globalSearch = document.getElementById('globalSearchInput');
      const clearGlobalSearch = document.getElementById('clearGlobalSearch');
      const taskSearch = document.getElementById('taskSearchInput');
      const clearTaskSearch = document.getElementById('clearTaskSearch');

      const categoryFilter = document.getElementById('categoryFilter');
      const priorityFilter = document.getElementById('priorityFilter');
      const statusFilter = document.getElementById('statusFilter');
      const sortOption = document.getElementById('sortOption');
      const filterResetBtn = document.getElementById('filterResetBtn');

      const gridBtn = document.getElementById('layoutGridBtn');
      const listBtn = document.getElementById('layoutListBtn');

      // Global Topbar Search
      if (globalSearch) {
        globalSearch.addEventListener('input', (e) => {
          this.searchQuery = e.target.value.trim().toLowerCase();
          if (clearGlobalSearch) clearGlobalSearch.style.display = this.searchQuery ? 'block' : 'none';
          if (taskSearch) taskSearch.value = e.target.value;
          if (this.currentView !== 'tasks') {
            this.switchView('tasks');
          } else {
            this.renderFilteredTasks();
          }
        });
      }

      if (clearGlobalSearch) {
        clearGlobalSearch.addEventListener('click', () => {
          if (globalSearch) globalSearch.value = '';
          if (taskSearch) taskSearch.value = '';
          clearGlobalSearch.style.display = 'none';
          this.searchQuery = '';
          this.renderFilteredTasks();
        });
      }

      // My Tasks Page Search
      if (taskSearch) {
        taskSearch.addEventListener('input', (e) => {
          this.searchQuery = e.target.value.trim().toLowerCase();
          if (clearTaskSearch) clearTaskSearch.style.display = this.searchQuery ? 'block' : 'none';
          if (globalSearch) globalSearch.value = e.target.value;
          this.renderFilteredTasks();
        });
      }

      if (clearTaskSearch) {
        clearTaskSearch.addEventListener('click', () => {
          if (taskSearch) taskSearch.value = '';
          if (globalSearch) globalSearch.value = '';
          clearTaskSearch.style.display = 'none';
          this.searchQuery = '';
          this.renderFilteredTasks();
        });
      }

      // Dropdowns
      if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
          this.activeFilterCategory = e.target.value;
          this.renderFilteredTasks();
        });
      }

      if (priorityFilter) {
        priorityFilter.addEventListener('change', (e) => {
          this.activeFilterPriority = e.target.value;
          this.renderFilteredTasks();
        });
      }

      if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
          this.activeFilterStatus = e.target.value;
          this.renderFilteredTasks();
        });
      }

      if (sortOption) {
        sortOption.addEventListener('change', (e) => {
          this.sortOption = e.target.value;
          this.renderFilteredTasks();
        });
      }

      // Reset
      if (filterResetBtn) {
        filterResetBtn.addEventListener('click', () => {
          this.searchQuery = '';
          this.activeFilterCategory = 'all';
          this.activeFilterPriority = 'all';
          this.activeFilterStatus = 'all';
          this.sortOption = 'deadline-asc';

          if (globalSearch) globalSearch.value = '';
          if (taskSearch) taskSearch.value = '';
          if (categoryFilter) categoryFilter.value = 'all';
          if (priorityFilter) priorityFilter.value = 'all';
          if (statusFilter) statusFilter.value = 'all';
          if (sortOption) sortOption.value = 'deadline-asc';

          SoundFX.play('click');
          this.renderFilteredTasks();
          Toast.show('Filters reset to default', 'info', 1800);
        });
      }

      // Layout Switcher (Grid vs List)
      if (gridBtn && listBtn) {
        gridBtn.addEventListener('click', () => {
          this.layoutMode = 'grid';
          gridBtn.classList.add('active');
          listBtn.classList.remove('active');
          const container = document.getElementById('mainTasksContainer');
          if (container) container.classList.remove('list-layout');
        });

        listBtn.addEventListener('click', () => {
          this.layoutMode = 'list';
          listBtn.classList.add('active');
          gridBtn.classList.remove('active');
          const container = document.getElementById('mainTasksContainer');
          if (container) container.classList.add('list-layout');
        });
      }

      // Mark All Shown as Done batch button
      const markAllDoneBtn = document.getElementById('markAllCompletedBtn');
      if (markAllDoneBtn) {
        markAllDoneBtn.addEventListener('click', () => {
          const visibleTasks = this.getFilteredTasks().filter(t => !t.completed);
          if (visibleTasks.length === 0) {
            Toast.show('No pending tasks to mark in current view', 'info', 2000);
            return;
          }
          visibleTasks.forEach(t => {
            t.completed = true;
            t.completedAt = Date.now();
          });
          Store.saveTasks();
          SoundFX.play('complete');
          Confetti.burst();
          this.renderAll();
          Toast.show(`Marked ${visibleTasks.length} tasks as completed! 🎉`, 'success', 2500);
        });
      }
    },

    getFilteredTasks() {
      let filtered = [...Store.tasks];

      // Search Query filter
      if (this.searchQuery) {
        filtered = filtered.filter(task => {
          const titleMatch = task.title.toLowerCase().includes(this.searchQuery);
          const descMatch = (task.description || '').toLowerCase().includes(this.searchQuery);
          const catMatch = (task.category || '').toLowerCase().includes(this.searchQuery);
          return titleMatch || descMatch || catMatch;
        });
      }

      // Category filter
      if (this.activeFilterCategory !== 'all') {
        filtered = filtered.filter(task => task.category === this.activeFilterCategory);
      }

      // Priority filter
      if (this.activeFilterPriority !== 'all') {
        filtered = filtered.filter(task => task.priority === this.activeFilterPriority);
      }

      // Status filter
      if (this.activeFilterStatus !== 'all') {
        if (this.activeFilterStatus === 'completed') {
          filtered = filtered.filter(task => task.completed);
        } else if (this.activeFilterStatus === 'pending') {
          filtered = filtered.filter(task => !task.completed && !DateUtils.isOverdue(task));
        } else if (this.activeFilterStatus === 'overdue') {
          filtered = filtered.filter(task => DateUtils.isOverdue(task));
        }
      }

      // Sorting
      filtered.sort((a, b) => {
        const timeA = DateUtils.parseDateTime(a.dueDate, a.dueTime).getTime();
        const timeB = DateUtils.parseDateTime(b.dueDate, b.dueTime).getTime();

        const priorityOrder = { High: 3, Medium: 2, Low: 1 };

        switch (this.sortOption) {
          case 'deadline-asc':
            return timeA - timeB;
          case 'deadline-desc':
            return timeB - timeA;
          case 'priority-desc':
            return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
          case 'priority-asc':
            return (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
          case 'title-asc':
            return a.title.localeCompare(b.title);
          case 'created-desc':
            return (b.createdAt || 0) - (a.createdAt || 0);
          default:
            return timeA - timeB;
        }
      });

      return filtered;
    },

    // ------------------------------------------------------------------------
    // TASK MODAL CONTROLLER (ADD & EDIT)
    // ------------------------------------------------------------------------
    bindTaskModal() {
      const modal = document.getElementById('taskModal');
      const form = document.getElementById('taskForm');
      const closeBtn = document.getElementById('taskModalCloseBtn');
      const cancelBtn = document.getElementById('taskModalCancelBtn');

      // Open triggers
      const openModalButtons = [
        document.getElementById('sidebarQuickAddBtn'),
        document.getElementById('topbarNewTaskBtn'),
        document.getElementById('openAddTaskModalBtn'),
        document.getElementById('todayAddTaskBtn'),
        document.getElementById('upcomingAddTaskBtn'),
        document.getElementById('fabAddBtn')
      ];

      openModalButtons.forEach(btn => {
        if (btn) {
          btn.addEventListener('click', () => {
            SoundFX.play('click');
            this.openTaskModal();
          });
        }
      });

      if (closeBtn) closeBtn.addEventListener('click', () => this.closeTaskModal());
      if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeTaskModal());

      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) this.closeTaskModal();
        });
      }

      // Date shortcut pills
      const chipToday = document.getElementById('chipToday');
      const chipTomorrow = document.getElementById('chipTomorrow');
      const chipWeekend = document.getElementById('chipWeekend');
      const chipNextWeek = document.getElementById('chipNextWeek');
      const dueDateInput = document.getElementById('taskDueDateInput');

      if (chipToday && dueDateInput) {
        chipToday.addEventListener('click', () => {
          dueDateInput.value = DateUtils.todayISO();
        });
      }
      if (chipTomorrow && dueDateInput) {
        chipTomorrow.addEventListener('click', () => {
          dueDateInput.value = DateUtils.tomorrowISO();
        });
      }
      if (chipWeekend && dueDateInput) {
        chipWeekend.addEventListener('click', () => {
          const d = new Date();
          const day = d.getDay();
          const daysUntilSat = (6 - day + 7) % 7 || 7;
          dueDateInput.value = DateUtils.toISODateString(DateUtils.addDays(d, daysUntilSat));
        });
      }
      if (chipNextWeek && dueDateInput) {
        chipNextWeek.addEventListener('click', () => {
          const d = new Date();
          const day = d.getDay();
          const daysUntilMon = (1 - day + 7) % 7 || 7;
          dueDateInput.value = DateUtils.toISODateString(DateUtils.addDays(d, daysUntilMon));
        });
      }

      // Subtask draft addition inside modal
      const newSubtaskInput = document.getElementById('newSubtaskInput');
      const addSubtaskBtn = document.getElementById('addSubtaskBtn');

      const addSubtask = () => {
        const text = newSubtaskInput.value.trim();
        if (!text) return;
        this.activeSubtasksDraft.push({
          id: 'st-' + Date.now() + Math.random().toString(36).substr(2, 4),
          text,
          done: false
        });
        newSubtaskInput.value = '';
        this.renderSubtasksDraftList();
        SoundFX.play('click');
      };

      if (addSubtaskBtn && newSubtaskInput) {
        addSubtaskBtn.addEventListener('click', addSubtask);
        newSubtaskInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addSubtask();
          }
        });
      }

      // Form submission
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleTaskFormSubmit();
        });
      }
    },

    openTaskModal(taskToEdit = null) {
      const modal = document.getElementById('taskModal');
      const titleInput = document.getElementById('taskTitleInput');
      const categoryInput = document.getElementById('taskCategoryInput');
      const dueDateInput = document.getElementById('taskDueDateInput');
      const dueTimeInput = document.getElementById('taskDueTimeInput');
      const descInput = document.getElementById('taskDescInput');
      const modalTitle = document.getElementById('taskModalTitle');
      const modalIcon = document.getElementById('taskModalIcon');
      const submitBtnText = document.getElementById('taskSubmitBtnText');
      const taskIdInput = document.getElementById('taskIdInput');

      if (!modal) return;

      if (taskToEdit) {
        // Edit Mode
        this.editingTaskId = taskToEdit.id;
        taskIdInput.value = taskToEdit.id;
        modalTitle.textContent = 'Edit Task';
        modalIcon.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
        submitBtnText.textContent = 'Update Task';

        titleInput.value = taskToEdit.title;
        categoryInput.value = taskToEdit.category;
        dueDateInput.value = taskToEdit.dueDate;
        dueTimeInput.value = taskToEdit.dueTime || '23:59';
        descInput.value = taskToEdit.description || '';

        // Radio priority
        const priorityRadio = document.querySelector(`input[name="taskPriority"][value="${taskToEdit.priority}"]`);
        if (priorityRadio) priorityRadio.checked = true;

        this.activeSubtasksDraft = JSON.parse(JSON.stringify(taskToEdit.subtasks || []));
      } else {
        // Add Mode
        this.editingTaskId = null;
        taskIdInput.value = '';
        modalTitle.textContent = 'Add New Task';
        modalIcon.innerHTML = '<i class="fa-solid fa-plus"></i>';
        submitBtnText.textContent = 'Save Task';

        titleInput.value = '';
        categoryInput.value = 'Assignment';
        dueDateInput.value = DateUtils.todayISO();
        dueTimeInput.value = '23:59';
        descInput.value = '';

        const mediumRadio = document.querySelector(`input[name="taskPriority"][value="Medium"]`);
        if (mediumRadio) mediumRadio.checked = true;

        this.activeSubtasksDraft = [];
      }

      this.renderSubtasksDraftList();
      modal.classList.add('open');
      setTimeout(() => titleInput.focus(), 150);
    },

    closeTaskModal() {
      const modal = document.getElementById('taskModal');
      if (modal) modal.classList.remove('open');
      this.editingTaskId = null;
      this.activeSubtasksDraft = [];
    },

    renderSubtasksDraftList() {
      const list = document.getElementById('subtasksList');
      const counter = document.getElementById('subtaskCounter');
      if (!list) return;

      list.innerHTML = '';
      if (counter) counter.textContent = `${this.activeSubtasksDraft.length} subtasks`;

      this.activeSubtasksDraft.forEach((st, idx) => {
        const item = document.createElement('li');
        item.className = 'subtask-item';
        item.innerHTML = `
          <div class="subtask-item-left">
            <span class="text-muted font-bold">${idx + 1}.</span>
            <span>${escapeHTML(st.text)}</span>
          </div>
          <button type="button" class="subtask-del-btn" title="Remove step">
            <i class="fa-solid fa-xmark"></i>
          </button>
        `;

        item.querySelector('.subtask-del-btn').addEventListener('click', () => {
          this.activeSubtasksDraft.splice(idx, 1);
          this.renderSubtasksDraftList();
          SoundFX.play('delete');
        });

        list.appendChild(item);
      });
    },

    handleTaskFormSubmit() {
      const titleInput = document.getElementById('taskTitleInput');
      const categoryInput = document.getElementById('taskCategoryInput');
      const dueDateInput = document.getElementById('taskDueDateInput');
      const dueTimeInput = document.getElementById('taskDueTimeInput');
      const descInput = document.getElementById('taskDescInput');
      const selectedPriority = document.querySelector('input[name="taskPriority"]:checked')?.value || 'Medium';

      const title = titleInput.value.trim();
      const dueDate = dueDateInput.value;

      if (!title) {
        Toast.show('Please provide a task title', 'warning');
        titleInput.focus();
        return;
      }

      if (!dueDate) {
        Toast.show('Please select a due date', 'warning');
        dueDateInput.focus();
        return;
      }

      const taskData = {
        title,
        category: categoryInput.value,
        priority: selectedPriority,
        dueDate,
        dueTime: dueTimeInput.value || '23:59',
        description: descInput.value,
        subtasks: this.activeSubtasksDraft
      };

      if (this.editingTaskId) {
        Store.updateTask(this.editingTaskId, taskData);
        SoundFX.play('click');
        Toast.show('Task updated successfully', 'success');
      } else {
        Store.addTask(taskData);
        SoundFX.play('click');
        Toast.show('New task scheduled', 'success');
      }

      this.closeTaskModal();
      this.renderAll();
    },

    // ------------------------------------------------------------------------
    // TASK DETAIL MODAL CONTROLLER
    // ------------------------------------------------------------------------
    bindDetailModal() {
      const modal = document.getElementById('taskDetailModal');
      const closeBtn = document.getElementById('taskDetailCloseBtn');
      if (closeBtn) closeBtn.addEventListener('click', () => this.closeDetailModal());
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) this.closeDetailModal();
        });
      }
    },

    openDetailModal(taskId) {
      const task = Store.tasks.find(t => t.id === taskId);
      if (!task) return;

      const modal = document.getElementById('taskDetailModal');
      const categoryBadge = document.getElementById('detailCategoryBadge');
      const title = document.getElementById('detailTitle');
      const statusBadge = document.getElementById('detailStatusBadge');
      const priorityBadge = document.getElementById('detailPriorityBadge');
      const deadlineText = document.getElementById('detailDeadlineText');
      const countdownBadge = document.getElementById('detailCountdownBadge');
      const descText = document.getElementById('detailDescText');
      const toggleCompleteBtn = document.getElementById('detailToggleCompleteBtn');
      const completeBtnText = document.getElementById('detailCompleteBtnText');
      const startTimerBtn = document.getElementById('detailStartTimerBtn');
      const editBtn = document.getElementById('detailEditBtn');
      const deleteBtn = document.getElementById('detailDeleteBtn');
      const subtasksSection = document.getElementById('detailSubtasksSection');
      const subtasksList = document.getElementById('detailSubtasksList');
      const subtaskProgress = document.getElementById('detailSubtaskProgressText');

      if (!modal) return;

      // Populate Data
      categoryBadge.className = `category-pill category-${task.category}`;
      categoryBadge.textContent = task.category;
      title.textContent = task.title;

      // Status
      statusBadge.className = `badge ${task.completed ? 'badge-success' : 'badge-warning'}`;
      statusBadge.textContent = task.completed ? 'Completed' : 'Pending';

      // Priority
      priorityBadge.className = `badge priority-badge-${task.priority}`;
      priorityBadge.textContent = `${task.priority} Priority`;

      // Deadline
      deadlineText.textContent = DateUtils.formatFriendly(task.dueDate, task.dueTime);
      const countdownInfo = DateUtils.getDeadlineBadge(task);
      countdownBadge.className = `badge ${countdownInfo.className}`;
      countdownBadge.innerHTML = `<i class="fa-solid ${countdownInfo.icon}"></i> ${countdownInfo.text}`;

      // Description
      descText.textContent = task.description ? task.description : 'No additional description provided.';

      // Subtasks
      if (task.subtasks && task.subtasks.length > 0) {
        subtasksSection.style.display = 'block';
        const doneCount = task.subtasks.filter(st => st.done).length;
        subtaskProgress.textContent = `${doneCount}/${task.subtasks.length} completed`;

        subtasksList.innerHTML = '';
        task.subtasks.forEach(st => {
          const row = document.createElement('div');
          row.className = `detail-subtask-row ${st.done ? 'checked' : ''}`;
          row.innerHTML = `
            <input type="checkbox" ${st.done ? 'checked' : ''}>
            <span>${escapeHTML(st.text)}</span>
          `;
          row.querySelector('input').addEventListener('change', (e) => {
            st.done = e.target.checked;
            Store.saveTasks();
            SoundFX.play('click');
            this.openDetailModal(task.id);
            this.renderAll();
          });
          subtasksList.appendChild(row);
        });
      } else {
        subtasksSection.style.display = 'none';
      }

      // Complete toggle button
      if (toggleCompleteBtn && completeBtnText) {
        completeBtnText.textContent = task.completed ? 'Mark as Incomplete' : 'Mark as Completed';
        toggleCompleteBtn.onclick = () => {
          this.handleTaskToggle(task.id);
          this.closeDetailModal();
        };
      }

      // Link to Pomodoro
      if (startTimerBtn) {
        startTimerBtn.onclick = () => {
          this.closeDetailModal();
          this.switchView('timer');
          const timerSelect = document.getElementById('timerTaskSelect');
          if (timerSelect) timerSelect.value = task.id;
          Timer.setLinkedTask(task.id);
        };
      }

      // Edit Button
      if (editBtn) {
        editBtn.onclick = () => {
          this.closeDetailModal();
          this.openTaskModal(task);
        };
      }

      // Delete Button
      if (deleteBtn) {
        deleteBtn.onclick = () => {
          this.closeDetailModal();
          this.openDeleteModal(task.id, task.title);
        };
      }

      modal.classList.add('open');
    },

    closeDetailModal() {
      const modal = document.getElementById('taskDetailModal');
      if (modal) modal.classList.remove('open');
    },

    // ------------------------------------------------------------------------
    // DELETE CONFIRMATION MODAL
    // ------------------------------------------------------------------------
    bindDeleteModal() {
      const modal = document.getElementById('deleteConfirmModal');
      const closeBtn = document.getElementById('deleteModalCloseBtn');
      const cancelBtn = document.getElementById('cancelDeleteBtn');
      const confirmBtn = document.getElementById('confirmDeleteBtn');

      const closeHandler = () => {
        if (modal) modal.classList.remove('open');
        this.deletingTaskId = null;
      };

      if (closeBtn) closeBtn.addEventListener('click', closeHandler);
      if (cancelBtn) cancelBtn.addEventListener('click', closeHandler);
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) closeHandler();
        });
      }

      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
          if (this.deletingTaskId) {
            Store.deleteTask(this.deletingTaskId);
            SoundFX.play('delete');
            Toast.show('Task deleted', 'info');
            closeHandler();
            this.renderAll();
          }
        });
      }
    },

    openDeleteModal(taskId, title) {
      this.deletingTaskId = taskId;
      const modal = document.getElementById('deleteConfirmModal');
      const titleDisplay = document.getElementById('deleteTargetTaskTitle');
      if (titleDisplay) {
        titleDisplay.textContent = `Are you sure you want to delete "${title}"? This cannot be recovered.`;
      }
      if (modal) modal.classList.add('open');
    },

    // ------------------------------------------------------------------------
    // TASK ITEM CLICK ACTIONS
    // ------------------------------------------------------------------------
    handleTaskToggle(taskId) {
      const task = Store.toggleTaskCompletion(taskId);
      if (task) {
        if (task.completed) {
          SoundFX.play('complete');
          Confetti.burst();
          Toast.show(`Awesome job completing "${task.title}"! 🎉`, 'success', 2800);
        } else {
          SoundFX.play('click');
          Toast.show('Task marked as pending', 'info');
        }
        this.renderAll();
      }
    },

    // ------------------------------------------------------------------------
    // POMODORO TIMER CONTROLLER
    // ------------------------------------------------------------------------
    bindTimerControls() {
      Timer.init();
    },

    // ------------------------------------------------------------------------
    // SETTINGS FORM & DATA BACKUP
    // ------------------------------------------------------------------------
    bindSettingsForm() {
      const profileForm = document.getElementById('profileForm');
      const studentNameInput = document.getElementById('studentNameInput');
      const studentMajorInput = document.getElementById('studentMajorInput');
      const studentDailyGoalInput = document.getElementById('studentDailyGoalInput');

      // Populate current profile
      if (studentNameInput) studentNameInput.value = Store.profile.name;
      if (studentMajorInput) studentMajorInput.value = Store.profile.major;
      if (studentDailyGoalInput) studentDailyGoalInput.value = Store.profile.dailyGoal;

      if (profileForm) {
        profileForm.addEventListener('submit', (e) => {
          e.preventDefault();
          Store.profile.name = studentNameInput.value.trim() || 'Alex Morgan';
          Store.profile.major = studentMajorInput.value.trim() || 'Student';
          Store.profile.dailyGoal = parseInt(studentDailyGoalInput.value, 10) || 4;
          Store.saveProfile();
          SoundFX.play('click');
          this.renderProfileDisplays();
          Toast.show('Profile updated successfully!', 'success');
        });
      }

      // Data actions
      const seedDemoDataBtn = document.getElementById('seedDemoDataBtn');
      const exportDataBtn = document.getElementById('exportDataBtn');
      const importDataBtn = document.getElementById('importDataBtn');
      const importFileInput = document.getElementById('importFileInput');
      const resetAllDataBtn = document.getElementById('resetAllDataBtn');
      const clearCompletedBtn = document.getElementById('clearCompletedBtn');

      if (seedDemoDataBtn) {
        seedDemoDataBtn.addEventListener('click', () => {
          if (confirm('Load sample student assignments, exams, and projects? This will replace your current tasks.')) {
            Store.seedDemoData();
            SoundFX.play('complete');
            this.renderAll();
            Toast.show('Sample student coursework loaded!', 'success');
          }
        });
      }

      if (exportDataBtn) {
        exportDataBtn.addEventListener('click', () => {
          const exportData = {
            app: 'TaskFlow',
            version: '1.0',
            exportedAt: new Date().toISOString(),
            profile: Store.profile,
            tasks: Store.tasks
          };
          const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `taskflow-backup-${DateUtils.todayISO()}.json`;
          a.click();
          URL.revokeObjectURL(url);
          Toast.show('Backup file downloaded', 'success');
        });
      }

      if (importDataBtn && importFileInput) {
        importDataBtn.addEventListener('click', () => importFileInput.click());
        importFileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const data = JSON.parse(event.target.result);
              if (Array.isArray(data.tasks)) {
                Store.tasks = data.tasks;
                if (data.profile) Store.profile = { ...Store.profile, ...data.profile };
                Store.saveTasks();
                Store.saveProfile();
                this.renderAll();
                Toast.show(`Successfully imported ${data.tasks.length} tasks!`, 'success');
              } else {
                Toast.show('Invalid backup file format', 'error');
              }
            } catch (err) {
              Toast.show('Failed to parse JSON file', 'error');
            }
          };
          reader.readAsText(file);
          importFileInput.value = '';
        });
      }

      if (resetAllDataBtn) {
        resetAllDataBtn.addEventListener('click', () => {
          if (confirm('Are you sure you want to delete ALL tasks and reset progress? This cannot be undone.')) {
            Store.resetAll();
            SoundFX.play('delete');
            this.renderAll();
            Toast.show('All tasks wiped clean.', 'info');
          }
        });
      }

      if (clearCompletedBtn) {
        clearCompletedBtn.addEventListener('click', () => {
          const cleared = Store.clearCompleted();
          if (cleared > 0) {
            SoundFX.play('delete');
            this.renderAll();
            Toast.show(`Removed ${cleared} completed tasks from archive`, 'info');
          } else {
            Toast.show('No completed tasks to clear', 'info');
          }
        });
      }
    },

    // ------------------------------------------------------------------------
    // RENDER DISPATCHERS
    // ------------------------------------------------------------------------
    renderAll() {
      this.renderProfileDisplays();
      this.renderSidebarBadges();
      this.renderCurrentView();
    },

    renderCurrentView() {
      switch (this.currentView) {
        case 'dashboard':
          this.renderDashboard();
          break;
        case 'tasks':
          this.renderFilteredTasks();
          break;
        case 'today':
          this.renderTodayView();
          break;
        case 'upcoming':
          this.renderUpcomingView();
          break;
        case 'overdue':
          this.renderOverdueView();
          break;
        case 'completed':
          this.renderCompletedView();
          break;
        case 'categories':
          this.renderCategoriesView();
          break;
        case 'timer':
          Timer.updateTaskSelector();
          break;
        default:
          break;
      }
    },

    renderProfileDisplays() {
      const nameDisp = document.getElementById('userNameDisplay');
      const majorDisp = document.getElementById('userMajorDisplay');
      const avatarDisp = document.getElementById('avatarDisplay');
      const dateDisp = document.getElementById('currentDateDisplay');

      if (nameDisp) nameDisp.textContent = Store.profile.name;
      if (majorDisp) majorDisp.textContent = Store.profile.major;

      if (avatarDisp) {
        const initials = Store.profile.name
          .split(' ')
          .map(n => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase() || 'ST';
        avatarDisp.textContent = initials;
      }

      if (dateDisp) {
        const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
        dateDisp.textContent = new Date().toLocaleDateString(undefined, options);
      }
    },

    renderSidebarBadges() {
      const total = Store.tasks.length;
      const completed = Store.tasks.filter(t => t.completed).length;
      const overdue = Store.tasks.filter(t => DateUtils.isOverdue(t)).length;
      const today = Store.tasks.filter(t => DateUtils.isToday(t.dueDate) && !t.completed).length;
      const upcoming = Store.tasks.filter(t => DateUtils.isUpcoming(t)).length;

      const badgeAll = document.getElementById('badgeAllCount');
      const badgeToday = document.getElementById('badgeTodayCount');
      const badgeUpcoming = document.getElementById('badgeUpcomingCount');
      const badgeOverdue = document.getElementById('badgeOverdueCount');
      const badgeCompleted = document.getElementById('badgeCompletedCount');

      if (badgeAll) badgeAll.textContent = total;
      if (badgeToday) badgeToday.textContent = today;
      if (badgeUpcoming) badgeUpcoming.textContent = upcoming;
      if (badgeOverdue) badgeOverdue.textContent = overdue;
      if (badgeCompleted) badgeCompleted.textContent = completed;

      // Overdue alert banner
      const overdueAlertBanner = document.getElementById('overdueAlertBanner');
      const overdueAlertText = document.getElementById('overdueAlertText');
      if (overdueAlertBanner && overdueAlertText) {
        if (overdue > 0) {
          overdueAlertBanner.style.display = 'flex';
          overdueAlertText.textContent = `Attention: You have ${overdue} overdue assignment${overdue > 1 ? 's' : ''} requiring urgent review!`;
        } else {
          overdueAlertBanner.style.display = 'none';
        }
      }
    },

    // ------------------------------------------------------------------------
    // DASHBOARD RENDERING
    // ------------------------------------------------------------------------
    renderDashboard() {
      const tasks = Store.tasks;
      const total = tasks.length;
      const completed = tasks.filter(t => t.completed).length;
      const pending = tasks.filter(t => !t.completed && !DateUtils.isOverdue(t)).length;
      const overdue = tasks.filter(t => DateUtils.isOverdue(t)).length;

      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Metric Counts
      document.getElementById('statTotalCount').textContent = total;
      document.getElementById('statCompletedCount').textContent = completed;
      document.getElementById('statPendingCount').textContent = pending;
      document.getElementById('statOverdueCount').textContent = overdue;

      // Completion Ring
      const ring = document.getElementById('overallRingIndicator');
      const percentageText = document.getElementById('overallPercentageText');
      const rateBadge = document.getElementById('completionRateBadge');

      if (ring && percentageText && rateBadge) {
        const circumference = 2 * Math.PI * 66; // r=66 -> ~414.69
        const offset = circumference - (completionRate / 100) * circumference;
        ring.style.strokeDashoffset = offset;
        percentageText.textContent = `${completionRate}%`;
        rateBadge.textContent = `${completionRate}% Complete`;
      }

      document.getElementById('legendCompleted').textContent = completed;
      document.getElementById('legendPending').textContent = pending;
      document.getElementById('legendOverdue').textContent = overdue;

      // Hero daily progress
      const todayTasks = tasks.filter(t => DateUtils.isToday(t.dueDate));
      const todayDone = todayTasks.filter(t => t.completed).length;
      const heroToday = document.getElementById('heroTodayProgress');
      if (heroToday) {
        heroToday.textContent = `${todayDone}/${todayTasks.length} done`;
      }

      // Motivational Quotes pool
      const quotes = [
        `"The secret of getting ahead is getting started."`,
        `"Small daily improvements over time lead to stunning results."`,
        `"Focus on being productive instead of busy."`,
        `"Study hard what interests you the most in the most undisciplined, irreverent and original manner possible."`,
        `"Success is the sum of small efforts repeated day in and day out."`
      ];
      const quoteElem = document.getElementById('motivationalQuote');
      if (quoteElem) {
        quoteElem.textContent = quotes[new Date().getDay() % quotes.length];
      }

      // Render Dashboard Weekly Bar Chart
      this.renderWeeklyChart();

      // Render Category Distribution
      this.renderCategoryDistribution();

      // Render Today's Preview (up to 4 items)
      const todayList = document.getElementById('dashboardTodayList');
      const todayBadge = document.getElementById('todayPreviewBadge');
      if (todayList && todayBadge) {
        todayBadge.textContent = `${todayTasks.length} task${todayTasks.length === 1 ? '' : 's'}`;
        if (todayTasks.length === 0) {
          todayList.innerHTML = `
            <div class="empty-state" style="padding: 1.5rem;">
              <i class="fa-solid fa-mug-hot" style="font-size: 1.5rem; color: var(--text-light); margin-bottom: 0.5rem;"></i>
              <p class="text-muted" style="font-size: 0.825rem;">No tasks scheduled for today. Take a breather or add a study goal!</p>
            </div>
          `;
        } else {
          todayList.innerHTML = '';
          todayTasks.slice(0, 4).forEach(t => {
            todayList.appendChild(this.createTaskCardElement(t, true));
          });
        }
      }

      // Render Upcoming Deadlines Preview (up to 4 items)
      const upcomingList = document.getElementById('dashboardUpcomingList');
      const upcomingBadge = document.getElementById('upcomingPreviewBadge');
      if (upcomingList && upcomingBadge) {
        const upcomingTasks = tasks
          .filter(t => !t.completed && (DateUtils.isTomorrow(t.dueDate) || DateUtils.isUpcoming(t)))
          .sort((a, b) => DateUtils.parseDateTime(a.dueDate, a.dueTime) - DateUtils.parseDateTime(b.dueDate, b.dueTime));

        upcomingBadge.textContent = `${upcomingTasks.length} upcoming`;
        if (upcomingTasks.length === 0) {
          upcomingList.innerHTML = `
            <div class="empty-state" style="padding: 1.5rem;">
              <i class="fa-regular fa-calendar-check" style="font-size: 1.5rem; color: var(--text-light); margin-bottom: 0.5rem;"></i>
              <p class="text-muted" style="font-size: 0.825rem;">No upcoming deadlines scheduled in the near horizon.</p>
            </div>
          `;
        } else {
          upcomingList.innerHTML = '';
          upcomingTasks.slice(0, 4).forEach(t => {
            upcomingList.appendChild(this.createTaskCardElement(t, true));
          });
        }
      }
    },

    // Weekly Productivity Bar Chart
    renderWeeklyChart() {
      const chartContainer = document.getElementById('weeklyBarChart');
      if (!chartContainer) return;

      chartContainer.innerHTML = '';

      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const todayIndex = (new Date().getDay() + 6) % 7; // Convert to Mon=0...Sun=6

      // Simulate/calculate completed count for each day of current week
      const weeklyCounts = [3, 4, 2, 5, 3, 1, 0];
      const maxCount = Math.max(...weeklyCounts, 5);

      let peakDay = 'Thu';
      let peakVal = 0;
      let totalThisWeek = 0;

      dayNames.forEach((day, idx) => {
        const count = weeklyCounts[idx];
        totalThisWeek += count;
        if (count > peakVal) {
          peakVal = count;
          peakDay = day;
        }

        const heightPercent = Math.round((count / maxCount) * 100);
        const isToday = idx === todayIndex;

        const col = document.createElement('div');
        col.className = 'chart-bar-col';
        col.innerHTML = `
          <div class="bar-track">
            <span class="bar-count-tooltip">${count} done</span>
            <div class="bar-fill ${isToday ? 'bar-active' : ''}" style="height: ${heightPercent}%;"></div>
          </div>
          <span class="bar-day-label ${isToday ? 'today' : ''}">${day}</span>
        `;
        chartContainer.appendChild(col);
      });

      const peakDayElem = document.getElementById('peakDayName');
      const totalWeeklyElem = document.getElementById('weeklyCompletedTotal');
      if (peakDayElem) peakDayElem.textContent = `${peakDay} (${peakVal} tasks)`;
      if (totalWeeklyElem) totalWeeklyElem.textContent = `${totalThisWeek} tasks done`;
    },

    // Category Distribution Bars
    renderCategoryDistribution() {
      const container = document.getElementById('categoryBarsList');
      if (!container) return;

      container.innerHTML = '';

      const categories = ['Assignment', 'Study', 'Project', 'Personal', 'Other'];
      const catIcons = {
        Assignment: 'fa-file-lines',
        Study: 'fa-book-open',
        Project: 'fa-rocket',
        Personal: 'fa-user',
        Other: 'fa-thumbtack'
      };

      const counts = {};
      categories.forEach(c => counts[c] = 0);
      Store.tasks.forEach(t => {
        if (counts[t.category] !== undefined) {
          counts[t.category]++;
        } else {
          counts['Other']++;
        }
      });

      const total = Store.tasks.length || 1;

      categories.forEach(cat => {
        const count = counts[cat];
        const percent = Math.round((count / total) * 100);

        const row = document.createElement('div');
        row.className = 'category-bar-row';
        row.innerHTML = `
          <div class="category-row-head">
            <span class="cat-head-title">
              <i class="fa-solid ${catIcons[cat]} text-muted"></i>
              <span>${cat}</span>
            </span>
            <span class="cat-head-count">${count} tasks (${percent}%)</span>
          </div>
          <div class="category-track">
            <div class="category-fill" style="width: ${percent}%; background: var(--cat-${cat.toLowerCase()});"></div>
          </div>
        `;
        container.appendChild(row);
      });
    },

    // ------------------------------------------------------------------------
    // MY TASKS (FILTERED) RENDERING
    // ------------------------------------------------------------------------
    renderFilteredTasks() {
      const container = document.getElementById('mainTasksContainer');
      const displayedCount = document.getElementById('displayedCount');
      const totalCount = document.getElementById('totalTasksCount');
      const activeChips = document.getElementById('activeFilterChips');

      if (!container) return;

      const filtered = this.getFilteredTasks();

      if (displayedCount) displayedCount.textContent = filtered.length;
      if (totalCount) totalCount.textContent = Store.tasks.length;

      // Render Active Chips
      if (activeChips) {
        activeChips.innerHTML = '';
        if (this.searchQuery) {
          activeChips.appendChild(this.createFilterChip(`Search: "${this.searchQuery}"`, () => {
            this.searchQuery = '';
            const input = document.getElementById('taskSearchInput');
            if (input) input.value = '';
            this.renderFilteredTasks();
          }));
        }
        if (this.activeFilterCategory !== 'all') {
          activeChips.appendChild(this.createFilterChip(`Category: ${this.activeFilterCategory}`, () => {
            this.activeFilterCategory = 'all';
            const sel = document.getElementById('categoryFilter');
            if (sel) sel.value = 'all';
            this.renderFilteredTasks();
          }));
        }
        if (this.activeFilterPriority !== 'all') {
          activeChips.appendChild(this.createFilterChip(`Priority: ${this.activeFilterPriority}`, () => {
            this.activeFilterPriority = 'all';
            const sel = document.getElementById('priorityFilter');
            if (sel) sel.value = 'all';
            this.renderFilteredTasks();
          }));
        }
        if (this.activeFilterStatus !== 'all') {
          activeChips.appendChild(this.createFilterChip(`Status: ${this.activeFilterStatus}`, () => {
            this.activeFilterStatus = 'all';
            const sel = document.getElementById('statusFilter');
            if (sel) sel.value = 'all';
            this.renderFilteredTasks();
          }));
        }
      }

      container.innerHTML = '';

      if (filtered.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">
              <i class="fa-solid fa-folder-open"></i>
            </div>
            <h3 class="empty-title">No tasks found</h3>
            <p class="empty-text">No tasks match your current filter criteria or keywords. Try resetting filters or adding a new assignment!</p>
            <button class="btn btn-primary" id="emptyStateAddBtn">
              <i class="fa-solid fa-plus"></i> Add New Task
            </button>
          </div>
        `;
        const addBtn = document.getElementById('emptyStateAddBtn');
        if (addBtn) addBtn.addEventListener('click', () => this.openTaskModal());
        return;
      }

      filtered.forEach(task => {
        container.appendChild(this.createTaskCardElement(task));
      });
    },

    createFilterChip(text, onRemove) {
      const chip = document.createElement('span');
      chip.className = 'active-chip';
      chip.innerHTML = `
        <span>${escapeHTML(text)}</span>
        <i class="fa-solid fa-xmark active-chip-remove"></i>
      `;
      chip.querySelector('.active-chip-remove').addEventListener('click', onRemove);
      return chip;
    },

    // ------------------------------------------------------------------------
    // TODAY VIEW RENDERING
    // ------------------------------------------------------------------------
    renderTodayView() {
      const container = document.getElementById('todayTasksList');
      const counter = document.getElementById('todayDueCounter');
      const dateVerbose = document.getElementById('todayDateVerbose');

      if (!container) return;

      const today = DateUtils.todayISO();
      const todayTasks = Store.tasks.filter(t => t.dueDate === today);

      if (dateVerbose) {
        dateVerbose.textContent = new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        });
      }

      if (counter) counter.textContent = `${todayTasks.length} task${todayTasks.length === 1 ? '' : 's'}`;

      container.innerHTML = '';

      if (todayTasks.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">
              <i class="fa-solid fa-sun"></i>
            </div>
            <h3 class="empty-title">All clear for today!</h3>
            <p class="empty-text">No tasks are due today. Great job staying ahead of your syllabus, or take a well-deserved rest!</p>
            <button class="btn btn-primary" id="todayAddFirstBtn">
              <i class="fa-solid fa-plus"></i> Add a Task for Today
            </button>
          </div>
        `;
        const btn = document.getElementById('todayAddFirstBtn');
        if (btn) btn.addEventListener('click', () => this.openTaskModal());
        return;
      }

      todayTasks.forEach(task => {
        container.appendChild(this.createTaskCardElement(task));
      });
    },

    // ------------------------------------------------------------------------
    // UPCOMING VIEW RENDERING
    // ------------------------------------------------------------------------
    renderUpcomingView() {
      const tomorrowList = document.getElementById('tomorrowTasksList');
      const laterWeekList = document.getElementById('laterWeekTasksList');
      const futureList = document.getElementById('futureTasksList');

      const tomorrowCount = document.getElementById('tomorrowTasksCount');
      const laterWeekCount = document.getElementById('laterWeekTasksCount');
      const futureCount = document.getElementById('futureTasksCount');

      const tomorrowISO = DateUtils.tomorrowISO();
      const next7DaysISO = DateUtils.toISODateString(DateUtils.addDays(new Date(), 7));

      const tasksTomorrow = Store.tasks.filter(t => t.dueDate === tomorrowISO);
      const tasksLaterWeek = Store.tasks.filter(t => t.dueDate > tomorrowISO && t.dueDate <= next7DaysISO);
      const tasksFuture = Store.tasks.filter(t => t.dueDate > next7DaysISO);

      if (tomorrowCount) tomorrowCount.textContent = `${tasksTomorrow.length} task${tasksTomorrow.length === 1 ? '' : 's'}`;
      if (laterWeekCount) laterWeekCount.textContent = `${tasksLaterWeek.length} task${tasksLaterWeek.length === 1 ? '' : 's'}`;
      if (futureCount) futureCount.textContent = `${tasksFuture.length} task${tasksFuture.length === 1 ? '' : 's'}`;

      // Render Tomorrow
      if (tomorrowList) {
        tomorrowList.innerHTML = '';
        if (tasksTomorrow.length === 0) {
          tomorrowList.innerHTML = `<p class="text-muted" style="padding: 1rem;">No tasks due tomorrow.</p>`;
        } else {
          tasksTomorrow.forEach(t => tomorrowList.appendChild(this.createTaskCardElement(t)));
        }
      }

      // Render Later This Week
      if (laterWeekList) {
        laterWeekList.innerHTML = '';
        if (tasksLaterWeek.length === 0) {
          laterWeekList.innerHTML = `<p class="text-muted" style="padding: 1rem;">No tasks due in the next 7 days.</p>`;
        } else {
          tasksLaterWeek.forEach(t => laterWeekList.appendChild(this.createTaskCardElement(t)));
        }
      }

      // Render Future
      if (futureList) {
        futureList.innerHTML = '';
        if (tasksFuture.length === 0) {
          futureList.innerHTML = `<p class="text-muted" style="padding: 1rem;">No future long-term deadlines recorded.</p>`;
        } else {
          tasksFuture.forEach(t => futureList.appendChild(this.createTaskCardElement(t)));
        }
      }
    },

    // ------------------------------------------------------------------------
    // OVERDUE VIEW RENDERING
    // ------------------------------------------------------------------------
    renderOverdueView() {
      const container = document.getElementById('overdueTasksList');
      if (!container) return;

      const overdueTasks = Store.tasks.filter(t => DateUtils.isOverdue(t));

      container.innerHTML = '';

      if (overdueTasks.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon text-success" style="background: var(--success-light);">
              <i class="fa-solid fa-circle-check"></i>
            </div>
            <h3 class="empty-title">Zero Overdue Tasks!</h3>
            <p class="empty-text">You have zero past due assignments! Excellent time management skills, keep up the momentum.</p>
          </div>
        `;
        return;
      }

      overdueTasks.forEach(task => {
        container.appendChild(this.createTaskCardElement(task));
      });
    },

    // ------------------------------------------------------------------------
    // COMPLETED VIEW RENDERING
    // ------------------------------------------------------------------------
    renderCompletedView() {
      const container = document.getElementById('completedTasksList');
      if (!container) return;

      const completedTasks = Store.tasks.filter(t => t.completed);

      container.innerHTML = '';

      if (completedTasks.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">
              <i class="fa-solid fa-trophy"></i>
            </div>
            <h3 class="empty-title">No completed tasks yet</h3>
            <p class="empty-text">Check off tasks as you finish them to build your completed archive and watch your progress grow!</p>
          </div>
        `;
        return;
      }

      completedTasks.forEach(task => {
        container.appendChild(this.createTaskCardElement(task));
      });
    },

    // ------------------------------------------------------------------------
    // CATEGORIES VIEW RENDERING
    // ------------------------------------------------------------------------
    renderCategoriesView() {
      const grid = document.getElementById('categoriesCardGrid');
      const list = document.getElementById('categoryFilteredTasksList');
      const pillsSelector = document.getElementById('categoryPillsSelector');
      const selectedHeading = document.getElementById('selectedCategoryHeading');

      if (!grid) return;

      const categories = [
        { name: 'Assignment', icon: 'fa-file-lines', color: 'var(--cat-assignment)' },
        { name: 'Study', icon: 'fa-book-open', color: 'var(--cat-study)' },
        { name: 'Project', icon: 'fa-rocket', color: 'var(--cat-project)' },
        { name: 'Personal', icon: 'fa-user', color: 'var(--cat-personal)' },
        { name: 'Other', icon: 'fa-thumbtack', color: 'var(--cat-other)' }
      ];

      grid.innerHTML = '';
      if (pillsSelector) pillsSelector.innerHTML = '';

      const counts = {};
      const completedCounts = {};

      categories.forEach(c => {
        counts[c.name] = 0;
        completedCounts[c.name] = 0;
      });

      Store.tasks.forEach(t => {
        const cat = counts[t.category] !== undefined ? t.category : 'Other';
        counts[cat]++;
        if (t.completed) completedCounts[cat]++;
      });

      let currentSelectedCategory = this.selectedCategoryInView || 'Assignment';

      categories.forEach(c => {
        const total = counts[c.name];
        const done = completedCounts[c.name];
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const isActive = c.name === currentSelectedCategory;

        const card = document.createElement('div');
        card.className = `category-stat-card ${isActive ? 'active' : ''}`;
        card.setAttribute('data-cat', c.name);
        card.innerHTML = `
          <div class="cat-stat-head">
            <div class="cat-stat-icon" style="background: var(--cat-${c.name.toLowerCase()}-bg); color: ${c.color};">
              <i class="fa-solid ${c.icon}"></i>
            </div>
            <span class="badge ${pct === 100 && total > 0 ? 'badge-success' : 'badge-neutral'}">${pct}% done</span>
          </div>
          <h4 class="cat-stat-name">${c.name}</h4>
          <span class="cat-stat-count">${total} total • ${done} completed</span>
          <div class="category-track">
            <div class="category-fill" style="width: ${pct}%; background: ${c.color};"></div>
          </div>
        `;

        card.addEventListener('click', () => {
          this.selectedCategoryInView = c.name;
          this.renderCategoriesView();
        });

        grid.appendChild(card);
      });

      // Filter tasks list under category
      if (list && selectedHeading) {
        selectedHeading.textContent = `${currentSelectedCategory} Tasks (${counts[currentSelectedCategory]} items)`;
        const catTasks = Store.tasks.filter(t => t.category === currentSelectedCategory);

        list.innerHTML = '';
        if (catTasks.length === 0) {
          list.innerHTML = `
            <div class="empty-state">
              <p class="text-muted">No tasks currently filed under "${currentSelectedCategory}".</p>
            </div>
          `;
        } else {
          catTasks.forEach(t => list.appendChild(this.createTaskCardElement(t)));
        }
      }
    },

    // ------------------------------------------------------------------------
    // SINGLE TASK CARD ELEMENT BUILDER
    // ------------------------------------------------------------------------
    createTaskCardElement(task, isCompactPreview = false) {
      const isOverdue = DateUtils.isOverdue(task);
      const isToday = DateUtils.isToday(task.dueDate);
      const isTomorrow = DateUtils.isTomorrow(task.dueDate);

      const card = document.createElement('div');
      card.className = `task-card priority-${task.priority} ${task.completed ? 'is-completed' : ''} ${isOverdue ? 'is-overdue' : ''}`;
      card.setAttribute('data-id', task.id);

      const deadlineBadgeInfo = DateUtils.getDeadlineBadge(task);

      // Subtask progress
      let subtasksHtml = '';
      if (task.subtasks && task.subtasks.length > 0) {
        const doneCount = task.subtasks.filter(st => st.done).length;
        const percent = Math.round((doneCount / task.subtasks.length) * 100);
        subtasksHtml = `
          <div class="task-subtasks-preview">
            <i class="fa-solid fa-list-check"></i>
            <span>${doneCount}/${task.subtasks.length} subtasks</span>
            <div class="subtask-mini-bar">
              <div class="subtask-mini-fill" style="width: ${percent}%;"></div>
            </div>
          </div>
        `;
      }

      const catIcons = {
        Assignment: 'fa-file-lines',
        Study: 'fa-book-open',
        Project: 'fa-rocket',
        Personal: 'fa-user',
        Other: 'fa-thumbtack'
      };
      const catIcon = catIcons[task.category] || 'fa-thumbtack';

      card.innerHTML = `
        <div class="task-card-header">
          <div class="task-category-group">
            <span class="category-pill category-${task.category}">
              <i class="fa-solid ${catIcon}"></i>
              <span>${escapeHTML(task.category)}</span>
            </span>
            <span class="badge priority-badge-${task.priority}">
              <span class="priority-dot"></span>
              <span>${task.priority}</span>
            </span>
          </div>
          <div class="task-actions">
            <button class="task-action-btn edit-btn" title="Edit Task" aria-label="Edit Task">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="task-action-btn delete-btn" title="Delete Task" aria-label="Delete Task">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>

        <div class="task-card-body">
          <div class="task-checkbox-wrap">
            <div class="custom-checkbox ${task.completed ? 'checked' : ''}" title="${task.completed ? 'Mark incomplete' : 'Mark complete'}">
              <i class="fa-solid fa-check"></i>
            </div>
          </div>
          <div class="task-main-content">
            <h4 class="task-title">${escapeHTML(task.title)}</h4>
            ${task.description && !isCompactPreview ? `<p class="task-desc">${escapeHTML(task.description)}</p>` : ''}
            ${subtasksHtml}
          </div>
        </div>

        <div class="task-card-footer">
          <div class="task-deadline ${isOverdue ? 'deadline-overdue' : isToday ? 'deadline-today' : isTomorrow ? 'deadline-tomorrow' : ''}">
            <i class="fa-regular fa-clock"></i>
            <span>${DateUtils.formatFriendly(task.dueDate, task.dueTime)}</span>
          </div>
          <span class="badge ${deadlineBadgeInfo.className}">
            <i class="fa-solid ${deadlineBadgeInfo.icon}"></i> ${deadlineBadgeInfo.text}
          </span>
        </div>
      `;

      // Event Listeners
      const checkbox = card.querySelector('.custom-checkbox');
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleTaskToggle(task.id);
      });

      const editBtn = card.querySelector('.edit-btn');
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openTaskModal(task);
      });

      const deleteBtn = card.querySelector('.delete-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openDeleteModal(task.id, task.title);
      });

      // Clicking the card opens details modal
      card.addEventListener('click', () => {
        this.openDetailModal(task.id);
      });

      return card;
    }
  };

  // --------------------------------------------------------------------------
  // 7. POMODORO STUDY TIMER MODULE
  // --------------------------------------------------------------------------
  const Timer = {
    totalSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    intervalId: null,
    isRunning: false,
    currentMode: 'pomodoro', // 'pomodoro' | 'short-break' | 'long-break'
    linkedTaskId: null,

    init() {
      this.bindButtons();
      this.render();
      this.updateStatsDisplay();
    },

    bindButtons() {
      const modeButtons = document.querySelectorAll('.timer-mode-btn');
      const startBtn = document.getElementById('timerStartBtn');
      const pauseBtn = document.getElementById('timerPauseBtn');
      const resetBtn = document.getElementById('timerResetBtn');
      const taskSelect = document.getElementById('timerTaskSelect');

      modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          modeButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const minutes = parseInt(btn.getAttribute('data-time'), 10) || 25;
          const mode = btn.getAttribute('data-mode');
          this.setMode(mode, minutes);
        });
      });

      if (startBtn) {
        startBtn.addEventListener('click', () => this.start());
      }

      if (pauseBtn) {
        pauseBtn.addEventListener('click', () => this.pause());
      }

      if (resetBtn) {
        resetBtn.addEventListener('click', () => this.reset());
      }

      if (taskSelect) {
        taskSelect.addEventListener('change', (e) => {
          this.linkedTaskId = e.target.value || null;
        });
      }
    },

    setMode(mode, minutes) {
      this.pause();
      this.currentMode = mode;
      this.totalSeconds = minutes * 60;
      this.remainingSeconds = this.totalSeconds;

      const stateLabel = document.getElementById('timerStateLabel');
      if (stateLabel) {
        const labels = {
          'pomodoro': 'Focus Session',
          'short-break': 'Short Rest Break ☕',
          'long-break': 'Extended Break 🌴'
        };
        stateLabel.textContent = labels[mode] || 'Study Session';
      }

      this.render();
    },

    setLinkedTask(taskId) {
      this.linkedTaskId = taskId;
      this.updateTaskSelector();
    },

    updateTaskSelector() {
      const select = document.getElementById('timerTaskSelect');
      if (!select) return;

      select.innerHTML = '<option value="">-- General Study Session --</option>';
      Store.tasks.filter(t => !t.completed).forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `[${t.category}] ${t.title}`;
        if (t.id === this.linkedTaskId) opt.selected = true;
        select.appendChild(opt);
      });
    },

    start() {
      if (this.isRunning) return;
      this.isRunning = true;

      const startBtn = document.getElementById('timerStartBtn');
      const pauseBtn = document.getElementById('timerPauseBtn');
      if (startBtn) startBtn.style.display = 'none';
      if (pauseBtn) pauseBtn.style.display = 'inline-flex';

      SoundFX.play('click');

      this.intervalId = setInterval(() => {
        this.remainingSeconds--;
        this.render();

        if (this.remainingSeconds <= 0) {
          this.completeSession();
        }
      }, 1000);
    },

    pause() {
      if (!this.isRunning) return;
      this.isRunning = false;
      clearInterval(this.intervalId);

      const startBtn = document.getElementById('timerStartBtn');
      const pauseBtn = document.getElementById('timerPauseBtn');
      if (startBtn) startBtn.style.display = 'inline-flex';
      if (pauseBtn) pauseBtn.style.display = 'none';
      SoundFX.play('click');
    },

    reset() {
      this.pause();
      this.remainingSeconds = this.totalSeconds;
      this.render();
      SoundFX.play('click');
    },

    completeSession() {
      this.pause();
      SoundFX.play('alarm');
      Confetti.burst();

      if (this.currentMode === 'pomodoro') {
        Store.timerStats.completedSessionsToday++;
        Store.timerStats.totalMinutesToday += Math.round(this.totalSeconds / 60);
        Store.saveTimerStats();
        this.updateStatsDisplay();

        let message = 'Great focus session completed! Time for a short break.';
        if (this.linkedTaskId) {
          const linked = Store.tasks.find(t => t.id === this.linkedTaskId);
          if (linked) {
            message = `Pomodoro session finished for "${linked.title}"!`;
          }
        }
        Toast.show(message, 'success', 4000);
      } else {
        Toast.show('Break completed. Ready to focus again?', 'info', 3000);
      }

      this.reset();
    },

    render() {
      const clock = document.getElementById('timerClockDisplay');
      if (!clock) return;

      const mins = Math.floor(this.remainingSeconds / 60);
      const secs = this.remainingSeconds % 60;
      const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      clock.textContent = formatted;

      // Update page title when timer running
      if (this.isRunning) {
        document.title = `(${formatted}) TaskFlow Focus`;
      } else {
        document.title = 'TaskFlow – Student Task Planning & Productivity System';
      }
    },

    updateStatsDisplay() {
      const sessions = document.getElementById('pomodorosCompletedToday');
      const minutes = document.getElementById('minutesFocusedToday');
      if (sessions) sessions.textContent = Store.timerStats.completedSessionsToday;
      if (minutes) minutes.textContent = `${Store.timerStats.totalMinutesToday} min`;
    }
  };

  // --------------------------------------------------------------------------
  // 8. SECURITY & XSS SANITIZATION HELPER
  // --------------------------------------------------------------------------
  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --------------------------------------------------------------------------
  // 9. APP INITIALIZATION ENTRY POINT
  // --------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    Store.init();
    Toast.init();
    Confetti.init();
    UI.init();
    console.log('TaskFlow Student OS initialized successfully.');
  });

})();
