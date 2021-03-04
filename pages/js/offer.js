const packs = [
  { months: 1, text: '1 месяц', discount: 0 },
  { months: 3, text: '3 месяца', discount: 6 },
  { months: 6, text: 'полгода', discount: 13, favorite: true },
  { months: 12, text: '1 год', discount: 21 },
];

function copyToClipboard() {
  let buffer = document.createElement('input');
  buffer.value = this.innerText;
  document.body.appendChild(buffer);
  buffer.select();
  document.execCommand('copy');
  document.body.removeChild(buffer);
  UIkit.notification({
    message: '<span uk-icon="icon: check"></span>Данные скопированы в буфер',
    status: 'success',
    pos: 'top-left',
    timeout: 500,
  });
}

function share(url, title, width, height) {
  let left = (screen.width - width) / 2;
  let top = (screen.height - height) / 2;
  return window.open(
    url,
    title,
    `width=${width}, height=${height}, top=${top}, left=${left}`
  );
}

function renderPacks(packs, price) {
  let cards = packs.map((pack) => {
    let total = Math.ceil(price * pack.months * (1 - pack.discount / 100));
    let pricePerDay = (total / (pack.months * 30)).toFixed(2);
    return $('<div>', {
      class: `uk-card uk-card-body uk-card-${
        pack.favorite ? 'primary' : 'default'
      } uk-card-hover uk-width-1-5 uk-border-rounded uk-box-shadow-xlarge uk-animation-scale-${
        pack.favorite ? 'down' : 'up'
      }`,
    })
      .append(
        pack.favorite
          ? $('<span>', {
              class: 'uk-label uk-label-success',
              text: 'Популярный',
            })
          : ''
      )
      .append(
        $('<h5>', {
          class: 'uk-card-title uk-text-center uk-text-uppercase uk-text-bold',
          text: pack.text,
        })
      )
      .append(
        $('<div>', {
          class: 'uk-text-center',
        })
          .append(
            $('<div>', {
              class: 'uk-text-small',
              text: 'Cтоимость',
            })
          )
          .append(
            $('<div>', {
              class: 'uk-text-small',
              text: `${total} грн`,
            })
          )
          .append(
            $('<div>', {
              class: 'uk-text-small uk-padding-small',
              text: `${pricePerDay} грн/день`,
            })
          )
      )
      .append(
        $('<button>', {
          class:
            'uk-button uk-button-primary uk-border-rounded uk-margin-medium-top',
          text: 'Оплатить',
          on: {
            click: function () {
              chrome.runtime.sendMessage({ type: 'pay', body: total });
            },
          },
        })
      );
  });
  $('#packs').append(cards);
}

chrome.runtime.sendMessage({ type: 'get' }, (response) => {
  let id = response.user._id;
  let link = `https://chrome.google.com/webstore/detail/robinhood/ideiplndalkgaodfmjfblcdobajojcpp/?ref=${id}`;
  let price = response.user.price;
  renderPacks(packs, price);
  document.querySelector('#code').innerText = id;
  document.querySelector('#link').innerText = link;
  document.querySelector('#share').addEventListener('click', () => {
    let url = `https://www.facebook.com/sharer/sharer.php?u=${link}`;
    share(url, 'Поделиться на Facebook', 600, 400);
  });
});

document
  .querySelectorAll('.copy')
  .forEach((elem) => elem.addEventListener('click', copyToClipboard));
