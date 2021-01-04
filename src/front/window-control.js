function bindEvents() {
  const { remote } = require('electron');
  const window = remote.getCurrentWindow();
  const header = document.querySelector('header');
  const min = document.querySelector('#window-minimize');
  const max = document.querySelector('#window-maximize');
  const rest = document.querySelector('#window-restore');
  const close = document.querySelector('#window-close');
  let moving = false;
  const moveOffset = {x: 0, y: 0};

  window.on('maximize', () => {
    max.style.display = 'none';
    rest.style.display = 'inline-block';
  });
  window.on('unmaximize', () => {
    max.style.display = 'inline-block';
    rest.style.display = 'none';
  });

  /**
   * @param { MouseEvent } evt
   */
  const headerMoveStart = evt => {
    moving = true;
    moveOffset.x = evt.clientX;
    moveOffset.y = evt.clientY;
  };

  const headerMove = evt => {
    if (moving) {
      let [x, y] = window.getPosition();
      window.setPosition(
        x + (evt.clientX - moveOffset.x),
        y + (evt.clientY - moveOffset.y),
        false);
    }
  };

  const headerMoveStop = () => {
    moving = false;
  };

  header.addEventListener('mousedown', headerMoveStart);
  header.addEventListener('mousemove', headerMove);
  header.addEventListener('mouseup', headerMoveStop);
  min.addEventListener('click', () => window.minimize());
  max.addEventListener('click', () => {
    window.maximize();
  });
  rest.addEventListener('click', () => {
    window.unmaximize();
  });
  
  close.addEventListener('click', () => window.close());
}

module.exports.bindEvents = bindEvents;
