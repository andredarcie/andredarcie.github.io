// Ganchos para análise de fora da página: o estado em JSON e um avanço manual do
// tempo (em milissegundos reais) seguido de um quadro.
export class DebugApi {
  static install(target, { serializer, simulation, frameRenderer }) {
    target.render_game_to_text = () => serializer.toJSON();
    target.advanceTime = ms => {
      simulation.advance(ms / 1000);
      frameRenderer.render();
    };
  }
}
