const navigationEntry = document.querySelectorAll(".site-navigation a");

const countdown = document.querySelector(".panel-countdown p");
const questionNavigation = document.querySelector(".panel-question-container");

const buttonTestPrevious = document.querySelector(".test-previous button");
const buttonTestNext = document.querySelector(".test-next button");
const buttonTestSubmit = document.querySelector(".test-submit button");
const buttonTestLeave = document.querySelector(".test-leave button");

const questionContainer = document.querySelector(".question-container");

const TOTAL_DURATION_SECONDS = 1800;

let testId;
let askSubmit = true;
let intervalId;

async function fetchQuestion() {
  try {
    const resp = await fetch("../api/start", {
      method: "GET",
      credentials: "same-origin",
    });

    if (resp.ok) {
      const text = await resp.text();
      return text;
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error: Could not fetch questions from ${url}: ${error}`)
    window.alert("Error: Could not fetch any question. Test aborted");
    location.assign("../index.html");
    return null;
  }
}

function createSelectionAnswer(child, componentType) {
  const ul = document.createElement("ul");
  ul.className = "question-answer selection-list";

  Array.from(child.options).forEach((option, index) => {
    const li = document.createElement("li");

    const id = child.id;
    const input = document.createElement("input");
    input.setAttribute("type", componentType);
    input.setAttribute("id", `option-${id}-${String.fromCharCode(97 + index)}`);
    input.setAttribute("name", `question-${id}`);
    input.setAttribute("value", String.fromCharCode(97 + index));
    li.appendChild(input);

    const label = document.createElement("label");
    label.setAttribute("for", input.getAttribute("id"));
    label.innerHTML = option;
    li.appendChild(label);

    ul.appendChild(li);
  });

  return ul;
}

function createCompletionAnswer(child) {
  const inputBox = document.createElement("div");
  inputBox.className = "question-answer input-box";

  const id = child.id;
  const input = document.createElement("input");
  input.setAttribute("type", "input");
  input.setAttribute("id", `completion-${id}`);
  input.setAttribute("name", `completion-${id}`);

  inputBox.appendChild(input);
  return inputBox;
}

function createQuestion(child) {
  let className;

  if (child.type == "SingleSelection") {
    className = "single-selection"
  } else if (child.type == "MultipleSelection") {
    className = "multiple-selection"
  } else {
    className = "completion"
  }

  const section = document.createElement("section");
  section.setAttribute("class", `question-entry ${className}`);
  section.setAttribute("id", `question-${child.id}`);

  const h1 = document.createElement("h1");
  h1.setAttribute("class", "question-number");
  section.appendChild(h1);

  const p = document.createElement("p");
  p.textContent = child.content;
  section.appendChild(p);

  if (className == "single-selection") {
    const answer = createSelectionAnswer(child, "radio");
    section.appendChild(answer);
  } else if (className == "multiple-selection") {
    const answer = createSelectionAnswer(child, "checkbox");
    section.appendChild(answer);
  } else {
    const answer = createCompletionAnswer(child);
    section.appendChild(answer);
  }

  return section;
}

async function generateQuestion() {
  const text = await fetchQuestion();

  if (!text) {
    return;
  }

  const json = JSON.parse(text);
  const test = json.test;

  // if (result == "not-logined") {
  //   window.alert("Error: Not logined. You must login first to participate in the test!");
  //   location.assign("../login.html");
  //   return;
  // }

  testId = test.id;
  const questions = test.questions;

  Array.from(questions).forEach(child => {
    const question = createQuestion(child);
    questionContainer.appendChild(question);
  });
}

function generateQuestionNavigation() {
  let num = 0;

  for (const question of questionContainer.children) {
    let text = document.createElement("p");
    text.textContent = num;

    let link = document.createElement("a");
    link.setAttribute("id", `button-question-${question.id}`);
    link.appendChild(text);
    const scrollX = questionContainer.clientWidth * num;
    link.addEventListener("click", (event) => {
      questionContainer.scroll(scrollX, 0);
      event.preventDefault();
    });

    let entry = document.createElement("li");
    entry.setAttribute("class", "panel-question-entry");
    entry.appendChild(link);

    questionNavigation.appendChild(entry);

    num += 1;
  }
}

function registerNavigation() {
  for (const entry of navigationEntry) {
    entry.addEventListener("click", (event) => {
      const res = window.confirm("Are you sure to quit the test? All answers will be lost!");

      if (!res) {
        event.preventDefault();
      }
    });
  }
}

function registerCountdown() {
  const endInstant = Date.now() + TOTAL_DURATION_SECONDS * 1000;

  function updateCounddown() {
    const remainingSeconds = Math.floor((endInstant - Date.now()) / 1000);

    if (remainingSeconds === 0) {
      askSubmit = false;
      window.alert("The test is over. All answers will be submitted automatically.")
      questionContainer.requestSubmit();

      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }

      return;
    }

    function padZero(num) {
      return num < 10 ? `0${num}` : num.toString();
    }

    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds - minutes * 60;
    countdown.textContent = `${padZero(minutes)}:${padZero(seconds)}`;
  }

  intervalId = setInterval(updateCounddown, 1000);
  updateCounddown();
}

function registerControlButton() {
  buttonTestPrevious.addEventListener("click", (_event) => {
    questionContainer.scrollBy(-questionContainer.clientWidth, 0)
  });

  buttonTestNext.addEventListener("click", (_event) => {
    questionContainer.scrollBy(questionContainer.clientWidth, 0)
  });

  buttonTestSubmit.addEventListener("click", (_event) => {
    questionContainer.requestSubmit();
  })

  buttonTestLeave.addEventListener("click", (_event) => {
    const res = window.confirm("Are you sure to quit the test? All answers will be lost!");

    if (res) {
      location.assign("../index.html");
    }
  });
}


function createAnswerForm() {
  let formData = new FormData();
  formData.append("test-id", testId);

  for (const question of questionContainer.children) {
    if (question.classList.contains("single-selection")) {
      const id = question.id.replace("question-", "");
      const radio = question.querySelector("input:checked");
      formData.append(`single-${id}`, (radio ? radio.value : ""));
    } else if (question.classList.contains("multiple-selection")) {
      const id = question.id.replace("question-", "");
      const checkboxs = question.querySelectorAll("input:checked");
      const answer = Array.from(checkboxs).map((ck) => ck.value).join('');
      formData.append(`multiple-${id}`, answer);
    } else if (question.classList.contains("completion")) {
      const id = question.id.replace("question-", "");
      const inputbox = question.querySelector("input");
      formData.append(`completion-${id}`, inputbox.value);
    }
  }

  return formData;
}

function registerFormSubmit() {
  questionContainer.addEventListener("submit", async (event) => {
    event.preventDefault();
    const res = !askSubmit || window.confirm("Are you sure to submit the answers?");

    if (res) {
      try {
        const formData = createAnswerForm();
        const encodedData = new URLSearchParams(formData).toString();

        const resp = await fetch("TODO", {
          method: "POST",
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: encodedData,
          credentials: "same-origin",
        });

        if (!resp.ok) {
          window.alert("Error: Could not submit answers");
          return;
        }

        const text = await resp.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "application/xml");

        if (!xml) {
          window.alert("Error: Could not receive valid response");
          return;
        }

        const root = xml.querySelector("root");
        const result = root.querySelector("result").textContent;

        if (result === "not-logined") {
          window.alert("Error: Not logined. You must login first to participate in the test!");
          location.assign("../login.html");
          return;
        } else if (result === "test-expired") {
          window.alert("Error: Test expired. Please refresh the page");
          return;
        }

        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }

        location.assign("../result.html?query=latest");
      } catch (error) {
        console.error(error);
        window.alert("Error: Could not submit answers");
      }
    }
  });
}

async function main() {
  await generateQuestion();
  generateQuestionNavigation();

  registerNavigation();
  registerCountdown();
  registerControlButton();
  registerFormSubmit();
}

main();
