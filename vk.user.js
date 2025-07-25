// ==UserScript==
// @name        seneal-vk-plus
// @namespace   Violentmonkey Scripts
// @match       https://vk.com/im*
// @grant       none
// @version     1.3
// @author      seneal
// ==/UserScript==

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const defaultSettings = {
  // "Сила" блюра. Можно изменять;
  blurStrength: 5,
  // Массив пользователей (id). Можно изменять;
  bluredUsers: [],
  // Мапа, которая содержит ключ(id)-значение(имя) пользователей. Нужно для корректной работы. Работает автономно. Не изменять;
  bluredUserNames: new Map()
};

const settings = { ...defaultSettings };

const loadFromStorage = () => {
  try {
    const savedData = localStorage.getItem("seneal-vk-plus");
    if (savedData) {
      const parsed = JSON.parse(savedData);

      settings.bluredUsers = parsed.bluredUsers || defaultSettings.bluredUsers;
      settings.blurStrength = parsed.blurStrength || defaultSettings.blurStrength;

      const savedMap = parsed.bluredUserNames ? new Map(parsed.bluredUserNames) : new Map();
      settings.bluredUserNames = new Map([...defaultSettings.bluredUserNames, ...savedMap]);
    }
  } catch (e) {
    console.error("Loading settings error:", e);
    resetToDefaults();
  }
};

const saveToStorage = () => {
  try {
    const dataToSave = {
      ...settings,
      version: "1.0",
      lastUpdated: new Date().toISOString(),
      bluredUserNames: [...settings.bluredUserNames]
    };

    localStorage.setItem("seneal-vk-plus", JSON.stringify(dataToSave));
  } catch (e) {
    console.error("Save settings error:", e);
  }
};

const resetToDefaults = () => {
  settings.bluredUsers = [...defaultSettings.bluredUsers];
  settings.blurStrength = defaultSettings.blurStrength;
  settings.bluredUserNames = new Map(defaultSettings.bluredUserNames);
  saveToStorage();
};

const initSettings = () => {
  loadFromStorage();
  let needSave = false;

  defaultSettings.bluredUsers.forEach(user => {
    if (!settings.bluredUsers.includes(user)) {
      settings.bluredUsers.push(user);
      needSave = true;
    }
  });

  if (settings.blurStrength !== defaultSettings.blurStrength) {
    settings.blurStrength = defaultSettings.blurStrength;
    needSave = true;
  }

  defaultSettings.bluredUserNames.forEach((value, key) => {
    if (!settings.bluredUserNames.has(key)) {
      settings.bluredUserNames.set(key, value);
      needSave = true;
    }
  });

  if (needSave)
    saveToStorage();
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const selectors = {
  page__body: "page_body",
  chat__reply_main: "Reply__main",
  conversation__list: "ConvoList",
  chat__reply_author: "Reply__author",
  chat__author_name: "PeerTitle__title",
  chat__forward_new: "ForwardedMessageNew",
  chat__message_header: "ConvoMessageHeader",
  chat__message_parent: "ConvoStack__content",
  chat__message: "ConvoHistory__messageWrapper",
  conversation__message: "ConvoListItem__message",
  chat__reply: "ConvoMessageWithoutBubble__reply",
  chat__forward: "ForwardedMessagesList__content",
  conversation__author_name: "vkuiVisuallyHidden__host",
  chat__forward_author: "ForwardedMessageNew__userName",
  chat__message_author: "ConvoMessageWithoutBubble__avatar",
  chat__message_buble_text: "ConvoMessageWithoutBubble__text",
  chat__message_buble_media: "ConvoMessageWithoutBubble__mediaAttachments"
};

const isBluredUserOld = (href) => settings.bluredUsers.includes(getUser(href));

const isBluredUser = (value) => {
  const user = getUser(value);

  if (settings.bluredUsers.includes(user) || getUserByBlurredName(value))
    return true;

  return false;
};

const isElementBlured = (element) => element.getAttribute("data-blur-user");
const getUser = (href) => href.replace(/\/id\d+/, "").replace(/\//g, "");

const getUserByBlurredName = (name) => {
  for (const [user, userName] of settings.bluredUserNames) {
    if (userName.toLowerCase().trim() === name.toLowerCase().trim())
      return user;
  }

  return null;
};

const getClass = (name) => `.${name}`;

const handleBlurElements = (user) => {
  const elements = document.querySelectorAll(`[data-blur-user="${user}"]`);

  elements.forEach((el) => el.classList.add("blur-text"));

  elements.forEach((el) => {
    el.addEventListener("mouseenter", () => {
      elements.forEach((e) => e.classList.add("blur-text-hover"));
    });

    el.addEventListener("mouseleave", () => {
      elements.forEach((e) => e.classList.remove("blur-text-hover"));
    });
  });
};

const handleForwardedMessage = (target) => {
  const content = target.querySelectorAll(getClass(selectors.chat__forward_new));
  if (!content || !content.length)
    return;

  for (const element of content) {
    const author = element.querySelector(getClass(selectors.chat__forward_author));
    if (!author)
      continue;

    const href = author.getAttribute("href");
    if (!href || !href.length || !isBluredUser(href) || isElementBlured(element))
      continue;

    const user = getUser(href);
    if (!user)
      continue;

    element.setAttribute("data-blur-user", user);
    handleBlurElements(user);
  }
};

const handleReplyMessage = (target) => {
  const content = target.querySelector(getClass(selectors.chat__reply_main));
  if (!content)
    return;

  const author = content.querySelector(getClass(selectors.chat__reply_author));
  if (!author || !isBluredUser(author.textContent) || isElementBlured(content))
    return;

  const user = getUserByBlurredName(author.textContent);
  if (!user)
    return;

  content.setAttribute("data-blur-user", user);
  handleBlurElements(user);
};

const handleConversationListMessage = (target) => {
  if (target._blurObserver) {
    target._blurObserver.disconnect();
    delete target._blurObserver;
  }

  const processElement = (element) => {
    const content = element.querySelector(getClass(selectors.conversation__author_name));
    if (!content)
      return;

    const formatedAuthor = content.textContent.replaceAll(":", "").trim();

    if (!isBluredUser(formatedAuthor) && isElementBlured(element)) {
      element.classList.remove("blur-text");
      element.removeAttribute("data-blur-user");

      return;
    }
    if (!isBluredUser(formatedAuthor) || isElementBlured(element))
      return;

    const user = getUserByBlurredName(formatedAuthor);
    if (!user)
      return;

    element.setAttribute("data-blur-user", user);
    handleBlurElements(user);
  };

  processElement(target);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList" || mutation.type === "characterData")
        processElement(target);
    }
  });

  observer.observe(target, {
    subtree: true,
    childList: true,
    characterData: true
  });

  target._blurObserver = observer;
};

const handleChatMessage = (target) => {
  const parent = target.closest(getClass(selectors.chat__message_parent));
  if (!parent)
    return;

  if (parent._blurObserver) {
    parent._blurObserver.disconnect();
    delete parent._blurObserver;
  }

  const processMessage = (element) => {
    const author = element.querySelector(getClass(selectors.chat__message_author));
    if (!author)
      return;

    const href = author.getAttribute("href");
    const authorName = element.querySelector(getClass(selectors.chat__author_name));

    if (!href || !isBluredUser(href))
      return;

    const user = getUser(href);
    if (!user || !authorName)
      return;

    const bubles = [
      ...element.querySelectorAll(getClass(selectors.chat__message_buble_text)),
      ...element.querySelectorAll(getClass(selectors.chat__message_buble_media))
    ].filter(buble => !isElementBlured(buble));

    if (!isElementBlured(author)) {
      if (!settings.bluredUserNames.get(user) || settings.bluredUserNames.get(user).toLowerCase() !== authorName.textContent.toLowerCase()) {
        settings.bluredUserNames.set(user, authorName.textContent);
        saveToStorage();
      }

      author.setAttribute("data-blur-user", user);

      const header = element.querySelector(getClass(selectors.chat__message_header));
      if (header && !isElementBlured(header))
        header.setAttribute("data-blur-user", user);

      handleBlurElements(user);
    }

    if (bubles.length) {
      for (const buble of bubles)
        buble.setAttribute("data-blur-user", user);

      handleBlurElements(user);
    }
  };

  processMessage(parent);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && (mutation.attributeName === "href" || mutation.attributeName === "class"))
        processMessage(parent);

      if (mutation.type === "characterData")
        processMessage(parent);

      if (mutation.type === "childList") {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE)
            processMessage(parent);
        }
      }
    }
  });

  observer.observe(parent, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
    attributeFilter: ["href", "class"]
  });

  parent._blurObserver = observer;
};

const startObserver = (selector, fn) => {
  console.log(`Observing: ${selector}`);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList" || mutation.type === "attributes") {
        const nearest = mutation.target.querySelector(selector);
        if (nearest)
          fn(nearest);

        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const nested = node.querySelector(selector);
            if (nested)
              fn(nested);
          }
        });
      }
    });
  });

  const page = document.getElementById(selectors.page__body);

  observer.observe(page, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class"]
  });
};

const handleConversationList = (target) => {
  const messages = target.querySelectorAll(getClass(selectors.conversation__message));
  if (!messages || !messages.length)
    return;

  for (const message of messages)
    handleConversationListMessage(message);

};

const observers = [
  { fn: handleChatMessage, selector: getClass(selectors.chat__message) },
  { fn: handleForwardedMessage, selector: getClass(selectors.chat__forward) },
  { fn: handleReplyMessage, selector: getClass(selectors.chat__reply) },
  { fn: handleConversationList, selector: getClass(selectors.conversation__list) },
  { fn: handleConversationListMessage, selector: getClass(selectors.conversation__message) }
];

const injectStyles = () => {
  const style = document.createElement("style");
  style.textContent = `.blur-text {filter: blur(${settings.blurStrength}px);cursor: pointer;transition: filter 0.3s ease;}.blur-text-hover {filter: none !important;}`;

  document.head.appendChild(style);
};

initSettings();
injectStyles();

observers.forEach(({ fn, selector }) => startObserver(selector, fn));
