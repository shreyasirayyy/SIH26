export const getEscalatedMessage = (daysMissed: number) => {
  if (daysMissed <= 2) {
    return {
      message: "Just a gentle nudge to check in when you feel ready. We're here for you.",
      tone: "light"
    };
  } else if (daysMissed <= 5) {
    return {
      message: "Thinking of you. Whenever you're ready, a quick check-in can help you stay connected to your journey.",
      tone: "warm"
    };
  } else {
    return {
      message: "We're still here whenever you're ready to talk. No pressure, just a reminder that support is always available.",
      tone: "gentle"
    };
  }
};
