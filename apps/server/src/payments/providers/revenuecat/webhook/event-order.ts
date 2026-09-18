export function shouldApplyRevenueCatStateEvent(input: {
  currentEventAt: Date | null;
  incomingEventTimestampMs: number;
}) {
  if (!input.currentEventAt) {
    return true;
  }

  return input.incomingEventTimestampMs > input.currentEventAt.getTime();
}
