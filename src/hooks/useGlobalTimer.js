import { useState, useEffect } from 'react';

let tick = 0;
const subscribers = new Set();
let timer = null;

const startTimer = () => {
  if (!timer) {
    timer = setInterval(() => {
      tick++;
      subscribers.forEach((cb) => cb(tick));
    }, 30000); // 30 seconds
  }
};

const stopTimer = () => {
  if (subscribers.size === 0 && timer) {
    clearInterval(timer);
    timer = null;
  }
};

export default function useGlobalTimer() {
  const [, setTick] = useState(tick);

  useEffect(() => {
    subscribers.add(setTick);
    startTimer();
    return () => {
      subscribers.delete(setTick);
      stopTimer();
    };
  }, []);
}
