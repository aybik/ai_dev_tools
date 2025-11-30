let loadingPromise = null;

export async function loadPyodide() {
  if (globalThis.__pyodideInstance) {
    return globalThis.__pyodideInstance;
  }
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const loader = await import("https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js");
    const pyodide = await loader.loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/"
    });
    globalThis.__pyodideInstance = pyodide;
    return pyodide;
  })();

  return loadingPromise;
}
