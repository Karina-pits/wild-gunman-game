'use strict';

// DOM REFS 
const gameMenu     = document.getElementById('gameMenu');
const wrapper      = document.getElementById('wrapper');
const gamePanels   = document.getElementById('gamePanels');
const gameScreen   = document.getElementById('gameScreen');
const winScreen    = document.getElementById('winScreen');
const gunmanEl     = document.getElementById('gunman');
const messageEl    = document.getElementById('message');
const timeYouEl    = document.getElementById('timeYou');
const timeGunmanEl = document.getElementById('timeGunman');
const scoreNumEl   = document.getElementById('scoreNum');
const levelLabelEl = document.getElementById('levelLabel');
const finalScoreEl = document.getElementById('finalScore');
const btnStart     = document.getElementById('btnStart');
const btnRestart   = document.getElementById('btnRestart');
const btnNextLevel = document.getElementById('btnNextLevel');
const btnPlayAgain = document.getElementById('btnPlayAgain');

// GAME STATE 
const initialState = () => ({   // використовуємо функцію, а не просто змінну, щоб кожного разу, коли ти натискаєш "Restart", ми могли легко отримати "чисту" копію стану
  level:          1,
  score:          0,
  gunmanTime:     2.0,   
  phase:          'idle',                    //меню
  fireTime:       null,
  playerTime:     null,
  timerInterval:  null,
  duelTimeout:    null,
  gunmanTimeout:  null,
});

let state = initialState();

// CUSTOM CURSOR 
document.addEventListener('mousemove', e => {
  document.documentElement.style.setProperty('--cur-x', e.clientX + 'px');
  document.documentElement.style.setProperty('--cur-y', e.clientY + 'px');
});

//  AUDIO SYSTEM
const sounds = {
  intro:    new Audio('audio/intro.m4a'),
  wait:     new Audio('audio/wait.m4a'),
  fire:     new Audio('audio/fire.m4a'),
  shot:     new Audio('audio/shot.m4a'),
  death:    new Audio('audio/death.m4a'),
  win:      new Audio('audio/win.m4a'),
  shotFall: new Audio('audio/shot-fall.m4a'),
  foul:     new Audio('audio/foul.m4a')
};

// Фонова музика має зациклюватись
sounds.intro.loop = true;
sounds.wait.loop = true;

const stopAllSounds = () => {                      //вимикає всі звуки
  Object.values(sounds).forEach(sound => {
    sound.pause();
    sound.currentTime = 0;
  });
};

const playSound = (name) => {
  if (sounds[name]) {
    sounds[name].currentTime = 0;
    sounds[name].play().catch(e => console.warn("Audio blocked by browser"));   //щоб не блокувало автоматичне відьворення звуку
  }
};

// HELPERS
const setGunmanClass = (...classes) => {
  const characterId = ((state.level - 1) % 3) + 1;
  gunmanEl.className = `gunman gunman-level-${characterId} ` + classes.join(' ');           //якого ковбоя показати (спочатку)
};

const showMessage = (type, text = '') => {
  messageEl.className = 'message ' + (type ? `message--${type}` : '');
  messageEl.textContent = type === 'fire' ? '' : text;                   //Якщо ми кажемо стріляти (fire), текст не потрібен (бо є картинка). В інших випадках записується переданий текст.
};

const hideMessage = () => {
  messageEl.className = 'message';
  messageEl.textContent = '';
};

const updateHUD = () => {                                  //Ця функція синхронізує те, що бачить гравець, із пам'яттю гри (state)
  scoreNumEl.textContent = state.score;
  levelLabelEl.textContent = 'Level ' + state.level;
  timeYouEl.textContent    = '0.00';
  timeGunmanEl.textContent = parseFloat(state.gunmanTime).toFixed(2);
};

const clearTimers = () => {                                     //зупинка таймерів після раунду
  clearInterval(state.timerInterval);
  clearTimeout(state.duelTimeout);
  clearTimeout(state.gunmanTimeout);
};

const timeCounter = () => {                                     //Ця функція вмикає лічильник часу, коли з'являється напис "FIRE"
  const start = Date.now();
  state.timerInterval = setInterval(() => {
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    timeYouEl.textContent = elapsed;
  }, 50);
};

// START / RESTART / NEXT 
const startGame = () => {                              //Ця функція перемикає гру з «режиму меню» в «режим бою»
  state = initialState();
  stopAllSounds();
  playSound('intro');
  gameMenu.style.display = 'none';
  winScreen.style.display = 'none';
  wrapper.style.display   = 'flex';
  gamePanels.style.display = 'flex';
  gameScreen.style.display = 'block';
  updateHUD();
  beginRound();                              //змушує ковбоя вийти на екран
};

const restartGame = () => {                                        //Ця функція викликається, коли ти програв дуель і натиснув кнопку "Restart".
  clearTimers();
  hideMessage();
  stopAllSounds();
  playSound('intro');
  gameScreen.classList.remove('game-screen--death');
  btnRestart.style.display = 'none';
  beginRound();
};

const nextLevel = () => {
  clearTimers();
  hideMessage();
  stopAllSounds();
  playSound('intro');
  state.level += 1;
  state.gunmanTime = Math.max(0.4, state.gunmanTime - 0.2);
  btnNextLevel.style.display = 'none';
  updateHUD();
  beginRound();
};

//GAME LOGIC 
const beginRound = () => {
  state.phase = 'walking';
  gunmanEl.style.transition = 'none';
  gunmanEl.style.left = '110%';
  void gunmanEl.offsetWidth;
  
  setGunmanClass('gunman-walking', 'gunman-moving');
  gunmanEl.style.transition = 'left 3s linear';
  gunmanEl.style.left = '50%';

  setTimeout(() => {
    if (state.phase === 'walking') prepareForDuel();
  }, 3000);
};

const prepareForDuel = () => {
  state.phase = 'standing';
  setGunmanClass('gunman-standing');
  
  // Зміна музики на тривожне очікування
  sounds.intro.pause();
  playSound('wait');

  const delay = 1000 + Math.random() * 2000;
  state.duelTimeout = setTimeout(() => {
    startDuel();
  }, delay);
};

const startDuel = () => {
  state.phase = 'duel';
  state.fireTime = Date.now();
  
  sounds.wait.pause();
  playSound('fire'); 
  
  setGunmanClass('gunman-ready');
  showMessage('fire');
  timeCounter();

  state.gunmanTimeout = setTimeout(() => {
    if (state.phase === 'duel') gunmanShootsPlayer();
  }, state.gunmanTime * 1000);
};

const gunmanShootsPlayer = () => {
  state.phase = 'result';
  clearTimers();
  stopAllSounds();
  playSound('death');

  timeYouEl.textContent = '---';
  setGunmanClass('gunman-shooting');
  gameScreen.classList.add('game-screen--death');

  hideMessage();
  setTimeout(() => {
    showMessage('dead', '💀 TOO SLOW!');
    btnRestart.style.display = 'block';
  }, 600);
};

const playerShootsGunman = () => {
  state.phase = 'result';
  clearTimers();
  
  // Звук пострілу і звук падіння
  playSound('shot');
  setTimeout(() => playSound('shotFall'), 150);

  const elapsed = (Date.now() - state.fireTime) / 1000;
  state.playerTime = elapsed;
  timeYouEl.textContent = elapsed.toFixed(2);

  const earned = state.level * 100;
  state.score += earned;
  scoreNumEl.textContent = state.score;

  setGunmanClass('gunman-dead');
  hideMessage();

  setTimeout(() => {
    stopAllSounds();
    playSound('win');
    showMessage('win', '🏆 YOU WIN! +$' + earned);
    
    if (state.level >= 6) {
      setTimeout(showWinScreen, 2500);
    } else {
      btnNextLevel.style.display = 'block';
    }
  }, 800);
};

const showWinScreen = () => {
  stopAllSounds();
  playSound('win');
  finalScoreEl.textContent = 'Total: $' + state.score;
  wrapper.style.display  = 'none';
  winScreen.style.display = 'flex';
};

//  INPUT 
const handleScreenClick = (e) => {
  if (state.phase === 'duel') {
    const rect = gunmanEl.getBoundingClientRect();
    const hit = (
      e.clientX >= rect.left && e.clientX <= rect.right &&               //Код перевіряє, чи потрапив твій клік (e.clientX, e.clientY) у цей прямокутник.
      e.clientY >= rect.top && e.clientY <= rect.bottom
    );
    if (hit) {
      playerShootsGunman();
    } else {
      // Промах
      playSound('shot');
    }
  } else if (state.phase === 'standing' || state.phase === 'walking') {
    // Фальстарт
    clearTimers();
    state.phase = 'result';
    stopAllSounds();
    playSound('foul');
    showMessage('dead', 'FOUL!');
    btnRestart.style.display = 'block';
  }
};

//LISTENERS 
btnStart.addEventListener('click', startGame);                              //Слухай уважно: як тільки станеться ця подія, негайно виконай ось цю дію
btnRestart.addEventListener('click', restartGame);
btnNextLevel.addEventListener('click', nextLevel);
btnPlayAgain.addEventListener('click', startGame);
gameScreen.addEventListener('mousedown', handleScreenClick);              //mousedown спрацьовує в ту саму мілісекунду, коли ти тільки торкнувся кнопки.