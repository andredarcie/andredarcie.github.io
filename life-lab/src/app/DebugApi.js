// Ganchos para análise de fora da página: o estado em JSON e um avanço manual do
// tempo (em milissegundos reais) seguido de um quadro. Rodando local (localhost),
// também o estado vivo e a câmera em `lifeLab`, para mirar a vista num bicho.
export class DebugApi {
  static install(target, { serializer, simulation, frameRenderer, state, cameraRig }) {
    if (['localhost', '127.0.0.1'].includes(target.location?.hostname)) {
      target.lifeLab = { state, camera: cameraRig, simulation };
    }
    target.render_game_to_text = () => serializer.toJSON();
    target.advanceTime = ms => {
      simulation.advance(ms / 1000);
      frameRenderer.render();
    };
  }
}
