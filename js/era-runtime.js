// Small shared router. Era controllers own their gameplay; the runtime only dispatches.
export function createEraRuntime(controllers) {
  const byMode = new Map();
  controllers.forEach(controller => controller.modes.forEach(mode => byMode.set(mode, controller)));
  const controllerFor = mode => byMode.get(mode) || controllers.find(controller => controller.fallback);
  return {
    render(mode) { return controllerFor(mode)?.render(mode); },
    input(mode, event) { return controllerFor(mode)?.input?.(event); },
    click(mode, element) { return controllerFor(mode)?.click?.(element); },
    tick(mode, context) { return controllerFor(mode)?.tick?.(context); }
  };
}
