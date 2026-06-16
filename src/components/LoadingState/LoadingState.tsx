import "./LoadingState.css";

interface LoadingStateProps {
  /** How many skeleton cards to render. */
  count?: number;
}

export function LoadingState({ count = 8 }: LoadingStateProps) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <p className="loading-state__message">
        <span className="loading-state__spinner" aria-hidden="true" />
        Scanning YouTube and crunching the outlier math…
      </p>

      <div className="loading-state__grid" aria-hidden="true">
        {Array.from({ length: count }).map((_, i) => (
          <div className="loading-state__card" key={i}>
            <div className="loading-state__thumb skeleton" />
            <div className="loading-state__line skeleton" />
            <div className="loading-state__line loading-state__line--short skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}
