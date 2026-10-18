// Find the theme button and page element that holds the active color theme.
const themeToggle = document.getElementById("themeToggle");
const body = document.body;

// Read the visitor's saved theme, or use the light theme for a familiar first visit.
function getStoredTheme() {
    try {
        const savedTheme = localStorage.getItem("typing-theme");
        if (savedTheme === "light" || savedTheme === "dark") {
            return savedTheme;
        }
    } catch (error) {
        console.warn("Theme preference could not be read:", error);
    }

    return "light";
}

// Remember the selected theme so it is used the next time the page opens.
function saveTheme(theme) {
    try {
        localStorage.setItem("typing-theme", theme);
    } catch (error) {
        console.warn("Theme preference could not be saved:", error);
    }
}

// Update the page colors and the theme button's accessible label.
function applyTheme(theme) {
    const isLightTheme = theme === "light";
    body.classList.toggle("light-theme", isLightTheme);

    if (themeToggle) {
        themeToggle.textContent = isLightTheme ? "🌙" : "☀️";
        themeToggle.setAttribute(
            "aria-label",
            isLightTheme ? "Switch to dark mode" : "Switch to light mode"
        );
        themeToggle.setAttribute("aria-pressed", String(isLightTheme));
    }
}

// Apply the saved theme as soon as this script loads.
applyTheme(getStoredTheme());

// Switch themes when the visitor clicks the sun or moon button.
if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        const nextTheme = body.classList.contains("light-theme") ? "dark" : "light";
        applyTheme(nextTheme);
        saveTheme(nextTheme);
    });
}

// Connect the HTML controls to the code that updates them.
const textDisplay = document.getElementById("textDisplay");
const startBtn = document.getElementById("startBtn");
const typingFeedback = document.getElementById("typingFeedback");
const resultBanner = document.getElementById("resultBanner");
const resultSummary = document.getElementById("resultSummary");
const wpmValue = document.getElementById("wpmValue");
const accuracyValue = document.getElementById("accuracyValue");
const timeValue = document.getElementById("timeValue");
const timeLabel = document.getElementById("timeLabel");

// This is the passage the visitor copies during the one-minute test.
const targetText =
    "A good typing habit begins with a relaxed posture and a steady pace. " +
    "Sit comfortably, keep your shoulders loose, and let your fingers rest " +
    "lightly on the keys. Read each word before you type it, and aim for " +
    "accuracy instead of rushing. When you make a mistake, correct it calmly " +
    "and continue from where you left off. A few minutes of focused practice " +
    "each day can build confidence and improve your speed over time. " +
    "Remember to take short breaks, keep your eyes on the passage, and enjoy " +
    "the progress you make with every practice session.";
// The test lasts 60 seconds; totalWords is used to show typing progress.
const TEST_DURATION = 60;
const totalWords = targetText.trim().split(/\s+/).length;

// These variables keep track of the current test and its timer.
let timeLeft = TEST_DURATION;
let timerId = null;
let testReady = false;
let testStarted = false;
let testFinished = false;
let startTime = null;
let typedText = "";

// Create one span per character so correct and incorrect letters can be styled.
function renderTargetText() {
    textDisplay.replaceChildren();

    for (const character of targetText) {
        const characterElement = document.createElement("span");
        characterElement.textContent = character;
        textDisplay.appendChild(characterElement);
    }
}

// Count matching and mismatching characters in the text typed so far.
function getTypingResult() {
    let correctCharacters = 0;

    for (let i = 0; i < typedText.length; i++) {
        if (typedText[i] === targetText[i]) {
            correctCharacters++;
        }
    }

    return {
        typedCharacters: typedText.length,
        correctCharacters,
        incorrectCharacters: typedText.length - correctCharacters,
    };
}

// Color each typed character and move the cursor to the next character.
function updateCharacterStyles() {
    const characters = textDisplay.querySelectorAll("span");
    const result = getTypingResult();

    for (let i = 0; i < characters.length; i++) {
        const character = characters[i];
        character.classList.remove("correct", "incorrect", "current");

        if (i < typedText.length) {
            character.classList.add(
                typedText[i] === targetText[i] ? "correct" : "incorrect"
            );
        }
    }

    if (!testFinished && typedText.length < characters.length) {
        characters[typedText.length].classList.add("current");
    }

    const wordsTyped = typedText.trim()
        ? typedText.trim().split(/\s+/).length
        : 0;
    typingFeedback.textContent =
        `${wordsTyped} / ${totalWords} words` +
        ` · ${result.incorrectCharacters} ${result.incorrectCharacters === 1 ? "error" : "errors"}`;
}

// Recalculate the countdown from the start time to avoid timer drift.
function updateTime() {
    const elapsedMilliseconds = Date.now() - startTime;
    timeLeft = Math.max(TEST_DURATION - Math.floor(elapsedMilliseconds / 1000), 0);
    timeValue.textContent = timeLeft;

    if (timeLeft === 0) {
        finishTest();
    }
}

// Calculate final words per minute and accuracy, then show the summary.
function updateFinalStats() {
    const result = getTypingResult();
    const elapsedMilliseconds = Math.max(Date.now() - startTime, 1000);
    const elapsedMinutes = elapsedMilliseconds / 60000;
    // A standard typing estimate counts each group of five correct characters as one word.
    const wpm = Math.round(result.correctCharacters / 5 / elapsedMinutes);
    const accuracy = result.typedCharacters > 0
        ? Math.round((result.correctCharacters / result.typedCharacters) * 1000) / 10
        : 0;
    const elapsedSeconds = Math.min(
        Math.ceil(elapsedMilliseconds / 1000),
        TEST_DURATION
    );

    wpmValue.textContent = wpm;
    accuracyValue.textContent = accuracy;
    timeLabel.textContent = "Time used";
    timeValue.textContent = elapsedSeconds;
    resultSummary.textContent =
        `You typed ${result.typedCharacters} characters with ` +
        `${result.incorrectCharacters} ${result.incorrectCharacters === 1 ? "error" : "errors"} ` +
        `in ${elapsedSeconds} seconds.`;
}

// Stop the test once, disable typing, and display the final results.
function finishTest() {
    if (testFinished) {
        return;
    }

    clearInterval(timerId);
    timerId = null;
    testReady = false;
    testFinished = true;
    textDisplay.contentEditable = "false";
    textDisplay.setAttribute("aria-disabled", "true");
    startBtn.textContent = "Try Again";
    resultBanner.hidden = false;

    updateFinalStats();
    updateCharacterStyles();
    typingFeedback.textContent = "Your final results are ready.";
}

// Reset the passage, timer, and results so a new test can begin.
function startTest() {
    clearInterval(timerId);

    timeLeft = TEST_DURATION;
    testReady = true;
    testStarted = false;
    testFinished = false;
    startTime = null;
    typedText = "";
    textDisplay.contentEditable = "true";
    textDisplay.setAttribute("aria-disabled", "false");
    wpmValue.textContent = "--";
    accuracyValue.textContent = "--";
    timeLabel.textContent = "Time left";
    timeValue.textContent = TEST_DURATION;
    resultBanner.hidden = true;
    resultSummary.textContent = "";

    updateCharacterStyles();
    startBtn.textContent = "Restart Test";
    typingFeedback.textContent = "Type the passage above to start the timer.";
    textDisplay.focus();
}

// The button starts a fresh test or restarts a completed one.
startBtn.addEventListener("click", startTest);

// Let the visitor click the passage to focus it for typing.
textDisplay.addEventListener("click", () => {
    if (!testFinished) {
        textDisplay.focus();
    }
});

// Handle physical keyboard keys, including Backspace, without editing the page itself.
textDisplay.addEventListener("keydown", (event) => {
    if (!testReady || testFinished) {
        return;
    }

    if (event.key === "Backspace") {
        event.preventDefault();
        typedText = typedText.slice(0, -1);
        updateCharacterStyles();
        return;
    }

    if (
        event.key.length !== 1 ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        typedText.length >= targetText.length
    ) {
        return;
    }

    event.preventDefault();

    if (!testStarted) {
        testStarted = true;
        startTime = Date.now();
        timerId = setInterval(updateTime, 100);
    }

    typedText += event.key;
    updateCharacterStyles();

    if (typedText.length === targetText.length) {
        finishTest();
    }
});

// Handle text input from mobile keyboards while keeping the passage read-only otherwise.
textDisplay.addEventListener("beforeinput", (event) => {
    if (!testReady || testFinished) {
        event.preventDefault();
        return;
    }

    if (event.inputType === "deleteContentBackward") {
        event.preventDefault();
        typedText = typedText.slice(0, -1);
        updateCharacterStyles();
        return;
    }

    if (event.inputType !== "insertText" || !event.data || event.data.length !== 1) {
        event.preventDefault();
        return;
    }

    event.preventDefault();

    if (!testStarted) {
        testStarted = true;
        startTime = Date.now();
        timerId = setInterval(updateTime, 100);
    }

    typedText += event.data;
    updateCharacterStyles();

    if (typedText.length === targetText.length) {
        finishTest();
    }
});

// Draw the passage and initial progress message before the visitor starts.
renderTargetText();
updateCharacterStyles();
