// ==UserScript==
// @name        seneal-vk-plus
// @namespace   Violentmonkey Scripts
// @match       https://vk.com/im*
// @grant       none
// @version     1.1
// @author      seneal
// ==/UserScript==

const bluredUsers = [];
const blurStrength = 5;

const selectors = {
  page__body: "page_body",
  chat__forward_new: "ForwardedMessageNew",
  chat__message_header: "ConvoMessageHeader",
  chat__message_parent: "ConvoStack__content",
  chat__message: "ConvoHistory__messageWrapper",
  chat__forward: "ForwardedMessagesList__content",
  chat__forward_author: "ForwardedMessageNew__userName",
  chat__message_author: "ConvoMessageWithoutBubble__avatar",
  chat__message_buble_text: "ConvoMessageWithoutBubble__text",
  chat__message_buble_media: "ConvoMessageWithoutBubble__mediaAttachments",
};

const isBluredUser = (href) => bluredUsers.includes(getUser(href));

const getUser = (href) => href.replace(/\/id\d+/, "").replace(/\//g, "");

const getClass = (name) => `.${name}`;

const handleBlurElements = (user) => {
  const elements = document.querySelectorAll(`[data-blur-user="${user}"]`);
  elements.forEach((el) => el.classList.add("blur-text"));

  elements.forEach((el) => {
    el.addEventListener("mouseenter", () => {
      elements.forEach((e) => e.classList.remove("blur-text"));
    });

    el.addEventListener("mouseleave", () => {
      elements.forEach((e) => e.classList.add("blur-text"));
    });
  });
};

const handleForwardedMessage = (target) => {
  const content = target.querySelector(getClass(selectors.chat__forward));
  if (!content) return;

  for (const element of content.children) {
    if (!element.classList.contains(selectors.chat__forward_new)) continue;

    const href = element.querySelector(getClass(selectors.chat__forward_author)).getAttribute("href");
    if (!isBluredUser(href)) continue;

    const user = getUser(href);

    element.setAttribute("data-blur-user", user);
    handleBlurElements(user);
  }
};

const handleChatMessage = (target) => {
  const parent = target.closest(getClass(selectors.chat__message_parent));
  if (!parent) return;

  const author = parent.querySelector(getClass(selectors.chat__message_author));
  if (!author) return;

  const href = author.getAttribute("href");
  if (!href || !isBluredUser(href)) return;

  const user = getUser(href);

  author.setAttribute("data-blur-user", user);

  const header = parent.querySelector(getClass(selectors.chat__message_header));
  if (header) header.setAttribute("data-blur-user", user);

  const bubles = [
    ...parent.querySelectorAll(getClass(selectors.chat__message_buble_text)),
    ...parent.querySelectorAll(getClass(selectors.chat__message_buble_media)),
  ];

  for (const buble of bubles) {
    buble.setAttribute("data-blur-user", user);
  }

  handleBlurElements(user);
};

const startObserver = (selector, options, fn) => {
  console.log(`Observing: ${selector}`);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      const nearest = mutation.target.querySelector(selector);
      if (nearest) fn(mutation.target);
    }
  });

  const page = document.getElementById(selectors.page__body);

  observer.observe(page, options);
};

const observers = [
  {
    fn: handleChatMessage,
    selector: getClass(selectors.chat__message),
    options: { subtree: true, childList: true },
  },
  {
    fn: handleForwardedMessage,
    selector: getClass(selectors.chat__forward),
    options: { subtree: true, childList: true },
  },
];

const injectStyles = () => {
  const style = document.createElement("style");
  style.textContent = `.blur-text {filter: blur(${blurStrength}px);cursor: pointer;transition: filter 0.3s ease;}.blur-text:hover {filter: none;transition: filter 0.3s ease;}`;

  document.head.appendChild(style);
};

injectStyles();

observers.forEach(({ fn, options, selector }) => startObserver(selector, options, fn));
