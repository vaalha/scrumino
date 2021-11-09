import { Component, createSignal, For, onCleanup, Show } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { flatten, random, range, shuffle } from 'lodash-es';
import { match, __, not, select, when } from 'ts-pattern';

import createGameLoop from './createGameLoop';
import createEventListener from '@solid-primitives/event-listener';

type Grid = number[][];

type Shape = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';
type Cell = '' | Shape;

type ShapeGrid = Cell[][];

type State = {
  grid: ShapeGrid;
};

type Direction = 'up' | 'down' | 'left' | 'right';

type Tetromino = {
  x: number;
  y: number;
  color: string;
  grid: Grid;
};

type Block = {
  x: number;
  y: number;
  color: string;
  grid: ShapeGrid;

  points: number;
  cooldown: number;
};

const COLS = 10;
const ROWS = 16;

const TETROMINOS: Record<Shape, Tetromino> = {
  I: {
    x: 3,
    y: 0,
    color: 'bg-cyan-400 text-cyan-600',
    grid: [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
    ],
  },
  J: {
    x: 4,
    y: 0,
    color: 'bg-blue-400 text-blue-600',
    grid: [
      [0, 1, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
  },
  L: {
    x: 3,
    y: 0,
    color: 'bg-orange-400 text-orange-600',
    grid: [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 1],
    ],
  },
  O: {
    x: 3,
    y: -1,
    color: 'bg-amber-400 text-amber-600',
    grid: [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
  },
  S: {
    x: 4,
    y: 0,
    color: 'bg-green-400 text-green-600',
    grid: [
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
  },
  T: {
    x: 3,
    y: 0,
    color: 'bg-purple-400 text-purple-600',
    grid: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
  Z: {
    x: 4,
    y: 0,
    color: 'bg-red-400 text-red-600',
    grid: [
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ],
  },
};

const defaultState = (): State => ({
  grid: range(0, ROWS).map(() => range(0, COLS).map(() => '')),
});

const defaultBlock = (time: number): Block => {
  const shape = shuffle(Object.keys(TETROMINOS))[0] as Shape;
  const tetromino = TETROMINOS[shape];
  const shapeGrid = tetromino.grid.map((row) =>
    row.map((x) => (x ? shape : '')),
  );

  return {
    ...tetromino,
    points: 1,
    cooldown: time + 1,
    grid: shapeGrid,
  };
};

const detectCollision = (grid: ShapeGrid, block: Block) => {
  for (let x = 0; x < block.grid.length; x++) {
    for (let y = 0; y < block.grid.length; y++) {
      if (!block.grid[y][x]) {
        continue;
      }

      const nextX = x + block.x;
      const nextY = y + block.y;

      if (nextX < 0 || nextY < 0 || nextX >= COLS || nextY >= ROWS) {
        return true;
      }

      if (grid[nextY][nextX] !== '') {
        return true;
      }
    }
  }

  return false;
};

const Cell: Component<{ cell: Cell }> = (props) => (
  <div
    class={`w-full h-full m-0.5 border-2 border-current ${
      props.cell !== '' && TETROMINOS[props.cell].color
    }`}
    style={{
      opacity: props.cell !== '' ? 1 : 0,
      width: 'calc(75vh / 24)',
      height: 'calc((75vh / 24)',
    }}
  ></div>
);

const App: Component = () => {
  const [state, setState] = createStore(defaultState());
  const [block, setBlock] = createSignal(defaultBlock(0));
  const [running, setRunning] = createSignal(true);
  const [frame, setFrame] = createSignal(0);

  const stampBlock = (block: Block) => {
    setState(
      produce<State>((draft) => {
        for (let x = 0; x < block.grid.length; x++) {
          for (let y = 0; y < block.grid.length; y++) {
            if (
              block.grid[y][x] !== '' &&
              x + block.x < COLS &&
              y + block.y < ROWS
            ) {
              draft.grid[y + block.y][x + block.x] = block.grid[y][x];
            }
          }
        }
      }),
    );
  };

  const moveBlock = (
    block: Block,
    direction: Direction,
    source: 'player' | 'physics',
  ) => {
    const nextBlock = { ...block };

    match(direction)
      .with('up', 'down', (d) => {
        nextBlock.y = block.y + (d == 'up' ? -1 : 1);
      })
      .with('left', 'right', (d) => {
        nextBlock.x = block.x + (d == 'left' ? -1 : 1);
      })
      .exhaustive();

    const collision = detectCollision(state.grid, nextBlock);

    if (!collision) {
      if (source === 'player' && direction === 'down') {
        nextBlock.cooldown = time() + block.points;
      }
      setBlock(nextBlock);
    } else if (source === 'physics') {
      stampBlock(block);
      setBlock(defaultBlock(time()));
    }
  };

  const rotateBlock = (block: Block, clockwise: boolean) => {
    const newGrid = clockwise
      ? block.grid[0].map((_, index) =>
          block.grid.map((row) => row[index]).reverse(),
        )
      : block.grid
          .map((row) => row.reverse())[0]
          .map((_, index) => block.grid.map((row) => row[index]));
    setBlock((prev) => ({ ...prev, grid: newGrid }));
  };

  const [time] = createGameLoop(
    (time: number) => {
      setFrame((f) => ++f);

      const b = block();
      if (time >= b.cooldown) {
        b.cooldown = time + b.points;
        moveBlock(b, 'down', 'physics');
      }
    },
    1 / 60,
    running,
  );

  createEventListener(window, 'keydown', (e) => {
    if (e instanceof KeyboardEvent) {
      match(e.key)
        .with('ArrowLeft', running, () => moveBlock(block(), 'left', 'player'))
        .with('ArrowRight', running, () =>
          moveBlock(block(), 'right', 'player'),
        )
        .with('ArrowUp', running, () => moveBlock(block(), 'up', 'player'))
        .with('ArrowDown', running, () => moveBlock(block(), 'down', 'player'))
        .with(' ', running, () => {
          stampBlock(block());
          setBlock(defaultBlock(time()));
        })
        .with('r', running, () => {
          setState(defaultState());
          setBlock(defaultBlock(time()));
        })
        .with('z', 'x', (k) => {
          if (running()) rotateBlock(block(), k === 'x');
        })
        .with('Escape', 'p', () => setRunning(!running()))
        .otherwise(() => {});
    }
  });

  return (
    <div
      class="flex flex-col justify-center items-center w-screen"
      style={{ height: '95vh' }}
    >
      <div class="select-none">
        <div class="text-white text-2xl leading-4 flex">
          <div>TIME: {time().toFixed(1)}</div>
          <div class="ml-auto">{frame()}</div>
        </div>
        <div class="border-2 p-px">
          <div class="relative">
            <div
              class="grid grid-cols-10"
              style={{ 'min-width': 'calc((75vh / 24 + 4px) * 10' }}
            >
              <For each={flatten(state.grid)}>
                {(cell, i) => <Cell cell={cell} />}
              </For>
            </div>
            <div
              class={`grid ${
                block().grid.length === 4 ? 'grid-cols-4' : 'grid-cols-3'
              } absolute`}
              style={{
                'min-width': `calc((75vh / 24 + 4px) * ${block().grid.length}`,
                left: `calc((75vh / 24 + 4px) * ${block().x})`,
                top: `calc((75vh / 24 + 4px) * ${block().y})`,
              }}
            >
              <Show when={block()}>
                {(block) => (
                  <For each={flatten(block.grid)}>
                    {(cell, i) => <Cell cell={cell} />}
                  </For>
                )}
              </Show>
            </div>
            <Show when={!running()}>
              <div class="absolute inset-0 flex items-center justify-center text-white bg-black bg-opacity-80 text-4xl pt-1">
                PAUSED
              </div>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
