type LoadingListener = (loading: boolean) => void;

const listeners = new Set<LoadingListener>();
const activeRequests = new Set<string>();

export function beginLoading() {
  const id = crypto.randomUUID();
  activeRequests.add(id);
  notifyListeners();
  return id;
}

export function endLoading(id?: string) {
  if (!id) return;
  activeRequests.delete(id);
  notifyListeners();
}

export function subscribeToLoading(listener: LoadingListener) {
  listeners.add(listener);
  listener(isLoading());
  return () => {
    listeners.delete(listener);
  };
}

function isLoading() {
  return activeRequests.size > 0;
}

function notifyListeners() {
  const loading = isLoading();
  listeners.forEach((listener) => listener(loading));
}
