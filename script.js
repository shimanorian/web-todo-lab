const STORAGE_KEY = 'todo-tasks';

let tasks = loadTasks();
let editingId = null;
let draggedId = null;
const state = { search: '', status: 'all', sort: 'manual' };

function loadTasks() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function makeButton(text, className, onClick) {
  const btn = el('button', className, text);
  btn.type = 'button';
  btn.addEventListener('click', onClick);
  return btn;
}

function formatDate(value) {
  if (!value) return 'Без даты';
  const [y, m, d] = value.split('-');
  return d + '.' + m + '.' + y;
}

/* ---------- каркас страницы ---------- */

const app = el('main', 'app');
const title = el('h1', 'app__title', 'To-Do List');

// форма добавления
const form = el('form', 'panel form');
const textInput = el('input', 'input input--text');
textInput.type = 'text';
textInput.placeholder = 'Новая задача';
textInput.setAttribute('aria-label', 'Название задачи');
const dateInput = el('input', 'input input--date');
dateInput.type = 'date';
dateInput.setAttribute('aria-label', 'Дата задачи');
const addBtn = el('button', 'btn', 'Добавить');
addBtn.type = 'submit';
form.append(textInput, dateInput, addBtn);

// поиск, фильтр, сортировка
const controls = el('section', 'panel controls');
const searchInput = el('input', 'input input--search');
searchInput.type = 'search';
searchInput.placeholder = 'Поиск по названию';
searchInput.setAttribute('aria-label', 'Поиск по названию');

const statusSelect = el('select', 'select');
statusSelect.setAttribute('aria-label', 'Фильтр по статусу');
[['all', 'Все задачи'], ['active', 'Невыполненные'], ['done', 'Выполненные']].forEach(([v, t]) => {
  const o = el('option', '', t);
  o.value = v;
  statusSelect.append(o);
});

const sortSelect = el('select', 'select');
sortSelect.setAttribute('aria-label', 'Сортировка');
[['manual', 'Свой порядок'], ['asc', 'Дата: сначала ранние'], ['desc', 'Дата: сначала поздние']].forEach(([v, t]) => {
  const o = el('option', '', t);
  o.value = v;
  sortSelect.append(o);
});
controls.append(searchInput, statusSelect, sortSelect);

const list = el('ul', 'list');

app.append(title, form, controls, list);
document.body.append(app);

/* ---------- логика ---------- */

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = textInput.value.trim();
  if (!text) {
    textInput.focus();
    return;
  }
  tasks.push({ id: Date.now().toString(), text, date: dateInput.value, done: false });
  textInput.value = '';
  dateInput.value = '';
  saveTasks();
  render();
});

searchInput.addEventListener('input', () => { state.search = searchInput.value.trim().toLowerCase(); render(); });
statusSelect.addEventListener('change', () => { state.status = statusSelect.value; render(); });
sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; render(); });

function getVisibleTasks() {
  let result = tasks.filter((t) => {
    if (state.status === 'active' && t.done) return false;
    if (state.status === 'done' && !t.done) return false;
    return t.text.toLowerCase().includes(state.search);
  });
  if (state.sort !== 'manual') {
    const k = state.sort === 'asc' ? 1 : -1;
    result = result.slice().sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;   // без даты всегда внизу
      if (!b.date) return -1;
      return a.date.localeCompare(b.date) * k;
    });
  }
  return result;
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  render();
}

function toggleTask(id) {
  const t = tasks.find((x) => x.id === id);
  t.done = !t.done;
  saveTasks();
  render();
}

function saveEdit(id, text, date) {
  const newText = text.trim();
  if (!newText) return;
  const t = tasks.find((x) => x.id === id);
  t.text = newText;
  t.date = date;
  editingId = null;
  saveTasks();
  render();
}

function moveTask(fromId, toId) {
  if (fromId === toId) return;
  const from = tasks.findIndex((t) => t.id === fromId);
  const [item] = tasks.splice(from, 1);
  const to = tasks.findIndex((t) => t.id === toId);
  tasks.splice(to, 0, item);
  saveTasks();
  render();
}

/* ---------- отрисовка ---------- */

function createTaskItem(task) {
  const li = el('li', 'task' + (task.done ? ' task--done' : ''));
  li.draggable = editingId !== task.id;
  li.dataset.id = task.id;

  const check = el('input', 'task__check');
  check.type = 'checkbox';
  check.checked = task.done;
  check.setAttribute('aria-label', 'Выполнено');
  check.addEventListener('change', () => toggleTask(task.id));

  if (editingId === task.id) {
    const edit = el('div', 'task__edit');
    const t = el('input', 'input');
    t.type = 'text';
    t.value = task.text;
    const d = el('input', 'input');
    d.type = 'date';
    d.value = task.date;
    edit.append(t, d);
    const actions = el('div', 'task__actions');
    actions.append(
      makeButton('Сохранить', 'btn', () => saveEdit(task.id, t.value, d.value)),
      makeButton('Отмена', 'btn btn--ghost', () => { editingId = null; render(); })
    );
    li.append(check, edit, actions);
    return li;
  }

  const body = el('div', 'task__body');
  body.append(el('span', 'task__title', task.text), el('span', 'task__date', formatDate(task.date)));

  const actions = el('div', 'task__actions');
  actions.append(
    makeButton('Изменить', 'btn btn--ghost', () => { editingId = task.id; render(); }),
    makeButton('Удалить', 'btn', () => deleteTask(task.id))
  );
  li.append(check, body, actions);

  li.addEventListener('dragstart', (e) => {
    draggedId = task.id;
    li.classList.add('task--dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  });
  li.addEventListener('dragend', () => {
    draggedId = null;
    li.classList.remove('task--dragging');
  });
  li.addEventListener('dragover', (e) => {
    e.preventDefault();
    li.classList.add('task--over');
  });
  li.addEventListener('dragleave', () => li.classList.remove('task--over'));
  li.addEventListener('drop', (e) => {
    e.preventDefault();
    li.classList.remove('task--over');
    if (draggedId) moveTask(draggedId, task.id);
  });
  return li;
}

function render() {
  list.replaceChildren();
  const visible = getVisibleTasks();
  if (visible.length === 0) {
    const empty = el('li', 'empty', tasks.length === 0 ? 'Задач пока нет. Добавьте первую.' : 'Ничего не найдено.');
    list.append(empty);
    return;
  }
  visible.forEach((t) => list.append(createTaskItem(t)));
}

render();