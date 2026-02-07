import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const config = window.__APP_CONFIG__ || {};
const configNotice = document.getElementById("configNotice");
const loginSection = document.getElementById("login");
const authSection = document.getElementById("auth");
const boardSection = document.getElementById("board");
const boardStatus = document.getElementById("boardStatus");

const DEFAULT_COLORS = ["#2a9d8f", "#e76f51", "#264653", "#f4a261", "#e9c46a"];

const state = {
  board: null,
  user: null,
  member: null,
  members: [],
  habits: [],
  entries: new Map(),
  selectedMemberId: null,
  dates: [],
  showArchived: false,
  rangeStart: null,
  rangeDays: 7
};

const supabaseUrl = config.supabaseUrl;
const supabaseAnonKey = config.supabaseAnonKey;
const hasConfig =
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes("YOUR_PROJECT") &&
  !supabaseAnonKey.includes("YOUR_SUPABASE_ANON_KEY");

if (!hasConfig) {
  showNotice(
    "Supabase設定が未入力です。public/config.js に URL と anon key を設定してください。"
  );
}

const supabase = hasConfig ? createClient(supabaseUrl, supabaseAnonKey) : null;

const authStatus = document.getElementById("authStatus");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const signInBtn = document.getElementById("signInBtn");
const signUpBtn = document.getElementById("signUpBtn");
const signOutBtn = document.getElementById("signOutBtn");

const joinBoardId = document.getElementById("joinBoardId");
const joinDisplayName = document.getElementById("joinDisplayName");
const joinBtn = document.getElementById("joinBtn");

const createBoardName = document.getElementById("createBoardName");
const createDisplayName = document.getElementById("createDisplayName");
const createBtn = document.getElementById("createBtn");

const syncBtn = document.getElementById("syncBtn");
const logoutBtn = document.getElementById("logoutBtn");

const boardName = document.getElementById("boardName");
const boardId = document.getElementById("boardId");
const copyBoardId = document.getElementById("copyBoardId");

const memberSelect = document.getElementById("memberSelect");
const memberSettings = document.getElementById("memberSettings");
const grid = document.getElementById("grid");

const habitInput = document.getElementById("habitInput");
const addHabitBtn = document.getElementById("addHabitBtn");
const showArchivedToggle = document.getElementById("showArchived");
const prevRangeBtn = document.getElementById("prevRange");
const nextRangeBtn = document.getElementById("nextRange");
const todayRangeBtn = document.getElementById("todayRange");

if (signInBtn) {
  signInBtn.addEventListener("click", () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    if (!email || !password) {
      alert("メールとパスワードを入力してください");
      return;
    }
    signIn(email, password);
  });
}

if (signUpBtn) {
  signUpBtn.addEventListener("click", () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    if (!email || !password) {
      alert("メールとパスワードを入力してください");
      return;
    }
    signUp(email, password);
  });
}

if (signOutBtn) {
  signOutBtn.addEventListener("click", () => {
    signOut();
  });
}

joinBtn.addEventListener("click", () => {
  if (!hasConfig) return;
  const id = joinBoardId.value.trim();
  const displayName = joinDisplayName.value.trim();
  if (!id || !displayName) return alert("ボードIDと名前を入力してください");
  joinBoard(id, displayName);
});

createBtn.addEventListener("click", () => {
  if (!hasConfig) return;
  const name = createBoardName.value.trim() || "みんなの習慣";
  const displayName = createDisplayName.value.trim();
  if (!displayName) return alert("名前を入力してください");
  createBoard(name, displayName);
});

syncBtn.addEventListener("click", () => {
  if (!state.board) return;
  loadBoardData();
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("habitBoardId");
  resetState();
  render();
});

copyBoardId.addEventListener("click", async () => {
  if (!state.board) return;
  await navigator.clipboard.writeText(state.board.id);
  alert("ボードIDをコピーしました");
});

boardName.addEventListener("click", () => {
  if (!state.board) return;
  updateBoardName();
});

addHabitBtn.addEventListener("click", () => {
  if (!state.board) return;
  const title = habitInput.value.trim();
  if (!title) return;
  addHabit(title);
});

if (prevRangeBtn) {
  prevRangeBtn.addEventListener("click", () => {
    shiftDateRange(-7);
  });
}

if (nextRangeBtn) {
  nextRangeBtn.addEventListener("click", () => {
    shiftDateRange(7);
  });
}

if (todayRangeBtn) {
  todayRangeBtn.addEventListener("click", () => {
    resetDateRange();
  });
}

if (showArchivedToggle) {
  showArchivedToggle.addEventListener("change", () => {
    state.showArchived = showArchivedToggle.checked;
    localStorage.setItem(
      "habitBoardShowArchived",
      state.showArchived ? "1" : "0"
    );
    if (state.board) {
      loadBoardData();
    } else {
      render();
    }
  });
}

memberSelect.addEventListener("click", (event) => {
  const button = event.target.closest(".member-pill");
  if (!button) return;
  if (!state.member || button.dataset.memberId !== state.member.id) {
    return;
  }
  state.selectedMemberId = button.dataset.memberId;
  renderMemberSelect();
});

memberSettings.addEventListener("change", (event) => {
  const input = event.target.closest("input");
  if (!input) return;
  const memberId = input.dataset.memberId;
  const field = input.dataset.field;
  updateMember(memberId, field, input.value);
});

memberSettings.addEventListener("blur", (event) => {
  const input = event.target.closest("input");
  if (!input) return;
  const memberId = input.dataset.memberId;
  const field = input.dataset.field;
  updateMember(memberId, field, input.value);
}, true);

grid.addEventListener("click", (event) => {
  const cell = event.target.closest(".cell");
  if (cell) {
    const habitId = cell.dataset.habitId;
    const habit = state.habits.find((item) => item.id === habitId);
    if (habit && habit.archived) {
      alert("アーカイブ済みの習慣は記録できません");
      return;
    }
    if (!state.member || habit.member_id !== state.member.id) {
      alert("自分の習慣のみ記録できます");
      return;
    }
    toggleEntry(habitId, cell.dataset.date);
    return;
  }

  const actionButton = event.target.closest(".habit-action");
  if (actionButton) {
    const habitId = actionButton.dataset.habitId;
    const action = actionButton.dataset.action;
    if (action === "archive") {
      setHabitArchived(habitId, true);
    } else if (action === "unarchive") {
      setHabitArchived(habitId, false);
    } else if (action === "move-up") {
      moveHabit(habitId, -1);
    } else if (action === "move-down") {
      moveHabit(habitId, 1);
    } else if (action === "delete") {
      deleteHabit(habitId);
    }
    return;
  }

  const habitTitleButton = event.target.closest(".habit-title");
  if (habitTitleButton) {
    updateHabitTitle(habitTitleButton.dataset.habitId);
  }
});

init();

function init() {
  state.rangeDays = 7;
  state.rangeStart = getRangeStartForToday(state.rangeDays);
  state.dates = buildDateRange(state.rangeStart, state.rangeDays);
  state.showArchived =
    localStorage.getItem("habitBoardShowArchived") === "1";
  if (showArchivedToggle) {
    showArchivedToggle.checked = state.showArchived;
  }
  if (!hasConfig || !supabase) {
    render();
    return;
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    state.user = session?.user ?? null;
    if (!state.user) {
      localStorage.removeItem("habitBoardId");
      resetState();
      render();
      return;
    }

    const savedId = localStorage.getItem("habitBoardId");
    if (savedId) {
      connectToBoard(savedId);
    } else {
      render();
    }
  });

  supabase.auth.getSession().then(({ data }) => {
    state.user = data.session?.user ?? null;
    if (!state.user) {
      render();
      return;
    }
    const savedId = localStorage.getItem("habitBoardId");
    if (savedId) {
      connectToBoard(savedId);
    } else {
      render();
    }
  });
}

function resetState() {
  state.board = null;
  state.member = null;
  state.members = [];
  state.habits = [];
  state.entries = new Map();
  state.selectedMemberId = null;
}

async function signIn(email, password) {
  if (!supabase) return;
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) {
    alert(`サインインに失敗しました: ${error.message}`);
    return;
  }
  authStatus.textContent = "サインイン済み";
}

async function signUp(email, password) {
  if (!supabase) return;
  const { error } = await supabase.auth.signUp({
    email,
    password
  });
  if (error) {
    alert(`新規登録に失敗しました: ${error.message}`);
    return;
  }
  alert("登録しました。サインインしてください。");
}

async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

async function connectToBoard(id) {
  if (!state.user) {
    alert("ログインしてください");
    return;
  }
  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    alert(`ボードが見つからないか、参加権限がありません: ${error?.message ?? "unknown"}`);
    return;
  }

  state.board = data;
  localStorage.setItem("habitBoardId", id);

  await loadBoardData();
}

async function createBoard(name, displayName) {
  if (!state.user) {
    alert("ログインしてください");
    return;
  }

  const boardIdValue = crypto.randomUUID();
  const insertResult = await supabase.from("boards").insert({
    id: boardIdValue,
    name,
    owner_id: state.user.id
  });

  if (insertResult.error) {
    alert(`ボード作成に失敗しました: ${insertResult.error.message}`);
    return;
  }

  const color = pickMemberColor([]);
  const memberResult = await supabase.from("members").insert({
    id: crypto.randomUUID(),
    board_id: boardIdValue,
    user_id: state.user.id,
    name: displayName,
    color
  });
  if (memberResult.error) {
    alert("メンバー作成に失敗しました");
    return;
  }

  await connectToBoard(boardIdValue);
}

async function joinBoard(id, displayName) {
  if (!state.user) {
    alert("ログインしてください");
    return;
  }

  const color = pickMemberColor(state.members);
  const insertResult = await supabase.from("members").insert({
    id: crypto.randomUUID(),
    board_id: id,
    user_id: state.user.id,
    name: displayName,
    color
  });

  if (insertResult.error) {
    if (String(insertResult.error.code) === "23505") {
      // すでに参加済み
    } else if (String(insertResult.error.code) === "23503") {
      alert("ボードIDが見つかりません");
      return;
    } else {
      alert(`参加に失敗しました: ${insertResult.error.message}`);
      return;
    }
  }

  await connectToBoard(id);
}

async function loadBoardData() {
  const boardIdValue = state.board.id;
  const start = state.dates[0];
  const end = state.dates[state.dates.length - 1];

  const habitsQuery = supabase
    .from("habits")
    .select("*")
    .eq("board_id", boardIdValue)
    .order("order_index", { ascending: true });
  if (!state.showArchived) {
    habitsQuery.eq("archived", false);
  }

  const [membersResult, habitsResult, entriesResult] = await Promise.all([
    supabase.from("members").select("*").eq("board_id", boardIdValue),
    habitsQuery,
    supabase
      .from("entries")
      .select("*")
      .eq("board_id", boardIdValue)
      .gte("date", start)
      .lte("date", end)
  ]);

  if (membersResult.error || habitsResult.error || entriesResult.error) {
    alert("読み込みに失敗しました");
    return;
  }

  state.members = membersResult.data || [];
  state.habits = (habitsResult.data || []).sort((a, b) => {
    const orderDiff = (a.order_index ?? 0) - (b.order_index ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return new Date(a.created_at) - new Date(b.created_at);
  });
  state.entries = new Map();
  (entriesResult.data || []).forEach((entry) => {
    state.entries.set(`${entry.habit_id}|${entry.date}`, true);
  });

  state.member = state.members.find(
    (member) => member.user_id === state.user?.id
  );
  state.selectedMemberId = state.member ? state.member.id : null;
  if (!state.member) {
    alert("このボードに参加していません");
  }

  render();
}

async function addHabit(title) {
  if (!state.member) {
    alert("ボードに参加してください");
    return;
  }
  const orderIndex = Date.now();
  const { error } = await supabase.from("habits").insert({
    id: crypto.randomUUID(),
    board_id: state.board.id,
    member_id: state.member.id,
    title,
    order_index: orderIndex
  });

  if (error) {
    alert("習慣追加に失敗しました");
    return;
  }

  habitInput.value = "";
  await loadBoardData();
}

async function updateHabitTitle(habitId) {
  const habit = state.habits.find((item) => item.id === habitId);
  if (!habit) return;
  if (!state.member || habit.member_id !== state.member.id) {
    alert("自分の習慣のみ編集できます");
    return;
  }

  const nextTitle = prompt("習慣名を編集", habit.title);
  if (nextTitle === null) return;
  const trimmed = nextTitle.trim();
  if (!trimmed) {
    alert("空の習慣名は使えません");
    return;
  }
  if (trimmed === habit.title) return;

  const { error } = await supabase
    .from("habits")
    .update({ title: trimmed })
    .eq("id", habitId);

  if (error) {
    alert("更新に失敗しました");
    return;
  }

  habit.title = trimmed;
  renderGrid();
}

async function updateBoardName() {
  if (!state.user || state.board.owner_id !== state.user.id) {
    alert("ボード名は作成者のみ変更できます");
    return;
  }
  const nextName = prompt("ボード名を編集", state.board.name);
  if (nextName === null) return;
  const trimmed = nextName.trim();
  if (!trimmed) {
    alert("空のボード名は使えません");
    return;
  }
  if (trimmed === state.board.name) return;

  const { error } = await supabase
    .from("boards")
    .update({ name: trimmed })
    .eq("id", state.board.id);

  if (error) {
    alert("更新に失敗しました");
    return;
  }

  state.board.name = trimmed;
  render();
}

async function setHabitArchived(habitId, archived) {
  const habit = state.habits.find((item) => item.id === habitId);
  if (!habit) return;
  if (!state.member || habit.member_id !== state.member.id) {
    alert("自分の習慣のみ操作できます");
    return;
  }
  const { error } = await supabase
    .from("habits")
    .update({
      archived,
      archived_at: archived ? new Date().toISOString() : null
    })
    .eq("id", habitId);

  if (error) {
    alert("更新に失敗しました");
    return;
  }

  await loadBoardData();
}

async function deleteHabit(habitId) {
  const habit = state.habits.find((item) => item.id === habitId);
  if (!habit) return;
  if (!state.member || habit.member_id !== state.member.id) {
    alert("自分の習慣のみ削除できます");
    return;
  }
  const confirmed = confirm(
    `「${habit.title}」を削除しますか？記録も消えます。`
  );
  if (!confirmed) return;

  const { error } = await supabase.from("habits").delete().eq("id", habitId);
  if (error) {
    alert("削除に失敗しました");
    return;
  }

  await loadBoardData();
}

async function moveHabit(habitId, direction) {
  const habit = state.habits.find((item) => item.id === habitId);
  if (!habit) return;
  if (!state.member || habit.member_id !== state.member.id) {
    alert("自分の習慣のみ並べ替えできます");
    return;
  }
  const sameGroup = state.habits.filter(
    (item) => item.archived === habit.archived
  );
  const index = sameGroup.findIndex((item) => item.id === habitId);
  const target = sameGroup[index + direction];
  if (!target) return;

  const currentIndex = habit.order_index ?? 0;
  const targetIndex = target.order_index ?? 0;

  const results = await Promise.all([
    supabase
      .from("habits")
      .update({ order_index: targetIndex })
      .eq("id", habitId),
    supabase
      .from("habits")
      .update({ order_index: currentIndex })
      .eq("id", target.id)
  ]);

  if (results.some((result) => result.error)) {
    alert("並べ替えに失敗しました");
    return;
  }

  await loadBoardData();
}

async function toggleEntry(habitId, date) {
  const key = `${habitId}|${date}`;

  if (state.entries.has(key)) {
    const { error } = await supabase
      .from("entries")
      .delete()
      .eq("board_id", state.board.id)
      .eq("habit_id", habitId)
      .eq("date", date);

    if (error) {
      alert("削除に失敗しました");
      return;
    }
    state.entries.delete(key);
  } else {
    const { error } = await supabase.from("entries").insert({
      id: crypto.randomUUID(),
      board_id: state.board.id,
      habit_id: habitId,
      date
    });

    if (error) {
      alert("保存に失敗しました");
      return;
    }
    state.entries.set(key, true);
  }

  renderGrid();
}

async function updateMember(memberId, field, value) {
  if (!state.member || state.member.id !== memberId) {
    alert("自分の情報のみ変更できます");
    return;
  }
  const member = state.members.find((item) => item.id === memberId);
  if (!member) return;
  if (member[field] === value) return;

  const { error } = await supabase
    .from("members")
    .update({ [field]: value })
    .eq("id", memberId);

  if (error) {
    alert("更新に失敗しました");
    return;
  }

  member[field] = value;
  renderMemberSelect();
  renderMemberSettings();
  renderGrid();
}

function shiftDateRange(daysDelta) {
  if (!state.rangeStart) {
    state.rangeStart = startOfDay(new Date());
  }
  state.rangeStart = addDays(state.rangeStart, daysDelta);
  state.dates = buildDateRange(state.rangeStart, state.rangeDays);
  if (state.board) {
    loadBoardData();
  } else {
    render();
  }
}

function resetDateRange() {
  state.rangeStart = getRangeStartForToday(state.rangeDays);
  state.dates = buildDateRange(state.rangeStart, state.rangeDays);
  if (state.board) {
    loadBoardData();
  } else {
    render();
  }
}

function render() {
  if (!state.user) {
    boardStatus.textContent = "未ログイン";
    authStatus.textContent = "未ログイン";
    loginSection.classList.remove("hidden");
    authSection.classList.add("hidden");
    boardSection.classList.add("hidden");
    if (signOutBtn) signOutBtn.disabled = true;
    return;
  }

  loginSection.classList.add("hidden");
  authStatus.textContent = `ログイン中: ${state.user.email}`;
  if (signOutBtn) signOutBtn.disabled = false;

  if (!state.board) {
    boardStatus.textContent = "未接続";
    authSection.classList.remove("hidden");
    boardSection.classList.add("hidden");
    return;
  }

  boardStatus.textContent = `接続中: ${state.board.name}`;
  authSection.classList.add("hidden");
  boardSection.classList.remove("hidden");

  boardName.textContent = state.board.name;
  boardId.textContent = state.board.id;
  const isOwner = state.user && state.board.owner_id === state.user.id;
  boardName.disabled = !isOwner;
  boardName.classList.toggle("disabled", !isOwner);

  renderMemberSelect();
  renderGrid();
  renderMemberSettings();
}

function renderMemberSelect() {
  memberSelect.innerHTML = state.members
    .map((member) => {
      const isActive = member.id === state.selectedMemberId;
      const isSelf = state.member && member.id === state.member.id;
      return `
        <button class="member-pill ${isActive ? "active" : ""} ${isSelf ? "" : "disabled"}" data-member-id="${member.id}" style="--member-color: ${member.color}" ${isSelf ? "" : "disabled"}>
          <span></span>
          ${escapeHtml(member.name)}
        </button>
      `;
    })
    .join("");
}

function renderMemberSettings() {
  const editableMembers = state.member ? [state.member] : [];
  memberSettings.innerHTML = editableMembers
    .map((member) => {
      return `
        <div class="member-card">
          <label>
            名前
            <input data-member-id="${member.id}" data-field="name" value="${escapeHtml(member.name)}" />
          </label>
          <label>
            色
            <input data-member-id="${member.id}" data-field="color" type="color" value="${member.color}" />
          </label>
        </div>
      `;
    })
    .join("");
}

function renderGrid() {
  if (!grid) return;

  const memberMap = new Map(state.members.map((member) => [member.id, member]));

  const headerRow = `
    <div class="grid-head"></div>
    <div class="grid-head order-head"></div>
    ${state.dates
      .map((date) => `<div class="grid-head">${formatLabel(date)}</div>`)
      .join("")}
    <div class="grid-head actions-head">操作</div>
  `;

  const activeHabits = state.habits.filter((habit) => !habit.archived);
  const archivedHabits = state.habits.filter((habit) => habit.archived);

  const buildRows = (habits) =>
    habits
      .map((habit, index) => {
        const owner = memberMap.get(habit.member_id);
        const ownerColor = owner ? owner.color : "#d9d3cc";
        const ownerName = owner ? owner.name : "未設定";
        const isArchived = habit.archived === true;
        const canEdit = state.member && habit.member_id === state.member.id;
        const archiveAction = isArchived ? "unarchive" : "archive";
        const archiveLabel = isArchived ? "復元" : "アーカイブ";
        const isFirst = index === 0;
        const isLast = index === habits.length - 1;
        const cells = state.dates
          .map((date) => renderCell(habit.id, date, ownerColor, isArchived))
          .join("");
        return `
          <div class="habit-name" data-habit-id="${habit.id}">
            <button class="habit-title" data-habit-id="${habit.id}" title="クリックで編集">
              <span class="habit-owner" style="--owner-color:${ownerColor}"></span>
              ${escapeHtml(habit.title)}
              <span class="habit-owner-name">(${escapeHtml(ownerName)})</span>
            </button>
          </div>
          <div class="habit-order">
            <button class="habit-action order" data-action="move-up" data-habit-id="${habit.id}" ${!canEdit || isFirst ? "disabled" : ""}>↑</button>
            <button class="habit-action order" data-action="move-down" data-habit-id="${habit.id}" ${!canEdit || isLast ? "disabled" : ""}>↓</button>
          </div>
          ${cells}
          <div class="habit-actions">
            <button class="habit-action" data-action="${archiveAction}" data-habit-id="${habit.id}" ${canEdit ? "" : "disabled"}>${archiveLabel}</button>
            <button class="habit-action danger" data-action="delete" data-habit-id="${habit.id}" ${canEdit ? "" : "disabled"}>削除</button>
          </div>
        `;
      })
      .join("");

  const buildSection = (habits, title) => {
    if (!habits.length) return "";
    const titleHtml = title
      ? `<div class="grid-section-title">${title}</div>`
      : "";
    return `
      <div class="grid-section">
        ${titleHtml}
        <div class="grid" style="--days:${state.dates.length}">
          ${headerRow}
          ${buildRows(habits)}
        </div>
      </div>
    `;
  };

  const sections = [buildSection(activeHabits, "")];
  if (state.showArchived) {
    sections.push(buildSection(archivedHabits, "アーカイブ済み"));
  }

  grid.innerHTML = sections.join("");
}

function renderCell(habitId, date, ownerColor, isArchived) {
  const key = `${habitId}|${date}`;
  const active = state.entries.has(key) ? "active" : "";
  const dot = `<span class="dot ${active}" style="--dot-color:${ownerColor}"></span>`;
  const disabled = isArchived ? "disabled" : "";
  const archivedClass = isArchived ? "archived" : "";

  return `
    <button class="cell ${archivedClass}" data-habit-id="${habitId}" data-date="${date}" title="${date}" ${disabled}>
      ${dot}
    </button>
  `;
}

function buildDateRange(startDate, rangeDays) {
  const dates = [];
  for (let i = 0; i < rangeDays; i += 1) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    dates.push(formatDate(d));
  }
  return dates;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLabel(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function pickMemberColor(members) {
  const used = new Set((members || []).map((member) => member.color));
  const available = DEFAULT_COLORS.filter((color) => !used.has(color));
  if (available.length > 0) {
    return available[0];
  }
  return DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
}

function getRangeStartForToday(rangeDays) {
  const today = startOfDay(new Date());
  return addDays(today, -(rangeDays - 1));
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function showNotice(message) {
  configNotice.textContent = message;
  configNotice.classList.remove("hidden");
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
