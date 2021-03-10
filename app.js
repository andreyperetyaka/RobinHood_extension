let chache = {
  tabs: {},
  votes: {},
};

function callAPI(endpoint, method, data) {
  const host = 'https://robinhood-extension.herokuapp.com';
  const url =
    method === 'GET' && data ? host + endpoint + data : host + endpoint;
  return getToken().then((token) => {
    let options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: method === 'GET' ? undefined : JSON.stringify(data),
    };
    return fetch(url, options);
  });
}

const getToken = (interactive = false) =>
  new Promise((resolve) =>
    chrome.identity.getAuthToken({ interactive }, resolve)
  );

async function init() {
  let response = await callAPI('/login', 'GET');
  if (response.ok) {
    let user = await response.json();
    chache.user = user;
    chrome.tabs.onActivated.addListener(start);
    chrome.tabs.onUpdated.addListener(start);
    chrome.tabs.onCreated.addListener(start);
    chrome.runtime.onMessage.addListener(router);
    start();
  } else {
    chrome.browserAction.setBadgeBackgroundColor({ color: 'red' });
    chrome.browserAction.setTitle({ title: 'Нажмите, чтобы авторизоваться' });
    chrome.browserAction.setBadgeText({ text: 'user' });
    chrome.browserAction.onClicked.addListener(async () => {
      let token = await getToken(true);
      if (token) init();
    });
  }
}

function start() {
  getActiveTab().then((tab) => {
    if (
      tab?.url?.startsWith('http') &&
      !tab.url.includes('/chrome.google.com/webstore/')
    ) {
      chrome.tabs.executeScript({ file: 'seeker.js' });
    }
    browserActions();
  });
}

function router(request, sender, sendResponse) {
  return !!router[request.type](request, sender, sendResponse);
}

router.post = (request, sender, sendResponse) => {
  let id = sender.tab.id;
  let numbers = request.body;
  chache.tabs[id] = numbers;
  browserActions();
  updateVotes(numbers);
};

router.get = (request, sender, sendResponse) => {
  return getActiveTab().then((tab) => {
    let numbers = chache.tabs[tab.id];
    let popup = numbers?.map((number) =>
      chache.votes[number] ? chache.votes[number] : { number }
    );
    sendResponse({
      user: chache.user,
      popup,
    });
  });
};

router.vote = (request, sender, sendResponse) => {
  return callAPI('/votes', 'POST', request.body)
    .then((response) => response.json())
    .then((vote) => {
      chache.votes[vote.number] = vote;
      browserActions();
      sendResponse(vote);
    });
};

router.referrer = (request, sender, sendResponse) => {
  return callAPI('/referrer', 'PUT', request.body)
    .then((response) => response.json())
    .then((data) => {
      chache.user = { ...chache.user, ...data.user };
      sendResponse(data);
    });
};

router.offer = (request, sender, sendResponse) => {
  chrome.tabs.create({ url: 'pages/html/offer.html' });
};

router.pay = (request, sender, sendResponse) => {
  let user = chache.user;
  if (user) {
    let price = request.body || user.price;
    let url = `https://send.monobank.com.ua/XumHuNaa?amount=${price}&text=RobinHood(${user.email})`;
    chrome.tabs.create({ url });
  }
};

router.contact = (request, sender, sendResponse) => {
  let url = `https://www.facebook.com/messages/t/andrey.peretyaka`;
  chrome.tabs.create({ url });
};

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });
}

function browserActions() {
  getActiveTab().then((tab) => {
    let numbers = chache.tabs[tab?.id];
    if (numbers) {
      let quantity = numbers.length;
      let title = quantity
        ? `Найдено номеров на странице: ${quantity}`
        : 'Номера на странице не найдены';
      let text = quantity ? String(quantity) : '';
      let color = hasDangerous(numbers) ? 'red' : 'blue';
      chrome.browserAction.setTitle({ title });
      chrome.browserAction.setBadgeText({ text });
      chrome.browserAction.setBadgeBackgroundColor({ color });
      chrome.browserAction.setPopup({ popup: 'pages/html/popup.html' });
    } else {
      chrome.browserAction.setPopup({ popup: '' });
      chrome.browserAction.setBadgeText({ text: '' });
      chrome.browserAction.setTitle({ title: 'Откройте любой сайт!' });
    }
  });
}

function hasDangerous(numbers) {
  for (let number of numbers) {
    let vote = chache.votes[number];
    if (vote && vote.bad > vote.good) return true;
  }
  return false;
}

async function updateVotes(numbers) {
  let newNumbers = numbers.filter((number) => !chache.votes[number]);
  if (newNumbers.length) {
    let query = `?numbers=${newNumbers.join(',')}`;
    let response = await callAPI('/votes', 'GET', query);
    if (response.ok) {
      let votes = await response.json();
      newNumbers.forEach((number) => {
        let vote = votes.find((el) => el.number === number);
        chache.votes[number] = vote ? vote : { number };
      });
      browserActions();
    }
  }
}

init();
