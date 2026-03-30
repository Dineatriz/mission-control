Aqui tens a versão do README.md em inglês, adaptada ao teu estilo técnico e direto, perfeita para o teu repositório no GitHub:

🚀 Mission Control Simulator
A hardcore space mission management simulator focused on systemic realism and reactive feedback. Built entirely with native web technologies (Vanilla JS, HTML5 Canvas, and Web Audio API).

No libraries. No frameworks. No external assets.

🕹️ The Simulator
The player takes control of a mission divided into 4 high-stakes phases: Launch, Orbit, Crisis, and Landing. The goal is to manage limited resources (Fuel, Power, and Oxygen) while responding to random emergency events that require fast decision-making under pressure.

Technical Highlights
Reactive Canvas Animation: Rocket altitude, smoke trails, flame size, and lateral drift all react in real-time to current thrust and gravity values.

Procedural Audio: All sound design (boot sequences, low-resource alarms, victory fanfares, and crash sounds) is generated via code using the Web Audio API.

Dynamic Telemetry System: Real-time monitoring of G-Force, Orbital Path data, velocity, and ETA for phase completion.

Consequence Engine: Choice outcomes set internal flags that influence future events (e.g., ignoring a minor leak early on can trigger a catastrophic failure later).

Reactive Cockpit Feedback: The UI reacts to the ship's state with shake effects when integrity is low and dynamic color shifts (Yellow/Red) as resources become critical.

📊 Gameplay Mechanics
Commander Profiles: Choose between Aggressive Pilot, Safe Commander, or Chief Engineer, each with specific resource bonuses and score multipliers.

Conditional Events: The system reads the current ship state to trigger context-specific events (e.g., low oxygen during the crisis phase triggers a Hypoxia event).

Scoring & Rating: Performance-based rewards based on preserved resources and "decision streaks" (multipliers for consecutive good choices).

🛠️ Tech Stack
Logic: JavaScript (ES6+)

Rendering: HTML5 Canvas (Central Simulation) and SVG (Interface)

Audio: Web Audio API (Real-time sound synthesis)

Styling: CSS3 with dynamic variables and keyframe animations

🚀 How to Run
Clone the repository.

Open index.html in any modern web browser.

No dependencies or local servers required.
