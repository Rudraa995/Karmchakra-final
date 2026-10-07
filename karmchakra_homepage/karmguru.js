// ====== SETTINGS ======
const GURU_IMAGE = 'assets/rishi.png'; // change only if your photo has another name
const GURU_API = ''; // later: 'http://localhost:5000/api/guru'  (leave empty for demo replies)
// ======================

const $ = (id) => document.getElementById(id);
const box = $('messages');
const input = $('msgInput');
const sendBtn = document.querySelector('.send');

/* ---------- Guru photo (shows a placeholder if the image is missing) ---------- */
const photoWrap = document.querySelector('.guru-photo');
const img = $('guruImg');
img.src = GURU_IMAGE;
img.onerror = () => photoWrap.classList.add('no-img');

/* ---------- User name from login (falls back to "friend") ---------- */
function getName() {
    try {
        const u = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
        return (u.name || '').split(' ')[0] || 'friend';
    } catch (_) { return 'friend'; }
}

/* ---------- Chat helpers ---------- */
function addMessage(text, who) {
    const row = document.createElement('div');
    row.className = 'msg ' + who;
    if (who === 'guru') {
        const ava = document.createElement('div');
        ava.className = 'ava';
        if (!photoWrap.classList.contains('no-img')) ava.style.backgroundImage = `url('${GURU_IMAGE}')`;
        row.appendChild(ava);
    }
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text; // textContent keeps user input safe
    row.appendChild(bubble);
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
    return row;
}

function showTyping() {
    const row = document.createElement('div');
    row.className = 'msg guru typing';
    row.innerHTML = '<div class="ava"></div><div class="bubble"><i></i><i></i><i></i></div>';
    if (!photoWrap.classList.contains('no-img')) row.querySelector('.ava').style.backgroundImage = `url('${GURU_IMAGE}')`;
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
    return row;
}

/* ---------- Demo replies (frontend only) ---------- */
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const replies = [
    [/suggest|today|which karma|what should/i, () => pick([
        'Begin close to home. Plant or water one sapling today: Prakriti Karma. It is small, and it earns +100 Mudrā.',
        'Look around you. A hungry person, a thirsty bird, a neighbour in need. Seva Karma awaits you today.',
        'Give a few minutes to a street animal: fresh water or a little food. Jeeva Karma, +90 Mudrā.'
    ])],
    [/mudr|earn|points|reward/i, () =>
        'Mudrā grows with action, not words. Do a real deed, upload a clear photo as proof, and let the Karma AI verify it. Consistency matters: a small deed every day beats one big deed a month.'
    ],
    [/motivat|tired|give up|continue|lazy|sad|stress/i, () => pick([
        'Do your duty, and let go of clinging to the result. Even one small good deed today moves the wheel forward. Which one can you finish in ten minutes?',
        'The road feels long because you are looking at the end. Look only at the next step. What is one kind thing you can do right now?'
    ])],
    [/prakriti|nature|tree|plant/i, () =>
        'Prakriti Karma is service to nature: planting trees, cleaning a space, saving water. Take a photo of the sapling with the place visible, and upload it as proof.'
    ],
    [/seva|service|help/i, () =>
        'Seva is selfless service. Feed someone, help an elder, or volunteer your time. The deed matters more than its size.'
    ],
    [/jeeva|animal|dog|cow|bird/i, () =>
        'Jeeva Karma is compassion for all living beings. Water for birds, food for street animals, and care for the injured all count.'
    ],
    [/hello|hi\b|namaste|hey/i, () => `Namaste, ${getName()}. Tell me what is on your mind, or ask which karma awaits you today.`],
];

async function askGuru(text) {
    // ---- LATER: connect your backend here ----
    if (GURU_API) {
        const res = await fetch(GURU_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text }),
        });
        const data = await res.json();
        return data.reply; // change 'reply' to the field your backend returns
    }
    // ---- demo mode ----
    await new Promise((r) => setTimeout(r, 900 + Math.random() * 700));
    const hit = replies.find(([re]) => re.test(text));
    return hit ? hit[1]() :
        'I hear you. Tell me a little more, or ask me to suggest a karma for today, and we will find your next step together.';
}

async function send(text) {
    text = text.trim();
    if (!text) return;
    addMessage(text, 'user');
    input.value = '';
    sendBtn.disabled = true;
    const typing = showTyping();
    try {
        const reply = await askGuru(text);
        typing.remove();
        addMessage(reply, 'guru');
    } catch (err) {
        typing.remove();
        addMessage('I could not reach the server just now. Please try again in a moment.', 'guru');
    } finally {
        sendBtn.disabled = false;
        input.focus();
    }
}

/* ---------- Events ---------- */
$('composer').addEventListener('submit', (e) => { e.preventDefault();
    send(input.value); });
$('chips').addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') send(e.target.textContent); });

function welcome() {
    box.innerHTML = '';
    addMessage(`Namaste, ${getName()}. I am Karma Guru, a keeper of ancient wisdom, awakened in digital form. Tell me what weighs on your heart, or ask which karma awaits you today.`, 'guru');
}
$('clearBtn').addEventListener('click', welcome);
welcome();