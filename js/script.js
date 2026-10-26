// Boop Garden - a musical toy for toddlers
// All sounds are made with the Web Audio API (no sound files).

// ---------- Notes ----------
// C major pentatonic scale: C D E G A C D E.
// These notes always sound nice together, so there are no "wrong" notes.
const notes = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];

// Keys A to K play the shapes in order
const keys = ["a", "s", "d", "f", "g", "h", "j", "k"];

// ---------- Find things on the page ----------
const pads = document.querySelectorAll(".pad");
const worldButtons = document.querySelectorAll(".world");
const startScreen = document.getElementById("start");
const startButton = document.getElementById("startButton");
const grownupButton = document.getElementById("grownup");
const settings = document.getElementById("settings");
const volumeSlider = document.getElementById("volume");
const calmBox = document.getElementById("calm");

let audio;            // the AudioContext, made when the child taps start
let volume;           // master volume (a GainNode)
let world = "bell";   // which sound world is chosen
let started = false;
let pointerIsDown = false;

// ---------- Sound ----------

// Browsers only allow sound after a tap, so this runs from the start button
function startAudio() {
  audio = new AudioContext();

  // The compressor stops lots of notes at once from getting too loud
  const limiter = audio.createDynamicsCompressor();
  limiter.threshold.value = -18;
  limiter.ratio.value = 12;

  volume = audio.createGain();
  setVolume();

  volume.connect(limiter);
  limiter.connect(audio.destination);
}

// The slider goes 0-1, but we multiply by 0.6 so it can never get too loud
function setVolume() {
  if (volume) {
    volume.gain.value = volumeSlider.value * 0.6;
  }
}

// Play one note. Each sound world uses a different wave and envelope.
function playNote(index) {
  const freq = notes[index];
  const now = audio.currentTime;

  const osc = audio.createOscillator();  // makes the tone
  const env = audio.createGain();         // shapes the loudness over time

  let length;

  if (world === "bell") {
    // Smooth sine wave that rings out slowly, like a xylophone
    osc.type = "sine";
    osc.frequency.value = freq;
    length = 1.5;
  } else if (world === "bubble") {
    // Sine wave that slides up in pitch - a "bloop"
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * 0.66, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.12);
    length = 0.4;
  } else {
    // Triangle wave sounds a bit like a soft horn
    osc.type = "triangle";
    osc.frequency.value = freq;
    length = 0.6;
  }

  // Envelope: start silent, rise fast (attack), then fade out (decay).
  // Starting and ending at almost zero stops clicking sounds.
  env.gain.setValueAtTime(0.001, now);
  env.gain.exponentialRampToValueAtTime(0.5, now + 0.01);
  env.gain.exponentialRampToValueAtTime(0.001, now + length);

  osc.connect(env);
  env.connect(volume);
  osc.start(now);
  osc.stop(now + length);
}

// ---------- What happens when a shape is played ----------

function play(pad) {
  if (!started) return;
  playNote(Number(pad.dataset.note));

  // Adding the class starts the bounce and opens the face's mouth (see CSS).
  // Removing it first lets the animation restart on quick repeat taps.
  pad.classList.remove("playing");
  void pad.offsetWidth; // forces the browser to notice the class was removed
  pad.classList.add("playing");

  // After 0.4 seconds the face goes back to smiling
  clearTimeout(pad.timer);
  pad.timer = setTimeout(function () {
    pad.classList.remove("playing");
  }, 400);

  floatNote(pad);
}

// A little music note pops out of the shape and floats away
const symbols = ["♪", "♫", "★", "♥"];

function floatNote(pad) {
  const note = document.createElement("span");
  note.className = "float-note";
  note.setAttribute("aria-hidden", "true");   // decoration only
  note.textContent = symbols[Math.floor(Math.random() * symbols.length)];
  note.style.left = Math.random() * 60 + 10 + "%"; // somewhere above the shape
  pad.appendChild(note);

  // Remove it once its 1 second animation has finished
  setTimeout(function () {
    note.remove();
  }, 1000);
}

// ---------- Touch and mouse ----------

pads.forEach(function (pad) {
  // Play as soon as the finger touches - no waiting for a click
  pad.addEventListener("pointerdown", function (event) {
    pointerIsDown = true;
    // Touchscreens "hold on" to the first shape touched. Letting go of it
    // means sliding onto the next shape will play that one too.
    pad.releasePointerCapture(event.pointerId);
    play(pad);
  });

  // Sliding onto a shape while pressing plays it (like a xylophone run)
  pad.addEventListener("pointerenter", function () {
    if (pointerIsDown) play(pad);
  });

  // Keyboard users: Enter or Space on a focused shape plays it
  pad.addEventListener("keydown", function (event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      play(pad);
    }
  });
});

window.addEventListener("pointerup", function () {
  pointerIsDown = false;
});

// ---------- Keyboard ----------

window.addEventListener("keydown", function (event) {
  // Any key starts the toy from the start screen
  if (!started) {
    begin();
    return;
  }
  // Ignore: settings open, held-down keys, Tab (moving focus), shortcuts
  if (settings.open || event.repeat || event.key === "Tab" || event.ctrlKey || event.metaKey) return;
  // Enter/Space are handled by the shape itself (above)
  if (event.key === "Enter" || event.key === " ") return;

  let index = keys.indexOf(event.key.toLowerCase());
  if (index === -1) {
    // Any other key plays a random shape, so keyboard bashing is still music
    index = Math.floor(Math.random() * pads.length);
  }
  play(pads[index]);
});

// ---------- Sound worlds ----------

worldButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    world = button.dataset.world;

    // Show which button is chosen
    worldButtons.forEach(function (b) {
      b.setAttribute("aria-pressed", "false");
    });
    button.setAttribute("aria-pressed", "true");

    // Change the background colour to match
    document.body.className = "world-" + world;
    if (calmBox.checked) document.body.classList.add("calm");

    // Play a note so the child hears the new sound straight away
    play(pads[4]);
  });
});

// ---------- Start screen ----------

function begin() {
  started = true;
  startAudio();
  startScreen.classList.add("hidden");

  // A little welcome tune: C, E, A, high E
  setTimeout(function () { play(pads[0]); }, 0);
  setTimeout(function () { play(pads[2]); }, 200);
  setTimeout(function () { play(pads[4]); }, 400);
  setTimeout(function () { play(pads[7]); }, 600);
}

startButton.addEventListener("click", begin);

// ---------- Grown-up corner (press and hold for 1.5 seconds) ----------

let holdTimer;

function startHold() {
  grownupButton.classList.add("holding"); // CSS fills the ring
  holdTimer = setTimeout(function () {
    stopHold();
    settings.showModal();
  }, 1500);
}

function stopHold() {
  clearTimeout(holdTimer);
  grownupButton.classList.remove("holding");
}

grownupButton.addEventListener("pointerdown", startHold);
grownupButton.addEventListener("pointerup", stopHold);
grownupButton.addEventListener("pointerleave", stopHold);

// Keyboard: hold Enter or Space
grownupButton.addEventListener("keydown", function (event) {
  if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
    event.preventDefault();
    startHold();
  }
});
grownupButton.addEventListener("keyup", stopHold);

// ---------- Settings ----------

volumeSlider.addEventListener("input", setVolume);

calmBox.addEventListener("change", function () {
  document.body.classList.toggle("calm", calmBox.checked);
});
