import { Component, createSignal, For, onCleanup } from 'solid-js';
import range from 'lodash-es/range';
import { random } from 'lodash-es';

const App: Component = () => {
  const [grid, setGrid] = createSignal<number[]>([]);
  const [block, setBlock] = createSignal<{ speed: number }>({ speed: 1000 });
  const [running, setRunning] = createSignal(true);
  const [done, setDone] = createSignal(false);
  const [time, setTime] = createSignal(0);
  const [acc, setAcc] = createSignal(0);

  const dt = 1 / 4;

  let currentTime = 0;
  let newTime;

  const tick = () => {
    setGrid(range(0, 10 * 16).map(() => random(1)));
  };

  const onFrame = (timestamp: number) => {
    newTime = timestamp / 1000;
    let frameTime = newTime - currentTime;
    currentTime = newTime;

    if (frameTime > 0.25) {
      frameTime = 0.25;
    }
    setAcc((acc) => acc + frameTime);

    while (acc() >= dt) {
      tick();
      setTime((t) => t + dt);
      setAcc((acc) => acc - dt);
    }

    !done() && requestAnimationFrame(onFrame);
  };
  requestAnimationFrame(onFrame);
  onCleanup(() => setDone(true));

  return (
    <div class="bg-black flex flex-col justify-center items-center w-screen h-screen">
      <div class="text-white">{time().toFixed(2)}</div>
      <div class="bg-opacity-80 grid grid-cols-10">
        <For each={grid()}>
          {(cell, i) => (
            <div
              class="w-full h-full m-0.5 border-2 border-transparent"
              classList={{
                'bg-blue-400 border-current text-blue-700': !!cell,
              }}
              style={{
                '--tw-bg-opacity': cell,
                width: 'calc(75vh / 24)',
                height: 'calc((75vh / 24)',
              }}
            ></div>
          )}
        </For>
      </div>
    </div>
  );
};

export default App;
