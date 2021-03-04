if (!window.__seeker__) {
  window.__seeker__ = true;
  let clicks = 0;
  let chache = { masks: {} };
  const REGEXES = [
    [
      '38',
      '\\b3?8?[\\( ]{0,2}(0)[\\( ]{0,2}(39|44|67|68|96|97|98|50|66|95|99|63|73|93|92|91|94)[\\-\\) ]{0,2}(\\d)[\\-\\) ]{0,2}(\\d)[\\- ]?(\\d)[\\- ]?(\\d)[\\- ]?(\\d)[\\- ]?(\\d)[\\- ]?(\\d)\\b',
    ],
  ];
  const mutationObserver = new MutationObserver(() => seek());

  function arrayEquals(a, b) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((val, index) => val === b[index])
    );
  }

  function getNumbers() {
    let numbers = [];
    for (let i = 0; i < REGEXES.length; i++) {
      let regex = new RegExp(REGEXES[i][1], 'g');
      let matches =
        (
          document.body.innerText +
          [...document.body.getElementsByTagName('*')].reduce(
            (acc, el) => `${acc} ${el.value || ''}`,
            ''
          )
        )
          .toLowerCase()
          .matchAll(regex) || [];
      Array.from(matches).forEach((match) => {
        match.shift();
        let number = REGEXES[i][0] + match.join('');
        chache.masks[number] = match.join('.*?');
        numbers.push(Number(number));
      });
    }
    return [...new Set(numbers)].sort();
  }

  function seek() {
    let numbers = getNumbers();
    if (!arrayEquals(numbers, chache.numbers)) {
      chache.numbers = numbers;
      chrome.runtime.sendMessage({
        type: 'post',
        body: numbers,
      });
    }
  }

  function isVisible(node) {
    while (node) {
      let style = getComputedStyle(node);
      if (style.display === 'none') return false;
      if (style.visibility === 'hidden') return false;
      if (style.opacity <= 0) return false;
      node = node.parentElement;
    }
    return true;
  }

  function getText(node) {
    return [...node.childNodes].reduce(
      (text, child) => text + (child.nodeType === 3 ? child.data : ''),
      ''
    );
  }

  function findNodes(mask) {
    if (mask) {
      let regex = new RegExp(mask);
      const iterator = document.createNodeIterator(
        document.body,
        NodeFilter.SHOW_ELEMENT,
        (node) =>
          !['SCRIPT', 'STYLE'].includes(node.nodeName) &&
          (regex.test(getText(node)) || regex.test(node.value)) &&
          isVisible(node.parentNode)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT
      );
      let node,
        nodes = [];
      while ((node = iterator.nextNode())) nodes.push(node);
      return nodes;
    }
  }

  function scroll(nodes) {
    let node = nodes[clicks % nodes.length];
    node.scrollIntoView({ block: 'center', behavior: 'smooth' });
    node.animate(
      [
        { backgroundColor: node.style.color },
        { backgroundColor: 'red', offset: 0.333 },
        { backgroundColor: node.style.color },
      ],
      5000
    );
    clicks++;
  }

  chrome.runtime.onMessage.addListener(function (request) {
    if (request.type === 'scroll') {
      let number = request.body.number;
      let mask = chache.masks[number];
      let nodes = findNodes(mask);
      scroll(nodes);
    }
  });

  mutationObserver.observe(document, {
    characterData: true,
    childList: true,
    subtree: true,
  });

  seek();
}
