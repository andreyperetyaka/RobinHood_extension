function formatPhoneNumber(number) {
  return String(number).replace(
    /(\d{3})(\d{2})(\d{3})(\d{2})(\d{2})/,
    '+ $1 ($2) $3-$4-$5'
  );
}

function highlightRows() {
  document.querySelectorAll('tr').forEach(function (el) {
    let good = el.querySelector('button[data-vote=good] > div').innerText;
    let bad = el.querySelector('button[data-vote=bad] > div').innerText;
    el.style.backgroundColor =
      bad > good ? '#FFCCFF' : bad < good ? '#99FF99' : '';
  });
}

function scroll() {
  chrome.tabs.query({ active: true }, (tabs) => {
    let tab = tabs[0];
    if (tab) {
      let number = this.parentNode.dataset.number;
      let type = 'scroll';
      let body = { number };
      chrome.tabs.sendMessage(tab.id, { type, body });
    }
  });
}

function vote() {
  let vote = this.dataset.vote;
  let number = this.parentNode.parentNode.dataset.number;
  chrome.runtime.sendMessage(
    {
      type: 'vote',
      body: { vote, number },
    },
    (response) => {
      if (response) {
        document
          .querySelectorAll(`tr[data-number='${response.number}'] button`)
          .forEach((button) => {
            button.querySelector('div').innerText =
              response[button.dataset.vote];
            button.disabled = button.dataset.vote === response.voted;
          });
        highlightRows();
      }
      let icon = response ? 'check' : 'close';
      let vote =
        response?.voted === 'good'
          ? '<span class="uk-text-primary">повысили</span>'
          : '<span class="uk-text-danger">снизили</span>';
      let answer = response
        ? `Вы ${vote} рейтинг номера!`
        : 'Невозможно отправить голос!';
      let message = `<span uk-icon="icon: ${icon}"></span>${answer}`;
      let status = response ? 'success' : 'danger';
      UIkit.notification({
        message,
        status,
        pos: 'top-left',
        timeout: 1500,
      });
    }
  );
}

function renderStatus(user) {
  if (user) {
    let dueDate = new Date(user.dueDate);
    if (dueDate > Date.now()) {
      $('#status').append(
        $('<span>', {
          text: `Рейтинг доступен до: ${dueDate.toLocaleDateString()}`,
        })
      );
    } else {
      $('#status')
        .append(
          $('<span>', {
            text: 'Рейтинг номеров не доступен!',
            class: 'uk-text-danger',
          })
        )
        .append(
          $('<span>', {
            text: 'Активировать рейтинг',
            on: {
              click: function () {
                chrome.runtime.sendMessage({ type: 'offer' });
              },
            },
            class: 'uk-button uk-label uk-label-primary',
          })
        );
    }
    if (user.referrer === 'none')
      $('#status').append(
        $('<a>', {
          text: 'Реферальная программа',
          href: '#referrer',
          class: 'uk-text-warning',
          'uk-toggle': '',
        })
      );
  } else {
    $('#status').append(
      $('<span>', {
        html: 'Нет доступа к базе данных<br>Проверь интернет соединение!',
        class: 'uk-text-danger',
      })
    );
  }
}

function renderPhoneTable(array) {
  let fragment = document.createDocumentFragment();
  if (array.length) {
    let rows = array.map((record) =>
      $('<tr>', { 'data-number': record.number })
        .append(
          $('<td>', {
            text: formatPhoneNumber(record.number),
            title: 'Найти номер на странице',
            class: 'uk-width-1-2 uk-text-lead',
            css: {
              cursor: 'pointer',
            },
            on: { click: scroll },
          })
        )
        .append(
          $('<td>', {
            title: 'Увеличить рейтинг номера',
            class: 'uk-width-1-4',
          }).append(
            $('<button>', {
              'data-vote': 'good',
              disabled: record.voted === 'good',
              class:
                'uk-button uk-button-primary uk-width-1-1 uk-flex-center uk-flex-middle uk-flex-inline',
              on: { click: vote },
            })
              .append(
                $('<img>', {
                  src: '../../pic/like.png',
                  width: '30px',
                  class: 'uk-img',
                })
              )
              .append(
                $('<div>', {
                  text: record.good || 0,
                  class: 'uk-text-large uk-margin-small-left uk-text-bold',
                })
              )
          )
        )
        .append(
          $('<td>', {
            title: 'Снизить рейтинг номера',
            class: 'uk-width-1-4',
          }).append(
            $('<button>', {
              'data-vote': 'bad',
              disabled: record.voted === 'bad',
              class:
                'uk-button uk-button-danger uk-width-1-1 uk-flex-center uk-flex-middle uk-flex-inline',
              on: { click: vote },
            })
              .append(
                $('<img>', {
                  style: 'transform: rotate(180deg)',
                  src: '../../pic/like.png',
                  width: '30px',
                  class: 'uk-img',
                })
              )
              .append(
                $('<div>', {
                  text: record.bad || 0,
                  class: 'uk-text-large uk-margin-small-left uk-text-bold',
                })
              )
          )
        )
    );
    $(fragment).append(
      $('<h5>', {
        text:
          'Вы можете повысить или снизить рейтинг номера, если есть за что ;-)',
        class: 'uk-text-center',
      })
    );
    $(fragment).append(
      $('<table>', {
        class: 'uk-table uk-table-small uk-table-hover uk-table-divider',
      })
        .append($('<tbody>'))
        .append(rows)
    );
  } else {
    $(fragment).append(
      $('<div>', {
        text: 'Номеров телефонов не найдено!',
        class:
          'uk-flex uk-flex-center uk-text-danger uk-text-large uk-margin-bottom',
      })
    );
  }
  $('#phoneList').append(fragment);
}

function search() {
  if (chrome.history) {
    chrome.history.search(
      {
        text:
          'https://chrome.google.com/webstore/detail/robinhood/ideiplndalkgaodfmjfblcdobajojcpp/?ref=',
        maxResults: 1000,
      },
      function (result) {
        if (result.length) {
          document.querySelector('#code').value = String(
            new URLSearchParams(new URL(result[0].url).search).get('ref')
          );
          document.querySelector('.uk-modal-close').innerText = 'Отправить код';
        } else {
          UIkit.notification({
            message: 'Код в истории не найден!',
            status: 'danger',
            pos: 'top-left',
            timeout: 1000,
          });
        }
      }
    );
  } else {
    chrome.permissions.request(
      { permissions: ['history'] },
      function (granted) {
        if (granted) {
          search();
        } else {
          UIkit.notification({
            message: 'Необходим доступ к истории!',
            status: 'danger',
            pos: 'top-left',
            timeout: 1000,
          });
        }
      }
    );
  }
}

chrome.runtime.sendMessage({ type: 'get' }, (response) => {
  renderStatus(response.user);
  renderPhoneTable(response.popup);
  highlightRows();
});

document.querySelectorAll('div.uk-navbar-item > button').forEach((button) =>
  button.addEventListener('click', function () {
    let type = this.dataset.type;
    chrome.runtime.sendMessage({ type });
  })
);

document.querySelector('#search').addEventListener('click', search);

document.querySelector('#code').addEventListener('input', function () {
  let referrer = this.value;
  document.querySelector('.uk-modal-close').innerText = referrer
    ? 'Отправить код'
    : 'Закрыть окно';
});

document.querySelector('#referrer').addEventListener('hide', function () {
  let type = 'referrer';
  let referrer = document.querySelector('#code').value;
  if (referrer) {
    let body = { referrer };
    chrome.runtime.sendMessage({ type, body }, (response) => {
      let answer = response.answer;
      let icon = answer ? 'check' : 'close';
      let text = answer
        ? 'Поздравляю, вы получили месяц в подарок!'
        : 'К сожалению, вы ввели неверный код!';
      let message = `<span uk-icon="icon: ${icon}"></span>${text}`;
      let status = answer ? 'success' : 'danger';
      UIkit.notification({
        message,
        status,
        pos: 'top-left',
        timeout: 1500,
      });
    });
  }
});

UIkit.modal('#referrer', {
  escClose: false,
  bgClose: false,
  clsPage: 'uk-height-large',
});
