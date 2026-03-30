const AudioCtx = window.AudioContext || window.webkitAudioContext;
let ctx = null;

function getCtx() {
    if (!ctx) ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
}

function playBeep(freq, duration, type = 'sine', vol = 0.3) {
    try {
        const c = getCtx();
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.connect(gain);
        gain.connect(c.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, c.currentTime);
        gain.gain.setValueAtTime(vol, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
        osc.start(c.currentTime);
        osc.stop(c.currentTime + duration);
    } catch (e) {
        console.warn('Audio failed:', e.message);
    }
}

let alarmInterval = null;

function startResourceAlarm() {
    if (alarmInterval) return;
    alarmInterval = setInterval(() => {
        if (!state.alive) { stopResourceAlarm(); return; }
        const r = state.resources;
        if (r.fuel <= 20 || r.power <= 20 || r.oxygen <= 20) {
            playBeep(880, 0.05, 'square', 0.15);
            setTimeout(() => playBeep(660, 0.05, 'square', 0.15), 200);
        } else {
            stopResourceAlarm();
        }
    }, 2000);
}

function stopResourceAlarm() {
    if (alarmInterval) {
        clearInterval(alarmInterval);
        alarmInterval = null;
    }
}

function soundRadarPing() {
    playBeep(1200, 0.03, 'sine', 0.05);
}

function soundBootBeep() {
    playBeep(440 + Math.random() * 200, 0.08, 'sine', 0.15);
}

function soundPhaseTransition() {
    playBeep(200, 0.1, 'sine', 0.2);
    setTimeout(() => playBeep(300, 0.1, 'sine', 0.2), 120);
    setTimeout(() => playBeep(400, 0.1, 'sine', 0.2), 240);
    setTimeout(() => playBeep(600, 0.3, 'sine', 0.3), 380);
}

function soundAlert() {
    playBeep(880, 0.1, 'square', 0.4);
    setTimeout(() => playBeep(660, 0.15, 'square', 0.4), 120);
    setTimeout(() => playBeep(880, 0.2, 'square', 0.4), 260);
}

function soundDecision() {
    playBeep(440, 0.05, 'sine', 0.2);
    setTimeout(() => playBeep(550, 0.1, 'sine', 0.2), 60);
}

function soundSuccess() {
    playBeep(523, 0.1, 'sine', 0.3);
    setTimeout(() => playBeep(659, 0.1, 'sine', 0.3), 120);
    setTimeout(() => playBeep(784, 0.2, 'sine', 0.3), 240);
    setTimeout(() => playBeep(1047, 0.4, 'sine', 0.3), 380);
}

function soundFail() {
    playBeep(300, 0.2, 'sawtooth', 0.4);
    setTimeout(() => playBeep(200, 0.3, 'sawtooth', 0.4), 220);
    setTimeout(() => playBeep(100, 0.5, 'sawtooth', 0.4), 500);
}

function soundCountdownTick() {
        playBeep(220, 0.05, 'sine', 0.15);
    }

    function soundCountdownUrgent() {
        playBeep(440, 0.08, 'square', 0.25);
    }

    function soundPhase() {
        playBeep(330, 0.08, 'sine', 0.2);
        setTimeout(() => playBeep(440, 0.08, 'sine', 0.2), 100);
        setTimeout(() => playBeep(550, 0.15, 'sine', 0.2), 200);
    }

const state = {
    phase: 0,
    phases: ['LAUNCH', 'ORBIT', 'CRISIS', 'LANDING'],
    resources: { fuel: 100, power: 100, oxygen: 100 },
    telemetry: { altitude: 0, velocity: 0, temp: 22, signal: 'STRONG', thrust: 100, integrity: 100 },
    missionTime: 0,
    timerInterval: null,
    eventQueue: [],
    currentEvent: null,
    alive: true,
    countdownInterval: null,
    score: 0,
    decisions: 0,
    conditionalsFired: [],
    landingTimelapse: false,
    flags: {
        fuelLeakIgnored: false,
        engineDamaged: false,
        hullWeakened: false,
        powerAbused: false,
        oxygenCritical: false,
    },
    playstyle: 'safe',
    streak: 0,
    tutorialDone: false,
};

const EVENTS = {
    LAUNCH: [
        {
            id: 'fuel_leak',
            icon: '🔥',
            title: 'FUEL LEAK DETECTED',
            desc: 'Sensors report a minor fuel leak in tank B. Pressure dropping.',
            choices: [
                { text: 'Ignore it - risk high, save resources', cost: 'FUEL -25', telemetry: { velocity: -200, integrity: -15 }, apply: (r) => { r.fuel -= 25; state.flags.fuelLeakIgnored = true; } },
                { text: 'Reduce thrust - slower ascent', cost: 'FUEL -5', telemetry : { velocity: -500, altitude: -20, thrust: -15 }, apply: (r) => { r.fuel -= 5; } },
                { text: 'Emergency seal - costs power', cost: 'POWER -20', telemetry: { temp: -50, integrity: 5 }, apply: (r) => { r.power -= 20; } },
            ],
        },
        {
            id: 'engine_overheat',
            icon: '🌡️',
            title: 'ENGINE OVERHEAT',
            desc: 'Engine temperature exceeds safe threshold. Risk of failure.',
            choices: [
                { text: 'Throttle down - lose velocity', cost: 'FUEL -10', telemetry: { velocity: -400, thrust: -10, temp: -200 }, apply: (r) => { r.fuel -= 10; } },
                { text: 'Emergency coolant flush', cost: 'POWER -15 | OXYGEN -5', telemetry: { temp: -400, integrity: 5 }, apply: (r) => { r.power -= 15; r.oxygen -= 5; } },
                { text: 'Push through - high risk', cost: 'FUEL -30', telemetry: { temp: 300, integrity: -20, velocity: 200 }, apply: (r) => { r.fuel -= 30; state.flags.engineDamaged = true; } },
            ],
        },
        {
            id: 'bird_strike',
            icon: '🐦',
            title: 'BIRD STRIKE ON ENGINE 2',
            desc: 'Foreign object ingested. Engine 2 running at 60% efficiency.',
            choices: [
                { text: 'Shut down engine 2', cost: 'FUEL -15', apply: (r) => { r.fuel -= 15; } },
                { text: 'Compensate with engine 1', cost: 'POWER -10', apply: (r) => { r.power -= 10; } },
                { text: 'Ignore - statistically fine', cost: 'OXYGEN -10', apply: (r) => { r.oxygen -= 10; } },
            ],
        },
        {
            id: 'gyro_fail',
            icon: '🌀',
            title: 'GYROSCOPE FAILURE',
            desc: 'Attitude control unstable. Craft drifting off trajectory.',
            choices: [
                { text: 'Manual attitude correction', cost: 'FUEL -12', apply: (r) => { r.fuel -= 12; } },
                { text: 'Reboot guidance computer', cost: 'POWER -18', apply: (r) => { r.power -= 18; } },
                { text: 'Use backup thrusters', cost: 'FUEL -8 | POWER -8', apply: (r) => { r.fuel -=8; r.power -= 8; } },
            ],
        },
    ],
    ORBIT: [
        {
            id: 'solar_flare',
            icon: '☀️',
            title: 'SOLAR FLARE INCOMING',
            desc: 'A class-x solar flare will hit in 90 seconds. SHields at 40%',
            choices: [
                { text: 'Rotate craft - shield critical systems', cost: 'FUEL -10', telemetry: { integrity: 5, temp: 50 }, apply: (r) => { r.fuel -= 10; } },
                { text: 'Boost shields - power surge', cost: 'POWER -25', telemetry: { integrity: 15, temp: 20 }, apply: (r) => { r.power -= 25; } },
                { text: 'Take the hit - pray', cost: 'ALL -15', telemetry: { integrity: -25, temp: 200, velocity: -300 }, apply: (r) => { r.fuel -=15; r.power -= 15; r.oxygen -= 15; } },
            ],
        },
        {
            id: 'debris_field',
            icon: '☄️',
            title: 'DEBRIS FIELD AHEAD',
            desc: 'Orbital debris detected on current trajectory. Collision risk: HIGH.',
            choices: [
                { text: 'Emergency burn - change orbit', cost: 'FUEL -20', telemetry: { altitude: 20, velocity: 300, temp: 30 }, apply: (r) => { r.fuel -= 20; } },
                { text: 'Slow down and navigate', cost: 'FUEL -8 | OXYGEN -5', telemetry: { velocity: -600, integrity: -5 }, apply: (r) => { r.fuel -= 8; r.oxygen -= 5; } },
                { text: 'Full speed - statistically safe', cost: 'POWER -10', telemetry: { velocity: 200, integrity: -15 }, apply: (r) => { r.power -= 10; } },
            ],
        },
        {
            id: 'comms_loss',
            icon: '📡',
            title: 'SIGNAL LOST',
            desc: 'Communication with ground control severed. Flying blind.',
            choices: [
                { text: 'Deploy backup antenna', cost: 'POWER -20', apply: (r) => { r.power -= 20; } },
                { text: 'Adjust orbit for line of sight', cost: 'FUEL -15', apply: (r) => { r.fuel -= 15; } },
                { text: 'Continue mission autonomously', cost: 'OXYGEN -8', apply: (r) => { r.oxygen -= 8; } },
            ],
        },
        {
            id: 'micrometeorite',
            icon: '💥',
            title: 'MICROMETEORITE IMPACT',
            desc: 'Hull breach detected in section C. Pressure dropping slowly.',
            choices: [
                { text: 'Emergency patch - EVA required', cost: 'OXYGEN -20', apply: (r) => { r.oxygen -= 20; } },
                { text: 'Seal section C -lose storage', cost: 'POWER -12', apply: (r) => { r.power -= 12; } },
                { text: 'Monitor and wait', cost: 'FUEL -5 | OXYGEN -10', apply: (r) => { r.fuel -= 5; r.oxygen -= 10; } },
            ],
        },
    ],
    CRISIS: [
        {
            id: 'oxygen_drop',
            icon: '💨',
            title: 'OXYGEN SYSTEM FAILURE',
            desc: 'O2 recycler offline. Crew has 12 minutes of reserve oxygen.',
            choices: [
                { text: 'Manual repair - crew exits craft', cost: 'FUEL -5 | POWER -10', apply: (r) => { r.fuel -= 5; r.power -= 10; } },
                { text: 'Reroute from life support backup', cost: 'OXYGEN -20', apply: (r) => { r.oxygen -= 20; } },
                { text: 'Emergency protocol - abort sequence', cost: 'FUEL -35', apply: (r) => { r.fuel -= 35; } },
            ],
        },
        {
            id: 'power_failure',
            icon: '⚡',
            title: 'POWER GRID FAILURE',
            desc: 'Main power bus offline. Navigation and comms on battery backup.',
            choices: [
                { text: 'Restart main bus - risky', cost: 'POWER -30', apply: (r) => { r.power -= 30; state.flags.powerAbused = true; } },
                { text: 'Switch to solar backup', cost: 'FUEL -10 | POWER -10', apply: (r) => { r.fuel -= 10; r.power -= 10; } },
                { text: 'Reduce all systems to minimum', cost: 'OXYGEN -15', apply: (r) => { r.oxygen -= 15; } },
            ],
        },
        {
            id: 'fire_onboard',
            icon: '🔥',
            title: 'FIRE IN MODULE B',
            desc: 'Electrical fire detected. Spreading fast. Suppression system offline',
            choices: [
                { text: 'Manual extinguisher - crew risk', cost: 'OXYGEN -25', telemetry: { integrity: 5, temp: -100 }, apply: (r) => { r.oxygen -= 25; } },
                { text: 'Depressurize module B', cost: 'POWER -15 | OXYGEN -10', telemetry: { integrity: -10, temp: -200 }, apply: (r) => { r.power -= 15; r.oxygen -= 10; } },
                { text: 'Vent atmosphere - extreme risk', cost: 'ALL -20', telemetry: { integrity: -30, temp: -300, velocity: -400 }, apply: (r) => { r.fuel -= 20; r.power -= 20; r.oxygen -= 20; } },
            ],
        },
        {
            id: 'nav_corrupt',
            icon: '🗺️',
            title: 'NAVIGATION DATA CORRUPTED',
            desc: 'Reentry coordinates lost. Manual calculation required.',
            choices: [
                { text: 'Recalculate using star tracker', cost: 'POWER -20', apply: (r) => { r.power -= 20; } },
                { text: 'Use last known trajectory', cost: 'FUEL -18', apply: (r) => { r.fuel -= 18; } },
                { text: 'Request ground uplink', cost: 'POWER -10 | OXYGEN -5', apply: (r) => { r.power -= 10; r.oxygen -= 5; } },
            ],
        },
    ],
    LANDING: [
        {
            id: 'landing_gear',
            icon: '🛬',
            title: 'LANDING GEAR FAILURE',
            desc: 'Port landing strut failed to deploy. Manual override required.',
            choices: [
                { text: 'Force deploy -structural risk', cost: 'POWER -15', apply: (r) => { r.power -= 15; } },
                { text: 'Belly landing - fuel burn', cost: 'FUEL -20', apply: (r) => { r.fuel -= 20; } },
                { text: 'EVA repair before descent', cost: 'OXYGEN -20 | POWER -10', apply: (r) => { r.oxygen -= 20; r.power -= 10; } },
            ],
        },
        {
            id: 'heat_shield',
            icon: '🛡️',
            title: 'HEAT SHIELD DEGRADING',
            desc: 'Shield integrity at 34%. Reentry temperature critical.',
            choices: [
                { text: 'Reduce reentry angle spray', cost: 'POWER -25', telemetry: { temp: -300, velocity: -400, integrity: 10 }, apply: (r) => { r.power -= 25; } },
                { text: 'Emergency ablative spray', cost: 'POWER -25', telemetry: { temp: -500, integrity: 20 }, apply: (r) => { r.power -= 25; } },
                { text: 'Push through - shields may hold', cost: 'OXYGEN -15', telemetry: { temp: 400, integrity: -20, velocity: 200 }, apply: (r) => { r.oxygen -= 15; } },
            ],
        },
        {
            id: 'chute_fail',
            icon: '🪂',
            title: 'PARACHUTE DEPLOY FAILURE',
            desc: 'Main chute failed to open. Backup chute on stand by.',
            choices: [
                { text: 'Deploy backup immediately', cost: 'POWER -10', apply: (r) => { r.power -= 10; } },
                { text: 'Manual rip cord - crew risk', cost: 'OXYGEN -15', apply: (r) => { r.oxygen -= 15; } },
                { text: 'Retro-burn landing', cost: 'FUEL -30', apply: (r) => { r.fuel -= 30; } },
            ],
        },
    ],
};

const TELEMETRY_TARGETS = [
    { altitude: 120, velocity: 7800, temp: 890, signal: 'STRONG' },
    { altitude: 408, velocity: 7700, temp: -157, signal: 'STRONG' },
    { altitude: 380, velocity: 7600, temp: -160, signal: 'WEAK' },
    { altitude: 0, velocity: 340, temp: 1600, signal: 'STRONG' },
];

const NARRATIVES = [
    'Engines at full thrust. All systems nominal. Beginning ascent sequence.',
    'Stable orbit achieved. Running systems check. Enjoying the view.',
    'Anomalies detected. Crew on high alert. Mission control monitoring.',
    'Deorbit burn complete. Entering atmosphere. Heat shield holding.',
];

const bootMessages = [
    '> INITIALIZING FLIGHT COMPUTER...',
    '> LOADING NAVIGATION SYSTEMS...',
    '> CHECKING LIFE SUPPORT...',
    '> FUEL SYSTEMS: NOMINAL',
    '> POWER GRID: ONLINE',
    '> OXYGEN RECYCLER: ACTIVE',
    '> ALL SYSTEMS GO.',
    '> AWAITING COMMANDER AUTHORIZATION.',
];

function runBoot() {
    const container = document.getElementById('boot-lines');
    let i = 0;
    const interval = setInterval(() => {
        if (i >= bootMessages.length) {
            clearInterval(interval);
            document.getElementById('btn-start').classList.remove('hidden');
            return;
        }
        const p = document.createElement('p');
        p.textContent = bootMessages[i];
        container.appendChild(p);
        soundBootBeep();
        i++;
    }, 350);
}

function $(id) { return document.getElementById(id); }

function log(msg, type = '') {
    const list = $('log-list');
    const entry = document.createElement('div')
    entry.className = `log-entry ${type}`;
    const t = formatTime(state.missionTime);
    entry.innerHTML = `<span class="log-time">T+${t}</span>${msg}`;
    list.prepend(entry);
}

function formatTime(s) {
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${h}:${m}:${sec}`;
}

function updateResourceUI() {
    const r = state.resources;
    ['fuel', 'power', 'oxygen'].forEach(key => {
        const val = Math.max(0, r[key]);
        $(`bar-${key}`).style.width = val + '%';
        $(`res-${key}-val`).textContent = val + '%';

        const bar = $(`bar-${key}`);
        if (val <= 20) bar.style.background = 'var(--danger)';
        else if (val <= 40) bar.style.background = 'var(--warn)';
        else if (key === 'fuel') bar.style.background = 'var(--accent2)';
        else if (key === 'power') bar.style.background = 'var(--warn)';
        else bar.style.background = 'var(--success)';

        const label = $(`res-${key}-val`);
        if (val <= 20) {
            label.classList.add('resource-critical');
            label.classList.remove('resource-warning');
        } else if (val <= 40) {
            label.classList.remove('resource-critical');
            label.classList.add('resource-warning');
        } else {
            label.classList.remove('resource-critical');
            label.classList.remove('resource-warning');
        }
    });

    const total = r.fuel + r.power + r.oxygen;
    const avg = total / 3;

    const mainPanel = document.querySelector('.panel-main');
    const telPanel = document.querySelector('.panel-telemetry');

    if (avg <= 20) {
        startResourceAlarm();
        mainPanel.style.background = 'rgba(255,30,30,0.06)';
        mainPanel.style.borderColor = 'var(--danger)';
        telPanel.classList.add('state-critical');
        telPanel.classList.remove('state-warning');
        setStatus('CRITICAL', 'status-critical');
        if (Math.random() < 0.3) glitchTelemetry();
    } else if (avg <= 40) {
        mainPanel.style.background = 'rgba(255,200,0,0.04)';
        mainPanel.style.borderColor = 'var(--warn)';
        telPanel.classList.remove('state-critical');
        telPanel.classList.add('state-warning');
        if (!state.currentEvent) setStatus('WARNING', 'status-warning');
    } else {
        mainPanel.style.background = '';
        mainPanel.style.borderColor = '';
        telPanel.classList.remove('state-critical');
        telPanel.classList.remove('state-warning');
        if (!state.currentEvent) setStatus('NOMINAL', 'status-nominal');
    }
}


function glitchTelemetry() {
    const fields = ['tel-altitude', 'tel-velocity', 'tel-temp', 'tel-signal'];
    const glitch = fields[Math.floor(Math.random() * fields.length)];
    const el = $(glitch);
    const original = el.textContent;
    el.textContent = '---ERR---';
    el.style.color = 'var(--danger)';
    setTimeout(() => {
        el.textContent = original;
        el.style.color = '';
    }, 400);
}



function updateTelemetryUI() {
    const t = state.telemetry;
    $('tel-altitude').textContent = Math.round(t.altitude) + ' km';
    $('tel-velocity').textContent = Math.round(t.velocity) + ' m/s';
    $('tel-temp').textContent = Math.round(t.temp) + '°C';
    $('tel-signal').textContent = t.signal;
    $('tel-thrust').textContent = Math.round(t.thrust) + '%';
    $('tel-integrity').textContent = Math.round(t.integrity) + '%';

    $('tel-thrust').style.color = t.thrust < 50 ? 'var(--danger)' : 'var(--accent)';
    $('tel-integrity').style.color = t.integrity < 40 ? 'var(--danger)' : t.integrity < 70 ? 'var(--warn)' : 'var(--accent)';
    $('tel-temp').style.color = t.temp > 1000 || t.temp < -200 ? 'var(--danger)' : 'var(--accent)';

    const phase = state.phases[state.phase];
    const gforce = phase === 'LAUNCH' ? (1 + state.telemetry.velocity / 3000).toFixed(1)
                : phase === 'LANDING' ? (2.5 - state.telemetry.altitude / 80).toFixed(1)
                : '0.0';
    $('tel-gforce').textContent = Math.max(0, gforce) + ' g';

    const orbitCount = Math.floor(state.missionTime / 90);
    $('tel-orbit').textContent = phase === 'ORBIT' || phase === 'CRISIS' ? `#${orbitCount + 1}` : '--';

    const etaSeconds = Math.max(0, 120 - (state.missionTime % 120));
    const etaMin = String(Math.floor(etaSeconds / 60)).padStart(2, '0');
    const etaSec = String(etaSeconds % 60).padStart(2, '0');
    $('tel-eta').textContent = `${etaMin}:${etaSec}`;
}

function setStatus(text, cls) {
    const el = $('hud-status');
    el.textContent = text;
    el.className = 'hud-value ' + cls;
}

function endGame(win) {
    clearInterval(state.timerInterval);
    state.alive = false;
    showScreen('screen-end');
    if (win) soundSuccess(); else soundFail();

    const timeBonus = Math.max(0, 300 - state.missionTime);
    const finalScore = win ? state.score + timeBonus : Math.floor(state.score / 2);
    const rating = finalScore >= 250 ? 'COMMANDER' : finalScore >= 180 ? 'PILOT' : finalScore >= 100 ? 'CADET' : 'FAILURE';

    if (win) {
        $('end-icon').textContent = '🏆';
        $('end-title').textContent = 'MISSION SUCCESS';
        $('end-title').style.color = 'var(--success)';
        $('end-desc').textContent = `Rating: ${rating} - score: ${finalScore} - Decisions: ${state.decisions}. All crew returned safely. You are a legend, Commander.`;
    } else {
        $('end-icon').textContent = '💀';
        $('end-title').textContent = 'MISSION FAILED';
        $('end-title').style.color = 'var(--danger)';
        const reason = getFailReason();
        $('end-desc').textContent = `Rating: ${rating} - Score: ${finalScore} - ${reason}`;
    }
}

function getFailReason() {
    const r = state.resources;
    if (r.fuel <= 0) return 'Fuel depleted. The craft lost propulsion and drifted into an uncontrolled trajectory.';
    if (r.power <= 0) return 'Power failure. All systems went dark. No response from the crew.';
    if (r.oxygen <= 0) return 'Oxygen depleted. The crew did not survive.';
    return 'Critical system failure. Mission aborted.';
}

function checkDeath() {
    const r = state.resources;
    if (r.fuel <= 0 || r.power <= 0 || r.oxygen <= 0) {
        endGame(false);
        return true;
    }
    return false;
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });
    const target = $(id);
    target.style.display = 'flex';
    target.classList.add('active');
}

function triggerEvent(event) {
    state.currentEvent = event;
    $('event-icon').textContent = event.icon;
    $('event-title').textContent = event.title;
    $('event-desc').textContent = event.desc;

    const choicesEl = $('choices');
    choicesEl.innerHTML = '';

    event.choices.forEach((choice, i) => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerHTML = `[${i + 1}] ${choice.text}<span class="choice-cost">${choice.cost}</span>`;
        btn.onclick = () => resolveChoice(choice);
        choicesEl.appendChild(btn);
    });

    $('event-box').classList.remove('hidden');
    setStatus('ACTION REQUIRED', 'status-warning');
    log(`⚠ ${event.title}`, 'warn');

    const flash = document.createElement('div');
    flash.className = 'alert-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 600);

    soundAlert();
    startCountdown(event);
}

function startCountdown(event) {
    const bar = $('countdown-bar');
    const SECONDS = 15;
    let remaining = SECONDS;

    bar.style.width = '100%';
    bar.style.background = 'var(--success)';

    if (state.countdownInterval) clearInterval(state.countdownInterval);

    state.countdownInterval = setInterval(() => {
        remaining--;
        const pct = (remaining / SECONDS) * 100;
        bar.style.width = pct + '%';

        if (pct <= 50) bar.style.background = 'var(--warn)';
        if (pct <= 25) bar.style.background = 'var(--danger)';

        if (remaining <= 5) soundCountdownUrgent();
        else soundCountdownTick();

        if (pct <= 25) {
            const panel = document.querySelector('.panel-telemetry');
            panel.classList.remove('shaking');
            void panel.offsetWidth;
            panel.classList.add('shaking');
        }

        if (remaining <= 0) {
            clearInterval(state.countdownInterval);
            if (state.currentEvent && state.currentEvent.choices) {
                state.streak = 0;
                const worst = state.currentEvent.choices[state.currentEvent.choices.length - 1];
                resolveChoice(worst);
            }
        }
    }, 1000);
}

function applyTelemetryEffects(choice) {
    if (!choice.telemetry) return;
    const t = state.telemetry;
    const effects = choice.telemetry;

    if (effects.altitude) t.altitude = Math.max(0, t.altitude + effects.altitude);
    if (effects.velocity) t.velocity = Math.max(0, t.velocity + effects.velocity);
    if (effects.temp) t.temp = t.temp + effects.temp;
    if (effects.thrust) t.thrust = Math.max(0, Math.min(100, t.thrust + effects.thrust));
    if (effects.integrity) t.integrity = Math.max(0, Math.min(100, t.integrity + effects.integrity));

    updateTelemetryUI();

    if (t.altitude <= 0 && state.phases[state.phase] !== 'LANDING') {
        log('💥 Altitude critical - craft lost', 'danger');
        setTimeout(() => endGame(false), 800);
    }

    if (t.velocity < 5000 && state.phases[state.phase] === 'ORBIT') {
        log('⚠ Velocity critical — uncontrolled deorbit', 'warn');
        state.resources.fuel = Math.max(0, state.resources.fuel - 20);
        updateResourceUI();
    }
}

function resolveChoice(choice) {
    if (state.countdownInterval) clearInterval(state.countdownInterval);
    soundDecision();
    applyTelemetryEffects(choice);
    state.decisions++;
    state.streak++;
    const streakBonus = Math.min(state.streak, 5) * 10;

    const multipliers = { aggressive: 1.5, safe: 1.0, engineer: 1.2 };
    const mult = multipliers[state.playstyle] || 1.0;

    const resourcesTotal = state.resources.fuel + state.resources.power + state.resources.oxygen;
    state.score += Math.floor((resourcesTotal / 3 + streakBonus) * mult);
    if (choice.apply) choice.apply(state.resources);

    Object.keys(state.resources).forEach(k => {
        state.resources[k] = Math.max(0, Math.min(100, state.resources[k]));
    });

    updateResourceUI();
    $('event-box').classList.add('hidden');
    state.currentEvent = null;

    log(`✓ Decision made: ${choice.text.split('—')[0].trim()}`, 'success');

    if (checkDeath()) return;
    setStatus('NOMINAL', 'status-nominal');

    scheduleNextEvent();
}

let animFrame = null;
const canvasState = {
    rockets: [],
    particles: [],
    debris: [],
    stars: [],
    time: 0,
    activeEvent: null,
    orbitAngle: 0,
};

function initCanvas() {
    const canvas = $('mission-canvas');
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;

    canvasState.stars = [];
    for (let i = 0; i< 80; i++) {
        canvasState.stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.7,
            r: Math.random() * 1.5 + 0.3,
            flicker: Math.random(),
        });
    }
}

function startCanvasLoop() {
    if (animFrame) cancelAnimationFrame(animFrame);

    function loop() {
        if (!state.alive) return;
        canvasState.time++;
        const canvas = $('mission-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const phase = state.phases[state.phase];

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (phase === 'LAUNCH') drawLaunch(ctx, canvas);
        else if (phase === 'ORBIT') drawOrbit(ctx, canvas);
        else if (phase === 'CRISIS') drawCrisis(ctx, canvas);
        else if (phase === 'LANDING') drawLanding(ctx, canvas);

        animFrame = requestAnimationFrame(loop);
    }

    animFrame = requestAnimationFrame(loop);
}

function drawStars(ctx, canvas, flicker = false) {
    canvasState.stars.forEach(s => {
        const opacity = flicker
            ? 0.3 + 0.7 * Math.abs(Math.sin(canvasState.time * 0.05 + s.flicker * 10))
            : 0.6 + 0.4 * Math.abs(Math.sin(canvasState.time * 0.02 + s.flicker * 5));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${opacity})`;
        ctx.fill();
    });
}

function drawLaunch(ctx, canvas) {
    const W = canvas.width, H = canvas.height;
    const t = canvasState.time;

    const altPct = Math.min(state.telemetry.altitude / 120, 1);
    const skyColor = `rgb(${Math.floor(10 + altPct * 2)}, ${Math.floor(22 - altPct * 14)}, ${Math.floor(40 - altPct * 24)})`;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#080c10');
    grad.addColorStop(1, skyColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    drawStars(ctx, canvas);

    const horizonY = H + altPct * H * 1.2;
    ctx.beginPath();
    ctx.ellipse(W/2, horizonY, W * 0.9, 100, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#0d2137';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(W/2, horizonY - 10, W * 0.92, 85, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,170,255,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    const rocketY = H * 0.85 - altPct * H * 0.72 + Math.sin(t * 0.05) * 3;
    const rocketX = W / 2 + Math.sin(t * 0.02) * 8;

    if (altPct < 0.8) {
        for (let i = 0; i < 5; i++) {
            const smokeY = rocketY + 50 + i * 25;
            if (smokeY > H) continue;
            const smokeOpacity = Math.max(0, (0.5 - i * 0.08)) * Math.abs(Math.sin(t * 0.08 + i));
            const smokeR = 6 + i * 8 + Math.sin(t * 0.06 + i) * 4;
            ctx.beginPath();
            ctx.arc(rocketX + Math.sin(t * 0.04 + i * 1.2) * 8, smokeY, smokeR, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(74,85,104,${smokeOpacity})`;
            ctx.fill();
        }
    }

    const thrustPct = state.telemetry.thrust / 100;
    const flameH = (15 + Math.sin(t * 0.4) * 8) * thrustPct;

    const flameGrad = ctx.createLinearGradient(rocketX, rocketY + 30, rocketX, rocketY + 30 + flameH * 2.5);
    flameGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
    flameGrad.addColorStop(0.2, 'rgba(255,230,0,0.9)');
    flameGrad.addColorStop(0.6, 'rgba(255,107,53,0.7)');
    flameGrad.addColorStop(1, 'rgba(255,50,0,0)');
    ctx.beginPath();
    ctx.ellipse(rocketX, rocketY + 30 + flameH, 7 * thrustPct, flameH, 0, 0, Math.PI * 2);
    ctx.fillStyle = flameGrad;
    ctx.fill();

    if (state.currentEvent && state.currentEvent.id === 'fuel_leak') {
        const leakAngle = Math.sin(t + 0.2) * 0.3;
        ctx.beginPath();
        ctx.ellipse(rocketX - 10, rocketY + 10, 4, 12 + Math.sin(t * 0.5) * 4, leakAngle, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,100,0,0.7)';
        ctx.fill();
    }

    if (state.currentEvent && state.currentEvent.id === 'engine_overheat') {
        const glowOpacity = 0.2 + 0.2 * Math.sin(t * 0.3);
        const glowGrad = ctx.createRadialGradient(rocketX, rocketY + 25, 2, rocketX, rocketY + 25, 30);
        glowGrad.addColorStop(0, `rgba(255,50,0,${glowOpacity * 2})`);
        glowGrad.addColorStop(1, 'rgba(255,50,0,0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(rocketX - 30, rocketY, 60, 60);
    }

    if (state.currentEvent && state.currentEvent.id === 'crew_discovery') {
        const objX = W * 0.2 + Math.sin(t * 0.03) * 30;
        const objY = H * 0.3 + Math.cos(t * 0.02) * 20;
        const pulseR = 15 + Math.sin(t * 0.2) * 8;
        ctx.beginPath();
        ctx.arc(objX, objY, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,255,150,${0.4 + Math.sin(t * 0.15) * 0.3})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(objX, objY, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,255,150,0.8)';
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(rocketX, rocketY);
        ctx.lineTo(objX, objY);
        ctx.strokeStyle = `rgba(0,255,150,${0.1 + Math.sin(t * 0.1) * 0.08})`;
        ctx.lineWidth = 0.5;
        ctx.setLineDash([4, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    if (state.currentEvent && state.currentEvent.id === 'solar_wind') {
        for ( let i = 0; i < 8; i++) {
            const px = (t * 4 + i * 100) % W;
            const py = H * 0.1 + i * (H * 0.1);
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px - 30, py + 5);
            ctx.strokeStyle = `rgba(255,180,50,${0.2 + Math.sin(t * 0.08 + i) * 0.15})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }

    drawRocket(ctx, rocketX, rocketY, 0, state.telemetry.integrity);
}

function drawOrbit(ctx, canvas) {
    const W = canvas.width, H = canvas.height;
    const t = canvasState.time;

    const grad = ctx.createRadialGradient(W/2, H/2, 10, W/2, H/2, W/2);
    grad.addColorStop(0, '#0a1628');
    grad.addColorStop(1, '#080c10');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    drawStars(ctx, canvas);

    const earthX = W/2, earthY = H/2;
    const earthR = Math.min(W, H) * 0.22;

    ctx.beginPath();
    ctx.arc(earthX, earthY, earthR, 0, Math.PI * 2);
    ctx.fillStyle = '#1a4a7a';
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(earthX, earthY, earthR, 0, Math.PI * 2);
    ctx.clip();
    ctx.beginPath();
    ctx.ellipse(earthX - earthR*0.15, earthY - earthR*0.1, earthR*0.3, earthR*0.2, 0.3, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(45,106,45,0.8)';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(earthX + earthR*0.2, earthY + earthR*0.1, earthR*0.2, earthR*0.15, -0.2, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(45,106,45,0.7)';
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(earthX, earthY, earthR + 5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,170,255,0.3)';
    ctx.lineWidth = 4;
    ctx.stroke();

    const orbitR = earthR + 40 + (state.telemetry.altitude - 350) * 0.08;
    ctx.beginPath();
    ctx.ellipse(earthX, earthY, orbitR, orbitR * 0.85, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,212,255,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    const velocityRatio = state.telemetry.velocity / 7700;
    const orbitSpeed = 0.008 * velocityRatio;
    canvasState.orbitAngle = (canvasState.orbitAngle || 0) + orbitSpeed;

    const rx = earthX + Math.cos(canvasState.orbitAngle) * orbitR;
    const ry = earthY + Math.sin(canvasState.orbitAngle) * orbitR * 0.85;

    if ( state.currentEvent && state.currentEvent.id === 'debris_field') {
        for (let i = 0; i < 8; i++) {
            const debrisAngle = canvasState.orbitAngle + 0.3 + i * 0.15;
            const dx = earthX + Math.cos(debrisAngle) * orbitR;
            const dy = earthY + Math.sin(debrisAngle) * orbitR * 0.85;
            ctx.beginPath();
            ctx.arc(dx + Math.sin(t * 0.05 + i) * 5, dy, 2 + i % 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200,180,160,${0.4 + Math.sin(t * 0.1 + i) * 0.3})`;
            ctx.fill();
        }
    }

    if (state.currentEvent && state.currentEvent.id === 'solar_flare') {
        const flareOpacity = 0.08 + 0.08 * Math.sin(t * 0.15);
        const flareGrad = ctx.createRadialGradient(0, H/2, 0, 0, H/2, W * 0.6);
        flareGrad.addColorStop(0, `rgba(255,200,50,${flareOpacity * 3})`);
        flareGrad.addColorStop(1, 'rgba(255,200,50,0)');
        ctx.fillStyle = flareGrad;
        ctx.fillRect(0, 0, W, H);
    }

    if (state.currentEvent && state.currentEvent.id === 'micrometeorite') {
        const mX = rx + Math.cos(t * 0.08) * 80;
        const mY = ry + Math.sin(t * 0.06) * 60;
        ctx.beginPath();
        ctx.arc(mX, mY, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200,180,160,0.8)';
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(mX, mY);
        ctx.lineTo(mX + 15, mY - 8);
        ctx.strokeStyle = 'rgba(200,180,160,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    if (state.currentEvent && state.currentEvent.id === 'alien_signal') {
        const waveOpacity = 0.1 + 0.1 * Math.sin(t * 0.3);
        for (let r = 20; r < 150; r += 30) {
            ctx.beginPath();
            ctx.arc(rx, ry, r + Math.sin(t * 0.1) * 10, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0,255,150,${waveOpacity})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    if (state.currentEvent && state.currentEvent.id === 'solar_wind') {
        for (let i = 0; i < 12; i++) {
            const px = (t * 3 + i * 80) % W;
            const py = H * 0.2 + i * (H * 0.06);
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px - 20, py);
            ctx.strokeStyle = `rgba(255,200,50,${0.3 + Math.sin(t * 0.1 + i) * 0.2})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }

    if (state.currentEvent && state.currentEvent.id === 'space_junk') {
        const junkX = W * 0.7 + Math.sin(t * 0.02) * 20;
        const junkY = H * 0.3 + Math.cos(t * 0.015) * 15;
        ctx.save();
        ctx.translate(junkX, junkY);
        ctx.rotate(t * 0.01);
        ctx.fillStyle = 'rgba(150,150,150,0.8)';
        ctx.fillRect(-12, -4, 24, 8);
        ctx.fillStyle = 'rgba(100,200,255,0.6)';
        ctx.fillRect(-20, -2, 8, 4);
        ctx.fillRect(12, -2, 8, 4);
        ctx.restore();
    }

    drawRocket(ctx, rx, ry, canvasState.orbitAngle + Math.PI/2, state.telemetry.integrity);
}

function drawCrisis(ctx, canvas) {
    const W = canvas.width, H = canvas.height;
    const t = canvasState.time;

    ctx.fillStyle = '#080c10';
    ctx.fillRect(0, 0, W, H);

    const redOpacity = 0.03 + 0.05 * Math.sin(t * 0.06);
    ctx.fillStyle = `rgba(255,0,0,${redOpacity})`;
    ctx.fillRect(0, 0, W, H);

    drawStars(ctx, canvas, true);

    const shakeX = Math.sin(t * 0.8) * 6;
    const shakeY = Math.cos(t * 0.7) * 4;
    const rocketX = W/2 + shakeX;
    const rocketY = H/2 + shakeY;

    for (let i = 0; i < 4; i++) {
        const sparkOpacity = Math.abs(Math.sin(t * 0.4 + i * 1.5));
        const sparkX = rocketX + Math.sin(t * 0.3 + i * 1.2) * 20;
        const sparkY = rocketY + Math.cos(t * 0.25 + i * 0.8) * 15;
        ctx.beginPath();
        ctx.moveTo(rocketX, rocketY);
        ctx.lineTo(sparkX, sparkY);
        ctx.strokeStyle = `rgba(255,215,0,${sparkOpacity})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    drawRocket(ctx, rocketX, rocketY, 0, Math.min(state.telemetry.integrity, 40));

    const engineOpacity = Math.abs(Math.sin(t * 0.5)) * 0.8;
    ctx.beginPath();
    ctx.ellipse(rocketX, rocketY + 35, 5, 8 * engineOpacity, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,50,50,${engineOpacity})`;
    ctx.fill();

    const warnOpacity = Math.abs(Math.sin(t * 0.08));
    ctx.font = '11px monospace';
    ctx.fillStyle = `rgba(255,50,50,${warnOpacity})`;
    ctx.fillText('⚠ CRITICAL SYSTEMS', 30, 60);
    ctx.fillStyle = `rgba(255,50,50,${warnOpacity * 0.7})`;
    ctx.fillText('HULL BREACH DETECTED', W - 160, H -40);
}

function drawLanding(ctx, canvas) {
    const W = canvas.width, H = canvas.height;
    const t = canvasState.time;

    const altPct = Math.min(state.telemetry.altitude / 120, 1);

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#080c10');
    grad.addColorStop(0.6, '#0d1117');
    grad.addColorStop(1, `rgba(26,26,10,${0.5 + altPct * 0.5})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    drawStars(ctx, canvas);

    const groundY = H * 0.82;
    ctx.fillStyle = '#1a1a0a';
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = '#2d4a1a';
    ctx.fillRect(0, groundY, W, 3);

    ctx.fillStyle = 'rgba(0,212,255,0.5)';
    ctx.fillRect(W/2 - 50, groundY, 100, 3);

    const lightOpacity = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.1));
    [-48, 0, 48].forEach(offset => {
        ctx.beginPath();
        ctx.arc(W/2 + offset, groundY, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,212,255,${lightOpacity})`;
        ctx.fill();
    });

    const rocketY = groundY - 40 - altPct * (groundY * 0.7) + Math.sin(t * 0.04) * 2;
    const rocketX = W / 2;

    if ( altPct > 0.3) {
        const heatOpacity = (altPct - 0.3) * 0.2;
        const heatGrad = ctx.createRadialGradient(rocketX, rocketY, 5, rocketX, rocketY, 60);
        heatGrad.addColorStop(0, `rgba(255,107,53,${heatOpacity * 3})`);
        heatGrad.addColorStop(1, 'rgba(255,107,53,0)');
        ctx.fillStyle = heatGrad;
        ctx.fillRect(rocketX - 60, rocketY - 60, 120, 120);
    }

    if (altPct < 0.6) {
        const thrustPct = state.telemetry.thrust / 100;
        const flameH = (10 + Math.sin(t * 0.3) * 5) * thrustPct * (1 -altPct + 0.2);
        const flameGrad = ctx.createLinearGradient(rocketX, rocketY - 30, rocketX, rocketY - 30 - flameH * 2);
        flameGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
        flameGrad.addColorStop(0.4, 'rgba(255,200,0,0.7)');
        flameGrad.addColorStop(1, 'rgba(255,107,53,0)');
        ctx.beginPath();
        ctx.ellipse(rocketX, rocketY - 30 - flameH, 5, flameH, 0, 0, Math.PI * 2);
        ctx.fillStyle = flameGrad;
        ctx.fill();
    }

    if (altPct < 0.3) {
        const legAngle = (0.3 - altPct) / 0.3;
        ctx.strokeStyle = '#c9d1d9';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(rocketX - 8, rocketY + 10);
        ctx.lineTo(rocketX - 8 - legAngle * 12, rocketY + 10 + legAngle * 20);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(rocketX + 8, rocketY + 10);
        ctx.lineTo(rocketX + 8 + legAngle * 12, rocketY + 10 + legAngle * 20);
        ctx.stroke();
    }

    if (state.currentEvent && state.currentEvent.id === 'chute_fail') {
        ctx.beginPath();
        ctx.arc(rocketX, rocketY - 60, 25, Math.PI, 0);
        ctx.strokeStyle = 'rgba(255,50,50,0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(rocketX - 25, rocketY - 60);
        ctx.lineTo(rocketX - 8, rocketY - 30);
        ctx.moveTo(rocketX + 25, rocketY - 60);
        ctx.lineTo(rocketX + 8, rocketY - 30);
        ctx.strokeStyle = 'rgba(255,50,50,0.4)';
        ctx.stroke();
    }

    drawRocket(ctx, rocketX, rocketY, Math.PI, state.telemetry.integrity);
}

function drawRocket(ctx, x, y, angle, integrity) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const intPct = integrity / 100;
    const bodycolor = intPct < 0.3 ? '#8a8a8a' : '#c9d1d9';
    const accentColor = intPct < 0.3 ? '#ff3333' : '#00d4ff';

    ctx.beginPath();
    ctx.roundRect(-8, -25, 16, 50, 2);
    ctx.fillStyle = bodycolor;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, -42);
    ctx.lineTo(-8, -25);
    ctx.lineTo(8, -25);
    ctx.closePath();
    ctx.fillStyle = accentColor;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-8, 10);
    ctx.lineTo(-20, 28);
    ctx.lineTo(-8, 22);
    ctx.closePath();
    ctx.fillStyle = '#ff6b35';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, 10);
    ctx.lineTo(20, 28);
    ctx.lineTo(8, 22);
    ctx.closePath();
    ctx.fillStyle = '#ff6b35';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, -10, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#080c10';
    ctx.fill();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (intPct < 0.4) {
        ctx.beginPath();
        ctx.moveTo(-3, -13);
        ctx.lineTo(3, -7);
        ctx.strokeStyle = '#ff3333';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.roundRect(-5, 25, 10, 6, 1);
    ctx.fillStyle = '#4a5568';
    ctx.fill();

    ctx.restore();
}

function startPhase(index) {
    if (index >= state.phases.length) {
        endGame(true);
        return;
    }

    state.phase = index;
    const phaseName = state.phases[index];
    soundPhaseTransition();
    const target = TELEMETRY_TARGETS[index];

    const phaseIcons = { LAUNCH: '🚀', ORBIT: '🛸', CRISIS: '⚠️', LANDING: '🛬' };
    $('hud-phase').textContent = phaseName;
    $('phase-text').textContent = phaseName;

    initCanvas();
    startCanvasLoop();

    $('narrative-text').textContent = NARRATIVES[index];

    if (phaseName === 'LANDING') {
        state.telemetry = { ...state.telemetry, ...target, altitude: 120 };
    } else {
        state.telemetry = { ...state.telemetry, ...target };
    }
    updateTelemetryUI();

    const phaseEvents = EVENTS[phaseName] || [];
    state.eventQueue = [...phaseEvents];

    log(`── PHASE: ${phaseName} ──`, 'success');
    setStatus('NOMINAL', 'status-nominal');

    scheduleNextEvent();
}

function getRareEvent() {
    const rare = [
        {
            id: 'alien_signal',
            icon: '👽',
            title: 'UNKNOWN SIGNAL DETECTED',
            desc: 'An unidentified transmission is interfering with navigation. Origin unknown.',
            choices: [
                { text: 'Respond to signal', cost: 'POWER -10', telemetry: { integrity: 10 }, apply: (r) => { r.power -= 10; } },
                { text: 'Ignore and continue', cost: 'NONE', apply: (r) => {} },
                { text: 'Boost comms to trace origin', cost: 'POWER -20 | Oxygen -5', apply: (r) => { r.power -= 20; r.oxygen -= 5; } },
            ],
        },
        {
            id: 'solar_wind',
            icon: '🌬️',
            title: 'UNEXPECTED SOLAR WIND',
            desc: 'A burst of solar wind is pushing the craft off trajectory. Free velocity boost possible.',
            choices: [
                { text: 'Ride the wave - free boost', cost: 'INTEGRITY -10', telemetry: { velocity: 400, integrity: -10 }, apply: (r) => {} },
                { text: 'Correct trajectory - safe', cost: 'FUEL -10', apply: (r) => { r.fuel -= 10; } },
                { text: 'Shield and wait', cost: 'POWER -15', apply: (r) => { r.power -= 15; } },
            ],
        },
        {
            id: 'space_junk',
            icon: '🗑️',
            title: 'ABANDONED SATELLITE NEARBY',
            desc: 'An old satellite is drifting close. Could be salvaged for power cells.',
            choices: [
                { text: 'EVA salvage - risky', cost: 'OXYGEN -15', apply: (r) => { r.oxygen -= 15; r.power += 25; } },
                { text: 'Avoid - play it safe', cost: 'FUEL -5', apply: (r) => { r.fuel -= 5; } },
                { text: 'Destroy it - clear path', cost: 'FUEL -10', telemetry: { integrity: -5 }, apply: (r) => { r.fuel -= 10; } },
            ],
        },
        {
            id: 'crew_discovery',
            icon: '🔭',
            title: 'ANOMALY DETECTED',
            desc: 'Crew reports a strange object on sensors. Could be dangerous or valuable.',
            choices: [
                { text: 'Investigate - burn fuel', cost: 'FUEL -15', apply: (r) => { r.fuel -= 15; r.oxygen += 10; } },
                { text: 'Log and continue', cost: 'NONE', apply: (r) => {} },
                { text: 'Full scan - power heavy', cost: 'POWER -20', apply: (r) => { r.power -= 20; r.fuel += 10; } },
            ],
        },
    ];

    return rare[Math.floor(Math.random() * rare.length)];
}

function scheduleNextEvent() {
    if (state.eventQueue.length === 0) {
        if (state.phases[state.phase] === 'LANDING') {
            state.landingTimelapse = true;
            const waitLanding = setInterval(() => {
                if (!state.alive) { clearInterval(waitLanding); return; }
                if (state.telemetry.altitude <= 2) {
                    clearInterval(waitLanding);
                    state.landingTimelapse = false;
                    setTimeout(() => endGame(true), 1500);
                }
            }, 500);
        } else {
            setTimeout(() => {
                if (state.alive) startPhase(state.phase + 1);
            }, 6000);
        }
        return;
    }

    const delay = 4000 + Math.random() * 3000;
    setTimeout(() => {
        if (!state.alive || state.currentEvent) return;
        const conditional = checkConditionalEvents();
        if (conditional) {
            triggerEvent(conditional);
            return;
        }

        if (Math.random() < 0.15) {
            const rare = getRareEvent();
            if (rare) {
                triggerEvent(rare);
                return;
            }
        }

        const event = state.eventQueue.shift();
        triggerEvent(event);
    }, delay);
}

function checkConditionalEvents() {
    const r = state.resources;
    const t = state.telemetry;
    const phase = state.phases[state.phase];

    if (r.fuel <= 25 && phase === 'LANDING' && !state.conditionalsFired.includes('critical_fuel_landing')) {
        state.conditionalsFired.push('critical_fuel_landing');
        return {
            id: 'critical_fuel_landing',
            icon: '⛽',
            title: 'CRITICAL FUEL - LANDING APPROACH',
            desc: 'Fuel critically low during descent. Retro-burn impossible at this rate.',
            choices: [
                { text: 'Emergency glide - cut all engines', cost: 'FUEL -5', telemetry: { velocity: -200, altitude: -30 }, apply: (r) => { r.fuel -= 5; } },
                { text: 'Request emergency runway', cost: 'POWER -20', apply: (r) => { r.power -= 20; } },
                { text: 'Crash landing protocol', cost: 'INTEGRITY -30', telemetry: { integrity: -30, velocity: -500 }, apply: (r) => { r.oxygen -= 15; } },
            ],
        };
    }

    if (r.oxygen <= 20 && phase === 'CRISIS' && !state.conditionalsFired.includes('oxygen_critical')) {
        state.conditionalsFired.push('oxygen_critical');
        return {
            id: 'oxygen_critical',
            icon: '😮‍💨',
            title: 'OXYGEN CRITICALLY LOW',
            desc: 'Crew showing signs of hypoxia. Immediate action required.',
            choices: [
                { text: 'Emergency O2 from suit reserves', cost: 'OXYGEN -10', apply: (r) => { r.oxygen -= 10; } },
                { text: 'Reduce crew activity - conserve', cost: 'POWER -15', apply: (r) => { r.power -= 15; } },
                { text: 'Accelerate reentry - risk overheating', cost: 'FUEL -20', telemetry: { temp: 300, velocity: 400 }, apply: (r) => { r.fuel -= 20; } },
            ],
        };
    }

    if (t.integrity <= 30 && phase === 'ORBIT' && !state.conditionalsFired.includes('hull_critical')) {
        state.conditionalsFired.push('hull_critical');
        return {
            id: 'hull_critical',
            icon: '🚨',
            title: 'HULL INTEGRITY CRITICAL',
            desc: 'Structural integrity below safe threshold. Craft at risk of breakup.',
            choices: [
                { text: 'Emergency structural bracing', cost: 'POWER -25', telemetry: { integrity: 15 }, apply: (r) => { r.power -= 25; } },
                { text: 'Reduce velocity - less stress', cost: 'FUEL -15', telemetry: { velocity: -400, integrity: 10 }, apply: (r) => { r.fuel -= 15; } },
                { text: 'Abort mission - emergency return', cost: 'FUEL -30', telemetry: { integrity: 5 }, apply: (r) => { r.fuel -= 30; } },
            ],
        };
    }

    if (state.flags.fuelLeakIgnored && phase === 'CRISIS' && !state.conditionalsFired.includes('fuel_explosion')) {
        state.conditionalsFired.push('fuel_explosion');
        return {
            id: 'fuel_explosion',
            icon: '💥',
            title: 'TANK B EXPLOSION',
            desc: 'The ignored fuel leak reached the ignition threshold. Tank B is compromised.',
            choices: [
                { text: 'Emergency dump - lose all tank B fuel', cost: 'FUEL -35', telemetry: { integrity: -10 }, apply: (r) => { r.fuel -= 35; } },
                { text: 'Contain explosion - power surge', cost: 'POWER -25 | INTEGRITY -15', telemetry: { integrity: -15 }, apply: (r) => { r.power -= 25; } },
                { text: 'Pray and hold - extreme risk', cost: 'ALL -20', telemetry: { integrity: -25 }, apply: (r) => { r.fuel -= 20; r.power -= 20; r.oxygen -= 20; } },
            ],
        };
    }

    if (state.flags.engineDamaged && phase === 'LANDING' && !state.conditionalsFired.includes('engine_fail_landing')) {
        state.conditionalsFired.push('engine_fail_landing');
        return {
            id: 'engine_fail_landing',
            icon: '🔥',
            title: 'ENGINE FAILURE - FINAL APPROACH',
            desc: 'The damaged engine from earlier has given out. Descent uncontrolled.',
            choices: [
                { text: 'Switch to backup thrusters', cost: 'FUEL -20', telemetry: { velocity: -200 }, apply: (r) => { r.fuel -= 20; } },
                { text: 'Emergency glide protocol', cost: 'POWER -15 | INTEGRITY -10', telemetry: { integrity: -10 }, apply: (r) => { r.power -= 15; } },
                { text: 'Hard landing - brace crew', cost: 'OXYGEN -20 | INTEGRITY -20', telemetry: { integrity: -20}, apply: (r) => { r.oxygen -= 20; } },
            ],
        };
    }

    if (state.flags.powerAbused && phase === 'LANDING' && !state.conditionalsFired.includes('blackout_landing')) {
        state.conditionalsFired.push('blackout_landing');
        return {
            id: 'blackout_landing',
            icon: '⚡',
            title: 'NAVIGATION BLACKOUT',
            desc: 'Repeated power surges have fried the navigation system. Flying blind.',
            choices: [
                { text: 'Manual visual landing', cost: 'FUEL -15', apply: (r) => { r.fuel -= 15; } },
                { text: 'Emergency reboot -takes time', cost: 'POWER -20', apply: (r) => { r.power -= 20; } },
                { text: 'Ground control guidance', cost: 'OXYGEN -10 | POWER -10', apply: (r) => { r.power -= 10; r.oxygen -= 10; } },
            ],
        };
    }

    return null;
}

function startTimer() {
    state.timerInterval = setInterval(() => {
        if (!state.alive) return;
        soundRadarPing();
        state.missionTime++;
        $('hud-time').textContent = 'T+' + formatTime(state.missionTime);

        if (state.missionTime % 15 === 0) {
            state.resources.oxygen = Math.max(0, state.resources.oxygen - 1);
            state.resources.power = Math.max(0, state.resources.power -1);
            updateResourceUI();
            if (checkDeath()) return;
        }

        const target = TELEMETRY_TARGETS[state.phase];
        const t = state.telemetry;
        const speed = state.landingTimelapse ? 0.15 : 0.02;

        if (target) {
            t.altitude += (target.altitude - t.altitude) * speed;
            t.velocity += (target.velocity - t.velocity) * speed;
            t.temp += (target.temp - t.temp) * speed;
        }

        updateTelemetryUI();
    }, 1000);
}

function applyPlayStyle() {
    const p = state.playstyle;
    if (p === 'aggressive') {
        state.resources.fuel += 20;
        state.resources.power -= 10;
        state.telemetry.velocity += 500;
    } else if (p === 'safe') {
        state.resources.oxygen += 20;
        state.resources.fuel -= 10;
    } else if (p === 'engineer') {
        state.resources.power += 20;
        state.telemetry.integrity += 20;
    }
    Object.keys(state.resources).forEach(k => {
        state.resources[k] = Math.max(0, Math.min(120, state.resources[k]));
    });
    state.telemetry.integrity = Math.min(120, state.telemetry.integrity);
}

function initGame() {
    console.log('Mission Control loaded OK');
    state.conditionalsFired = [];
    state.score = 0;
    state.decisions = 0;
    state.phase = 0;
    state.resources = { fuel: 100, power: 100, oxygen: 100 };
    state.telemetry = { altitude: 0, velocity: 0, temp: 22, signal: 'STRONG', thrust: 100, integrity: 100};
    applyPlayStyle();
    state.missionTime = 0;
    state.alive = true;
    state.currentEvent = null;
    state.eventQueue = [];
    state.landingTimelapse = false;
    $('log-list').innerHTML = '';
    $('event-box').classList.add('hidden');
    stopResourceAlarm();

    updateResourceUI();
    showScreen('screen-game');
    if (animFrame) cancelAnimationFrame(animFrame);
    startTimer();
    startPhase(0);

    state.flags = {
        fuelLeakIgnored: false,
        engineDamaged: false,
        hullWeakened: false,
        powerAbused: false,
        oxygenCritical: false,
    };

    state.streak = 0;

    if (!state.tutorialDone) {
        startTutorialUI();
    }
}

const tutorialSteps = [
    {
        text: "These are your resources. If any hits zero, you lose.",
        highlight: '.panel-telemetry'
    },
    {
        text: "Events will appear here. You must choose quickly.",
        highlight: '#event-box'
    },
    {
        text: "Each choice has consequences. Some come later.",
        highlight: '#choices',
    },
    {
        text: "Good luck, Commander.",
        highlight: null
    }
];

let tutorialStep = 0;

function startTutorialUI() {
    tutorialStep = 0;
    $('tutorial-overlay').classList.remove('hidden');
    showTutorialStep();
}

function showTutorialStep() {
    const step = tutorialSteps[tutorialStep];
    $('tutorial-text').textContent = step.text;

    document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
    });

    if (step.highlight) {
        const el = document.querySelector(step.highlight);
        if (el) el.classList.add('tutorial-highlight');
    }
}

$('tutorial-next').addEventListener('click', () => {
    tutorialStep++;

    if(tutorialStep >= tutorialSteps.length) {
        $('tutorial-overlay').classList.add('hidden');
        state.tutorialDone = true;
        return;
    }

    showTutorialStep();
});

const TUTORIAL_EVENT_1 = {
    id: 'tutorial_1',
    icon: '📘',
    title: 'MISSION BRIEFING',
    desc: 'Resources decrease over time. Every decision matters. Choose wisely.',
    choices: [
        {
            text: 'Continue',
            cost: '',
            apply: () => {
                triggerEvent(TUTORIAL_EVENT_2);
            }
        }
    ]
};

const TUTORIAL_EVENT_2 = {
    id: 'tutorial_2',
    icon: '⚠️',
    title: 'DECISION MAKING',
    desc: 'Each choice consumes resources or affects your ship. Some decisions have future consequences.',
    choices: [
        {
            text: 'Got it',
            cost: '',
            apply: () => {
                triggerEvent(TUTORIAL_EVENT_3);
            }
        }
    ]
};

const TUTORIAL_EVENT_3 = {
    id: 'tutorial_3',
    icon: '⏳',
    title: 'TIME PRESSURE',
    desc: 'You have limited time to respond. If you do nothing, the worst option will be chosen.',
    choices: [
        {
            text: 'Start Mission',
            cost: '',
            apply: () => {
                state.tutorialDone = true;
                $('event-box').classList.add('hidden');
                scheduleNextEvent();
            }
        }
    ]
};

window.addEventListener('DOMContentLoaded', () => {
    showScreen('screen-boot');
    runBoot();

    $('btn-start').addEventListener('click', () => {
        getCtx();
        showScreen('screen-playstyle');
    });

    document.querySelectorAll('.playstyle-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.playstyle-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            state.playstyle = card.dataset.style;
            setTimeout(() => initGame(), 600);
        })
    })
    $('btn-restart').addEventListener('click', () => {
        clearInterval(state.timerInterval);
        initGame();
    });
});