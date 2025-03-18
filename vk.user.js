// ==UserScript==
// @name        Vk.com
// @namespace   Violentmonkey Scripts
// @match       https://vk.com/im*
// @grant       none
// @version     1.0
// @author      -
// ==/UserScript==

const bluredUsers = [];

const selectors = {
  chat__message: "ConvoHistory__messageBlock",
  chat__message_parent: "ConvoStack__content",
  chat__message_author: "ConvoMessageHeader__authorLink",
};

const handleNewMessage = (target) => {
  const parent = target.closest("." + selectors.chat__message_parent);
  const author = parent.querySelector("." + selectors.chat__message_author);
  const href = author
    .getAttribute("href")
    .replace(/\/id\d+/, "")
    .replace(/\//g, "");

  if (!bluredUsers.includes(href)) return;

  target.classList.add("blur-text");
};

const observers = [
  {
    selector: selectors.chat__message,
    options: { childList: true, subtree: true },
    fn: handleNewMessage,
  },
];

const startObserver = (selector, options, fn) => {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.target.classList.contains(selector)) fn(mutation.target);
    }
  });

  observer.observe(document.body, options);
};

const injectStyles = () => {
  const style = document.createElement("style");
  style.textContent = `
    .blur-text {filter: blur(6px);cursor: pointer;transition: filter 0.3s ease;}
    .blur-text:hover {filter: none;transition: filter 0.3s ease;}
    `;

  document.head.appendChild(style);
};

injectStyles();
observers.forEach(({ selector, options, fn }) => startObserver(selector, options, fn));
