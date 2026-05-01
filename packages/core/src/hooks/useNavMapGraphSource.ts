import { useEffect, useRef, useState } from 'react';
import type { NavMapGraph } from '../types';
import { validateGraph, type GraphValidationError } from '../utils/validateGraph';

interface UseNavMapGraphSourceOptions {
  graph?: NavMapGraph;
  graphUrl?: string;
  onValidationError?: (errors: GraphValidationError[]) => void;
}

export function useNavMapGraphSource({
  graph: graphProp,
  graphUrl,
  onValidationError,
}: UseNavMapGraphSourceOptions): NavMapGraph | null {
  const [graph, setGraph] = useState<NavMapGraph | null>(graphProp ?? null);
  const onValidationErrorRef = useRef(onValidationError);
  onValidationErrorRef.current = onValidationError;

  useEffect(() => {
    if (graphUrl && !graphProp) {
      fetch(graphUrl)
        .then(r => r.json())
        .then((data: NavMapGraph) => {
          const result = validateGraph(data);
          if (!result.valid) {
            onValidationErrorRef.current?.(result.errors);
          }
          setGraph(data);
        });
    }
  }, [graphUrl, graphProp]);

  useEffect(() => {
    if (graphProp) {
      const result = validateGraph(graphProp);
      if (!result.valid) {
        onValidationErrorRef.current?.(result.errors);
      }
      setGraph(graphProp);
    }
  }, [graphProp]);

  return graph;
}
