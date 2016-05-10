{
  // utils

  const always = x => () => x;

  const add = a => b => a + b;

  const subtract = a => b => a - b;

  const map = func => data => data.map(func);

  const reduce = func => init => data => data.reduce(func, init);

  const compose = (...funcs) => data => reduce((val, func) => func(val))(data)(funcs);

  const ifThen = (condition, truthey, falsey) => x => condition(x) ? truthey(x) : falsey(x);

  const freezeIt = Object.freeze;

  const appendChild = container => child => container.appendChild(child);

  const hasClass = className => el => [...el.classList].indexOf(className) > -1;

  // model

  const updateModel = ({ model, obj }) => Object.assign({}, model, obj);

  const createModel = (model, obj) => {
    if (!obj) return Object.freeze(model);

    return compose(updateModel, freezeIt)({ model, obj });
  };

  const direction = {
    LEFT: 'LEFT',
    RIGHT: 'RIGHT',
    NEITHER: 'NEITHER',
  };

  const model = createModel({
    wines: [],
    startX: 0,
    deltaX: 0,
    offset: 0,
    shouldSwipeAway: false,
    shouldTransition: false,
    activeIndx: 0,
    swipeDir: direction.NEITHER
  });

  // update

  const actions = {
    TOUCH_START: 'TOUCH_START',
    TOUCH_MOVE: 'TOUCH_MOVE',
    TOUCH_END: 'TOUCH_END',
  };

  const handleTouchStart = (model, { x }) => {
    return updateModel({
      model,
      obj: {
        startX: x,
        shouldTransition: false,
        shouldSwipeAway: false,
      }
    });
  };

  const handleTouchMove = (model, { x }) => {
    const deltaX = model.startX - x;

    return updateModel({
      model,
      obj: {
        deltaX,
        swipeDir: deltaX > 0 ? direction.LEFT : direction.RIGHT,
      }
    });
  };

  const crementIndx = swipeDir => _ => ifThen(always(swipeDir === direction.LEFT), always(1), always(-1))(_);

  const isFirstCard = indx => indx === 0;

  const isLastCard = cards => indx => indx === (cards.length - 1);

  const swipingOffRight = ({ swipeDir, activeIndx }) => swipeDir === direction.RIGHT && isFirstCard(activeIndx);

  const swipingOffLeft = ({ swipeDir, activeIndx, wines }) => swipeDir === direction.LEFT && isLastCard(wines)(activeIndx);

  const isSwipingOff = ifThen(
    swipingOffRight,
    always(true),
    swipingOffLeft
  );

  const pcntOffset = ({ deltaX, width }) => Math.abs(deltaX) / width * 100;

  const outside40 = pcntOffset => pcntOffset > 40;

  const isOutsideTolerance = compose(pcntOffset, outside40);

  const canSwipe = ifThen(isSwipingOff, always(false), isOutsideTolerance);

  const hasSweptLeft = shouldSwipeAway => ({ swipeDir }) => shouldSwipeAway && swipeDir === direction.LEFT;

  const addToOffset = ({ offset }) => add(offset);

  const subtractFromOffset = ({ offset }) => subtract(offset);

  const viewportWidth = ({ width }) => width;

  const currentOffset = ({ offset }) => always(offset);

  const determineOffset = shouldSwipeAway => ifThen(always(shouldSwipeAway), subtractFromOffset, currentOffset);

  const calculateOffset = shouldSwipeAway => ifThen(hasSweptLeft(shouldSwipeAway), addToOffset, determineOffset(shouldSwipeAway));

  const handleTouchEnd = model => {
    const shouldSwipeAway = canSwipe(model);
    const indxChange = ifThen(always(shouldSwipeAway), crementIndx(model.swipeDir), always(0));
    const activeIndx = add(indxChange())(model.activeIndx);

    return updateModel({
      model,
      obj: {
        deltaX: 0,
        offset: calculateOffset(shouldSwipeAway)(model)(viewportWidth(model)),
        shouldSwipeAway,
        shouldTransition: true,
        activeIndx,
        swipeDir: direction.NEITHER
      }
    });
  };

  const update = model => ({ action, payload }) => {
    switch (action) {
    case actions.TOUCH_START:
      return handleTouchStart(model, payload);
      break;
    case actions.TOUCH_MOVE:
      return handleTouchMove(model, payload);
      break;
    case actions.TOUCH_END:
      return handleTouchEnd(model, payload);
      break;
    default:
      throw new Error('unknown action');
    }
  };

  // view

  const createCard = wine => {
    const card = document.createElement('div');
    card.className = 'wine_card';
    card.textContent = wine.name;

    return card;
  };

  const cardTransform = offset => `transform: translate(${offset}vw, 15vh)`;

  const positionCard = activeIndx => (el, indx) => {
    if (activeIndx === indx) {
      el.classList.add('wine_card--active');
    }

    el.style = cardTransform(7.5 + (100 * indx));

    return el;
  };

  const eventListener = update => action => ({ target, touches }) => {
    if (hasClass('wine_card')(target)) {
      const firstTouch = touches[0];
      const payload = {};

      if (firstTouch) {
        payload.x = firstTouch.clientX;
        payload.y = firstTouch.clientY;
      }

      return update({ action, payload });
    }
  };

  const view = (el, { activeIndx, wines }, update) => {
    const doUpdate = eventListener(update);

    el.addEventListener('touchstart', doUpdate(actions.TOUCH_START));
    el.addEventListener('touchmove', doUpdate(actions.TOUCH_MOVE));
    el.addEventListener('touchend', doUpdate(actions.TOUCH_END));

    el.className = 'wine';
    el.style = 'background-color: rgba(238, 123, 111, 1);';

    compose(map(createCard), map(positionCard(activeIndx)), map(appendChild(el)))(wines);
  };

  const calcStyle = (offset, shouldTransition) => initOffset => {
    let style = `transform: translate(calc(${initOffset} - ${offset}px), 15vh);`;

    if (shouldTransition) {
      style += ' transition: transform 100ms ease-out;';
    }

    return style;
  };

  const updateCard = model => (el, indx) => {
    const styleCalc = calcStyle(model.deltaX + model.offset, model.shouldTransition);

    el.style = styleCalc(`${7.5 + (indx * 100)}vw`);

    if (model.activeIndx === indx) {
      if (!hasClass('wine_card--active')(el)) {
        el.classList.add('wine_card--active');
      }
    } else {
      if (hasClass('wine_card--active')(el)) {
        el.classList = Array.from(el.classList).shift();
      }
    }
  };

  const updateView = el => model => map(updateCard(model))(Array.from(el.querySelectorAll('.wine_card')));

  // app

  const data = [
    {
      name: 'Barolo',
      fullName: 'Barolo di castiglione falletto',
      price: 550,
    },
    {
      name: 'Moscato',
      fullName: 'Moscato d\'asti',
      price: 550,
      desc: 'Moscato tends to be a popular white wine among wine lovers and enjoys a significant following with ' +
      'seasoned wine enthusiasts who enjoy a lighter-styled wine',
      origin: 'Asti, Italy',
      type: 'DOCG',
      alcohol: 11,
    },
  ];

  const WineApp = (model, update, view, updateView) => data => el => {
    let newModel = updateModel({
      model,
      obj: {
        wines: data,
        width: el.offsetWidth,
      }
    });

    view(el, newModel, params => {
      newModel = update(newModel)(params);
      //console.log(newModel);
      requestAnimationFrame(() => updateView(el)(newModel));
    });
  };

  WineApp(model, update, view, updateView)(data)(document.getElementById('main'));
}
