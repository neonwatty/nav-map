import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

export function usePersistentState<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const initialValueRef = useRef(initialValue);
  initialValueRef.current = initialValue;
  const [entry, setEntry] = useState<{ key: string; value: T }>(() => ({
    key,
    value: readPersistentState(key, initialValue),
  }));

  useEffect(() => {
    setEntry(current =>
      current.key === key
        ? current
        : {
            key,
            value: readPersistentState(key, initialValueRef.current),
          }
    );
  }, [key]);

  const setState = useCallback<Dispatch<SetStateAction<T>>>(
    action => {
      setEntry(current => {
        const previous =
          current.key === key ? current.value : readPersistentState(key, initialValueRef.current);
        const value =
          typeof action === 'function' ? (action as (previous: T) => T)(previous) : action;
        return { key, value };
      });
    },
    [key]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (entry.key !== key) return;
    window.localStorage.setItem(key, JSON.stringify(entry.value));
  }, [entry, key]);

  const value = entry.key === key ? entry.value : readPersistentState(key, initialValue);
  return [value, setState];
}

function readPersistentState<T>(key: string, initialValue: T): T {
  if (typeof window === 'undefined') return initialValue;
  const stored = window.localStorage.getItem(key);
  if (stored === null) return initialValue;
  try {
    return JSON.parse(stored) as T;
  } catch {
    return initialValue;
  }
}
