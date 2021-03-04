let chache = {
  tabs: {},
  numbers: {},
};
const API = {
  host: 'https://robinhood-extension.herokuapp.com',
  get check() {
    return this.host + '/check';
  },
  get vote() {
    return this.host + '/vote';
  },
  get referrer() {
    return this.host + '/referrer';
  },
};
const getToken = () =>
  new Promise((resolve) => chrome.identity.getAuthToken(resolve));

function init() {
  chrome.identity.getAuthToken({ interactive: true }, (token) => {
    if (token) {
      chrome.tabs.onActivated.addListener(start);
      chrome.tabs.onUpdated.addListener(start);
      chrome.tabs.onCreated.addListener(start);
      chrome.runtime.onMessage.addListener(router);
      start();
    }
  });
}

function start() {
  getCurrentTab().then((tab) => {
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
  updateNumbers(numbers);
};

router.get = (request, sender, sendResponse) => {
  return getCurrentTab().then((tab) => {
    let numbers = chache.tabs[tab.id];
    let popup = numbers?.map((number) =>
      chache.numbers[number] ? chache.numbers[number] : { number }
    );
    sendResponse({
      user: chache.user,
      popup,
    });
  });
};

router.vote = (request, sender, sendResponse) => {
  return fetchData(API.vote, request.body).then((response) => {
    if (response) {
      chache.numbers[response.number] = response;
      browserActions();
    }
    sendResponse(response);
  });
};

router.referrer = (request, sender, sendResponse) => {
  return fetchData(API.referrer, request.body).then((response) => {
    chache.user = response.user;
    sendResponse(response);
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

function getCurrentTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });
}

function browserActions() {
  getCurrentTab().then((tab) => {
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
    let vote = chache.numbers[number];
    if (vote && vote.bad > vote.good) return true;
  }
  return false;
}

function updateNumbers(numbers) {
  let newNumbers = numbers.filter((number) => !chache.numbers[number]);
  if (!chache.user || newNumbers.length) {
    fetchData(API.check, newNumbers).then((payload) => {
      if (payload) {
        chache.user = payload.user;
        if (payload.numbers) {
          newNumbers.forEach((number) => {
            let vote = payload.numbers.find((el) => el.number === number);
            chache.numbers[number] = vote ? vote : { number };
          });
          browserActions();
        }
      }
    });
  }
}

function fetchData(url, body) {
  return getToken()
    .then((token) => {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      };
      return fetch(url, options);
    })
    .then((response) => response.json())
    .catch((error) => {
      console.log(error);
      chrome.browserAction.setBadgeBackgroundColor({ color: 'red' });
      chrome.browserAction.setTitle({ title: 'Нет доступа к базе данных!' });
      chrome.browserAction.setBadgeText({ text: '✕' });
    });
}

chrome.browserAction.onClicked.addListener(init);
