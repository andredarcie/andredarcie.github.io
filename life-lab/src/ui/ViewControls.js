// Os botões do canto: aproximar, afastar, voltar ao enquadramento e mostrar os
// leques de visão.
export class ViewControls {
  constructor(root, cameraRig, organismRenderer) {
    root.querySelector('#view-in').addEventListener('click', () => cameraRig.zoomBy(1.25));
    root.querySelector('#view-out').addEventListener('click', () => cameraRig.zoomBy(.8));
    root.querySelector('#view-reset').addEventListener('click', () => cameraRig.reset());
    const vision = root.querySelector('#view-vision');
    vision.addEventListener('click', () => {
      const shown = vision.getAttribute('aria-pressed') !== 'true';
      vision.setAttribute('aria-pressed', String(shown));
      vision.setAttribute('aria-label',
        shown ? 'Ocultar o campo de visão dos bichos' : 'Mostrar o campo de visão dos bichos');
      organismRenderer.setVisionVisible(shown);
    });
  }
}
